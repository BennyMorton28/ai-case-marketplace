'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';

interface User {
  email: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  canCreateCases: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

// Create the context
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  isSuperAdmin: false,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
});

// Create a client component
function AuthContextProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      if (session?.user?.email) {
        try {
          const response = await fetch('/api/users/check-admin', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: session.user.email,
            }),
          });
          
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
          } else {
            setUser({
              email: session.user.email,
              isAdmin: false,
              isSuperAdmin: false,
              canCreateCases: false,
            });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUser({
            email: session.user.email,
            isAdmin: false,
            isSuperAdmin: false,
            canCreateCases: false,
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    if (status === 'loading') {
      setLoading(true);
    } else {
      fetchUser();
    }
  }, [session, status]);

  const login = () => {
    signIn('azure-ad');
  };

  const logout = async () => {
    setUser(null);  // Clear user state immediately
    setLoading(true);  // Set loading state to prevent flicker
    await signOut({ 
      callbackUrl: '/',
      redirect: true
    });
  };

  const value = {
    user,
    loading: status === 'loading' || loading,
    isAdmin: user?.isAdmin || user?.isSuperAdmin || false,
    isSuperAdmin: user?.isSuperAdmin || false,
    isAuthenticated: !!session,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Export the provider directly
export function AuthProvider({ children }: { children: ReactNode }) {
  return <AuthContextProvider>{children}</AuthContextProvider>;
}

// Hook to use the auth context
export const useAuth = () => useContext(AuthContext);
