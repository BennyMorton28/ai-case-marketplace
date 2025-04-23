'use client';

import React, { useState } from 'react';
import { UserPlusIcon } from '@heroicons/react/24/outline';
import ProfessorManagementModal from './ProfessorManagementModal';

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
  adminAccess: {
    admin: {
      id: string;
      email: string;
      username: string | null;
    };
  }[];
}

interface AdminDashboardProps {
  cases: Case[];
  isSuperAdmin: boolean;
  currentUserEmail: string;
}

export default function AdminDashboard({ cases, isSuperAdmin, currentUserEmail }: AdminDashboardProps) {
  const [isProfessorModalOpen, setIsProfessorModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Top Actions Bar */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Cases Overview</h2>
        <div className="flex gap-4">
          {isSuperAdmin && (
            <button
              onClick={() => setIsProfessorModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <UserPlusIcon className="h-5 w-5 mr-2" />
              Manage Professors
            </button>
          )}
        </div>
      </div>

      {/* Cases List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {cases.map((case_) => (
            <li key={case_.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{case_.name}</h3>
                    {case_.description && (
                      <p className="mt-1 text-sm text-gray-500">{case_.description}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end text-sm text-gray-500">
                    <span>{case_.userAccess.length} users</span>
                    <span>{case_.adminAccess.length} admins</span>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Professor Management Modal */}
      {isSuperAdmin && (
        <ProfessorManagementModal
          isOpen={isProfessorModalOpen}
          onClose={() => setIsProfessorModalOpen(false)}
          cases={cases}
          currentUserEmail={currentUserEmail}
        />
      )}
    </div>
  );
} 