#!/usr/bin/env tsx

import { config } from 'dotenv'
import { createAdminClient } from '../src/lib/supabase/admin'
import { migrationManager } from '../src/lib/supabase/migrations'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load environment variables
config({ path: '.env.development' })

async function initializeDatabase() {
  console.log('🚀 Initializing VibeCraft Studio database...')

  try {
    const adminClient = createAdminClient()

    // Test connection
    console.log('📡 Testing database connection...')
    try {
      // Test basic connection with a simple query
      const { error } = await adminClient.rpc('version')
      if (error && !error.message.includes('function "version" does not exist')) {
        throw new Error(`Database connection failed: ${error.message}`)
      }
    } catch (err) {
      // Try alternative connection test
      const { error } = await adminClient.from('information_schema.tables').select('table_name').limit(1)
      if (error) {
        throw new Error(`Database connection failed: ${error}`)
      }
    }
    console.log('✅ Database connection successful')

    // Initialize migration system
    console.log('🔧 Initializing migration system...')
    await migrationManager.instance.initializeMigrationTable()
    console.log('✅ Migration system initialized')

    // Run initial schema migration
    console.log('📋 Running initial schema migration...')
    const schemaSQL = readFileSync(
      join(process.cwd(), 'supabase/migrations/001_initial_schema.sql'),
      'utf-8'
    )

    await migrationManager.instance.applyMigration({
      id: '001_initial_schema',
      name: 'Initial database schema',
      sql: schemaSQL,
      checksum: 'initial'
    })

    // Run RLS policies migration
    console.log('🔒 Setting up Row Level Security policies...')
    const rlsSQL = readFileSync(
      join(process.cwd(), 'supabase/migrations/002_rls_policies.sql'),
      'utf-8'
    )

    await migrationManager.instance.applyMigration({
      id: '002_rls_policies',
      name: 'Row Level Security policies',
      sql: rlsSQL,
      checksum: 'rls'
    })

    // Run seed data (optional)
    if (process.env.NODE_ENV === 'development') {
      console.log('🌱 Seeding development data...')
      const seedSQL = readFileSync(
        join(process.cwd(), 'supabase/seed.sql'),
        'utf-8'
      )

      // Execute seed SQL
      const { error: seedError } = await adminClient.rpc('exec_sql', { sql: seedSQL })
      if (seedError) {
        console.warn('⚠️ Seed data failed (this is normal if data already exists):', seedError.message)
      } else {
        console.log('✅ Development data seeded')
      }
    }

    // Validate setup
    console.log('🔍 Validating database setup...')
    const tables = [
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

    for (const table of tables) {
      const { error } = await adminClient.from(table as any).select('count').limit(1)
      if (error) {
        throw new Error(`Table ${table} validation failed: ${error.message}`)
      }
    }

    console.log('✅ All tables validated successfully')
    console.log('🎉 Database initialization completed!')

    // Print summary
    console.log('\n📊 Database Summary:')
    console.log(`- Tables created: ${tables.length}`)
    console.log('- Row Level Security: Enabled')
    console.log('- Migrations: Applied')
    if (process.env.NODE_ENV === 'development') {
      console.log('- Seed data: Loaded')
    }

  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase()
}

export { initializeDatabase }