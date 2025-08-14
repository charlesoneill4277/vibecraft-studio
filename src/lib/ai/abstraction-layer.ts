import { AIProviderType, getProviderConfig } from './providers';
import { aiProviderService } from './service';
import { aiUsageTracker } from './usage-tracker';
import { ChatMessage, ChatCompletionRequest, ChatCompletionResponse, StreamingResponse } from './client';

export interface NormalizedRequest {
  messages: ChatMessage[];
  model: string;
  maxTokens: number;
  temperature: number;
  stream: boolean;
  userId: string;
  projectId?: string;
}

export interface NormalizedResponse {
  id: string;
  content: string;
  model: string;
  provider: AIProviderType;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: 'stop' | 'length' | 'content_filter' | 'error';
  metadata: {
    requestId: string;
    responseTime: number;
    cached: boolean;
    fallbackUsed: boolean;
    originalProvider?: AIProviderType;
  };
}

export interface ProviderAdapter {
  provider: AIProviderType;
  isAvailable(): Promise<boolean>;
  normalizeRequest(request: NormalizedRequest): any;
  normalizeResponse(response: any, requestId: string, responseTime: number): NormalizedResponse;
  makeRequest(normalizedRequest: any, apiKey: string): Promise<any>;
  makeStreamRequest(normalizedRequest: any, apiKey: string): AsyncGenerator<any, void, unknown>;
}

export interface CacheEntry {
  key: string;
  response: NormalizedResponse;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

export interface FallbackConfig {
  enabled: boolean;
  maxRetries: number;
  retryDelay: number;
  fallbackOrder: AIProviderType[];
  skipProviders: AIProviderType[];
}

export class AIProviderAbstractionLayer {
  private cache = new Map<string, CacheEntry>();
  private adapters = new Map<AIProviderType, ProviderAdapter>();
  private defaultFallbackConfig: FallbackConfig = {
    enabled: true,
    maxRetries: 3,
    retryDelay: 1000,
    fallbackOrder: ['openai', 'anthropic', 'straico', 'cohere'],
    skipProviders: [],
  };

  constructor() {
    this.initializeAdapters();
    this.startCacheCleanup();
  }

  /**
   * Initialize provider adapters
   */
  private initializeAdapters() {
    this.adapters.set('openai', new OpenAIAdapter());
    this.adapters.set('anthropic', new AnthropicAdapter());
    this.adapters.set('straico', new StraicoAdapter());
    this.adapters.set('cohere', new CohereAdapter());
  }

  /**
   * Send a chat completion request with fallback and caching
   */
  async chatCompletion(
    providerId: string,
    request: ChatCompletionRequest,
    userId: string,
    projectId?: string,
    fallbackConfig?: Partial<FallbackConfig>
  ): Promise<NormalizedResponse> {
    const config = { ...this.defaultFallbackConfig, ...fallbackConfig };
    const normalizedRequest: NormalizedRequest = {
      ...request,
      userId,
      projectId,
      stream: false,
    };

    // Generate cache key
    const cacheKey = this.generateCacheKey(normalizedRequest, providerId);
    
    // Check cache first
    const cachedResponse = this.getFromCache(cacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Get primary provider
    const primaryProvider = await aiProviderService.getProvider(providerId);
    if (!primaryProvider) {
      throw new Error('Provider not found');
    }

    const providers = config.enabled 
      ? await this.buildFallbackChain(primaryProvider.provider, config)
      : [primaryProvider.provider];

    let lastError: Error | null = null;
    let fallbackUsed = false;
    let originalProvider = primaryProvider.provider;

    for (let i = 0; i < providers.length; i++) {
      const providerType = providers[i];
      const adapter = this.adapters.get(providerType);
      
      if (!adapter) {
        console.warn(`No adapter found for provider: ${providerType}`);
        continue;
      }

      try {
        // Check if provider is available
        const isAvailable = await adapter.isAvailable();
        if (!isAvailable) {
          throw new Error(`Provider ${providerType} is not available`);
        }

        // Get provider configuration
        const provider = i === 0 
          ? primaryProvider 
          : await this.getAlternativeProvider(providerType, userId);

        if (!provider) {
          throw new Error(`No configuration found for provider: ${providerType}`);
        }

        const apiKey = await aiProviderService.getDecryptedApiKey(provider.id);
        const startTime = Date.now();

        // Normalize request for this provider
        const normalizedReq = adapter.normalizeRequest({
          ...normalizedRequest,
          model: provider.settings.defaultModel,
          maxTokens: provider.settings.maxTokens,
          temperature: provider.settings.temperature,
        });

        // Make request
        const response = await adapter.makeRequest(normalizedReq, apiKey);
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        // Normalize response
        const normalizedResponse = adapter.normalizeResponse(
          response,
          `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          responseTime
        );

        // Add metadata
        normalizedResponse.metadata.fallbackUsed = fallbackUsed;
        normalizedResponse.metadata.originalProvider = originalProvider;

        // Track usage
        await aiUsageTracker.trackUsage(
          userId,
          projectId,
          providerType,
          normalizedResponse.model,
          normalizedResponse.usage.promptTokens,
          normalizedResponse.usage.completionTokens,
          responseTime
        );

        // Cache the response
        this.addToCache(cacheKey, normalizedResponse);

        return normalizedResponse;
      } catch (error) {
        lastError = error as Error;
        console.error(`Provider ${providerType} failed:`, error);
        
        if (i === 0) {
          fallbackUsed = true;
        }

        // Wait before trying next provider
        if (i < providers.length - 1) {
          await this.delay(config.retryDelay * (i + 1));
        }
      }
    }

    throw new Error(`All providers failed. Last error: ${lastError?.message}`);
  }

  /**
   * Send a streaming chat completion request with fallback
   */
  async *chatCompletionStream(
    providerId: string,
    request: ChatCompletionRequest,
    userId: string,
    projectId?: string,
    fallbackConfig?: Partial<FallbackConfig>
  ): AsyncGenerator<StreamingResponse, void, unknown> {
    const config = { ...this.defaultFallbackConfig, ...fallbackConfig };
    const normalizedRequest: NormalizedRequest = {
      ...request,
      userId,
      projectId,
      stream: true,
    };

    // Get primary provider
    const primaryProvider = await aiProviderService.getProvider(providerId);
    if (!primaryProvider) {
      throw new Error('Provider not found');
    }

    const providers = config.enabled 
      ? await this.buildFallbackChain(primaryProvider.provider, config)
      : [primaryProvider.provider];

    let lastError: Error | null = null;

    for (let i = 0; i < providers.length; i++) {
      const providerType = providers[i];
      const adapter = this.adapters.get(providerType);
      
      if (!adapter) {
        console.warn(`No adapter found for provider: ${providerType}`);
        continue;
      }

      try {
        // Check if provider is available
        const isAvailable = await adapter.isAvailable();
        if (!isAvailable) {
          throw new Error(`Provider ${providerType} is not available`);
        }

        // Get provider configuration
        const provider = i === 0 
          ? primaryProvider 
          : await this.getAlternativeProvider(providerType, userId);

        if (!provider) {
          throw new Error(`No configuration found for provider: ${providerType}`);
        }

        const apiKey = await aiProviderService.getDecryptedApiKey(provider.id);
        const startTime = Date.now();

        // Normalize request for this provider
        const normalizedReq = adapter.normalizeRequest({
          ...normalizedRequest,
          model: provider.settings.defaultModel,
          maxTokens: provider.settings.maxTokens,
          temperature: provider.settings.temperature,
        });

        // Make streaming request
        let totalContent = '';
        let promptTokens = 0;
        let completionTokens = 0;

        for await (const chunk of adapter.makeStreamRequest(normalizedReq, apiKey)) {
          const streamResponse: StreamingResponse = {
            id: chunk.id || `stream_${Date.now()}`,
            content: chunk.content || totalContent,
            delta: chunk.delta || '',
            done: chunk.done || false,
            usage: chunk.usage,
          };

          totalContent += streamResponse.delta;
          if (streamResponse.usage) {
            promptTokens = streamResponse.usage.promptTokens;
            completionTokens = streamResponse.usage.completionTokens;
          }

          yield streamResponse;
        }

        // Track usage after completion
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        await aiUsageTracker.trackUsage(
          userId,
          projectId,
          providerType,
          provider.settings.defaultModel,
          promptTokens,
          completionTokens,
          responseTime
        );

        return; // Success, exit the loop
      } catch (error) {
        lastError = error as Error;
        console.error(`Streaming provider ${providerType} failed:`, error);
        
        // Wait before trying next provider
        if (i < providers.length - 1) {
          await this.delay(config.retryDelay * (i + 1));
        }
      }
    }

    throw new Error(`All streaming providers failed. Last error: ${lastError?.message}`);
  }

  /**
   * Build fallback chain based on configuration
   */
  private async buildFallbackChain(
    primaryProvider: AIProviderType,
    config: FallbackConfig
  ): Promise<AIProviderType[]> {
    const chain = [primaryProvider];
    
    for (const provider of config.fallbackOrder) {
      if (provider !== primaryProvider && !config.skipProviders.includes(provider)) {
        chain.push(provider);
      }
    }

    return chain.slice(0, config.maxRetries + 1);
  }

  /**
   * Get alternative provider configuration
   */
  private async getAlternativeProvider(
    providerType: AIProviderType,
    userId: string
  ) {
    const providers = await aiProviderService.getProviders(userId);
    return providers.find(p => p.provider === providerType && p.isActive);
  }

  /**
   * Generate cache key for request
   */
  private generateCacheKey(request: NormalizedRequest, providerId: string): string {
    const keyData = {
      messages: request.messages.map(m => ({ role: m.role, content: m.content })),
      model: request.model,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
      providerId,
    };
    
    return `chat_${this.hashObject(keyData)}`;
  }

  /**
   * Hash object for cache key generation
   */
  private hashObject(obj: any): string {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get response from cache
   */
  private getFromCache(key: string): NormalizedResponse | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = now;

    // Mark as cached
    const response = { ...entry.response };
    response.metadata.cached = true;

    return response;
  }

  /**
   * Add response to cache
   */
  private addToCache(key: string, response: NormalizedResponse, ttl: number = 300000): void {
    // Don't cache error responses
    if (response.finishReason === 'error') return;

    const entry: CacheEntry = {
      key,
      response: { ...response },
      timestamp: Date.now(),
      ttl,
      accessCount: 0,
      lastAccessed: Date.now(),
    };

    this.cache.set(key, entry);

    // Limit cache size
    if (this.cache.size > 1000) {
      this.evictOldestEntries(100);
    }
  }

  /**
   * Evict oldest cache entries
   */
  private evictOldestEntries(count: number): void {
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed)
      .slice(0, count);

    for (const [key] of entries) {
      this.cache.delete(key);
    }
  }

  /**
   * Start cache cleanup interval
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          this.cache.delete(key);
        }
      }
    }, 60000); // Clean every minute
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
    totalEntries: number;
    averageAge: number;
  } {
    const entries = Array.from(this.cache.values());
    const now = Date.now();
    
    const totalAccess = entries.reduce((sum, entry) => sum + entry.accessCount, 0);
    const totalHits = entries.reduce((sum, entry) => sum + Math.max(0, entry.accessCount - 1), 0);
    const averageAge = entries.length > 0 
      ? entries.reduce((sum, entry) => sum + (now - entry.timestamp), 0) / entries.length
      : 0;

    return {
      size: this.cache.size,
      hitRate: totalAccess > 0 ? totalHits / totalAccess : 0,
      totalEntries: entries.length,
      averageAge: averageAge / 1000, // Convert to seconds
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Provider Adapters
class OpenAIAdapter implements ProviderAdapter {
  provider: AIProviderType = 'openai';

  async isAvailable(): Promise<boolean> {
    try {
      // Simple health check - could be enhanced with actual API ping
      return true;
    } catch {
      return false;
    }
  }

  normalizeRequest(request: NormalizedRequest): any {
    return {
      model: request.model,
      messages: request.messages,
      max_tokens: request.maxTokens,
      temperature: request.temperature,
      stream: request.stream,
    };
  }

  normalizeResponse(response: any, requestId: string, responseTime: number): NormalizedResponse {
    return {
      id: response.id,
      content: response.choices[0].message.content,
      model: response.model,
      provider: 'openai',
      usage: {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      },
      finishReason: response.choices[0].finish_reason,
      metadata: {
        requestId,
        responseTime,
        cached: false,
        fallbackUsed: false,
      },
    };
  }

  async makeRequest(normalizedRequest: any, apiKey: string): Promise<any> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(normalizedRequest),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }

    return response.json();
  }

  async *makeStreamRequest(normalizedRequest: any, apiKey: string): AsyncGenerator<any, void, unknown> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...normalizedRequest, stream: true }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

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
            if (data === '[DONE]') return;

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices[0]?.delta?.content || '';
              content += delta;

              yield {
                id: parsed.id,
                content,
                delta,
                done: false,
                usage: parsed.usage,
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
}

class AnthropicAdapter implements ProviderAdapter {
  provider: AIProviderType = 'anthropic';

  async isAvailable(): Promise<boolean> {
    return true;
  }

  normalizeRequest(request: NormalizedRequest): any {
    const systemMessage = request.messages.find(m => m.role === 'system');
    const messages = request.messages.filter(m => m.role !== 'system');

    return {
      model: request.model,
      max_tokens: request.maxTokens,
      temperature: request.temperature,
      system: systemMessage?.content,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    };
  }

  normalizeResponse(response: any, requestId: string, responseTime: number): NormalizedResponse {
    return {
      id: response.id,
      content: response.content[0].text,
      model: response.model,
      provider: 'anthropic',
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
      finishReason: response.stop_reason === 'end_turn' ? 'stop' : response.stop_reason,
      metadata: {
        requestId,
        responseTime,
        cached: false,
        fallbackUsed: false,
      },
    };
  }

  async makeRequest(normalizedRequest: any, apiKey: string): Promise<any> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(normalizedRequest),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${error}`);
    }

    return response.json();
  }

  async *makeStreamRequest(normalizedRequest: any, apiKey: string): AsyncGenerator<any, void, unknown> {
    // Simplified implementation - would need full SSE parsing for Anthropic
    const response = await this.makeRequest(normalizedRequest, apiKey);
    
    yield {
      id: response.id,
      content: response.content[0].text,
      delta: response.content[0].text,
      done: true,
      usage: response.usage,
    };
  }
}

class StraicoAdapter implements ProviderAdapter {
  provider: AIProviderType = 'straico';

  async isAvailable(): Promise<boolean> {
    return false; // Not implemented yet
  }

  normalizeRequest(request: NormalizedRequest): any {
    throw new Error('Straico adapter not implemented');
  }

  normalizeResponse(response: any, requestId: string, responseTime: number): NormalizedResponse {
    throw new Error('Straico adapter not implemented');
  }

  async makeRequest(normalizedRequest: any, apiKey: string): Promise<any> {
    throw new Error('Straico adapter not implemented');
  }

  async *makeStreamRequest(normalizedRequest: any, apiKey: string): AsyncGenerator<any, void, unknown> {
    throw new Error('Straico adapter not implemented');
  }
}

class CohereAdapter implements ProviderAdapter {
  provider: AIProviderType = 'cohere';

  async isAvailable(): Promise<boolean> {
    return false; // Not implemented yet
  }

  normalizeRequest(request: NormalizedRequest): any {
    throw new Error('Cohere adapter not implemented');
  }

  normalizeResponse(response: any, requestId: string, responseTime: number): NormalizedResponse {
    throw new Error('Cohere adapter not implemented');
  }

  async makeRequest(normalizedRequest: any, apiKey: string): Promise<any> {
    throw new Error('Cohere adapter not implemented');
  }

  async *makeStreamRequest(normalizedRequest: any, apiKey: string): AsyncGenerator<any, void, unknown> {
    throw new Error('Cohere adapter not implemented');
  }
}

// Export singleton instance
export const aiAbstractionLayer = new AIProviderAbstractionLayer();