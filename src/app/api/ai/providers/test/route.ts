import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AIProviderType, validateApiKeyFormat } from '@/lib/ai/providers';

export async function POST(request: NextRequest) {
  try {
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
          error: 'Invalid API key format for this provider' 
        },
        { status: 400 }
      );
    }

    // For now, we'll just validate the format
    // In a full implementation, we would make a test request to the provider's API
    // to verify the key actually works
    
    return NextResponse.json({ 
      valid: true, 
      message: 'API key format is valid' 
    });
  } catch (error) {
    console.error('Error testing API key:', error);
    return NextResponse.json(
      { error: 'Failed to test API key' },
      { status: 500 }
    );
  }
}