'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { 
  Loader2, 
  AlertCircle, 
  MessageSquare, 
  Trash2, 
  Settings,
  Zap,
  Shield,
  Clock,
  Database
} from 'lucide-react';
import { ChatMessage } from './chat-message';
import { ChatInput } from './chat-input';
import { useEnhancedChat } from '@/hooks/use-enhanced-chat';
import { useAIProviders } from '@/hooks/use-ai-providers';

interface EnhancedChatInterfaceProps {
  projectId: string;
  systemPrompt?: string;
  className?: string;
}

export function EnhancedChatInterface({ 
  projectId, 
  systemPrompt,
  className 
}: EnhancedChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [fallbackEnabled, setFallbackEnabled] = useState(true);
  const [cachingEnabled, setCachingEnabled] = useState(true);
  const [maxRetries, setMaxRetries] = useState(3);
  const [retryDelay, setRetryDelay] = useState(1000);
  
  const { providers, loading: providersLoading } = useAIProviders();
  const {
    messages,
    isLoading,
    isStreaming,
    error,
    stats,
    health,
    cacheStats,
    sendMessage,
    sendMessageStream,
    deleteMessage,
    rateMessage,
    clearMessages,
    refreshHistory,
    refreshHealth,
    clearCache,
    abortStream,
  } = useEnhancedChat({
    projectId,
    systemPrompt,
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Refresh health status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      refreshHealth();
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [refreshHealth]);

  const handleSendMessage = async (
    content: string,
    options?: {
      providerId?: string;
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ) => {
    const fallbackConfig = {
      enabled: fallbackEnabled,
      maxRetries,
      retryDelay,
      fallbackOrder: ['openai', 'anthropic', 'straico', 'cohere'] as const,
      skipProviders: [] as const,
    };

    await sendMessage(content, { 
      ...options, 
      systemPrompt,
      fallbackConfig,
      enableCaching: cachingEnabled,
    });
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
    const fallbackConfig = {
      enabled: fallbackEnabled,
      maxRetries,
      retryDelay,
      fallbackOrder: ['openai', 'anthropic', 'straico', 'cohere'] as const,
      skipProviders: [] as const,
    };

    await sendMessageStream(content, { 
      ...options, 
      systemPrompt,
      fallbackConfig,
    });
  };

  const handleClearMessages = () => {
    if (confirm('Are you sure you want to clear all messages? This action cannot be undone.')) {
      clearMessages();
    }
  };

  const handleClearCache = async () => {
    if (confirm('Are you sure you want to clear the response cache?')) {
      await clearCache();
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
            Enhanced AI Chat
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
            Enhanced AI Chat
            <Badge variant="secondary" className="text-xs">
              <Zap className="h-3 w-3 mr-1" />
              Fallback & Caching
            </Badge>
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
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            >
              <Settings className="h-4 w-4" />
            </Button>
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

        {/* Advanced Settings */}
        {showAdvancedSettings && (
          <div className="mt-4 p-4 bg-muted rounded-lg space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <Switch
                    checked={fallbackEnabled}
                    onCheckedChange={setFallbackEnabled}
                  />
                  <span className="text-sm font-medium">Enable Fallback</span>
                </label>
                <p className="text-xs text-muted-foreground">
                  Automatically try alternative providers if primary fails
                </p>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <Switch
                    checked={cachingEnabled}
                    onCheckedChange={setCachingEnabled}
                  />
                  <span className="text-sm font-medium">Enable Caching</span>
                </label>
                <p className="text-xs text-muted-foreground">
                  Cache responses to reduce costs and improve speed
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Max Retries: {maxRetries}</label>
                <Slider
                  value={[maxRetries]}
                  onValueChange={([value]) => setMaxRetries(value)}
                  max={5}
                  min={1}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Retry Delay: {retryDelay}ms</label>
                <Slider
                  value={[retryDelay]}
                  onValueChange={([value]) => setRetryDelay(value)}
                  max={5000}
                  min={500}
                  step={500}
                />
              </div>
            </div>
          </div>
        )}

        {/* Status Indicators */}
        <div className="flex items-center gap-4 mt-4">
          {health && (
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">
                {Object.values(health).filter(h => h.available).length}/{Object.keys(health).length} providers online
              </span>
            </div>
          )}
          
          {cacheStats && (
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">
                {cacheStats.size} cached • {(cacheStats.hitRate * 100).toFixed(1)}% hit rate
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearCache}
                className="h-6 px-2 text-xs"
              >
                Clear
              </Button>
            </div>
          )}
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
                <p className="text-xs mt-2">
                  Enhanced with fallback providers and response caching
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {messages.map((message) => (
                <div key={message.id}>
                  <ChatMessage
                    message={message}
                    onDelete={deleteMessage}
                    onRate={rateMessage}
                    isStreaming={isStreaming && message.metadata?.streaming}
                  />
                  
                  {/* Enhanced metadata */}
                  {message.metadata?.cached && (
                    <div className="flex justify-center mb-2">
                      <Badge variant="outline" className="text-xs">
                        <Database className="h-3 w-3 mr-1" />
                        Cached Response
                      </Badge>
                    </div>
                  )}
                  
                  {message.metadata?.fallbackUsed && (
                    <div className="flex justify-center mb-2">
                      <Badge variant="outline" className="text-xs">
                        <Shield className="h-3 w-3 mr-1" />
                        Fallback Used
                      </Badge>
                    </div>
                  )}
                </div>
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

        {/* Enhanced Stats */}
        {stats && (
          <div className="px-4 pb-4">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{stats.totalTokens.toLocaleString()} tokens used</span>
              <span>${stats.totalCost.toFixed(4)} total cost</span>
              {stats.averageResponseTime > 0 && (
                <span>
                  <Clock className="h-3 w-3 inline mr-1" />
                  {Math.round(stats.averageResponseTime)}ms avg
                </span>
              )}
              {cacheStats && cacheStats.size > 0 && (
                <span>
                  <Database className="h-3 w-3 inline mr-1" />
                  {cacheStats.size} cached responses
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}