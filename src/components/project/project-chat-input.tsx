'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Send, 
  Square, 
  Settings, 
  Paperclip, 
  Mic, 
  Smile,
  Zap,
  Brain,
  Code,
  FileText
} from 'lucide-react'
import { AIProvider } from '@/types'
import { Project } from '@/hooks/use-projects'
import { getProviderConfig } from '@/lib/ai/providers'
import { cn } from '@/lib/utils'

interface ProjectChatInputProps {
  project: Project
  onSendMessage: (content: string, options?: {
    providerId?: string
    model?: string
    temperature?: number
    maxTokens?: number
  }) => Promise<void>
  onSendMessageStream: (content: string, options?: {
    providerId?: string
    model?: string
    temperature?: number
    maxTokens?: number
  }) => Promise<void>
  onAbortStream: () => void
  providers: AIProvider[]
  isLoading?: boolean
  isStreaming?: boolean
  disabled?: boolean
  placeholder?: string
  defaultProviderId?: string
  defaultModel?: string
}

const QUICK_PROMPTS = [
  {
    id: 'explain-code',
    label: 'Explain Code',
    icon: Code,
    prompt: 'Can you explain how this code works and suggest any improvements?'
  },
  {
    id: 'debug-help',
    label: 'Debug Help',
    icon: Brain,
    prompt: 'I\'m having an issue with my code. Can you help me debug it?'
  },
  {
    id: 'documentation',
    label: 'Documentation',
    icon: FileText,
    prompt: 'Can you help me write documentation for this feature?'
  },
  {
    id: 'optimization',
    label: 'Optimize',
    icon: Zap,
    prompt: 'How can I optimize this code for better performance?'
  }
]

export function ProjectChatInput({
  project,
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
}: ProjectChatInputProps) {
  const [message, setMessage] = useState('')
  const [selectedProviderId, setSelectedProviderId] = useState(
    defaultProviderId || 
    project.settings?.defaultAIProvider || 
    providers.find(p => p.isActive)?.id || 
    ''
  )
  const [selectedModel, setSelectedModel] = useState(defaultModel || '')
  const [showSettings, setShowSettings] = useState(false)
  const [showQuickPrompts, setShowQuickPrompts] = useState(false)
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(4000)
  const [useStreaming, setUseStreaming] = useState(true)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const selectedProvider = providers.find(p => p.id === selectedProviderId)
  const providerConfig = selectedProvider ? getProviderConfig(selectedProvider.provider) : null
  const availableModels = providerConfig?.models || []

  // Auto-select first model when provider changes
  const handleProviderChange = (providerId: string) => {
    setSelectedProviderId(providerId)
    const provider = providers.find(p => p.id === providerId)
    if (provider) {
      const config = getProviderConfig(provider.provider)
      setSelectedModel(config.models[0]?.id || '')
    }
  }

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    
    // Auto-resize
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
  }

  const handleSend = async () => {
    if (!message.trim() || !selectedProviderId || isLoading || isStreaming) {
      return
    }

    const options = {
      providerId: selectedProviderId,
      model: selectedModel,
      temperature,
      maxTokens,
    }

    try {
      if (useStreaming) {
        await onSendMessageStream(message.trim(), options)
      } else {
        await onSendMessage(message.trim(), options)
      }
      setMessage('')
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleQuickPrompt = (prompt: string) => {
    setMessage(prompt)
    setShowQuickPrompts(false)
    textareaRef.current?.focus()
  }

  const handleAbort = () => {
    onAbortStream()
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Quick Prompts */}
          {showQuickPrompts && (
            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((prompt) => {
                const Icon = prompt.icon
                return (
                  <Button
                    key={prompt.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickPrompt(prompt.prompt)}
                    className="text-xs"
                  >
                    <Icon className="h-3 w-3 mr-1" />
                    {prompt.label}
                  </Button>
                )
              })}
            </div>
          )}

          {/* Provider and Model Selection */}
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={selectedProviderId} onValueChange={handleProviderChange}>
              <SelectTrigger className="w-[160px]">
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
                <SelectTrigger className="w-[160px]">
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

            <Separator orientation="vertical" className="h-6" />

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowQuickPrompts(!showQuickPrompts)}
              className={cn(showQuickPrompts && 'bg-muted')}
            >
              <Zap className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className={cn(showSettings && 'bg-muted')}
            >
              <Settings className="h-4 w-4" />
            </Button>

            {/* Project Context Indicator */}
            <div className="ml-auto">
              <Badge variant="secondary" className="text-xs">
                <Brain className="h-3 w-3 mr-1" />
                Project Context
              </Badge>
            </div>
          </div>

          {/* Advanced Settings */}
          {showSettings && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
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
                <p className="text-xs text-muted-foreground mt-1">
                  Higher values make output more creative
                </p>
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
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum response length
                </p>
              </div>
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={useStreaming}
                    onChange={(e) => setUseStreaming(e.target.checked)}
                  />
                  <span className="text-sm">Enable streaming</span>
                </label>
                <p className="text-xs text-muted-foreground">
                  See responses as they're generated
                </p>
              </div>
            </div>
          )}

          {/* Message Input */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled || isLoading || isStreaming}
                className="min-h-[60px] max-h-[120px] resize-none pr-12"
                rows={2}
              />
              
              {/* Input Actions */}
              <div className="absolute right-2 bottom-2 flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  disabled={disabled || isLoading || isStreaming}
                >
                  <Paperclip className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  disabled={disabled || isLoading || isStreaming}
                >
                  <Smile className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
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
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
              <span>
                {isStreaming ? 'AI is responding...' : 'Sending message...'}
              </span>
            </div>
          )}

          {/* Character Count */}
          {message.length > 0 && (
            <div className="text-xs text-muted-foreground text-right">
              {message.length} characters
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}