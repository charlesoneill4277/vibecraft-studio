#!/usr/bin/env tsx

/**
 * Direct database test to verify AI providers table and operations
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config({ path: '.env.development' });

async function testDatabaseDirect() {
  console.log('🔍 Testing direct database operations...');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase configuration');
    return;
  }
  
  console.log('📍 Supabase URL:', supabaseUrl);
  
  // Create admin client with service role key
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  try {
    // Test 1: Check if ai_providers table exists
    console.log('\n1️⃣ Testing table existence...');
    const { data: tables, error: tablesError } = await supabase
      .from('ai_providers')
      .select('id')
      .limit(1);
    
    if (tablesError) {
      console.error('❌ Table does not exist or is not accessible:', tablesError);
      return;
    }
    
    console.log('✅ ai_providers table exists and is accessible');
    
    // Test 2: Check table structure
    console.log('\n2️⃣ Testing table structure...');
    const { data: structure, error: structureError } = await supabase
      .from('ai_providers')
      .select('*')
      .limit(0); // Get structure without data
    
    if (structureError) {
      console.error('❌ Could not get table structure:', structureError);
    } else {
      console.log('✅ Table structure accessible');
    }
    
    // Test 3: Check if there are any users in the system
    console.log('\n3️⃣ Checking for existing users...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .limit(5);
    
    if (usersError) {
      console.log('⚠️ Could not check users:', usersError);
    } else {
      console.log(`📊 Found ${users?.length || 0} users in the system`);
      if (users && users.length > 0) {
        console.log('👤 Sample user:', users[0]);
      }
    }
    
    // Test 4: Try to insert a test record (will fail due to RLS, but we can see the error)
    console.log('\n4️⃣ Testing insert operation (expect RLS error)...');
    const testUserId = users && users.length > 0 ? users[0].id : '00000000-0000-0000-0000-000000000000';
    const testProvider = {
      user_id: testUserId,
      provider: 'openai',
      api_key_encrypted: 'test-encrypted-key',
      is_active: true,
      settings: { maxTokens: 4000 }
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('ai_providers')
      .insert(testProvider)
      .select();
    
    if (insertError) {
      console.log('📝 Insert error (expected due to RLS):', {
        code: insertError.code,
        message: insertError.message
      });
      
      if (insertError.code === '42501') {
        console.log('✅ RLS is working correctly (permission denied)');
      } else if (insertError.message.includes('auth.uid()')) {
        console.log('✅ RLS policy requires authentication');
      } else {
        console.log('⚠️ Unexpected error type');
      }
    } else {
      console.log('✅ Insert succeeded:', insertData);
      
      // Clean up
      if (insertData && insertData[0]) {
        await supabase
          .from('ai_providers')
          .delete()
          .eq('id', insertData[0].id);
        console.log('🧹 Cleaned up test record');
      }
    }
    
    // Test 5: Check RLS policies
    console.log('\n5️⃣ Checking RLS policies...');
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'ai_providers');
    
    if (policiesError) {
      console.log('⚠️ Could not check policies:', policiesError);
    } else {
      console.log('📋 RLS Policies found:', policies?.length || 0);
      policies?.forEach(policy => {
        console.log(`  - ${policy.policyname}: ${policy.cmd} (${policy.permissive})`);
      });
    }
    
    console.log('\n✅ Database test completed');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  }
}

// Run the test
testDatabaseDirect().catch(console.error);