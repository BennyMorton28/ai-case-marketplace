'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';

export default function NavBar() {
  const { isAuthenticated, isAdmin, isSuperAdmin, login, logout, loading, user } = useAuth();
  const pathname = usePathname();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await logout();
      window.location.reload();
    } catch (error) {
      setIsSigningOut(false);
      console.error('Error signing out:', error);
    }
  };

  // Don't show sign-in/out buttons while loading
  const showAuthButtons = !loading;

  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-xl font-bold text-blue-600">
                AI Cases at Kellogg
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  pathname === '/'
                    ? 'border-blue-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Home
              </Link>
              {isSuperAdmin && (
                <Link
                  href="/admin"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    pathname === '/admin'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  Admin
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center">
            {showAuthButtons && (
              isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <span className="text-gray-600">{user?.email}</span>
                  <button
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className={`px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 ${
                      isSigningOut ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isSigningOut ? 'Signing Out...' : 'Sign Out'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={login}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Sign In
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </nav>
  );
} 