'use client';

import React from 'react';
import Link from 'next/link';
import { useSession, signIn, signOut } from 'next-auth/react';

export default function Header() {
  const { data: session } = useSession();

  return (
    <header className="bg-white shadow">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-xl font-bold text-blue-600">
              AI Case Marketplace
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {session ? (
              <>
                <span className="text-gray-600">{session.user?.email}</span>
                <button
                  onClick={() => signOut()}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <button
                onClick={() => signIn()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
} 