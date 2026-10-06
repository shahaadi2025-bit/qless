import crypto from 'crypto';
import { kvGet, kvSet } from '../lib/kv.js';
import { hashPassword, verifyPassword, signToken, verifyToken, rateLimited } from '../lib/security.js';
import { planById, defaultPlanId, boostPolicy } from '../lib/plans.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const adminEmails = () =>
  (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);

export const isAdmin = acct => adminEmails().includes(acct.email);
export const monthKey = (d = new Date()) => d.toISOString().slice(0, 7);

// The plan that is actually active right now (an expired paid plan falls back to the free one).
export function effectivePlanId(acct) {
  const p = acct.plan;
  if (p && p.id && planById(p.id) && (!p.renewsAt || Date.parse(p.renewsAt) > Date.now())) return p.id;
  return defaultPlanId(acct.role);
}

export function usageOf(acct) {
  return acct.usage && acct.usage.month === monthKey() ? acct.usage : { month: monthKey(), boostsUsed: 0 };
}

export function publicAccount(acct) {
  const planId = effectivePlanId(acct);
  const plan = planById(planId);
  const pol = boostPolicy(planId);
  const usage = usageOf(acct);
  const onPaid = acct.plan && acct.plan.id === planId;
  return {
    id: acct.id,
    email: acct.email,
    name: acct.name,
    role: acct.role,
    businessName: acct.businessName || '',
    isAdmin: isAdmin(acct),
    createdAt: acct.createdAt,
    plan: {
      id: planId,
      name: plan ? plan.name : 'Free',
      interval: onPaid ? acct.plan.interval || null : null,
      renewsAt: onPaid ? acct.plan.renewsAt || null : null
    },
    boosts: {
      included: pol.included,
      used: usage.boostsUsed,
      left: pol.included === null ? null : Math.max(0, pol.included - usage.boostsUsed),
      price: pol.price,
      unlimited: pol.included === null
    }
  };
}

export async function authFromRequest(req) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
  if (!m) return null;
  const payload = verifyToken(m[1]);
  if (!payload || !payload.sub) return null;
  return kvGet(`acct:${payload.sub}`);
}

/** Wrap a handler so it only runs for signed-in users; the account is available as req.account. */
export function requireAuth(handler) {
  return async (req, res) => {
    try {
      const acct = await authFromRequest(req);
      if (!acct) return res.status(401).json({ success: false, message: 'Please sign in to continue' });
      req.account = acct;
      return await handler(req, res);
    } catch (error) {
      console.error('Request error:', error);
      return res.status(500).json({ success: false, message: 'Something went wrong' });
    }
  };
}

export async function register(req, res) {
  try {
    if (rateLimited(`reg:${req.ip || 'x'}`, 10, 60 * 60 * 1000)) {
      return res.status(429).json({ success: false, message: 'Too many sign-up attempts. Please try again later.' });
    }
    const b = req.body || {};
    const name = String(b.name || '').trim();
    const email = String(b.email || '').trim().toLowerCase();
    const password = String(b.password || '');
    const role = b.role === 'BUSINESS' ? 'BUSINESS' : 'CUSTOMER';
    const businessName = String(b.business_name || '').trim().slice(0, 80);

    if (name.length < 2 || name.length > 60) return res.status(400).json({ success: false, message: 'Please enter your name (2 to 60 characters).' });
    if (!EMAIL_RE.test(email) || email.length > 120) return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    if (password.length < 8 || password.length > 72) return res.status(400).json({ success: false, message: 'Password must be 8 to 72 characters.' });
    if (kvGet(`email:${email}`)) return res.status(409).json({ success: false, message: 'An account with this email already exists. Try signing in.' });

    const id = 'acc_' + crypto.randomBytes(8).toString('hex');
    const acct = {
      id,
      email,
      name,
      role,
      businessName,
      passHash: await hashPassword(password),
      createdAt: new Date().toISOString(),
      plan: { id: defaultPlanId(role), interval: 'month', startedAt: new Date().toISOString(), renewsAt: null },
      usage: { month: monthKey(), boostsUsed: 0 }
    };
    await kvSet(`acct:${id}`, acct);
    await kvSet(`email:${email}`, { id });
    return res.status(201).json({ success: true, data: { token: signToken({ sub: id }), account: publicAccount(acct) } });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ success: false, message: 'Could not create the account' });
  }
}

export async function login(req, res) {
  try {
    const email = String((req.body && req.body.email) || '').trim().toLowerCase();
    const password = String((req.body && req.body.password) || '');
    if (rateLimited(`login:${req.ip || 'x'}:${email}`, 8, 10 * 60 * 1000)) {
      return res.status(429).json({ success: false, message: 'Too many attempts. Please wait a few minutes and try again.' });
    }
    const ref = email ? kvGet(`email:${email}`) : null;
    const acct = ref ? kvGet(`acct:${ref.id}`) : null;
    const ok = acct ? await verifyPassword(password, acct.passHash) : false;
    if (!acct || !ok) return res.status(401).json({ success: false, message: 'Incorrect email or password.' });
    return res.json({ success: true, data: { token: signToken({ sub: acct.id }), account: publicAccount(acct) } });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Could not sign in' });
  }
}

export const me = requireAuth(async (req, res) => res.json({ success: true, data: { account: publicAccount(req.account) } }));

export const updateMe = requireAuth(async (req, res) => {
  const name = String((req.body && req.body.name) || '').trim();
  if (name.length < 2 || name.length > 60) return res.status(400).json({ success: false, message: 'Please enter your name (2 to 60 characters).' });
  const acct = req.account;
  acct.name = name;
  if (req.body && typeof req.body.business_name === 'string') acct.businessName = req.body.business_name.trim().slice(0, 80);
  await kvSet(`acct:${acct.id}`, acct);
  return res.json({ success: true, data: { account: publicAccount(acct) } });
});