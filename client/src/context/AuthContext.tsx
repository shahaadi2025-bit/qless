import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: 'CUSTOMER' | 'STAFF' | 'BUSINESS_ADMIN' | 'SUPER_ADMIN';
  org_id?: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, role?: string) => Promise<boolean>;
  logout: () => void;
  switchRole: (role: 'CUSTOMER' | 'STAFF' | 'BUSINESS_ADMIN') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>({
    id: 'user-cust-01',
    email: 'aadi@example.com',
    full_name: 'Aadi Shah',
    role: 'CUSTOMER',
    org_id: null
  });

  const [token, setToken] = useState<string | null>('demo_token');

  const login = async (email: string, role = 'CUSTOMER') => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role })
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        setToken(data.token);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('API login notice, using local demo user');
      setUser({
        id: `user-${Date.now()}`,
        email,
        full_name: email.split('@')[0],
        role: role as any,
        org_id: role === 'STAFF' ? 'org-hosp-01' : null
      });
      return true;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
  };

  const switchRole = (newRole: 'CUSTOMER' | 'STAFF' | 'BUSINESS_ADMIN') => {
    if (newRole === 'CUSTOMER') {
      setUser({
        id: 'user-cust-01',
        email: 'aadi@example.com',
        full_name: 'Aadi Shah (Customer)',
        role: 'CUSTOMER',
        org_id: null
      });
    } else if (newRole === 'STAFF') {
      setUser({
        id: 'user-staff-01',
        email: 'nurse.sarah@citycare.org',
        full_name: 'Sister Sarah Jenkins (Triage)',
        role: 'STAFF',
        org_id: 'org-hosp-01'
      });
    } else if (newRole === 'BUSINESS_ADMIN') {
      setUser({
        id: 'user-admin-biz',
        email: 'dr.mehta@citycare.org',
        full_name: 'Dr. Ramesh Mehta (Chief Medical Off)',
        role: 'BUSINESS_ADMIN',
        org_id: 'org-hosp-01'
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
