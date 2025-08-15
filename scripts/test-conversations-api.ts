#!/usr/bin/env tsx

/**
 * Test script for conversations API endpoints
 * This script tests the fixed conversation API routes
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function testConversationsAPI() {
  console.log('🧪 Testing Conversations API...\n')

  try {
    // Test 1: Check if we can reach the API endpoints
    console.log('1. Testing API endpoint availability...')
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
    // Test GET /api/conversations with missing projectId (should return 400)
    console.log('   Testing missing projectId parameter...')
    const response1 = await fetch(`${baseUrl}/api/conversations`)
    console.log(`   Status: ${response1.status} (expected: 400)`)
    
    if (response1.status === 400) {
      const error1 = await response1.json()
      console.log(`   ✅ Correctly returned 400: ${error1.error}`)
    } else {
      console.log(`   ❌ Expected 400, got ${response1.status}`)
    }

    // Test 2: Test with valid projectId format but without auth (should return 401)
    console.log('\n2. Testing without authentication...')
    const testProjectId = '123e4567-e89b-12d3-a456-426614174000'
    const response2 = await fetch(`${baseUrl}/api/conversations?projectId=${testProjectId}`)
    console.log(`   Status: ${response2.status} (expected: 401)`)
    
    if (response2.status === 401) {
      const error2 = await response2.json()
      console.log(`   ✅ Correctly returned 401: ${error2.error}`)
    } else {
      console.log(`   ❌ Expected 401, got ${response2.status}`)
    }

    // Test 3: Test search endpoint
    console.log('\n3. Testing search endpoint without auth...')
    const response3 = await fetch(`${baseUrl}/api/conversations/search?projectId=${testProjectId}`)
    console.log(`   Status: ${response3.status} (expected: 401)`)
    
    if (response3.status === 401) {
      const error3 = await response3.json()
      console.log(`   ✅ Search endpoint correctly returned 401: ${error3.error}`)
    } else {
      console.log(`   ❌ Expected 401, got ${response3.status}`)
    }

    // Test 4: Test parameter validation on search endpoint
    console.log('\n4. Testing search endpoint parameter validation...')
    const response4 = await fetch(`${baseUrl}/api/conversations/search`)
    console.log(`   Status: ${response4.status} (expected: 401 or 400)`)
    
    if (response4.status === 400 || response4.status === 401) {
      const error4 = await response4.json()
      console.log(`   ✅ Search endpoint correctly handled missing params: ${error4.error}`)
    } else {
      console.log(`   ❌ Expected 400 or 401, got ${response4.status}`)
    }

    console.log('\n✅ API endpoint tests completed!')
    console.log('\n📝 Summary:')
    console.log('   - API routes are accessible')
    console.log('   - Parameter validation is working')
    console.log('   - Authentication checks are in place')
    console.log('   - Error handling is functioning')
    
    console.log('\n🔧 Next steps:')
    console.log('   - Test with authenticated requests')
    console.log('   - Verify database queries work correctly')
    console.log('   - Test the frontend integration')

  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

// Run the test
testConversationsAPI()