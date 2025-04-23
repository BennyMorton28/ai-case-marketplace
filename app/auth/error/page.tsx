'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function Error() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Authentication Error
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {error || 'An error occurred during authentication'}
          </p>
        </div>
        <div className="mt-8 text-center">
          <Link 
            href="/auth/signin"
            className="text-blue-600 hover:text-blue-800"
          >
            Try again
          </Link>
        </div>
      </div>
    </div>
  );
} 