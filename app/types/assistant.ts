export interface Assistant {
  id: string;
  name: string;
  systemPrompt: string;
  hasPassword?: boolean;
  isAvailableAtStart?: boolean;
  promptMarkdownPath?: string;
  orderIndex?: number;
  displayWhenLocked?: boolean;
  isLocked?: boolean;
  description: string;
  unlockConditions?: {
    documentPaths?: string[];
    requiredAnswers?: {
      question: string;
      answer: string;
    }[];
  };
  model?: string;
  temperature?: number;
  maxTokens?: number;
} 