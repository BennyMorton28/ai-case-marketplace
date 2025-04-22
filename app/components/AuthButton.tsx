'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface AuthButtonProps {
  onAuthChange?: (isAuthenticated: boolean) => void;
}

export default function AuthButton({ onAuthChange }: AuthButtonProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  const handleAuth = async () => {
    if (isAuthenticated) {
      // Handle sign out
      setIsAuthenticated(false);
      onAuthChange?.(false);
      router.refresh();
    } else {
      // For demo purposes, just toggle auth state
      // In a real app, this would integrate with your auth system
      setIsAuthenticated(true);
      onAuthChange?.(true);
      router.refresh();
    }
  };

  return (
    <button
      onClick={handleAuth}
      className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
    >
      {isAuthenticated ? 'Sign Out' : 'Admin Login'}
    </button>
  );
} 