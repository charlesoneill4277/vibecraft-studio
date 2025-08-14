#!/usr/bin/env node
/**
 * Attempts to apply the non‑recursive projects/project_members RLS fix.
 * Because the exec_sql RPC function is not present, we fall back to
 * printing the SQL so you can paste it into the Supabase SQL editor
 * (or run via `supabase db remote commit` after linking the project).
 */
import fs from 'fs'
import path from 'path'

const MIGRATION_FILE = path.join('supabase','migrations','20250813205000_fix_recursive_projects_policies.sql')

async function main() {
  console.log('🔧 Preparing non-recursive RLS policy fix for projects & project_members...')
  if (!fs.existsSync(MIGRATION_FILE)) {
    console.error('❌ Migration file not found:', MIGRATION_FILE)
    process.exit(1)
  }
  const sql = fs.readFileSync(MIGRATION_FILE,'utf8')
  console.log('\n================= COPY BELOW INTO SUPABASE SQL EDITOR =================')
  console.log(sql)
  console.log('================= END COPY ============================================\n')
  console.log('➡  Next steps:')
  console.log('  1. Open Supabase Dashboard > SQL Editor')
  console.log('  2. Paste the SQL and run it once')
  console.log('  3. Test querying projects & project_members as a normal user')
  console.log('\n(Optional) After linking project locally:')
  console.log('  supabase link --project-ref YOUR_REF')
  console.log('  supabase db push')
}

main().catch(e=>{console.error(e);process.exit(1)})
