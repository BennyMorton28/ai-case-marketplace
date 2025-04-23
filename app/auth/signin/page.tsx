'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';

export default function SignIn() {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await signIn('azure-ad', { 
        callbackUrl: '/'
      });
    } catch (error) {
      console.error('Error signing in:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Welcome to AI Case Marketplace
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please sign in with your Northwestern account
          </p>
        </div>
        <div className="mt-8">
          <button
            onClick={handleSignIn}
            disabled={isLoading}
            className="group relative flex w-full justify-center rounded-md border border-transparent bg-purple-600 py-3 px-4 text-sm font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isLoading ? (
              'Signing in...'
            ) : (
              <>
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
                  </svg>
                </span>
                Sign in with Northwestern SSO
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 