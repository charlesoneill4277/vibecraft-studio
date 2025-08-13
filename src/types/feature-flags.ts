// Feature Flag System Types

export type FeatureFlagType = 'boolean' | 'string' | 'number' | 'json'
export type Environment = 'development' | 'staging' | 'production' | 'all'
export type EventType = 'evaluated' | 'enabled' | 'disabled' | 'error'
export type FeedbackType = 'bug' | 'improvement' | 'general'
export type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed'

export interface FeatureFlag {
  id: string
  name: string
  description?: string
  flagType: FeatureFlagType
  defaultValue: any
  isActive: boolean
  environment: Environment
  rolloutPercentage: number
  targetAudience: Record<string, any>
  metadata: Record<string, any>
  createdBy?: string
  createdAt: string
  updatedAt: string
}

export interface UserFeatureFlag {
  id: string
  userId: string
  featureFlagId: string
  value: any
  reason?: string
  expiresAt?: string
  createdAt: string
}

export interface FeatureFlagAnalytics {
  id: string
  featureFlagId: string
  userId?: string
  eventType: EventType
  value?: any
  metadata: Record<string, any>
  createdAt: string
}

export interface FeatureFlagFeedback {
  id: string
  featureFlagId: string
  userId: string
  rating?: number
  feedbackText?: string
  feedbackType: FeedbackType
  metadata: Record<string, any>
  createdAt: string
}

export interface ABExperiment {
  id: string
  name: string
  description?: string
  featureFlagId: string
  variants: ExperimentVariant[]
  trafficAllocation: Record<string, number>
  successMetrics: Record<string, any>
  status: ExperimentStatus
  startDate?: string
  endDate?: string
  createdBy?: string
  createdAt: string
  updatedAt: string
}

export interface ExperimentVariant {
  key: string
  name: string
  description?: string
  value: any
  weight: number
}

export interface ABExperimentAssignment {
  id: string
  experimentId: string
  userId: string
  variantKey: string
  assignedAt: string
}

// Feature flag evaluation context
export interface FeatureFlagContext {
  userId?: string
  userRole?: string
  projectId?: string
  environment?: Environment
  userAgent?: string
  ipAddress?: string
  customAttributes?: Record<string, any>
}

// Feature flag evaluation result
export interface FeatureFlagEvaluation {
  flagName: string
  value: any
  reason: string
  variant?: string
  experimentId?: string
}

// Feature flag configuration for client-side usage
export interface FeatureFlagConfig {
  [flagName: string]: any
}

// Analytics aggregation types
export interface FeatureFlagUsageStats {
  flagName: string
  totalEvaluations: number
  uniqueUsers: number
  enabledCount: number
  disabledCount: number
  errorCount: number
  averageRating?: number
  feedbackCount: number
}

export interface FeatureFlagTrend {
  date: string
  evaluations: number
  uniqueUsers: number
  enabledPercentage: number
}

// Admin interface types
export interface CreateFeatureFlagRequest {
  name: string
  description?: string
  flagType: FeatureFlagType
  defaultValue: any
  environment: Environment
  rolloutPercentage?: number
  targetAudience?: Record<string, any>
  metadata?: Record<string, any>
}

export interface UpdateFeatureFlagRequest {
  description?: string
  defaultValue?: any
  isActive?: boolean
  rolloutPercentage?: number
  targetAudience?: Record<string, any>
  metadata?: Record<string, any>
}

export interface CreateABExperimentRequest {
  name: string
  description?: string
  featureFlagId: string
  variants: ExperimentVariant[]
  trafficAllocation: Record<string, number>
  successMetrics?: Record<string, any>
  startDate?: string
  endDate?: string
}

export interface FeatureFlagError extends Error {
  code: string
  flagName?: string
  context?: FeatureFlagContext
}