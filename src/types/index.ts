// Core application types
export interface User {
  id: string;
  email: string;
  fullName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string;
  githubRepo?: string;
  localPath?: string;
  settings: ProjectSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectSettings {
  defaultAIProvider: string;
  defaultModel: string;
  collaborationEnabled: boolean;
  publicTemplates: boolean;
}

export interface ChatMessage {
  id: string;
  projectId: string;
  role: 'user' | 'assistant';
  content: string;
  provider: string;
  model: string;
  metadata: MessageMetadata;
  createdAt: Date;
}

export interface MessageMetadata {
  tokens?: number;
  cost?: number;
  responseTime?: number;
  rating?: number;
}

export interface KnowledgeDocument {
  id: string;
  projectId: string;
  title: string;
  content: string;
  fileUrl?: string;
  category: 'documentation' | 'research' | 'assets' | 'code';
  metadata: {
    fileType?: string;
    size?: number;
    tags: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectAsset {
  id: string;
  projectId: string;
  name: string;
  fileUrl: string;
  type: string;
  size: number;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface AIProvider {
  id: string;
  userId: string;
  provider: 'openai' | 'anthropic' | 'straico' | 'cohere';
  apiKeyEncrypted: string;
  isActive: boolean;
  settings: {
    defaultModel: string;
    maxTokens: number;
    temperature: number;
  };
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  permissions: Record<string, boolean>;
  createdAt: Date;
}

export type ProjectRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface AIUsage {
  id: string;
  userId: string;
  projectId?: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  requestDuration: number;
  createdAt: Date;
}

export interface UsageQuota {
  id: string;
  userId: string;
  provider: string;
  monthlyLimit: number;
  currentUsage: number;
  costLimit: number;
  currentCost: number;
  resetDate: Date;
}

// Re-export feature flag types
export * from './feature-flags';
