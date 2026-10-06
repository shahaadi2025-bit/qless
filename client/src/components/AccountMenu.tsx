import React, { useEffect, useRef, useState } from 'react';
import { LogOut, UserCircle2, Tag } from 'lucide-react';
import { useAccount } from '../context/AccountContext.tsx';

interface AccountMenuProps {
  setActiveTab: (tab: string) => void;
}

export const AccountMenu: React.FC<AccountMenuProps> = ({ setActiveTab }) => {
  const { account, loading, openAuth, signOut } = useAccount();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  if (loading) return <div className="w-20 h-8 rounded-lg bg-white/5 animate-pulse" />;

  if (!account) {
    return (
      <div className="flex items-center gap-1.5">
        <button onClick={() => openAuth('signin')} className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-slate-200 hover:text-white hover:bg-white/10 transition-all">
          Sign in
        </button>
        <button onClick={() => openAuth('signup')} className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-md shadow-brand-500/25 transition-all">
          Get started
        </button>
      </div>
    );
  }

  const initial = (account.name || account.email).trim().charAt(0).toUpperCase();
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full bg-dark-900 border border-white/10 hover:border-brand-500/50 transition-all" aria-haspopup="menu" aria-expanded={open}>
        <span className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-emerald-700 text-white text-xs font-extrabold flex items-center justify-center">{initial}</span>
        <span className="hidden sm:inline text-[11px] font-bold text-white max-w-[90px] truncate">{account.name.split(' ')[0]}</span>
        <span className="px-1.5 py-0.5 rounded bg-brand-500/15 text-brand-300 text-[9px] font-extrabold uppercase">{account.plan.name}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl glass-panel border border-white/10 shadow-2xl p-1.5 z-[60]" role="menu">
          <div className="px-3 py-2 border-b border-white/10 mb-1">
            <p className="text-xs font-bold text-white truncate">{account.name}</p>
            <p className="text-[10px] text-slate-400 truncate">{account.email}</p>
          </div>
          <button role="menuitem" onClick={() => { setActiveTab('account'); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-200 hover:bg-white/10">
            <UserCircle2 className="w-4 h-4 text-brand-400" /> My account
          </button>
          <button role="menuitem" onClick={() => { setActiveTab('pricing'); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-200 hover:bg-white/10">
            <Tag className="w-4 h-4 text-brand-400" /> Plans and pricing
          </button>
          <button role="menuitem" onClick={() => { signOut(); setOpen(false); setActiveTab('home'); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-rose-300 hover:bg-rose-500/10">
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
};