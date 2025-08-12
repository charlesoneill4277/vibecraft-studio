import { createAdminClient } from './admin'
import type { Database } from './types'

export interface BackupOptions {
  includeUserData?: boolean
  includeSystemData?: boolean
  format?: 'json' | 'sql'
  compression?: boolean
}

export interface BackupMetadata {
  timestamp: string
  version: string
  tables: string[]
  recordCount: number
  size: number
}

export class BackupManager {
  private adminClient: ReturnType<typeof createAdminClient>

  constructor() {
    this.adminClient = createAdminClient()
  }

  async createBackup(options: BackupOptions = {}): Promise<BackupMetadata> {
    const {
      includeUserData = true,
      includeSystemData = false,
      format = 'json',
      compression = true
    } = options

    const timestamp = new Date().toISOString()
    const tables: string[] = []
    let recordCount = 0

    try {
      // Define tables to backup
      const userTables: string[] = [
        'users',
        'projects',
        'project_members',
        'project_prompts',
        'project_knowledge',
        'project_assets',
        'project_settings',
        'ai_providers',
        'templates'
      ]

      const systemTables: string[] = [
        // Add system tables if needed
      ]

      const tablesToBackup = [
        ...(includeUserData ? userTables : []),
        ...(includeSystemData ? systemTables : [])
      ]

      const backupData: Record<string, any[]> = {}

      // Backup each table
      for (const table of tablesToBackup) {
        const { data, error } = await this.adminClient
          .from(table as any)
          .select('*')

        if (error) {
          console.error(`Error backing up table ${table}:`, error)
          continue
        }

        backupData[table] = data || []
        tables.push(table)
        recordCount += data?.length || 0
      }

      // Store backup (in a real implementation, this would go to cloud storage)
      const backupContent = JSON.stringify(backupData, null, 2)
      const size = new Blob([backupContent]).size

      // In production, you would upload this to Supabase Storage or another service
      console.log(`Backup created: ${timestamp}`)
      console.log(`Tables: ${tables.join(', ')}`)
      console.log(`Records: ${recordCount}`)
      console.log(`Size: ${size} bytes`)

      return {
        timestamp,
        version: '1.0',
        tables,
        recordCount,
        size
      }
    } catch (error) {
      console.error('Backup creation failed:', error)
      throw new Error('Failed to create backup')
    }
  }

  async restoreBackup(backupData: Record<string, any[]>): Promise<void> {
    try {
      // Disable RLS temporarily for restore (admin operation)
      // In production, this would require careful consideration

      for (const [table, records] of Object.entries(backupData)) {
        if (records.length === 0) continue

        // Clear existing data (be very careful with this in production)
        const { error: deleteError } = await this.adminClient
          .from(table as any)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

        if (deleteError) {
          console.error(`Error clearing table ${table}:`, deleteError)
          continue
        }

        // Insert backup data
        const { error: insertError } = await this.adminClient
          .from(table as any)
          .insert(records)

        if (insertError) {
          console.error(`Error restoring table ${table}:`, insertError)
          throw new Error(`Failed to restore table ${table}`)
        }

        console.log(`Restored ${records.length} records to ${table}`)
      }

      console.log('Backup restoration completed successfully')
    } catch (error) {
      console.error('Backup restoration failed:', error)
      throw new Error('Failed to restore backup')
    }
  }

  async exportUserData(userId: string): Promise<Record<string, any[]>> {
    try {
      const userData: Record<string, any[]> = {}

      // Export user profile
      const { data: user } = await this.adminClient
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (user) {
        userData.users = [user]
      }

      // Export user's projects
      const { data: projects } = await this.adminClient
        .from('projects')
        .select('*')
        .eq('user_id', userId)

      userData.projects = projects || []

      // Export related data for each project
      for (const project of projects || []) {
        // Project prompts
        const { data: prompts } = await this.adminClient
          .from('project_prompts')
          .select('*')
          .eq('project_id', project.id)

        if (prompts?.length) {
          userData.project_prompts = [...(userData.project_prompts || []), ...prompts]
        }

        // Project knowledge
        const { data: knowledge } = await this.adminClient
          .from('project_knowledge')
          .select('*')
          .eq('project_id', project.id)

        if (knowledge?.length) {
          userData.project_knowledge = [...(userData.project_knowledge || []), ...knowledge]
        }

        // Project assets
        const { data: assets } = await this.adminClient
          .from('project_assets')
          .select('*')
          .eq('project_id', project.id)

        if (assets?.length) {
          userData.project_assets = [...(userData.project_assets || []), ...assets]
        }

        // Project settings
        const { data: settings } = await this.adminClient
          .from('project_settings')
          .select('*')
          .eq('project_id', project.id)

        if (settings?.length) {
          userData.project_settings = [...(userData.project_settings || []), ...settings]
        }
      }

      // Export AI providers
      const { data: aiProviders } = await this.adminClient
        .from('ai_providers')
        .select('*')
        .eq('user_id', userId)

      userData.ai_providers = aiProviders || []

      // Export templates
      const { data: templates } = await this.adminClient
        .from('templates')
        .select('*')
        .eq('user_id', userId)

      userData.templates = templates || []

      return userData
    } catch (error) {
      console.error('User data export failed:', error)
      throw new Error('Failed to export user data')
    }
  }

  async deleteUserData(userId: string): Promise<void> {
    try {
      // Delete in reverse order of dependencies
      
      // Get user's projects first
      const { data: projects } = await this.adminClient
        .from('projects')
        .select('id')
        .eq('user_id', userId)

      const projectIds = projects?.map(p => p.id) || []

      // Delete project-related data
      for (const projectId of projectIds) {
        await this.adminClient.from('project_prompts').delete().eq('project_id', projectId)
        await this.adminClient.from('project_knowledge').delete().eq('project_id', projectId)
        await this.adminClient.from('project_assets').delete().eq('project_id', projectId)
        await this.adminClient.from('project_settings').delete().eq('project_id', projectId)
        await this.adminClient.from('project_members').delete().eq('project_id', projectId)
      }

      // Delete user's own data
      await this.adminClient.from('projects').delete().eq('user_id', userId)
      await this.adminClient.from('ai_providers').delete().eq('user_id', userId)
      await this.adminClient.from('templates').delete().eq('user_id', userId)
      await this.adminClient.from('users').delete().eq('id', userId)

      console.log(`User data deleted for user: ${userId}`)
    } catch (error) {
      console.error('User data deletion failed:', error)
      throw new Error('Failed to delete user data')
    }
  }

  async scheduleBackup(schedule: 'daily' | 'weekly' | 'monthly'): Promise<void> {
    // In a real implementation, this would set up a cron job or scheduled function
    console.log(`Backup scheduled: ${schedule}`)
    
    // This would typically be implemented using:
    // - Supabase Edge Functions with cron
    // - Vercel Cron Jobs
    // - GitHub Actions scheduled workflows
    // - External cron services
  }

  async getBackupHistory(): Promise<BackupMetadata[]> {
    // In a real implementation, this would fetch from backup storage
    // For now, return empty array
    return []
  }
}

// Export singleton instance - lazy initialization
let _backupManager: BackupManager | null = null
export const backupManager = {
  get instance() {
    if (!_backupManager) {
      _backupManager = new BackupManager()
    }
    return _backupManager
  }
}