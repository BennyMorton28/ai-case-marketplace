import React, { ReactNode } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold text-indigo-600">
            AI Case Marketplace
          </Link>
          
          <nav className="flex items-center space-x-4">
            {session ? (
              <>
                <Link href="/cases" className="text-gray-700 hover:text-indigo-600">
                  Cases
                </Link>
                <button
                  onClick={() => signOut()}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                href="/auth/signin"
                className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200"
              >
                Sign In
              </Link>
            )}
          </nav>
        </div>
      </header>
      
      <main>{children}</main>
      
      <footer className="bg-white shadow mt-8">
        <div className="container mx-auto px-4 py-4 text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} AI Case Marketplace
        </div>
      </footer>
    </div>
  );
} 