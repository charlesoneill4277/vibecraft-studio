import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { enhancedChatService } from '@/lib/ai/enhanced-chat-service';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 });
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
    } = body;

    if (!content || !projectId || !providerId) {
      return new Response('Content, projectId, and providerId are required', { status: 400 });
    }

    // Verify user has access to the project
    const project = await supabase
      .from('projects')
      .select('id, user_id')
      .eq('id', projectId)
      .single();

    if (project.error || project.data.user_id !== user.id) {
      return new Response('Project not found or access denied', { status: 403 });
    }

    // Create a readable stream for Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        try {
          for await (const chunk of enhancedChatService.sendMessageStream(user.id, {
            content,
            projectId,
            providerId,
            model,
            temperature,
            maxTokens,
            systemPrompt,
            fallbackConfig,
          })) {
            const data = `data: ${JSON.stringify(chunk)}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
          
          // Send completion signal
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Enhanced streaming error:', error);
          const errorData = `data: ${JSON.stringify({ 
            type: 'error', 
            data: { message: error instanceof Error ? error.message : 'Unknown error' } 
          })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('Error in enhanced streaming chat API:', error);
    return new Response('Internal server error', { status: 500 });
  }
}