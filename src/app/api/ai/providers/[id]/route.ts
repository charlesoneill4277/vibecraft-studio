import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { aiProviderService } from '@/lib/ai/service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const provider = await aiProviderService.getProvider(id);
    
    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    // Check if user owns this provider
    if (provider.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Remove sensitive data before sending to client
    const sanitizedProvider = {
      ...provider,
      apiKeyEncrypted: '***'
    };

    return NextResponse.json({ provider: sanitizedProvider });
  } catch (error) {
    console.error('Error fetching AI provider:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI provider' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const provider = await aiProviderService.getProvider(id);
    
    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    // Check if user owns this provider
    if (provider.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { isActive, settings } = body;

    const updates: any = {};
    if (typeof isActive === 'boolean') {
      updates.is_active = isActive;
    }
    if (settings) {
      updates.settings = settings;
    }

    const updatedProvider = await aiProviderService.updateProvider(id, updates);

    // Remove sensitive data before sending to client
    const sanitizedProvider = {
      ...updatedProvider,
      apiKeyEncrypted: '***'
    };

    return NextResponse.json({ provider: sanitizedProvider });
  } catch (error) {
    console.error('Error updating AI provider:', error);
    return NextResponse.json(
      { error: 'Failed to update AI provider' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const provider = await aiProviderService.getProvider(id);
    
    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    // Check if user owns this provider
    if (provider.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await aiProviderService.deleteProvider(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting AI provider:', error);
    return NextResponse.json(
      { error: 'Failed to delete AI provider' },
      { status: 500 }
    );
  }
}