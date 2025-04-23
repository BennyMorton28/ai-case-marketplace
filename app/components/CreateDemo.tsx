'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

interface Assistant {
  id: string;
  name: string;
  description: string;
  promptContent: string;
  icon?: File;
}

interface DemoData {
  id: string;
  title: string;
  author: string;
  description: string;
  assistants: Assistant[];
  hasPassword: boolean;
  password?: string;
}

export default function CreateDemo() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [demoData, setDemoData] = useState<DemoData>({
    id: '',
    title: '',
    author: '',
    description: '',
    assistants: [],
    hasPassword: false,
  });
  const [icon, setIcon] = useState<File | null>(null);
  const [documents, setDocuments] = useState<File[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      
      // Add demo data
      formData.append('demo', JSON.stringify(demoData));
      
      // Add icon if provided
      if (icon) {
        formData.append('icon', icon);
      }
      
      // Add documents
      documents.forEach((doc, index) => {
        formData.append(`document_${index}`, doc);
      });

      const response = await fetch('/api/demos', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const result = await response.json();
      toast.success('Case created successfully!');
      router.push(`/demo/${result.demo.id}`);
    } catch (error) {
      console.error('Error creating demo:', error);
      toast.error('Failed to create case');
    } finally {
      setLoading(false);
    }
  };

  const handleAssistantAdd = () => {
    setDemoData(prev => ({
      ...prev,
      assistants: [
        ...prev.assistants,
        {
          id: `assistant-${prev.assistants.length + 1}`,
          name: '',
          description: '',
          promptContent: '',
        },
      ],
    }));
  };

  const handleAssistantChange = (index: number, field: keyof Assistant, value: string | File) => {
    setDemoData(prev => ({
      ...prev,
      assistants: prev.assistants.map((assistant, i) => {
        if (i === index) {
          if (field === 'icon' && value instanceof File) {
            return { ...assistant, icon: value };
          }
          return { ...assistant, [field]: value };
        }
        return assistant;
      }),
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Case ID (URL-friendly)
          <input
            type="text"
            value={demoData.id}
            onChange={(e) => setDemoData(prev => ({ ...prev, id: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Title
          <input
            type="text"
            value={demoData.title}
            onChange={(e) => setDemoData(prev => ({ ...prev, title: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Author
          <input
            type="text"
            value={demoData.author}
            onChange={(e) => setDemoData(prev => ({ ...prev, author: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Description
          <textarea
            value={demoData.description}
            onChange={(e) => setDemoData(prev => ({ ...prev, description: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            rows={3}
          />
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Case Icon
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setIcon(e.target.files?.[0] || null)}
            className="mt-1 block w-full"
          />
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Documents
          <input
            type="file"
            multiple
            onChange={(e) => setDocuments(Array.from(e.target.files || []))}
            className="mt-1 block w-full"
          />
        </label>
      </div>

      <div>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={demoData.hasPassword}
            onChange={(e) => setDemoData(prev => ({ ...prev, hasPassword: e.target.checked }))}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700">Password Protected</span>
        </label>

        {demoData.hasPassword && (
          <input
            type="password"
            value={demoData.password || ''}
            onChange={(e) => setDemoData(prev => ({ ...prev, password: e.target.value }))}
            className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Enter password"
            required
          />
        )}
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Assistants</h3>
          <button
            type="button"
            onClick={handleAssistantAdd}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add Assistant
          </button>
        </div>

        {demoData.assistants.map((assistant, index) => (
          <div key={assistant.id} className="space-y-4 p-4 border rounded-md">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Name
                <input
                  type="text"
                  value={assistant.name}
                  onChange={(e) => handleAssistantChange(index, 'name', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Description
                <input
                  type="text"
                  value={assistant.description}
                  onChange={(e) => handleAssistantChange(index, 'description', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Prompt Content
                <textarea
                  value={assistant.promptContent}
                  onChange={(e) => handleAssistantChange(index, 'promptContent', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  rows={5}
                  required
                />
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Assistant Icon
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleAssistantChange(index, 'icon', file);
                  }}
                  className="mt-1 block w-full"
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Case'}
        </button>
      </div>
    </form>
  );
} 