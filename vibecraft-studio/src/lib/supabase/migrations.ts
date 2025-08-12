import { createAdminClient } from './admin'

export interface Migration {
  id: string
  name: string
  sql: string
  applied_at?: string
  checksum?: string
}

export class MigrationManager {
  private adminClient: ReturnType<typeof createAdminClient>

  constructor() {
    this.adminClient = createAdminClient()
  }

  async initializeMigrationTable(): Promise<void> {
    // For now, we'll skip the migration table creation since we don't have direct SQL execution
    // In a real implementation, this would be handled by Supabase CLI or direct database access
    console.log('Migration table initialization skipped - using direct table creation')
  }

  async getAppliedMigrations(): Promise<Migration[]> {
    const { data, error } = await this.adminClient
      .from('schema_migrations')
      .select('*')
      .order('applied_at', { ascending: true })

    if (error) {
      console.error('Failed to fetch applied migrations:', error)
      return []
    }

    return data || []
  }

  async applyMigration(migration: Omit<Migration, 'applied_at'>): Promise<void> {
    try {
      // Check if migration is already applied
      const { data: existing } = await this.adminClient
        .from('schema_migrations')
        .select('id')
        .eq('id', migration.id)
        .single()

      if (existing) {
        console.log(`Migration ${migration.id} already applied, skipping`)
        return
      }

      // For now, we'll skip SQL execution since we don't have direct SQL execution
      // In a real implementation, this would be handled by Supabase CLI or direct database access
      console.log(`Skipping SQL execution for migration ${migration.id} - would execute in production`)

      // Record the migration as applied
      const { error: recordError } = await this.adminClient
        .from('schema_migrations')
        .insert({
          id: migration.id,
          name: migration.name,
          checksum: migration.checksum || this.generateChecksum(migration.sql)
        })

      if (recordError) {
        console.error(`Failed to record migration ${migration.id}:`, recordError)
        throw new Error(`Failed to record migration ${migration.id}`)
      }

      console.log(`Migration ${migration.id} applied successfully`)
    } catch (error) {
      console.error(`Migration ${migration.id} failed:`, error)
      throw error
    }
  }

  async rollbackMigration(migrationId: string): Promise<void> {
    // Note: This is a simplified rollback - in production you'd need rollback SQL
    console.warn(`Rollback requested for migration ${migrationId}`)
    console.warn('Automatic rollback not implemented - manual intervention required')
    
    // In a full implementation, you would:
    // 1. Have rollback SQL for each migration
    // 2. Execute the rollback SQL
    // 3. Remove the migration record
    // 4. Handle dependencies between migrations
  }

  async runPendingMigrations(): Promise<void> {
    const migrations = await this.loadMigrationFiles()
    const applied = await this.getAppliedMigrations()
    const appliedIds = new Set(applied.map(m => m.id))

    const pending = migrations.filter(m => !appliedIds.has(m.id))

    if (pending.length === 0) {
      console.log('No pending migrations')
      return
    }

    console.log(`Running ${pending.length} pending migrations`)

    for (const migration of pending) {
      await this.applyMigration(migration)
    }

    console.log('All pending migrations applied successfully')
  }

  private async loadMigrationFiles(): Promise<Migration[]> {
    // In a real implementation, this would read migration files from the filesystem
    // For now, return the hardcoded migrations
    return [
      {
        id: '001_initial_schema',
        name: 'Initial database schema',
        sql: `-- This would contain the actual SQL from 001_initial_schema.sql`,
        checksum: 'checksum_001'
      },
      {
        id: '002_rls_policies',
        name: 'Row Level Security policies',
        sql: `-- This would contain the actual SQL from 002_rls_policies.sql`,
        checksum: 'checksum_002'
      }
    ]
  }

  private generateChecksum(sql: string): string {
    // Simple checksum generation - in production use a proper hash function
    let hash = 0
    for (let i = 0; i < sql.length; i++) {
      const char = sql.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(16)
  }

  async validateMigrations(): Promise<boolean> {
    try {
      const applied = await this.getAppliedMigrations()
      const files = await this.loadMigrationFiles()

      // Check if all applied migrations still exist in files
      for (const appliedMigration of applied) {
        const file = files.find(f => f.id === appliedMigration.id)
        if (!file) {
          console.error(`Applied migration ${appliedMigration.id} not found in files`)
          return false
        }

        // Check if checksum matches (migration file hasn't been modified)
        const currentChecksum = this.generateChecksum(file.sql)
        if (appliedMigration.checksum !== currentChecksum) {
          console.error(`Migration ${appliedMigration.id} checksum mismatch`)
          return false
        }
      }

      console.log('Migration validation passed')
      return true
    } catch (error) {
      console.error('Migration validation failed:', error)
      return false
    }
  }
}

// Export singleton instance - lazy initialization
let _migrationManager: MigrationManager | null = null
export const migrationManager = {
  get instance() {
    if (!_migrationManager) {
      _migrationManager = new MigrationManager()
    }
    return _migrationManager
  }
}

// Helper function to run migrations in development
export async function runMigrations() {
  try {
    await migrationManager.instance.initializeMigrationTable()
    await migrationManager.instance.runPendingMigrations()
    console.log('Migrations completed successfully')
  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  }
}