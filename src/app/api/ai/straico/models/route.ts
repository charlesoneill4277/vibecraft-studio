import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withAPIErrorHandling } from '@/lib/errors';
import { fetchStraicoModels } from '@/lib/ai/straico-utils';
import { aiProviderService } from '@/lib/ai/service';

/**
 * GET /api/ai/straico/models
 * Fetch available models from Straico API
 */
export const GET = withAPIErrorHandling(async (request: NextRequest) => {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get the user's Straico provider configuration
  const providers = await aiProviderService.getProviders(user.id);
  const straicoProvider = providers.find(p => p.provider === 'straico' && p.isActive);

  if (!straicoProvider) {
    return NextResponse.json(
      { error: 'No active Straico provider found. Please configure your Straico API key first.' },
      { status: 400 }
    );
  }

  try {
    // Get the decrypted API key
    const apiKey = await aiProviderService.getDecryptedApiKey(straicoProvider.id);
    
    // Fetch models from Straico API
    const models = await fetchStraicoModels(apiKey);
    
    return NextResponse.json({ 
      models,
      count: models.length,
      provider: 'straico'
    });
  } catch (error) {
    console.error('Error fetching Straico models:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('401')) {
        return NextResponse.json(
          { error: 'Invalid Straico API key. Please check your configuration.' },
          { status: 401 }
        );
      } else if (error.message.includes('403')) {
        return NextResponse.json(
          { error: 'Straico API key does not have permission to access models.' },
          { status: 403 }
        );
      } else if (error.message.includes('429')) {
        return NextResponse.json(
          { error: 'Straico API rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
      
      return NextResponse.json(
        { error: `Failed to fetch models: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch Straico models' },
      { status: 500 }
    );
  }
});