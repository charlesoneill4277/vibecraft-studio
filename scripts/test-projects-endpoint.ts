#!/usr/bin/env node
import * as dotenv from 'dotenv'
import fetch from 'node-fetch'

dotenv.config({ path: '.env.development' })

async function main() {
  const base = 'http://localhost:3000/api/projects'
  console.log('🔍 Testing /api/projects (no members)...')
  let res = await fetch(base, { headers: { 'Accept':'application/json' } })
  console.log('Status:', res.status)
  try { console.log('Body:', await res.json()) } catch {}

  console.log('\n🔍 Testing /api/projects?includeMembers=true ...')
  res = await fetch(base + '?includeMembers=true', { headers: { 'Accept':'application/json' } })
  console.log('Status:', res.status)
  try { console.log('Body:', await res.json()) } catch {}

  console.log('\n(If 401, open a browser session and ensure you are logged in, then retry)')
}

main().catch(e=>{console.error(e);process.exit(1)})
