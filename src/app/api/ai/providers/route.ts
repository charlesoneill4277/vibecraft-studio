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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { provider, apiKey, settings } = body;

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

  return NextResponse.json({ provider: sanitizedProvider }, { status: 201 });
});