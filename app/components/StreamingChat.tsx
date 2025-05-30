'use client';

import { useState, useRef, useEffect } from 'react';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github-dark.css';
import DemoIcon from './DemoIcon';
import { TrashIcon, ArrowDownTrayIcon, PencilIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useAuth } from '../contexts/AuthContext';
import AdminPanel from './AdminPanel';
import ManageStudentsModal from './ManageStudentsModal';

interface StreamingResponse {
  item_id: string;
  output_index: number;
  content_index: number;
  delta: string;
}

interface StreamingChatProps {
  assistantId: string;
  assistantName: string;
  caseId: string;
  assistantIcon?: string;
}

interface Message {
  type: 'user' | 'assistant';
  content: string;
}

export default function StreamingChat({ assistantId, assistantName, caseId, assistantIcon }: StreamingChatProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isManageStudentsOpen, setIsManageStudentsOpen] = useState(false);
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  const [caseConfig, setCaseConfig] = useState<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const exportOptionsRef = useRef<HTMLDivElement>(null);
  const { isAdmin } = useAuth();

  // Fetch the case configuration when needed for admin panel
  useEffect(() => {
    const fetchCaseConfig = async () => {
      try {
        const response = await fetch(`/api/demos/${caseId}`);
        if (response.ok) {
          const config = await response.json();
          setCaseConfig(config);
        }
      } catch (error) {
        console.error('Error fetching case config:', error);
      }
    };

    if (isAdminPanelOpen && !caseConfig) {
      fetchCaseConfig();
    }
  }, [isAdminPanelOpen, caseId, caseConfig]);

  const onUpdateDemo = async (updatedDemo: any) => {
    try {
      const response = await fetch(`/api/demos/${caseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedDemo),
      });

      if (!response.ok) {
        throw new Error('Failed to update demo');
      }

      setCaseConfig(updatedDemo);
    } catch (error) {
      console.error('Error updating demo:', error);
    }
  };

  // Close export options when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportOptionsRef.current && !exportOptionsRef.current.contains(event.target as Node)) {
        setShowExportOptions(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Add effect to focus input field after AI response is complete
  useEffect(() => {
    // Focus the input when loading finishes (AI stops responding)
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Update scroll behavior to be more aggressive during streaming
  useEffect(() => {
    if (isLoading) {
      // Use immediate scroll during loading/streaming
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    } else {
      // Use smooth scroll when not loading
      scrollToBottom();
    }
  }, [messages, isLoading]);

  // Function to handle clearing the chat
  const handleClearChat = () => {
    setShowClearConfirmation(true);
  };

  const confirmClearChat = () => {
    // If there's an ongoing request, abort it
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Reset all chat-related state
    setMessages([]);
    setInput('');
    setIsLoading(false);
    setError(null);
    setShowClearConfirmation(false);
    
    // Focus the input field after clearing
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const cancelClearChat = () => {
    setShowClearConfirmation(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !assistantId) return;

    setIsLoading(true);
    setError(null);
    
    // Add user message immediately
    setMessages(prev => {
      const newMessages: Message[] = [...prev, { type: 'user' as const, content: input }];
      return newMessages;
    });
    const currentInput = input;
    setInput(''); // Clear input right away

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      // Format messages for the API request
      const messageHistory = messages.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));
      
      // Add the current message
      messageHistory.push({
        role: 'user',
        content: currentInput
      });

      const response = await fetch('/api/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: currentInput,
          messageHistory: messageHistory,
          assistantId: assistantId,
          demoId: caseId
        }),
        signal: abortControllerRef.current.signal,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      // Add assistant message placeholder
      setMessages(prev => {
        const newMessages: Message[] = [...prev, { type: 'assistant' as const, content: '' }];
        return newMessages;
      });

      const decoder = new TextDecoder();
      let accumulatedResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6)) as StreamingResponse;
              if (data.delta) {
                accumulatedResponse += data.delta;
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1].content = accumulatedResponse;
                  return newMessages;
                });
              }
            } catch (e) {
              console.error('Error parsing streaming data:', e);
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Silently handle aborted requests
      } else {
        console.error('Error in handleSubmit:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      abortControllerRef.current = null;
      
      // No focus management needed
    }
  };

  // Function to export chat as PDF
  const exportAsPDF = async () => {
    if (!chatContainerRef.current || messages.length === 0) return;
    
    try {
      // Close export options menu
      setShowExportOptions(false);
      
      // Create a clone of the chat container to prepare for capture
      const chatClone = chatContainerRef.current.cloneNode(true) as HTMLElement;
      
      // Apply safe styling
      chatClone.style.position = 'absolute';
      chatClone.style.left = '-9999px';
      chatClone.style.top = '0';
      chatClone.style.width = '800px'; // Wider for better fit
      chatClone.style.backgroundColor = '#ffffff';
      chatClone.style.padding = '20px';
      chatClone.style.color = '#000000';
      
      // Add a header with the assistant name at the top
      const header = document.createElement('div');
      header.style.fontSize = '24px';
      header.style.fontWeight = 'bold';
      header.style.marginBottom = '30px';
      header.style.textAlign = 'center';
      header.style.color = '#000000';
      header.textContent = `Conversation with ${assistantName}`;
      chatClone.prepend(header);
      
      // Better styling for the message bubbles
      const messageElements = chatClone.querySelectorAll('.flex');
      messageElements.forEach(messageEl => {
        if (messageEl instanceof HTMLElement) {
          // Add proper spacing between messages
          messageEl.style.marginBottom = '20px';
          
          // Style bubble containers individually
          const bubbleContainer = messageEl.querySelector('div:not(.prose)');
          if (bubbleContainer instanceof HTMLElement) {
            // Apply styles based on message type
            const isUserMessage = bubbleContainer.classList.contains('bg-blue-500');
            
            // Clear background classes and apply direct styles
            bubbleContainer.className = '';
            bubbleContainer.style.padding = '12px';
            bubbleContainer.style.borderRadius = '12px';
            bubbleContainer.style.maxWidth = '75%';
            bubbleContainer.style.marginLeft = isUserMessage ? 'auto' : '0';
            bubbleContainer.style.marginRight = isUserMessage ? '0' : 'auto';
            
            // Set background and text colors directly
            if (isUserMessage) {
              bubbleContainer.style.backgroundColor = '#3b82f6'; // blue-500
              bubbleContainer.style.color = '#ffffff';
            } else {
              bubbleContainer.style.backgroundColor = '#ffffff'; // white
              bubbleContainer.style.color = '#000000';
              bubbleContainer.style.border = '1px solid #e5e7eb'; // Add border for assistant messages
            }
            
            // Add subtle shadows
            bubbleContainer.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
          }
          
          // Ensure text content is properly styled in user messages
          const userTextContent = messageEl.querySelector('p');
          if (userTextContent instanceof HTMLElement && bubbleContainer instanceof HTMLElement) {
            const isUserBubble = bubbleContainer.style.backgroundColor === '#3b82f6';
            userTextContent.style.margin = '0';
            userTextContent.style.padding = '0';
            userTextContent.style.whiteSpace = 'pre-wrap';
            userTextContent.style.color = isUserBubble ? '#ffffff' : '#000000';
          }
          
          // Style markdown content in assistant messages
          const assistantContent = messageEl.querySelector('.prose');
          if (assistantContent instanceof HTMLElement) {
            assistantContent.style.color = '#000000';
            assistantContent.style.fontSize = '14px';
            assistantContent.style.lineHeight = '1.5';
            
            // Style all text elements within markdown
            const textElements = assistantContent.querySelectorAll('p, li, h1, h2, h3, blockquote, td, th');
            textElements.forEach(el => {
              if (el instanceof HTMLElement) {
                el.style.color = '#000000';
                el.style.margin = '8px 0';
              }
            });
            
            // Style code blocks
            const codeElements = assistantContent.querySelectorAll('pre, code');
            codeElements.forEach(el => {
              if (el instanceof HTMLElement) {
                el.style.backgroundColor = '#f3f4f6'; // gray-100
                el.style.color = '#111827'; // gray-900
                el.style.padding = el.tagName === 'PRE' ? '12px' : '2px 4px';
                el.style.borderRadius = '4px';
                el.style.fontFamily = 'monospace';
              }
            });
          }
        }
      });
      
      // Add to document body temporarily
      document.body.appendChild(chatClone);
      
      // Use html2canvas with better configuration
      const canvas = await html2canvas(chatClone, {
        scale: 2, // Higher scale for better quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 800,
        onclone: (clonedDoc) => {
          // Force any remaining problematic styles
          const allElements = clonedDoc.querySelectorAll('*');
          allElements.forEach(el => {
            if (el instanceof HTMLElement) {
              const computedStyle = window.getComputedStyle(el);
              if (computedStyle.backgroundColor.includes('oklch')) {
                el.style.backgroundColor = '#ffffff';
              }
              if (computedStyle.color.includes('oklch')) {
                el.style.color = '#000000';
              }
            }
          });
        }
      });
      
      // Convert canvas to PDF using jsPDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`chat-with-${assistantName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);
      
      // Clean up
      document.body.removeChild(chatClone);
    } catch (error) {
      console.error('Error exporting as PDF:', error);
      setError('Failed to export chat as PDF');
    }
  };
  
  // Function to export chat as PNG - use same styling improvements as PDF
  const exportAsPNG = async () => {
    if (!chatContainerRef.current || messages.length === 0) return;
    
    try {
      // Close export options menu
      setShowExportOptions(false);
      
      // Create a clone of the chat container to prepare for capture
      const chatClone = chatContainerRef.current.cloneNode(true) as HTMLElement;
      
      // Apply safe styling
      chatClone.style.position = 'absolute';
      chatClone.style.left = '-9999px';
      chatClone.style.top = '0';
      chatClone.style.width = '800px'; // Wider for better fit
      chatClone.style.backgroundColor = '#ffffff';
      chatClone.style.padding = '20px';
      chatClone.style.color = '#000000';
      
      // Add a header with the assistant name at the top
      const header = document.createElement('div');
      header.style.fontSize = '24px';
      header.style.fontWeight = 'bold';
      header.style.marginBottom = '30px';
      header.style.textAlign = 'center';
      header.style.color = '#000000';
      header.textContent = `Conversation with ${assistantName}`;
      chatClone.prepend(header);
      
      // Better styling for the message bubbles
      const messageElements = chatClone.querySelectorAll('.flex');
      messageElements.forEach(messageEl => {
        if (messageEl instanceof HTMLElement) {
          // Add proper spacing between messages
          messageEl.style.marginBottom = '20px';
          
          // Get message type by checking for justify-end class
          const isUserMessage = messageEl.classList.contains('justify-end');
          
          // Style bubble containers individually
          const bubbleContainer = messageEl.querySelector('div:not(.prose)');
          if (bubbleContainer instanceof HTMLElement) {
            // Clear background classes and apply direct styles
            bubbleContainer.className = '';
            bubbleContainer.style.padding = '12px';
            bubbleContainer.style.borderRadius = '12px';
            bubbleContainer.style.maxWidth = '75%';
            bubbleContainer.style.marginLeft = isUserMessage ? 'auto' : '0';
            bubbleContainer.style.marginRight = isUserMessage ? '0' : 'auto';
            
            // Set background and text colors directly
            if (isUserMessage) {
              bubbleContainer.style.backgroundColor = '#3b82f6'; // blue-500
              bubbleContainer.style.color = '#ffffff';
            } else {
              bubbleContainer.style.backgroundColor = '#ffffff'; // white
              bubbleContainer.style.color = '#000000';
              bubbleContainer.style.border = '1px solid #e5e7eb'; // Add border for assistant messages
            }
            
            // Add subtle shadows
            bubbleContainer.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
          }
          
          // Ensure text content is properly styled in user messages
          const userTextContent = messageEl.querySelector('p');
          if (userTextContent instanceof HTMLElement && bubbleContainer instanceof HTMLElement) {
            const isUserBubble = isUserMessage;
            userTextContent.style.margin = '0';
            userTextContent.style.padding = '0';
            userTextContent.style.whiteSpace = 'pre-wrap';
            userTextContent.style.color = isUserBubble ? '#ffffff' : '#000000';
          }
          
          // Style markdown content in assistant messages
          const assistantContent = messageEl.querySelector('.prose');
          if (assistantContent instanceof HTMLElement) {
            assistantContent.style.color = '#000000';
            assistantContent.style.fontSize = '14px';
            assistantContent.style.lineHeight = '1.5';
            
            // Style all text elements within markdown
            const textElements = assistantContent.querySelectorAll('p, li, h1, h2, h3, blockquote, td, th');
            textElements.forEach(el => {
              if (el instanceof HTMLElement) {
                el.style.color = '#000000';
                el.style.margin = '8px 0';
              }
            });
            
            // Style code blocks
            const codeElements = assistantContent.querySelectorAll('pre, code');
            codeElements.forEach(el => {
              if (el instanceof HTMLElement) {
                el.style.backgroundColor = '#f3f4f6'; // gray-100
                el.style.color = '#111827'; // gray-900
                el.style.padding = el.tagName === 'PRE' ? '12px' : '2px 4px';
                el.style.borderRadius = '4px';
                el.style.fontFamily = 'monospace';
              }
            });
          }
        }
      });
      
      // Add to document body temporarily
      document.body.appendChild(chatClone);
      
      // Use html2canvas with better configuration
      const canvas = await html2canvas(chatClone, {
        scale: 2, // Higher scale for better quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 800,
        onclone: (clonedDoc) => {
          // Force any remaining problematic styles
          const allElements = clonedDoc.querySelectorAll('*');
          allElements.forEach(el => {
            if (el instanceof HTMLElement) {
              const computedStyle = window.getComputedStyle(el);
              if (computedStyle.backgroundColor.includes('oklch')) {
                el.style.backgroundColor = '#ffffff';
              }
              if (computedStyle.color.includes('oklch')) {
                el.style.color = '#000000';
              }
            }
          });
        }
      });
      
      // Create a download link
      const link = document.createElement('a');
      link.download = `chat-with-${assistantName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      // Clean up
      document.body.removeChild(chatClone);
    } catch (error) {
      console.error('Error exporting as PNG:', error);
      setError('Failed to export chat as PNG');
    }
  };

  return (
    <div className="relative flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg shadow-md">
      {/* Chat messages container */}
      <div 
        ref={chatContainerRef}
        className="h-full flex flex-col overflow-y-auto p-4 pb-[100px]"
      >
        <div className="flex-1" />
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`flex items-start space-x-2 max-w-[80%] ${
                  message.type === 'user'
                    ? 'flex-row-reverse space-x-reverse'
                    : 'flex-row'
                }`}
              >
                {message.type === 'assistant' && (
                  <div className="flex-shrink-0 mt-1">
                    <DemoIcon icon={assistantIcon} name={assistantName} size={32} />
                  </div>
                )}
                <div
                  className={`rounded-lg p-3 ${
                    message.type === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                  }`}
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex, rehypeRaw, rehypeSanitize, rehypeHighlight]}
                    className="prose dark:prose-invert max-w-none"
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input form - Fixed at bottom */}
      <div className="fixed bottom-[60px] left-0 right-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <form 
            onSubmit={handleSubmit}
            className="border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md"
          >
            <div className="flex items-center space-x-4">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                disabled={isLoading}
              />
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowExportOptions(true)}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  title="Export chat"
                >
                  <ArrowDownTrayIcon className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={handleClearChat}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  title="Clear chat"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className={`px-4 py-2 rounded-lg ${
                    isLoading || !input.trim()
                      ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  {isLoading ? 'Thinking...' : 'Send'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Export options dropdown */}
      {showExportOptions && (
        <div 
          ref={exportOptionsRef}
          className="absolute bottom-[120px] right-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2 z-30"
        >
          <button
            onClick={exportAsPDF}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            Export as PDF
          </button>
          <button
            onClick={exportAsPNG}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            Export as PNG
          </button>
        </div>
      )}

      {/* Clear chat confirmation modal */}
      {showClearConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Clear Chat History?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This will permanently delete all messages. Are you sure?
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={cancelClearChat}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmClearChat}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Clear Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Panel */}
      {isAdmin && (
        <>
          <AdminPanel
            isOpen={isAdminPanelOpen}
            onClose={() => setIsAdminPanelOpen(false)}
            currentDemo={caseConfig}
            onUpdateDemo={onUpdateDemo}
          />
          <ManageStudentsModal
            isOpen={isManageStudentsOpen}
            onClose={() => setIsManageStudentsOpen(false)}
            caseId={caseId}
          />
        </>
      )}
    </div>
  );
} 