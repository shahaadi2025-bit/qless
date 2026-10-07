import React, { useEffect, useState } from 'react';
import * as QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { X, Loader2, Smartphone, CreditCard, FlaskConical, Copy, CheckCircle2, ShieldCheck, Clock } from 'lucide-react';
import { useAccount } from '../context/AccountContext.tsx';
import type { CheckoutRequest } from '../context/AccountContext.tsx';

interface CheckoutModalProps {
  request: CheckoutRequest;
  onClose: () => void;
  onDone?: () => void;
}

type Method = 'razorpay' | 'upi' | 'demo';
const RUPEE = '\u20B9';

function celebrate() {
  confetti({ particleCount: 110, spread: 75, origin: { y: 0.7 }, disableForReducedMotion: true });
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ request, onClose, onDone }) => {
  const { account, call, refresh, toast } = useAccount();
  const [phase, setPhase] = useState<'loading' | 'choose' | 'review' | 'done' | 'error'>('loading');
  const [data, setData] = useState<any>(null);
  const [method, setMethod] = useState<Method>('demo');
  const [utr, setUtr] = useState('');
  const [qr, setQr] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Ask the server to prepare the payment. The price is decided on the server, not here.
  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await call('/api/billing/checkout', {
        method: 'POST',
        body: { kind: request.kind, planId: request.planId, interval: request.interval, tokenId: request.tokenId }
      });
      if (!alive) return;
      if (!r.ok || !r.json || !r.json.success) {
        setError((r.json && r.json.message) || 'Could not start the payment.');
        setPhase('error');
        return;
      }
      if (r.json.data.activated) {
        await refresh();
        setPhase('done');
        celebrate();
        toast('Plan switched');
        if (onDone) onDone();
        return;
      }
      const d = r.json.data;
      setData(d);
      const m: Method[] = [];
      if (d.options.razorpay) m.push('razorpay');
      if (d.options.demo) m.push('demo');
      // Manual UPI needs a person to confirm it, which is too slow for a queue boost when another method exists.
      if (d.options.upi && (request.kind !== 'BOOST' || m.length === 0)) m.push('upi');
      setMethod(m[0] || 'upi');
      setPhase('choose');
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (method !== 'upi' || !data || !data.options.upi) return;
    QRCode.toDataURL(data.options.upi.link, { width: 220, margin: 1 })
      .then(setQr)
      .catch(() => setQr(''));
  }, [method, data]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const finish = async () => {
    await refresh();
    setPhase('done');
    celebrate();
    toast(request.kind === 'BOOST' ? 'Priority boost applied' : 'Payment received. Your plan is active.');
    if (onDone) onDone();
  };

  const payRazorpay = async () => {
    setError('');
    const rz = data.options.razorpay;
    setBusy(true);
    const ok = await loadRazorpay();
    if (!ok) {
      setBusy(false);
      setError('Could not load the payment window. Check your connection and try again.');
      return;
    }
    const Razorpay = (window as any).Razorpay;
    const rzp = new Razorpay({
      key: rz.key_id,
      amount: rz.amount_paise,
      currency: rz.currency,
      order_id: rz.order_id,
      name: 'QLESS',
      description: data.payment.title,
      prefill: { name: account ? account.name : '', email: account ? account.email : '' },
      theme: { color: '#22c55e' },
      handler: async (resp: any) => {
        const r = await call('/api/billing/razorpay/verify', { method: 'POST', body: resp });
        setBusy(false);
        if (r.ok && r.json && r.json.success) await finish();
        else setError((r.json && r.json.message) || 'We could not verify the payment. If money was deducted, it will be refunded.');
      },
      modal: { ondismiss: () => setBusy(false) }
    });
    rzp.on('payment.failed', (resp: any) => {
      setBusy(false);
      setError((resp && resp.error && resp.error.description) || 'The payment failed. You can try again.');
    });
    rzp.open();
  };

  const payDemo = async () => {
    setError('');
    setBusy(true);
    const r = await call('/api/billing/demo/complete', { method: 'POST', body: { payment_id: data.payment.id } });
    setBusy(false);
    if (r.ok && r.json && r.json.success) await finish();
    else setError((r.json && r.json.message) || 'The practice payment failed.');
  };

  const submitUtr = async () => {
    setError('');
    setBusy(true);
    const r = await call('/api/billing/upi/submit', { method: 'POST', body: { payment_id: data.payment.id, utr } });
    setBusy(false);
    if (r.ok && r.json && r.json.success) setPhase('review');
    else setError((r.json && r.json.message) || 'Could not submit the reference number.');
  };

  const copyVpa = async () => {
    try {
      await navigator.clipboard.writeText(data.options.upi.vpa);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const available: Method[] = [];
  if (data) {
    if (data.options.razorpay) available.push('razorpay');
    if (data.options.demo) available.push('demo');
    if (data.options.upi && (request.kind !== 'BOOST' || available.length === 0)) available.push('upi');
  }
  const tabMeta: Record<Method, { label: string; icon: React.ReactNode }> = {
    razorpay: { label: 'UPI, cards, netbanking', icon: <CreditCard className="w-4 h-4" /> },
    upi: { label: 'Pay with any UPI app', icon: <Smartphone className="w-4 h-4" /> },
    demo: { label: 'Practice payment', icon: <FlaskConical className="w-4 h-4" /> }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={onClose} role="dialog" aria-modal="true" aria-label="Checkout">
      <div className="relative w-full max-w-md rounded-3xl glass-panel border border-brand-500/30 shadow-2xl p-6 space-y-5 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center" aria-label="Close">
          <X className="w-4 h-4" />
        </button>

        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-brand-400">Checkout</span>
          <h3 className="text-lg font-black text-white mt-1 pr-8">{request.title}</h3>
          <p className="text-3xl font-black text-white mt-2 font-mono">
            {RUPEE}
            {data ? data.payment.amount : request.amount}
          </p>
        </div>

        {phase === 'loading' && (
          <div className="py-10 flex flex-col items-center gap-3 text-slate-300 text-sm">
            <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
            Preparing your payment...
          </div>
        )}

        {phase === 'error' && (
          <div className="space-y-4">
            <p className="text-sm text-rose-300">{error}</p>
            <button onClick={onClose} className="w-full py-2.5 rounded-xl glass-card text-white text-sm font-bold border border-white/10">Close</button>
          </div>
        )}

        {phase === 'choose' && data && (
          <>
            {data.test && (
              <p className="text-[11px] px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
                Test mode: no real money moves. In the payment window choose UPI and enter <strong>success@razorpay</strong>.
              </p>
            )}
            {method === 'demo' && !data.test && (
              <p className="text-[11px] px-3 py-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-200">
                Practice mode: this simulates a payment so you can try QLESS. No real money moves.
              </p>
            )}

            {available.length > 1 && (
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${available.length}, minmax(0, 1fr))` }}>
                {available.map((m) => (
                  <button key={m} onClick={() => { setMethod(m); setError(''); }} className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl text-[10px] font-bold text-center transition-all ${method === m ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25' : 'glass-card text-slate-300 hover:text-white'}`}>
                    {tabMeta[m].icon}
                    {tabMeta[m].label}
                  </button>
                ))}
              </div>
            )}

            {method === 'razorpay' && (
              <button onClick={payRazorpay} disabled={busy} className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-500 to-emerald-600 text-white font-extrabold text-sm shadow-lg shadow-brand-500/25 disabled:opacity-60 flex items-center justify-center gap-2">
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                Pay {RUPEE}{data.payment.amount} securely
              </button>
            )}

            {method === 'demo' && (
              <button onClick={payDemo} disabled={busy} className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-extrabold text-sm shadow-lg disabled:opacity-60 flex items-center justify-center gap-2">
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                Complete practice payment
              </button>
            )}

            {method === 'upi' && data.options.upi && (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3">
                  {qr ? <img src={qr} alt="UPI QR code" className="w-44 h-44 rounded-2xl bg-white p-2" /> : <div className="w-44 h-44 rounded-2xl bg-white/10 animate-pulse" />}
                  <p className="text-[11px] text-slate-400 text-center">Scan with any UPI app, or tap the button on your phone.</p>
                  <a href={data.options.upi.link} className="w-full text-center py-3 rounded-xl bg-gradient-to-r from-brand-500 to-emerald-600 text-white font-extrabold text-sm shadow-lg shadow-brand-500/25">
                    Open UPI app
                  </a>
                </div>
                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl glass-card border border-white/10 text-xs">
                  <span className="text-slate-300 truncate">Pay to <strong className="text-white">{data.options.upi.vpa}</strong></span>
                  <button onClick={copyVpa} className="flex items-center gap-1 text-brand-400 hover:text-brand-300 font-bold shrink-0">
                    <Copy className="w-3.5 h-3.5" /> {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">After paying, enter the 12-digit UTR / reference number</label>
                  <input value={utr} onChange={(e) => setUtr(e.target.value.replace(/\D/g, '').slice(0, 12))} inputMode="numeric" placeholder="123456789012" className="w-full px-3 py-2.5 rounded-xl glass-card text-white text-sm font-mono border border-white/10 focus:border-brand-500 focus:outline-none" />
                  <button onClick={submitUtr} disabled={busy || utr.length !== 12} className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                    {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                    Submit for verification
                  </button>
                  <p className="text-[10px] text-slate-500">UPI payments made this way are checked by a person before your plan switches on.</p>
                </div>
              </div>
            )}

            {error && <p className="text-xs text-rose-400" role="alert">{error}</p>}
            <p className="text-[10px] text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> QLESS never sees or stores your card or UPI PIN.
            </p>
          </>
        )}

        {phase === 'review' && (
          <div className="py-6 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/15 flex items-center justify-center"><Clock className="w-7 h-7 text-amber-300" /></div>
            <h4 className="font-extrabold text-white">Submitted for verification</h4>
            <p className="text-xs text-slate-300">We will switch your plan on as soon as the payment is confirmed. You can see the status under My account.</p>
            <button onClick={onClose} className="w-full py-2.5 rounded-xl glass-card text-white text-sm font-bold border border-white/10">Done</button>
          </div>
        )}

        {phase === 'done' && (
          <div className="py-6 text-center space-y-3">
            <svg viewBox="0 0 52 52" className="w-16 h-16 mx-auto" aria-hidden="true">
              <circle cx="26" cy="26" r="24" fill="none" stroke="#22c55e" strokeWidth="3" className="draw-circle" />
              <path d="M14 27 l8 8 l16 -17" fill="none" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="draw-check" />
            </svg>
            <h4 className="font-extrabold text-white text-lg">{request.kind === 'BOOST' ? 'Priority boost applied' : 'You are all set'}</h4>
            <p className="text-xs text-slate-300">
              {request.kind === 'BOOST' ? 'Your token has moved up the line.' : 'Your plan is active. Thanks for choosing QLESS.'}
            </p>
            <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
};