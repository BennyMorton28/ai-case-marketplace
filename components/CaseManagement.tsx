import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import UserImport from './UserImport';
import { TrashIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

interface Case {
  id: string;
  name: string;
  description: string | null;
  userAccess: {
    user: {
      id: string;
      email: string;
      username: string | null;
    };
  }[];
  creatorId: string;
  adminAccess: {
    admin: {
      id: string;
      email: string;
    };
  }[];
}

export default function CaseManagement() {
  const { data: session } = useSession();
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newCaseName, setNewCaseName] = useState('');
  const [newCaseDescription, setNewCaseDescription] = useState('');
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [showImportForm, setShowImportForm] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<string | null>(null);

  // Fetch cases on component mount
  useEffect(() => {
    const fetchCases = async () => {
      try {
        const response = await fetch('/api/cases');
        if (!response.ok) {
          throw new Error('Failed to fetch cases');
        }
        const data = await response.json();
        setCases(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCases();
  }, []);

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCaseName.trim()) {
      setError('Case name is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/cases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCaseName,
          description: newCaseDescription,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create case');
      }

      const data = await response.json();
      
      // Add the new case to the list
      setCases([...cases, data.case]);
      
      // Reset form
      setNewCaseName('');
      setNewCaseDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCaseSelect = (caseId: string) => {
    setSelectedCase(caseId);
    setShowImportForm(true);
  };

  const handleImportComplete = () => {
    // Refresh cases to get updated user access
    const fetchCases = async () => {
      try {
        const response = await fetch('/api/cases');
        if (!response.ok) {
          throw new Error('Failed to fetch cases');
        }
        const data = await response.json();
        setCases(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    };

    fetchCases();
  };

  const handleDeleteCase = async (caseId: string) => {
    try {
      const response = await fetch(`/api/cases/${caseId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to delete case');
      }

      // Remove the case from the list
      setCases(cases.filter(c => c.id !== caseId));
      toast.success('Case deleted successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete case');
    } finally {
      setShowDeleteConfirmation(null);
    }
  };

  const hasAdminAccess = (case_: Case) => {
    if (!session?.user?.email) return false;
    
    // Check if user is the creator
    const isCreator = case_.creatorId === session.user.email;
    
    // Check if user has admin access
    const isAdmin = case_.adminAccess.some(access => access.admin.email === session.user.email);
    
    return isCreator || isAdmin;
  };

  if (!session) {
    return <div>You must be logged in to manage cases.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Create New Case</h2>
        
        <form onSubmit={handleCreateCase} className="space-y-4">
          <div>
            <label htmlFor="caseName" className="block text-sm font-medium text-gray-700">
              Case Name
            </label>
            <input
              type="text"
              id="caseName"
              value={newCaseName}
              onChange={(e) => setNewCaseName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            />
          </div>
          
          <div>
            <label htmlFor="caseDescription" className="block text-sm font-medium text-gray-700">
              Description (Optional)
            </label>
            <textarea
              id="caseDescription"
              value={newCaseDescription}
              onChange={(e) => setNewCaseDescription(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isLoading ? 'Creating...' : 'Create Case'}
          </button>
        </form>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Your Cases</h2>
        
        {isLoading ? (
          <p>Loading cases...</p>
        ) : cases.length === 0 ? (
          <p>You don't have any cases yet.</p>
        ) : (
          <div className="space-y-4">
            {cases.map((case_) => (
              <div key={case_.id} className="border rounded-md p-4 group relative">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium">{case_.name}</h3>
                    {case_.description && (
                      <p className="text-sm text-gray-500 mt-1">{case_.description}</p>
                    )}
                    <p className="text-sm text-gray-500 mt-2">
                      {case_.userAccess.length} user(s) have access
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleCaseSelect(case_.id)}
                      className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200"
                    >
                      Manage Users
                    </button>
                    
                    {hasAdminAccess(case_) && (
                      <button
                        onClick={() => setShowDeleteConfirmation(case_.id)}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        title="Delete case"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {showImportForm && selectedCase && (
        <div className="mt-6">
          <UserImport caseId={selectedCase} onComplete={handleImportComplete} />
        </div>
      )}

      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">Confirm Delete</h3>
            <p className="text-gray-500 mb-6">
              Are you sure you want to delete this case? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowDeleteConfirmation(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteCase(showDeleteConfirmation)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 