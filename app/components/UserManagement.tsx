'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface User {
  id: string;
  email: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  canCreateCases: boolean;
  caseAccess?: Array<{ 
    caseId: string;
    role: 'STUDENT' | 'PROFESSOR';
  }>;
}

interface Case {
  id: string;
  name: string;
  description: string | null;
  creatorId: string;
  userAccess?: Array<{
    userId: string;
    caseId: string;
    role: 'STUDENT' | 'PROFESSOR';
  }>;
}

interface NewUserForm {
  email: string;
  isAdmin: boolean;
  canCreateCases: boolean;
  selectedCases: Array<{
    id: string;
    role: 'STUDENT' | 'PROFESSOR';
  }>;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [newUser, setNewUser] = useState<NewUserForm>({
    email: '',
    isAdmin: false,
    canCreateCases: false,
    selectedCases: [],
  });

  useEffect(() => {
    fetchUsers();
    fetchCases();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCases = async () => {
    try {
      const response = await fetch('/api/cases');
      if (!response.ok) {
        throw new Error('Failed to fetch cases');
      }
      const data = await response.json();
      setCases(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching cases:', error);
      toast.error('Failed to load cases');
      setCases([]);
    }
  };

  const handleNewUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get the selected cases with their roles
      const selectedCasesWithRoles = newUser.selectedCases.map(c => ({
        id: c.id,
        role: c.role
      }));

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'addUsersByEmail',
          emails: [newUser.email],
          makeAdmin: newUser.isAdmin,
          makeProf: newUser.canCreateCases,
          selectedCases: selectedCasesWithRoles
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      setNewUser({
        email: '',
        isAdmin: false,
        canCreateCases: false,
        selectedCases: [],
      });
      setShowNewUserForm(false);
      await fetchUsers();
      toast.success('User created successfully');
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      await fetchUsers();
      toast.success('User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const handleToggleAdmin = async (user: User) => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'makeAdmin',
          userId: user.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }
      await fetchUsers();
      toast.success('User updated successfully');
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    }
  };

  const handleToggleCaseAccess = async (user: User, caseId: string, role: 'STUDENT' | 'PROFESSOR' = 'STUDENT') => {
    try {
      // Check if user already has access to this case
      const hasAccess = user.caseAccess?.some(access => access.caseId === caseId);
      
      if (!caseId) {
        toast.error('Please select a case first');
        return;
      }

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: hasAccess ? 'removeUserFromCase' : 'addUserToCase',
          userId: user.id,
          caseId: caseId,
          role: role,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update case access');
      }
      await fetchUsers();
      toast.success('Case access updated successfully');
    } catch (error) {
      console.error('Error updating case access:', error);
      toast.error('Failed to update case access');
    }
  };

  const handleToggleCanCreateCases = async (user: User) => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'addUsersByEmail',
          emails: [user.email],
          makeAdmin: user.isAdmin,
          makeProf: !user.canCreateCases,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }
      await fetchUsers();
      toast.success('User updated successfully');
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Add user button */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Add New User</h2>
          <button
            onClick={() => setShowNewUserForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add User
          </button>
        </div>
      </div>

      {/* User list */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">User List</h2>
        <div className="space-y-4">
          {users.length === 0 ? (
            <p className="text-gray-500 italic">No users found.</p>
          ) : (
            users.map((user) => (
              <div key={user.id} className="border p-4 rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{user.email}</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleToggleAdmin(user)}
                      className={`px-3 py-1 rounded-md ${
                        user.isAdmin
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {user.isAdmin ? 'Admin' : 'Not Admin'}
                    </button>
                    <button
                      onClick={() => handleToggleCanCreateCases(user)}
                      className={`px-3 py-1 rounded-md ${
                        user.canCreateCases
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {user.canCreateCases ? 'Can Create Cases' : 'Cannot Create Cases'}
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="px-3 py-1 rounded-md bg-red-100 text-red-800 hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="flex gap-4 items-center">
                  <select
                    value=""
                    onChange={(e) => {
                      const [caseId, role] = e.target.value.split('|');
                      handleToggleCaseAccess(user, caseId, role as 'STUDENT' | 'PROFESSOR');
                    }}
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    aria-label="Select a case"
                  >
                    <option value="">Select a case...</option>
                    {cases.map((c) => {
                      const access = user.caseAccess?.find(access => access.caseId === c.id);
                      return (
                        <>
                          <option key={`${c.id}|STUDENT`} value={`${c.id}|STUDENT`}>
                            {c.name} - Student {access?.role === 'STUDENT' ? '(Has Access)' : ''}
                          </option>
                          <option key={`${c.id}|PROFESSOR`} value={`${c.id}|PROFESSOR`}>
                            {c.name} - Professor {access?.role === 'PROFESSOR' ? '(Has Access)' : ''}
                          </option>
                        </>
                      );
                    })}
                  </select>
                  <button
                    onClick={() => {
                      const select = document.querySelector('select[aria-label="Select a case"]') as HTMLSelectElement;
                      if (select?.value) {
                        const [caseId, role] = select.value.split('|');
                        handleToggleCaseAccess(user, caseId, role as 'STUDENT' | 'PROFESSOR');
                      }
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Toggle Access
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add user modal */}
      {showNewUserForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Add New User</h2>
              <button
                onClick={() => setShowNewUserForm(false)}
                className="text-gray-400 hover:text-gray-500"
                title="Close modal"
                aria-label="Close modal"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleNewUserSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </label>
              </div>

              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={newUser.canCreateCases}
                    onChange={(e) => setNewUser(prev => ({ ...prev, canCreateCases: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Professor (can create new cases)</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={newUser.isAdmin}
                    onChange={(e) => setNewUser(prev => ({ ...prev, isAdmin: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Admin (can manage all cases)</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Case Access
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded p-2">
                  {cases.map((caseItem) => (
                    <div key={caseItem.id} className="flex items-center justify-between p-2 hover:bg-gray-50">
                      <span className="text-sm font-medium">{caseItem.name}</span>
                      <div className="flex items-center space-x-4">
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={newUser.selectedCases.some(c => c.id === caseItem.id && c.role === 'STUDENT')}
                            onChange={(e) => {
                              const hasAccess = newUser.selectedCases.some(c => c.id === caseItem.id);
                              let updatedCases = newUser.selectedCases.filter(c => c.id !== caseItem.id);
                              
                              if (e.target.checked) {
                                updatedCases.push({ id: caseItem.id, role: 'STUDENT' });
                              }
                              
                              setNewUser({ ...newUser, selectedCases: updatedCases });
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-600">Student</span>
                        </label>
                        
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={newUser.selectedCases.some(c => c.id === caseItem.id && c.role === 'PROFESSOR')}
                            onChange={(e) => {
                              const hasAccess = newUser.selectedCases.some(c => c.id === caseItem.id);
                              let updatedCases = newUser.selectedCases.filter(c => c.id !== caseItem.id);
                              
                              if (e.target.checked) {
                                updatedCases.push({ id: caseItem.id, role: 'PROFESSOR' });
                              }
                              
                              setNewUser({ ...newUser, selectedCases: updatedCases });
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-600">Professor</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Add User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 