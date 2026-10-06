import React, { useEffect, useState } from 'react';
import { Check, Sparkles, Loader2, ShieldCheck } from 'lucide-react';
import { apiFetch } from '../config.ts';
import { useAccount } from '../context/AccountContext.tsx';

interface Plan {
  id: string;
  audience: 'CUSTOMER' | 'BUSINESS';
  name: string;
  tagline: string;
  monthly: number;
  yearly: number;
  popular?: boolean;
  features: string[];
}
interface Modes {
  razorpay: boolean;
  test: boolean;
  upi: boolean;
  demo: boolean;
  durable: boolean;
}

const RUPEE = '\u20B9';

export const PricingPage: React.FC = () => {
  const { account, openAuth, startCheckout } = useAccount();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [modes, setModes] = useState<Modes | null>(null);
  const [error, setError] = useState('');
  const [audience, setAudience] = useState<'CUSTOMER' | 'BUSINESS'>('CUSTOMER');
  const [interval, setIntervalMode] = useState<'month' | 'year'>('month');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await apiFetch('/api/billing/plans');
        const json = await res.json();
        if (!alive) return;
        if (json && json.success) {
          setPlans(json.data.plans);
          setModes(json.data.modes);
        } else setError('Could not load the plans.');
      } catch {
        if (alive) setError('Could not reach the server. It may be waking up, so please refresh in a minute.');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (account) setAudience(account.role);
  }, [account && account.role]);

  const shown = plans.filter((p) => p.audience === audience);

  const choose = (plan: Plan) => {
    if (!account) return openAuth('signup');
    startCheckout({
      kind: 'PLAN',
      planId: plan.id,
      interval,
      title: `${plan.name} plan (${interval === 'year' ? 'yearly' : 'monthly'})`,
      amount: interval === 'year' ? plan.yearly : plan.monthly
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="text-center space-y-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/30 text-[11px] font-bold text-brand-300">
          <Sparkles className="w-3.5 h-3.5" /> Simple pricing
        </span>
        <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">Pick the plan that fits</h2>
        <p className="text-slate-400 text-sm max-w-xl mx-auto">Start free. Upgrade when you want to skip more of the wait, or run more counters.</p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <div className="inline-flex p-1 rounded-xl bg-dark-900 border border-white/10 text-xs font-bold">
          {(['CUSTOMER', 'BUSINESS'] as const).map((a) => (
            <button key={a} onClick={() => setAudience(a)} className={`px-4 py-2 rounded-lg transition-all ${audience === a ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25' : 'text-slate-300 hover:text-white'}`}>
              {a === 'CUSTOMER' ? 'For customers' : 'For businesses'}
            </button>
          ))}
        </div>
        <div className="inline-flex p-1 rounded-xl bg-dark-900 border border-white/10 text-xs font-bold">
          {(['month', 'year'] as const).map((i) => (
            <button key={i} onClick={() => setIntervalMode(i)} className={`px-4 py-2 rounded-lg transition-all ${interval === i ? 'bg-white/15 text-white' : 'text-slate-300 hover:text-white'}`}>
              {i === 'month' ? 'Monthly' : 'Yearly'}
              {i === 'year' && <span className="ml-1.5 text-[9px] text-emerald-300">2 months free</span>}
            </button>
          ))}
        </div>
      </div>

      {modes && (
        <p className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
          {modes.razorpay
            ? modes.test
              ? 'Razorpay test mode: no real money moves. Use UPI ID success@razorpay.'
              : 'Pay with UPI, cards or netbanking. Payments are processed by Razorpay.'
            : modes.upi
            ? 'Pay with any UPI app. UPI payments are verified before your plan switches on.'
            : modes.demo
            ? 'Practice mode: payments are simulated, no real money moves.'
            : 'Payments are not configured yet.'}
        </p>
      )}

      {error && <p className="text-center text-sm text-rose-400">{error}</p>}
      {!error && plans.length === 0 && (
        <div className="flex justify-center py-10 text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
      )}

      <div className="grid gap-5 md:grid-cols-3">
        {shown.map((plan) => {
          const price = interval === 'year' ? plan.yearly : plan.monthly;
          const current = account && account.plan.id === plan.id;
          const wrongRole = account && account.role !== plan.audience;
          return (
            <div key={plan.id} className={`relative rounded-3xl p-[1.5px] card-glow ${plan.popular ? 'bg-gradient-to-br from-brand-400 via-emerald-300 to-sky-400' : 'bg-white/10'}`}>
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-brand-500 to-emerald-500 text-[10px] font-extrabold text-white shadow-lg">MOST POPULAR</span>
              )}
              <div className="h-full rounded-3xl bg-dark-900 p-6 flex flex-col">
                <h3 className="text-lg font-black text-white">{plan.name}</h3>
                <p className="text-xs text-slate-400 mt-1">{plan.tagline}</p>
                <p className="mt-5 flex items-end gap-1">
                  <span className="text-4xl font-black text-white font-mono">{price === 0 ? 'Free' : `${RUPEE}${price}`}</span>
                  {price > 0 && <span className="text-xs text-slate-400 mb-1.5">/{interval === 'year' ? 'year' : 'month'}</span>}
                </p>
                <ul className="mt-5 space-y-2.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-slate-300">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => choose(plan)}
                  disabled={Boolean(current) || Boolean(wrongRole)}
                  className={`mt-6 w-full py-3 rounded-xl text-sm font-extrabold transition-all disabled:opacity-60 disabled:cursor-not-allowed ${plan.popular ? 'bg-gradient-to-r from-brand-500 to-emerald-600 text-white shadow-lg shadow-brand-500/25 hover:scale-[1.02]' : 'bg-white/10 text-white hover:bg-white/15'}`}
                >
                  {current ? 'Current plan' : wrongRole ? `For ${plan.audience === 'BUSINESS' ? 'business' : 'customer'} accounts` : !account ? 'Get started' : price === 0 ? 'Switch to this plan' : `Choose ${plan.name}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {modes && !modes.durable && (
        <p className="text-center text-[10px] text-slate-500">Demo server: accounts and payments may reset when the server restarts.</p>
      )}
    </div>
  );
};