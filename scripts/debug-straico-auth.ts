#!/usr/bin/env tsx

/**
 * Debug script to test different Straico authentication formats
 */

const testApiKey = '8u-ZpVXpYSJmwZNWtQuCsTUMXM6qVZMRs2BVOJi8x6ehyIoyMcsH';

console.log('🔍 Testing different Straico authentication formats\n');

async function testAuthFormat(name: string, headers: Record<string, string>) {
  console.log(`Testing ${name}:`);
  try {
    const response = await fetch('https://api.straico.com/v0/prompt/completion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({
        smart_llm_selector: true,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 1,
      }),
    });

    console.log(`   Status: ${response.status}`);
    const responseText = await response.text();
    console.log(`   Response: ${responseText.substring(0, 100)}...`);
  } catch (error) {
    console.log(`   Error: ${error}`);
  }
  console.log('');
}

async function runTests() {
  // Test 1: Bearer format (current)
  await testAuthFormat('Bearer format', {
    'Authorization': `Bearer ${testApiKey}`
  });

  // Test 2: Direct API key
  await testAuthFormat('Direct API key', {
    'Authorization': testApiKey
  });

  // Test 3: X-API-Key header
  await testAuthFormat('X-API-Key header', {
    'X-API-Key': testApiKey
  });

  // Test 4: API-Key header
  await testAuthFormat('API-Key header', {
    'API-Key': testApiKey
  });
}

runTests().catch(console.error);