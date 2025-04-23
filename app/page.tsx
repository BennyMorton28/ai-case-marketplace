'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowRightIcon, TrashIcon } from '@heroicons/react/24/outline';
import CreateDemoModal from './components/CreateDemoModal';
import { toast } from 'react-hot-toast';

interface Case {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
  createdAt: string;
  updatedAt: string;
  creator: {
    email: string;
  };
}

export default function Dashboard() {
  const { data: session } = useSession();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCases() {
      if (!session?.user?.email) return;

    try {
        const response = await fetch('/api/cases');
      if (response.ok) {
        const data = await response.json();
          setCases(data);
      }
    } catch (error) {
        console.error('Error fetching cases:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchCases();
  }, [session]);

  const handleCreateCase = (newCase: Case) => {
    setCases(prev => [...prev, newCase]);
    setIsCreateModalOpen(false);
  };

  const handleDeleteCase = async (e: React.MouseEvent, caseId: string) => {
    e.preventDefault(); // Prevent navigation
    setShowDeleteConfirmation(caseId);
  };

  const confirmDelete = async (caseId: string) => {
    try {
      const response = await fetch(`/api/cases/${caseId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete case');
      }

      setCases(cases.filter(c => c.id !== caseId));
      toast.success('Case deleted successfully');
    } catch (error) {
      toast.error('Failed to delete case');
      console.error('Error deleting case:', error);
    } finally {
      setShowDeleteConfirmation(null);
    }
  };

  const canDeleteCase = (case_: Case) => {
    if (!session?.user?.email) return false;
    
    // Check if user is super admin
    const isSuperAdmin = session.user.email === 'ben.morton@law.northwestern.edu';
    
    // Super admin can delete any case, otherwise only creator can delete
    return isSuperAdmin || case_.creator.email === session.user.email;
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Welcome to AI Cases at Kellogg
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Please sign in to access the cases.
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading cases...</p>
          </div>
        </main>
      </div>
    );
    }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Your Cases</h1>
            <p className="text-gray-600 mt-1">Access your available cases below</p>
          </div>
          {session?.user?.email && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
              Create New Case
                </button>
              )}
            </div>

        {cases.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No cases available. Please contact an administrator for access.</p>
          </div>
        ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {cases.map((case_) => (
              <div key={case_.id} className="relative group">
                <Link
                  href={`/demo/${case_.id}`}
                  className="block p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {case_.iconUrl ? (
                        <img src={case_.iconUrl} alt={case_.name} className="w-12 h-12 rounded-full" />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-xl font-bold text-gray-500">{case_.name[0]}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-semibold text-gray-900 truncate">
                        {case_.name}
                      </h2>
                      <p className="text-sm text-gray-500">
                        Created {new Date(case_.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <ArrowRightIcon className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </Link>
                {canDeleteCase(case_) && (
                  <button
                    onClick={(e) => handleDeleteCase(e, case_.id)}
                    className="absolute top-2 right-2 p-2 bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-200"
                    title="Delete case"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
            ))}
                </div>
              )}

        <CreateDemoModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSave={handleCreateCase}
        />

        {/* Delete Confirmation Modal */}
        {showDeleteConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Delete Case?
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this case? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirmation(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => confirmDelete(showDeleteConfirmation)}
                  className="px-4 py-2 text-white bg-red-500 rounded-md hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}