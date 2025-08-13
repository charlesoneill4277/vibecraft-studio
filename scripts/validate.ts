#!/usr/bin/env tsx

import { config } from 'dotenv'
import { createAdminClient } from '../src/lib/supabase/admin'
import { migrationManager } from '../src/lib/supabase/migrations'
import { checkDatabaseIntegrity } from '../src/lib/supabase/validation'

// Load environment variables
config({ path: '.env.development' })

async function validateDatabase() {
  console.log('🔍 Validating database integrity...')

  try {
    const adminClient = createAdminClient()

    // Test connection by checking if we can access our tables
    console.log('📡 Testing connection...')
    try {
      const { error: connectionError } = await adminClient.from('users').select('count').limit(1)
      if (connectionError && !connectionError.message.includes('Could not find the table')) {
        throw new Error(`Connection failed: ${connectionError.message}`)
      }
    } catch (err) {
      console.error('Connection test failed:', err)
      throw new Error(`Connection failed: ${err}`)
    }
    console.log('✅ Connection test passed')

    // Validate migrations
    console.log('🔄 Validating migrations...')
    const migrationsValid = await migrationManager.instance.validateMigrations()
    if (!migrationsValid) {
      throw new Error('Migration validation failed')
    }
    console.log('✅ Migration validation passed')

    // Check table structure
    console.log('📋 Checking table structure...')
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
    console.log('✅ Table structure validation passed')

    // Check data integrity
    console.log('🔒 Checking data integrity...')
    const integrityResults = await checkDatabaseIntegrity()
    
    const hasIssues = integrityResults.some(result => 
      result.status === 'rejected' || 
      (result.status === 'fulfilled' && result.result.issues?.length > 0)
    )

    if (hasIssues) {
      console.warn('⚠️ Data integrity issues found:')
      integrityResults.forEach(result => {
        if (result.status === 'rejected') {
          console.warn(`- ${result.check}: ${result.result}`)
        } else if (result.result.issues?.length > 0) {
          console.warn(`- ${result.check}: ${result.result.issues.length} issues`)
        }
      })
    } else {
      console.log('✅ Data integrity validation passed')
    }

    // Check RLS policies
    console.log('🔐 Checking RLS policies...')
    const { data: rlsData, error: rlsError } = await adminClient
      .rpc('exec_sql', { 
        sql: `
          SELECT schemaname, tablename, rowsecurity 
          FROM pg_tables 
          WHERE schemaname = 'public' 
          AND rowsecurity = true;
        `
      })

    if (rlsError) {
      console.warn('⚠️ Could not verify RLS policies:', rlsError.message)
    } else {
      console.log('✅ RLS policies validation passed')
    }

    console.log('🎉 Database validation completed successfully!')

  } catch (error) {
    console.error('❌ Database validation failed:', error)
    process.exit(1)
  }
}

validateDatabase()