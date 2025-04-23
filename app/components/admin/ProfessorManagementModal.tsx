'use client';

import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface Case {
  id: string;
  name: string;
  description: string | null;
}

interface ProfessorManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  cases: Case[];
  currentUserEmail: string;
}

export default function ProfessorManagementModal({
  isOpen,
  onClose,
  cases,
  currentUserEmail,
}: ProfessorManagementModalProps) {
  const [email, setEmail] = useState('');
  const [selectedCases, setSelectedCases] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email.endsWith('@northwestern.edu')) {
      setError('Only northwestern.edu email addresses are allowed');
      return;
    }

    try {
      // First make the user an admin
      const makeAdminResponse = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'makeAdmin',
          email,
          addedBy: currentUserEmail,
        }),
      });

      if (!makeAdminResponse.ok) {
        throw new Error('Failed to make user an admin');
      }

      // Then grant access to selected cases
      const grantAccessResponse = await fetch('/api/users/access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          caseIds: selectedCases,
          addedBy: currentUserEmail,
        }),
      });

      if (!grantAccessResponse.ok) {
        throw new Error('Failed to grant case access');
      }

      setSuccess('Professor added successfully');
      setEmail('');
      setSelectedCases([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const toggleCaseSelection = (caseId: string) => {
    setSelectedCases(prev =>
      prev.includes(caseId)
        ? prev.filter(id => id !== caseId)
        : [...prev, caseId]
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Manage Professors</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
            title="Close modal"
            aria-label="Close modal"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Professor's Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="professor@northwestern.edu"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            />
          </div>

          {/* Case Selection */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Select Cases to Grant Access
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {cases.map((case_) => (
                <label
                  key={case_.id}
                  className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded"
                >
                  <input
                    type="checkbox"
                    checked={selectedCases.includes(case_.id)}
                    onChange={() => toggleCaseSelection(case_.id)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-900">{case_.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Error and Success Messages */}
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          {success && (
            <p className="text-sm text-green-600">{success}</p>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Add Professor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 