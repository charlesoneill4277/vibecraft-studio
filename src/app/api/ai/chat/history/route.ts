import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { chatService } from '@/lib/ai/chat-service';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!projectId) {
      return NextResponse.json(
        { error: 'ProjectId is required' },
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

    const messages = await chatService.getConversationHistory(projectId, limit, offset);
    const stats = await chatService.getMessageStats(projectId);

    return NextResponse.json({ 
      messages, 
      stats,
      pagination: {
        limit,
        offset,
        total: stats.totalMessages,
      }
    });
  } catch (error) {
    console.error('Error getting chat history:', error);
    return NextResponse.json(
      { error: 'Failed to get chat history' },
      { status: 500 }
    );
  }
}