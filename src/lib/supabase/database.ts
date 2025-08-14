import { createClient } from './client'
import { createClient as createServerClient } from './server'
import { createAdminClient } from './admin'
import type { Database } from './types'

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Client-side database operations
export class DatabaseClient {
  private supabase = createClient()

  // Projects
  async getProjects() {
    const { data, error } = await this.supabase
      .from('projects')
      .select(`
        *,
        project_members!inner(
          role,
          user_id,
          users(full_name, email)
        )
      `)
      .order('updated_at', { ascending: false })

    if (error) throw error
    return data
  }

  async getProject(id: string) {
    const { data, error } = await this.supabase
      .from('projects')
      .select(`
        *,
        project_members(
          role,
          user_id,
          users(full_name, email, avatar_url)
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  async createProject(project: Inserts<'projects'>) {
    const { data, error } = await this.supabase
      .from('projects')
      .insert(project)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateProject(id: string, updates: Updates<'projects'>) {
    const { data, error } = await this.supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteProject(id: string) {
    const { error } = await this.supabase
      .from('projects')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // Project Prompts
  async getProjectPrompts(projectId: string) {
    const { data, error } = await this.supabase
      .from('project_prompts')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data
  }

  async createPrompt(prompt: Inserts<'project_prompts'>) {
    const { data, error } = await this.supabase
      .from('project_prompts')
      .insert(prompt)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updatePrompt(id: string, updates: Updates<'project_prompts'>) {
    const { data, error } = await this.supabase
      .from('project_prompts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deletePrompt(id: string) {
    const { error } = await this.supabase
      .from('project_prompts')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // Project Knowledge
  async getProjectKnowledge(projectId: string) {
    const { data, error } = await this.supabase
      .from('project_knowledge')
      .select('*')
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false })

    if (error) throw error
    return data
  }

  async createKnowledge(knowledge: Inserts<'project_knowledge'>) {
    const { data, error } = await this.supabase
      .from('project_knowledge')
      .insert(knowledge)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateKnowledge(id: string, updates: Updates<'project_knowledge'>) {
    const { data, error } = await this.supabase
      .from('project_knowledge')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteKnowledge(id: string) {
    const { error } = await this.supabase
      .from('project_knowledge')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // Project Assets
  async getProjectAssets(projectId: string) {
    const { data, error } = await this.supabase
      .from('project_assets')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async createAsset(asset: Inserts<'project_assets'>) {
    const { data, error } = await this.supabase
      .from('project_assets')
      .insert(asset)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteAsset(id: string) {
    const { error } = await this.supabase
      .from('project_assets')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // AI Providers
  async getAIProviders() {
    const { data, error } = await this.supabase
      .from('ai_providers')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async createAIProvider(provider: Inserts<'ai_providers'>) {
    const { data, error } = await this.supabase
      .from('ai_providers')
      .insert(provider)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateAIProvider(id: string, updates: Updates<'ai_providers'>) {
    const { data, error } = await this.supabase
      .from('ai_providers')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteAIProvider(id: string) {
    const { error } = await this.supabase
      .from('ai_providers')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // Templates
  async getTemplates(includePublic = true) {
    let query = this.supabase
      .from('templates')
      .select('*')

    if (includePublic) {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (user) {
        query = query.or(`user_id.eq.${user.id},is_public.eq.true`)
      } else {
        query = query.eq('is_public', true)
      }
    }

    const { data, error } = await query.order('updated_at', { ascending: false })

    if (error) throw error
    return data
  }

  async createTemplate(template: Inserts<'templates'>) {
    const { data, error } = await this.supabase
      .from('templates')
      .insert(template)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateTemplate(id: string, updates: Updates<'templates'>) {
    const { data, error } = await this.supabase
      .from('templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteTemplate(id: string) {
    const { error } = await this.supabase
      .from('templates')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}

// Server-side database operations
export class ServerDatabaseClient {
  private supabase: Awaited<ReturnType<typeof createServerClient>>

  constructor(supabaseClient: Awaited<ReturnType<typeof createServerClient>>) {
    this.supabase = supabaseClient
  }

  static async create() {
    const supabase = await createServerClient()
    return new ServerDatabaseClient(supabase)
  }

  // User management
  async createUser(user: Inserts<'users'>) {
    const { data, error } = await this.supabase
      .from('users')
      .insert(user)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getUser(id: string) {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  async updateUser(id: string, updates: Updates<'users'>) {
    const { data, error } = await this.supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

// Export singleton instances
export const db = new DatabaseClient()