/**
 * Represents an AI assistant in the system
 */
export interface Assistant {
  /** Unique identifier for the assistant */
  id: string;
  /** Display name of the assistant */
  name: string;
  /** Description of the assistant's capabilities */
  description: string;
  /** Path to the assistant's icon */
  iconPath?: string;
  /** Signed URL for the assistant's icon */
  iconUrl?: string;
  /** Whether the assistant requires a password */
  hasPassword: boolean;
  /** Password for accessing the assistant (if hasPassword is true) */
  password?: string;
  /** Whether the assistant is available at the start */
  isAvailableAtStart: boolean;
  /** Path to the assistant's prompt markdown file */
  promptMarkdownPath: string;
  /** Order index for display */
  orderIndex: number;
  /** Display properties when the assistant is locked */
  displayWhenLocked: {
    description?: string;
    previewImage?: string;
  }
}

export interface Document {
  id: string;
  name: string;
  path: string;
}

export interface Demo {
  id: string;
  name: string;
  title: string;
  author: string;
  iconPath?: string;
  iconUrl?: string;
  password?: string;
  explanationMarkdownPath: string;
  assistants: Assistant[];
  documents: Document[];
  hasPassword: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  timestamp: number;
  sender: 'user' | string; // string will be assistant ID
  assistantId?: string;
}

export interface DemoSession {
  demoId: string;
  unlockedAssistantIds: string[];
  chatHistory: ChatMessage[];
  activeAssistantId?: string;
} 