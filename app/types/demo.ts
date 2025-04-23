import { Document } from '@/types/document';
import { Assistant } from '@/types/assistant';
import { User } from '@prisma/client';

export interface Demo {
  id: string;
  name: string;
  description: string;
  iconPath?: string;
  documents?: Document[];
  assistants?: Assistant[];
  isLocked?: boolean;
  password?: string;
  createdAt: Date;
  updatedAt: Date;
  creator?: User;
  creatorId?: string;
} 