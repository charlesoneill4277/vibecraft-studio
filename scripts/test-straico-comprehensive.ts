#!/usr/bin/env tsx

/**
 * Comprehensive test for Straico API integration
 * Tests the complete flow from API key validation to actual API calls
 */

import { validateApiKeyFormat, getProviderConfig } from '../src/lib/ai/providers';

console.log('🧪 Comprehensive Straico Integration Test\n');

// Test 1: Configuration Validation
console.log('1. ✅ Configuration Validation:');
const straicoConfig = getProviderConfig('straico');
console.log(`   • Provider name: ${straicoConfig.displayName}`);
console.log(`   • Base URL: ${straicoConfig.baseUrl}`);
console.log(`   • API key format: ${straicoConfig.apiKeyPlaceholder}`);
console.log(`   • Available models: ${straicoConfig.models.length}`);
straicoConfig.models.forEach(model => {
  console.log(`     - ${model.name} (${model.id}) - Max tokens: ${model.maxTokens}`);
});
console.log('');

// Test 2: API Key Format Validation
console.log('2. ✅ API Key Format Validation:');
const testCases = [
  { key: 'valid-straico-api-key-12345', expected: true, description: 'Valid Straico API key' },
  { key: 'another-valid-key-67890', expected: true, description: 'Another valid key' },
  { key: 'sk-1234567890abcdef1234567890abcdef', expected: true, description: 'sk- format also valid' },
  { key: 'short', expected: false, description: 'Too short (less than 10 chars)' },
  { key: 'a1b2c3d4e5f', expected: true, description: 'Minimum length key (11 chars)' },
  { key: '', expected: false, description: 'Empty key' },
];

testCases.forEach(test => {
  const result = validateApiKeyFormat('straico', test.key);
  const status = result === test.expected ? '✅' : '❌';
  console.log(`   ${status} ${test.description}: ${result}`);
});
console.log('');

// Test 3: API Connection Test
async function runAPITests() {
  console.log('3. 🔗 API Connection Test:');
  const testApiKey = process.env.STRAICO_API_KEY;

  if (!testApiKey) {
    console.log('   ⚠️  No STRAICO_API_KEY environment variable found');
    console.log('   📝 To test API connection:');
    console.log('      export STRAICO_API_KEY=your_actual_key');
    console.log('      npm run ai:test-straico-comprehensive');
    console.log('');
  } else {
    console.log('   🔑 API key found in environment');
    console.log(`   📏 Key length: ${testApiKey.length} characters`);
    console.log(`   ✅ Format valid: ${validateApiKeyFormat('straico', testApiKey)}`);
    
    // Test actual API connection
    await testStraicoAPI(testApiKey);
  }

  // Test 4: Error Handling Scenarios
  console.log('4. 🛡️  Error Handling Test:');
  await testErrorScenarios();

  console.log('🎉 Comprehensive Straico integration test completed!');
}

// Run the async tests
runAPITests().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});

/**
 * Test actual Straico API connection
 */
async function testStraicoAPI(apiKey: string) {
  console.log('   🌐 Testing API connection...');
  
  try {
    // Test 1: Simple completion request
    const response = await fetch('https://api.straico.com/v0/prompt/completion', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        smart_llm_selector: true,
        messages: [
          { role: 'user', content: 'Say "Hello, Straico!" in exactly those words.' }
        ],
        max_tokens: 10,
        temperature: 0.1,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ API connection successful');
      console.log(`   📝 Response preview: ${JSON.stringify(data).substring(0, 100)}...`);
      
      // Test different models if available
      await testDifferentModels(apiKey);
    } else {
      const errorText = await response.text();
      console.log(`   ❌ API connection failed: ${response.status}`);
      console.log(`   📄 Error details: ${errorText.substring(0, 200)}...`);
      
      // Provide specific guidance based on error
      if (response.status === 401) {
        console.log('   💡 This usually means the API key is invalid or expired');
      } else if (response.status === 403) {
        console.log('   💡 This usually means the API key lacks permission for this resource');
      } else if (response.status === 429) {
        console.log('   💡 This usually means you\'ve hit the rate limit');
      }
    }
  } catch (error) {
    console.log(`   ❌ Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.log('   💡 This usually means network connectivity issues or incorrect API endpoint');
  }
  console.log('');
}

/**
 * Test different Straico models
 */
async function testDifferentModels(apiKey: string) {
  console.log('   🎯 Testing different models...');
  
  const modelsToTest = [
    'openai/gpt-3.5-turbo',
    'openai/gpt-4',
    'anthropic/claude-3-sonnet',
    'anthropic/claude-3-opus'
  ];

  for (const model of modelsToTest) {
    try {
      const response = await fetch('https://api.straico.com/v0/prompt/completion', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'user', content: 'Hi' }
          ],
          max_tokens: 1,
          temperature: 0.1,
        }),
      });

      if (response.ok) {
        console.log(`   ✅ ${model}: Available`);
      } else {
        console.log(`   ❌ ${model}: Not available (${response.status})`);
      }
    } catch (error) {
      console.log(`   ❌ ${model}: Error testing`);
    }
  }
  console.log('');
}

/**
 * Test error handling scenarios
 */
async function testErrorScenarios() {
  const errorTests = [
    {
      name: 'Invalid API key',
      apiKey: 'sk-invalid-key-123456789012345678901234',
      expectedStatus: 401
    },
    {
      name: 'Malformed API key',
      apiKey: 'not-a-valid-key-format',
      expectedStatus: 401
    },
    {
      name: 'Empty API key',
      apiKey: '',
      expectedStatus: 401
    }
  ];

  for (const test of errorTests) {
    try {
      console.log(`   🧪 Testing: ${test.name}`);
      
      const response = await fetch('https://api.straico.com/v0/prompt/completion', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${test.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          smart_llm_selector: true,
          messages: [
            { role: 'user', content: 'Hi' }
          ],
          max_tokens: 1,
        }),
      });

      if (response.status === test.expectedStatus) {
        console.log(`   ✅ Correctly returned ${response.status} for ${test.name}`);
      } else {
        console.log(`   ⚠️  Expected ${test.expectedStatus}, got ${response.status} for ${test.name}`);
      }
    } catch (error) {
      console.log(`   ❌ Network error testing ${test.name}: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }
  console.log('');
}