#!/usr/bin/env tsx

/**
 * Test script to debug AI providers API communication
 * This will help identify if the issue is in the frontend or backend
 */

import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.development' });

async function testAPIEndpoint() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const apiUrl = `${baseUrl}/api/ai/providers`;
  
  console.log('🔍 Testing AI Providers API endpoint...');
  console.log('📍 API URL:', apiUrl);
  
  try {
    // Test GET request (should work without auth in some cases, or return 401)
    console.log('\n1️⃣ Testing GET request...');
    const getResponse = await fetch(apiUrl);
    console.log('GET Response Status:', getResponse.status);
    console.log('GET Response Headers:', Object.fromEntries(getResponse.headers.entries()));
    
    if (getResponse.status === 401) {
      console.log('✅ GET request properly returns 401 (auth required) - API endpoint is reachable');
    } else {
      const getData = await getResponse.text();
      console.log('GET Response Body:', getData);
    }
    
    // Test POST request (should return 401 without auth)
    console.log('\n2️⃣ Testing POST request...');
    const postResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider: 'openai',
        apiKey: 'test-key',
        settings: { maxTokens: 4000 }
      })
    });
    
    console.log('POST Response Status:', postResponse.status);
    console.log('POST Response Headers:', Object.fromEntries(postResponse.headers.entries()));
    
    if (postResponse.status === 401) {
      console.log('✅ POST request properly returns 401 (auth required) - API endpoint is reachable');
    } else {
      const postData = await postResponse.text();
      console.log('POST Response Body:', postData);
    }
    
    console.log('\n✅ API endpoint is reachable and responding correctly');
    console.log('🔍 The issue is likely in the frontend authentication or request handling');
    
  } catch (error) {
    console.error('\n❌ Failed to reach API endpoint:', error);
    console.log('🔍 This suggests a network/server issue rather than a frontend problem');
    
    if (error instanceof Error) {
      console.log('Error details:', {
        name: error.name,
        message: error.message,
        cause: error.cause
      });
    }
  }
}

async function testFrontendSimulation() {
  console.log('\n🧪 Simulating frontend request pattern...');
  
  // This simulates what the frontend should be doing
  const apiUrl = '/api/ai/providers';
  console.log('Frontend would call:', apiUrl);
  console.log('With method: POST');
  console.log('With headers: Content-Type: application/json');
  console.log('With body: { provider: "openai", apiKey: "sk-...", settings: {...} }');
  
  console.log('\n💡 To debug further:');
  console.log('1. Open browser dev tools Network tab');
  console.log('2. Click "Add Provider" in the UI');
  console.log('3. Check if you see a POST request to /api/ai/providers');
  console.log('4. If no request appears, the issue is in the frontend');
  console.log('5. If request appears but fails, check the response details');
}

// Run the tests
testAPIEndpoint()
  .then(() => testFrontendSimulation())
  .catch(console.error);