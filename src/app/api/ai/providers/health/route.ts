import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { enhancedChatService } from '@/lib/ai/enhanced-chat-service';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const health = await enhancedChatService.getProviderHealth();
    const cacheStats = enhancedChatService.getCacheStats();

    return NextResponse.json({ 
      health,
      cache: cacheStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting provider health:', error);
    return NextResponse.json(
      { error: 'Failed to get provider health' },
      { status: 500 }
    );
  }
}