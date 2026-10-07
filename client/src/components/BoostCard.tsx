import React, { useState } from 'react';
import { Zap, Loader2, Crown } from 'lucide-react';
import { useAccount } from '../context/AccountContext.tsx';

interface BoostCardProps {
  token: any;
}

const RUPEE = '\u20B9';

// Two lanes: your token slides from the standard lane into the priority lane when you boost.
const Lanes: React.FC<{ boosted: boolean }> = ({ boosted }) => (
  <svg viewBox="0 0 340 92" className="w-full h-auto" aria-hidden="true">
    <rect x="4" y="6" width="332" height="34" rx="17" fill="#f59e0b" fillOpacity="0.1" stroke="#f59e0b" strokeOpacity="0.35" />
    <rect x="4" y="50" width="332" height="34" rx="17" fill="#ffffff" fillOpacity="0.04" stroke="#ffffff" strokeOpacity="0.12" />
    <text x="16" y="27" fill="#fbbf24" fontSize="8" fontWeight="700" letterSpacing="1.5">PRIORITY LANE</text>
    <text x="16" y="71" fill="#94a3b8" fontSize="8" fontWeight="700" letterSpacing="1.5">STANDARD LANE</text>
    {[0, 1, 2, 3, 4].map((i) => (
      <circle key={i} cx={118 + i * 36} cy="67" r="9" fill="#475569">
        <animate attributeName="cy" values="67;65;67" dur={`${2.4 + i * 0.3}s`} repeatCount="indefinite" />
      </circle>
    ))}
    <g style={{ transform: boosted ? 'translate(118px, 23px)' : 'translate(298px, 67px)', transition: 'transform 1100ms cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
      <circle r="15" fill={boosted ? '#f59e0b' : '#22c55e'} fillOpacity="0.25">
        <animate attributeName="r" values="12;18;12" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle r="10" fill={boosted ? '#fbbf24' : '#22c55e'} stroke="#ffffff" strokeWidth="2" />
      <text y="3" textAnchor="middle" fill="#0d1117" fontSize="7" fontWeight="800">YOU</text>
    </g>
  </svg>
);

// Shown above the live token: move up the line with a priority boost.
export const BoostCard: React.FC<BoostCardProps> = ({ token }) => {
  const { account, openAuth, startCheckout, call, refresh, toast } = useAccount();
  const [boosted, setBoosted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  if (!token || !token.id) return null;
  const hasPriority = boosted || (token.priority_level && token.priority_level !== 'STANDARD');

  const useFree = async () => {
    setBusy(true);
    setMessage('');
    const r = await call('/api/billing/boost', { method: 'POST', body: { token_id: token.id } });
    setBusy(false);
    if (r.ok && r.json && r.json.success) {
      setBoosted(true);
      toast('Priority boost applied. You moved up the line.');
      await refresh();
    } else if (r.status === 402 && r.json && r.json.needs_payment) {
      startCheckout(
        { kind: 'BOOST', tokenId: token.id, title: `Priority boost for token ${token.token_display}`, amount: r.json.amount },
        () => setBoosted(true)
      );
    } else {
      setMessage((r.json && r.json.message) || 'Could not boost this token.');
    }
  };

  return (
    <div className="max-w-xl mx-auto mb-5 rounded-2xl glass-panel border border-brand-500/30 p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${hasPriority ? 'bg-amber-400/20' : 'bg-brand-500/15'}`}>
            {hasPriority ? <Crown className="w-5 h-5 text-amber-300" /> : <Zap className="w-5 h-5 text-brand-400" />}
          </div>
          <div>
            <p className="text-sm font-extrabold text-white">{hasPriority ? 'Priority is active' : 'Move up the line'}</p>
            <p className="text-[11px] text-slate-400">
              {hasPriority
                ? `Token ${token.token_display} is ahead of standard tokens.`
                : account
                ? account.boosts.unlimited
                  ? 'Your Elite plan includes unlimited boosts.'
                  : account.boosts.left && account.boosts.left > 0
                  ? `You have ${account.boosts.left} free boost${account.boosts.left === 1 ? '' : 's'} left this month.`
                  : `A boost costs ${RUPEE}${account.boosts.price}.`
                : 'Sign in to use a priority boost.'}
            </p>
            {message && <p className="text-[11px] text-rose-400 mt-1">{message}</p>}
          </div>
        </div>
        {!hasPriority && (
          <button
            onClick={() => (account ? useFree() : openAuth('signin'))}
            disabled={busy}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-emerald-600 text-white text-xs font-extrabold shadow-lg shadow-brand-500/25 disabled:opacity-60 flex items-center justify-center gap-2 whitespace-nowrap"
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {account ? 'Boost my token' : 'Sign in to boost'}
          </button>
        )}
      </div>
      <Lanes boosted={Boolean(hasPriority)} />
    </div>
  );
};