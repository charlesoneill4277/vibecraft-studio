import { useState, useEffect, useCallback, useRef } from 'react';
import { ChatMessage } from '@/types';

interface UseEnhancedChatOptions {
  projectId: string;
  systemPrompt?: string;
}

interface FallbackConfig {
  enabled: boolean;
  maxRetries: number;
  retryDelay: number;
  fallbackOrder: readonly string[];
  skipProviders: readonly string[];
}

interface EnhancedChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  stats: {
    totalMessages: number;
    userMessages: number;
    assistantMessages: number;
    totalTokens: number;
    totalCost: number;
    averageResponseTime: number;
  } | null;
  health: {
    [provider: string]: {
      available: boolean;
      responseTime?: number;
      lastChecked: Date;
    };
  } | null;
  cacheStats: {
    size: number;
    hitRate: number;
    totalEntries: number;
    averageAge: number;
  } | null;
}

interface UseEnhancedChatReturn extends EnhancedChatState {
  sendMessage: (content: string, options?: {
    providerId?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
    fallbackConfig?: Partial<FallbackConfig>;
    enableCaching?: boolean;
  }) => Promise<void>;
  sendMessageStream: (content: string, options?: {
    providerId?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
    fallbackConfig?: Partial<FallbackConfig>;
  }) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  rateMessage: (messageId: string, rating: number, feedback?: string) => Promise<void>;
  clearMessages: () => void;
  refreshHistory: () => Promise<void>;
  refreshHealth: () => Promise<void>;
  clearCache: () => Promise<void>;
  abortStream: () => void;
}

export function useEnhancedChat(options: UseEnhancedChatOptions): UseEnhancedChatReturn {
  const [state, setState] = useState<EnhancedChatState>({
    messages: [],
    isLoading: false,
    isStreaming: false,
    error: null,
    stats: null,
    health: null,
    cacheStats: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingMessageRef = useRef<ChatMessage | null>(null);

  // Load chat history and health on mount
  useEffect(() => {
    refreshHistory();
    refreshHealth();
  }, [options.projectId]);

  const refreshHistory = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch(`/api/ai/chat/history?projectId=${options.projectId}`);
      if (!response.ok) {
        throw new Error('Failed to load chat history');
      }

      const data = await response.json();
      setState(prev => ({
        ...prev,
        messages: data.messages,
        stats: data.stats,
        isLoading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load chat history',
        isLoading: false,
      }));
    }
  }, [options.projectId]);

  const refreshHealth = useCallback(async () => {
    try {
      const response = await fetch('/api/ai/providers/health');
      if (response.ok) {
        const data = await response.json();
        setState(prev => ({
          ...prev,
          health: data.health,
          cacheStats: data.cache,
        }));
      }
    } catch (error) {
      console.error('Failed to refresh health:', error);
    }
  }, []);

  const clearCache = useCallback(async () => {
    try {
      const response = await fetch('/api/ai/cache', { method: 'DELETE' });
      if (response.ok) {
        await refreshHealth(); // Refresh cache stats
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }, [refreshHealth]);

  const sendMessage = useCallback(async (
    content: string,
    messageOptions?: {
      providerId?: string;
      model?: string;
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
      fallbackConfig?: Partial<FallbackConfig>;
      enableCaching?: boolean;
    }
  ) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const requestBody = {
        content,
        projectId: options.projectId,
        providerId: messageOptions?.providerId,
        model: messageOptions?.model,
        temperature: messageOptions?.temperature,
        maxTokens: messageOptions?.maxTokens,
        systemPrompt: messageOptions?.systemPrompt || options.systemPrompt,
        fallbackConfig: messageOptions?.fallbackConfig,
        enableCaching: messageOptions?.enableCaching,
      };

      const response = await fetch('/api/ai/chat/enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, data.userMessage, data.assistantMessage],
        isLoading: false,
      }));

      // Refresh health and cache stats after successful request
      refreshHealth();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to send message',
        isLoading: false,
      }));
    }
  }, [options, refreshHealth]);

  const sendMessageStream = useCallback(async (
    content: string,
    messageOptions?: {
      providerId?: string;
      model?: string;
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
      fallbackConfig?: Partial<FallbackConfig>;
    }
  ) => {
    try {
      setState(prev => ({ ...prev, isStreaming: true, error: null }));

      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      const requestBody = {
        content,
        projectId: options.projectId,
        providerId: messageOptions?.providerId,
        model: messageOptions?.model,
        temperature: messageOptions?.temperature,
        maxTokens: messageOptions?.maxTokens,
        systemPrompt: messageOptions?.systemPrompt || options.systemPrompt,
        fallbackConfig: messageOptions?.fallbackConfig,
      };

      const response = await fetch('/api/ai/chat/enhanced/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to start streaming');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                setState(prev => ({ ...prev, isStreaming: false }));
                refreshHealth(); // Refresh after completion
                return;
              }

              try {
                const parsed = JSON.parse(data);
                
                if (parsed.type === 'user_message') {
                  setState(prev => ({
                    ...prev,
                    messages: [...prev.messages, parsed.data],
                  }));
                } else if (parsed.type === 'fallback_notice') {
                  // Show fallback notification
                  console.log('Fallback activated:', parsed.data.message);
                } else if (parsed.type === 'assistant_delta') {
                  if (!streamingMessageRef.current) {
                    // Create new streaming message
                    streamingMessageRef.current = {
                      id: parsed.data.id,
                      projectId: options.projectId,
                      role: 'assistant',
                      content: parsed.data.content,
                      provider: messageOptions?.providerId || 'unknown',
                      model: messageOptions?.model || 'unknown',
                      metadata: { streaming: true },
                      createdAt: new Date(),
                    };
                    
                    setState(prev => ({
                      ...prev,
                      messages: [...prev.messages, streamingMessageRef.current!],
                    }));
                  } else {
                    // Update existing streaming message
                    streamingMessageRef.current.content = parsed.data.content;
                    
                    setState(prev => ({
                      ...prev,
                      messages: prev.messages.map(msg =>
                        msg.id === streamingMessageRef.current?.id
                          ? { ...streamingMessageRef.current! }
                          : msg
                      ),
                    }));
                  }
                } else if (parsed.type === 'assistant_complete') {
                  streamingMessageRef.current = null;
                  setState(prev => ({
                    ...prev,
                    messages: prev.messages.map(msg =>
                      msg.id === parsed.data.id ? parsed.data : msg
                    ),
                    isStreaming: false,
                  }));
                } else if (parsed.type === 'error') {
                  throw new Error(parsed.data.message);
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
        streamingMessageRef.current = null;
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was aborted
        setState(prev => ({ ...prev, isStreaming: false }));
      } else {
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to stream message',
          isStreaming: false,
        }));
      }
      streamingMessageRef.current = null;
    }
  }, [options, refreshHealth]);

  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      const response = await fetch(`/api/ai/chat/messages/${messageId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete message');
      }

      setState(prev => ({
        ...prev,
        messages: prev.messages.filter(msg => msg.id !== messageId),
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to delete message',
      }));
    }
  }, []);

  const rateMessage = useCallback(async (
    messageId: string,
    rating: number,
    feedback?: string
  ) => {
    try {
      const response = await fetch(`/api/ai/chat/messages/${messageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rating, feedback }),
      });

      if (!response.ok) {
        throw new Error('Failed to rate message');
      }

      // Update the message in state with rating
      setState(prev => ({
        ...prev,
        messages: prev.messages.map(msg =>
          msg.id === messageId
            ? {
                ...msg,
                metadata: {
                  ...msg.metadata,
                  rating,
                  feedback,
                  ratedAt: new Date().toISOString(),
                },
              }
            : msg
        ),
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to rate message',
      }));
    }
  }, []);

  const clearMessages = useCallback(() => {
    setState(prev => ({
      ...prev,
      messages: [],
      error: null,
    }));
  }, []);

  const abortStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    streamingMessageRef.current = null;
    setState(prev => ({ ...prev, isStreaming: false }));
  }, []);

  return {
    ...state,
    sendMessage,
    sendMessageStream,
    deleteMessage,
    rateMessage,
    clearMessages,
    refreshHistory,
    refreshHealth,
    clearCache,
    abortStream,
  };
}