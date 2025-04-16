import { useState } from 'react';
import { DocumentTextIcon, ArrowDownTrayIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface Document {
  name: string;
  description: string;
  key: string;
  type: string;
  size: number;
}

interface DocumentViewerProps {
  documents: Document[];
  isOpen: boolean;
  onClose: () => void;
}

export default function DocumentViewer({ documents, isOpen, onClose }: DocumentViewerProps) {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDocumentClick = async (document: Document) => {
    try {
      // Get signed URL for the document
      const response = await fetch(`/api/documents/${encodeURIComponent(document.key)}`);
      if (!response.ok) throw new Error('Failed to get document URL');
      
      const { url } = await response.json();
      setPreviewUrl(url);
      setSelectedDocument(document);
    } catch (error) {
      console.error('Error getting document URL:', error);
      alert('Failed to load document. Please try again.');
    }
  };

  const handleDownload = async (document: Document) => {
    try {
      const response = await fetch(`/api/documents/${encodeURIComponent(document.key)}`);
      if (!response.ok) throw new Error('Failed to get document URL');
      
      const { url } = await response.json();
      
      // Create a temporary link and click it to trigger download
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.name;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Failed to download document. Please try again.');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const canPreviewInBrowser = (type: string) => {
    // List of MIME types that can be previewed directly in the browser
    const previewableTypes = [
      'image/',
      'application/pdf',
      'text/',
      'application/json',
      'application/xml',
      'application/javascript',
      'application/x-javascript',
      'text/html',
      'text/css',
      'text/plain',
      'text/markdown',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    ];
    
    return previewableTypes.some(previewableType => type.startsWith(previewableType));
  };

  const getPreviewComponent = (document: Document, url: string) => {
    if (document.type.startsWith('image/')) {
      return (
        <img
          src={url}
          alt={document.name}
          className="w-full h-full object-contain"
        />
      );
    } else if (document.type === 'application/pdf') {
      return (
        <iframe
          src={url}
          className="w-full h-full"
          title={document.name}
        />
      );
    } else if (document.type.startsWith('text/') || 
               document.type === 'application/json' || 
               document.type === 'application/xml' ||
               document.type === 'application/javascript' ||
               document.type === 'application/x-javascript' ||
               document.type === 'text/html' ||
               document.type === 'text/css' ||
               document.type === 'text/plain' ||
               document.type === 'text/markdown' ||
               document.type === 'text/csv') {
      return (
        <iframe
          src={url}
          className="w-full h-full"
          title={document.name}
        />
      );
    } else if (document.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
               document.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
               document.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
      // Use Microsoft Office Online Viewer for Office documents
      const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
      return (
        <iframe
          src={officeViewerUrl}
          className="w-full h-full"
          title={document.name}
        />
      );
    }
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <p className="text-gray-500 dark:text-gray-400">
          Preview not available for this file type.
        </p>
        <button
          onClick={() => handleDownload(document)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
          Download to View
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-[95vw] h-[90vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Case Documents</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            title="Close"
            aria-label="Close document viewer"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Document List - made narrower */}
          <div className="w-1/4 border-r border-gray-200 dark:border-gray-700 overflow-y-auto p-4">
            {documents.map((doc, index) => (
              <div
                key={index}
                onClick={() => handleDocumentClick(doc)}
                className={`p-4 rounded-lg mb-2 cursor-pointer transition-colors ${
                  selectedDocument?.key === doc.key
                    ? 'bg-blue-50 dark:bg-blue-900'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-start">
                  <DocumentTextIcon className="h-6 w-6 text-blue-500 mr-3 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-white">{doc.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{doc.description}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {formatFileSize(doc.size)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Preview Area - made wider */}
          <div className="flex-1 p-4 flex flex-col">
            {selectedDocument ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {selectedDocument.name}
                  </h3>
                  <button
                    onClick={() => handleDownload(selectedDocument)}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                    Download
                  </button>
                </div>
                
                {previewUrl && (
                  <div className="flex-1 bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden">
                    {getPreviewComponent(selectedDocument, previewUrl)}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                Select a document to preview
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 