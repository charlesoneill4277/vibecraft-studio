import { db } from '@/lib/supabase/database';
import { aiAbstractionLayer, NormalizedResponse, FallbackConfig } from './abstraction-layer';
import { ChatMessage } from './client';
import type { ChatMessage as DBChatMessage } from '@/types';

export interface EnhancedSendMessageRequest {
  content: string;
  projectId: string;
  providerId: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  fallbackConfig?: Partial<FallbackConfig>;
  enableCaching?: boolean;
}

export interface EnhancedSendMessageResponse {
  userMessage: DBChatMessage;
  assistantMessage: DBChatMessage;
  metadata: {
    cached: boolean;
    fallbackUsed: boolean;
    originalProvider?: string;
    responseTime: number;
    cost: number;
  };
}

export class EnhancedChatService {
  /**
   * Send a message using the abstraction layer with fallback and caching
   */
  async sendMessage(
    userId: string,
    request: EnhancedSendMessageRequest & { conversationId?: string }
  ): Promise<EnhancedSendMessageResponse> {
    try {
      // Get or create conversation
      let conversationId = request.conversationId;
      if (!conversationId) {
        // Create a new conversation for this message
        const { conversationService } = await import('@/lib/conversations/conversation-service');
        const conversation = await conversationService.createConversation(userId, {
          projectId: request.projectId,
          title: 'New Conversation'
        });
        conversationId = conversation.id;
      }

      // Get recent conversation history for context
      const recentMessages = await this.getRecentMessages(request.projectId, 20, conversationId);
      
      // Create user message
      const userMessage = await db.createPrompt({
        project_id: request.projectId,
        conversation_id: conversationId,
        role: 'user',
        content: request.content,
        ai_provider: request.providerId,
        model: request.model,
        metadata: {
          timestamp: new Date().toISOString(),
          temperature: request.temperature,
          maxTokens: request.maxTokens,
          fallbackEnabled: request.fallbackConfig?.enabled ?? true,
          cachingEnabled: request.enableCaching ?? true,
        },
      });

      // Prepare messages for AI request
      const messages: ChatMessage[] = [];
      
      // Add system prompt if provided
      if (request.systemPrompt) {
        messages.push({
          role: 'system',
          content: request.systemPrompt,
        });
      }

      // Add conversation history
      recentMessages.forEach(msg => {
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      });

      // Add current user message
      messages.push({
        role: 'user',
        content: request.content,
      });

      // Make AI request using abstraction layer
      const aiRequest = {
        messages,
        model: request.model,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
      };

      const aiResponse = await aiAbstractionLayer.chatCompletion(
        request.providerId,
        aiRequest,
        userId,
        request.projectId,
        request.fallbackConfig
      );

      // Calculate cost
      const cost = this.calculateResponseCost(aiResponse);

      // Create assistant message
      const assistantMessage = await db.createPrompt({
        project_id: request.projectId,
        conversation_id: conversationId,
        role: 'assistant',
        content: aiResponse.content,
        ai_provider: request.providerId,
        model: aiResponse.model,
        metadata: {
          timestamp: new Date().toISOString(),
          usage: aiResponse.usage,
          finishReason: aiResponse.finishReason,
          responseId: aiResponse.id,
          cached: aiResponse.metadata.cached,
          fallbackUsed: aiResponse.metadata.fallbackUsed,
          originalProvider: aiResponse.metadata.originalProvider,
          responseTime: aiResponse.metadata.responseTime,
          cost,
        },
      });

      return {
        userMessage: this.mapDatabaseToType(userMessage),
        assistantMessage: this.mapDatabaseToType(assistantMessage),
        metadata: {
          cached: aiResponse.metadata.cached,
          fallbackUsed: aiResponse.metadata.fallbackUsed,
          originalProvider: aiResponse.metadata.originalProvider,
          responseTime: aiResponse.metadata.responseTime,
          cost,
        },
      };
    } catch (error) {
      console.error('Error sending enhanced message:', error);
      throw new Error(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send a streaming message using the abstraction layer with fallback
   */
  async *sendMessageStream(
    userId: string,
    request: EnhancedSendMessageRequest & { conversationId?: string }
  ): AsyncGenerator<{
    type: 'user_message' | 'assistant_delta' | 'assistant_complete' | 'fallback_notice';
    data: any;
  }, void, unknown> {
    try {
      // Get or create conversation
      let conversationId = request.conversationId;
      if (!conversationId) {
        // Create a new conversation for this message
        const { conversationService } = await import('@/lib/conversations/conversation-service');
        const conversation = await conversationService.createConversation(userId, {
          projectId: request.projectId,
          title: 'New Conversation'
        });
        conversationId = conversation.id;
      }

      // Get recent conversation history for context
      const recentMessages = await this.getRecentMessages(request.projectId, 20, conversationId);
      
      // Create user message
      const userMessage = await db.createPrompt({
        project_id: request.projectId,
        conversation_id: conversationId,
        role: 'user',
        content: request.content,
        ai_provider: request.providerId,
        model: request.model,
        metadata: {
          timestamp: new Date().toISOString(),
          temperature: request.temperature,
          maxTokens: request.maxTokens,
          fallbackEnabled: request.fallbackConfig?.enabled ?? true,
        },
      });

      yield {
        type: 'user_message',
        data: this.mapDatabaseToType(userMessage),
      };

      // Prepare messages for AI request
      const messages: ChatMessage[] = [];
      
      // Add system prompt if provided
      if (request.systemPrompt) {
        messages.push({
          role: 'system',
          content: request.systemPrompt,
        });
      }

      // Add conversation history
      recentMessages.forEach(msg => {
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      });

      // Add current user message
      messages.push({
        role: 'user',
        content: request.content,
      });

      // Make streaming AI request using abstraction layer
      const aiRequest = {
        messages,
        model: request.model,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
      };

      let fullContent = '';
      let assistantMessageId: string | null = null;
      let finalUsage: any = null;
      let fallbackNotified = false;

      for await (const chunk of aiAbstractionLayer.chatCompletionStream(
        request.providerId,
        aiRequest,
        userId,
        request.projectId,
        request.fallbackConfig
      )) {
        fullContent = chunk.content;
        
        if (chunk.usage) {
          finalUsage = chunk.usage;
        }

        // Notify about fallback usage (only once)
        if (!fallbackNotified && chunk.id && chunk.id.includes('fallback')) {
          yield {
            type: 'fallback_notice',
            data: {
              message: 'Primary provider failed, using fallback provider',
              fallbackProvider: 'unknown', // Could be enhanced to include actual provider
            },
          };
          fallbackNotified = true;
        }

        yield {
          type: 'assistant_delta',
          data: {
            id: chunk.id,
            content: chunk.content,
            delta: chunk.delta,
            done: chunk.done,
          },
        };

        // Create or update assistant message on first chunk
        if (!assistantMessageId && chunk.content) {
          const assistantMessage = await db.createPrompt({
            project_id: request.projectId,
            conversation_id: conversationId,
            role: 'assistant',
            content: chunk.content,
            ai_provider: request.providerId,
            model: request.model || 'unknown',
            metadata: {
              timestamp: new Date().toISOString(),
              responseId: chunk.id,
              streaming: true,
            },
          });
          assistantMessageId = assistantMessage.id;
        } else if (assistantMessageId) {
          // Update the message with new content
          await db.updatePrompt(assistantMessageId, {
            content: fullContent,
            metadata: {
              timestamp: new Date().toISOString(),
              responseId: chunk.id,
              streaming: true,
              usage: finalUsage,
            },
          });
        }
      }

      // Final update with complete metadata
      if (assistantMessageId && finalUsage) {
        const cost = this.calculateUsageCost(finalUsage);
        
        const finalMessage = await db.updatePrompt(assistantMessageId, {
          content: fullContent,
          metadata: {
            timestamp: new Date().toISOString(),
            usage: finalUsage,
            streaming: false,
            complete: true,
            cost,
          },
        });

        yield {
          type: 'assistant_complete',
          data: this.mapDatabaseToType(finalMessage),
        };
      }
    } catch (error) {
      console.error('Error in enhanced streaming message:', error);
      throw new Error(`Failed to send streaming message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get provider health status
   */
  async getProviderHealth(): Promise<{
    [provider: string]: {
      available: boolean;
      responseTime?: number;
      lastChecked: Date;
    };
  }> {
    const providers = ['openai', 'anthropic', 'straico', 'cohere'];
    const health: any = {};

    for (const provider of providers) {
      const startTime = Date.now();
      try {
        const adapter = (aiAbstractionLayer as any).adapters.get(provider);
        const available = adapter ? await adapter.isAvailable() : false;
        const responseTime = Date.now() - startTime;
        
        health[provider] = {
          available,
          responseTime,
          lastChecked: new Date(),
        };
      } catch (error) {
        health[provider] = {
          available: false,
          lastChecked: new Date(),
        };
      }
    }

    return health;
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return aiAbstractionLayer.getCacheStats();
  }

  /**
   * Clear response cache
   */
  clearCache(): void {
    aiAbstractionLayer.clearCache();
  }

  /**
   * Get recent messages for context
   */
  private async getRecentMessages(
    projectId: string,
    limit: number = 10,
    conversationId?: string
  ): Promise<DBChatMessage[]> {
    try {
      if (conversationId) {
        // Get messages from specific conversation
        const messages = await db.getConversationPrompts(conversationId);
        return messages
          .slice(-limit)
          .map(this.mapDatabaseToType);
      } else {
        // Fallback to project-wide messages
        const messages = await db.getProjectPrompts(projectId);
        return messages
          .slice(-limit)
          .map(this.mapDatabaseToType);
      }
    } catch (error) {
      console.error('Error getting recent messages:', error);
      return [];
    }
  }

  /**
   * Calculate cost from normalized response
   */
  private calculateResponseCost(response: NormalizedResponse): number {
    // This would use the actual provider pricing
    // For now, using simplified calculation
    const inputCost = (response.usage.promptTokens / 1000) * 0.01;
    const outputCost = (response.usage.completionTokens / 1000) * 0.03;
    return inputCost + outputCost;
  }

  /**
   * Calculate cost from usage data
   */
  private calculateUsageCost(usage: any): number {
    if (!usage) return 0;
    
    const inputCost = (usage.promptTokens / 1000) * 0.01;
    const outputCost = (usage.completionTokens / 1000) * 0.03;
    return inputCost + outputCost;
  }

  /**
   * Map database row to TypeScript type
   */
  private mapDatabaseToType(dbMessage: any): DBChatMessage {
    return {
      id: dbMessage.id,
      projectId: dbMessage.project_id,
      role: dbMessage.role as 'user' | 'assistant',
      content: dbMessage.content,
      provider: dbMessage.ai_provider || 'unknown',
      model: dbMessage.model || 'unknown',
      metadata: dbMessage.metadata || {},
      createdAt: new Date(dbMessage.created_at),
    };
  }
}

// Export singleton instance
export const enhancedChatService = new EnhancedChatService();