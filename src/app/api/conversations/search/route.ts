import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { conversationService } from '@/lib/conversations/conversation-service';
import { withAPIErrorHandling } from '@/lib/errors';

export const GET = withAPIErrorHandling(async (request: NextRequest) => {
  console.log('[Conversations][SEARCH] Starting request');
  
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.log('[Conversations][SEARCH] Unauthorized access attempt');
    throw new Error('Unauthorized');
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  const query = searchParams.get('query');
  const conversationIds = searchParams.get('conversationIds')?.split(',') || undefined;
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  if (!projectId || !query) {
    throw new Error('Project ID and search query are required');
  }

  console.log('[Conversations][SEARCH] Searching messages:', {
    projectId,
    query,
    conversationIds,
    limit,
    offset,
    userId: user.id
  });

  const result = await conversationService.searchMessages(user.id, projectId, query, {
    conversationIds,
    limit,
    offset
  });

  console.log('[Conversations][SEARCH] Search results:', {
    messageCount: result.messages.length,
    total: result.total
  });

  return result;
});