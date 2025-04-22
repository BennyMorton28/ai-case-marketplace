'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRightIcon, PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import DemoIcon from './components/DemoIcon';
import CreateDemoModal from './components/CreateDemoModal';
import AuthButton from './components/AuthButton';
import { AdminPanel } from './components/AdminPanel';
import ConfirmDialog from './components/ConfirmDialog';
import { Assistant } from '../src/types';

interface Demo {
  id: string;
  title: string;
  name: string;
  author: string;
  iconPath?: string;
  explanationMarkdownPath: string;
  assistants: Assistant[];
  documents: { id: string; name: string; path: string }[];
  hasPassword: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function Dashboard() {
  const [demos, setDemos] = useState<Demo[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState<Demo | null>(null);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [demoToDelete, setDemoToDelete] = useState<Demo | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Fetch demos when component mounts
  useEffect(() => {
    fetchDemos();
  }, []);

  const fetchDemos = async () => {
    try {
      const response = await fetch('/api/demos');
      if (response.ok) {
        const data = await response.json();
        setDemos(data);
      }
    } catch (error) {
      console.error('Error fetching demos:', error);
    }
  };

  const handleCreateDemo = async (newDemo: Demo) => {
    await fetchDemos(); // Refresh the list after creating
    setIsCreateModalOpen(false);
  };

  const handleAdminClick = (demo: Demo) => {
    if (isAdminMode) {
      setSelectedDemo(demo);
      setIsAdminPanelOpen(true);
    }
  };

  const handleDeleteClick = (demo: Demo, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAdminMode) {
      setDemoToDelete(demo);
      setIsDeleteConfirmOpen(true);
    }
  };

  const handleUpdateDemo = async (updatedDemo: Demo) => {
    await fetchDemos(); // Refresh the list after updating
    setIsAdminPanelOpen(false);
    setSelectedDemo(null);
  };

  const handleDeleteDemo = async () => {
    if (!demoToDelete) return;
    
    try {
      const response = await fetch(`/api/demos/${demoToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Remove the deleted demo from the state
        setDemos(prevDemos => prevDemos.filter(demo => demo.id !== demoToDelete.id));
        setDemoToDelete(null);
      } else {
        console.error('Failed to delete demo:', await response.text());
      }
    } catch (error) {
      console.error('Error deleting demo:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              AI Case Marketplace
            </h1>
            <div className="flex items-center space-x-4">
              {isAdminMode && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Create a New Case
                </button>
              )}
              <AuthButton onAuthChange={setIsAdminMode} />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {demos.map((demo) => (
            <div key={demo.id} className="relative group">
              <Link
                href={`/demo/${demo.id}`}
                className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <DemoIcon
                      icon={demo.iconPath}
                      name={demo.title}
                      size={48}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white truncate">
                      {demo.title}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {demo.assistants.length} assistant{demo.assistants.length !== 1 ? 's' : ''} • By {demo.author}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <ArrowRightIcon className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </Link>
              {isAdminMode && (
                <div className="absolute top-2 right-2 flex gap-2">
                  <button
                    onClick={() => handleAdminClick(demo)}
                    className="p-2 rounded-full bg-white dark:bg-gray-700 shadow opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-blue-50 dark:hover:bg-blue-900"
                    title="Edit demo"
                  >
                    <PencilIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteClick(demo, e)}
                    className="p-2 rounded-full bg-white dark:bg-gray-700 shadow opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-50 dark:hover:bg-red-900"
                    title="Delete demo"
                  >
                    <TrashIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      {isCreateModalOpen && (
        <CreateDemoModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSave={handleCreateDemo}
        />
      )}

      {selectedDemo && (
        <AdminPanel
          isOpen={isAdminPanelOpen}
          onClose={() => {
            setIsAdminPanelOpen(false);
            setSelectedDemo(null);
          }}
          currentDemo={selectedDemo}
          onUpdateDemo={handleUpdateDemo}
        />
      )}

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDeleteDemo}
        title="Delete Demo"
        message={`Are you sure you want to delete "${demoToDelete?.title}"? This action cannot be undone and will delete all associated files.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
      />
    </div>
  );
}