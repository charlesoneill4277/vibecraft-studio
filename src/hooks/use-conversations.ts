import { useState, useEffect, useCallback } from 'react';
import type { Conversation, ConversationSummary, ChatMessage } from '@/types';

interface UseConversationsReturn {
  conversations: ConversationSummary[];
  loading: boolean;
  error: string | null;
  currentConversation: Conversation | null;
  createConversation: (projectId: string, title?: string, description?: string) => Promise<Conversation>;
  getConversation: (conversationId: string) => Promise<Conversation | null>;
  updateConversation: (conversationId: string, updates: {
    title?: string;
    description?: string;
    tags?: string[];
    isArchived?: boolean;
    isPinned?: boolean;
  }) => Promise<Conversation>;
  deleteConversation: (conversationId: string) => Promise<void>;
  searchMessages: (projectId: string, query: string, conversationIds?: string[]) => Promise<ChatMessage[]>;
  refreshConversations: (projectId: string) => Promise<void>;
  setCurrentConversation: (conversation: Conversation | null) => void;
}

export function useConversations(): UseConversationsReturn {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async (projectId: string, options: {
    query?: string;
    tags?: string[];
    isArchived?: boolean;
    isPinned?: boolean;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: string;
  } = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('[Frontend] Fetching conversations for project:', projectId);
      
      const params = new URLSearchParams({
        projectId,
        ...Object.fromEntries(
          Object.entries(options).map(([key, value]) => [
            key,
            Array.isArray(value) ? value.join(',') : String(value)
          ])
        )
      });
      
      const response = await fetch(`/api/conversations?${params}`);
      console.log('[Frontend] Conversations response:', {
        status: response.status,
        ok: response.ok
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch conversations');
      }
      
      const data = await response.json();
      console.log('[Frontend] Conversations data received:', {
        success: data.success,
        conversationsCount: data.data?.conversations?.length || 0
      });
      
      if (data.success && data.data) {
        setConversations(data.data.conversations || []);
      } else {
        setConversations([]);
      }
    } catch (err) {
      console.error('[Frontend] fetchConversations error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createConversation = useCallback(async (
    projectId: string,
    title?: string,
    description?: string
  ): Promise<Conversation> => {
    try {
      setError(null);
      
      console.log('[Frontend] Creating conversation:', { projectId, title });
      
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
      });

      console.log('[Frontend] Create conversation response:', {
        status: response.status,
        ok: response.ok
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to create conversation');
      }

      const data = await response.json();
      console.log('[Frontend] Conversation created:', data.data?.conversation?.id);
      
      if (data.success && data.data?.conversation) {
        // Refresh conversations list
        await fetchConversations(projectId);
        return data.data.conversation;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('[Frontend] createConversation error:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    }
  }, [fetchConversations]);

  const getConversation = useCallback(async (conversationId: string): Promise<Conversation | null> => {
    try {
      setError(null);
      
      console.log('[Frontend] Getting conversation:', conversationId);
      
      const response = await fetch(`/api/conversations/${conversationId}`);
      console.log('[Frontend] Get conversation response:', {
        status: response.status,
        ok: response.ok
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to get conversation');
      }

      const data = await response.json();
      console.log('[Frontend] Conversation retrieved:', data.data?.conversation?.id);
      
      if (data.success && data.data?.conversation) {
        return data.data.conversation;
      }
      
      return null;
    } catch (err) {
      console.error('[Frontend] getConversation error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  }, []);

  const updateConversation = useCallback(async (
    conversationId: string,
    updates: {
      title?: string;
      description?: string;
      tags?: string[];
      isArchived?: boolean;
      isPinned?: boolean;
    }
  ): Promise<Conversation> => {
    try {
      setError(null);
      
      console.log('[Frontend] Updating conversation:', { conversationId, updates });
      
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      console.log('[Frontend] Update conversation response:', {
        status: response.status,
        ok: response.ok
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to update conversation');
      }

      const data = await response.json();
      console.log('[Frontend] Conversation updated:', data.data?.conversation?.id);
      
      if (data.success && data.data?.conversation) {
        // Update current conversation if it's the one being updated
        if (currentConversation?.id === conversationId) {
          setCurrentConversation(data.data.conversation);
        }
        
        // Update conversations list
        setConversations(prev => prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, ...data.data.conversation }
            : conv
        ));
        
        return data.data.conversation;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('[Frontend] updateConversation error:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    }
  }, [currentConversation]);

  const deleteConversation = useCallback(async (conversationId: string): Promise<void> => {
    try {
      setError(null);
      
      console.log('[Frontend] Deleting conversation:', conversationId);
      
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
      });

      console.log('[Frontend] Delete conversation response:', {
        status: response.status,
        ok: response.ok
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to delete conversation');
      }

      console.log('[Frontend] Conversation deleted successfully');
      
      // Remove from conversations list
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      
      // Clear current conversation if it's the one being deleted
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
      }
    } catch (err) {
      console.error('[Frontend] deleteConversation error:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    }
  }, [currentConversation]);

  const searchMessages = useCallback(async (
    projectId: string,
    query: string,
    conversationIds?: string[]
  ): Promise<ChatMessage[]> => {
    try {
      setError(null);
      
      console.log('[Frontend] Searching messages:', { projectId, query, conversationIds });
      
      const params = new URLSearchParams({
        projectId,
        query,
        ...(conversationIds && { conversationIds: conversationIds.join(',') })
      });
      
      const response = await fetch(`/api/conversations/search?${params}`);
      console.log('[Frontend] Search messages response:', {
        status: response.status,
        ok: response.ok
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to search messages');
      }

      const data = await response.json();
      console.log('[Frontend] Search results:', {
        messageCount: data.data?.messages?.length || 0
      });
      
      if (data.success && data.data?.messages) {
        return data.data.messages;
      }
      
      return [];
    } catch (err) {
      console.error('[Frontend] searchMessages error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return [];
    }
  }, []);

  const refreshConversations = useCallback(async (projectId: string) => {
    await fetchConversations(projectId);
  }, [fetchConversations]);

  return {
    conversations,
    loading,
    error,
    currentConversation,
    createConversation,
    getConversation,
    updateConversation,
    deleteConversation,
    searchMessages,
    refreshConversations,
    setCurrentConversation,
  };
}