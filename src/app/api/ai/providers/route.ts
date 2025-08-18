import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { aiProviderService } from '@/lib/ai/service';
import { AIProviderType } from '@/lib/ai/providers';
import { withAPIErrorHandling } from '@/lib/errors';

export const GET = withAPIErrorHandling(async (request: NextRequest) => {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const providers = await aiProviderService.getProviders(user.id);
  
  // Remove sensitive data before sending to client
  const sanitizedProviders = providers.map(provider => ({
    ...provider,
    apiKeyEncrypted: '***' // Hide encrypted key from client
  }));

  return NextResponse.json({ providers: sanitizedProviders });
});

export const POST = withAPIErrorHandling(async (request: NextRequest) => {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { provider, apiKey, settings } = body;

  // Basic server-side logging (no API key) for diagnostics
  console.info('[AI Provider][CREATE] Incoming request', {
    userId: user.id,
    provider,
    hasApiKey: typeof apiKey === 'string' && apiKey.length > 0,
    hasSettings: !!settings,
  });

  if (!provider || !apiKey) {
    return NextResponse.json(
      { success: false, message: 'Provider and API key are required' },
      { status: 400 }
    );
  }

  // Validate provider type
  const validProviders: AIProviderType[] = ['openai', 'anthropic', 'straico', 'cohere'];
  if (!validProviders.includes(provider)) {
    return NextResponse.json(
      { success: false, message: 'Invalid provider type' },
      { status: 400 }
    );
  }
  try {
    const newProvider = await aiProviderService.createProvider(
      user.id,
      provider,
      apiKey,
      settings
    );

    // Remove sensitive data before sending to client
    const sanitizedProvider = {
      ...newProvider,
      apiKeyEncrypted: '***'
    };

    return NextResponse.json({ success: true, provider: sanitizedProvider }, { status: 201 });
  } catch (error: any) {
    // Supabase errors have a 'code' and 'message'; generic JS errors may not
    const rawMessage: string = error?.message || 'Unknown error';
    const code: string | undefined = error?.code;

    // Map to user-friendly messages & status codes
    let status = 500;
    let message = 'Failed to add provider';
    if (/invalid api key format/i.test(rawMessage)) {
      status = 400;
      message = 'API key format is invalid for this provider.';
    } else if (code === '23505' || /duplicate|already exists/i.test(rawMessage)) { // unique_violation
      status = 409;
      message = 'This provider is already configured. It has been updated instead.';
    } else if (/decrypt/i.test(rawMessage)) {
      status = 500;
      message = 'Stored API key could not be processed.';
    }

    console.error('[AI Provider][CREATE] Error', {
      userId: user.id,
      provider,
      status,
      code,
      rawMessage,
    });

    return NextResponse.json({ success: false, message }, { status });
  }
});