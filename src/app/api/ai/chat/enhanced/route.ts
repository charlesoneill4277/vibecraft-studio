import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { enhancedChatService } from '@/lib/ai/enhanced-chat-service';

export async function POST(request: NextRequest) {
  try {
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
      systemPrompt,
      fallbackConfig,
      enableCaching = true,
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

    const response = await enhancedChatService.sendMessage(user.id, {
      content,
      projectId,
      providerId,
      model,
      temperature,
      maxTokens,
      systemPrompt,
      fallbackConfig,
      enableCaching,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in enhanced chat API:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}