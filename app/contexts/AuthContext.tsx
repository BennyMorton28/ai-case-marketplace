'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface AuthContextType {
  isAdmin: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// WARNING: This is a temporary development-only authentication.
// TODO: Replace with proper Azure AD authentication before production.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);

  const login = () => {
    console.warn('Using development-only admin toggle. Replace with proper auth before production.');
    setIsAdmin(true);
  };

  const logout = () => {
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 