'use client';

import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useState } from 'react';

interface CaseMetadata {
  id: string;
  title: string;
  author: string;
  icon?: string;
  hasPassword: boolean;
  password?: string;
}

interface CaseMetadataFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (metadata: CaseMetadata) => void;
  metadata: CaseMetadata;
}

export default function CaseMetadataForm({ isOpen, onClose, onSave, metadata }: CaseMetadataFormProps) {
  const [formData, setFormData] = useState<CaseMetadata & { iconFile?: File }>(() => ({
    id: metadata.id,
    title: metadata.title,
    author: metadata.author,
    icon: metadata.icon,
    hasPassword: metadata.hasPassword,
    password: metadata.password || ''
  }));

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.author.trim()) {
      newErrors.author = 'Author is required';
    }
    if (formData.hasPassword && !formData.password?.trim()) {
      newErrors.password = 'Password is required when password protection is enabled';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      // If we have a new icon file, we need to handle the upload
      if (formData.iconFile) {
        try {
          const formDataToSend = new FormData();
          formDataToSend.append('icon', formData.iconFile);
          
          const response = await fetch(`/api/demos/${metadata.id}/icon`, {
            method: 'POST',
            body: formDataToSend,
          });
          
          if (!response.ok) {
            throw new Error('Failed to upload icon');
          }
          
          const { iconPath } = await response.json();
          formData.icon = iconPath;
        } catch (error) {
          console.error('Error uploading icon:', error);
          setErrors(prev => ({ ...prev, icon: 'Failed to upload icon' }));
          return;
        }
      }

      // Remove the iconFile from the data we send to the parent
      const { iconFile, ...dataToSave } = formData;
      onSave(dataToSave);
      onClose();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFormData(prev => ({
        ...prev,
        iconFile: file
      }));
    }
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">
                  Edit Case Details
                </Dialog.Title>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Title
                    </label>
                    <input
                      type="text"
                      id="title"
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Case Title"
                    />
                    {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
                  </div>

                  <div>
                    <label htmlFor="author" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Author
                    </label>
                    <input
                      type="text"
                      id="author"
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                      value={formData.author}
                      onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                      placeholder="Author Name"
                    />
                    {errors.author && <p className="mt-1 text-sm text-red-600">{errors.author}</p>}
                  </div>

                  <div>
                    <label htmlFor="icon" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Icon
                    </label>
                    <input
                      type="file"
                      id="icon"
                      accept="image/*"
                      className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      onChange={handleFileChange}
                    />
                    {formData.icon && !formData.iconFile && (
                      <p className="mt-1 text-sm text-gray-500">Current icon: {formData.icon}</p>
                    )}
                    {errors.icon && <p className="mt-1 text-sm text-red-600">{errors.icon}</p>}
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="hasPassword"
                      className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                      checked={formData.hasPassword}
                      onChange={(e) => setFormData({ ...formData, hasPassword: e.target.checked })}
                    />
                    <label htmlFor="hasPassword" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      Password Protected
                    </label>
                  </div>

                  {formData.hasPassword && (
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Password
                      </label>
                      <input
                        type="password"
                        id="password"
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Set case password"
                      />
                      {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
                    </div>
                  )}

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
} 
 
 

import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useState } from 'react';

interface CaseMetadata {
  id: string;
  title: string;
  author: string;
  icon?: string;
  hasPassword: boolean;
  password?: string;
}

interface CaseMetadataFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (metadata: CaseMetadata) => void;
  metadata: CaseMetadata;
}

export default function CaseMetadataForm({ isOpen, onClose, onSave, metadata }: CaseMetadataFormProps) {
  const [formData, setFormData] = useState<CaseMetadata & { iconFile?: File }>(() => ({
    id: metadata.id,
    title: metadata.title,
    author: metadata.author,
    icon: metadata.icon,
    hasPassword: metadata.hasPassword,
    password: metadata.password || ''
  }));

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.author.trim()) {
      newErrors.author = 'Author is required';
    }
    if (formData.hasPassword && !formData.password?.trim()) {
      newErrors.password = 'Password is required when password protection is enabled';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      // If we have a new icon file, we need to handle the upload
      if (formData.iconFile) {
        try {
          const formDataToSend = new FormData();
          formDataToSend.append('icon', formData.iconFile);
          
          const response = await fetch(`/api/demos/${metadata.id}/icon`, {
            method: 'POST',
            body: formDataToSend,
          });
          
          if (!response.ok) {
            throw new Error('Failed to upload icon');
          }
          
          const { iconPath } = await response.json();
          formData.icon = iconPath;
        } catch (error) {
          console.error('Error uploading icon:', error);
          setErrors(prev => ({ ...prev, icon: 'Failed to upload icon' }));
          return;
        }
      }

      // Remove the iconFile from the data we send to the parent
      const { iconFile, ...dataToSave } = formData;
      onSave(dataToSave);
      onClose();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFormData(prev => ({
        ...prev,
        iconFile: file
      }));
    }
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">
                  Edit Case Details
                </Dialog.Title>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Title
                    </label>
                    <input
                      type="text"
                      id="title"
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Case Title"
                    />
                    {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
                  </div>

                  <div>
                    <label htmlFor="author" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Author
                    </label>
                    <input
                      type="text"
                      id="author"
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                      value={formData.author}
                      onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                      placeholder="Author Name"
                    />
                    {errors.author && <p className="mt-1 text-sm text-red-600">{errors.author}</p>}
                  </div>

                  <div>
                    <label htmlFor="icon" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Icon
                    </label>
                    <input
                      type="file"
                      id="icon"
                      accept="image/*"
                      className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      onChange={handleFileChange}
                    />
                    {formData.icon && !formData.iconFile && (
                      <p className="mt-1 text-sm text-gray-500">Current icon: {formData.icon}</p>
                    )}
                    {errors.icon && <p className="mt-1 text-sm text-red-600">{errors.icon}</p>}
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="hasPassword"
                      className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                      checked={formData.hasPassword}
                      onChange={(e) => setFormData({ ...formData, hasPassword: e.target.checked })}
                    />
                    <label htmlFor="hasPassword" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      Password Protected
                    </label>
                  </div>

                  {formData.hasPassword && (
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Password
                      </label>
                      <input
                        type="password"
                        id="password"
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Set case password"
                      />
                      {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
                    </div>
                  )}

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
} 
 
 