'use client';

import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, AlertCircle, MessageSquare, Trash2 } from 'lucide-react';
import { ChatMessage } from './chat-message';
import { ChatInput } from './chat-input';
import { useChat } from '@/hooks/use-chat';
import { useAIProviders } from '@/hooks/use-ai-providers';

interface ChatInterfaceProps {
  projectId: string;
  systemPrompt?: string;
  className?: string;
}

export function ChatInterface({ 
  projectId, 
  systemPrompt,
  className 
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { providers, loading: providersLoading } = useAIProviders();
  const {
    messages,
    isLoading,
    isStreaming,
    error,
    stats,
    sendMessage,
    sendMessageStream,
    deleteMessage,
    rateMessage,
    clearMessages,
    refreshHistory,
    abortStream,
  } = useChat({
    projectId,
    systemPrompt,
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (
    content: string,
    options?: {
      providerId?: string;
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ) => {
    await sendMessage(content, { ...options, systemPrompt });
  };

  const handleSendMessageStream = async (
    content: string,
    options?: {
      providerId?: string;
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ) => {
    await sendMessageStream(content, { ...options, systemPrompt });
  };

  const handleClearMessages = () => {
    if (confirm('Are you sure you want to clear all messages? This action cannot be undone.')) {
      clearMessages();
    }
  };

  if (providersLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const activeProviders = providers.filter(p => p.isActive);

  if (activeProviders.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            AI Chat
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No active AI providers found. Please configure at least one AI provider to start chatting.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            AI Chat
            {stats && (
              <span className="text-sm font-normal text-muted-foreground">
                ({stats.totalMessages} messages)
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshHistory}
              disabled={isLoading}
            >
              Refresh
            </Button>
            {messages.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearMessages}
                disabled={isLoading || isStreaming}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {error && (
          <div className="p-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="h-[500px] px-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No messages yet. Start a conversation!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onDelete={deleteMessage}
                  onRate={rateMessage}
                  isStreaming={isStreaming && message.metadata?.streaming}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t">
          <ChatInput
            onSendMessage={handleSendMessage}
            onSendMessageStream={handleSendMessageStream}
            onAbortStream={abortStream}
            providers={activeProviders}
            isLoading={isLoading}
            isStreaming={isStreaming}
            placeholder="Ask me anything about your project..."
          />
        </div>

        {/* Stats */}
        {stats && (
          <div className="px-4 pb-4">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{stats.totalTokens.toLocaleString()} tokens used</span>
              <span>${stats.totalCost.toFixed(4)} total cost</span>
              {stats.averageResponseTime > 0 && (
                <span>{Math.round(stats.averageResponseTime)}ms avg response</span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}