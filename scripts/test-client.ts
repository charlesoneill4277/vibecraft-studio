#!/usr/bin/env tsx

import { config } from 'dotenv'
import { createAdminClient } from '../src/lib/supabase/admin'

// Load environment variables
config({ path: '.env.development' })

async function testClient() {
  console.log('🔧 Testing database client methods...')

  try {
    const adminClient = createAdminClient()

    // Test getting projects with joins
    console.log('📁 Testing projects with members query...')
    const { data: projects, error: projectsError } = await adminClient
      .from('projects')
      .select(`
        *,
        project_members!inner(
          role,
          user_id,
          users(full_name, email)
        )
      `)
      .order('updated_at', { ascending: false })

    if (projectsError) {
      console.error('❌ Projects query failed:', projectsError.message)
    } else {
      console.log(`✅ Retrieved ${projects.length} projects with members`)
      projects.forEach(project => {
        console.log(`   - ${project.name}: ${project.project_members.length} members`)
      })
    }

    // Test getting project with specific ID
    if (projects && projects.length > 0) {
      console.log('📋 Testing single project query...')
      const { data: project, error: projectError } = await adminClient
        .from('projects')
        .select(`
          *,
          project_members(
            role,
            user_id,
            users(full_name, email, avatar_url)
          )
        `)
        .eq('id', projects[0].id)
        .single()

      if (projectError) {
        console.error('❌ Single project query failed:', projectError.message)
      } else {
        console.log(`✅ Retrieved project: ${project.name}`)
        console.log(`   - Members: ${project.project_members.length}`)
      }
    }

    // Test templates query
    console.log('📄 Testing templates query...')
    const { data: templates, error: templatesError } = await adminClient
      .from('templates')
      .select('*')
      .eq('is_public', true)
      .order('updated_at', { ascending: false })

    if (templatesError) {
      console.error('❌ Templates query failed:', templatesError.message)
    } else {
      console.log(`✅ Retrieved ${templates.length} public templates`)
    }

    console.log('🎉 Database client methods testing completed successfully!')

  } catch (error) {
    console.error('❌ Database client testing failed:', error)
    process.exit(1)
  }
}

testClient()