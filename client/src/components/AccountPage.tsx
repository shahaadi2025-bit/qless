import React, { useEffect, useState } from 'react';
import { Crown, Receipt, ShieldCheck, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useAccount } from '../context/AccountContext.tsx';

interface AccountPageProps {
  onGoPricing: () => void;
}

const RUPEE = '\u20B9';
const STATUS_STYLE: Record<string, string> = {
  PAID: 'bg-emerald-500/15 text-emerald-300',
  UNDER_REVIEW: 'bg-amber-500/15 text-amber-300',
  CREATED: 'bg-white/10 text-slate-300',
  REJECTED: 'bg-rose-500/15 text-rose-300',
  FAILED: 'bg-rose-500/15 text-rose-300'
};

export const AccountPage: React.FC<AccountPageProps> = ({ onGoPricing }) => {
  const { account, loading, openAuth, call, refresh } = useAccount();
  const [payments, setPayments] = useState<any[]>([]);
  const [review, setReview] = useState<any[]>([]);
  const [busyId, setBusyId] = useState('');

  const load = async () => {
    const p = await call('/api/billing/payments');
    if (p.ok && p.json && p.json.success) setPayments(p.json.data);
    if (account && account.isAdmin) {
      const r = await call('/api/billing/admin/review');
      if (r.ok && r.json && r.json.success) setReview(r.json.data);
    }
  };

  useEffect(() => {
    if (account) load();
  }, [account && account.id]);

  const decide = async (id: string, approve: boolean) => {
    setBusyId(id);
    await call(`/api/billing/admin/${id}/${approve ? 'approve' : 'reject'}`, { method: 'POST', body: {} });
    setBusyId('');
    await load();
    await refresh();
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  if (!account) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4">
        <h2 className="text-2xl font-black text-white">Sign in to see your account</h2>
        <p className="text-sm text-slate-400">Your plan, boosts and payments live here.</p>
        <button onClick={() => openAuth('signin')} className="px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-sm">Sign in</button>
      </div>
    );
  }

  const b = account.boosts;
  const usedPct = b.unlimited || !b.included ? 100 : Math.min(100, Math.round((b.used / b.included) * 100));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="rounded-3xl glass-panel border border-white/10 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-emerald-700 text-white text-xl font-black flex items-center justify-center">
            {account.name.trim().charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-black text-white">{account.name}</h2>
            <p className="text-xs text-slate-400">{account.email}</p>
            <p className="text-[10px] mt-1 uppercase tracking-wider text-brand-300 font-bold">{account.role === 'BUSINESS' ? 'Business account' : 'Customer account'}{account.isAdmin ? ' | Admin' : ''}</p>
          </div>
        </div>
        <button onClick={onGoPricing} className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-extrabold">Change plan</button>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-3xl glass-card border border-white/10 p-6 space-y-3">
          <div className="flex items-center gap-2"><Crown className="w-4 h-4 text-amber-300" /><h3 className="font-extrabold text-white">Your plan</h3></div>
          <p className="text-3xl font-black text-white">{account.plan.name}</p>
          <p className="text-xs text-slate-400">
            {account.plan.renewsAt
              ? `Active until ${new Date(account.plan.renewsAt).toLocaleDateString()}. Renew any time to extend it.`
              : 'No renewal needed.'}
          </p>
        </div>

        <div className="rounded-3xl glass-card border border-white/10 p-6 space-y-3">
          <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-brand-400" /><h3 className="font-extrabold text-white">Priority boosts</h3></div>
          <p className="text-3xl font-black text-white">{b.unlimited ? 'Unlimited' : `${b.left} left`}</p>
          {!b.unlimited && (
            <>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-gradient-to-r from-brand-500 to-emerald-400" style={{ width: `${usedPct}%` }} /></div>
              <p className="text-xs text-slate-400">{b.used} of {b.included} used this month. Extra boosts cost {RUPEE}{b.price}.</p>
            </>
          )}
        </div>
      </div>

      {account.isAdmin && (
        <div className="rounded-3xl glass-panel border border-amber-500/30 p-6 space-y-3">
          <h3 className="font-extrabold text-white">UPI payments waiting for review ({review.length})</h3>
          {review.length === 0 ? (
            <p className="text-xs text-slate-400">Nothing waiting.</p>
          ) : (
            review.map((p) => (
              <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl glass-card border border-white/10 text-xs">
                <div>
                  <p className="font-bold text-white">{p.title} - {RUPEE}{p.amount}</p>
                  <p className="text-slate-400">{p.account ? `${p.account.name} (${p.account.email})` : 'Unknown'} | UTR <span className="font-mono text-slate-200">{p.utr}</span></p>
                  <p className="text-[10px] text-slate-500">Check this UTR in your bank or UPI app before approving.</p>
                </div>
                <div className="flex gap-2">
                  <button disabled={busyId === p.id} onClick={() => decide(p.id, true)} className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 disabled:opacity-60"><CheckCircle2 className="w-4 h-4" /> Approve</button>
                  <button disabled={busyId === p.id} onClick={() => decide(p.id, false)} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-rose-500/30 text-white font-bold flex items-center gap-1.5 disabled:opacity-60"><XCircle className="w-4 h-4" /> Reject</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <div className="rounded-3xl glass-card border border-white/10 p-6 space-y-3">
        <div className="flex items-center gap-2"><Receipt className="w-4 h-4 text-brand-400" /><h3 className="font-extrabold text-white">Payment history</h3></div>
        {payments.length === 0 ? (
          <p className="text-xs text-slate-400">No payments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 uppercase text-[10px] tracking-wider">
                  <th className="py-2 pr-3">Date</th><th className="py-2 pr-3">For</th><th className="py-2 pr-3">Amount</th><th className="py-2 pr-3">Method</th><th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {payments.map((p) => (
                  <tr key={p.id} className="text-slate-300">
                    <td className="py-2.5 pr-3 whitespace-nowrap">{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td className="py-2.5 pr-3">{p.title}</td>
                    <td className="py-2.5 pr-3 font-mono">{RUPEE}{p.amount}</td>
                    <td className="py-2.5 pr-3">{p.method || '-'}</td>
                    <td className="py-2.5"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_STYLE[p.status] || 'bg-white/10 text-slate-300'}`}>{String(p.status).replace('_', ' ')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};