import React, { useEffect, useState } from 'react';
import { X, Eye, EyeOff, ShieldCheck, Zap, Ticket, Loader2 } from 'lucide-react';
import { useAccount } from '../context/AccountContext.tsx';

interface AuthModalProps {
  mode: 'signin' | 'signup';
  setMode: (m: 'signin' | 'signup') => void;
  onClose: () => void;
}

function strength(pw: string): { score: number; label: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return { score, label: ['Too short', 'Weak', 'Okay', 'Good', 'Strong'][score] };
}

export const AuthModal: React.FC<AuthModalProps> = ({ mode, setMode, onClose }) => {
  const { signIn, signUp } = useAccount();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'CUSTOMER' | 'BUSINESS'>('CUSTOMER');
  const [businessName, setBusinessName] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isSignup = mode === 'signup';
  const pw = strength(password);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (isSignup && name.trim().length < 2) return setError('Please enter your name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return setError('Please enter a valid email address.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    setBusy(true);
    const msg = isSignup
      ? await signUp({ name: name.trim(), email: email.trim(), password, role, businessName: businessName.trim() })
      : await signIn(email.trim(), password);
    setBusy(false);
    if (msg) setError(msg);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={isSignup ? 'Create account' : 'Sign in'}
    >
      <div
        className="relative w-full max-w-3xl grid md:grid-cols-5 rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-dark-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: brand panel */}
        <div className="hidden md:flex md:col-span-2 relative flex-col justify-between p-7 bg-gradient-to-br from-emerald-700 via-brand-600 to-teal-800 text-white overflow-hidden">
          <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/10 float-slow" />
          <div className="absolute -bottom-20 -left-10 w-64 h-64 rounded-full bg-black/10 float-slow" style={{ animationDelay: '1.5s' }} />
          <div className="relative">
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center font-mono font-extrabold text-xl">Q</div>
            <h3 className="mt-5 text-2xl font-black leading-tight">Join the queue.<br />Not the crowd.</h3>
          </div>
          <ul className="relative space-y-3 text-sm">
            <li className="flex items-center gap-3"><Ticket className="w-4 h-4 shrink-0" /> Live tokens for any queue</li>
            <li className="flex items-center gap-3"><Zap className="w-4 h-4 shrink-0" /> Priority boosts and plans</li>
            <li className="flex items-center gap-3"><ShieldCheck className="w-4 h-4 shrink-0" /> Passwords are stored hashed</li>
          </ul>
        </div>

        {/* Right: form */}
        <form onSubmit={submit} className="md:col-span-3 p-6 sm:p-8 space-y-4">
          <button type="button" onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center" aria-label="Close">
            <X className="w-4 h-4" />
          </button>

          <div>
            <h2 className="text-2xl font-black text-white">{isSignup ? 'Create your account' : 'Welcome back'}</h2>
            <p className="text-xs text-slate-400 mt-1">
              {isSignup ? 'Free to start. Upgrade only when you want to.' : 'Sign in to see your plan and payments.'}
            </p>
          </div>

          {isSignup && (
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-dark-950/70 border border-white/10 text-xs font-bold">
              {(['CUSTOMER', 'BUSINESS'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`py-2 rounded-lg transition-all ${role === r ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25' : 'text-slate-300 hover:text-white'}`}
                >
                  {r === 'CUSTOMER' ? 'I am a customer' : 'I run a business'}
                </button>
              ))}
            </div>
          )}

          {isSignup && (
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-300">Your name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="w-full px-3 py-2.5 rounded-xl glass-card text-white text-sm border border-white/10 focus:border-brand-500 focus:outline-none" />
            </label>
          )}
          {isSignup && role === 'BUSINESS' && (
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-300">Business name (optional)</span>
              <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="w-full px-3 py-2.5 rounded-xl glass-card text-white text-sm border border-white/10 focus:border-brand-500 focus:outline-none" />
            </label>
          )}

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-300">Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="w-full px-3 py-2.5 rounded-xl glass-card text-white text-sm border border-white/10 focus:border-brand-500 focus:outline-none" />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-300">Password</span>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                className="w-full pl-3 pr-10 py-2.5 rounded-xl glass-card text-white text-sm border border-white/10 focus:border-brand-500 focus:outline-none"
              />
              <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white" aria-label={showPw ? 'Hide password' : 'Show password'}>
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </label>

          {isSignup && password.length > 0 && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className={`h-1.5 flex-1 rounded-full ${i < pw.score ? (pw.score >= 3 ? 'bg-emerald-400' : 'bg-amber-400') : 'bg-white/10'}`} />
                ))}
              </div>
              <p className="text-[10px] text-slate-400">Password strength: {pw.label}</p>
            </div>
          )}

          {error && <p className="text-xs text-rose-400" role="alert">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-500 to-emerald-600 hover:from-brand-600 hover:to-emerald-700 text-white font-extrabold text-sm shadow-lg shadow-brand-500/25 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSignup ? 'Create account' : 'Sign in'}
          </button>

          <p className="text-xs text-slate-400 text-center">
            {isSignup ? 'Already have an account?' : 'New to QLESS?'}{' '}
            <button type="button" onClick={() => { setError(''); setMode(isSignup ? 'signin' : 'signup'); }} className="font-bold text-brand-400 hover:text-brand-300">
              {isSignup ? 'Sign in' : 'Create one'}
            </button>
          </p>
          <button type="button" onClick={onClose} className="w-full text-[11px] text-slate-500 hover:text-slate-300">
            Continue as guest
          </button>
        </form>
      </div>
    </div>
  );
};