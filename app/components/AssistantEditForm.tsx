'use client';

import React from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useState, useEffect } from 'react';
import { Assistant } from '../../src/types';
import { XMarkIcon, DocumentIcon } from '@heroicons/react/24/outline';
import DemoIcon from './DemoIcon';

/** Form data for editing an assistant, extends base Assistant with file upload fields */
export interface AssistantFormData extends Omit<Assistant, 'iconPath' | 'promptMarkdownPath'> {
  iconFile?: File;
  promptContent?: string;
  iconPath?: string;
}

interface AssistantEditFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (assistant: AssistantFormData) => void;
  onDelete?: (assistantId: string) => Promise<void>;
  assistant?: Assistant;
  isNew?: boolean;
}

export default function AssistantEditForm({ isOpen, onClose, onSave, onDelete, assistant, isNew = false }: AssistantEditFormProps) {
  const [formData, setFormData] = useState<AssistantFormData>(() => ({
    id: assistant?.id || '',
    name: assistant?.name || '',
    description: assistant?.description || '',
    hasPassword: assistant?.hasPassword || false,
    password: assistant?.password || '',
    isAvailableAtStart: assistant?.isAvailableAtStart || false,
    orderIndex: assistant?.orderIndex || 0,
    displayWhenLocked: assistant?.displayWhenLocked || { description: '' },
    promptContent: undefined
  }));

  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Common input class to maintain consistency
  const inputClass = "mt-1 block w-full px-4 py-3 bg-white dark:bg-gray-700 rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 dark:text-white transition duration-150 ease-in-out";
  const textareaClass = "mt-1 block w-full px-4 py-3 bg-white dark:bg-gray-700 rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 dark:text-white transition duration-150 ease-in-out";

  // Load markdown content when component mounts or when assistant changes
  useEffect(() => {
    // For new assistants, just initialize with empty content and return early
    if (isNew) {
      setFormData(prev => ({ ...prev, promptContent: '' }));
      setLoadError(null);
      setIsLoading(false);
      return;
    }

    // Skip if no assistant ID
    if (!assistant?.id) {
      return;
    }

    // Only proceed with loading for existing assistants
    setIsLoading(true);
    setLoadError(null);

    // Get the demo ID from the assistant's promptMarkdownPath
    // Format: demos/demoId/markdown/assistantId.md
    const demoId = assistant.promptMarkdownPath?.split('/')[1];
    if (!demoId) {
      console.error('Could not extract demo ID from promptMarkdownPath:', assistant.promptMarkdownPath);
      setLoadError('Invalid markdown path format');
      setIsLoading(false);
      return;
    }

    // Get the markdown content using the assistants API
    fetch(`/api/demos/${demoId}/assistants/${assistant.id}/markdown`)
      .then(async res => {
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Failed to load content: ${res.status} ${errorText}`);
        }
        return res.text();
      })
      .then(text => {
        setFormData(prev => ({ ...prev, promptContent: text }));
        setIsLoading(false);
      })
      .catch(err => {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error loading content';
        console.error('Error loading markdown:', {
          demoId,
          assistantId: assistant.id,
          error: errorMessage
        });
        setLoadError(errorMessage);
        setFormData(prev => ({ ...prev, promptContent: '' }));
        setIsLoading(false);
      });
  }, [assistant?.id, isNew]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    if (formData.hasPassword && !formData.password?.trim()) {
      newErrors.password = 'Password is required when password protection is enabled';
    }
    if (!formData.promptContent?.trim()) {
      newErrors.promptContent = 'Prompt content is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      try {
        // Get the demo ID from the assistant's promptMarkdownPath or from the ID for new assistants
        let demoId;
        if (isNew) {
          demoId = assistant?.id.split('-')[0]; // Extract demo ID from the generated assistant ID
        } else {
          demoId = assistant?.promptMarkdownPath?.split('/')[1];
        }

        if (!demoId) {
          throw new Error('Could not determine demo ID');
        }

        // If we have prompt content, save it first
        if (formData.promptContent) {
          const response = await fetch(`/api/demos/${demoId}/assistants/${formData.id}/markdown`, {
            method: 'PUT',
            body: formData.promptContent
          });

          if (!response.ok) {
            throw new Error('Failed to save prompt content');
          }
        }

        // If we have an icon file, upload it
        if (formData.iconFile) {
          const iconFormData = new FormData();
          iconFormData.append('icon', formData.iconFile);
          
          const response = await fetch(`/api/demos/${demoId}/assistants/${formData.id}/icon`, {
            method: 'POST',
            body: iconFormData
          });

          if (!response.ok) {
            throw new Error('Failed to upload icon');
          }

          const { iconPath } = await response.json();
          formData.iconPath = iconPath;
        }

        // Then save the rest of the assistant data
        onSave(formData);
        onClose();
      } catch (error) {
        console.error('Error saving assistant:', error);
        setSubmitError(error instanceof Error ? error.message : 'Failed to save assistant');
      }
    }
  };

  const handleDelete = async () => {
    if (!assistant?.id || !onDelete) return;
    
    if (window.confirm('Are you sure you want to delete this assistant?')) {
      try {
        await onDelete(assistant.id);
        onClose();
      } catch (error) {
        console.error('Error deleting assistant:', error);
        setSubmitError(error instanceof Error ? error.message : 'Failed to delete assistant');
      }
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

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-500"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-500"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-md">
                  <div className="flex h-full flex-col bg-white dark:bg-gray-800 shadow-xl">
                    <div className="px-4 py-6 sm:px-6 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-start justify-between">
                        <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white">
                          {isNew ? 'Create New Assistant' : 'Edit Assistant'}
                        </Dialog.Title>
                        <div className="ml-3 flex h-7 items-center">
                          <button
                            type="button"
                            className="rounded-md bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onClick={onClose}
                          >
                            <span className="sr-only">Close panel</span>
                            <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="relative flex-1 overflow-y-auto px-4 py-4 sm:px-6">
                      <form id="assistant-form" onSubmit={handleSubmit} className="space-y-6 pb-20">
                        {/* Name Field */}
                        <div>
                          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Name
                          </label>
                          <input
                            type="text"
                            id="name"
                            name="name"
                            className={inputClass}
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Assistant Name"
                          />
                          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                        </div>

                        {/* Description Field */}
                        <div>
                          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Description
                          </label>
                          <textarea
                            id="description"
                            name="description"
                            rows={3}
                            className={textareaClass}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Assistant description and capabilities"
                          />
                          {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
                        </div>

                        {/* Icon Section */}
                        <div>
                          <label htmlFor="iconFile" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Icon
                          </label>
                          <div className="mt-2 flex items-center space-x-4">
                            <div className="flex-none">
                              {assistant?.iconPath && (
                                <DemoIcon 
                                  icon={assistant.iconPath}
                                  name={assistant.name}
                                  size={64}
                                />
                              )}
                            </div>
                            {assistant?.iconPath && (
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                Current: {assistant.iconPath.split('/').pop()}
                              </span>
                            )}
                          </div>
                          <div className="mt-2">
                            <input
                              type="file"
                              id="iconFile"
                              name="iconFile"
                              accept="image/*"
                              title="Choose a new icon file"
                              placeholder="Choose a new icon file"
                              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition duration-150 ease-in-out"
                              onChange={(e) => {
                                if (e.target.files?.[0]) {
                                  setFormData({ ...formData, iconFile: e.target.files[0] });
                                }
                              }}
                            />
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              {formData.iconFile ? `Selected: ${formData.iconFile.name}` : 'Upload new icon'}
                            </p>
                          </div>
                        </div>

                        {/* Prompt Content Section */}
                        <div>
                          <label htmlFor="promptContent" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            {isNew ? 'Instructions' : 'Prompt Content'}
                            {!isNew && isLoading && <span className="ml-2 text-sm text-blue-500">(Loading...)</span>}
                          </label>
                          <div className="mt-2">
                            <textarea
                              id="promptContent"
                              name="promptContent"
                              rows={10}
                              className={`${textareaClass} font-mono text-sm ${!isNew && isLoading ? 'opacity-50' : ''}`}
                              value={formData.promptContent || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, promptContent: e.target.value }))}
                              placeholder={isNew ? "Enter the instructions for this character..." : "Enter the assistant's instructions..."}
                              disabled={!isNew && isLoading}
                            />
                          </div>
                          {!isNew && assistant?.promptMarkdownPath && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Current file: {assistant.promptMarkdownPath}
                              </p>
                            </div>
                          )}
                          {errors.promptContent && <p className="mt-1 text-sm text-red-600">{errors.promptContent}</p>}
                        </div>

                        {/* Settings Section */}
                        <div className="space-y-4">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="hasPassword"
                              name="hasPassword"
                              checked={formData.hasPassword}
                              onChange={(e) => setFormData({ ...formData, hasPassword: e.target.checked })}
                              className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition duration-150 ease-in-out"
                            />
                            <label htmlFor="hasPassword" className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
                                name="password"
                                className={inputClass}
                                value={formData.password || ''}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder="Set assistant password"
                              />
                              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
                            </div>
                          )}

                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="isAvailableAtStart"
                              name="isAvailableAtStart"
                              checked={formData.isAvailableAtStart}
                              onChange={(e) => setFormData({ ...formData, isAvailableAtStart: e.target.checked })}
                              className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition duration-150 ease-in-out"
                            />
                            <label htmlFor="isAvailableAtStart" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Available at Start
                            </label>
                          </div>
                        </div>
                      </form>
                    </div>

                    <div className="flex justify-end space-x-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Cancel
                      </button>
                      {!isNew && onDelete && (
                        <button
                          type="button"
                          onClick={handleDelete}
                          className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          Delete Assistant
                        </button>
                      )}
                      <button
                        type="submit"
                        form="assistant-form" 
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        {isNew ? 'Create' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                  {submitError && (
                    <div className="mt-2 mx-4 p-2 bg-red-100 text-red-700 rounded-md dark:bg-red-900 dark:text-red-100 text-sm">
                      {submitError}
                    </div>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
} 
 