import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { conversationService } from '@/lib/conversations/conversation-service';
import { withAPIErrorHandling } from '@/lib/errors';

export const GET = withAPIErrorHandling(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  console.log('[Conversations][GET_BY_ID] Starting request');
  
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.log('[Conversations][GET_BY_ID] Unauthorized access attempt');
    throw new Error('Unauthorized');
  }

  const conversationId = params.id;

  console.log('[Conversations][GET_BY_ID] Getting conversation:', {
    conversationId,
    userId: user.id
  });

  const conversation = await conversationService.getConversation(user.id, conversationId);

  if (!conversation) {
    throw new Error('Conversation not found or access denied');
  }

  console.log('[Conversations][GET_BY_ID] Retrieved conversation:', {
    id: conversation.id,
    title: conversation.title
  });

  return { conversation };
});

export const PATCH = withAPIErrorHandling(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  console.log('[Conversations][PATCH] Starting request');
  
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.log('[Conversations][PATCH] Unauthorized access attempt');
    throw new Error('Unauthorized');
  }

  const conversationId = params.id;
  const body = await request.json();
  const { title, description, tags, isArchived, isPinned } = body;

  console.log('[Conversations][PATCH] Updating conversation:', {
    conversationId,
    updates: { title, description, tags, isArchived, isPinned },
    userId: user.id
  });

  const conversation = await conversationService.updateConversation(user.id, conversationId, {
    title,
    description,
    tags,
    isArchived,
    isPinned
  });

  console.log('[Conversations][PATCH] Conversation updated:', {
    id: conversation.id,
    title: conversation.title
  });

  return { conversation };
});

export const DELETE = withAPIErrorHandling(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  console.log('[Conversations][DELETE] Starting request');
  
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.log('[Conversations][DELETE] Unauthorized access attempt');
    throw new Error('Unauthorized');
  }

  const conversationId = params.id;

  console.log('[Conversations][DELETE] Deleting conversation:', {
    conversationId,
    userId: user.id
  });

  await conversationService.deleteConversation(user.id, conversationId);

  console.log('[Conversations][DELETE] Conversation deleted successfully');

  return { success: true };
});