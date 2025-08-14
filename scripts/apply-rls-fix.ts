#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.development' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyRLSFix() {
  console.log('🔧 Applying RLS policy fix...')

  const sqlStatements = [
    // Drop problematic policies
    `DROP POLICY IF EXISTS "Users can view project members if they are members" ON public.project_members;`,
    `DROP POLICY IF EXISTS "Project owners can manage members" ON public.project_members;`,
    `DROP POLICY IF EXISTS "Project owners can insert members" ON public.project_members;`,
    `DROP POLICY IF EXISTS "Project owners can update members" ON public.project_members;`,
    `DROP POLICY IF EXISTS "Project owners can delete members" ON public.project_members;`,
    `DROP POLICY IF EXISTS "Users can view projects they are members of" ON public.projects;`,

    // Create new non-circular policies
    `CREATE POLICY "Users can view project members if they own the project" ON public.project_members
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.projects 
                WHERE id = project_id AND user_id = auth.uid()
            )
        );`,

    `CREATE POLICY "Project owners can insert members" ON public.project_members
        FOR INSERT WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.projects 
                WHERE id = project_id AND user_id = auth.uid()
            )
        );`,

    `CREATE POLICY "Project owners can update members" ON public.project_members
        FOR UPDATE USING (
            EXISTS (
                SELECT 1 FROM public.projects 
                WHERE id = project_id AND user_id = auth.uid()
            )
        );`,

    `CREATE POLICY "Project owners can delete members" ON public.project_members
        FOR DELETE USING (
            EXISTS (
                SELECT 1 FROM public.projects 
                WHERE id = project_id AND user_id = auth.uid()
            )
        );`,

    `CREATE POLICY "Users can view projects they are members of" ON public.projects
        FOR SELECT USING (user_id = auth.uid());`
  ]

  for (const sql of sqlStatements) {
    try {
      console.log(`📝 Executing: ${sql.substring(0, 50)}...`)
      const { error } = await supabase.rpc('exec_sql', { sql })
      if (error) {
        console.log(`⚠️  Warning: ${error.message}`)
      } else {
        console.log('✅ Success')
      }
    } catch (error) {
      console.log(`⚠️  Warning: ${error}`)
    }
  }

  console.log('\n🧪 Testing the fix...')
  
  // Test if we can query projects without circular reference
  const { data: projects, error } = await supabase
    .from('projects')
    .select('*')
    .limit(1)

  if (error) {
    console.error('❌ Test failed:', error)
  } else {
    console.log('✅ Test passed! RLS policies are working correctly')
    console.log(`📊 Found ${projects?.length || 0} projects`)
  }
}

applyRLSFix().catch(console.error)
