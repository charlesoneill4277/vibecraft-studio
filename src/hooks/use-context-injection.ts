import { useState, useCallback, useEffect } from 'react'
import type { ContextItem, ContextInjectionOptions, ContextAnalysisResult } from '@/lib/context/context-injection-service'

interface UseContextInjectionOptions {
  projectId: string
  autoAnalyze?: boolean
  debounceMs?: number
}

interface UseContextInjectionReturn {
  // State
  contextItems: ContextItem[]
  analysisResult: ContextAnalysisResult | null
  isAnalyzing: boolean
  error: string | null
  
  // Context analysis
  analyzeMessage: (message: string, options?: ContextInjectionOptions) => Promise<ContextAnalysisResult>
  
  // Context management
  selectContextItems: (items: ContextItem[]) => void
  removeContextItem: (itemId: string) => void
  updateContextItem: (itemId: string, updates: Partial<ContextItem>) => void
  clearContext: () => void
  
  // Context formatting
  getFormattedContext: (format?: 'markdown' | 'plain' | 'structured') => Promise<string>
  previewContext: () => Promise<{
    preview: string
    tokenCount: number
    contextTypes: Record<string, number>
    recommendations: string[]
  }>
  
  // Feedback
  provideFeedback: (itemId: string, feedback: 'helpful' | 'not_helpful' | 'irrelevant', message: string) => Promise<void>
  
  // Settings
  updateContextSettings: (settings: Partial<ContextInjectionOptions>) => void
  contextSettings: ContextInjectionOptions
}

export function useContextInjection({
  projectId,
  autoAnalyze = false,
  debounceMs = 500
}: UseContextInjectionOptions): UseContextInjectionReturn {
  const [contextItems, setContextItems] = useState<ContextItem[]>([])
  const [analysisResult, setAnalysisResult] = useState<ContextAnalysisResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contextSettings, setContextSettings] = useState<ContextInjectionOptions>({
    includeKnowledge: true,
    includeCode: true,
    includeAssets: false,
    includePreviousConversations: true,
    maxItems: 10,
    minRelevanceScore: 0.3,
    contextTypes: ['knowledge', 'code', 'asset', 'conversation']
  })

  const analyzeMessage = useCallback(async (
    message: string,
    options?: ContextInjectionOptions
  ): Promise<ContextAnalysisResult> => {
    if (!message.trim()) {
      const emptyResult: ContextAnalysisResult = {
        suggestedContext: [],
        totalRelevantItems: 0,
        contextSummary: 'No message to analyze',
        estimatedTokens: 0
      }
      setAnalysisResult(emptyResult)
      return emptyResult
    }

    try {
      setIsAnalyzing(true)
      setError(null)

      const analysisOptions = { ...contextSettings, ...options }

      const response = await fetch('/api/context/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          message,
          options: analysisOptions
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to analyze message for context')
      }

      const result: ContextAnalysisResult = await response.json()
      setAnalysisResult(result)
      setContextItems(result.suggestedContext)
      
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze message'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsAnalyzing(false)
    }
  }, [projectId, contextSettings])

  const selectContextItems = useCallback((items: ContextItem[]) => {
    setContextItems(items)
    
    // Update analysis result with selected items
    if (analysisResult) {
      setAnalysisResult({
        ...analysisResult,
        suggestedContext: items
      })
    }
  }, [analysisResult])

  const removeContextItem = useCallback((itemId: string) => {
    setContextItems(prev => prev.filter(item => item.id !== itemId))
  }, [])

  const updateContextItem = useCallback((itemId: string, updates: Partial<ContextItem>) => {
    setContextItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, ...updates } : item
    ))
  }, [])

  const clearContext = useCallback(() => {
    setContextItems([])
    setAnalysisResult(null)
    setError(null)
  }, [])

  const getFormattedContext = useCallback(async (
    format: 'markdown' | 'plain' | 'structured' = 'markdown'
  ): Promise<string> => {
    if (contextItems.length === 0) {
      return ''
    }

    try {
      const response = await fetch('/api/context/format', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contextItems,
          format
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to format context')
      }

      const { formattedContext } = await response.json()
      return formattedContext
    } catch (err) {
      console.error('Failed to format context:', err)
      return ''
    }
  }, [contextItems])

  const previewContext = useCallback(async () => {
    try {
      const response = await fetch('/api/context/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          contextItems
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to preview context')
      }

      return await response.json()
    } catch (err) {
      console.error('Failed to preview context:', err)
      return {
        preview: '',
        tokenCount: 0,
        contextTypes: {},
        recommendations: ['Failed to generate preview']
      }
    }
  }, [projectId, contextItems])

  const provideFeedback = useCallback(async (
    itemId: string,
    feedback: 'helpful' | 'not_helpful' | 'irrelevant',
    message: string
  ) => {
    try {
      const response = await fetch('/api/context/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contextItemId: itemId,
          feedback,
          userMessage: message
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to provide feedback')
      }
    } catch (err) {
      console.error('Failed to provide feedback:', err)
    }
  }, [])

  const updateContextSettings = useCallback((settings: Partial<ContextInjectionOptions>) => {
    setContextSettings(prev => ({ ...prev, ...settings }))
  }, [])

  // Auto-analyze when settings change (if enabled)
  useEffect(() => {
    if (autoAnalyze && analysisResult) {
      // Re-analyze with new settings
      // This would need the original message, which we'd need to store
    }
  }, [contextSettings, autoAnalyze, analysisResult])

  return {
    contextItems,
    analysisResult,
    isAnalyzing,
    error,
    analyzeMessage,
    selectContextItems,
    removeContextItem,
    updateContextItem,
    clearContext,
    getFormattedContext,
    previewContext,
    provideFeedback,
    updateContextSettings,
    contextSettings
  }
}