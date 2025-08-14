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
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  provider: string;
  model: string;
  metadata: MessageMetadata;
  parentMessageId?: string;
  threadDepth: number;
  isBranchPoint: boolean;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  parentConversationId?: string;
  branchPointMessageId?: string;
  isArchived: boolean;
  isPinned: boolean;
  tags: string[];
  lastMessageAt: Date;
  messageCount: number;
  totalTokens: number;
  totalCost: number;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationSummary extends Conversation {
  projectName: string;
  latestMessage?: string;
  latestMessageRole?: 'user' | 'assistant';
  latestMessageTime?: Date;
  userMessageCount: number;
  assistantMessageCount: number;
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

// Enhanced usage management types
export interface UserSubscription {
  id: string;
  userId: string;
  planType: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'cancelled' | 'expired' | 'suspended';
  billingCycle?: 'monthly' | 'yearly';
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageQuotaDetailed {
  id: string;
  userId: string;
  provider: 'openai' | 'anthropic' | 'straico' | 'cohere';
  quotaType: 'tokens' | 'requests' | 'cost';
  monthlyLimit: number;
  currentUsage: number;
  resetDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIUsageLog {
  id: string;
  userId: string;
  projectId?: string;
  provider: 'openai' | 'anthropic' | 'straico' | 'cohere';
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  requestDuration?: number;
  status: 'success' | 'error' | 'rate_limited' | 'quota_exceeded';
  errorMessage?: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface UsageAlert {
  id: string;
  userId: string;
  alertType: 'quota_warning' | 'quota_exceeded' | 'cost_warning' | 'upgrade_prompt';
  provider?: 'openai' | 'anthropic' | 'straico' | 'cohere';
  thresholdPercentage?: number;
  currentUsage?: number;
  limitValue?: number;
  message: string;
  isRead: boolean;
  isDismissed: boolean;
  createdAt: Date;
}

export interface RateLimit {
  id: string;
  userId: string;
  endpoint: string;
  requestsCount: number;
  windowStart: Date;
  windowDuration: string; // PostgreSQL interval
  maxRequests: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BillingEvent {
  id: string;
  userId: string;
  eventType: 'subscription_created' | 'subscription_updated' | 'subscription_cancelled' | 'payment_succeeded' | 'payment_failed' | 'quota_exceeded';
  amount?: number;
  currency: string;
  stripeEventId?: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface UsageAnalytics {
  userId: string;
  email: string;
  planType: 'free' | 'pro' | 'enterprise';
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  avgRequestDuration: number;
  usageDate: Date;
}

export interface UsageSummary {
  provider: string;
  quotaType: string;
  currentUsage: number;
  monthlyLimit: number;
  usagePercentage: number;
  resetDate: Date;
  isNearLimit: boolean;
  isOverLimit: boolean;
}

export interface CostBreakdown {
  provider: string;
  model: string;
  totalCost: number;
  totalTokens: number;
  requestCount: number;
  avgCostPerRequest: number;
  avgCostPerToken: number;
}

// Re-export feature flag types
export * from './feature-flags';
