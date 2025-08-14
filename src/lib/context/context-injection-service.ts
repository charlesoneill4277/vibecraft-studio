import { createClient } from '@/lib/supabase/server'
import type { Project, KnowledgeDocument, ProjectAsset } from '@/types'

export interface ContextItem {
  id: string
  type: 'knowledge' | 'code' | 'asset' | 'conversation'
  title: string
  content: string
  relevanceScore: number
  source: string
  metadata: Record<string, any>
  createdAt: Date
}

export interface ContextInjectionOptions {
  includeKnowledge?: boolean
  includeCode?: boolean
  includeAssets?: boolean
  includePreviousConversations?: boolean
  maxItems?: number
  minRelevanceScore?: number
  contextTypes?: ('knowledge' | 'code' | 'asset' | 'conversation')[]
}

export interface ContextAnalysisResult {
  suggestedContext: ContextItem[]
  totalRelevantItems: number
  contextSummary: string
  estimatedTokens: number
}

export interface CodeContext {
  filePath: string
  content: string
  language: string
  relevantLines?: { start: number; end: number; reason: string }[]
  dependencies?: string[]
}

export class ContextInjectionService {
  private supabase = createClient()

  /**
   * Analyze user message and suggest relevant context
   */
  async analyzeMessageForContext(
    userId: string,
    projectId: string,
    message: string,
    options: ContextInjectionOptions = {}
  ): Promise<ContextAnalysisResult> {
    const {
      includeKnowledge = true,
      includeCode = true,
      includeAssets = true,
      includePreviousConversations = true,
      maxItems = 10,
      minRelevanceScore = 0.3,
      contextTypes = ['knowledge', 'code', 'asset', 'conversation']
    } = options

    // Verify project access
    await this.verifyProjectAccess(userId, projectId)

    const suggestedContext: ContextItem[] = []

    // Extract keywords and topics from the message
    const keywords = this.extractKeywords(message)
    const topics = this.extractTopics(message)

    // Get relevant knowledge base items
    if (includeKnowledge && contextTypes.includes('knowledge')) {
      const knowledgeItems = await this.getRelevantKnowledge(
        projectId,
        message,
        keywords,
        topics
      )
      suggestedContext.push(...knowledgeItems)
    }

    // Get relevant code context
    if (includeCode && contextTypes.includes('code')) {
      const codeItems = await this.getRelevantCodeContext(
        projectId,
        message,
        keywords,
        topics
      )
      suggestedContext.push(...codeItems)
    }

    // Get relevant assets
    if (includeAssets && contextTypes.includes('asset')) {
      const assetItems = await this.getRelevantAssets(
        projectId,
        message,
        keywords,
        topics
      )
      suggestedContext.push(...assetItems)
    }

    // Get relevant previous conversations
    if (includePreviousConversations && contextTypes.includes('conversation')) {
      const conversationItems = await this.getRelevantConversations(
        projectId,
        message,
        keywords,
        topics
      )
      suggestedContext.push(...conversationItems)
    }

    // Sort by relevance score and filter
    const filteredContext = suggestedContext
      .filter(item => item.relevanceScore >= minRelevanceScore)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxItems)

    // Generate context summary
    const contextSummary = this.generateContextSummary(filteredContext)
    const estimatedTokens = this.estimateTokenCount(filteredContext)

    return {
      suggestedContext: filteredContext,
      totalRelevantItems: suggestedContext.length,
      contextSummary,
      estimatedTokens
    }
  }

  /**
   * Get formatted context for AI injection
   */
  async getFormattedContext(
    contextItems: ContextItem[],
    format: 'markdown' | 'plain' | 'structured' = 'markdown'
  ): Promise<string> {
    if (contextItems.length === 0) {
      return ''
    }

    switch (format) {
      case 'markdown':
        return this.formatContextAsMarkdown(contextItems)
      case 'plain':
        return this.formatContextAsPlain(contextItems)
      case 'structured':
        return this.formatContextAsStructured(contextItems)
      default:
        return this.formatContextAsMarkdown(contextItems)
    }
  }

  /**
   * Get code context from GitHub repository or local files
   */
  async getCodeContext(
    projectId: string,
    filePaths: string[],
    query?: string
  ): Promise<CodeContext[]> {
    // This would integrate with GitHub API or local file system
    // For now, return mock data structure
    const codeContexts: CodeContext[] = []

    // Get project to check for GitHub integration
    const { data: project } = await this.supabase
      .from('projects')
      .select('github_repo, local_path, settings')
      .eq('id', projectId)
      .single()

    if (!project) {
      throw new Error('Project not found')
    }

    // If GitHub repo is connected, fetch from GitHub
    if (project.github_repo) {
      // TODO: Implement GitHub API integration
      // const githubContext = await this.getGitHubCodeContext(project.github_repo, filePaths, query)
      // codeContexts.push(...githubContext)
    }

    // If local path is configured, read local files
    if (project.local_path) {
      // TODO: Implement local file system integration
      // const localContext = await this.getLocalCodeContext(project.local_path, filePaths, query)
      // codeContexts.push(...localContext)
    }

    return codeContexts
  }

  /**
   * Preview context before injection
   */
  async previewContext(
    userId: string,
    projectId: string,
    contextItems: ContextItem[]
  ): Promise<{
    preview: string
    tokenCount: number
    contextTypes: Record<string, number>
    recommendations: string[]
  }> {
    await this.verifyProjectAccess(userId, projectId)

    const preview = await this.getFormattedContext(contextItems, 'markdown')
    const tokenCount = this.estimateTokenCount(contextItems)
    
    const contextTypes = contextItems.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const recommendations = this.generateContextRecommendations(contextItems, tokenCount)

    return {
      preview,
      tokenCount,
      contextTypes,
      recommendations
    }
  }

  /**
   * Update context relevance based on user feedback
   */
  async updateContextRelevance(
    userId: string,
    contextItemId: string,
    feedback: 'helpful' | 'not_helpful' | 'irrelevant',
    userMessage: string
  ): Promise<void> {
    // Store feedback for improving relevance scoring
    const { error } = await this.supabase
      .from('context_feedback')
      .insert({
        user_id: userId,
        context_item_id: contextItemId,
        feedback,
        user_message: userMessage,
        created_at: new Date().toISOString()
      })

    if (error) {
      console.error('Failed to store context feedback:', error)
    }
  }

  // Private helper methods

  private async verifyProjectAccess(userId: string, projectId: string): Promise<void> {
    const { data: project } = await this.supabase
      .from('projects')
      .select('user_id')
      .eq('id', projectId)
      .single()

    if (!project || project.user_id !== userId) {
      // Check if user is a project member
      const { data: member } = await this.supabase
        .from('project_members')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .single()

      if (!member) {
        throw new Error('Access denied to project')
      }
    }
  }

  private extractKeywords(message: string): string[] {
    // Simple keyword extraction - in production, use NLP library
    const words = message.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !this.isStopWord(word))

    // Return unique keywords
    return [...new Set(words)]
  }

  private extractTopics(message: string): string[] {
    // Simple topic extraction based on common programming terms
    const topics: string[] = []
    const topicPatterns = {
      'authentication': /auth|login|signin|signup|password|token|jwt/i,
      'database': /database|db|sql|query|table|schema|migration/i,
      'api': /api|endpoint|route|request|response|http|rest/i,
      'frontend': /frontend|ui|component|react|vue|angular|css|html/i,
      'backend': /backend|server|node|express|fastapi|django/i,
      'deployment': /deploy|docker|kubernetes|aws|heroku|vercel/i,
      'testing': /test|testing|jest|cypress|unit|integration/i,
      'performance': /performance|optimization|speed|cache|memory/i,
      'security': /security|vulnerability|encryption|https|cors/i,
      'error': /error|bug|issue|problem|fix|debug/i
    }

    for (const [topic, pattern] of Object.entries(topicPatterns)) {
      if (pattern.test(message)) {
        topics.push(topic)
      }
    }

    return topics
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
      'before', 'after', 'above', 'below', 'between', 'among', 'this', 'that',
      'these', 'those', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves',
      'you', 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself',
      'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their',
      'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'whose', 'this', 'that',
      'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'will', 'would',
      'could', 'should', 'may', 'might', 'must', 'can', 'shall'
    ])
    return stopWords.has(word)
  }

  private async getRelevantKnowledge(
    projectId: string,
    message: string,
    keywords: string[],
    topics: string[]
  ): Promise<ContextItem[]> {
    const { data: knowledgeItems } = await this.supabase
      .from('project_knowledge')
      .select('*')
      .eq('project_id', projectId)

    if (!knowledgeItems) return []

    return knowledgeItems
      .map(item => {
        const relevanceScore = this.calculateRelevanceScore(
          message,
          item.title + ' ' + (item.content || ''),
          keywords,
          topics
        )

        return {
          id: item.id,
          type: 'knowledge' as const,
          title: item.title,
          content: item.content || '',
          relevanceScore,
          source: `Knowledge Base - ${item.category}`,
          metadata: {
            category: item.category,
            fileUrl: item.file_url,
            ...item.metadata
          },
          createdAt: new Date(item.created_at)
        }
      })
      .filter(item => item.relevanceScore > 0)
  }

  private async getRelevantCodeContext(
    projectId: string,
    message: string,
    keywords: string[],
    topics: string[]
  ): Promise<ContextItem[]> {
    // This would integrate with actual code repositories
    // For now, return empty array as code integration is not yet implemented
    return []
  }

  private async getRelevantAssets(
    projectId: string,
    message: string,
    keywords: string[],
    topics: string[]
  ): Promise<ContextItem[]> {
    const { data: assets } = await this.supabase
      .from('project_assets')
      .select('*')
      .eq('project_id', projectId)

    if (!assets) return []

    return assets
      .map(asset => {
        const relevanceScore = this.calculateRelevanceScore(
          message,
          asset.name,
          keywords,
          topics
        )

        return {
          id: asset.id,
          type: 'asset' as const,
          title: asset.name,
          content: `Asset: ${asset.name} (${asset.type})`,
          relevanceScore,
          source: `Project Assets`,
          metadata: {
            type: asset.type,
            size: asset.size,
            fileUrl: asset.file_url,
            ...asset.metadata
          },
          createdAt: new Date(asset.created_at)
        }
      })
      .filter(item => item.relevanceScore > 0)
  }

  private async getRelevantConversations(
    projectId: string,
    message: string,
    keywords: string[],
    topics: string[]
  ): Promise<ContextItem[]> {
    // Get recent conversations from the project
    const { data: conversations } = await this.supabase
      .from('conversations')
      .select(`
        *,
        project_prompts!inner(content, role, created_at)
      `)
      .eq('project_id', projectId)
      .eq('is_archived', false)
      .order('last_message_at', { ascending: false })
      .limit(5)

    if (!conversations) return []

    return conversations
      .map(conversation => {
        // Combine all messages in the conversation for relevance scoring
        const conversationContent = conversation.project_prompts
          .map((prompt: any) => prompt.content)
          .join(' ')

        const relevanceScore = this.calculateRelevanceScore(
          message,
          conversation.title + ' ' + conversationContent,
          keywords,
          topics
        )

        return {
          id: conversation.id,
          type: 'conversation' as const,
          title: conversation.title,
          content: `Previous conversation: ${conversation.title}`,
          relevanceScore,
          source: `Previous Conversations`,
          metadata: {
            messageCount: conversation.message_count,
            lastMessageAt: conversation.last_message_at,
            tags: conversation.tags
          },
          createdAt: new Date(conversation.created_at)
        }
      })
      .filter(item => item.relevanceScore > 0)
  }

  private calculateRelevanceScore(
    userMessage: string,
    content: string,
    keywords: string[],
    topics: string[]
  ): number {
    let score = 0
    const userMessageLower = userMessage.toLowerCase()
    const contentLower = content.toLowerCase()

    // Keyword matching (40% of score)
    const keywordMatches = keywords.filter(keyword => 
      contentLower.includes(keyword)
    ).length
    score += (keywordMatches / Math.max(keywords.length, 1)) * 0.4

    // Topic matching (30% of score)
    const topicMatches = topics.filter(topic => 
      contentLower.includes(topic)
    ).length
    score += (topicMatches / Math.max(topics.length, 1)) * 0.3

    // Semantic similarity (30% of score) - simplified
    const commonWords = this.getCommonWords(userMessageLower, contentLower)
    const semanticScore = commonWords.length / Math.max(userMessage.split(' ').length, 1)
    score += semanticScore * 0.3

    return Math.min(score, 1) // Cap at 1.0
  }

  private getCommonWords(text1: string, text2: string): string[] {
    const words1 = new Set(text1.split(/\s+/).filter(word => !this.isStopWord(word)))
    const words2 = new Set(text2.split(/\s+/).filter(word => !this.isStopWord(word)))
    
    return [...words1].filter(word => words2.has(word))
  }

  private generateContextSummary(contextItems: ContextItem[]): string {
    if (contextItems.length === 0) {
      return 'No relevant context found.'
    }

    const typeGroups = contextItems.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const summaryParts = Object.entries(typeGroups).map(([type, count]) => 
      `${count} ${type} item${count > 1 ? 's' : ''}`
    )

    return `Found ${contextItems.length} relevant context items: ${summaryParts.join(', ')}.`
  }

  private estimateTokenCount(contextItems: ContextItem[]): number {
    // Rough estimation: 1 token ≈ 4 characters
    const totalChars = contextItems.reduce((acc, item) => 
      acc + item.title.length + item.content.length, 0
    )
    return Math.ceil(totalChars / 4)
  }

  private formatContextAsMarkdown(contextItems: ContextItem[]): string {
    if (contextItems.length === 0) return ''

    let formatted = '## Relevant Context\n\n'

    const groupedItems = contextItems.reduce((acc, item) => {
      acc[item.type] = acc[item.type] || []
      acc[item.type].push(item)
      return acc
    }, {} as Record<string, ContextItem[]>)

    for (const [type, items] of Object.entries(groupedItems)) {
      formatted += `### ${type.charAt(0).toUpperCase() + type.slice(1)}\n\n`
      
      for (const item of items) {
        formatted += `**${item.title}** (Relevance: ${(item.relevanceScore * 100).toFixed(0)}%)\n`
        formatted += `*Source: ${item.source}*\n\n`
        
        if (item.content) {
          formatted += `${item.content.substring(0, 500)}${item.content.length > 500 ? '...' : ''}\n\n`
        }
        
        formatted += '---\n\n'
      }
    }

    return formatted
  }

  private formatContextAsPlain(contextItems: ContextItem[]): string {
    return contextItems
      .map(item => `${item.title}: ${item.content}`)
      .join('\n\n')
  }

  private formatContextAsStructured(contextItems: ContextItem[]): string {
    return JSON.stringify(contextItems, null, 2)
  }

  private generateContextRecommendations(
    contextItems: ContextItem[],
    tokenCount: number
  ): string[] {
    const recommendations: string[] = []

    if (tokenCount > 4000) {
      recommendations.push('Consider reducing context items to stay within token limits')
    }

    if (contextItems.length > 10) {
      recommendations.push('Too many context items may overwhelm the AI - consider filtering')
    }

    const lowRelevanceItems = contextItems.filter(item => item.relevanceScore < 0.5)
    if (lowRelevanceItems.length > 0) {
      recommendations.push(`${lowRelevanceItems.length} items have low relevance scores`)
    }

    if (contextItems.length === 0) {
      recommendations.push('No relevant context found - consider adding more project documentation')
    }

    return recommendations
  }
}

// Export singleton instance
export const contextInjectionService = new ContextInjectionService()