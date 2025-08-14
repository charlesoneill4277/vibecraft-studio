import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usageAwareAIClient, type AIRequest, type AIResponse } from '@/lib/ai/usage-aware-client';
import { useUsageSummary, useUsageAlerts } from '@/hooks/use-usage';
import { toast } from 'sonner';

interface UseAIWithUsageOptions {
  onSuccess?: (response: AIResponse) => void;
  onError?: (error: Error) => void;
  onQuotaExceeded?: (provider: string, resetDate: Date) => void;
}

export function useAIWithUsage(options: UseAIWithUsageOptions = {}) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const queryClient = useQueryClient();
  const { refetch: refetchUsage } = useUsageSummary();
  const { refetch: refetchAlerts } = useUsageAlerts();

  // Regular AI request mutation
  const aiMutation = useMutation({
    mutationFn: async (request: AIRequest) => {
      return usageAwareAIClient.sendRequest(request);
    },
    onSuccess: (response) => {
      // Refresh usage data
      refetchUsage();
      refetchAlerts();
      
      options.onSuccess?.(response);
      
      toast.success('AI response generated successfully', {
        description: `Used ${response.usage.totalTokens} tokens (${response.usage.estimatedCost.toFixed(4)} USD)`
      });
    },
    onError: (error: Error) => {
      if (error.message.includes('quota')) {
        const match = error.message.match(/Resets on (.+)/);
        const resetDate = match ? new Date(match[1]) : new Date();
        
        options.onQuotaExceeded?.(
          error.message.split(' ')[2] || 'unknown', // Extract provider from error
          resetDate
        );
        
        toast.error('Quota exceeded', {
          description: error.message
        });
      } else {
        toast.error('AI request failed', {
          description: error.message
        });
      }
      
      options.onError?.(error);
    },
  });

  // Streaming AI request
  const streamAI = useCallback(async (
    request: AIRequest,
    onChunk?: (chunk: string) => void
  ) => {
    setIsStreaming(true);
    setStreamContent('');

    try {
      await usageAwareAIClient.streamRequest(
        request,
        (chunk) => {
          setStreamContent(prev => prev + chunk);
          onChunk?.(chunk);
        },
        (response) => {
          setIsStreaming(false);
          
          // Refresh usage data
          refetchUsage();
          refetchAlerts();
          
          options.onSuccess?.(response);
          
          toast.success('AI response completed', {
            description: `Used ${response.usage.totalTokens} tokens (${response.usage.estimatedCost.toFixed(4)} USD)`
          });
        },
        (error) => {
          setIsStreaming(false);
          setStreamContent('');
          
          if (error.message.includes('quota')) {
            const match = error.message.match(/Resets on (.+)/);
            const resetDate = match ? new Date(match[1]) : new Date();
            
            options.onQuotaExceeded?.(
              error.message.split(' ')[2] || 'unknown',
              resetDate
            );
            
            toast.error('Quota exceeded', {
              description: error.message
            });
          } else {
            toast.error('AI streaming failed', {
              description: error.message
            });
          }
          
          options.onError?.(error);
        }
      );
    } catch (error) {
      setIsStreaming(false);
      setStreamContent('');
      
      const err = error instanceof Error ? error : new Error('Unknown error');
      options.onError?.(err);
      
      toast.error('Failed to start AI stream', {
        description: err.message
      });
    }
  }, [options, refetchUsage, refetchAlerts]);

  return {
    // Regular request
    sendMessage: aiMutation.mutate,
    isLoading: aiMutation.isPending,
    error: aiMutation.error,
    data: aiMutation.data,
    
    // Streaming request
    streamMessage: streamAI,
    isStreaming,
    streamContent,
    
    // Utility
    reset: () => {
      aiMutation.reset();
      setStreamContent('');
      setIsStreaming(false);
    },
  };
}

// Hook for checking quota before making requests
export function useQuotaPrecheck() {
  const { data: summary } = useUsageSummary();

  const checkQuota = useCallback((
    provider: string, 
    quotaType: 'tokens' | 'requests' | 'cost',
    estimatedUsage: number
  ) => {
    if (!summary) return { allowed: true, warning: null };

    const quota = summary.find(q => q.provider === provider && q.quotaType === quotaType);
    
    if (!quota) return { allowed: true, warning: null };

    const projectedUsage = quota.currentUsage + estimatedUsage;
    const projectedPercentage = (projectedUsage / quota.monthlyLimit) * 100;

    if (projectedPercentage >= 100) {
      return {
        allowed: false,
        warning: `This request would exceed your ${quotaType} quota for ${provider}. Quota resets on ${new Date(quota.resetDate).toLocaleDateString()}.`
      };
    }

    if (projectedPercentage >= 90) {
      return {
        allowed: true,
        warning: `This request will use ${Math.round(projectedPercentage)}% of your ${quotaType} quota for ${provider}.`
      };
    }

    return { allowed: true, warning: null };
  }, [summary]);

  return { checkQuota };
}

// Hook for usage-aware AI chat interface
export function useAIChat(projectId?: string) {
  const [messages, setMessages] = useState<Array<{ role: string; content: string; id: string }>>([]);
  const [currentProvider, setCurrentProvider] = useState('openai');
  const [currentModel, setCurrentModel] = useState('gpt-3.5-turbo');

  const aiWithUsage = useAIWithUsage({
    onSuccess: (response) => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: response.content
      }]);
    },
    onQuotaExceeded: (provider, resetDate) => {
      // Could trigger upgrade modal or provider switching
      console.warn(`Quota exceeded for ${provider}, resets on ${resetDate}`);
    }
  });

  const sendMessage = useCallback((content: string) => {
    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content
    };

    setMessages(prev => [...prev, userMessage]);

    const request: AIRequest = {
      provider: currentProvider,
      model: currentModel,
      messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
      projectId,
    };

    aiWithUsage.sendMessage(request);
  }, [messages, currentProvider, currentModel, projectId, aiWithUsage]);

  const streamMessage = useCallback((content: string) => {
    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content
    };

    setMessages(prev => [...prev, userMessage]);

    const request: AIRequest = {
      provider: currentProvider,
      model: currentModel,
      messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
      projectId,
    };

    aiWithUsage.streamMessage(request, (chunk) => {
      // Handle streaming chunks if needed
    });
  }, [messages, currentProvider, currentModel, projectId, aiWithUsage]);

  return {
    messages,
    sendMessage,
    streamMessage,
    isLoading: aiWithUsage.isLoading,
    isStreaming: aiWithUsage.isStreaming,
    streamContent: aiWithUsage.streamContent,
    error: aiWithUsage.error,
    currentProvider,
    setCurrentProvider,
    currentModel,
    setCurrentModel,
    clearMessages: () => setMessages([]),
    reset: aiWithUsage.reset,
  };
}