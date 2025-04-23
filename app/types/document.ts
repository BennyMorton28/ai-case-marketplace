export interface Document {
  path: string;
  title: string;
  type: string;
  content?: string;
  isLocked?: boolean;
  unlockConditions?: {
    documentPaths?: string[];
    assistantIds?: string[];
  };
} 