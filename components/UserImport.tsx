import React, { useState } from 'react';
import { useSession } from 'next-auth/react';

interface UserImportProps {
  caseId: string;
  onImportComplete?: () => void;
}

export default function UserImport({ caseId, onImportComplete }: UserImportProps) {
  const { data: session } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
      setResult(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a CSV file');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // Read the file content
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const csvData = event.target?.result as string;
          
          // Send the CSV data to the API
          const response = await fetch('/api/users/import', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              csvData,
              caseId,
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to import users');
          }

          setResult(data.results);
          if (onImportComplete) {
            onImportComplete();
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
          setIsLoading(false);
        }
      };

      reader.onerror = () => {
        setError('Error reading file');
        setIsLoading(false);
      };

      reader.readAsText(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsLoading(false);
    }
  };

  if (!session) {
    return <div>You must be logged in to import users.</div>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Import Users</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            CSV File
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-indigo-50 file:text-indigo-700
              hover:file:bg-indigo-100"
          />
          <p className="mt-1 text-sm text-gray-500">
            Upload a CSV file with columns: email, username (optional)
          </p>
        </div>

        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}

        {result && (
          <div className="mt-4 p-4 bg-gray-50 rounded-md">
            <h3 className="font-medium">Import Results:</h3>
            <p className="text-sm">
              Successfully imported: {result.success} users
            </p>
            <p className="text-sm">
              Failed to import: {result.failed} users
            </p>
            {result.errors.length > 0 && (
              <div className="mt-2">
                <h4 className="text-sm font-medium">Errors:</h4>
                <ul className="text-sm text-red-500 list-disc pl-5">
                  {result.errors.map((err, index) => (
                    <li key={index}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !file}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isLoading ? 'Importing...' : 'Import Users'}
        </button>
      </form>
    </div>
  );
} 