import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { conversationService } from '@/lib/conversations/conversation-service';
import { withAPIErrorHandling } from '@/lib/errors';

export const GET = withAPIErrorHandling(async (request: NextRequest) => {
  console.log('[Conversations][GET] Starting request');
  
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.log('[Conversations][GET] Unauthorized access attempt');
    throw new Error('Unauthorized');
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  const query = searchParams.get('query') || undefined;
  const tags = searchParams.get('tags')?.split(',') || undefined;
  const isArchived = searchParams.get('isArchived') === 'true' ? true : 
                    searchParams.get('isArchived') === 'false' ? false : undefined;
  const isPinned = searchParams.get('isPinned') === 'true' ? true :
                  searchParams.get('isPinned') === 'false' ? false : undefined;
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');
  const sortBy = (searchParams.get('sortBy') as any) || 'last_message_at';
  const sortOrder = (searchParams.get('sortOrder') as any) || 'desc';

  if (!projectId) {
    throw new Error('Project ID is required');
  }

  console.log('[Conversations][GET] Getting conversations for project:', {
    projectId,
    userId: user.id,
    options: { query, tags, isArchived, isPinned, limit, offset, sortBy, sortOrder }
  });

  const result = await conversationService.getProjectConversations(user.id, projectId, {
    query,
    tags,
    isArchived,
    isPinned,
    limit,
    offset,
    sortBy,
    sortOrder
  });

  console.log('[Conversations][GET] Retrieved conversations:', {
    count: result.conversations.length,
    total: result.total
  });

  return result;
});

export const POST = withAPIErrorHandling(async (request: NextRequest) => {
  console.log('[Conversations][POST] Starting request');
  
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.log('[Conversations][POST] Unauthorized access attempt');
    throw new Error('Unauthorized');
  }

  const body = await request.json();
  const { projectId, title, description, tags } = body;

  if (!projectId) {
    throw new Error('Project ID is required');
  }

  console.log('[Conversations][POST] Creating conversation:', {
    projectId,
    title,
    userId: user.id
  });

  const conversation = await conversationService.createConversation(user.id, {
    projectId,
    title: title || 'New Conversation',
    description,
    tags
  });

  console.log('[Conversations][POST] Conversation created:', {
    id: conversation.id,
    title: conversation.title
  });

  return { conversation };
});