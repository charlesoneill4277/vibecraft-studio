'use client'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Bot, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TypingIndicatorProps {
  users: string[]
  className?: string
}

export function TypingIndicator({ users, className }: TypingIndicatorProps) {
  const displayUsers = users.slice(0, 3) // Show max 3 users
  const remainingCount = users.length - displayUsers.length

  return (
    <div className={cn('flex items-center gap-3 py-2', className)}>
      {/* Avatar */}
      <Avatar className="h-8 w-8 bg-muted">
        <AvatarFallback>
          {users.includes('AI Assistant') ? (
            <Bot className="h-4 w-4" />
          ) : (
            <User className="h-4 w-4" />
          )}
        </AvatarFallback>
      </Avatar>

      {/* Typing Animation */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 px-3 py-2 bg-muted rounded-lg">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]" />
            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]" />
            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
          </div>
        </div>

        {/* Typing Text */}
        <div className="text-xs text-muted-foreground">
          {displayUsers.length === 1 ? (
            <span>{displayUsers[0]} is typing...</span>
          ) : displayUsers.length === 2 ? (
            <span>{displayUsers[0]} and {displayUsers[1]} are typing...</span>
          ) : displayUsers.length === 3 ? (
            <span>{displayUsers[0]}, {displayUsers[1]} and {displayUsers[2]} are typing...</span>
          ) : (
            <span>
              {displayUsers[0]}, {displayUsers[1]} and {remainingCount} others are typing...
            </span>
          )}
        </div>
      </div>
    </div>
  )
}