#!/usr/bin/env tsx

import { config } from 'dotenv'
import { createAdminClient } from '../src/lib/supabase/admin'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

// Load environment variables
config({ path: '.env.development' })

async function setupDevData() {
  console.log('🔧 Setting up development data...')

  try {
    const adminClient = createAdminClient()

    // Check if auth users exist
    console.log('👥 Checking for existing auth users...')
    const { data: authUsers, error } = await adminClient.auth.admin.listUsers()
    
    if (error) {
      console.error('❌ Failed to fetch auth users:', error.message)
      return
    }

    if (!authUsers.users || authUsers.users.length === 0) {
      console.log('📝 No auth users found. Please create users first:')
      console.log('')
      console.log('1. Visit Supabase Dashboard: https://supabase.com/dashboard/project/uyeltqsdrsqbdkzqyvvm/auth/users')
      console.log('2. Click "Add user" and create:')
      console.log('   - Email: demo@vibecraft.studio')
      console.log('   - Password: demo123456')
      console.log('   - Email: collaborator@vibecraft.studio') 
      console.log('   - Password: collab123456')
      console.log('3. Run this script again after creating users')
      return
    }

    console.log(`✅ Found ${authUsers.users.length} auth users`)

    // Find demo users
    const demoUser = authUsers.users.find(u => u.email === 'demo@vibecraft.studio')
    const collabUser = authUsers.users.find(u => u.email === 'collaborator@vibecraft.studio')

    if (!demoUser || !collabUser) {
      console.log('⚠️ Required demo users not found. Please create:')
      if (!demoUser) console.log('   - demo@vibecraft.studio')
      if (!collabUser) console.log('   - collaborator@vibecraft.studio')
      return
    }

    console.log('✅ Found required demo users')
    console.log(`   - Demo user: ${demoUser.id}`)
    console.log(`   - Collaborator user: ${collabUser.id}`)

    // Read the seed template
    const seedTemplate = readFileSync(
      join(process.cwd(), 'supabase/seed-with-auth.sql'),
      'utf-8'
    )

    // Replace placeholder UUIDs
    const seedSQL = seedTemplate
      .replace(/REPLACE_WITH_DEMO_USER_UUID/g, demoUser.id)
      .replace(/REPLACE_WITH_COLLABORATOR_USER_UUID/g, collabUser.id)

    // Write the customized seed file
    const outputPath = join(process.cwd(), 'supabase/seed-dev-ready.sql')
    writeFileSync(outputPath, seedSQL)

    console.log('✅ Created customized seed file: supabase/seed-dev-ready.sql')
    console.log('')
    console.log('📋 Next steps:')
    console.log('1. Copy the contents of supabase/seed-dev-ready.sql')
    console.log('2. Paste and run in Supabase SQL Editor')
    console.log('3. Your development environment will have sample data!')

  } catch (error) {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  }
}

setupDevData()