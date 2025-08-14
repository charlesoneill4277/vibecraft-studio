'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import {
  Brain,
  Eye,
  Edit,
  X,
  Check,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  FileText,
  Code,
  Image,
  MessageSquare,
  Settings,
  Zap,
  Filter
} from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ContextItem, ContextInjectionOptions } from '@/lib/context/context-injection-service'
import { cn } from '@/lib/utils'

interface ContextPreviewPanelProps {
  contextItems: ContextItem[]
  isAnalyzing: boolean
  onContextItemsChange: (items: ContextItem[]) => void
  onSettingsChange: (settings: Partial<ContextInjectionOptions>) => void
  onFeedback: (itemId: string, feedback: 'helpful' | 'not_helpful' | 'irrelevant', message: string) => void
  settings: ContextInjectionOptions
  className?: string
}

const CONTEXT_TYPE_ICONS = {
  knowledge: FileText,
  code: Code,
  asset: Image,
  conversation: MessageSquare
}

const CONTEXT_TYPE_COLORS = {
  knowledge: 'bg-blue-100 text-blue-800 border-blue-200',
  code: 'bg-green-100 text-green-800 border-green-200',
  asset: 'bg-purple-100 text-purple-800 border-purple-200',
  conversation: 'bg-orange-100 text-orange-800 border-orange-200'
}

export function ContextPreviewPanel({
  contextItems,
  isAnalyzing,
  onContextItemsChange,
  onSettingsChange,
  onFeedback,
  settings,
  className
}: ContextPreviewPanelProps) {
  const [previewMode, setPreviewMode] = useState<'list' | 'formatted'>('list')
  const [formattedPreview, setFormattedPreview] = useState('')
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [filterType, setFilterType] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'relevance' | 'type' | 'title'>('relevance')

  // Calculate statistics
  const totalTokens = contextItems.reduce((acc, item) => 
    acc + Math.ceil((item.title.length + item.content.length) / 4), 0
  )
  
  const typeGroups = contextItems.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const avgRelevanceScore = contextItems.length > 0 
    ? contextItems.reduce((acc, item) => acc + item.relevanceScore, 0) / contextItems.length 
    : 0

  // Filter and sort items
  const filteredItems = contextItems
    .filter(item => filterType === 'all' || item.type === filterType)
    .sort((a, b) => {
      switch (sortBy) {
        case 'relevance':
          return b.relevanceScore - a.relevanceScore
        case 'type':
          return a.type.localeCompare(b.type)
        case 'title':
          return a.title.localeCompare(b.title)
        default:
          return 0
      }
    })

  // Generate formatted preview
  useEffect(() => {
    if (previewMode === 'formatted' && contextItems.length > 0) {
      generateFormattedPreview()
    }
  }, [previewMode, contextItems])

  const generateFormattedPreview = async () => {
    try {
      const response = await fetch('/api/context/format', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contextItems,
          format: 'markdown'
        }),
      })

      if (response.ok) {
        const { formattedContext } = await response.json()
        setFormattedPreview(formattedContext)
      }
    } catch (error) {
      console.error('Failed to generate formatted preview:', error)
    }
  }

  const handleRemoveItem = (itemId: string) => {
    const updatedItems = contextItems.filter(item => item.id !== itemId)
    onContextItemsChange(updatedItems)
  }

  const handleEditItem = (item: ContextItem) => {
    setEditingItemId(item.id)
    setEditingContent(item.content)
  }

  const handleSaveEdit = () => {
    if (editingItemId) {
      const updatedItems = contextItems.map(item =>
        item.id === editingItemId
          ? { ...item, content: editingContent }
          : item
      )
      onContextItemsChange(updatedItems)
      setEditingItemId(null)
      setEditingContent('')
    }
  }

  const handleCancelEdit = () => {
    setEditingItemId(null)
    setEditingContent('')
  }

  const handleFeedback = (item: ContextItem, feedback: 'helpful' | 'not_helpful' | 'irrelevant') => {
    onFeedback(item.id, feedback, item.content)
  }

  const getRecommendations = () => {
    const recommendations: string[] = []

    if (totalTokens > 4000) {
      recommendations.push('High token count - consider reducing context items')
    }

    if (contextItems.length > 15) {
      recommendations.push('Many context items - may overwhelm the AI')
    }

    if (avgRelevanceScore < 0.5) {
      recommendations.push('Low average relevance - consider adjusting filters')
    }

    if (contextItems.length === 0) {
      recommendations.push('No context items - add project documentation for better results')
    }

    return recommendations
  }

  if (isAnalyzing) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center space-y-4">
            <Brain className="h-8 w-8 animate-pulse mx-auto text-primary" />
            <p className="text-muted-foreground">Analyzing message for relevant context...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Context Preview
            {contextItems.length > 0 && (
              <Badge variant="secondary">
                {contextItems.length} items
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Select value={previewMode} onValueChange={(value: any) => setPreviewMode(value)}>
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="list">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    List View
                  </div>
                </SelectItem>
                <SelectItem value="formatted">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Formatted
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="h-8 w-8 p-0"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Statistics */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Zap className="h-4 w-4" />
            <span>{totalTokens.toLocaleString()} tokens</span>
          </div>
          <div className="flex items-center gap-1">
            <Brain className="h-4 w-4" />
            <span>{(avgRelevanceScore * 100).toFixed(0)}% avg relevance</span>
          </div>
          {Object.entries(typeGroups).map(([type, count]) => {
            const Icon = CONTEXT_TYPE_ICONS[type as keyof typeof CONTEXT_TYPE_ICONS]
            return (
              <div key={type} className="flex items-center gap-1">
                <Icon className="h-4 w-4" />
                <span>{count} {type}</span>
              </div>
            )
          })}
        </div>

        {/* Settings Panel */}
        <Collapsible open={showSettings} onOpenChange={setShowSettings}>
          <CollapsibleContent className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div className="space-y-2">
                <label className="text-sm font-medium">Max Items: {settings.maxItems}</label>
                <Slider
                  value={[settings.maxItems || 10]}
                  onValueChange={([value]) => onSettingsChange({ maxItems: value })}
                  max={20}
                  min={1}
                  step={1}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Min Relevance: {((settings.minRelevanceScore || 0.3) * 100).toFixed(0)}%
                </label>
                <Slider
                  value={[(settings.minRelevanceScore || 0.3) * 100]}
                  onValueChange={([value]) => onSettingsChange({ minRelevanceScore: value / 100 })}
                  max={100}
                  min={0}
                  step={5}
                />
              </div>

              <div className="col-span-2 grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2">
                  <Switch
                    checked={settings.includeKnowledge}
                    onCheckedChange={(checked) => onSettingsChange({ includeKnowledge: checked })}
                  />
                  <span className="text-sm">Knowledge Base</span>
                </label>
                
                <label className="flex items-center gap-2">
                  <Switch
                    checked={settings.includeCode}
                    onCheckedChange={(checked) => onSettingsChange({ includeCode: checked })}
                  />
                  <span className="text-sm">Code Context</span>
                </label>
                
                <label className="flex items-center gap-2">
                  <Switch
                    checked={settings.includeAssets}
                    onCheckedChange={(checked) => onSettingsChange({ includeAssets: checked })}
                  />
                  <span className="text-sm">Assets</span>
                </label>
                
                <label className="flex items-center gap-2">
                  <Switch
                    checked={settings.includePreviousConversations}
                    onCheckedChange={(checked) => onSettingsChange({ includePreviousConversations: checked })}
                  />
                  <span className="text-sm">Previous Chats</span>
                </label>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Filters and Sorting */}
        {contextItems.length > 0 && (
          <div className="flex items-center gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="knowledge">Knowledge</SelectItem>
                <SelectItem value="code">Code</SelectItem>
                <SelectItem value="asset">Assets</SelectItem>
                <SelectItem value="conversation">Conversations</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="type">Type</SelectItem>
                <SelectItem value="title">Title</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Recommendations */}
        {getRecommendations().length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              Recommendations
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              {getRecommendations().map((rec, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardHeader>

      <Separator />

      <CardContent className="flex-1 p-0 overflow-hidden">
        {contextItems.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground p-8">
            <div className="text-center space-y-4">
              <Brain className="h-12 w-12 mx-auto opacity-50" />
              <div>
                <p className="text-sm">No context items found</p>
                <p className="text-xs mt-1">
                  Try adjusting your search or adding more project documentation
                </p>
              </div>
            </div>
          </div>
        ) : previewMode === 'formatted' ? (
          <ScrollArea className="h-full p-4">
            <pre className="whitespace-pre-wrap text-sm font-mono bg-muted p-4 rounded-lg">
              {formattedPreview || 'Generating preview...'}
            </pre>
          </ScrollArea>
        ) : (
          <ScrollArea className="h-full p-4">
            <div className="space-y-3">
              {filteredItems.map((item) => (
                <ContextItemCard
                  key={item.id}
                  item={item}
                  isEditing={editingItemId === item.id}
                  editingContent={editingContent}
                  onEditingContentChange={setEditingContent}
                  onEdit={() => handleEditItem(item)}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={handleCancelEdit}
                  onRemove={() => handleRemoveItem(item.id)}
                  onFeedback={(feedback) => handleFeedback(item, feedback)}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

interface ContextItemCardProps {
  item: ContextItem
  isEditing: boolean
  editingContent: string
  onEditingContentChange: (content: string) => void
  onEdit: () => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onRemove: () => void
  onFeedback: (feedback: 'helpful' | 'not_helpful' | 'irrelevant') => void
}

function ContextItemCard({
  item,
  isEditing,
  editingContent,
  onEditingContentChange,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onRemove,
  onFeedback
}: ContextItemCardProps) {
  const Icon = CONTEXT_TYPE_ICONS[item.type]
  const colorClass = CONTEXT_TYPE_COLORS[item.type]

  return (
    <Card className="relative group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Badge className={cn('text-xs', colorClass)}>
              <Icon className="h-3 w-3 mr-1" />
              {item.type}
            </Badge>
            <h4 className="font-medium text-sm truncate">{item.title}</h4>
            <Badge variant="outline" className="text-xs">
              {(item.relevanceScore * 100).toFixed(0)}%
            </Badge>
          </div>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="h-6 w-6 p-0"
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-2">{item.source}</p>

        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editingContent}
              onChange={(e) => onEditingContentChange(e.target.value)}
              className="min-h-[100px] text-sm"
              placeholder="Edit context content..."
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={onSaveEdit}>
                <Check className="h-3 w-3 mr-1" />
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={onCancelEdit}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm line-clamp-3">{item.content}</p>
            
            {/* Feedback buttons */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-xs text-muted-foreground mr-2">Helpful?</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFeedback('helpful')}
                className="h-6 px-2 text-green-600 hover:text-green-600 hover:bg-green-50"
              >
                <ThumbsUp className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFeedback('not_helpful')}
                className="h-6 px-2 text-red-600 hover:text-red-600 hover:bg-red-50"
              >
                <ThumbsDown className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}