import { createAdminClient } from '@/lib/supabase/admin'
import type {
  FeatureFlag,
  CreateFeatureFlagRequest,
  UpdateFeatureFlagRequest,
  ABExperiment,
  CreateABExperimentRequest,
  FeatureFlagUsageStats,
  FeatureFlagTrend,
  FeatureFlagAnalytics,
  FeatureFlagFeedback
} from '@/types/feature-flags'

export class FeatureFlagAdminService {
  private adminClient: ReturnType<typeof createAdminClient>

  constructor() {
    this.adminClient = createAdminClient()
  }

  /**
   * Create a new feature flag
   */
  async createFeatureFlag(request: CreateFeatureFlagRequest, createdBy: string): Promise<FeatureFlag> {
    try {
      const { data, error } = await this.adminClient
        .from('feature_flags')
        .insert({
          name: request.name,
          description: request.description,
          flag_type: request.flagType,
          default_value: request.defaultValue,
          environment: request.environment,
          rollout_percentage: request.rolloutPercentage || 100,
          target_audience: request.targetAudience || {},
          metadata: request.metadata || {},
          created_by: createdBy
        })
        .select()
        .single()

      if (error) throw error
      return this.mapFeatureFlag(data)
    } catch (error) {
      console.error('Error creating feature flag:', error)
      throw error
    }
  }

  /**
   * Update an existing feature flag
   */
  async updateFeatureFlag(id: string, request: UpdateFeatureFlagRequest): Promise<FeatureFlag> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      }

      if (request.description !== undefined) updateData.description = request.description
      if (request.defaultValue !== undefined) updateData.default_value = request.defaultValue
      if (request.isActive !== undefined) updateData.is_active = request.isActive
      if (request.rolloutPercentage !== undefined) updateData.rollout_percentage = request.rolloutPercentage
      if (request.targetAudience !== undefined) updateData.target_audience = request.targetAudience
      if (request.metadata !== undefined) updateData.metadata = request.metadata

      const { data, error } = await this.adminClient
        .from('feature_flags')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return this.mapFeatureFlag(data)
    } catch (error) {
      console.error('Error updating feature flag:', error)
      throw error
    }
  }

  /**
   * Delete a feature flag
   */
  async deleteFeatureFlag(id: string): Promise<void> {
    try {
      const { error } = await this.adminClient
        .from('feature_flags')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting feature flag:', error)
      throw error
    }
  }

  /**
   * Get all feature flags
   */
  async getAllFeatureFlags(): Promise<FeatureFlag[]> {
    try {
      const { data, error } = await this.adminClient
        .from('feature_flags')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data || []).map(this.mapFeatureFlag)
    } catch (error) {
      console.error('Error getting feature flags:', error)
      throw error
    }
  }

  /**
   * Get feature flag by ID
   */
  async getFeatureFlag(id: string): Promise<FeatureFlag | null> {
    try {
      const { data, error } = await this.adminClient
        .from('feature_flags')
        .select('*')
        .eq('id', id)
        .single()

      if (error) return null
      return this.mapFeatureFlag(data)
    } catch {
      return null
    }
  }

  /**
   * Create A/B experiment
   */
  async createABExperiment(request: CreateABExperimentRequest, createdBy: string): Promise<ABExperiment> {
    try {
      const { data, error } = await this.adminClient
        .from('ab_experiments')
        .insert({
          name: request.name,
          description: request.description,
          feature_flag_id: request.featureFlagId,
          variants: request.variants,
          traffic_allocation: request.trafficAllocation,
          success_metrics: request.successMetrics || {},
          start_date: request.startDate,
          end_date: request.endDate,
          created_by: createdBy
        })
        .select()
        .single()

      if (error) throw error
      return this.mapABExperiment(data)
    } catch (error) {
      console.error('Error creating A/B experiment:', error)
      throw error
    }
  }

  /**
   * Start an A/B experiment
   */
  async startExperiment(id: string): Promise<ABExperiment> {
    try {
      const { data, error } = await this.adminClient
        .from('ab_experiments')
        .update({
          status: 'running',
          start_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return this.mapABExperiment(data)
    } catch (error) {
      console.error('Error starting experiment:', error)
      throw error
    }
  }

  /**
   * Stop an A/B experiment
   */
  async stopExperiment(id: string): Promise<ABExperiment> {
    try {
      const { data, error } = await this.adminClient
        .from('ab_experiments')
        .update({
          status: 'completed',
          end_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return this.mapABExperiment(data)
    } catch (error) {
      console.error('Error stopping experiment:', error)
      throw error
    }
  }

  /**
   * Get usage statistics for a feature flag
   */
  async getFeatureFlagStats(flagId: string, days: number = 30): Promise<FeatureFlagUsageStats> {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      // Get analytics data
      const { data: analytics, error: analyticsError } = await this.adminClient
        .from('feature_flag_analytics')
        .select('event_type, user_id')
        .eq('feature_flag_id', flagId)
        .gte('created_at', startDate.toISOString())

      if (analyticsError) throw analyticsError

      // Get feedback data
      const { data: feedback, error: feedbackError } = await this.adminClient
        .from('feature_flag_feedback')
        .select('rating')
        .eq('feature_flag_id', flagId)
        .gte('created_at', startDate.toISOString())

      if (feedbackError) throw feedbackError

      // Get flag name
      const { data: flag, error: flagError } = await this.adminClient
        .from('feature_flags')
        .select('name')
        .eq('id', flagId)
        .single()

      if (flagError) throw flagError

      // Calculate statistics
      const totalEvaluations = analytics?.length || 0
      const uniqueUsers = new Set(analytics?.map(a => a.user_id).filter(Boolean)).size
      const enabledCount = analytics?.filter(a => a.event_type === 'enabled').length || 0
      const disabledCount = analytics?.filter(a => a.event_type === 'disabled').length || 0
      const errorCount = analytics?.filter(a => a.event_type === 'error').length || 0
      
      const ratings = feedback?.map(f => f.rating).filter(Boolean) || []
      const averageRating = ratings.length > 0 
        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length 
        : undefined

      return {
        flagName: flag.name,
        totalEvaluations,
        uniqueUsers,
        enabledCount,
        disabledCount,
        errorCount,
        averageRating,
        feedbackCount: feedback?.length || 0
      }
    } catch (error) {
      console.error('Error getting feature flag stats:', error)
      throw error
    }
  }

  /**
   * Get feature flag usage trends
   */
  async getFeatureFlagTrends(flagId: string, days: number = 30): Promise<FeatureFlagTrend[]> {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const { data, error } = await this.adminClient
        .from('feature_flag_analytics')
        .select('created_at, event_type, user_id')
        .eq('feature_flag_id', flagId)
        .gte('created_at', startDate.toISOString())
        .order('created_at')

      if (error) throw error

      // Group by date
      const dailyStats: Record<string, {
        evaluations: number
        uniqueUsers: Set<string>
        enabled: number
      }> = {}

      for (const record of data || []) {
        const date = new Date(record.created_at).toISOString().split('T')[0]
        
        if (!dailyStats[date]) {
          dailyStats[date] = {
            evaluations: 0,
            uniqueUsers: new Set(),
            enabled: 0
          }
        }

        dailyStats[date].evaluations++
        if (record.user_id) {
          dailyStats[date].uniqueUsers.add(record.user_id)
        }
        if (record.event_type === 'enabled') {
          dailyStats[date].enabled++
        }
      }

      // Convert to trend array
      return Object.entries(dailyStats).map(([date, stats]) => ({
        date,
        evaluations: stats.evaluations,
        uniqueUsers: stats.uniqueUsers.size,
        enabledPercentage: stats.evaluations > 0 
          ? (stats.enabled / stats.evaluations) * 100 
          : 0
      }))
    } catch (error) {
      console.error('Error getting feature flag trends:', error)
      throw error
    }
  }

  /**
   * Get all feedback for a feature flag
   */
  async getFeatureFlagFeedback(flagId: string): Promise<FeatureFlagFeedback[]> {
    try {
      const { data, error } = await this.adminClient
        .from('feature_flag_feedback')
        .select(`
          *,
          users!inner (
            full_name,
            email
          )
        `)
        .eq('feature_flag_id', flagId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return (data || []).map(item => ({
        id: item.id,
        featureFlagId: item.feature_flag_id,
        userId: item.user_id,
        rating: item.rating,
        feedbackText: item.feedback_text,
        feedbackType: item.feedback_type,
        metadata: {
          ...item.metadata,
          userName: item.users.full_name || item.users.email
        },
        createdAt: item.created_at
      }))
    } catch (error) {
      console.error('Error getting feature flag feedback:', error)
      throw error
    }
  }

  /**
   * Set user override for a feature flag
   */
  async setUserOverride(
    flagId: string,
    userId: string,
    value: any,
    reason?: string,
    expiresAt?: string
  ): Promise<void> {
    try {
      const { error } = await this.adminClient
        .from('user_feature_flags')
        .upsert({
          feature_flag_id: flagId,
          user_id: userId,
          value,
          reason,
          expires_at: expiresAt
        })

      if (error) throw error
    } catch (error) {
      console.error('Error setting user override:', error)
      throw error
    }
  }

  /**
   * Remove user override for a feature flag
   */
  async removeUserOverride(flagId: string, userId: string): Promise<void> {
    try {
      const { error } = await this.adminClient
        .from('user_feature_flags')
        .delete()
        .eq('feature_flag_id', flagId)
        .eq('user_id', userId)

      if (error) throw error
    } catch (error) {
      console.error('Error removing user override:', error)
      throw error
    }
  }

  // Private helper methods

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

  private mapABExperiment(data: any): ABExperiment {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      featureFlagId: data.feature_flag_id,
      variants: data.variants,
      trafficAllocation: data.traffic_allocation,
      successMetrics: data.success_metrics,
      status: data.status,
      startDate: data.start_date,
      endDate: data.end_date,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  }
}

// Singleton instance
export const featureFlagAdminService = new FeatureFlagAdminService()