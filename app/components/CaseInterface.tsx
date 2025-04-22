import React from 'react';
import { Assistant, Demo } from '../../src/types';
import StreamingChat from './StreamingChat';

interface CaseInterfaceProps {
  selectedAssistant: Assistant;
  demo: Demo;
}

export default function CaseInterface({ selectedAssistant, demo }: CaseInterfaceProps) {
  return (
    <StreamingChat
      assistantId={selectedAssistant.id}
      assistantName={selectedAssistant.name}
      assistantIcon={selectedAssistant.iconPath}
      caseId={demo.id}
    /> 
  );
} 
import { Assistant, Demo } from '../../src/types';
import StreamingChat from './StreamingChat';

interface CaseInterfaceProps {
  selectedAssistant: Assistant;
  demo: Demo;
}

export default function CaseInterface({ selectedAssistant, demo }: CaseInterfaceProps) {
  return (
    <StreamingChat
      assistantId={selectedAssistant.id}
      assistantName={selectedAssistant.name}
      assistantIcon={selectedAssistant.iconPath}
      caseId={demo.id}
    /> 
  );
} 