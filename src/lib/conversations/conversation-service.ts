import { createClient } from '@/lib/supabase/server'
import type { Conversation, ConversationSummary, ChatMessage } from '@/types'

export interface CreateConversationRequest {
  projectId: string
  title?: string
  description?: string
  parentConversationId?: string
  branchPointMessageId?: string
  tags?: string[]
}

export interface UpdateConversationRequest {
  title?: string
  description?: string
  tags?: string[]
  isArchived?: boolean
  isPinned?: boolean
}

export interface ConversationSearchOptions {
  query?: string
  tags?: string[]
  isArchived?: boolean
  isPinned?: boolean
  limit?: number
  offset?: number
  sortBy?: 'created_at' | 'updated_at' | 'last_message_at' | 'title'
  sortOrder?: 'asc' | 'desc'
}

export interface BranchConversationRequest {
  sourceConversationId: string
  branchPointMessageId: string
  title?: string
  description?: string
}

export interface ConversationExport {
  conversation: Conversation
  messages: ChatMessage[]
  exportedAt: string
  exportVersion: string
}

export class ConversationService {
  private async getSupabase() {
    return await createClient()
  }

  /**
   * Create a new conversation
   */
  async createConversation(
    userId: string,
    request: CreateConversationRequest
  ): Promise<Conversation> {
    const supabase = await this.getSupabase()
    
    // Verify user has access to the project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id')
      .eq('id', request.projectId)
      .single()

    if (projectError || !project) {
      throw new Error('Project not found')
    }

    // Check if user is project owner or member
    const hasAccess = project.user_id === userId || await this.checkProjectMembership(userId, request.projectId)
    
    if (!hasAccess) {
      throw new Error('Access denied to project')
    }

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        project_id: request.projectId,
        title: request.title || 'New Conversation',
        description: request.description,
        parent_conversation_id: request.parentConversationId,
        branch_point_message_id: request.branchPointMessageId,
        tags: request.tags || [],
        metadata: {}
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create conversation: ${error.message}`)
    }

    return this.mapDatabaseToConversation(data)
  }

  /**
   * Get conversation by ID
   */
  async getConversation(
    userId: string,
    conversationId: string
  ): Promise<Conversation | null> {
    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        projects!inner(id, user_id)
      `)
      .eq('id', conversationId)
      .single()

    if (error || !data) {
      return null
    }

    // Check access
    const hasAccess = data.projects.user_id === userId || 
                     await this.checkProjectMembership(userId, data.project_id)
    
    if (!hasAccess) {
      throw new Error('Access denied to conversation')
    }

    return this.mapDatabaseToConversation(data)
  }

  /**
   * Get conversations for a project with search and filtering
   */
  async getProjectConversations(
    userId: string,
    projectId: string,
    options: ConversationSearchOptions = {}
  ): Promise<{ conversations: ConversationSummary[], total: number }> {
    const supabase = await this.getSupabase()
    
    // Verify project access
    const hasAccess = await this.checkProjectAccess(userId, projectId)
    if (!hasAccess) {
      throw new Error('Access denied to project')
    }

    // First check if the view exists, fallback to direct table query
    let query = supabase
      .from('conversations')
      .select(`
        *,
        projects!inner(name)
      `, { count: 'exact' })
      .eq('project_id', projectId)

    // Apply filters
    if (options.query) {
      query = query.or(`title.ilike.%${options.query}%,description.ilike.%${options.query}%`)
    }

    if (options.tags && options.tags.length > 0) {
      query = query.overlaps('tags', options.tags)
    }

    if (options.isArchived !== undefined) {
      query = query.eq('is_archived', options.isArchived)
    }

    if (options.isPinned !== undefined) {
      query = query.eq('is_pinned', options.isPinned)
    }

    // Apply sorting
    const sortBy = options.sortBy || 'last_message_at'
    const sortOrder = options.sortOrder || 'desc'
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // Apply pagination
    const limit = options.limit || 50
    const offset = options.offset || 0
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      throw new Error(`Failed to get conversations: ${error.message}`)
    }

    return {
      conversations: (data || []).map(item => this.mapDatabaseToConversationSummary({
        ...item,
        project_name: item.projects?.name || 'Unknown Project'
      })),
      total: count || 0
    }
  }

  /**
   * Update conversation
   */
  async updateConversation(
    userId: string,
    conversationId: string,
    updates: UpdateConversationRequest
  ): Promise<Conversation> {
    // Verify access
    const conversation = await this.getConversation(userId, conversationId)
    if (!conversation) {
      throw new Error('Conversation not found or access denied')
    }

    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('conversations')
      .update({
        title: updates.title,
        description: updates.description,
        tags: updates.tags,
        is_archived: updates.isArchived,
        is_pinned: updates.isPinned,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update conversation: ${error.message}`)
    }

    return this.mapDatabaseToConversation(data)
  }

  /**
   * Delete conversation and all its messages
   */
  async deleteConversation(
    userId: string,
    conversationId: string
  ): Promise<void> {
    // Verify access and ownership
    const conversation = await this.getConversation(userId, conversationId)
    if (!conversation) {
      throw new Error('Conversation not found or access denied')
    }

    // Check if user has delete permissions (owner or admin)
    const hasDeletePermission = await this.checkDeletePermission(userId, conversation.projectId)
    if (!hasDeletePermission) {
      throw new Error('Insufficient permissions to delete conversation')
    }

    const supabase = await this.getSupabase()
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId)

    if (error) {
      throw new Error(`Failed to delete conversation: ${error.message}`)
    }
  }

  /**
   * Branch a conversation from a specific message
   */
  async branchConversation(
    userId: string,
    request: BranchConversationRequest
  ): Promise<Conversation> {
    // Get the source conversation and verify access
    const sourceConversation = await this.getConversation(userId, request.sourceConversationId)
    if (!sourceConversation) {
      throw new Error('Source conversation not found or access denied')
    }

    // Verify the branch point message exists and belongs to the conversation
    const supabase = await this.getSupabase()
    const { data: branchMessage, error: messageError } = await supabase
      .from('project_prompts')
      .select('id, conversation_id')
      .eq('id', request.branchPointMessageId)
      .eq('conversation_id', request.sourceConversationId)
      .single()

    if (messageError || !branchMessage) {
      throw new Error('Branch point message not found in conversation')
    }

    // Create the new branched conversation
    const branchedConversation = await this.createConversation(userId, {
      projectId: sourceConversation.projectId,
      title: request.title || `${sourceConversation.title} (Branch)`,
      description: request.description || `Branched from: ${sourceConversation.title}`,
      parentConversationId: request.sourceConversationId,
      branchPointMessageId: request.branchPointMessageId
    })

    // Copy messages up to the branch point
    const { data: messagesToCopy, error: copyError } = await supabase
      .from('project_prompts')
      .select('*')
      .eq('conversation_id', request.sourceConversationId)
      .lte('created_at', (await supabase
        .from('project_prompts')
        .select('created_at')
        .eq('id', request.branchPointMessageId)
        .single()
      ).data?.created_at || new Date().toISOString())
      .order('created_at', { ascending: true })

    if (copyError) {
      throw new Error(`Failed to copy messages: ${copyError.message}`)
    }

    // Insert copied messages into the new conversation
    if (messagesToCopy && messagesToCopy.length > 0) {
      const messagesToInsert = messagesToCopy.map(msg => ({
        project_id: msg.project_id,
        conversation_id: branchedConversation.id,
        role: msg.role,
        content: msg.content,
        ai_provider: msg.ai_provider,
        model: msg.model,
        metadata: msg.metadata,
        parent_message_id: null, // Reset threading for branched conversation
        thread_depth: 0,
        is_branch_point: msg.id === request.branchPointMessageId
      }))

      const { error: insertError } = await supabase
        .from('project_prompts')
        .insert(messagesToInsert)

      if (insertError) {
        throw new Error(`Failed to copy messages to branch: ${insertError.message}`)
      }
    }

    return branchedConversation
  }

  /**
   * Export conversation with all messages
   */
  async exportConversation(
    userId: string,
    conversationId: string
  ): Promise<ConversationExport> {
    const conversation = await this.getConversation(userId, conversationId)
    if (!conversation) {
      throw new Error('Conversation not found or access denied')
    }

    // Get all messages in the conversation
    const supabase = await this.getSupabase()
    const { data: messages, error } = await supabase
      .from('project_prompts')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to export conversation: ${error.message}`)
    }

    return {
      conversation,
      messages: (messages || []).map(this.mapDatabaseToChatMessage),
      exportedAt: new Date().toISOString(),
      exportVersion: '1.0'
    }
  }

  /**
   * Import conversation from export data
   */
  async importConversation(
    userId: string,
    projectId: string,
    exportData: ConversationExport
  ): Promise<Conversation> {
    // Verify project access
    const hasAccess = await this.checkProjectAccess(userId, projectId)
    if (!hasAccess) {
      throw new Error('Access denied to project')
    }

    // Create new conversation
    const newConversation = await this.createConversation(userId, {
      projectId,
      title: `${exportData.conversation.title} (Imported)`,
      description: exportData.conversation.description,
      tags: exportData.conversation.tags
    })

    // Import messages
    if (exportData.messages && exportData.messages.length > 0) {
      const supabase = await this.getSupabase()
      const messagesToInsert = exportData.messages.map(msg => ({
        project_id: projectId,
        conversation_id: newConversation.id,
        role: msg.role,
        content: msg.content,
        ai_provider: msg.provider,
        model: msg.model,
        metadata: msg.metadata,
        parent_message_id: null, // Reset threading for imported conversation
        thread_depth: 0,
        is_branch_point: false
      }))

      const { error: insertError } = await supabase
        .from('project_prompts')
        .insert(messagesToInsert)

      if (insertError) {
        throw new Error(`Failed to import messages: ${insertError.message}`)
      }
    }

    return newConversation
  }

  /**
   * Search messages across conversations in a project
   */
  async searchMessages(
    userId: string,
    projectId: string,
    query: string,
    options: {
      conversationIds?: string[]
      limit?: number
      offset?: number
    } = {}
  ): Promise<{ messages: ChatMessage[], total: number }> {
    // Verify project access
    const hasAccess = await this.checkProjectAccess(userId, projectId)
    if (!hasAccess) {
      throw new Error('Access denied to project')
    }

    const supabase = await this.getSupabase()
    let dbQuery = supabase
      .from('project_prompts')
      .select('*', { count: 'exact' })
      .eq('project_id', projectId)
      .ilike('content', `%${query}%`)

    if (options.conversationIds && options.conversationIds.length > 0) {
      dbQuery = dbQuery.in('conversation_id', options.conversationIds)
    }

    const limit = options.limit || 50
    const offset = options.offset || 0
    dbQuery = dbQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await dbQuery

    if (error) {
      throw new Error(`Failed to search messages: ${error.message}`)
    }

    return {
      messages: (data || []).map(this.mapDatabaseToChatMessage),
      total: count || 0
    }
  }

  /**
   * Get conversation statistics
   */
  async getConversationStats(
    userId: string,
    projectId: string
  ): Promise<{
    totalConversations: number
    archivedConversations: number
    pinnedConversations: number
    totalMessages: number
    totalTokens: number
    totalCost: number
  }> {
    // Verify project access
    const hasAccess = await this.checkProjectAccess(userId, projectId)
    if (!hasAccess) {
      throw new Error('Access denied to project')
    }

    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('conversations')
      .select('is_archived, is_pinned, message_count, total_tokens, total_cost')
      .eq('project_id', projectId)

    if (error) {
      throw new Error(`Failed to get conversation stats: ${error.message}`)
    }

    const stats = (data || []).reduce((acc, conv) => ({
      totalConversations: acc.totalConversations + 1,
      archivedConversations: acc.archivedConversations + (conv.is_archived ? 1 : 0),
      pinnedConversations: acc.pinnedConversations + (conv.is_pinned ? 1 : 0),
      totalMessages: acc.totalMessages + (conv.message_count || 0),
      totalTokens: acc.totalTokens + (conv.total_tokens || 0),
      totalCost: acc.totalCost + (conv.total_cost || 0)
    }), {
      totalConversations: 0,
      archivedConversations: 0,
      pinnedConversations: 0,
      totalMessages: 0,
      totalTokens: 0,
      totalCost: 0
    })

    return stats
  }

  // Private helper methods

  private async checkProjectAccess(userId: string, projectId: string): Promise<boolean> {
    const supabase = await this.getSupabase()
    const { data: project } = await supabase
      .from('projects')
      .select('user_id')
      .eq('id', projectId)
      .single()

    if (project?.user_id === userId) {
      return true
    }

    return await this.checkProjectMembership(userId, projectId)
  }

  private async checkProjectMembership(userId: string, projectId: string): Promise<boolean> {
    const supabase = await this.getSupabase()
    const { data } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single()

    return !!data
  }

  private async checkDeletePermission(userId: string, projectId: string): Promise<boolean> {
    const supabase = await this.getSupabase()
    const { data: project } = await supabase
      .from('projects')
      .select('user_id')
      .eq('id', projectId)
      .single()

    if (project?.user_id === userId) {
      return true
    }

    const { data: member } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single()

    return member?.role === 'admin' || member?.role === 'owner'
  }

  private mapDatabaseToConversation(data: any): Conversation {
    return {
      id: data.id,
      projectId: data.project_id,
      title: data.title,
      description: data.description,
      parentConversationId: data.parent_conversation_id,
      branchPointMessageId: data.branch_point_message_id,
      isArchived: data.is_archived,
      isPinned: data.is_pinned,
      tags: data.tags || [],
      lastMessageAt: new Date(data.last_message_at),
      messageCount: data.message_count || 0,
      totalTokens: data.total_tokens || 0,
      totalCost: data.total_cost || 0,
      metadata: data.metadata || {},
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    }
  }

  private mapDatabaseToConversationSummary(data: any): ConversationSummary {
    return {
      ...this.mapDatabaseToConversation(data),
      projectName: data.project_name,
      latestMessage: data.latest_message,
      latestMessageRole: data.latest_message_role,
      latestMessageTime: data.latest_message_time ? new Date(data.latest_message_time) : undefined,
      userMessageCount: data.user_message_count || 0,
      assistantMessageCount: data.assistant_message_count || 0
    }
  }

  private mapDatabaseToChatMessage(data: any): ChatMessage {
    return {
      id: data.id,
      projectId: data.project_id,
      conversationId: data.conversation_id,
      role: data.role,
      content: data.content,
      provider: data.ai_provider || 'unknown',
      model: data.model || 'unknown',
      metadata: data.metadata || {},
      parentMessageId: data.parent_message_id,
      threadDepth: data.thread_depth || 0,
      isBranchPoint: data.is_branch_point || false,
      createdAt: new Date(data.created_at)
    }
  }
}

// Export singleton instance
export const conversationService = new ConversationService()