'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import StreamingChat from '../../components/StreamingChat';
import { ArrowLeftIcon, LockClosedIcon, LockOpenIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import DemoIcon from '../../components/DemoIcon';
import PasswordInput from '../../components/PasswordInput';

interface Assistant {
  id: string;
  name: string;
  description: string;
  icon?: string;
  hasPassword: boolean;
  password?: string;
}

interface CaseConfig {
  id: string;
  title: string;
  author: string;
  icon?: string;
  hasPassword?: boolean;
  password?: string;
  assistants: Assistant[];
}

// Static case configurations
const staticCases: Record<string, CaseConfig> = {
  'math-assistant': {
    id: 'math-assistant',
    title: 'Math Assistant',
    author: 'Benny',
    icon: 'math',
    assistants: [
      {
        id: 'math-assistant',
        name: 'Math Assistant',
        description: 'Helps with mathematical problems and concepts',
        hasPassword: false
      }
    ]
  },
  'writing-assistant': {
    id: 'writing-assistant',
    title: 'Writing Assistant',
    author: 'Benny',
    icon: 'writing',
    assistants: [
      {
        id: 'writing-assistant',
        name: 'Writing Assistant',
        description: 'Helps with writing and content creation',
        hasPassword: false
      }
    ]
  },
  'language-assistant': {
    id: 'language-assistant',
    title: 'Language Assistant',
    author: 'Benny',
    icon: 'language',
    assistants: [
      {
        id: 'language-assistant',
        name: 'Language Assistant',
        description: 'Helps with language learning and translation',
        hasPassword: false
      },
      {
        id: 'language-assistant-advanced',
        name: 'Advanced Language Assistant',
        description: 'Advanced language analysis and translation',
        hasPassword: true,
        password: 'lang123'
      }
    ]
  },
  'coding-assistant': {
    id: 'coding-assistant',
    title: 'Coding Assistant',
    author: 'Benny',
    icon: 'coding',
    assistants: [
      {
        id: 'code-reviewer',
        name: 'Code Reviewer',
        description: 'Reviews code and suggests improvements',
        hasPassword: false
      },
      {
        id: 'debug-helper',
        name: 'Debug Helper',
        description: 'Helps with debugging code issues',
        hasPassword: true,
        password: 'code123'
      }
    ]
  }
};

export default function CaseInterface() {
  const params = useParams<{ id: string }>();
  const caseId = params.id as string;
  const [selectedAssistant, setSelectedAssistant] = useState<Assistant | null>(null);
  const [unlockedAssistants, setUnlockedAssistants] = useState<Set<string>>(new Set());
  const [passwordError, setPasswordError] = useState<string>('');
  const [caseConfig, setCaseConfig] = useState<CaseConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [casePassword, setCasePassword] = useState<string>('');
  const [isCaseUnlocked, setIsCaseUnlocked] = useState<boolean>(false);

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
    if (checkCasePassword(casePassword)) {
      setIsCaseUnlocked(true);
      setPasswordError('');
    } else {
      setPasswordError('Incorrect password');
    }
  };

  // Function to unlock an assistant
  const unlockAssistant = (assistantId: string) => {
    setUnlockedAssistants(prev => new Set([...prev, assistantId]));
  };

  // Fetch the case configuration
  useEffect(() => {
    const fetchCaseConfig = async () => {
      try {
        setLoading(true);
        setError(null);
        
        let config: CaseConfig | null = null;
        
        // First try to fetch from the API
        console.log(`Fetching case config from API: ${caseId}`);
        const response = await fetch(`/api/demos/${caseId}`);
        
        if (response.ok) {
          config = await response.json();
          console.log(`Successfully fetched case config from API: ${caseId}`);
          setCaseConfig(config);
        } else {
          // If not found in API, check static configs
          console.log(`Checking static configs for case: ${caseId}`);
          if (staticCases[caseId]) {
            config = staticCases[caseId];
            setCaseConfig(config);
          } else {
            console.error(`Case not found in API or static configs: ${caseId}`);
            setError('Case not found');
          }
        }

        // If we have a config, select an assistant
        if (config) {
          // Auto-select the first non-password-protected assistant
          const firstAvailableAssistant = config.assistants.find(assistant => !assistant.hasPassword);
          if (firstAvailableAssistant) {
            setSelectedAssistant(firstAvailableAssistant);
          } else if (config.assistants.length > 0) {
            // If all assistants require passwords, select the first one anyway
            setSelectedAssistant(config.assistants[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching case:', error);
        setError('An error occurred while loading the case');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCaseConfig();
  }, [caseId]);

  const handleAssistantClick = (assistant: Assistant) => {
    if (assistant.hasPassword && !unlockedAssistants.has(assistant.id)) {
      setSelectedAssistant(assistant);
      setPasswordError('');
    } else {
      setSelectedAssistant(assistant);
    }
  };

  // If case is loading, show loading state
  if (loading) {
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
  if (caseConfig.hasPassword && !isCaseUnlocked) {
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
                value={casePassword}
                onChange={(e) => setCasePassword(e.target.value)}
                className="mt-1 px-4 py-2 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter password"
              />
              {passwordError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{passwordError}</p>
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

  const assistants = caseConfig.assistants;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Bar */}
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Link href="/" className="mr-4">
                <ArrowLeftIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </Link>
              <div className="flex-shrink-0">
                {caseConfig?.icon ? (
                  <DemoIcon icon={caseConfig.icon} name={caseConfig.title} size={32} />
                ) : (
                  <div className="h-8 w-8 bg-blue-500 rounded-full"></div>
                )}
              </div>
              <div className="ml-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {caseConfig.title}
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">By {caseConfig.author}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Assistant Selection Header */}
        <div className="flex-none bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700 sticky top-[72px] z-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Assistants</h2>
          <div className="flex flex-wrap gap-3">
            {assistants.map((assistant) => {
              const isUnlocked = unlockedAssistants.has(assistant.id);
              const isSelected = selectedAssistant?.id === assistant.id;
              const isLocked = assistant.hasPassword && !isUnlocked;

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
                    {assistant.icon ? (
                      <DemoIcon key={`icon-${assistant.id}`} icon={assistant.icon} name={assistant.name} size={24} />
                    ) : (
                      <div key={`default-icon-${assistant.id}`} className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full mr-2" />
                    )}
                    <span className="text-lg mr-2">{assistant.name}</span>
                    {isLocked ? (
                      <LockClosedIcon key={`lock-${assistant.id}`} className="h-4 w-4 text-gray-500" />
                    ) : (
                      <LockOpenIcon key={`unlock-${assistant.id}`} className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {assistant.description}
                  </p>
                  {isLocked && (
                    <PasswordInput
                      assistantId={assistant.id}
                      onUnlock={unlockAssistant}
                      checkPassword={checkPassword}
                      onError={(error) => setPasswordError(error)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Chat Content - Full Width */}
        <div className="flex-1 w-full">
          {selectedAssistant ? (
            <StreamingChat 
              assistantId={selectedAssistant.id} 
              assistantName={selectedAssistant.name}
              caseId={caseConfig.id}
              assistantIcon={selectedAssistant.icon}
            />
          ) : (
            <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 m-4 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                Select an assistant to start chatting
              </p>
            </div>
          )}
        </div>
      </div>

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
    </div>
  );
} 