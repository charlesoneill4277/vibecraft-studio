'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  User, 
  Bot, 
  ThumbsUp, 
  ThumbsDown, 
  Copy, 
  Trash2, 
  Edit,
  MoreHorizontal,
  Check,
  X,
  Sparkles,
  Clock,
  Zap
} from 'lucide-react'
import { ChatMessage as ChatMessageType } from '@/types'
import { Project } from '@/hooks/use-projects'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface ProjectChatMessageProps {
  message: ChatMessageType
  project: Project
  onDelete?: (messageId: string) => void
  onRate?: (messageId: string, rating: number, feedback?: string) => void
  onEdit?: (messageId: string, content: string) => void
  isStreaming?: boolean
  showAvatar?: boolean
  showActions?: boolean
  className?: string
}

export function ProjectChatMessage({ 
  message, 
  project,
  onDelete, 
  onRate, 
  onEdit, 
  isStreaming = false,
  showAvatar = true,
  showActions = true,
  className
}: ProjectChatMessageProps) {
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const [copySuccess, setCopySuccess] = useState(false)

  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'
  const currentRating = message.metadata?.rating as number | undefined
  const responseTime = message.metadata?.responseTime as number | undefined
  const tokenCount = message.metadata?.tokens as number | undefined
  const cost = message.metadata?.cost as number | undefined

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (error) {
      console.error('Failed to copy message:', error)
    }
  }

  const handleRate = (rating: number) => {
    if (onRate) {
      onRate(message.id, rating)
    }
  }

  const handleEdit = () => {
    if (isEditing && onEdit && editContent !== message.content) {
      onEdit(message.id, editContent)
    }
    setIsEditing(!isEditing)
  }

  const handleDelete = () => {
    if (onDelete && confirm('Are you sure you want to delete this message?')) {
      onDelete(message.id)
    }
  }

  const getAvatarContent = () => {
    if (isUser) {
      // For user messages, show user initial or avatar
      const userMember = project.project_members?.find(member => member.role === 'owner')
      return {
        fallback: userMember?.users?.full_name?.[0] || userMember?.users?.email?.[0] || 'U',
        image: undefined // Could be user avatar URL if available
      }
    } else {
      // For assistant messages, show AI provider icon
      return {
        fallback: <Bot className="h-4 w-4" />,
        image: undefined
      }
    }
  }

  const avatarContent = getAvatarContent()

  return (
    <div
      className={cn(
        'group relative',
        isUser ? 'flex flex-row-reverse' : 'flex flex-row',
        className
      )}
      onMouseEnter={() => setShowActionsMenu(true)}
      onMouseLeave={() => setShowActionsMenu(false)}
    >
      {/* Avatar */}
      {showAvatar && (
        <div className={cn('flex-shrink-0', isUser ? 'ml-3' : 'mr-3')}>
          <Avatar className={cn(
            'h-8 w-8',
            isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
          )}>
            <AvatarImage src={avatarContent.image} />
            <AvatarFallback className={cn(
              isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
            )}>
              {avatarContent.fallback}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      {/* Message Content */}
      <div className={cn(
        'flex-1 max-w-[85%] space-y-1',
        isUser ? 'text-right' : 'text-left'
      )}>
        {/* Message Bubble */}
        <Card className={cn(
          'inline-block max-w-full',
          isUser 
            ? 'bg-primary text-primary-foreground ml-auto' 
            : 'bg-muted mr-auto'
        )}>
          <CardContent className="p-3">
            {isEditing ? (
              <div className="space-y-3">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full min-h-[100px] p-2 border rounded resize-none bg-background text-foreground"
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                    <X className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleEdit}>
                    <Check className="h-3 w-3 mr-1" />
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="whitespace-pre-wrap break-words">
                {message.content}
                {isStreaming && (
                  <span className="inline-flex items-center ml-2">
                    <span className="w-2 h-4 bg-current animate-pulse rounded-sm" />
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Message Metadata */}
        <div className={cn(
          'flex items-center gap-2 text-xs text-muted-foreground',
          isUser ? 'justify-end flex-row-reverse' : 'justify-start'
        )}>
          <span>{format(message.createdAt, 'HH:mm')}</span>
          
          {isAssistant && (
            <>
              <Badge variant="outline" className="text-xs px-1 py-0">
                {message.provider}
              </Badge>
              {message.model && (
                <Badge variant="outline" className="text-xs px-1 py-0">
                  {message.model}
                </Badge>
              )}
              {tokenCount && (
                <div className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  <span>{tokenCount}</span>
                </div>
              )}
              {responseTime && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{Math.round(responseTime)}ms</span>
                </div>
              )}
              {cost && (
                <span>${cost.toFixed(4)}</span>
              )}
            </>
          )}

          {/* Rating Display */}
          {currentRating && (
            <div className="flex items-center gap-1">
              {currentRating > 0 ? (
                <ThumbsUp className="h-3 w-3 text-green-600" />
              ) : (
                <ThumbsDown className="h-3 w-3 text-red-600" />
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        {showActions && showActionsMenu && !isEditing && (
          <div className={cn(
            'flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity',
            isUser ? 'justify-end' : 'justify-start'
          )}>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopy}
              className="h-7 px-2"
              title="Copy message"
            >
              {copySuccess ? (
                <Check className="h-3 w-3 text-green-600" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>

            {isUser && onEdit && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(true)}
                className="h-7 px-2"
                title="Edit message"
              >
                <Edit className="h-3 w-3" />
              </Button>
            )}

            {isAssistant && onRate && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRate(1)}
                  className={cn(
                    'h-7 px-2',
                    currentRating === 1 && 'text-green-600 bg-green-50'
                  )}
                  title="Rate as helpful"
                >
                  <ThumbsUp className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRate(-1)}
                  className={cn(
                    'h-7 px-2',
                    currentRating === -1 && 'text-red-600 bg-red-50'
                  )}
                  title="Rate as unhelpful"
                >
                  <ThumbsDown className="h-3 w-3" />
                </Button>
              </>
            )}

            {onDelete && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDelete}
                className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                title="Delete message"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}

        {/* Enhanced Features Indicators */}
        {isAssistant && message.metadata && (
          <div className={cn(
            'flex items-center gap-2 mt-1',
            isUser ? 'justify-end' : 'justify-start'
          )}>
            {message.metadata.cached && (
              <Badge variant="outline" className="text-xs px-1 py-0">
                <Sparkles className="h-3 w-3 mr-1" />
                Cached
              </Badge>
            )}
            {message.metadata.fallbackUsed && (
              <Badge variant="outline" className="text-xs px-1 py-0">
                Fallback
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  )
}