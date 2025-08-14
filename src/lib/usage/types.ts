/**
 * Usage Management System Types
 */

export enum SubscriptionTier {
  FREE = 'free',
  STARTER = 'starter',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

export enum UsageMetricType {
  API_REQUESTS = 'api_requests',
  AI_TOKENS = 'ai_tokens',
  AI_REQUESTS = 'ai_requests',
  STORAGE_MB = 'storage_mb',
  PROJECTS = 'projects',
  TEAM_MEMBERS = 'team_members',
}

export enum AlertType {
  QUOTA_WARNING = 'quota_warning',
  QUOTA_EXCEEDED = 'quota_exceeded',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  BILLING_ISSUE = 'billing_issue',
  UPGRADE_SUGGESTION = 'upgrade_suggestion',
}

export interface UsageQuota {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  metricType: UsageMetricType;
  limit: number;
  period: 'daily' | 'monthly' | 'yearly';
  currentUsage: number;
  resetDate: Date;
  softLimit?: number; // Warning threshold
  createdAt: Date;
  updatedAt: Date;
}

export interface RateLimit {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  endpoint: string;
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  currentMinute: number;
  currentHour: number;
  currentDay: number;
  windowStart: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageRecord {
  id: string;
  userId: string;
  projectId?: string;
  metricType: UsageMetricType;
  amount: number;
  cost: number;
  metadata: {
    provider?: string;
    model?: string;
    endpoint?: string;
    requestId?: string;
    [key: string]: any;
  };
  timestamp: Date;
}

export interface BillingPeriod {
  id: string;
  userId: string;
  startDate: Date;
  endDate: Date;
  totalCost: number;
  totalUsage: Record<UsageMetricType, number>;
  tier: SubscriptionTier;
  status: 'active' | 'completed' | 'overdue';
  invoiceId?: string;
  createdAt: Date;
}

export interface UsageAlert {
  id: string;
  userId: string;
  type: AlertType;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  metricType?: UsageMetricType;
  currentUsage?: number;
  limit?: number;
  threshold?: number;
  actionRequired: boolean;
  actionUrl?: string;
  dismissed: boolean;
  createdAt: Date;
  dismissedAt?: Date;
}

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  quotas: Record<UsageMetricType, number>;
  rateLimits: {
    apiRequestsPerMinute: number;
    apiRequestsPerHour: number;
    apiRequestsPerDay: number;
  };
  features: string[];
  popular?: boolean;
}

export interface UsageAnalytics {
  userId: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  totalCost: number;
  totalUsage: Record<UsageMetricType, number>;
  usageByDay: Array<{
    date: string;
    usage: Record<UsageMetricType, number>;
    cost: number;
  }>;
  usageByProvider: Record<string, {
    usage: Record<UsageMetricType, number>;
    cost: number;
  }>;
  quotaUtilization: Record<UsageMetricType, {
    used: number;
    limit: number;
    percentage: number;
  }>;
  projectedCost: number;
  projectedUsage: Record<UsageMetricType, number>;
  alerts: UsageAlert[];
}

export interface FairUsagePolicy {
  id: string;
  name: string;
  description: string;
  tier: SubscriptionTier;
  rules: Array<{
    metricType: UsageMetricType;
    limit: number;
    period: 'minute' | 'hour' | 'day' | 'month';
    action: 'warn' | 'throttle' | 'block';
    gracePeriod?: number; // minutes
  }>;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageContext {
  userId: string;
  projectId?: string;
  endpoint: string;
  provider?: string;
  model?: string;
  requestId: string;
  timestamp: Date;
}

export interface QuotaCheckResult {
  allowed: boolean;
  quotaExceeded: boolean;
  rateLimitExceeded: boolean;
  remainingQuota: number;
  remainingRequests: number;
  resetTime: Date;
  warnings: string[];
  upgradeRequired: boolean;
  suggestedTier?: SubscriptionTier;
}

export interface UsageBillingData {
  userId: string;
  billingPeriod: BillingPeriod;
  usage: Record<UsageMetricType, number>;
  costs: Record<string, number>; // provider -> cost
  overageCharges: number;
  totalAmount: number;
  currency: string;
  taxAmount: number;
  discounts: number;
  finalAmount: number;
}