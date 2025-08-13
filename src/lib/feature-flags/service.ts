import { createClient } from '@/lib/supabase/client'
import { config as appConfig } from '@/lib/config'
import type {
  FeatureFlag,
  UserFeatureFlag,
  FeatureFlagContext,
  FeatureFlagEvaluation,
  FeatureFlagConfig,
  CreateFeatureFlagRequest,
  UpdateFeatureFlagRequest,
  FeatureFlagAnalytics,
  FeatureFlagFeedback,
  ABExperiment,
  CreateABExperimentRequest,
  FeatureFlagError
} from '@/types/feature-flags'

export class FeatureFlagService {
  private supabase: ReturnType<typeof createClient>
  private cache: Map<string, FeatureFlagEvaluation> = new Map()
  private cacheExpiry: Map<string, number> = new Map()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  constructor(supabaseClient?: ReturnType<typeof createClient>) {
    this.supabase = supabaseClient || createClient()
  }

  /**
   * Evaluate a feature flag for a given context
   */
  async evaluateFlag(
    flagName: string,
    context: FeatureFlagContext = {}
  ): Promise<FeatureFlagEvaluation> {
    try {
      const cacheKey = this.getCacheKey(flagName, context)
      
      // Check cache first
      if (this.isCacheValid(cacheKey)) {
        const cached = this.cache.get(cacheKey)!
        await this.trackAnalytics(flagName, 'evaluated', cached.value, context)
        return cached
      }

      // Get feature flag from database
      const flag = await this.getFeatureFlag(flagName)
      if (!flag) {
        const fallback = this.getFallbackValue(flagName)
        const evaluation: FeatureFlagEvaluation = {
          flagName,
          value: fallback,
          reason: 'flag_not_found'
        }
        await this.trackAnalytics(flagName, 'error', fallback, context, 'Flag not found')
        return evaluation
      }

      // Check if flag is active
      if (!flag.isActive) {
        const evaluation: FeatureFlagEvaluation = {
          flagName,
          value: flag.defaultValue,
          reason: 'flag_disabled'
        }
        this.setCache(cacheKey, evaluation)
        await this.trackAnalytics(flagName, 'disabled', flag.defaultValue, context)
        return evaluation
      }

      // Check environment
      if (flag.environment !== 'all' && flag.environment !== appConfig.env) {
        const evaluation: FeatureFlagEvaluation = {
          flagName,
          value: flag.defaultValue,
          reason: 'environment_mismatch'
        }
        this.setCache(cacheKey, evaluation)
        await this.trackAnalytics(flagName, 'disabled', flag.defaultValue, context)
        return evaluation
      }

      // Check user-specific override
      if (context.userId) {
        const userOverride = await this.getUserOverride(flag.id, context.userId)
        if (userOverride) {
          const evaluation: FeatureFlagEvaluation = {
            flagName,
            value: userOverride.value,
            reason: 'user_override'
          }
          this.setCache(cacheKey, evaluation)
          await this.trackAnalytics(flagName, 'enabled', userOverride.value, context)
          return evaluation
        }
      }

      // Check A/B experiment assignment
      if (context.userId) {
        const experimentResult = await this.getExperimentAssignment(flag.id, context.userId)
        if (experimentResult) {
          const evaluation: FeatureFlagEvaluation = {
            flagName,
            value: experimentResult.value,
            reason: 'ab_experiment',
            variant: experimentResult.variantKey,
            experimentId: experimentResult.experimentId
          }
          this.setCache(cacheKey, evaluation)
          await this.trackAnalytics(flagName, 'enabled', experimentResult.value, context)
          return evaluation
        }
      }

      // Check rollout percentage
      if (flag.rolloutPercentage < 100) {
        const shouldEnable = this.shouldEnableForUser(flagName, context.userId, flag.rolloutPercentage)
        if (!shouldEnable) {
          const evaluation: FeatureFlagEvaluation = {
            flagName,
            value: flag.defaultValue,
            reason: 'rollout_percentage'
          }
          this.setCache(cacheKey, evaluation)
          await this.trackAnalytics(flagName, 'disabled', flag.defaultValue, context)
          return evaluation
        }
      }

      // Check targeting rules
      if (Object.keys(flag.targetAudience).length > 0) {
        const matchesTarget = this.evaluateTargetingRules(flag.targetAudience, context)
        if (!matchesTarget) {
          const evaluation: FeatureFlagEvaluation = {
            flagName,
            value: flag.defaultValue,
            reason: 'targeting_rules'
          }
          this.setCache(cacheKey, evaluation)
          await this.trackAnalytics(flagName, 'disabled', flag.defaultValue, context)
          return evaluation
        }
      }

      // Default to enabled
      const evaluation: FeatureFlagEvaluation = {
        flagName,
        value: flag.defaultValue,
        reason: 'default'
      }
      this.setCache(cacheKey, evaluation)
      await this.trackAnalytics(flagName, 'enabled', flag.defaultValue, context)
      return evaluation

    } catch (error) {
      const fallback = this.getFallbackValue(flagName)
      const evaluation: FeatureFlagEvaluation = {
        flagName,
        value: fallback,
        reason: 'error'
      }
      await this.trackAnalytics(flagName, 'error', fallback, context, (error as Error).message)
      return evaluation
    }
  }

  /**
   * Get all feature flags for a user context
   */
  async getAllFlags(context: FeatureFlagContext = {}): Promise<FeatureFlagConfig> {
    try {
      const { data: flags, error } = await this.supabase
        .from('feature_flags')
        .select('*')
        .eq('is_active', true)
        .in('environment', ['all', appConfig.env])

      if (error) throw error

      const config: FeatureFlagConfig = {}
      
      for (const flag of flags || []) {
        const evaluation = await this.evaluateFlag(flag.name, context)
        config[flag.name] = evaluation.value
      }

      return config
    } catch (error) {
      console.error('Error getting all flags:', error)
      return this.getFallbackConfig()
    }
  }

  /**
   * Check if a feature is enabled
   */
  async isEnabled(flagName: string, context: FeatureFlagContext = {}): Promise<boolean> {
    const evaluation = await this.evaluateFlag(flagName, context)
    return Boolean(evaluation.value)
  }

  /**
   * Get feature flag value with type safety
   */
  async getValue<T = any>(flagName: string, context: FeatureFlagContext = {}): Promise<T> {
    const evaluation = await this.evaluateFlag(flagName, context)
    return evaluation.value as T
  }

  /**
   * Submit feedback for a feature flag
   */
  async submitFeedback(
    flagName: string,
    userId: string,
    feedback: {
      rating?: number
      feedbackText?: string
      feedbackType?: 'bug' | 'improvement' | 'general'
    }
  ): Promise<void> {
    try {
      const flag = await this.getFeatureFlag(flagName)
      if (!flag) throw new Error('Feature flag not found')

      const { error } = await this.supabase
        .from('feature_flag_feedback')
        .insert({
          feature_flag_id: flag.id,
          user_id: userId,
          rating: feedback.rating,
          feedback_text: feedback.feedbackText,
          feedback_type: feedback.feedbackType || 'general',
          metadata: {}
        })

      if (error) throw error
    } catch (error) {
      console.error('Error submitting feedback:', error)
      throw error
    }
  }

  // Private helper methods

  private async getFeatureFlag(name: string): Promise<FeatureFlag | null> {
    try {
      const { data, error } = await this.supabase
        .from('feature_flags')
        .select('*')
        .eq('name', name)
        .single()

      if (error) return null
      return this.mapFeatureFlag(data)
    } catch {
      return null
    }
  }

  private async getUserOverride(flagId: string, userId: string): Promise<UserFeatureFlag | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_feature_flags')
        .select('*')
        .eq('feature_flag_id', flagId)
        .eq('user_id', userId)
        .single()

      if (error) return null
      
      // Check if override has expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return null
      }

      return this.mapUserFeatureFlag(data)
    } catch {
      return null
    }
  }

  private async getExperimentAssignment(flagId: string, userId: string): Promise<{
    value: any
    variantKey: string
    experimentId: string
  } | null> {
    try {
      const { data: assignment, error } = await this.supabase
        .from('ab_experiment_assignments')
        .select(`
          variant_key,
          ab_experiments!inner (
            id,
            variants,
            status
          )
        `)
        .eq('user_id', userId)
        .eq('ab_experiments.feature_flag_id', flagId)
        .eq('ab_experiments.status', 'running')
        .single()

      if (error || !assignment) return null

      const experiment = assignment.ab_experiments as any
      const variant = experiment.variants.find((v: any) => v.key === assignment.variant_key)
      
      if (!variant) return null

      return {
        value: variant.value,
        variantKey: assignment.variant_key,
        experimentId: experiment.id
      }
    } catch {
      return null
    }
  }

  private shouldEnableForUser(flagName: string, userId: string | undefined, percentage: number): boolean {
    if (!userId) return Math.random() * 100 < percentage
    
    // Use consistent hashing for stable rollout
    const hash = this.hashString(`${flagName}:${userId}`)
    return (hash % 100) < percentage
  }

  private evaluateTargetingRules(rules: Record<string, any>, context: FeatureFlagContext): boolean {
    // Simple rule evaluation - can be extended for complex targeting
    for (const [key, value] of Object.entries(rules)) {
      switch (key) {
        case 'userRole':
          if (context.userRole !== value) return false
          break
        case 'projectId':
          if (context.projectId !== value) return false
          break
        // Add more targeting rules as needed
      }
    }
    return true
  }

  private async trackAnalytics(
    flagName: string,
    eventType: 'evaluated' | 'enabled' | 'disabled' | 'error',
    value: any,
    context: FeatureFlagContext,
    errorMessage?: string
  ): Promise<void> {
    try {
      const flag = await this.getFeatureFlag(flagName)
      if (!flag) return

      await this.supabase
        .from('feature_flag_analytics')
        .insert({
          feature_flag_id: flag.id,
          user_id: context.userId || null,
          event_type: eventType,
          value,
          metadata: {
            ...context,
            error: errorMessage,
            timestamp: new Date().toISOString()
          }
        })
    } catch (error) {
      // Don't throw analytics errors
      console.error('Analytics tracking error:', error)
    }
  }

  private getFallbackValue(flagName: string): any {
    // Return environment-based fallbacks
    const fallbacks = appConfig.features as Record<string, any>
    return fallbacks[flagName] ?? false
  }

  private getFallbackConfig(): FeatureFlagConfig {
    return appConfig.features as FeatureFlagConfig
  }

  private getCacheKey(flagName: string, context: FeatureFlagContext): string {
    return `${flagName}:${context.userId || 'anonymous'}:${JSON.stringify(context)}`
  }

  private isCacheValid(cacheKey: string): boolean {
    const expiry = this.cacheExpiry.get(cacheKey)
    return expiry ? expiry > Date.now() : false
  }

  private setCache(cacheKey: string, evaluation: FeatureFlagEvaluation): void {
    this.cache.set(cacheKey, evaluation)
    this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_TTL)
  }

  private hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  private mapFeatureFlag(data: any): FeatureFlag {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      flagType: data.flag_type,
      defaultValue: data.default_value,
      isActive: data.is_active,
      environment: data.environment,
      rolloutPercentage: data.rollout_percentage,
      targetAudience: data.target_audience,
      metadata: data.metadata,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  }

  private mapUserFeatureFlag(data: any): UserFeatureFlag {
    return {
      id: data.id,
      userId: data.user_id,
      featureFlagId: data.feature_flag_id,
      value: data.value,
      reason: data.reason,
      expiresAt: data.expires_at,
      createdAt: data.created_at
    }
  }
}

// Note: This service is now primarily for server-side usage
// Client-side code should use the client-service.ts instead

// Singleton instance for server-side usage (when not using admin client)
export const featureFlagService = new FeatureFlagService()