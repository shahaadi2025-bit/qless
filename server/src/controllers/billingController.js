import crypto from 'crypto';
import { mockStore } from '../db.js';
import { broadcastQueueUpdate } from '../socket.js';
import { kvGet, kvSet, kvList, isDurable } from '../lib/kv.js';
import { PLANS, planById, priceFor, boostPolicy } from '../lib/plans.js';
import { rateLimited } from '../lib/security.js';
import { requireAuth, effectivePlanId, usageOf, publicAccount, isAdmin } from './accountController.js';

// ---------- which payment methods are switched on ----------
const VPA_RE = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

function modes() {
  const razorpay = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
  const vpa = String(process.env.UPI_VPA || '').trim();
  const upi = VPA_RE.test(vpa) ? { vpa, payee: String(process.env.UPI_PAYEE_NAME || 'QLESS').trim().slice(0, 50) } : null;
  const flag = process.env.ALLOW_DEMO_PAYMENTS;
  // Demo payments are only on by default when no real method is configured.
  const demo = flag ? flag === 'true' : !razorpay && !upi;
  return { razorpay, upi, demo, test: razorpay && /^rzp_test_/.test(String(process.env.RAZORPAY_KEY_ID)) };
}

const publicPayment = p => ({
  id: p.id,
  kind: p.kind,
  title: p.title,
  amount: p.amount,
  currency: p.currency,
  status: p.status,
  method: p.method,
  utr: p.utr || undefined,
  createdAt: p.createdAt,
  paidAt: p.paidAt || undefined
});

// GET /api/billing/plans (public)
export function listPlans(req, res) {
  const m = modes();
  return res.json({
    success: true,
    data: {
      plans: PLANS,
      modes: { razorpay: m.razorpay, test: m.test, upi: Boolean(m.upi), demo: m.demo, durable: isDurable() }
    }
  });
}

// ---------- helpers ----------
function upiLink(upi, amount, note, ref) {
  const q = new URLSearchParams({ pa: upi.vpa, pn: upi.payee, am: amount.toFixed(2), cu: 'INR', tn: note.slice(0, 60), tr: ref });
  return `upi://pay?${q.toString().replace(/\+/g, '%20')}`;
}

async function createRazorpayOrder(amountRupees, receipt, notes) {
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: Math.round(amountRupees * 100), currency: 'INR', receipt: receipt.slice(0, 40), notes }),
    signal: AbortSignal.timeout(15000)
  });
  const json = await res.json();
  if (!res.ok) throw new Error((json && json.error && json.error.description) || `Razorpay ${res.status}`);
  return json;
}

function upgradeToken(token) {
  token.priority_level = 'PRIORITY';
  try {
    broadcastQueueUpdate('TOKEN_CREATED', token); // staff screens refresh their waiting list on this event
  } catch {
    /* sockets are optional */
  }
}

// Can this account boost this token, and how many included boosts are left?
function boostCheck(acct, tokenId) {
  const token = mockStore.tokens.find(t => t.id === tokenId);
  if (!token) return { status: 404, message: 'Token not found' };
  if (token.status !== 'WAITING') return { status: 409, message: 'Only tokens that are still waiting can be boosted' };
  if (token.priority_level && token.priority_level !== 'STANDARD') return { status: 409, message: 'This token already has priority' };
  const policy = boostPolicy(effectivePlanId(acct));
  const usage = usageOf(acct);
  const left = policy.included === null ? Infinity : Math.max(0, policy.included - usage.boostsUsed);
  return { token, policy, left };
}

async function activatePlan(acct, plan, interval) {
  const now = Date.now();
  let renewsAt = null;
  if (priceFor(plan, interval) > 0) {
    const days = interval === 'year' ? 365 : 30;
    const current = acct.plan && acct.plan.id === plan.id && acct.plan.renewsAt ? Date.parse(acct.plan.renewsAt) : 0;
    renewsAt = new Date(Math.max(now, current) + days * 86400000).toISOString();
  }
  acct.plan = { id: plan.id, interval, startedAt: new Date(now).toISOString(), renewsAt };
  await kvSet(`acct:${acct.id}`, acct);
}

async function fulfill(payment) {
  if (payment.fulfilled) return;
  if (payment.kind === 'PLAN') {
    const acct = kvGet(`acct:${payment.accountId}`);
    const plan = planById(payment.planId);
    if (acct && plan) await activatePlan(acct, plan, payment.interval);
  } else if (payment.kind === 'BOOST') {
    const token = mockStore.tokens.find(t => t.id === payment.tokenId);
    if (token && token.status === 'WAITING') upgradeToken(token);
    else payment.note = 'The token was no longer waiting, so the boost could not be applied.';
  }
  payment.fulfilled = true;
}

async function markPaid(payment, method, extra = {}) {
  if (payment.status === 'PAID') return payment;
  Object.assign(payment, extra, { status: 'PAID', method, paidAt: new Date().toISOString() });
  await fulfill(payment);
  await kvSet(`pay:${payment.id}`, payment);
  return payment;
}

function ownPayment(req, id) {
  const p = kvGet(`pay:${String(id || '')}`);
  return p && p.accountId === req.account.id ? p : null;
}

// ---------- POST /api/billing/checkout ----------
export const createCheckout = requireAuth(async (req, res) => {
  const acct = req.account;
  if (rateLimited(`checkout:${acct.id}`, 30, 60 * 60 * 1000)) {
    return res.status(429).json({ success: false, message: 'Too many payment attempts. Please try again later.' });
  }
  const b = req.body || {};
  let amount;
  let title;
  let planId = null;
  let interval = null;
  let tokenId = null;

  if (b.kind === 'PLAN') {
    const plan = planById(String(b.planId || ''));
    if (!plan) return res.status(400).json({ success: false, message: 'Unknown plan' });
    if (plan.audience !== acct.role) {
      return res.status(403).json({ success: false, message: plan.audience === 'BUSINESS' ? 'This plan is for business accounts.' : 'This plan is for customer accounts.' });
    }
    interval = b.interval === 'year' ? 'year' : 'month';
    amount = priceFor(plan, interval); // always from the catalog, never from the browser
    planId = plan.id;
    if (amount === 0) {
      await activatePlan(acct, plan, interval);
      return res.json({ success: true, data: { activated: true, account: publicAccount(kvGet(`acct:${acct.id}`)) } });
    }
    title = `${plan.name} plan (${interval === 'year' ? 'yearly' : 'monthly'})`;
  } else if (b.kind === 'BOOST') {
    tokenId = String(b.tokenId || '');
    const check = boostCheck(acct, tokenId);
    if (check.status) return res.status(check.status).json({ success: false, message: check.message });
    if (check.left > 0) return res.status(400).json({ success: false, message: 'You still have included boosts. Use those first.' });
    if (!(check.policy.price > 0)) return res.status(400).json({ success: false, message: 'No payment is needed for this boost.' });
    amount = check.policy.price;
    title = `Priority boost for token ${check.token.token_display}`;
  } else {
    return res.status(400).json({ success: false, message: 'Unknown payment type' });
  }

  const m = modes();
  if (!m.razorpay && !m.upi && !m.demo) {
    return res.status(503).json({ success: false, message: 'No payment method is configured on the server yet.' });
  }

  const payment = {
    id: 'pay_' + crypto.randomBytes(8).toString('hex'),
    accountId: acct.id,
    kind: b.kind,
    planId,
    interval,
    tokenId,
    title,
    amount,
    currency: 'INR',
    method: null,
    status: 'CREATED',
    createdAt: new Date().toISOString()
  };

  const options = {};
  if (m.razorpay) {
    try {
      const order = await createRazorpayOrder(amount, payment.id, { payment_id: payment.id, account_id: acct.id });
      payment.razorpayOrderId = order.id;
      await kvSet(`rzo:${order.id}`, { id: payment.id });
      options.razorpay = { key_id: process.env.RAZORPAY_KEY_ID, order_id: order.id, amount_paise: order.amount, currency: order.currency };
    } catch (err) {
      console.warn('[billing] Razorpay order failed:', err.message);
    }
  }
  if (m.upi) options.upi = { vpa: m.upi.vpa, payee: m.upi.payee, link: upiLink(m.upi, amount, title, payment.id), ref: payment.id };
  if (m.demo) options.demo = true;
  if (!options.razorpay && !options.upi && !options.demo) {
    return res.status(502).json({ success: false, message: 'Online payment is unavailable right now. Please try again in a moment.' });
  }

  await kvSet(`pay:${payment.id}`, payment);
  return res.json({ success: true, data: { payment: publicPayment(payment), options, test: m.test } });
});

// ---------- POST /api/billing/razorpay/verify ----------
export const verifyRazorpay = requireAuth(async (req, res) => {
  const b = req.body || {};
  const orderId = String(b.razorpay_order_id || '');
  const paymentId = String(b.razorpay_payment_id || '');
  const signature = String(b.razorpay_signature || '');
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return res.status(503).json({ success: false, message: 'Online payment is not configured.' });
  if (!/^order_[A-Za-z0-9]+$/.test(orderId) || !/^pay_[A-Za-z0-9]+$/.test(paymentId) || !/^[a-f0-9]{64}$/.test(signature)) {
    return res.status(400).json({ success: false, message: 'Payment details are not valid.' });
  }
  const ref = kvGet(`rzo:${orderId}`);
  const payment = ref ? ownPayment(req, ref.id) : null;
  if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
  if (payment.status === 'PAID') return res.json({ success: true, data: { payment: publicPayment(payment), account: publicAccount(kvGet(`acct:${req.account.id}`)) } });

  const expected = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
  const same = expected.length === signature.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  if (!same) return res.status(400).json({ success: false, message: 'Payment could not be verified.' });

  await markPaid(payment, 'RAZORPAY', { razorpayPaymentId: paymentId });
  return res.json({ success: true, data: { payment: publicPayment(payment), account: publicAccount(kvGet(`acct:${req.account.id}`)) } });
});

// ---------- POST /api/billing/upi/submit (pay in any UPI app, then enter the 12-digit UTR) ----------
export const submitUtr = requireAuth(async (req, res) => {
  if (!modes().upi) return res.status(400).json({ success: false, message: 'UPI payments are not set up.' });
  const payment = ownPayment(req, req.body && req.body.payment_id);
  if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
  if (payment.status !== 'CREATED') return res.status(409).json({ success: false, message: 'This payment was already submitted.' });
  const utr = String((req.body && req.body.utr) || '').replace(/\s/g, '');
  if (!/^\d{12}$/.test(utr)) return res.status(400).json({ success: false, message: 'The UTR / reference number is 12 digits.' });
  if (kvGet(`utr:${utr}`)) return res.status(409).json({ success: false, message: 'This reference number was already used.' });
  await kvSet(`utr:${utr}`, { id: payment.id });
  Object.assign(payment, { utr, method: 'UPI', status: 'UNDER_REVIEW', submittedAt: new Date().toISOString() });
  await kvSet(`pay:${payment.id}`, payment);
  return res.json({ success: true, data: { payment: publicPayment(payment) } });
});

// ---------- POST /api/billing/demo/complete (practice payments, only when switched on) ----------
export const demoComplete = requireAuth(async (req, res) => {
  if (!modes().demo) return res.status(403).json({ success: false, message: 'Practice payments are turned off.' });
  const payment = ownPayment(req, req.body && req.body.payment_id);
  if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
  if (payment.status !== 'CREATED') return res.status(409).json({ success: false, message: 'This payment was already handled.' });
  await markPaid(payment, 'DEMO');
  return res.json({ success: true, data: { payment: publicPayment(payment), account: publicAccount(kvGet(`acct:${req.account.id}`)) } });
});

export const myPayments = requireAuth(async (req, res) => {
  const list = kvList('pay:')
    .filter(p => p.accountId === req.account.id)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, 50)
    .map(publicPayment);
  return res.json({ success: true, data: list });
});

// ---------- admin review of UPI payments ----------
export const adminReview = requireAuth(async (req, res) => {
  if (!isAdmin(req.account)) return res.status(403).json({ success: false, message: 'Admins only' });
  const list = kvList('pay:')
    .filter(p => p.status === 'UNDER_REVIEW')
    .sort((a, b) => String(a.submittedAt).localeCompare(String(b.submittedAt)))
    .map(p => {
      const a = kvGet(`acct:${p.accountId}`);
      return { ...publicPayment(p), account: a ? { name: a.name, email: a.email } : null };
    });
  return res.json({ success: true, data: list });
});

function adminDecision(approve) {
  return requireAuth(async (req, res) => {
    if (!isAdmin(req.account)) return res.status(403).json({ success: false, message: 'Admins only' });
    const payment = kvGet(`pay:${String(req.params.id || '')}`);
    if (!payment || payment.status !== 'UNDER_REVIEW') return res.status(404).json({ success: false, message: 'No payment waiting for review with this id' });
    if (approve) {
      await markPaid(payment, 'UPI', { reviewedBy: req.account.email });
    } else {
      Object.assign(payment, { status: 'REJECTED', reviewedBy: req.account.email });
      await kvSet(`pay:${payment.id}`, payment);
    }
    return res.json({ success: true, data: { payment: publicPayment(payment) } });
  });
}
export const adminApprove = adminDecision(true);
export const adminReject = adminDecision(false);

// ---------- POST /api/billing/boost (use an included boost) ----------
export const applyBoost = requireAuth(async (req, res) => {
  const acct = req.account;
  const check = boostCheck(acct, String((req.body && req.body.token_id) || ''));
  if (check.status) return res.status(check.status).json({ success: false, message: check.message });
  if (check.left > 0) {
    const usage = usageOf(acct);
    acct.usage = { month: usage.month, boostsUsed: usage.boostsUsed + 1 };
    await kvSet(`acct:${acct.id}`, acct);
    upgradeToken(check.token);
    return res.json({ success: true, data: { account: publicAccount(acct), token: { id: check.token.id, priority_level: check.token.priority_level } } });
  }
  return res.status(402).json({
    success: false,
    needs_payment: true,
    amount: check.policy.price,
    message: check.policy.price > 0 ? `No included boosts left. A boost costs Rs ${check.policy.price}.` : 'No boosts available.'
  });
});