'use client'

import type {
  FeatureFlagConfig,
  FeatureFlagContext,
  FeatureFlagEvaluation,
} from '@/types/feature-flags'

// Client-side only feature flag service
export class ClientFeatureFlagService {
  private cache: Map<string, FeatureFlagEvaluation> = new Map()
  private cacheExpiry: Map<string, number> = new Map()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  constructor() {
    // No direct database connection on client
  }

  /**
   * Get all feature flags for a user context (client-side only)
   */
  async getAllFlags(context: FeatureFlagContext = {}): Promise<FeatureFlagConfig> {
    try {
      const params = new URLSearchParams()
      if (context.projectId) params.set('projectId', context.projectId)
      if (context.userRole) params.set('userRole', context.userRole)

      const response = await fetch(`/api/feature-flags?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout and other fetch options
        signal: AbortSignal.timeout(5000), // 5 second timeout
      })
      
      if (!response.ok) {
        // If unauthorized or any error, just use fallback
        console.warn(`Feature flags API returned ${response.status}, using fallback config`)
        return this.getFallbackConfig()
      }

      const data = await response.json()
      return data.flags || this.getFallbackConfig()
    } catch (error) {
      console.warn('Error getting all flags, using fallback config:', error)
      // Return fallback config immediately on any error
      return this.getFallbackConfig()
    }
  }

  /**
   * Check if a feature is enabled (client-side only)
   */
  async isEnabled(flagName: string, context: FeatureFlagContext = {}): Promise<boolean> {
    const flags = await this.getAllFlags(context)
    return Boolean(flags[flagName])
  }

  /**
   * Get feature flag value (client-side only)
   */
  async getValue<T = any>(flagName: string, context: FeatureFlagContext = {}): Promise<T> {
    const flags = await this.getAllFlags(context)
    return flags[flagName] as T
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
      const response = await fetch('/api/feature-flags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flagName,
          feedback,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
    } catch (error) {
      console.error('Error submitting feedback:', error)
      throw error
    }
  }

  private getFallbackConfig(): FeatureFlagConfig {
    return {
      collaboration: true,
      templates: true,
      github_integration: true,
      analytics: false,
      ai_chat: true,
      knowledge_base: false,
      code_integration: false
    }
  }
}

// Singleton instance for client-side usage
export const clientFeatureFlagService = new ClientFeatureFlagService()