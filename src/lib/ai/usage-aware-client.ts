import { usageService } from '@/lib/usage/usage-service';
import { estimateAIUsage } from '@/lib/middleware/rate-limit';

export interface AIRequest {
  provider: string;
  model: string;
  messages: Array<{ role: string; content: string }>;
  projectId?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
  model: string;
  provider: string;
  requestDuration: number;
}

export class UsageAwareAIClient {
  async sendRequest(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      // Pre-flight quota check
      const estimation = estimateAIUsage(request);
      
      // Check if user has sufficient quota
      const quotaCheck = await usageService.checkQuotaAvailability(
        '', // Will be filled by the service from auth context
        request.provider,
        'tokens',
        estimation.estimatedTokens
      );

      if (!quotaCheck.allowed) {
        throw new Error(`Quota exceeded for ${request.provider}. Resets on ${quotaCheck.resetDate.toLocaleDateString()}`);
      }

      // Make the actual AI request
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'AI request failed');
      }

      const data = await response.json();
      const requestDuration = Date.now() - startTime;

      // Log the usage
      await usageService.logAIUsage({
        userId: '', // Will be filled by the service
        projectId: request.projectId,
        provider: request.provider,
        model: request.model,
        inputTokens: data.usage.inputTokens,
        outputTokens: data.usage.outputTokens,
        estimatedCost: data.usage.estimatedCost,
        requestDuration,
        status: 'success',
      });

      return {
        content: data.content,
        usage: data.usage,
        model: data.model,
        provider: data.provider,
        requestDuration,
      };

    } catch (error) {
      const requestDuration = Date.now() - startTime;
      
      // Log the failed usage
      await usageService.logAIUsage({
        userId: '', // Will be filled by the service
        projectId: request.projectId,
        provider: request.provider,
        model: request.model,
        inputTokens: 0,
        outputTokens: 0,
        estimatedCost: 0,
        requestDuration,
        status: error instanceof Error && error.message.includes('quota') ? 'quota_exceeded' : 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  async streamRequest(
    request: AIRequest,
    onChunk: (chunk: string) => void,
    onComplete: (response: AIResponse) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Pre-flight quota check
      const estimation = estimateAIUsage(request);
      
      const quotaCheck = await usageService.checkQuotaAvailability(
        '',
        request.provider,
        'tokens',
        estimation.estimatedTokens
      );

      if (!quotaCheck.allowed) {
        throw new Error(`Quota exceeded for ${request.provider}. Resets on ${quotaCheck.resetDate.toLocaleDateString()}`);
      }

      const response = await fetch('/api/ai/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'AI request failed');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      let fullContent = '';
      let usage: any = null;

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;

          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              if (data === '[DONE]') {
                const requestDuration = Date.now() - startTime;
                
                const finalResponse: AIResponse = {
                  content: fullContent,
                  usage: usage || {
                    inputTokens: estimation.estimatedTokens / 2,
                    outputTokens: estimation.estimatedTokens / 2,
                    totalTokens: estimation.estimatedTokens,
                    estimatedCost: estimation.estimatedCost,
                  },
                  model: request.model,
                  provider: request.provider,
                  requestDuration,
                };

                // Log successful usage
                await usageService.logAIUsage({
                  userId: '',
                  projectId: request.projectId,
                  provider: request.provider,
                  model: request.model,
                  inputTokens: finalResponse.usage.inputTokens,
                  outputTokens: finalResponse.usage.outputTokens,
                  estimatedCost: finalResponse.usage.estimatedCost,
                  requestDuration,
                  status: 'success',
                });

                onComplete(finalResponse);
                return;
              }

              try {
                const parsed = JSON.parse(data);
                
                if (parsed.content) {
                  fullContent += parsed.content;
                  onChunk(parsed.content);
                }
                
                if (parsed.usage) {
                  usage = parsed.usage;
                }
              } catch (e) {
                // Ignore parsing errors for individual chunks
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

    } catch (error) {
      const requestDuration = Date.now() - startTime;
      
      // Log failed usage
      await usageService.logAIUsage({
        userId: '',
        projectId: request.projectId,
        provider: request.provider,
        model: request.model,
        inputTokens: 0,
        outputTokens: 0,
        estimatedCost: 0,
        requestDuration,
        status: error instanceof Error && error.message.includes('quota') ? 'quota_exceeded' : 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      onError(error instanceof Error ? error : new Error('Unknown error'));
    }
  }
}

export const usageAwareAIClient = new UsageAwareAIClient();