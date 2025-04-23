export interface Demo {
  id: string;
  name: string;
  description: string;
  iconPath?: string;
  assistants: Assistant[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Assistant {
  id: string;
  name: string;
  description?: string;
  path?: string;
  isUnlocked: boolean;
  hasPassword?: boolean;
} 
 
  id: string;
  name: string;
  description: string;
  iconPath?: string;
  assistants: Assistant[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Assistant {
  id: string;
  name: string;
  description?: string;
  path?: string;
  isUnlocked: boolean;
  hasPassword?: boolean;
} 
 
 
 
 