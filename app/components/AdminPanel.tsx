import React, { useState } from 'react';
import DemoIcon from './DemoIcon';
import { Assistant } from '../../src/types';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import AssistantEditForm, { AssistantFormData } from './AssistantEditForm';

interface CaseConfig {
  id: string;
  title: string;
  author: string;
  name: string;
  iconPath?: string;
  password?: string;
  explanationMarkdownPath: string;
  assistants: Assistant[];
  documents: { id: string; name: string; path: string }[];
  hasPassword: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentDemo: CaseConfig;
  onUpdateDemo: (updatedDemo: CaseConfig) => void;
}

export function AdminPanel({ isOpen, onClose, currentDemo, onUpdateDemo }: AdminPanelProps) {
  const [editedDemo, setEditedDemo] = useState<CaseConfig>(currentDemo);
  const [isAssistantEditOpen, setIsAssistantEditOpen] = useState(false);
  const [selectedAssistant, setSelectedAssistant] = useState<Assistant | null>(null);

  if (!isOpen) return null;

  const handleInputChange = (field: keyof CaseConfig, value: string) => {
    setEditedDemo(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      const response = await fetch(`/api/demos/${currentDemo.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editedDemo),
      });

      if (!response.ok) {
        throw new Error('Failed to update demo');
      }

      onUpdateDemo(editedDemo);
      onClose();
      
      // Refresh the page to show updated changes
      window.location.reload();
    } catch (error) {
      console.error('Error updating demo:', error);
      alert('Failed to update demo. Please try again.');
    }
  };

  const handleAssistantEdit = (assistant: Assistant) => {
    setSelectedAssistant(assistant);
    setIsAssistantEditOpen(true);
  };

  const handleAssistantDelete = async (assistantId: string) => {
    if (!confirm('Are you sure you want to delete this assistant?')) return;

    try {
      const response = await fetch(`/api/demos/${currentDemo.id}/assistants/${assistantId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete assistant');
      }

      setEditedDemo(prev => ({
        ...prev,
        assistants: prev.assistants.filter(a => a.id !== assistantId)
      }));

      // Refresh the page to show updated changes
      window.location.reload();
    } catch (error) {
      console.error('Error deleting assistant:', error);
      alert('Failed to delete assistant. Please try again.');
    }
  };

  const handleAssistantSave = async (updatedAssistant: AssistantFormData) => {
    try {
      // Find the existing assistant to preserve paths if not changed
      const existingAssistant = editedDemo.assistants.find(a => a.id === updatedAssistant.id);
      
      // Preserve existing paths if not changed in this update
      const assistantToUpdate = {
        ...updatedAssistant,
        iconPath: updatedAssistant.iconPath || existingAssistant?.iconPath,
        promptMarkdownPath: existingAssistant?.promptMarkdownPath || `demos/${editedDemo.id}/markdown/${updatedAssistant.id}.md`,
        // Include the promptContent from the form
        promptContent: updatedAssistant.promptContent || ''
      };

      // First update the assistant in S3
      const response = await fetch(`/api/demos/${currentDemo.id}/assistants/${updatedAssistant.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assistantToUpdate),
      });

      if (!response.ok) {
        throw new Error('Failed to update assistant');
      }

      // Update local state
      setEditedDemo(prev => ({
        ...prev,
        assistants: prev.assistants.map(a => 
          a.id === updatedAssistant.id ? assistantToUpdate : a
        )
      }));

      // Close the assistant edit modal
      setIsAssistantEditOpen(false);
      setSelectedAssistant(null);
    
      // Fetch the latest demo data to ensure we have the most up-to-date version
      const demoResponse = await fetch(`/api/demos/${currentDemo.id}`);
      if (!demoResponse.ok) {
        throw new Error('Failed to fetch updated demo data');
      }
      const updatedDemo = await demoResponse.json();
      
      // Update the demo data in the parent component
      onUpdateDemo(updatedDemo);

      // Force a page refresh to ensure all components reflect the new data
      window.location.reload();
    } catch (error) {
      console.error('Error saving assistant:', error);
      alert('Failed to save assistant. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Admin Panel - {editedDemo.title}</h2>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              title="Save all changes"
            >
              Save Changes
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              title="Close admin panel"
            >
              Close
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Demo details section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Demo Details</h3>

            {/* Icon Section */}
            <div>
              <label htmlFor="demo-icon" className="block text-sm font-medium mb-1">Icon</label>
              <div className="mt-2 flex items-center space-x-4">
                <div className="flex-none">
                  {editedDemo.iconPath && (
                    <DemoIcon 
                      icon={editedDemo.iconPath}
                      name={editedDemo.name}
                      size={64}
                    />
                  )}
                </div>
                {editedDemo.iconPath && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Current: {editedDemo.iconPath.split('/').pop()}
                  </span>
                )}
              </div>
              <div className="mt-2">
                <input
                  type="file"
                  id="demo-icon"
                  name="iconFile"
                  accept="image/*"
                  title="Choose a new icon file"
                  placeholder="Choose a new icon file"
                  className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  onChange={async (e) => {
                    if (e.target.files?.[0]) {
                      const iconFile = e.target.files[0];
                      const formData = new FormData();
                      formData.append('icon', iconFile);
                      
                      try {
                        const response = await fetch(`/api/demos/${editedDemo.id}/icon`, {
                          method: 'POST',
                          body: formData
                        });

                        if (!response.ok) {
                          throw new Error('Failed to upload icon');
                        }

                        const { iconPath } = await response.json();
                        setEditedDemo(prev => ({ ...prev, iconPath }));
                      } catch (error) {
                        console.error('Error uploading demo icon:', error);
                        alert('Failed to upload icon. Please try again.');
                      }
                    }
                  }}
                />
              </div>
            </div>

            <div>
              <label htmlFor="demo-title" className="block text-sm font-medium mb-1">Title</label>
              <input
                id="demo-title"
                type="text"
                value={editedDemo.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full px-3 py-2 border rounded"
                title="Demo title"
                placeholder="Enter demo title"
              />
            </div>

            <div>
              <label htmlFor="demo-author" className="block text-sm font-medium mb-1">Author</label>
              <input
                id="demo-author"
                type="text"
                value={editedDemo.author}
                onChange={(e) => handleInputChange('author', e.target.value)}
                className="w-full px-3 py-2 border rounded"
                title="Demo author"
                placeholder="Enter author name"
              />
            </div>
          </div>

          {/* Assistants section */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">Characters</h3>
              <button
                onClick={() => {
                  const newAssistant: Assistant = {
                    id: `${editedDemo.id}-assistant-${Date.now()}`,
                    name: '',
                    description: '',
                    hasPassword: false,
                    password: '',
                    isAvailableAtStart: true,
                    orderIndex: editedDemo.assistants.length,
                    displayWhenLocked: { description: '' },
                    promptMarkdownPath: `demos/${editedDemo.id}/markdown/assistant-${Date.now()}.md`
                  };
                  setSelectedAssistant(newAssistant);
                  setIsAssistantEditOpen(true);
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                New Character
              </button>
            </div>
            <div className="space-y-3">
              {editedDemo.assistants.map((assistant) => (
                <div key={assistant.id} className="p-4 border rounded flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {assistant.iconPath && (
                      <DemoIcon icon={assistant.iconPath} name={assistant.name} size={32} />
                    )}
                    <span className="font-medium">{assistant.name}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAssistantEdit(assistant)}
                      className="p-2 text-blue-500 hover:bg-blue-50 rounded"
                      title={`Edit ${assistant.name}`}
                      aria-label={`Edit ${assistant.name}`}
                    >
                      <PencilIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleAssistantDelete(assistant.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded"
                      title={`Delete ${assistant.name}`}
                      aria-label={`Delete ${assistant.name}`}
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Assistant Edit Modal */}
      {isAssistantEditOpen && selectedAssistant && (
        <AssistantEditForm
          isOpen={isAssistantEditOpen}
          onClose={() => {
            setIsAssistantEditOpen(false);
            setSelectedAssistant(null);
          }}
          onSave={handleAssistantSave}
          onDelete={handleAssistantDelete}
          assistant={selectedAssistant}
        />
      )}
    </div>
  );
}

export default AdminPanel;