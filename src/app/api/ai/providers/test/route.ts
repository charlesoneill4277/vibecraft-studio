import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AIProviderType, validateApiKeyFormat } from '@/lib/ai/providers';
import { withAPIErrorHandling } from '@/lib/errors';

interface TestResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Get user-friendly error message for API key format issues
 */
function getApiKeyFormatError(provider: AIProviderType): string {
  switch (provider) {
    case 'openai':
      return 'Invalid OpenAI API key format. Expected format: sk-... (starts with "sk-" and at least 20 characters)';
    case 'anthropic':
      return 'Invalid Anthropic API key format. Expected format: sk-ant-... (starts with "sk-ant-" and at least 20 characters)';
    case 'straico':
      return 'Invalid Straico API key format. API key should be at least 10 characters long';
    case 'cohere':
      return 'Invalid Cohere API key format. Expected format: co_... (starts with "co_" and at least 20 characters)';
    default:
      return 'Invalid API key format for this provider';
  }
}

/**
 * Test API connection for different providers
 */
async function testProviderConnection(provider: AIProviderType, apiKey: string): Promise<TestResult> {
  switch (provider) {
    case 'openai':
      return testOpenAIConnection(apiKey);
    case 'anthropic':
      return testAnthropicConnection(apiKey);
    case 'straico':
      return testStraicoConnection(apiKey);
    case 'cohere':
      return testCohereConnection(apiKey);
    default:
      return { success: false, error: 'Unsupported provider' };
  }
}

/**
 * Test OpenAI API connection
 */
async function testOpenAIConnection(apiKey: string): Promise<TestResult> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      return { success: true, message: 'OpenAI API key is valid' };
    } else if (response.status === 401) {
      return { success: false, error: 'Invalid OpenAI API key' };
    } else {
      return { success: false, error: `OpenAI API error: ${response.status}` };
    }
  } catch (error) {
    return { success: false, error: 'Failed to connect to OpenAI API' };
  }
}

/**
 * Test Anthropic API connection
 */
async function testAnthropicConnection(apiKey: string): Promise<TestResult> {
  try {
    // Test with a minimal message request
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    });

    if (response.ok) {
      return { success: true, message: 'Anthropic API key is valid' };
    } else if (response.status === 401) {
      return { success: false, error: 'Invalid Anthropic API key' };
    } else if (response.status === 403) {
      return { success: false, error: 'Anthropic API key does not have permission' };
    } else {
      return { success: false, error: `Anthropic API error: ${response.status}` };
    }
  } catch (error) {
    return { success: false, error: 'Failed to connect to Anthropic API' };
  }
}

/**
 * Test Straico API connection
 */
async function testStraicoConnection(apiKey: string): Promise<TestResult> {
  try {
    // Use the lightweight models endpoint for API key validation (per Straico docs)
    // This only requires auth and returns quickly, ideal for key testing.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout
    const url = 'https://api.straico.com/v1/models';

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        // IMPORTANT: exact format 'Bearer <key>' with single space
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      },
      signal: controller.signal,
    }).catch(err => {
      // fetch throws on abort / network
      throw err;
    }).finally(() => clearTimeout(timeout));

    if (response.ok) {
      return { success: true, message: 'Straico API key is valid' };
    }

    // Capture body (without leaking key) for server-side diagnostics
    let rawBody = '';
    try {
      rawBody = await response.text();
    } catch {
      rawBody = '<unreadable body>';
    }
    const truncatedBody = rawBody.length > 500 ? rawBody.slice(0, 500) + '…(truncated)' : rawBody;

    // Attempt to parse JSON error for logging clarity
    let parsedMessage: string | undefined;
    try {
      const parsed = JSON.parse(rawBody);
      parsedMessage = parsed.error?.message || parsed.message;
    } catch {/* ignore */}

    // Structured server-side log (do NOT include apiKey)
    console.error('[Straico Test] Key validation failed', {
      status: response.status,
      statusText: response.statusText,
      endpoint: url,
      message: parsedMessage,
      body: truncatedBody,
    });

    if (response.status === 401) {
      return { success: false, error: 'Invalid Straico API key' };
    }
    if (response.status === 403) {
      return { success: false, error: 'Straico API key lacks required permissions' };
    }
    if (response.status === 429) {
      return { success: false, error: 'Straico rate limit exceeded (try again later)' };
    }

    return { success: false, error: 'Straico API key test failed' };
  } catch (error) {
    // Network / timeout / unexpected errors
    const isAbort = (error instanceof Error) && error.name === 'AbortError';
    console.error('[Straico Test] Request error', {
      type: isAbort ? 'timeout' : 'network',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    return {
      success: false,
      error: isAbort ? 'Straico API key test timed out' : 'Straico API key test failed'
    };
  }
}

/**
 * Test Cohere API connection
 */
async function testCohereConnection(apiKey: string): Promise<TestResult> {
  try {
    const response = await fetch('https://api.cohere.ai/v1/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'command-light',
        prompt: 'Hi',
        max_tokens: 1,
      }),
    });

    if (response.ok) {
      return { success: true, message: 'Cohere API key is valid' };
    } else if (response.status === 401) {
      return { success: false, error: 'Invalid Cohere API key' };
    } else {
      return { success: false, error: `Cohere API error: ${response.status}` };
    }
  } catch (error) {
    return { success: false, error: 'Failed to connect to Cohere API' };
  }
}

export const POST = withAPIErrorHandling(async (request: NextRequest) => {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { provider, apiKey } = body;

  if (!provider || !apiKey) {
    return NextResponse.json(
      { error: 'Provider and API key are required' },
      { status: 400 }
    );
  }

  // Validate provider type
  const validProviders: AIProviderType[] = ['openai', 'anthropic', 'straico', 'cohere'];
  if (!validProviders.includes(provider)) {
    return NextResponse.json(
      { error: 'Invalid provider type' },
      { status: 400 }
    );
  }

  // Test the API key format
  const isValidFormat = validateApiKeyFormat(provider, apiKey);
  
  if (!isValidFormat) {
    return NextResponse.json(
      { 
        valid: false, 
        error: getApiKeyFormatError(provider)
      },
      { status: 400 }
    );
  }

  // Test the actual API connection
  const testResult = await testProviderConnection(provider, apiKey);
  
  if (testResult.success) {
    return NextResponse.json({ 
      valid: true, 
      message: testResult.message || 'API key is valid and working' 
    });
  } else {
    return NextResponse.json(
      { 
        valid: false, 
        error: testResult.error || 'API key test failed' 
      },
      { status: 400 }
    );
  }
});