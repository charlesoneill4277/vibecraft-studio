import { useState, useEffect, useCallback } from 'react'
import type { 
  Conversation, 
  ConversationSummary, 
  ChatMessage 
} from '@/types'

interface UseConversationsOptions {
  projectId: string
  autoRefresh?: boolean
  refreshInterval?: number
}

interface ConversationSearchOptions {
  query?: string
  tags?: string[]
  isArchived?: boolean
  isPinned?: boolean
  limit?: number
  offset?: number
  sortBy?: 'created_at' | 'updated_at' | 'last_message_at' | 'title'
  sortOrder?: 'asc' | 'desc'
}

interface UseConversationsReturn {
  conversations: ConversationSummary[]
  currentConversation: Conversation | null
  loading: boolean
  error: string | null
  total: number
  
  // Conversation management
  createConversation: (title?: string, description?: string) => Promise<Conversation>
  getConversation: (conversationId: string) => Promise<Conversation | null>
  updateConversation: (conversationId: string, updates: {
    title?: string
    description?: string
    tags?: string[]
    isArchived?: boolean
    isPinned?: boolean
  }) => Promise<Conversation>
  deleteConversation: (conversationId: string) => Promise<void>
  
  // Search and filtering
  searchConversations: (options: ConversationSearchOptions) => Promise<void>
  searchMessages: (query: string, conversationIds?: string[]) => Promise<{ messages: ChatMessage[], total: number }>
  
  // Conversation branching
  branchConversation: (sourceConversationId: string, branchPointMessageId: string, title?: string) => Promise<Conversation>
  
  // Import/Export
  exportConversation: (conversationId: string) => Promise<void>
  importConversation: (file: File) => Promise<Conversation>
  
  // Utilities
  refreshConversations: () => Promise<void>
  setCurrentConversation: (conversation: Conversation | null) => void
  getConversationStats: () => Promise<{
    totalConversations: number
    archivedConversations: number
    pinnedConversations: number
    totalMessages: number
    totalTokens: number
    totalCost: number
  }>
}

export function useConversations({
  projectId,
  autoRefresh = false,
  refreshInterval = 30000
}: UseConversationsOptions): UseConversationsReturn {
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)

  // Load conversations on mount and when projectId changes
  useEffect(() => {
    if (projectId) {
      refreshConversations()
    }
  }, [projectId])

  // Auto-refresh if enabled
  useEffect(() => {
    if (autoRefresh && projectId) {
      const interval = setInterval(() => {
        refreshConversations()
      }, refreshInterval)

      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval, projectId])

  const refreshConversations = useCallback(async () => {
    if (!projectId) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/conversations?projectId=${encodeURIComponent(projectId)}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to load conversations' }))
        throw new Error(errorData.error || 'Failed to load conversations')
      }

      const data = await response.json()
      setConversations(data.conversations || [])
      setTotal(data.total || 0)
    } catch (err) {
      console.error('Error refreshing conversations:', err)
      setError(err instanceof Error ? err.message : 'Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  const createConversation = useCallback(async (
    title?: string,
    description?: string
  ): Promise<Conversation> => {
    try {
      setError(null)

      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          title: title || 'New Conversation',
          description
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create conversation')
      }

      const conversation = await response.json()
      
      // Refresh conversations list
      await refreshConversations()
      
      return conversation
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create conversation'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [projectId, refreshConversations])

  const getConversation = useCallback(async (
    conversationId: string
  ): Promise<Conversation | null> => {
    try {
      setError(null)

      const response = await fetch(`/api/conversations/${conversationId}`)
      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error('Failed to get conversation')
      }

      return await response.json()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get conversation')
      return null
    }
  }, [])

  const updateConversation = useCallback(async (
    conversationId: string,
    updates: {
      title?: string
      description?: string
      tags?: string[]
      isArchived?: boolean
      isPinned?: boolean
    }
  ): Promise<Conversation> => {
    try {
      setError(null)

      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update conversation')
      }

      const updatedConversation = await response.json()
      
      // Update current conversation if it's the one being updated
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(updatedConversation)
      }
      
      // Refresh conversations list
      await refreshConversations()
      
      return updatedConversation
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update conversation'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [currentConversation, refreshConversations])

  const deleteConversation = useCallback(async (
    conversationId: string
  ): Promise<void> => {
    try {
      setError(null)

      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete conversation')
      }

      // Clear current conversation if it's the one being deleted
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null)
      }
      
      // Refresh conversations list
      await refreshConversations()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete conversation'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [currentConversation, refreshConversations])

  const searchConversations = useCallback(async (
    options: ConversationSearchOptions
  ): Promise<void> => {
    if (!projectId) return

    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({ projectId })
      
      // Only add parameters that have actual values (not undefined/null)
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            if (value.length > 0) {
              params.append(key, value.join(','))
            }
          } else {
            params.append(key, String(value))
          }
        }
      })

      const response = await fetch(`/api/conversations/search?${params}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to search conversations' }))
        throw new Error(errorData.error || 'Failed to search conversations')
      }

      const data = await response.json()
      setConversations(data.conversations || [])
      setTotal(data.total || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search conversations')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  const searchMessages = useCallback(async (
    query: string,
    conversationIds?: string[]
  ): Promise<{ messages: ChatMessage[], total: number }> => {
    try {
      setError(null)

      const params = new URLSearchParams({
        projectId,
        query,
        ...(conversationIds && { conversationIds: conversationIds.join(',') })
      })

      const response = await fetch(`/api/conversations/messages/search?${params}`)
      if (!response.ok) {
        throw new Error('Failed to search messages')
      }

      return await response.json()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search messages'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [projectId])

  const branchConversation = useCallback(async (
    sourceConversationId: string,
    branchPointMessageId: string,
    title?: string
  ): Promise<Conversation> => {
    try {
      setError(null)

      const response = await fetch('/api/conversations/branch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceConversationId,
          branchPointMessageId,
          title
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to branch conversation')
      }

      const branchedConversation = await response.json()
      
      // Refresh conversations list
      await refreshConversations()
      
      return branchedConversation
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to branch conversation'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [refreshConversations])

  const exportConversation = useCallback(async (
    conversationId: string
  ): Promise<void> => {
    try {
      setError(null)

      const response = await fetch(`/api/conversations/${conversationId}/export`)
      if (!response.ok) {
        throw new Error('Failed to export conversation')
      }

      const exportData = await response.json()
      
      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `conversation-${conversationId}-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export conversation'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [])

  const importConversation = useCallback(async (
    file: File
  ): Promise<Conversation> => {
    try {
      setError(null)

      const text = await file.text()
      const exportData = JSON.parse(text)

      const response = await fetch('/api/conversations/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          exportData
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to import conversation')
      }

      const importedConversation = await response.json()
      
      // Refresh conversations list
      await refreshConversations()
      
      return importedConversation
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import conversation'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [projectId, refreshConversations])

  const getConversationStats = useCallback(async () => {
    try {
      setError(null)

      const response = await fetch(`/api/conversations/stats?projectId=${projectId}`)
      if (!response.ok) {
        throw new Error('Failed to get conversation stats')
      }

      return await response.json()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get conversation stats'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [projectId])

  return {
    conversations,
    currentConversation,
    loading,
    error,
    total,
    createConversation,
    getConversation,
    updateConversation,
    deleteConversation,
    searchConversations,
    searchMessages,
    branchConversation,
    exportConversation,
    importConversation,
    refreshConversations,
    setCurrentConversation,
    getConversationStats
  }
}