import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { aiUsageTracker } from '@/lib/ai/usage-tracker';
import { AIProviderType } from '@/lib/ai/providers';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider') as AIProviderType;

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider parameter is required' },
        { status: 400 }
      );
    }

    const quota = await aiUsageTracker.checkQuota(user.id, provider);
    return NextResponse.json({ quota });
  } catch (error) {
    console.error('Error fetching quota data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quota data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { provider, monthlyLimit, costLimit } = body;

    if (!provider || typeof monthlyLimit !== 'number' || typeof costLimit !== 'number') {
      return NextResponse.json(
        { error: 'Provider, monthlyLimit, and costLimit are required' },
        { status: 400 }
      );
    }

    await aiUsageTracker.setQuota(user.id, provider, monthlyLimit, costLimit);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error setting quota:', error);
    return NextResponse.json(
      { error: 'Failed to set quota' },
      { status: 500 }
    );
  }
}