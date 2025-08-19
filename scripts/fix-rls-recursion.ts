import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load environment variables
config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixRLSRecursion() {
  console.log('🔧 Fixing recursive RLS policies...')
  
  try {
    // Step 1: Drop all problematic policies that create circular dependencies
    console.log('📝 Dropping problematic policies...')
    
    const policiesToDrop = [
      // Projects policies that reference project_members
      { table: 'projects', policy: 'Users can view own projects' },
      { table: 'projects', policy: 'Users can view projects they are members of' },
      { table: 'projects', policy: 'Users can view own or member projects' },
      { table: 'projects', policy: 'Owners/admins can update projects' },
      
      // Project_members policies that reference projects
      { table: 'project_members', policy: 'Users can view project members if they are members' },
      { table: 'project_members', policy: 'Project owners can manage members' },
      { table: 'project_members', policy: 'Users can view project members if they are project owners' },
      { table: 'project_members', policy: 'Users can view project members if they are members themselves' },
      { table: 'project_members', policy: 'Project owners can insert members' },
      { table: 'project_members', policy: 'Project owners can update members' },
      { table: 'project_members', policy: 'Project owners can delete members' },
      { table: 'project_members', policy: 'Users can select own membership' },
      { table: 'project_members', policy: 'Users can insert own owner membership' },
      { table: 'project_members', policy: 'Users can update own membership' },
      { table: 'project_members', policy: 'Users can delete own membership' },
      
      // Other table policies that reference project_members
      { table: 'project_prompts', policy: 'Project members can view prompts' },
      { table: 'project_prompts', policy: 'Project members can create prompts' },
      { table: 'project_prompts', policy: 'Project members can update prompts' },
      { table: 'project_prompts', policy: 'Project owners can delete prompts' },
      { table: 'project_knowledge', policy: 'Project members can view knowledge' },
      { table: 'project_knowledge', policy: 'Project members can manage knowledge' },
      { table: 'project_assets', policy: 'Project members can view assets' },
      { table: 'project_assets', policy: 'Project members can manage assets' },
      { table: 'project_settings', policy: 'Project members can view settings' },
      { table: 'project_settings', policy: 'Project admins can manage settings' }
    ]

    for (const { table, policy } of policiesToDrop) {
      try {
        const { error } = await supabase.rpc('drop_policy_if_exists', {
          policy_name: policy,
          table_name: table
        })
        if (error) {
          console.log(`⚠️  Could not drop policy "${policy}" on ${table}:`, error.message)
        } else {
          console.log(`✅ Dropped policy "${policy}" on ${table}`)
        }
      } catch (err) {
        console.log(`⚠️  Error dropping policy "${policy}" on ${table}:`, err)
      }
    }

    // Step 2: Create new non-recursive policies
    console.log('\n📝 Creating new non-recursive policies...')
    
    // Projects table - simple ownership-based access
    const { error: projectsSelectError } = await supabase.rpc('create_policy', {
      policy_name: 'Users can view own projects only',
      table_name: 'projects',
      operation: 'SELECT',
      definition: 'auth.uid() = user_id'
    })
    if (projectsSelectError) {
      console.log('⚠️  Error creating projects SELECT policy:', projectsSelectError.message)
    } else {
      console.log('✅ Created projects SELECT policy')
    }

    // Project_members table - users can only see their own records
    const projectMembersPolicies = [
      { operation: 'SELECT', definition: 'auth.uid() = user_id' },
      { operation: 'INSERT', definition: 'auth.uid() = user_id' },
      { operation: 'UPDATE', definition: 'auth.uid() = user_id' },
      { operation: 'DELETE', definition: 'auth.uid() = user_id' }
    ]

    for (const { operation, definition } of projectMembersPolicies) {
      const { error } = await supabase.rpc('create_policy', {
        policy_name: `Users can ${operation.toLowerCase()} own membership`,
        table_name: 'project_members',
        operation,
        definition
      })
      if (error) {
        console.log(`⚠️  Error creating project_members ${operation} policy:`, error.message)
      } else {
        console.log(`✅ Created project_members ${operation} policy`)
      }
    }

    // Other project-related tables - ownership-based access only
    const projectTables = ['project_prompts', 'project_knowledge', 'project_assets', 'project_settings']
    
    for (const table of projectTables) {
      const policies = [
        { operation: 'SELECT', definition: `EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())` },
        { operation: 'INSERT', definition: `EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())` },
        { operation: 'UPDATE', definition: `EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())` },
        { operation: 'DELETE', definition: `EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())` }
      ]

      for (const { operation, definition } of policies) {
        const { error } = await supabase.rpc('create_policy', {
          policy_name: `Project owners can ${operation.toLowerCase()} ${table.replace('project_', '')}`,
          table_name: table,
          operation,
          definition
        })
        if (error) {
          console.log(`⚠️  Error creating ${table} ${operation} policy:`, error.message)
        } else {
          console.log(`✅ Created ${table} ${operation} policy`)
        }
      }
    }

    console.log('\n✅ RLS recursion fix completed!')
    console.log('\n📋 Summary of changes:')
    console.log('- Removed all policies that created circular dependencies')
    console.log('- Projects are now only accessible to their owners')
    console.log('- Project_members are only accessible to the user themselves')
    console.log('- All other project tables are only accessible to project owners')
    console.log('\n⚠️  Note: This creates a simplified access model where:')
    console.log('- Users can only see projects they own')
    console.log('- Project sharing is not supported in this version')
    console.log('- If you need sharing later, consider SECURITY DEFINER functions')

  } catch (error) {
    console.error('❌ Error fixing RLS recursion:', error)
    process.exit(1)
  }
}

// Run the fix
fixRLSRecursion()
  .then(() => {
    console.log('\n🎉 RLS fix completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 RLS fix failed:', error)
    process.exit(1)
  })
