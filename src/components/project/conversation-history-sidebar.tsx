'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Search,
  Plus,
  MessageSquare,
  Archive,
  Pin,
  MoreHorizontal,
  Calendar,
  Hash,
  Download,
  Upload,
  Trash2,
  Edit,
  GitBranch,
  Filter,
  SortAsc,
  SortDesc
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useConversations } from '@/hooks/use-conversations'
import { Project } from '@/hooks/use-projects'
import type { ConversationSummary } from '@/types'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow } from 'date-fns'

interface ConversationHistorySidebarProps {
  project: Project
  currentConversationId?: string
  onConversationSelect: (conversationId: string) => void
  onNewConversation: () => void
  className?: string
}

export function ConversationHistorySidebar({
  project,
  currentConversationId,
  onConversationSelect,
  onNewConversation,
  className
}: ConversationHistorySidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [showPinnedOnly, setShowPinnedOnly] = useState(false)
  const [sortBy, setSortBy] = useState<'last_message_at' | 'created_at' | 'title'>('last_message_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const {
    conversations,
    loading,
    error,
    total,
    createConversation,
    updateConversation,
    deleteConversation,
    searchConversations,
    branchConversation,
    exportConversation,
    importConversation,
    refreshConversations
  } = useConversations({
    projectId: project.id,
    autoRefresh: true
  })

  // Get all unique tags from conversations
  const allTags = Array.from(
    new Set(conversations.flatMap(conv => conv.tags))
  ).sort()

  // Apply search and filters
  useEffect(() => {
    const searchOptions = {
      query: searchQuery || undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      isArchived: showArchived ? true : undefined,
      isPinned: showPinnedOnly ? true : undefined,
      sortBy,
      sortOrder,
      limit: 100
    }

    searchConversations(searchOptions)
  }, [searchQuery, showArchived, showPinnedOnly, sortBy, sortOrder, selectedTags, searchConversations])

  const handleNewConversation = async () => {
    try {
      const conversation = await createConversation()
      onConversationSelect(conversation.id)
      onNewConversation()
    } catch (error) {
      console.error('Failed to create conversation:', error)
    }
  }

  const handleConversationAction = async (
    action: 'pin' | 'archive' | 'delete' | 'export' | 'branch',
    conversation: ConversationSummary,
    branchPointMessageId?: string
  ) => {
    try {
      switch (action) {
        case 'pin':
          await updateConversation(conversation.id, {
            isPinned: !conversation.isPinned
          })
          break
        case 'archive':
          await updateConversation(conversation.id, {
            isArchived: !conversation.isArchived
          })
          break
        case 'delete':
          if (confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
            await deleteConversation(conversation.id)
          }
          break
        case 'export':
          await exportConversation(conversation.id)
          break
        case 'branch':
          if (branchPointMessageId) {
            const branchedConv = await branchConversation(
              conversation.id,
              branchPointMessageId,
              `${conversation.title} (Branch)`
            )
            onConversationSelect(branchedConv.id)
          }
          break
      }
    } catch (error) {
      console.error(`Failed to ${action} conversation:`, error)
    }
  }

  const handleImportConversation = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const imported = await importConversation(file)
      onConversationSelect(imported.id)
    } catch (error) {
      console.error('Failed to import conversation:', error)
    }

    // Reset file input
    event.target.value = ''
  }

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  return (
    <Card className={cn('flex flex-col h-full', className)}>
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Conversations
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNewConversation}
              className="h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowArchived(!showArchived)}>
                  <Archive className="h-4 w-4 mr-2" />
                  {showArchived ? 'Hide Archived' : 'Show Archived'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowPinnedOnly(!showPinnedOnly)}>
                  <Pin className="h-4 w-4 mr-2" />
                  {showPinnedOnly ? 'Show All' : 'Pinned Only'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <label className="flex items-center cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    Import Conversation
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportConversation}
                      className="hidden"
                    />
                  </label>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_message_at">Last Message</SelectItem>
              <SelectItem value="created_at">Created</SelectItem>
              <SelectItem value="title">Title</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="h-8 w-8 p-0"
          >
            {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
          </Button>
        </div>

        {/* Tags Filter */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {allTags.map(tag => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                className="text-xs cursor-pointer"
                onClick={() => toggleTag(tag)}
              >
                <Hash className="h-3 w-3 mr-1" />
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Active Filters */}
        {(searchQuery || selectedTags.length > 0 || showArchived || showPinnedOnly) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>{total} result{total !== 1 ? 's' : ''}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('')
                setSelectedTags([])
                setShowArchived(false)
                setShowPinnedOnly(false)
              }}
              className="h-6 px-2 text-xs"
            >
              Clear
            </Button>
          </div>
        )}
      </CardHeader>

      <Separator />

      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading conversations...
            </div>
          ) : error ? (
            <div className="p-4 text-center text-destructive">
              {error}
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">No conversations found</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNewConversation}
                className="mt-2"
              >
                <Plus className="h-4 w-4 mr-2" />
                Start First Conversation
              </Button>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {conversations.map((conversation) => (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  isActive={conversation.id === currentConversationId}
                  onSelect={() => onConversationSelect(conversation.id)}
                  onAction={handleConversationAction}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

interface ConversationItemProps {
  conversation: ConversationSummary
  isActive: boolean
  onSelect: () => void
  onAction: (
    action: 'pin' | 'archive' | 'delete' | 'export' | 'branch',
    conversation: ConversationSummary,
    branchPointMessageId?: string
  ) => void
}

function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onAction
}: ConversationItemProps) {
  const [showActions, setShowActions] = useState(false)

  return (
    <div
      className={cn(
        'group relative p-3 rounded-lg cursor-pointer transition-colors',
        isActive ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/50',
        conversation.isArchived && 'opacity-60'
      )}
      onClick={onSelect}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {conversation.isPinned && (
            <Pin className="h-3 w-3 text-primary flex-shrink-0" />
          )}
          <h4 className="font-medium text-sm truncate">
            {conversation.title}
          </h4>
        </div>
        
        {showActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation()
                onAction('pin', conversation)
              }}>
                <Pin className="h-4 w-4 mr-2" />
                {conversation.isPinned ? 'Unpin' : 'Pin'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation()
                onAction('archive', conversation)
              }}>
                <Archive className="h-4 w-4 mr-2" />
                {conversation.isArchived ? 'Unarchive' : 'Archive'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation()
                onAction('export', conversation)
              }}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation()
                // Would need to implement branch point selection
                // onAction('branch', conversation, branchPointMessageId)
              }}>
                <GitBranch className="h-4 w-4 mr-2" />
                Branch
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation()
                  onAction('delete', conversation)
                }}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Description */}
      {conversation.description && (
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
          {conversation.description}
        </p>
      )}

      {/* Latest Message Preview */}
      {conversation.latestMessage && (
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
          {conversation.latestMessageRole === 'user' ? 'You: ' : 'AI: '}
          {conversation.latestMessage}
        </p>
      )}

      {/* Tags */}
      {conversation.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {conversation.tags.slice(0, 3).map(tag => (
            <Badge key={tag} variant="outline" className="text-xs px-1 py-0">
              {tag}
            </Badge>
          ))}
          {conversation.tags.length > 3 && (
            <Badge variant="outline" className="text-xs px-1 py-0">
              +{conversation.tags.length - 3}
            </Badge>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Calendar className="h-3 w-3" />
          <span>
            {formatDistanceToNow(conversation.lastMessageAt, { addSuffix: true })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span>{conversation.messageCount} msgs</span>
          {conversation.totalTokens > 0 && (
            <span>{conversation.totalTokens.toLocaleString()} tokens</span>
          )}
        </div>
      </div>

      {/* Branch indicator */}
      {conversation.parentConversationId && (
        <div className="absolute -left-2 top-1/2 transform -translate-y-1/2">
          <div className="w-1 h-8 bg-primary/30 rounded-full" />
        </div>
      )}
    </div>
  )
}