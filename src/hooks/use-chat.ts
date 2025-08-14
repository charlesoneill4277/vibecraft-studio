import { useState, useEffect, useCallback, useRef } from 'react';
import { ChatMessage } from '@/types';

interface UseChatOptions {
  projectId: string;
  conversationId?: string;
  providerId?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

interface ChatState {
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
}

interface UseChatReturn extends ChatState {
  sendMessage: (content: string, options?: Partial<UseChatOptions>) => Promise<void>;
  sendMessageStream: (content: string, options?: Partial<UseChatOptions>) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  rateMessage: (messageId: string, rating: number, feedback?: string) => Promise<void>;
  clearMessages: () => void;
  refreshHistory: () => Promise<void>;
  abortStream: () => void;
}

export function useChat(options: UseChatOptions): UseChatReturn {
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    isStreaming: false,
    error: null,
    stats: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingMessageRef = useRef<ChatMessage | null>(null);

  // Load chat history on mount and when conversation changes
  useEffect(() => {
    refreshHistory();
  }, [options.projectId, options.conversationId]);

  const refreshHistory = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const params = new URLSearchParams({
        projectId: options.projectId,
        ...(options.conversationId && { conversationId: options.conversationId })
      });

      const response = await fetch(`/api/ai/chat/history?${params}`);
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
  }, [options.projectId, options.conversationId]);

  const sendMessage = useCallback(async (
    content: string,
    messageOptions?: Partial<UseChatOptions>
  ) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const requestBody = {
        content,
        projectId: options.projectId,
        conversationId: options.conversationId,
        providerId: messageOptions?.providerId || options.providerId,
        model: messageOptions?.model || options.model,
        temperature: messageOptions?.temperature || options.temperature,
        maxTokens: messageOptions?.maxTokens || options.maxTokens,
        systemPrompt: messageOptions?.systemPrompt || options.systemPrompt,
      };

      const response = await fetch('/api/ai/chat', {
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
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to send message',
        isLoading: false,
      }));
    }
  }, [options]);

  const sendMessageStream = useCallback(async (
    content: string,
    messageOptions?: Partial<UseChatOptions>
  ) => {
    try {
      setState(prev => ({ ...prev, isStreaming: true, error: null }));

      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      const requestBody = {
        content,
        projectId: options.projectId,
        conversationId: options.conversationId,
        providerId: messageOptions?.providerId || options.providerId,
        model: messageOptions?.model || options.model,
        temperature: messageOptions?.temperature || options.temperature,
        maxTokens: messageOptions?.maxTokens || options.maxTokens,
        systemPrompt: messageOptions?.systemPrompt || options.systemPrompt,
      };

      const response = await fetch('/api/ai/chat/stream', {
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
                return;
              }

              try {
                const parsed = JSON.parse(data);
                
                if (parsed.type === 'user_message') {
                  setState(prev => ({
                    ...prev,
                    messages: [...prev.messages, parsed.data],
                  }));
                } else if (parsed.type === 'assistant_delta') {
                  if (!streamingMessageRef.current) {
                    // Create new streaming message
                    streamingMessageRef.current = {
                      id: parsed.data.id,
                      projectId: options.projectId,
                      role: 'assistant',
                      content: parsed.data.content,
                      provider: messageOptions?.providerId || options.providerId || 'unknown',
                      model: messageOptions?.model || options.model || 'unknown',
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
  }, [options]);

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
    abortStream,
  };
}