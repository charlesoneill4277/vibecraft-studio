#!/usr/bin/env tsx

/**
 * Test script for Straico API integration
 * This script tests the Straico API integration without requiring a full app setup
 */

import { validateApiKeyFormat } from '../src/lib/ai/providers';

console.log('🧪 Testing Straico Integration\n');

// Test 1: API Key Format Validation
console.log('1. ✅ API Key Format Validation:');
console.log('   • Valid key (standard): ', validateApiKeyFormat('straico', 'valid-straico-api-key-12345'));
console.log('   • Valid key (sk- format): ', validateApiKeyFormat('straico', 'sk-1234567890abcdef1234567890abcdef'));
console.log('   • Invalid key (too short): ', validateApiKeyFormat('straico', 'short'));
console.log('   • Invalid key (empty): ', validateApiKeyFormat('straico', ''));
console.log('');

// Test 2: API Connection Test
console.log('2. 🔗 API Connection Test:');
console.log('   Note: To test actual API connection, set STRAICO_API_KEY environment variable');

const testApiKey = process.env.STRAICO_API_KEY;
if (testApiKey) {
  console.log('   • API key found in environment');
  console.log('   • Key format valid: ', validateApiKeyFormat('straico', testApiKey));
  
  // Test actual API connection
  testStraicoConnection(testApiKey).then(result => {
    if (result.success) {
      console.log('   • ✅ API connection successful:', result.message);
    } else {
      console.log('   • ❌ API connection failed:', result.error);
    }
  }).catch(error => {
    console.log('   • ❌ API test error:', error.message);
  });
} else {
  console.log('   • ⚠️  No API key found in environment (STRAICO_API_KEY)');
  console.log('   • To test API connection, run: STRAICO_API_KEY=your_key npm run test:straico');
}
console.log('');

// Test 3: Model Configuration
console.log('3. 📋 Model Configuration:');
import { getProviderConfig } from '../src/lib/ai/providers';
const straicoConfig = getProviderConfig('straico');
console.log('   • Provider name:', straicoConfig.displayName);
console.log('   • Base URL:', straicoConfig.baseUrl);
console.log('   • Available models:', straicoConfig.models.length);
straicoConfig.models.forEach(model => {
  console.log(`     - ${model.name} (${model.id})`);
});
console.log('');

console.log('🎉 Straico integration test completed!');

/**
 * Test Straico API connection
 */
async function testStraicoConnection(apiKey: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await fetch('https://api.straico.com/v0/prompt/completion', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        smart_llm_selector: true,
        messages: [
          { role: 'user', content: 'Hi' }
        ],
        max_tokens: 1,
        temperature: 0.1,
      }),
    });

    if (response.ok) {
      return { success: true, message: 'Straico API key is valid and working' };
    } else if (response.status === 401) {
      return { success: false, error: 'Invalid or expired Straico API key. Please check your API key is correct and active.' };
    } else if (response.status === 403) {
      return { success: false, error: 'API key does not have permission to access this resource' };
    } else if (response.status === 429) {
      return { success: false, error: 'Rate limit exceeded' };
    } else {
      const errorText = await response.text();
      let errorMessage = `API error: ${response.status}`;
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error?.message || errorData.message || errorMessage;
      } catch {
        errorMessage += ` ${errorText}`;
      }
      
      return { success: false, error: errorMessage };
    }
  } catch (error) {
    return { 
      success: false, 
      error: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}