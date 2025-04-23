import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { TrashIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

interface Student {
  id: string;
  email: string;
  addedAt: string;
  role: string;
}

interface ManageStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
}

export default function ManageStudentsModal({ isOpen, onClose, caseId }: ManageStudentsModalProps) {
  const [activeTab, setActiveTab] = useState<'add' | 'view'>('add');
  const [email, setEmail] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchStudents();
    }
  }, [isOpen, caseId]);

  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/cases/${caseId}/students`);
      if (!response.ok) throw new Error('Failed to fetch students');
      const data = await response.json();
      setStudents(data);
    } catch (error) {
      toast.error('Failed to load students');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      setIsAdding(true);
      const response = await fetch(`/api/cases/${caseId}/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add student');
      }
      
      toast.success('Student added successfully');
      setEmail('');
      fetchStudents();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add student');
      console.error(error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    try {
      const response = await fetch(`/api/cases/${caseId}/students/${studentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to remove student');
      
      toast.success('Student removed successfully');
      fetchStudents();
    } catch (error) {
      toast.error('Failed to remove student');
      console.error(error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/cases/${caseId}/students`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload students');
      
      toast.success('Students imported successfully');
      fetchStudents();
    } catch (error) {
      toast.error('Failed to import students');
      console.error(error);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl w-full bg-white rounded-xl shadow-lg">
          <div className="p-6">
            <Dialog.Title className="text-lg font-medium mb-4">
              Manage Students
            </Dialog.Title>

            <div className="flex border-b border-gray-200 mb-4">
              <button
                className={`px-4 py-2 ${
                  activeTab === 'add'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500'
                }`}
                onClick={() => setActiveTab('add')}
              >
                Add Students
              </button>
              <button
                className={`px-4 py-2 ${
                  activeTab === 'view'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500'
                }`}
                onClick={() => setActiveTab('view')}
              >
                View Students
              </button>
            </div>

            {activeTab === 'add' ? (
              <div>
                <form onSubmit={handleAddStudent} className="mb-6">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Add Student by Email
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="student@example.com"
                      className="flex-1 rounded-md border border-gray-300 px-3 py-2"
                      required
                    />
                    <button
                      type="submit"
                      disabled={isAdding}
                      className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
                    >
                      {isAdding ? 'Adding...' : 'Add'}
                    </button>
                  </div>
                </form>

                <div>
                  <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-1">
                    Import Students from CSV
                  </label>
                  <div className="text-sm text-gray-500 mb-2">
                    <p>CSV Format:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>No headers</li>
                      <li>One email per row in column A</li>
                      <li>Example:
                        <div className="mt-1 bg-gray-50 p-2 rounded-md font-mono text-xs">
                          <table className="border-collapse">
                            <thead>
                              <tr>
                                <th className="border-b border-gray-300 px-2 py-1 text-center text-gray-400">#</th>
                                <th className="border-b border-gray-300 px-3 py-1 text-left">A</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="px-2 py-1 text-center text-gray-400">1</td>
                                <td className="px-3 py-1">student1@example.com</td>
                              </tr>
                              <tr>
                                <td className="px-2 py-1 text-center text-gray-400">2</td>
                                <td className="px-3 py-1">student2@example.com</td>
                              </tr>
                              <tr>
                                <td className="px-2 py-1 text-center text-gray-400">3</td>
                                <td className="px-3 py-1">student3@example.com</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </li>
                    </ul>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <input
                        type="file"
                        id="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={isUploading}
                      />
                      <button
                        type="button"
                        className={`px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 ${isUploading ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                        disabled={isUploading}
                      >
                        {isUploading ? 'Uploading...' : 'Choose CSV File'}
                      </button>
                    </div>
                  </div>
                  {isUploading && <p className="text-sm text-gray-500 mt-1">Processing students...</p>}
                </div>
              </div>
            ) : (
              <div>
                {isLoading ? (
                  <p className="text-center py-4 text-gray-500">Loading students...</p>
                ) : students.length === 0 ? (
                  <p className="text-center py-4 text-gray-500">No students added yet</p>
                ) : (
                  <div className="space-y-2">
                    {students.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                      >
                        <div>
                          <p className="font-medium">{student.email}</p>
                          <p className="text-sm text-gray-500">
                            Added {new Date(student.addedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteStudent(student.id)}
                          className="text-red-500 hover:text-red-600 p-2"
                          aria-label={`Remove student ${student.email}`}
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
} 
 