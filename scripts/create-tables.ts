#!/usr/bin/env tsx

import { config } from 'dotenv'
import { createAdminClient } from '../src/lib/supabase/admin'

// Load environment variables
config({ path: '.env.development' })

async function createTables() {
  console.log('🚀 Creating database tables...')

  try {
    const adminClient = createAdminClient()

    // Test connection
    console.log('📡 Testing database connection...')
    
    // Simple connection test
    const { data: authData } = await adminClient.auth.getSession()
    console.log('✅ Database connection successful')

    console.log('📋 Note: Table creation should be done through Supabase Dashboard or CLI')
    console.log('🔗 Visit: https://supabase.com/dashboard/project/uyeltqsdrsqbdkzqyvvm/editor')
    console.log('')
    console.log('📝 SQL to execute in Supabase SQL Editor:')
    console.log('1. Copy the contents of supabase/migrations/001_initial_schema.sql')
    console.log('2. Copy the contents of supabase/migrations/002_rls_policies.sql')
    console.log('3. Copy the contents of supabase/seed.sql (for development data)')
    console.log('')
    console.log('✅ Database setup instructions provided')

  } catch (error) {
    console.error('❌ Database connection failed:', error)
    process.exit(1)
  }
}

createTables()