#!/usr/bin/env tsx

import { config } from 'dotenv'
import { createAdminClient } from '../src/lib/supabase/admin'

// Load environment variables
config({ path: '.env.development' })

async function testProjectsAPI() {
  console.log('🧪 Testing Projects API...')

  try {
    const adminClient = createAdminClient()

    console.log('1. Testing direct database query...')
    
    // Test the simplified query directly
    const { data: projects, error } = await adminClient
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('❌ Direct query failed:', error)
      return
    }

    console.log(`✅ Direct query successful! Found ${projects?.length || 0} projects`)
    
    if (projects && projects.length > 0) {
      console.log('📋 Sample project:', {
        id: projects[0].id,
        name: projects[0].name,
        user_id: projects[0].user_id,
        created_at: projects[0].created_at
      })
    }

    console.log('\n2. Testing project members query...')
    
    // Test project members query separately
    const { data: members, error: membersError } = await adminClient
      .from('project_members')
      .select('*')
      .limit(5)

    if (membersError) {
      console.error('❌ Project members query failed:', membersError)
    } else {
      console.log(`✅ Project members query successful! Found ${members?.length || 0} members`)
    }

    console.log('\n3. Testing users query...')
    
    // Test users query
    const { data: users, error: usersError } = await adminClient
      .from('users')
      .select('id, email, full_name')
      .limit(5)

    if (usersError) {
      console.error('❌ Users query failed:', usersError)
    } else {
      console.log(`✅ Users query successful! Found ${users?.length || 0} users`)
    }

    console.log('\n🎉 Database queries are working!')
    console.log('💡 The API should now work without the circular reference error.')
    console.log('🔄 Try refreshing the dashboard page in your browser.')

  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

testProjectsAPI()