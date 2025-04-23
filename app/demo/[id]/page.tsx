'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import StreamingChat from '../../components/StreamingChat';
import { ArrowLeftIcon, LockClosedIcon, LockOpenIcon, DocumentTextIcon, CogIcon, PencilIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import DemoIcon from '../../components/DemoIcon';
import PasswordInput from '../../components/PasswordInput';
import DocumentViewer from '../../components/DocumentViewer';
import AdminPanel from '../../components/AdminPanel';
import ManageStudentsModal from '../../components/ManageStudentsModal';
import { useAuth } from '../../contexts/AuthContext';
import type { Demo } from '../../types/demo';
import type { Document as CaseDocument } from '../../types/document';
import type { Assistant } from '../../types/assistant';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';

interface ViewerDocument {
  name: string;
  description: string;
  key: string;
  type: string;
  size: number;
}

interface CaseConfig {
  id: string;
  title: string;
  author: string;
  name: string;
  iconPath?: string;
  password?: string;
  explanationMarkdownPath: string;
  assistants: Assistant[];
  documents: CaseDocument[];
  hasPassword: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Demo {
  id: string;
  name: string;
  description: string;
  password?: string;
  iconPath?: string;
  assistants?: Assistant[];
  documents?: CaseDocument[];
  creator?: {
    email: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

const convertToViewerDocument = (doc: CaseDocument): ViewerDocument => ({
  name: doc.title,
  description: doc.title,
  key: doc.path,
  type: doc.type,
  size: 0
});

export default function DemoPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isManageStudentsOpen, setIsManageStudentsOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [caseConfig, setCaseConfig] = useState<Demo | null>(null);
  const [password, setPassword] = useState('');
  const [isPasswordCorrect, setIsPasswordCorrect] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<CaseDocument[]>([]);
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<CaseDocument | null>(null);
  const [isDocumentViewerOpen, setIsDocumentViewerOpen] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  
  const { user, isAdmin } = useAuth();
  
  // Refresh auth context when the page loads
  useEffect(() => {
    const refreshAuth = async () => {
      if (user?.email) {
        try {
          const response = await fetch('/api/users/check-admin', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: user.email,
            }),
          });
          
          if (!response.ok) {
            console.error('Failed to refresh auth status');
          }
        } catch (error) {
          console.error('Error refreshing auth status:', error);
    }
      }
    };

    refreshAuth();
  }, [user?.email]);

  // Function to check password for assistants
  const checkPassword = (assistantId: string, password: string): boolean => {
    if (!caseConfig) return false;
    const assistant = caseConfig.assistants.find(a => a.id === assistantId);
    return assistant?.password === password;
  };

  // Function to check case password
  const checkCasePassword = (password: string): boolean => {
    if (!caseConfig?.password) return true;
    return caseConfig.password === password;
  };

  // Function to unlock the case
  const unlockCase = () => {
    if (checkCasePassword(password)) {
      setIsPasswordCorrect(true);
      setError('');
    } else {
      setError('Incorrect password');
    }
  };

  // Function to unlock an assistant
  const unlockAssistant = (assistantId: string) => {
    setAssistants(prev => prev.map(a => a.id === assistantId ? { ...a, isUnlocked: true } : a));
  };

  // Fetch the case configuration
  useEffect(() => {
    const fetchCaseConfig = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log(`Fetching case config from API: ${params.id}`);
        const response = await fetch(`/api/demos/${params.id}`);
        
        if (response.ok) {
          const config = await response.json();
          console.log(`Successfully fetched case config from API: ${params.id}`, config);
          console.log('Assistant data:', config.assistants);
          setCaseConfig(config);
          setAssistants(config.assistants);
          setDocuments(config.documents || []);
          
          // Automatically select the first unlocked assistant
          const firstUnlockedAssistant = config.assistants?.find(a => !a.isLocked);
          if (firstUnlockedAssistant) {
            const doc: CaseDocument = {
              path: firstUnlockedAssistant.name,
              title: firstUnlockedAssistant.name,
              type: 'assistant',
              content: firstUnlockedAssistant.systemPrompt
            };
            setSelectedDocument(doc);
          }
        } else {
          console.error(`Case not found: ${params.id}`);
          setError('Case not found');
        }
      } catch (err) {
        console.error('Error fetching case config:', err);
        setError('Failed to load case configuration');
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchCaseConfig();
    }
  }, [params.id]);

  const handleAssistantClick = (assistant: Assistant) => {
    if (!assistant.isLocked) {
      const doc: CaseDocument = {
        path: assistant.name,
        title: assistant.name,
        type: 'assistant',
        content: assistant.systemPrompt
      };
      setSelectedDocument(doc);
      setIsDocumentViewerOpen(true);
    } else {
      setSelectedDocument(null);
      setIsPasswordModalOpen(true);
    }
  };

  const handleDocumentClick = (document: CaseDocument) => {
    setSelectedDocument(document);
  };

  const onUpdateDemo = async (updatedDemo: Demo) => {
    setCaseConfig(updatedDemo);
    toast.success('Demo updated successfully');
  };

  // If case is loading, show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading case...</p>
        </div>
      </div>
    );
  }

  // If case doesn't exist, show error
  if (error || !caseConfig) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {error || 'Case Not Found'}
          </h1>
          <Link
            href="/"
            className="text-blue-500 hover:text-blue-600 flex items-center justify-center gap-2"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // If case is password protected and not unlocked, show password form
  if (caseConfig.password && !isPasswordCorrect) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Protected Case</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              This case is password protected. Please enter the password to continue.
            </p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="case-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              <input
                id="case-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 px-4 py-2 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter password"
              />
              {error && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
              )}
            </div>
            
            <div className="flex justify-between items-center">
              <Link
                href="/"
                className="text-sm text-blue-500 hover:text-blue-600"
              >
                Back to Dashboard
              </Link>
              <button
                onClick={unlockCase}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Unlock Case
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                <ArrowLeftIcon className="h-5 w-5" />
              </Link>
              <div className="flex items-center space-x-3">
                <DemoIcon icon={caseConfig.iconPath} name={caseConfig.name} size={32} />
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {caseConfig.name || params.id}
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {caseConfig.documents && caseConfig.documents.length > 0 && (
                <button
                  onClick={() => setShowDocuments(true)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <DocumentTextIcon className="h-5 w-5 mr-2" />
                  Documents
                </button>
              )}
              {isAdmin && (
                <>
                  <button
                    onClick={() => setIsManageStudentsOpen(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    <UserPlusIcon className="h-5 w-5 mr-2" />
                    Manage Students
                  </button>
                  <button
                    onClick={() => setShowAdminPanel(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <PencilIcon className="h-5 w-5 mr-2" />
                    Edit Demo
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Assistant Selection Header */}
        <div className="flex-none bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700 sticky top-[72px] z-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Characters</h2>
          <div className="flex flex-wrap gap-3">
            {caseConfig?.assistants?.map((assistant) => {
              const isLocked = assistant.isLocked;
              const isSelected = selectedDocument?.path === assistant.name;
              
              return (
                <div
                  key={assistant.id}
                  className={`relative ${
                    isSelected
                      ? 'bg-blue-100 dark:bg-blue-900'
                      : isLocked
                      ? 'bg-gray-100 dark:bg-gray-800 opacity-70'
                      : 'bg-white dark:bg-gray-800'
                  } rounded-lg shadow-md p-3 cursor-pointer transition-all duration-200`}
                  onClick={() => !isLocked && handleAssistantClick(assistant)}
                >
                  <div className="flex items-center">
                    <DemoIcon icon={caseConfig.iconPath} name={assistant.name} size={24} />
                    <span className="text-lg mr-2">{assistant.name}</span>
                    {isLocked ? (
                      <LockClosedIcon className="h-4 w-4 text-gray-500" />
                    ) : (
                      <LockOpenIcon className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {assistant.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chat Content - Full Width */}
        <div className="flex-1 w-full">
          {selectedDocument ? (
            <StreamingChat
              assistantId={selectedDocument.path}
              assistantName={selectedDocument.title}
              caseId={params.id}
              assistantIcon={caseConfig.iconPath}
            />
          ) : (
            <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 m-4 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                Select an assistant to start chatting
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Bar */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              © 2025 AI Case Marketplace. All rights reserved.
            </p>
            <div className="flex space-x-4">
              <button className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                Help
              </button>
              <button className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                Settings
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Document Viewer */}
      {showDocuments && caseConfig?.documents && (
        <DocumentViewer 
          documents={caseConfig.documents.map(convertToViewerDocument)}
          isOpen={showDocuments}
          onClose={() => setShowDocuments(false)}
        />
      )}

      {/* Admin Panel */}
      {isAdmin && (
        <AdminPanel
          isOpen={showAdminPanel}
          onClose={() => setShowAdminPanel(false)}
          currentDemo={{
            id: caseConfig?.id || '',
            title: caseConfig?.name || '',
            author: caseConfig?.creator?.email || '',
            name: caseConfig?.name || '',
            iconPath: caseConfig?.iconPath,
            password: caseConfig?.password,
            explanationMarkdownPath: '',
            assistants: caseConfig?.assistants || [],
            documents: caseConfig?.documents || [],
            hasPassword: !!caseConfig?.password,
            createdAt: caseConfig?.createdAt || '',
            updatedAt: caseConfig?.updatedAt || ''
          }}
          onUpdateDemo={(updatedDemo) => {
            const updatedCase: Demo = {
              id: updatedDemo.id,
              name: updatedDemo.title,
              description: updatedDemo.name,
              password: updatedDemo.hasPassword ? updatedDemo.password : undefined,
              iconPath: updatedDemo.iconPath,
              assistants: updatedDemo.assistants,
              documents: updatedDemo.documents,
              createdAt: updatedDemo.createdAt,
              updatedAt: updatedDemo.updatedAt
            };
            onUpdateDemo(updatedCase);
          }}
        />
      )}

      {/* Manage Students Modal */}
      <ManageStudentsModal
        isOpen={isManageStudentsOpen}
        onClose={() => setIsManageStudentsOpen(false)}
        caseId={params.id}
      />
    </div>
  );
} 