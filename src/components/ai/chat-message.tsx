'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Bot, 
  ThumbsUp, 
  ThumbsDown, 
  Copy, 
  Trash2, 
  Edit,
  MoreHorizontal 
} from 'lucide-react';
import { ChatMessage as ChatMessageType } from '@/types';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  message: ChatMessageType;
  onDelete?: (messageId: string) => void;
  onRate?: (messageId: string, rating: number, feedback?: string) => void;
  onEdit?: (messageId: string, content: string) => void;
  isStreaming?: boolean;
}

export function ChatMessage({ 
  message, 
  onDelete, 
  onRate, 
  onEdit, 
  isStreaming = false 
}: ChatMessageProps) {
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const currentRating = message.metadata?.rating as number | undefined;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  const handleRate = (rating: number) => {
    if (onRate) {
      onRate(message.id, rating);
    }
  };

  const handleEdit = () => {
    if (isEditing && onEdit && editContent !== message.content) {
      onEdit(message.id, editContent);
    }
    setIsEditing(!isEditing);
  };

  const handleDelete = () => {
    if (onDelete && confirm('Are you sure you want to delete this message?')) {
      onDelete(message.id);
    }
  };

  return (
    <div
      className={cn(
        'flex gap-3 p-4 group',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      <div className={cn(
        'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
        isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
      )}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Message Content */}
      <div className={cn(
        'flex-1 max-w-[80%]',
        isUser ? 'text-right' : 'text-left'
      )}>
        <Card className={cn(
          'inline-block',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}>
          <CardContent className="p-3">
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full min-h-[100px] p-2 border rounded resize-none bg-background text-foreground"
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleEdit}>
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="whitespace-pre-wrap break-words">
                {message.content}
                {isStreaming && (
                  <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Message Metadata */}
        <div className={cn(
          'flex items-center gap-2 mt-1 text-xs text-muted-foreground',
          isUser ? 'justify-end' : 'justify-start'
        )}>
          <span>{message.createdAt.toLocaleTimeString()}</span>
          {isAssistant && (
            <>
              <Badge variant="outline" className="text-xs">
                {message.provider}
              </Badge>
              {message.model && (
                <Badge variant="outline" className="text-xs">
                  {message.model}
                </Badge>
              )}
            </>
          )}
          {message.metadata?.usage && (
            <Badge variant="outline" className="text-xs">
              {message.metadata.usage.totalTokens} tokens
            </Badge>
          )}
        </div>

        {/* Actions */}
        {showActions && !isEditing && (
          <div className={cn(
            'flex items-center gap-1 mt-2',
            isUser ? 'justify-end' : 'justify-start'
          )}>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopy}
              className="h-6 px-2"
            >
              <Copy className="h-3 w-3" />
            </Button>

            {isUser && onEdit && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(true)}
                className="h-6 px-2"
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
                    'h-6 px-2',
                    currentRating === 1 && 'text-green-600'
                  )}
                >
                  <ThumbsUp className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRate(-1)}
                  className={cn(
                    'h-6 px-2',
                    currentRating === -1 && 'text-red-600'
                  )}
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
                className="h-6 px-2 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}