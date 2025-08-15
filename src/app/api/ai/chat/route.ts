import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { chatService } from '@/lib/ai/chat-service';
import { withAPIErrorHandling } from '@/lib/errors';

export const POST = withAPIErrorHandling(async (request: NextRequest) => {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { 
    content, 
    projectId, 
    providerId, 
    model, 
    temperature, 
    maxTokens, 
    systemPrompt 
  } = body;

  if (!content || !projectId || !providerId) {
    return NextResponse.json(
      { error: 'Content, projectId, and providerId are required' },
      { status: 400 }
    );
  }

  // Verify user has access to the project
  const project = await supabase
    .from('projects')
    .select('id, user_id')
    .eq('id', projectId)
    .single();

  if (project.error || project.data.user_id !== user.id) {
    return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
  }

  const response = await chatService.sendMessage(user.id, {
    content,
    projectId,
    providerId,
    model,
    temperature,
    maxTokens,
    systemPrompt,
  });

  return NextResponse.json(response);
});