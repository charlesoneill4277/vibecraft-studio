#!/usr/bin/env tsx

import { config } from 'dotenv'
import { migrationManager } from '../src/lib/supabase/migrations'

// Load environment variables
config({ path: '.env.development' })

async function runMigrations() {
  console.log('🔄 Running database migrations...')

  try {
    await migrationManager.instance.initializeMigrationTable()
    await migrationManager.instance.runPendingMigrations()
    
    const isValid = await migrationManager.instance.validateMigrations()
    if (!isValid) {
      throw new Error('Migration validation failed')
    }

    console.log('✅ Migrations completed successfully')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

runMigrations()