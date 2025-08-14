'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Send, Square, Settings } from 'lucide-react';
import { AIProvider } from '@/types';
import { getProviderConfig } from '@/lib/ai/providers';

interface ChatInputProps {
  onSendMessage: (content: string, options?: {
    providerId?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }) => Promise<void>;
  onSendMessageStream: (content: string, options?: {
    providerId?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }) => Promise<void>;
  onAbortStream: () => void;
  providers: AIProvider[];
  isLoading?: boolean;
  isStreaming?: boolean;
  disabled?: boolean;
  placeholder?: string;
  defaultProviderId?: string;
  defaultModel?: string;
}

export function ChatInput({
  onSendMessage,
  onSendMessageStream,
  onAbortStream,
  providers,
  isLoading = false,
  isStreaming = false,
  disabled = false,
  placeholder = "Type your message...",
  defaultProviderId,
  defaultModel,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [selectedProviderId, setSelectedProviderId] = useState(
    defaultProviderId || providers.find(p => p.isActive)?.id || ''
  );
  const [selectedModel, setSelectedModel] = useState(defaultModel || '');
  const [showSettings, setShowSettings] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(4000);
  const [useStreaming, setUseStreaming] = useState(true);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selectedProvider = providers.find(p => p.id === selectedProviderId);
  const providerConfig = selectedProvider ? getProviderConfig(selectedProvider.provider) : null;
  const availableModels = providerConfig?.models || [];

  // Auto-select first model when provider changes
  const handleProviderChange = (providerId: string) => {
    setSelectedProviderId(providerId);
    const provider = providers.find(p => p.id === providerId);
    if (provider) {
      const config = getProviderConfig(provider.provider);
      setSelectedModel(config.models[0]?.id || '');
    }
  };

  const handleSend = async () => {
    if (!message.trim() || !selectedProviderId || isLoading || isStreaming) {
      return;
    }

    const options = {
      providerId: selectedProviderId,
      model: selectedModel,
      temperature,
      maxTokens,
    };

    try {
      if (useStreaming) {
        await onSendMessageStream(message.trim(), options);
      } else {
        await onSendMessage(message.trim(), options);
      }
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAbort = () => {
    onAbortStream();
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Provider and Model Selection */}
          <div className="flex gap-2">
            <Select value={selectedProviderId} onValueChange={handleProviderChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {providers.filter(p => p.isActive).map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {getProviderConfig(provider.provider).displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {availableModels.length > 0 && (
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>

          {/* Advanced Settings */}
          {showSettings && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <label className="text-sm font-medium">Temperature: {temperature}</label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Max Tokens: {maxTokens}</label>
                <input
                  type="range"
                  min="100"
                  max="8000"
                  step="100"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                  className="w-full mt-1"
                />
              </div>
              <div className="col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={useStreaming}
                    onChange={(e) => setUseStreaming(e.target.checked)}
                  />
                  <span className="text-sm">Enable streaming responses</span>
                </label>
              </div>
            </div>
          )}

          {/* Message Input */}
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled || isLoading || isStreaming}
              className="min-h-[60px] resize-none"
              rows={3}
            />
            
            {isStreaming ? (
              <Button
                onClick={handleAbort}
                variant="destructive"
                size="sm"
                className="self-end"
              >
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSend}
                disabled={!message.trim() || !selectedProviderId || isLoading || disabled}
                size="sm"
                className="self-end"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Status */}
          {(isLoading || isStreaming) && (
            <div className="text-sm text-muted-foreground">
              {isStreaming ? 'AI is responding...' : 'Sending message...'}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}