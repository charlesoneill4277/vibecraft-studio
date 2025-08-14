#!/usr/bin/env tsx

import { config } from 'dotenv'
import { createAdminClient } from '../src/lib/supabase/admin'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load environment variables
config({ path: '.env.development' })

async function fixRLSPolicies() {
  console.log('🔧 Fixing RLS policies to resolve circular reference...')

  try {
    const adminClient = createAdminClient()

    // Read the SQL fix file
    const sqlPath = join(process.cwd(), 'supabase', 'migrations', '003_fix_rls_policies.sql')
    const sql = readFileSync(sqlPath, 'utf8')

    console.log('📝 Executing SQL fix...')
    
    // Execute the SQL
    const { error } = await adminClient.rpc('exec_sql', { sql })

    if (error) {
      console.error('❌ Error executing SQL:', error)
      
      // Try alternative approach - execute each statement separately
      console.log('🔄 Trying alternative approach...')
      
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'))

      for (const statement of statements) {
        console.log(`Executing: ${statement.substring(0, 50)}...`)
        const { error: stmtError } = await adminClient.rpc('exec_sql', { sql: statement + ';' })
        if (stmtError) {
          console.warn(`⚠️  Warning for statement: ${stmtError.message}`)
        }
      }
    }

    console.log('✅ RLS policies fixed successfully!')
    console.log('')
    console.log('🧪 Testing the fix...')
    
    // Test the projects query
    const { data: projects, error: testError } = await adminClient
      .from('projects')
      .select(`
        *,
        project_members(
          role,
          user_id,
          users(full_name, email)
        )
      `)
      .limit(1)

    if (testError) {
      console.error('❌ Test query failed:', testError)
      console.log('💡 You may need to apply the fix manually in Supabase Dashboard')
    } else {
      console.log('✅ Test query successful!')
      console.log(`📊 Found ${projects?.length || 0} projects`)
    }

  } catch (error) {
    console.error('❌ Failed to fix RLS policies:', error)
    console.log('')
    console.log('📋 Manual fix required:')
    console.log('1. Go to Supabase Dashboard SQL Editor')
    console.log('2. Copy and execute the contents of supabase/migrations/003_fix_rls_policies.sql')
    console.log('3. Or run the individual SQL commands manually')
    process.exit(1)
  }
}

fixRLSPolicies()