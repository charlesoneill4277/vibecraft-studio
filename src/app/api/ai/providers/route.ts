import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { aiProviderService } from '@/lib/ai/service';
import { ServerDatabaseClient } from '@/lib/supabase/database';
import { AIProviderType } from '@/lib/ai/providers';
import { withAPIErrorHandling } from '@/lib/errors';

export const GET = withAPIErrorHandling(async (request: NextRequest) => {
  console.log('[AI Provider][GET] Starting request');
  
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  console.log('[AI Provider][GET] Auth check:', { 
    hasUser: !!user, 
    hasAuthError: !!authError,
    userId: user?.id 
  });

  if (authError || !user) {
    console.log('[AI Provider][GET] Unauthorized access attempt');
    throw new Error('Unauthorized');
  }

  const providers = await aiProviderService.getProviders(user.id);
  console.log('[AI Provider][GET] Retrieved providers:', { count: providers.length });
  
  // Remove sensitive data before sending to client
  const sanitizedProviders = providers.map(provider => ({
    ...provider,
    apiKeyEncrypted: '***' // Hide encrypted key from client
  }));

  console.log('[AI Provider][GET] Returning sanitized providers');
  return { providers: sanitizedProviders };
});

export const POST = withAPIErrorHandling(async (request: NextRequest) => {
  console.log('[AI Provider][CREATE] Starting POST request');
  
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  console.log('[AI Provider][CREATE] Auth check:', { 
    hasUser: !!user, 
    hasAuthError: !!authError,
    userId: user?.id 
  });

  if (authError || !user) {
    console.log('[AI Provider][CREATE] Unauthorized access attempt');
    throw new Error('Unauthorized');
  }

  const body = await request.json();
  const { provider, apiKey, settings } = body;

  // Basic server-side logging (no API key) for diagnostics
  console.log('[AI Provider][CREATE] Incoming request', {
    userId: user.id,
    provider,
    hasApiKey: typeof apiKey === 'string' && apiKey.length > 0,
    hasSettings: !!settings,
  });

  if (!provider || !apiKey) {
    throw new Error('Provider and API key are required');
  }

  // Validate provider type
  const validProviders: AIProviderType[] = ['openai', 'anthropic', 'straico', 'cohere'];
  if (!validProviders.includes(provider)) {
    throw new Error('Invalid provider type');
  }
  
  try {
    console.log('[AI Provider][CREATE] Creating ServerDatabaseClient');
    const serverDb = new ServerDatabaseClient(supabase);
    
    console.log('[AI Provider][CREATE] Calling aiProviderService.createProvider');
    const newProvider = await aiProviderService.createProvider(
      user.id,
      provider,
      apiKey,
      settings,
      serverDb
    );

    console.log('[AI Provider][CREATE] Provider created successfully:', {
      id: newProvider.id,
      provider: newProvider.provider,
      userId: newProvider.userId
    });

    // Remove sensitive data before sending to client
    const sanitizedProvider = {
      ...newProvider,
      apiKeyEncrypted: '***'
    };

    console.log('[AI Provider][CREATE] Success', { 
      userId: user.id, 
      providerId: newProvider.id, 
      provider: newProvider.provider 
    });

    return { success: true, provider: sanitizedProvider };
  } catch (error: any) {
    // Supabase errors have a 'code' and 'message'; generic JS errors may not
    const rawMessage: string = error?.message || 'Unknown error';
    const code: string | undefined = error?.code;

    console.error('[AI Provider][CREATE] Error', {
      userId: user.id,
      provider,
      code,
      rawMessage,
    });

    // Re-throw with appropriate message for the error handler
    if (/invalid api key format/i.test(rawMessage)) {
      throw new Error('API key format is invalid for this provider.');
    } else if (code === '23505' || /duplicate|already exists/i.test(rawMessage)) {
      throw new Error('This provider is already configured. It has been updated instead.');
    } else if (code === '42501' || /permission denied/i.test(rawMessage)) {
      throw new Error('Permission denied inserting provider (RLS). Please retry after policy update.');
    } else if (/decrypt/i.test(rawMessage)) {
      throw new Error('Stored API key could not be processed.');
    }

    throw new Error('Failed to add provider');
  }
});