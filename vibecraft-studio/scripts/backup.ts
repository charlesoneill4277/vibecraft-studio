#!/usr/bin/env tsx

import { config } from 'dotenv'
import { backupManager } from '../src/lib/supabase/backup'

// Load environment variables
config({ path: '.env.development' })

async function createBackup() {
  console.log('💾 Creating database backup...')

  try {
    const metadata = await backupManager.instance.createBackup({
      includeUserData: true,
      includeSystemData: false,
      format: 'json',
      compression: true
    })

    console.log('✅ Backup created successfully')
    console.log('📊 Backup Details:')
    console.log(`- Timestamp: ${metadata.timestamp}`)
    console.log(`- Tables: ${metadata.tables.join(', ')}`)
    console.log(`- Records: ${metadata.recordCount}`)
    console.log(`- Size: ${(metadata.size / 1024 / 1024).toFixed(2)} MB`)

  } catch (error) {
    console.error('❌ Backup failed:', error)
    process.exit(1)
  }
}

createBackup()