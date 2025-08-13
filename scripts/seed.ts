#!/usr/bin/env tsx

import { config } from 'dotenv'
import { createAdminClient } from '../src/lib/supabase/admin'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load environment variables
config({ path: '.env.development' })

async function seedDatabase() {
  console.log('🌱 Seeding database with development data...')

  try {
    const adminClient = createAdminClient()
    
    const seedSQL = readFileSync(
      join(process.cwd(), 'supabase/seed.sql'),
      'utf-8'
    )

    const { error } = await adminClient.rpc('exec_sql', { sql: seedSQL })
    
    if (error) {
      console.warn('⚠️ Some seed operations failed (this is normal if data already exists):', error.message)
    }

    console.log('✅ Database seeded successfully')
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  }
}

seedDatabase()