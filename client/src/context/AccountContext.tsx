import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../config.ts';
import { AuthModal } from '../components/AuthModal.tsx';
import { CheckoutModal } from '../components/CheckoutModal.tsx';

export interface Account {
  id: string;
  email: string;
  name: string;
  role: 'CUSTOMER' | 'BUSINESS';
  businessName: string;
  isAdmin: boolean;
  createdAt: string;
  plan: { id: string; name: string; interval: string | null; renewsAt: string | null };
  boosts: { included: number | null; used: number; left: number | null; price: number; unlimited: boolean };
}

export interface CheckoutRequest {
  kind: 'PLAN' | 'BOOST';
  planId?: string;
  interval?: 'month' | 'year';
  tokenId?: string;
  title: string;
  amount: number;
}

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
  role: 'CUSTOMER' | 'BUSINESS';
  businessName?: string;
}

export interface CallResult {
  ok: boolean;
  status: number;
  json: any;
}

interface AccountContextType {
  account: Account | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (input: SignUpInput) => Promise<string | null>;
  signOut: () => void;
  refresh: () => Promise<void>;
  openAuth: (mode?: 'signin' | 'signup') => void;
  startCheckout: (req: CheckoutRequest, onDone?: () => void) => void;
  call: (path: string, init?: { method?: string; body?: unknown }) => Promise<CallResult>;
}

const TOKEN_KEY = 'qless:token';
const AccountContext = createContext<AccountContextType | null>(null);

export function useAccount(): AccountContextType {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error('useAccount must be used inside AccountProvider');
  return ctx;
}

export const AccountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  });
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(token));
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | null>(null);
  const [checkout, setCheckout] = useState<{ req: CheckoutRequest; onDone?: () => void } | null>(null);

  const saveToken = useCallback((t: string | null) => {
    setToken(t);
    try {
      if (t) localStorage.setItem(TOKEN_KEY, t);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const call = useCallback(
    async (path: string, init: { method?: string; body?: unknown } = {}): Promise<CallResult> => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      try {
        const res = await apiFetch(path, {
          method: init.method || 'GET',
          headers,
          body: init.body !== undefined ? JSON.stringify(init.body) : undefined
        });
        let json: any = null;
        try {
          json = await res.json();
        } catch {
          /* empty body */
        }
        return { ok: res.ok, status: res.status, json };
      } catch {
        return {
          ok: false,
          status: 0,
          json: { message: 'Could not reach the server. It may be waking up, so please try again in a minute.' }
        };
      }
    },
    [token]
  );

  const refresh = useCallback(async () => {
    if (!token) {
      setAccount(null);
      return;
    }
    const r = await call('/api/account/me');
    if (r.ok && r.json && r.json.success) setAccount(r.json.data.account);
    else if (r.status === 401) {
      saveToken(null);
      setAccount(null);
    }
  }, [token, call, saveToken]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (token) await refresh();
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  const authenticate = useCallback(
    async (path: string, body: unknown): Promise<string | null> => {
      const r = await call(path, { method: 'POST', body });
      if (r.ok && r.json && r.json.success) {
        saveToken(r.json.data.token);
        setAccount(r.json.data.account);
        setAuthMode(null);
        return null;
      }
      return (r.json && r.json.message) || 'Something went wrong. Please try again.';
    },
    [call, saveToken]
  );

  const signIn = useCallback((email: string, password: string) => authenticate('/api/account/login', { email, password }), [authenticate]);
  const signUp = useCallback(
    (input: SignUpInput) =>
      authenticate('/api/account/register', {
        name: input.name,
        email: input.email,
        password: input.password,
        role: input.role,
        business_name: input.businessName || ''
      }),
    [authenticate]
  );

  const signOut = useCallback(() => {
    saveToken(null);
    setAccount(null);
  }, [saveToken]);

  const openAuth = useCallback((mode: 'signin' | 'signup' = 'signin') => setAuthMode(mode), []);

  const startCheckout = useCallback(
    (req: CheckoutRequest, onDone?: () => void) => {
      if (!account) {
        setAuthMode('signup');
        return;
      }
      setCheckout({ req, onDone });
    },
    [account]
  );

  const value = useMemo<AccountContextType>(
    () => ({ account, loading, signIn, signUp, signOut, refresh, openAuth, startCheckout, call }),
    [account, loading, signIn, signUp, signOut, refresh, openAuth, startCheckout, call]
  );

  return (
    <AccountContext.Provider value={value}>
      {children}
      {authMode && <AuthModal mode={authMode} setMode={setAuthMode} onClose={() => setAuthMode(null)} />}
      {checkout && (
        <CheckoutModal
          request={checkout.req}
          onDone={checkout.onDone}
          onClose={() => setCheckout(null)}
        />
      )}
    </AccountContext.Provider>
  );
};