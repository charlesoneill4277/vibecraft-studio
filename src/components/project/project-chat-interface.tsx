'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Loader2, 
  AlertCircle, 
  MessageSquare, 
  Trash2,
  RefreshCw,
  Download,
  Users,
  Clock,
  Zap,
  Brain,
  Eye,
  EyeOff
} from 'lucide-react'
import { ProjectChatMessage } from './project-chat-message'
import { ProjectChatInput } from './project-chat-input'
import { TypingIndicator } from './typing-indicator'
import { ContextPreviewPanel } from './context-preview-panel'
import { useChat } from '@/hooks/use-chat'
import { useAIProviders } from '@/hooks/use-ai-providers'
import { useContextInjection } from '@/hooks/use-context-injection'
import { Project } from '@/hooks/use-projects'
import { cn } from '@/lib/utils'

interface ProjectChatInterfaceProps {
  projectId: string
  project: Project
  conversationId?: string | null
  onConversationChange?: (conversationId: string) => void
  className?: string
}

export function ProjectChatInterface({ 
  projectId, 
  project,
  conversationId,
  onConversationChange,
  className 
}: ProjectChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [showTyping, setShowTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [showContextPanel, setShowContextPanel] = useState(false)
  const [pendingMessage, setPendingMessage] = useState<string>('')
  
  const { providers, loading: providersLoading } = useAIProviders()
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
    conversationId: conversationId || undefined,
    systemPrompt: generateProjectSystemPrompt(project),
  })

  const {
    contextItems,
    analysisResult,
    isAnalyzing,
    error: contextError,
    analyzeMessage,
    selectContextItems,
    removeContextItem,
    updateContextItem,
    clearContext,
    getFormattedContext,
    previewContext,
    provideFeedback,
    updateContextSettings,
    contextSettings
  } = useContextInjection({
    projectId,
    autoAnalyze: false
  })

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Show typing indicator when streaming
  useEffect(() => {
    setShowTyping(isStreaming)
  }, [isStreaming])

  const handleSendMessage = async (
    content: string,
    options?: {
      providerId?: string
      model?: string
      temperature?: number
      maxTokens?: number
    }
  ) => {
    // Analyze message for context if context panel is shown
    if (showContextPanel) {
      setPendingMessage(content)
      await analyzeMessage(content)
      return
    }

    // Generate enhanced system prompt with context
    const enhancedSystemPrompt = await generateEnhancedSystemPrompt(project, content)
    
    await sendMessage(content, { 
      ...options, 
      systemPrompt: enhancedSystemPrompt
    })
  }

  const handleSendMessageStream = async (
    content: string,
    options?: {
      providerId?: string
      model?: string
      temperature?: number
      maxTokens?: number
    }
  ) => {
    // Analyze message for context if context panel is shown
    if (showContextPanel) {
      setPendingMessage(content)
      await analyzeMessage(content)
      return
    }

    // Generate enhanced system prompt with context
    const enhancedSystemPrompt = await generateEnhancedSystemPrompt(project, content)
    
    await sendMessageStream(content, { 
      ...options, 
      systemPrompt: enhancedSystemPrompt
    })
  }

  const handleSendWithContext = async (
    useStreaming: boolean = true,
    options?: {
      providerId?: string
      model?: string
      temperature?: number
      maxTokens?: number
    }
  ) => {
    if (!pendingMessage) return

    try {
      // Generate enhanced system prompt with selected context
      const contextText = await getFormattedContext('markdown')
      const enhancedSystemPrompt = generateProjectSystemPrompt(project) + 
        (contextText ? `\n\n## Relevant Context\n${contextText}` : '')

      if (useStreaming) {
        await sendMessageStream(pendingMessage, { 
          ...options, 
          systemPrompt: enhancedSystemPrompt
        })
      } else {
        await sendMessage(pendingMessage, { 
          ...options, 
          systemPrompt: enhancedSystemPrompt
        })
      }

      // Clear pending message and context
      setPendingMessage('')
      clearContext()
      setShowContextPanel(false)
    } catch (error) {
      console.error('Failed to send message with context:', error)
    }
  }

  const generateEnhancedSystemPrompt = async (project: Project, userMessage: string): Promise<string> => {
    // Auto-analyze for context if enabled in project settings
    const projectSettings = project.settings as any
    const contextSettings = projectSettings?.context_settings

    if (contextSettings?.auto_inject_knowledge || contextSettings?.auto_inject_code) {
      try {
        const result = await analyzeMessage(userMessage, {
          includeKnowledge: contextSettings.auto_inject_knowledge,
          includeCode: contextSettings.auto_inject_code,
          includeAssets: contextSettings.auto_inject_assets,
          includePreviousConversations: contextSettings.auto_inject_conversations,
          maxItems: contextSettings.max_context_items || 5,
          minRelevanceScore: contextSettings.min_relevance_score || 0.5
        })

        if (result.suggestedContext.length > 0) {
          const contextText = await getFormattedContext('markdown')
          return generateProjectSystemPrompt(project) + 
            (contextText ? `\n\n## Relevant Context\n${contextText}` : '')
        }
      } catch (error) {
        console.error('Failed to auto-inject context:', error)
      }
    }

    return generateProjectSystemPrompt(project)
  }

  const handleClearMessages = () => {
    if (confirm('Are you sure you want to clear all messages? This action cannot be undone.')) {
      clearMessages()
    }
  }

  const handleExportChat = () => {
    const chatData = {
      project: {
        id: project.id,
        name: project.name,
        description: project.description
      },
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        provider: msg.provider,
        model: msg.model,
        createdAt: msg.createdAt,
        rating: msg.metadata?.rating
      })),
      exportedAt: new Date().toISOString(),
      stats
    }

    const blob = new Blob([JSON.stringify(chatData, null, 2)], { 
      type: 'application/json' 
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.name}-chat-export-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (providersLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="text-muted-foreground">Loading AI providers...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const activeProviders = providers.filter(p => p.isActive)

  if (activeProviders.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Project AI Chat
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No active AI providers found. Please configure at least one AI provider to start chatting.
              <Button variant="link" className="p-0 h-auto ml-2">
                Configure Providers
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {project.name}
              <Badge variant="secondary" className="text-xs">
                <Zap className="h-3 w-3 mr-1" />
                AI Chat
              </Badge>
            </CardTitle>
            {stats && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{stats.totalMessages} messages</span>
                <Separator orientation="vertical" className="h-4" />
                <span>{stats.totalTokens.toLocaleString()} tokens</span>
                <Separator orientation="vertical" className="h-4" />
                <span>${stats.totalCost.toFixed(4)}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowContextPanel(!showContextPanel)}
              className={cn(showContextPanel && 'bg-primary/10 border-primary/20')}
            >
              <Brain className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshHistory}
              disabled={isLoading}
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportChat}
              disabled={messages.length === 0}
            >
              <Download className="h-4 w-4" />
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
      
      <CardContent className="flex-1 flex p-0 overflow-hidden">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {(error || contextError) && (
            <div className="p-4 flex-shrink-0">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error || contextError}</AlertDescription>
              </Alert>
            </div>
          )}

          {/* Context Analysis Pending */}
          {pendingMessage && (
            <div className="p-4 flex-shrink-0">
              <Alert>
                <Brain className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>Message ready to send with context</span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSendWithContext(true)}
                      disabled={isLoading || isStreaming}
                    >
                      Send with Context
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setPendingMessage('')
                        clearContext()
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Messages */}
          <ScrollArea className="flex-1 px-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center space-y-4 py-12">
                  <MessageSquare className="h-16 w-16 mx-auto opacity-50" />
                  <div>
                    <h3 className="text-lg font-medium">Start a conversation</h3>
                    <p className="text-sm">
                      Ask me anything about your project "{project.name}"
                    </p>
                    <p className="text-xs mt-2">
                      I have access to your project context and can help with development tasks
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowContextPanel(!showContextPanel)}
                      className="mt-4"
                    >
                      <Brain className="h-4 w-4 mr-2" />
                      {showContextPanel ? 'Hide' : 'Show'} Context Panel
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-1 py-4">
                {messages.map((message, index) => (
                  <ProjectChatMessage
                    key={message.id}
                    message={message}
                    project={project}
                    onDelete={deleteMessage}
                    onRate={rateMessage}
                    isStreaming={isStreaming && index === messages.length - 1 && message.role === 'assistant'}
                    showAvatar={true}
                    showActions={true}
                  />
                ))}
                
                {/* Typing Indicator */}
                {showTyping && (
                  <TypingIndicator 
                    users={typingUsers.length > 0 ? typingUsers : ['AI Assistant']}
                    className="ml-12"
                  />
                )}
                
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t flex-shrink-0">
            <ProjectChatInput
              project={project}
              onSendMessage={handleSendMessage}
              onSendMessageStream={handleSendMessageStream}
              onAbortStream={abortStream}
              providers={activeProviders}
              isLoading={isLoading}
              isStreaming={isStreaming}
              placeholder={`Ask me anything about "${project.name}"...`}
            />
          </div>

          {/* Stats Footer */}
          {stats && stats.averageResponseTime > 0 && (
            <div className="px-4 pb-4 flex-shrink-0">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{Math.round(stats.averageResponseTime)}ms avg response</span>
                </div>
                {project.project_members && project.project_members.length > 1 && (
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>{project.project_members.length} team members</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Context Panel */}
        {showContextPanel && (
          <>
            <Separator orientation="vertical" />
            <div className="w-96 flex-shrink-0">
              <ContextPreviewPanel
                contextItems={contextItems}
                isAnalyzing={isAnalyzing}
                onContextItemsChange={selectContextItems}
                onSettingsChange={updateContextSettings}
                onFeedback={provideFeedback}
                settings={contextSettings}
                className="h-full border-0 rounded-none"
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function generateProjectSystemPrompt(project: Project): string {
  return `You are an AI assistant helping with the project "${project.name}".

Project Details:
- Name: ${project.name}
- Description: ${project.description || 'No description provided'}
- GitHub Repository: ${project.github_repo || 'Not connected'}
- Local Path: ${project.local_path || 'Not configured'}
- AI Provider: ${project.settings?.defaultAIProvider || 'Default'}
- Team Members: ${project.project_members?.length || 0}

You have access to this project's context and should provide helpful, relevant assistance for web development tasks. Be concise but thorough in your responses. When discussing code or technical concepts, consider the project's specific context and requirements.

If the user asks about project-specific information that you don't have access to, let them know what additional context would be helpful.`
}