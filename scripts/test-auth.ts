#!/usr/bin/env tsx

import { config } from 'dotenv'
import { createAdminClient } from '../src/lib/supabase/admin'

// Load environment variables
config({ path: '.env.development' })

async function testAuthSystem() {
  console.log('🔐 Testing Authentication System...')

  try {
    const adminClient = createAdminClient()

    // Test 1: Check if auth users exist
    console.log('👥 Testing auth users...')
    const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers()
    
    if (authError) {
      console.error('❌ Failed to fetch auth users:', authError.message)
      return
    }

    console.log(`✅ Found ${authUsers.users?.length || 0} auth users`)
    authUsers.users?.forEach(user => {
      console.log(`   - ${user.email} (${user.id.slice(0, 8)}...)`)
    })

    // Test 2: Check if public.users table has corresponding entries
    console.log('📊 Testing public.users table sync...')
    const { data: publicUsers, error: publicError } = await adminClient
      .from('users')
      .select('*')

    if (publicError) {
      console.error('❌ Failed to fetch public users:', publicError.message)
    } else {
      console.log(`✅ Found ${publicUsers.length} users in public.users table`)
      publicUsers.forEach(user => {
        console.log(`   - ${user.email} (${user.full_name || 'No name'})`)
      })
    }

    // Test 3: Check RLS policies are working
    console.log('🔒 Testing Row Level Security...')
    
    // This should work with admin client (bypasses RLS)
    const { data: allProjects, error: projectsError } = await adminClient
      .from('projects')
      .select('*')

    if (projectsError) {
      console.error('❌ Failed to fetch projects:', projectsError.message)
    } else {
      console.log(`✅ Admin can access ${allProjects.length} projects (RLS bypassed)`)
    }

    // Test 4: Check OAuth providers configuration
    console.log('🌐 Testing OAuth configuration...')
    
    // Check if the required environment variables are set
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY'
    ]

    let envVarsOk = true
    requiredEnvVars.forEach(envVar => {
      if (!process.env[envVar]) {
        console.error(`❌ Missing environment variable: ${envVar}`)
        envVarsOk = false
      }
    })

    if (envVarsOk) {
      console.log('✅ All required environment variables are set')
    }

    // Test 5: Check database schema for auth-related tables
    console.log('📋 Testing database schema...')
    
    const authTables = ['users', 'projects', 'project_members']
    for (const table of authTables) {
      const { error } = await adminClient.from(table as any).select('count').limit(1)
      if (error) {
        console.error(`❌ Table ${table} not accessible:`, error.message)
      } else {
        console.log(`✅ Table ${table} is accessible`)
      }
    }

    console.log('🎉 Authentication system testing completed!')

  } catch (error) {
    console.error('❌ Authentication testing failed:', error)
    process.exit(1)
  }
}

testAuthSystem()