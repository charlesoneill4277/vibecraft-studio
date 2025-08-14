import { db } from '@/lib/supabase/database';
import { aiClient, ChatMessage, ChatCompletionRequest } from './client';
import type { ChatMessage as DBChatMessage } from '@/types';

export interface ChatSession {
  id: string;
  projectId: string;
  title: string;
  messages: DBChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SendMessageRequest {
  content: string;
  projectId: string;
  providerId: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface SendMessageResponse {
  userMessage: DBChatMessage;
  assistantMessage: DBChatMessage;
}

export class ChatService {
  /**
   * Send a message and get AI response
   */
  async sendMessage(
    userId: string,
    request: SendMessageRequest & { conversationId?: string }
  ): Promise<SendMessageResponse> {
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

      // Make AI request
      const aiRequest: ChatCompletionRequest = {
        messages,
        model: request.model,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
      };

      const aiResponse = await aiClient.chatCompletion(
        request.providerId,
        aiRequest,
        userId,
        request.projectId
      );

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
        },
      });

      return {
        userMessage: this.mapDatabaseToType(userMessage),
        assistantMessage: this.mapDatabaseToType(assistantMessage),
      };
    } catch (error) {
      console.error('Error sending message:', error);
      throw new Error(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send a streaming message and get AI response
   */
  async *sendMessageStream(
    userId: string,
    request: SendMessageRequest & { conversationId?: string }
  ): AsyncGenerator<{
    type: 'user_message' | 'assistant_delta' | 'assistant_complete';
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

      // Make streaming AI request
      const aiRequest: ChatCompletionRequest = {
        messages,
        model: request.model,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
      };

      let fullContent = '';
      let assistantMessageId: string | null = null;
      let finalUsage: any = null;

      for await (const chunk of aiClient.chatCompletionStream(
        request.providerId,
        aiRequest,
        userId,
        request.projectId
      )) {
        fullContent = chunk.content;
        
        if (chunk.usage) {
          finalUsage = chunk.usage;
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
        const finalMessage = await db.updatePrompt(assistantMessageId, {
          content: fullContent,
          metadata: {
            timestamp: new Date().toISOString(),
            usage: finalUsage,
            streaming: false,
            complete: true,
          },
        });

        yield {
          type: 'assistant_complete',
          data: this.mapDatabaseToType(finalMessage),
        };
      }
    } catch (error) {
      console.error('Error in streaming message:', error);
      throw new Error(`Failed to send streaming message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get conversation history for a project
   */
  async getConversationHistory(
    projectId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<DBChatMessage[]> {
    try {
      const messages = await db.getProjectPrompts(projectId);
      
      return messages
        .slice(offset, offset + limit)
        .map(this.mapDatabaseToType);
    } catch (error) {
      console.error('Error getting conversation history:', error);
      throw new Error('Failed to get conversation history');
    }
  }

  /**
   * Get recent messages for context
   */
  async getRecentMessages(
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
   * Delete a message
   */
  async deleteMessage(messageId: string): Promise<void> {
    try {
      await db.deletePrompt(messageId);
    } catch (error) {
      console.error('Error deleting message:', error);
      throw new Error('Failed to delete message');
    }
  }

  /**
   * Update a message
   */
  async updateMessage(
    messageId: string,
    content: string,
    metadata?: any
  ): Promise<DBChatMessage> {
    try {
      const updatedMessage = await db.updatePrompt(messageId, {
        content,
        metadata: {
          ...metadata,
          updatedAt: new Date().toISOString(),
        },
      });

      return this.mapDatabaseToType(updatedMessage);
    } catch (error) {
      console.error('Error updating message:', error);
      throw new Error('Failed to update message');
    }
  }

  /**
   * Rate a message
   */
  async rateMessage(
    messageId: string,
    rating: number,
    feedback?: string
  ): Promise<void> {
    try {
      const messages = await db.getProjectPrompts(''); // This needs to be fixed to get by ID
      const message = messages.find(m => m.id === messageId);
      
      if (!message) {
        throw new Error('Message not found');
      }

      await db.updatePrompt(messageId, {
        metadata: {
          ...message.metadata,
          rating,
          feedback,
          ratedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error rating message:', error);
      throw new Error('Failed to rate message');
    }
  }

  /**
   * Search messages in a project
   */
  async searchMessages(
    projectId: string,
    query: string,
    limit: number = 20
  ): Promise<DBChatMessage[]> {
    try {
      const messages = await db.getProjectPrompts(projectId);
      
      // Simple text search - in production, you'd want full-text search
      const filteredMessages = messages.filter(message =>
        message.content.toLowerCase().includes(query.toLowerCase())
      );

      return filteredMessages
        .slice(0, limit)
        .map(this.mapDatabaseToType);
    } catch (error) {
      console.error('Error searching messages:', error);
      throw new Error('Failed to search messages');
    }
  }

  /**
   * Get message statistics for a project
   */
  async getMessageStats(projectId: string): Promise<{
    totalMessages: number;
    userMessages: number;
    assistantMessages: number;
    totalTokens: number;
    totalCost: number;
    averageResponseTime: number;
  }> {
    try {
      const messages = await db.getProjectPrompts(projectId);
      
      const stats = {
        totalMessages: messages.length,
        userMessages: messages.filter(m => m.role === 'user').length,
        assistantMessages: messages.filter(m => m.role === 'assistant').length,
        totalTokens: 0,
        totalCost: 0,
        averageResponseTime: 0,
      };

      let totalResponseTime = 0;
      let responseCount = 0;

      messages.forEach(message => {
        const metadata = message.metadata as any;
        if (metadata?.usage) {
          stats.totalTokens += metadata.usage.totalTokens || 0;
          stats.totalCost += metadata.usage.cost || 0;
        }
        if (metadata?.responseTime) {
          totalResponseTime += metadata.responseTime;
          responseCount++;
        }
      });

      if (responseCount > 0) {
        stats.averageResponseTime = totalResponseTime / responseCount;
      }

      return stats;
    } catch (error) {
      console.error('Error getting message stats:', error);
      throw new Error('Failed to get message statistics');
    }
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
export const chatService = new ChatService();