'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';

// Mock data structure for demos
interface Demo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
}

// Mock demo data
const demoList: Demo[] = [
  {
    id: 'demo1',
    title: 'AI Ethics Case Study',
    description: 'Explore ethical considerations in artificial intelligence applications.',
    thumbnailUrl: '/images/ai-ethics.jpg',
  },
  {
    id: 'demo2',
    title: 'Financial Analysis Demo',
    description: 'Analyze financial data using AI-powered tools.',
    thumbnailUrl: '/images/financial.jpg',
  },
  {
    id: 'demo3',
    title: 'Healthcare Applications',
    description: 'Discover how AI is transforming healthcare.',
    thumbnailUrl: '/images/healthcare.jpg',
  },
];

export default function DemoPage() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const [accessibleDemos, setAccessibleDemos] = useState<Demo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If not authenticated and not loading, redirect to sign in
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/signin');
      return;
    }

    if (isAuthenticated) {
      // In a real app, you would fetch the user's accessible demos from your API
      // For this demo, we'll assume they have access to all demos
      // You would implement this by checking against the access control list
      setAccessibleDemos(demoList);
      setLoading(false);
    }
  }, [isAuthenticated, isLoading, router, user]);

  if (isLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Loading...</h2>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // We're redirecting, so no need to render anything
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Available Demos</h1>
      
      {accessibleDemos.length === 0 ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-md p-6 text-center">
          <p className="text-gray-500">
            You don't have access to any demos yet. Please contact an administrator.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {accessibleDemos.map((demo) => (
            <Link 
              href={`/demo/${demo.id}`} 
              key={demo.id}
              className="group"
            >
              <div className="bg-white overflow-hidden shadow rounded-lg transition-all duration-200 hover:shadow-md hover:ring-2 hover:ring-blue-500 hover:ring-opacity-50">
                <div className="h-48 bg-gray-200 relative">
                  {demo.thumbnailUrl ? (
                    <img
                      src={demo.thumbnailUrl}
                      alt={demo.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                      <span>No image</span>
                    </div>
                  )}
                </div>
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 group-hover:text-blue-600">
                    {demo.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    {demo.description}
                  </p>
                  <div className="mt-4">
                    <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      View Demo
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
} 