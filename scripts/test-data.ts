#!/usr/bin/env tsx

import { config } from 'dotenv'
import { createAdminClient } from '../src/lib/supabase/admin'

// Load environment variables
config({ path: '.env.development' })

async function testData() {
  console.log('🧪 Testing seeded data...')

  try {
    const adminClient = createAdminClient()

    // Test users
    console.log('👥 Checking users...')
    const { data: users, error: usersError } = await adminClient
      .from('users')
      .select('*')
    
    if (usersError) {
      console.error('❌ Users query failed:', usersError.message)
    } else {
      console.log(`✅ Found ${users?.length || 0} users`)
      users?.forEach(user => {
        console.log(`   - ${user.email} (${user.full_name})`)
      })
    }

    // Test projects
    console.log('📁 Checking projects...')
    const { data: projects, error: projectsError } = await adminClient
      .from('projects')
      .select('*')
    
    if (projectsError) {
      console.error('❌ Projects query failed:', projectsError.message)
    } else {
      console.log(`✅ Found ${projects?.length || 0} projects`)
      projects?.forEach(project => {
        console.log(`   - ${project.name}: ${project.description}`)
      })
    }

    // Test project members
    console.log('👨‍💼 Checking project members...')
    const { data: members, error: membersError } = await adminClient
      .from('project_members')
      .select('*')
    
    if (membersError) {
      console.error('❌ Project members query failed:', membersError.message)
    } else {
      console.log(`✅ Found ${members?.length || 0} project members`)
      members?.forEach(member => {
        console.log(`   - Role: ${member.role} for project ${member.project_id}`)
      })
    }

    // Test prompts
    console.log('💬 Checking project prompts...')
    const { data: prompts, error: promptsError } = await adminClient
      .from('project_prompts')
      .select('*')
    
    if (promptsError) {
      console.error('❌ Project prompts query failed:', promptsError.message)
    } else {
      console.log(`✅ Found ${prompts?.length || 0} project prompts`)
      prompts?.forEach(prompt => {
        console.log(`   - ${prompt.role}: ${prompt.content.substring(0, 50)}...`)
      })
    }

    // Test knowledge
    console.log('📚 Checking project knowledge...')
    const { data: knowledge, error: knowledgeError } = await adminClient
      .from('project_knowledge')
      .select('*')
    
    if (knowledgeError) {
      console.error('❌ Project knowledge query failed:', knowledgeError.message)
    } else {
      console.log(`✅ Found ${knowledge?.length || 0} knowledge items`)
      knowledge?.forEach(item => {
        console.log(`   - ${item.title} (${item.category})`)
      })
    }

    // Test templates
    console.log('📄 Checking templates...')
    const { data: templates, error: templatesError } = await adminClient
      .from('templates')
      .select('*')
    
    if (templatesError) {
      console.error('❌ Templates query failed:', templatesError.message)
    } else {
      console.log(`✅ Found ${templates?.length || 0} templates`)
      templates?.forEach(template => {
        console.log(`   - ${template.name} (${template.category}) - Public: ${template.is_public}`)
      })
    }

    // Test AI providers
    console.log('🤖 Checking AI providers...')
    const { data: providers, error: providersError } = await adminClient
      .from('ai_providers')
      .select('*')
    
    if (providersError) {
      console.error('❌ AI providers query failed:', providersError.message)
    } else {
      console.log(`✅ Found ${providers?.length || 0} AI providers`)
      providers?.forEach(provider => {
        console.log(`   - ${provider.provider} (Active: ${provider.is_active})`)
      })
    }

    console.log('🎉 Data testing completed!')

  } catch (error) {
    console.error('❌ Data testing failed:', error)
    process.exit(1)
  }
}

testData()