import { useState, useRef } from 'react';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import DemoIcon from './DemoIcon';
import Modal from './Modal';
import { useRouter } from 'next/navigation';
import ProcessingDemoOverlay from './ProcessingDemoOverlay';

interface CaseDocument {
  file: File;
  name: string;
  description: string;
}

interface Assistant {
  id: string;
  name: string;
  description: string;
  icon?: string;
  hasPassword: boolean;
  password?: string;
  promptContent?: string;
  iconFile?: File;
}

interface CreateDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (demo: any) => void;
}

interface DemoData {
  id: string;
  title: string;
  author: string;
  hasPassword: boolean;
  password?: string;
  documents: {
    name: string;
    description: string;
    key?: string;
    type?: string;
    size?: number;
    originalName?: string;
  }[];
  assistants: {
    id: string;
    name: string;
    description: string;
    hasPassword: boolean;
    password?: string;
  }[];
}

export default function CreateDemoModal({ isOpen, onClose, onSave }: CreateDemoModalProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [documents, setDocuments] = useState<CaseDocument[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [assistants, setAssistants] = useState<Assistant[]>([{
    id: 'assistant-1',
    name: '',
    description: '',
    hasPassword: false,
    promptContent: ''
  }]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // New state for processing overlay
  const [isProcessing, setIsProcessing] = useState(false);
  const [createdDemo, setCreatedDemo] = useState<{id: string, title: string} | null>(null);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    handleDocumentAdd(files);
  };

  const generateAssistantId = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  };

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIconFile(file);
    }
  };

  const handleAssistantChange = (index: number, field: keyof Assistant, value: any) => {
    const newAssistants = [...assistants];
    newAssistants[index] = {
      ...newAssistants[index],
      [field]: value
    };
    
    // Update assistant ID when name changes
    if (field === 'name') {
      newAssistants[index].id = generateAssistantId(value);
    }
    
    setAssistants(newAssistants);
  };

  const handleAssistantIconChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Store the file in the assistant object
      const newAssistants = [...assistants];
      newAssistants[index] = {
        ...newAssistants[index],
        iconFile: file
      };
      setAssistants(newAssistants);
    }
  };

  const handleDocumentAdd = (files: FileList | null) => {
    if (!files) return;
    
    const newDocuments = Array.from(files).map(file => ({
      file,
      name: file.name,
      description: ''
    }));
    
    setDocuments(prev => [...prev, ...newDocuments]);
  };

  const handleDocumentRemove = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const handleDocumentNameChange = (index: number, name: string) => {
    setDocuments(prev => prev.map((doc, i) => 
      i === index ? { ...doc, name } : doc
    ));
  };

  const handleDocumentDescriptionChange = (index: number, description: string) => {
    setDocuments(prev => prev.map((doc, i) => 
      i === index ? { ...doc, description } : doc
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate form data
      if (assistants.length === 0) {
        throw new Error('At least one assistant is required');
      }

      // Validate prompt content
      for (const assistant of assistants) {
        if (!assistant.promptContent?.trim()) {
          throw new Error(`Prompt content is required for assistant "${assistant.name}"`);
        }
      }
      
      // Process demoId
      const demoId = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      if (!demoId) {
        throw new Error('Case title must contain valid characters');
      }
      
      // Create demo data object
      const demoData = {
        id: demoId,
        title,
        author,
        hasPassword,
        password: hasPassword ? password : undefined,
        assistants: assistants.map(assistant => ({
          id: generateAssistantId(assistant.name),
          name: assistant.name,
          description: assistant.description,
          hasPassword: assistant.hasPassword,
          password: assistant.hasPassword ? assistant.password : undefined,
          promptContent: assistant.promptContent
        })),
        documents: documents.map(doc => ({
          name: doc.name,
          description: doc.description
        }))
      };
      
      // Create FormData for file uploads
      const formData = new FormData();
      formData.append('demo', JSON.stringify(demoData));
      
      // Append demo icon if provided
      if (iconFile) {
        formData.append('icon', iconFile);
      }
      
      // Append documents
      documents.forEach((doc, index) => {
        formData.append(`document_${index}`, doc.file);
      });
      
      // Append prompt content for each assistant
      for (const assistant of assistants) {
        if (assistant.promptContent) {
          const blob = new Blob([assistant.promptContent], { type: 'text/markdown' });
          formData.append(`markdown_${assistant.id}`, blob, `${assistant.id}.md`);
        }

        // Append assistant icon if provided
        if (assistant.iconFile) {
          formData.append(`icon_${assistant.id}`, assistant.iconFile);
        }
      }

      // Send to API
      const response = await fetch('/api/demos', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to create case');
      }

      const result = await response.json();
      
      // Reset form
      setTitle('');
      setAuthor('');
      setHasPassword(false);
      setPassword('');
      setIconFile(null);
      setAssistants([{
        id: 'assistant-1',
        name: '',
        description: '',
        hasPassword: false,
        promptContent: ''
      }]);
      
      // Close the modal
      onClose();
      
      // Call the onSave callback with the new case
      if (onSave) {
        onSave(result.demo);
      }
      
      // Show processing overlay
      setCreatedDemo({
        id: demoData.id,
        title: demoData.title
      });
      setIsProcessing(true);
      
    } catch (error) {
      console.error('Error creating case:', error);
      alert(error instanceof Error ? error.message : 'Failed to create case. Please try again.');
    }
  };

  // Handle completion of processing
  const handleProcessingComplete = () => {
    if (createdDemo) {
      // Navigate to the new case
      router.push(`/demo/${createdDemo.id}`);
    }
    setIsProcessing(false);
    setCreatedDemo(null);
  };

  if (!isOpen && !isProcessing) return null;

  // Common input class to maintain consistency
  const inputClass = "mt-2 px-4 py-3 block w-full bg-white dark:bg-gray-700 rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 dark:text-white transition duration-150 ease-in-out";
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
  const fileInputClass = "mt-2 block w-full text-sm text-gray-700 dark:text-gray-300 file:mr-4 file:py-2.5 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 dark:file:bg-blue-900 file:text-blue-700 dark:file:text-blue-200 hover:file:bg-blue-100 dark:hover:file:bg-blue-800 focus:outline-none";

  // Show processing overlay if we're in processing state
  if (isProcessing && createdDemo) {
    return (
      <ProcessingDemoOverlay
        demoId={createdDemo.id}
        demoTitle={createdDemo.title}
        onComplete={handleProcessingComplete}
      />
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white">Create New Case</h2>
        
        {/* Demo Title */}
        <div className="space-y-1">
          <label className={labelClass} htmlFor="demo-title">Case Title</label>
          <input
            id="demo-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
            placeholder="Enter a title for your case"
            required
          />
        </div>

        {/* Author */}
        <div className="space-y-1">
          <label className={labelClass} htmlFor="demo-author">Author</label>
          <input
            id="demo-author"
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className={inputClass}
            placeholder="Your name"
            required
          />
        </div>

        {/* Lock Case (Password Protection) */}
        <div className="flex items-center mt-4">
          <input
            type="checkbox"
            id="case-password"
            checked={hasPassword}
            onChange={(e) => setHasPassword(e.target.checked)}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            aria-label="Lock Case"
          />
          <label htmlFor="case-password" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
            Lock Case
          </label>
        </div>
        
        {/* Password field shown conditionally */}
        {hasPassword && (
          <div className="space-y-1">
            <label className={labelClass} htmlFor="case-password-input">Password</label>
            <input
              id="case-password-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="Enter password"
              required={hasPassword}
            />
          </div>
        )}

        {/* Icon Upload */}
        <div className="space-y-1">
          <label className={labelClass} htmlFor="demo-icon">Case Icon</label>
          <input
            id="demo-icon"
            type="file"
            accept=".svg"
            onChange={(e) => setIconFile(e.target.files?.[0] || null)}
            className={fileInputClass}
            aria-label="Upload case icon SVG file"
          />
        </div>

        {/* Case Documents Section */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">Case Documents</h3>
          <div 
            className={`space-y-2 ${isDragging ? 'bg-blue-50 dark:bg-blue-900/30' : ''} transition-colors duration-200 rounded-lg p-4 border-2 border-dashed ${isDragging ? 'border-blue-500 dark:border-blue-400' : 'border-gray-300 dark:border-gray-600'}`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <label className={`${labelClass} flex flex-col items-center justify-center cursor-pointer`}>
              <span className="text-center mb-2">
                Upload Documents
                <span className="text-sm text-gray-500 ml-2">(PDF, Word, Excel, Images)</span>
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Drag and drop files here or click to select
              </span>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                onChange={(e) => handleDocumentAdd(e.target.files)}
                className={`${fileInputClass} hidden`}
                aria-label="Upload case documents"
              />
            </label>
          </div>
          
          {/* Document List */}
          {documents.length > 0 && (
            <div className="space-y-3 mt-4">
              {documents.map((doc, index) => (
                <div key={index} className="flex items-start space-x-4 p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="flex-grow">
                    <input
                      type="text"
                      value={doc.name}
                      onChange={(e) => handleDocumentNameChange(index, e.target.value)}
                      placeholder="Document name"
                      className={`${inputClass} text-sm`}
                    />
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Original: {doc.file.name} ({(doc.file.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDocumentRemove(index)}
                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    aria-label="Remove document"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assistant Fields */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-gray-800 dark:text-white pt-2">Assistants</h3>
          {assistants.map((assistant, index) => (
            <div key={index} className="space-y-4 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="space-y-1">
                <label className={labelClass} htmlFor={`assistant-name-${index}`}>Assistant Name</label>
                <input
                  id={`assistant-name-${index}`}
                  type="text"
                  value={assistant.name}
                  onChange={(e) => handleAssistantChange(index, 'name', e.target.value)}
                  className={inputClass}
                  placeholder="Name of the assistant"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className={labelClass} htmlFor={`assistant-desc-${index}`}>Description</label>
                <textarea
                  id={`assistant-desc-${index}`}
                  value={assistant.description}
                  onChange={(e) => handleAssistantChange(index, 'description', e.target.value)}
                  className={inputClass}
                  rows={3}
                  placeholder="Describe what this assistant does"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className={labelClass} htmlFor={`assistant-icon-${index}`}>Assistant Icon (SVG)</label>
                <input
                  id={`assistant-icon-${index}`}
                  type="file"
                  accept=".svg"
                  onChange={(e) => handleAssistantIconChange(index, e)}
                  className={fileInputClass}
                  aria-label={`Upload icon for assistant ${assistant.name || index+1}`}
                />
              </div>
              
              <div className="space-y-1">
                <label 
                  htmlFor={`promptContent-${assistant.id}`} 
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Prompt Content
                </label>
                <div className="mt-2">
                  <textarea
                    id={`promptContent-${assistant.id}`}
                    name={`promptContent-${assistant.id}`}
                    rows={10}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                    value={assistant.promptContent}
                    onChange={(e) => handleAssistantChange(index, 'promptContent', e.target.value)}
                    placeholder="Enter the prompt content for this assistant..."
                  />
                </div>
              </div>
              
              <div className="flex items-center mt-4">
                <input
                  type="checkbox"
                  id={`password-${index}`}
                  checked={assistant.hasPassword}
                  onChange={(e) => handleAssistantChange(index, 'hasPassword', e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  aria-label="Require password protection"
                />
                <label htmlFor={`password-${index}`} className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Require Password
                </label>
              </div>
              
              {assistant.hasPassword && (
                <div className="space-y-1 mt-3">
                  <label className={labelClass} htmlFor={`assistant-password-${index}`}>Password</label>
                  <input
                    id={`assistant-password-${index}`}
                    type="password"
                    value={assistant.password || ''}
                    onChange={(e) => handleAssistantChange(index, 'password', e.target.value)}
                    className={inputClass}
                    placeholder="Enter password"
                    required={assistant.hasPassword}
                  />
                </div>
              )}
              
              {assistants.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const newAssistants = [...assistants];
                    newAssistants.splice(index, 1);
                    setAssistants(newAssistants);
                  }}
                  className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800"
                >
                  <TrashIcon className="h-4 w-4 mr-1" /> Remove Assistant
                </button>
              )}
            </div>
          ))}
          
          <button
            type="button"
            onClick={() => setAssistants([...assistants, {
              id: `assistant-${assistants.length + 1}`,
              name: '',
              description: '',
              hasPassword: false,
              promptContent: ''
            }])}
            className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out"
          >
            <PlusIcon className="h-4 w-4 mr-1" /> Add Assistant
          </button>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out"
          >
            Create Case
          </button>
        </div>
      </form>
    </Modal>
  );
} 