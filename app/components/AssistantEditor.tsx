import { useState, useRef } from 'react';
import { XMarkIcon, UserIcon } from '@heroicons/react/24/outline';

interface Assistant {
  id: string;
  name: string;
  description: string;
  hasPassword: boolean;
  password?: string;
  iconUrl?: string;
}

interface AssistantEditorProps {
  assistant: Assistant;
  isOpen: boolean;
  onClose: () => void;
  onSave: (assistant: Assistant) => Promise<void>;
}

export default function AssistantEditor({ assistant, isOpen, onClose, onSave }: AssistantEditorProps) {
  const [editingData, setEditingData] = useState<Assistant>(assistant);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleIconUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('icon', file);
      formData.append('assistantId', assistant.id);

      const response = await fetch(`/api/assistants/${assistant.id}/icon`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload icon');

      const { iconUrl } = await response.json();
      setEditingData({ ...editingData, iconUrl });
    } catch (error) {
      console.error('Error uploading icon:', error);
      alert('Failed to upload icon. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      await onSave(editingData);
      onClose();
    } catch (error) {
      console.error('Error saving assistant:', error);
      alert('Failed to save assistant. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {assistant.id ? 'Edit Assistant' : 'New Assistant'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            title="Close editor"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Icon Upload */}
          <div className="flex flex-col items-center space-y-2">
            <div className="relative">
              {editingData.iconUrl ? (
                <img
                  src={editingData.iconUrl}
                  alt={editingData.name}
                  className="h-24 w-24 rounded-full"
                />
              ) : (
                <UserIcon className="h-24 w-24 text-gray-400" />
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700"
                title="Upload new icon"
                disabled={isUploading}
              >
                {isUploading ? '...' : '+'}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleIconUpload(e.target.files[0])}
              className="hidden"
            />
          </div>

          {/* Name */}
          <div className="space-y-1">
            <label 
              htmlFor="assistant-name" 
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Name
            </label>
            <input
              id="assistant-name"
              type="text"
              value={editingData.name}
              onChange={(e) => setEditingData({ ...editingData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Enter assistant name"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label 
              htmlFor="assistant-description" 
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Description
            </label>
            <textarea
              id="assistant-description"
              value={editingData.description}
              onChange={(e) => setEditingData({ ...editingData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={3}
              placeholder="Enter assistant description"
            />
          </div>

          {/* Password Protection */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="assistant-password-toggle"
                checked={editingData.hasPassword}
                onChange={(e) => setEditingData({ ...editingData, hasPassword: e.target.checked })}
              />
              <label 
                htmlFor="assistant-password-toggle"
                className="text-sm text-gray-700 dark:text-gray-300"
              >
                Require Password
              </label>
            </div>

            {editingData.hasPassword && (
              <div className="space-y-1">
                <label 
                  htmlFor="assistant-password" 
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Password
                </label>
                <input
                  id="assistant-password"
                  type="password"
                  value={editingData.password || ''}
                  onChange={(e) => setEditingData({ ...editingData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Enter password"
                />
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
} 
 
 
import { XMarkIcon, UserIcon } from '@heroicons/react/24/outline';

interface Assistant {
  id: string;
  name: string;
  description: string;
  hasPassword: boolean;
  password?: string;
  iconUrl?: string;
}

interface AssistantEditorProps {
  assistant: Assistant;
  isOpen: boolean;
  onClose: () => void;
  onSave: (assistant: Assistant) => Promise<void>;
}

export default function AssistantEditor({ assistant, isOpen, onClose, onSave }: AssistantEditorProps) {
  const [editingData, setEditingData] = useState<Assistant>(assistant);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleIconUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('icon', file);
      formData.append('assistantId', assistant.id);

      const response = await fetch(`/api/assistants/${assistant.id}/icon`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload icon');

      const { iconUrl } = await response.json();
      setEditingData({ ...editingData, iconUrl });
    } catch (error) {
      console.error('Error uploading icon:', error);
      alert('Failed to upload icon. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      await onSave(editingData);
      onClose();
    } catch (error) {
      console.error('Error saving assistant:', error);
      alert('Failed to save assistant. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {assistant.id ? 'Edit Assistant' : 'New Assistant'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            title="Close editor"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Icon Upload */}
          <div className="flex flex-col items-center space-y-2">
            <div className="relative">
              {editingData.iconUrl ? (
                <img
                  src={editingData.iconUrl}
                  alt={editingData.name}
                  className="h-24 w-24 rounded-full"
                />
              ) : (
                <UserIcon className="h-24 w-24 text-gray-400" />
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700"
                title="Upload new icon"
                disabled={isUploading}
              >
                {isUploading ? '...' : '+'}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleIconUpload(e.target.files[0])}
              className="hidden"
            />
          </div>

          {/* Name */}
          <div className="space-y-1">
            <label 
              htmlFor="assistant-name" 
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Name
            </label>
            <input
              id="assistant-name"
              type="text"
              value={editingData.name}
              onChange={(e) => setEditingData({ ...editingData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Enter assistant name"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label 
              htmlFor="assistant-description" 
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Description
            </label>
            <textarea
              id="assistant-description"
              value={editingData.description}
              onChange={(e) => setEditingData({ ...editingData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={3}
              placeholder="Enter assistant description"
            />
          </div>

          {/* Password Protection */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="assistant-password-toggle"
                checked={editingData.hasPassword}
                onChange={(e) => setEditingData({ ...editingData, hasPassword: e.target.checked })}
              />
              <label 
                htmlFor="assistant-password-toggle"
                className="text-sm text-gray-700 dark:text-gray-300"
              >
                Require Password
              </label>
            </div>

            {editingData.hasPassword && (
              <div className="space-y-1">
                <label 
                  htmlFor="assistant-password" 
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Password
                </label>
                <input
                  id="assistant-password"
                  type="password"
                  value={editingData.password || ''}
                  onChange={(e) => setEditingData({ ...editingData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Enter password"
                />
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
} 
 
 