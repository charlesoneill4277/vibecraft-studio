import { AIProviderType, getProviderConfig, getModelConfig } from './providers';
import { aiProviderService } from './service';
import { aiUsageTracker } from './usage-tracker';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: 'stop' | 'length' | 'content_filter' | 'error';
}

export interface StreamingResponse {
  id: string;
  content: string;
  delta: string;
  done: boolean;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class UnifiedAIClient {
  private retryAttempts = 3;
  private retryDelay = 1000; // 1 second

  /**
   * Send a chat completion request to the specified provider
   */
  async chatCompletion(
    providerId: string,
    request: ChatCompletionRequest,
    userId: string,
    projectId?: string
  ): Promise<ChatCompletionResponse> {
    const provider = await aiProviderService.getProvider(providerId);
    if (!provider) {
      throw new Error('Provider not found');
    }

    if (!provider.isActive) {
      throw new Error('Provider is not active');
    }

    // Check quota before making request
    const quota = await aiUsageTracker.checkQuota(userId, provider.provider);
    if (!quota.withinLimit) {
      throw new Error('Usage quota exceeded');
    }

    const apiKey = await aiProviderService.getDecryptedApiKey(providerId);
    const model = request.model || provider.settings.defaultModel;
    const maxTokens = request.maxTokens || provider.settings.maxTokens;
    const temperature = request.temperature || provider.settings.temperature;

    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const startTime = Date.now();
        
        const response = await this.makeProviderRequest(
          provider.provider,
          apiKey,
          {
            ...request,
            model,
            maxTokens,
            temperature,
            stream: false // Non-streaming for now
          }
        );

        const endTime = Date.now();
        const duration = endTime - startTime;

        // Track usage
        await aiUsageTracker.trackUsage(
          userId,
          projectId,
          provider.provider,
          model,
          response.usage.promptTokens,
          response.usage.completionTokens,
          duration
        );

        return response;
      } catch (error) {
        lastError = error as Error;
        console.error(`AI request attempt ${attempt} failed:`, error);
        
        if (attempt < this.retryAttempts) {
          await this.delay(this.retryDelay * attempt);
        }
      }
    }

    throw new Error(`AI request failed after ${this.retryAttempts} attempts: ${lastError?.message}`);
  }

  /**
   * Send a streaming chat completion request
   */
  async *chatCompletionStream(
    providerId: string,
    request: ChatCompletionRequest,
    userId: string,
    projectId?: string
  ): AsyncGenerator<StreamingResponse, void, unknown> {
    const provider = await aiProviderService.getProvider(providerId);
    if (!provider) {
      throw new Error('Provider not found');
    }

    if (!provider.isActive) {
      throw new Error('Provider is not active');
    }

    // Check quota before making request
    const quota = await aiUsageTracker.checkQuota(userId, provider.provider);
    if (!quota.withinLimit) {
      throw new Error('Usage quota exceeded');
    }

    const apiKey = await aiProviderService.getDecryptedApiKey(providerId);
    const model = request.model || provider.settings.defaultModel;
    const maxTokens = request.maxTokens || provider.settings.maxTokens;
    const temperature = request.temperature || provider.settings.temperature;

    const startTime = Date.now();
    let totalContent = '';
    let promptTokens = 0;
    let completionTokens = 0;

    try {
      const stream = this.makeProviderStreamRequest(
        provider.provider,
        apiKey,
        {
          ...request,
          model,
          maxTokens,
          temperature,
          stream: true
        }
      );

      for await (const chunk of stream) {
        totalContent += chunk.delta;
        if (chunk.usage) {
          promptTokens = chunk.usage.promptTokens;
          completionTokens = chunk.usage.completionTokens;
        }
        yield chunk;
      }

      // Track usage after completion
      const endTime = Date.now();
      const duration = endTime - startTime;

      await aiUsageTracker.trackUsage(
        userId,
        projectId,
        provider.provider,
        model,
        promptTokens,
        completionTokens,
        duration
      );
    } catch (error) {
      console.error('Streaming request failed:', error);
      throw error;
    }
  }

  /**
   * Make a request to a specific AI provider
   */
  private async makeProviderRequest(
    provider: AIProviderType,
    apiKey: string,
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    switch (provider) {
      case 'openai':
        return this.makeOpenAIRequest(apiKey, request);
      case 'anthropic':
        return this.makeAnthropicRequest(apiKey, request);
      case 'straico':
        return this.makeStraicoRequest(apiKey, request);
      case 'cohere':
        return this.makeCohereRequest(apiKey, request);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Make a streaming request to a specific AI provider
   */
  private async *makeProviderStreamRequest(
    provider: AIProviderType,
    apiKey: string,
    request: ChatCompletionRequest
  ): AsyncGenerator<StreamingResponse, void, unknown> {
    switch (provider) {
      case 'openai':
        yield* this.makeOpenAIStreamRequest(apiKey, request);
        break;
      case 'anthropic':
        yield* this.makeAnthropicStreamRequest(apiKey, request);
        break;
      case 'straico':
        yield* this.makeStraicoStreamRequest(apiKey, request);
        break;
      case 'cohere':
        yield* this.makeCohereStreamRequest(apiKey, request);
        break;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * OpenAI API implementation
   */
  private async makeOpenAIRequest(
    apiKey: string,
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        max_tokens: request.maxTokens,
        temperature: request.temperature,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    
    return {
      id: data.id,
      content: data.choices[0].message.content,
      model: data.model,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
      finishReason: data.choices[0].finish_reason,
    };
  }

  /**
   * OpenAI streaming implementation
   */
  private async *makeOpenAIStreamRequest(
    apiKey: string,
    request: ChatCompletionRequest
  ): AsyncGenerator<StreamingResponse, void, unknown> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        max_tokens: request.maxTokens,
        temperature: request.temperature,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let content = '';

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
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices[0]?.delta?.content || '';
              content += delta;

              yield {
                id: parsed.id,
                content,
                delta,
                done: false,
                usage: parsed.usage ? {
                  promptTokens: parsed.usage.prompt_tokens,
                  completionTokens: parsed.usage.completion_tokens,
                  totalTokens: parsed.usage.total_tokens,
                } : undefined,
              };
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Anthropic API implementation (simplified)
   */
  private async makeAnthropicRequest(
    apiKey: string,
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    // Convert messages to Anthropic format
    const systemMessage = request.messages.find(m => m.role === 'system');
    const messages = request.messages.filter(m => m.role !== 'system');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: request.model,
        max_tokens: request.maxTokens,
        temperature: request.temperature,
        system: systemMessage?.content,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    
    return {
      id: data.id,
      content: data.content[0].text,
      model: data.model,
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      },
      finishReason: data.stop_reason === 'end_turn' ? 'stop' : data.stop_reason,
    };
  }

  /**
   * Anthropic streaming implementation (simplified)
   */
  private async *makeAnthropicStreamRequest(
    apiKey: string,
    request: ChatCompletionRequest
  ): AsyncGenerator<StreamingResponse, void, unknown> {
    // Simplified implementation - would need full SSE parsing
    const response = await this.makeAnthropicRequest(apiKey, { ...request, stream: false });
    
    // Simulate streaming by yielding the full response
    yield {
      id: response.id,
      content: response.content,
      delta: response.content,
      done: true,
      usage: response.usage,
    };
  }

  /**
   * Straico API implementation
   */
  private async makeStraicoRequest(
    apiKey: string,
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    // Prepare request body according to Straico v0 API spec
    const requestBody: any = {
      messages: request.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      max_tokens: request.maxTokens,
      temperature: request.temperature,
      stream: false,
    };

    // Include either model OR smart_llm_selector, not both
    if (request.model && request.model !== 'auto') {
      requestBody.model = request.model;
    } else {
      requestBody.smart_llm_selector = true;
    }

    const response = await fetch('https://api.straico.com/v0/prompt/completion', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Straico API error: ${response.status}`;
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error?.message || errorData.message || errorMessage;
      } catch {
        errorMessage += ` ${errorText}`;
      }
      
      // Handle specific error cases
      if (response.status === 401) {
        throw new Error('Invalid API key format or unauthorized access');
      } else if (response.status === 403) {
        throw new Error('API key does not have permission to access this resource');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later');
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    // Handle Straico response format
    const content = data.completion?.choices?.[0]?.message?.content || 
                   data.choices?.[0]?.message?.content || 
                   data.completion || 
                   data.response || 
                   '';
    
    const usage = data.usage || data.completion?.usage || {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0
    };
    
    return {
      id: data.id || `straico-${Date.now()}`,
      content,
      model: data.model || request.model || 'unknown',
      usage: {
        promptTokens: usage.prompt_tokens || 0,
        completionTokens: usage.completion_tokens || 0,
        totalTokens: usage.total_tokens || usage.prompt_tokens + usage.completion_tokens || 0,
      },
      finishReason: data.finish_reason || data.completion?.choices?.[0]?.finish_reason || 'stop',
    };
  }

  private async *makeStraicoStreamRequest(
    apiKey: string,
    request: ChatCompletionRequest
  ): AsyncGenerator<StreamingResponse, void, unknown> {
    // Prepare request body according to Straico v0 API spec
    const requestBody: any = {
      messages: request.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      max_tokens: request.maxTokens,
      temperature: request.temperature,
      stream: true,
    };

    // Include either model OR smart_llm_selector, not both
    if (request.model && request.model !== 'auto') {
      requestBody.model = request.model;
    } else {
      requestBody.smart_llm_selector = true;
    }

    const response = await fetch('https://api.straico.com/v0/prompt/completion', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Straico API error: ${response.status}`;
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error?.message || errorData.message || errorMessage;
      } catch {
        errorMessage += ` ${errorText}`;
      }
      
      if (response.status === 401) {
        throw new Error('Invalid API key format or unauthorized access');
      } else if (response.status === 403) {
        throw new Error('API key does not have permission to access this resource');
      }
      
      throw new Error(errorMessage);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let content = '';

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
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content || 
                           parsed.completion?.choices?.[0]?.delta?.content || 
                           parsed.delta || 
                           '';
              
              content += delta;

              yield {
                id: parsed.id || `straico-${Date.now()}`,
                content,
                delta,
                done: false,
                usage: parsed.usage ? {
                  promptTokens: parsed.usage.prompt_tokens || 0,
                  completionTokens: parsed.usage.completion_tokens || 0,
                  totalTokens: parsed.usage.total_tokens || 0,
                } : undefined,
              };
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }



  private async makeCohereRequest(
    apiKey: string,
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    throw new Error('Cohere implementation not yet available');
  }

  private async *makeCohereStreamRequest(
    apiKey: string,
    request: ChatCompletionRequest
  ): AsyncGenerator<StreamingResponse, void, unknown> {
    throw new Error('Cohere streaming implementation not yet available');
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const aiClient = new UnifiedAIClient();