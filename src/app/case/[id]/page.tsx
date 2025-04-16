import { useCaseStore } from '@/store/caseStore';
import { useState } from 'react';
import { ChatInterface } from '@/components/case/ChatInterface';
import { AssistantSelector } from '@/components/case/AssistantSelector';
import { MarkdownViewer } from '@/components/case/MarkdownViewer';
import { PasswordModal } from '@/components/case/PasswordModal';
import { Layout } from '@/components/common/Layout';
import { Case, Assistant } from '@/types';

interface CasePageProps {
  params: {
    id: string;
  };
}

export default function CasePage({ params }: CasePageProps) {
  const { cases, currentSession, setCurrentSession } = useCaseStore();
  const [showPassword, setShowPassword] = useState(false);
  const [selectedAssistantId, setSelectedAssistantId] = useState<string | null>(null);

  // Find the case
  const case_ = cases.find((c: Case) => c.id === params.id);
  if (!case_) {
    return <div>Case not found</div>;
  }

  // Find the selected assistant
  const selectedAssistant = case_.assistants.find((a: Assistant) => a.id === selectedAssistantId);

  const handleAssistantSelect = (assistantId: string) => {
    const assistant = case_.assistants.find((a: Assistant) => a.id === assistantId);
    if (!assistant) return;

    if (assistant.hasPassword) {
      setSelectedAssistantId(assistantId);
      setShowPassword(true);
    } else {
      setCurrentSession({
        caseId: case_.id,
        assistantId,
        messages: [],
      });
    }
  };

  const handlePasswordSubmit = (password: string) => {
    if (!selectedAssistantId) return;

    const assistant = case_.assistants.find((a: Assistant) => a.id === selectedAssistantId);
    if (!assistant) return;

    if (password === assistant.password) {
      setCurrentSession({
        caseId: case_.id,
        assistantId: selectedAssistantId,
        messages: [],
      });
      setShowPassword(false);
    } else {
      // Handle incorrect password
      alert('Incorrect password');
    }
  };

  return (
    <Layout>
      <div className="flex h-full">
        {/* Left sidebar */}
        <div className="w-64 bg-gray-50 p-4 border-r">
          <AssistantSelector
            assistants={case_.assistants}
            onSelect={handleAssistantSelect}
            selectedId={currentSession?.assistantId}
          />
        </div>

        {/* Main content */}
        <div className="flex-1 flex">
          {currentSession ? (
            <ChatInterface session={currentSession} />
          ) : selectedAssistant ? (
            <MarkdownViewer assistantId={selectedAssistant.id} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Select an assistant to begin
            </div>
          )}
        </div>
      </div>

      {/* Password modal */}
      <PasswordModal
        isOpen={showPassword}
        onClose={() => {
          setShowPassword(false);
          setSelectedAssistantId(null);
        }}
        onSubmit={handlePasswordSubmit}
      />
    </Layout>
  );
} 