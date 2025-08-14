'use client'

import React, { useState, useEffect, useCallback, useContext, createContext, ReactNode, useRef } from 'react'
import { useAuth } from './use-auth'
import { clientFeatureFlagService } from '@/lib/feature-flags/client-service'
import type { FeatureFlagConfig, FeatureFlagContext as FeatureFlagEvaluationContext } from '@/types/feature-flags'

interface FeatureFlagContextType {
  flags: FeatureFlagConfig
  loading: boolean
  error: string | null
  isEnabled: (flagName: string) => boolean
  getValue: <T = any>(flagName: string, defaultValue?: T) => T
  submitFeedback: (flagName: string, feedback: {
    rating?: number
    feedbackText?: string
    feedbackType?: 'bug' | 'improvement' | 'general'
  }) => Promise<void>
  refreshFlags: () => Promise<void>
}

const FeatureFlagContext = createContext<FeatureFlagContextType | undefined>(undefined)

interface FeatureFlagProviderProps {
  children: ReactNode
  projectId?: string
  customContext?: Record<string, any>
}

export function FeatureFlagProvider({ 
  children, 
  projectId,
  customContext = {} 
}: FeatureFlagProviderProps) {
  const { user } = useAuth()
  const [flags, setFlags] = useState<FeatureFlagConfig>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const loadingRef = useRef(false)

  const getContext = useCallback((): FeatureFlagEvaluationContext => ({
    userId: user?.id,
    userRole: user?.role,
    projectId,
    environment: process.env.NODE_ENV as any,
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
    customAttributes: customContext
  }), [user?.id, user?.role, projectId])

  const loadFlags = useCallback(async () => {
    // Prevent multiple simultaneous loads
    if (loadingRef.current) return
    
    try {
      loadingRef.current = true
      setLoading(true)
      setError(null)
      
      const context = getContext()
      const flagConfig = await clientFeatureFlagService.getAllFlags(context)
      
      setFlags(flagConfig)
    } catch (err) {
      console.error('Error loading feature flags:', err)
      setError(err instanceof Error ? err.message : 'Failed to load feature flags')
      
      // Use fallback configuration
      setFlags({
        collaboration: true,
        templates: true,
        github_integration: true,
        analytics: false,
        ai_chat: true,
        knowledge_base: false,
        code_integration: false
      })
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [getContext])

  const isEnabled = useCallback((flagName: string): boolean => {
    return Boolean(flags[flagName])
  }, [flags])

  const getValue = useCallback(<T = any>(flagName: string, defaultValue?: T): T => {
    const value = flags[flagName]
    return value !== undefined ? value : (defaultValue as T)
  }, [flags])

  const submitFeedback = useCallback(async (
    flagName: string,
    feedback: {
      rating?: number
      feedbackText?: string
      feedbackType?: 'bug' | 'improvement' | 'general'
    }
  ) => {
    if (!user?.id) {
      throw new Error('User must be authenticated to submit feedback')
    }

    try {
      await clientFeatureFlagService.submitFeedback(flagName, user.id, feedback)
    } catch (err) {
      console.error('Error submitting feedback:', err)
      throw err
    }
  }, [user?.id])

  const refreshFlags = useCallback(async () => {
    await loadFlags()
  }, [loadFlags])

  // Load flags on mount
  useEffect(() => {
    loadFlags()
  }, []) // Empty dependency array - only run on mount

  // Refresh flags when user ID changes
  useEffect(() => {
    if (user?.id) {
      loadFlags()
    }
  }, [user?.id]) // Only depend on user ID, not loadFlags

  const contextValue: FeatureFlagContextType = {
    flags,
    loading,
    error,
    isEnabled,
    getValue,
    submitFeedback,
    refreshFlags
  }

  return React.createElement(
    FeatureFlagContext.Provider,
    { value: contextValue },
    children
  )
}

export function useFeatureFlags() {
  const context = useContext(FeatureFlagContext)
  if (context === undefined) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagProvider')
  }
  return context
}

// Individual flag hooks for convenience
export function useFeatureFlag(flagName: string) {
  const { isEnabled, getValue, loading } = useFeatureFlags()
  
  return {
    enabled: isEnabled(flagName),
    value: getValue(flagName),
    loading
  }
}

// Specific feature hooks
export function useCollaboration() {
  return useFeatureFlag('collaboration')
}

export function useTemplates() {
  return useFeatureFlag('templates')
}

export function useGitHubIntegration() {
  return useFeatureFlag('github_integration')
}

export function useAnalytics() {
  return useFeatureFlag('analytics')
}

export function useAIChat() {
  return useFeatureFlag('ai_chat')
}

export function useKnowledgeBase() {
  return useFeatureFlag('knowledge_base')
}

export function useCodeIntegration() {
  return useFeatureFlag('code_integration')
}

// Hook for A/B testing
export function useABTest(experimentName: string) {
  const { getValue, loading } = useFeatureFlags()
  
  const variant = getValue<string>(`ab_${experimentName}`, 'control')
  
  return {
    variant,
    isControl: variant === 'control',
    isVariant: (variantName: string) => variant === variantName,
    loading
  }
}

// Hook for gradual rollouts
export function useGradualRollout(flagName: string, fallback: any = false) {
  const { getValue, loading, error } = useFeatureFlags()
  
  const value = getValue(flagName, fallback)
  
  return {
    value,
    enabled: Boolean(value),
    loading,
    error
  }
}