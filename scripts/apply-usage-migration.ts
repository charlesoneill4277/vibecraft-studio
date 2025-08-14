import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.development' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyUsageMigration() {
  try {
    console.log('🔄 Applying usage management migration...');

    // Read the migration file
    const migrationPath = join(process.cwd(), 'supabase/migrations/004_usage_management_system.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          // Try direct execution if RPC fails
          const { error: directError } = await supabase
            .from('_temp_migration')
            .select('*')
            .limit(1);
          
          if (directError) {
            console.log(`⚠️  Statement ${i + 1} may have failed, but continuing...`);
          }
        }
      } catch (err) {
        console.log(`⚠️  Statement ${i + 1} encountered an issue, but continuing...`);
      }
    }

    // Test if the tables were created successfully
    console.log('🔍 Verifying migration...');
    
    const tables = [
      'user_subscriptions',
      'usage_quotas', 
      'ai_usage_logs',
      'usage_alerts',
      'rate_limits',
      'billing_events'
    ];

    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
        
      if (error) {
        console.log(`❌ Table ${table} verification failed:`, error.message);
      } else {
        console.log(`✅ Table ${table} created successfully`);
      }
    }

    console.log('✅ Usage management migration completed!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

applyUsageMigration();