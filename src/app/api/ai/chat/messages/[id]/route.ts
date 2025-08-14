import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { chatService } from '@/lib/ai/chat-service';

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

    const body = await request.json();
    const { content, rating, feedback } = body;

    // If rating is provided, rate the message
    if (typeof rating === 'number') {
      await chatService.rateMessage(params.id, rating, feedback);
      return NextResponse.json({ success: true });
    }

    // If content is provided, update the message
    if (content) {
      const updatedMessage = await chatService.updateMessage(params.id, content);
      return NextResponse.json({ message: updatedMessage });
    }

    return NextResponse.json(
      { error: 'Either content or rating must be provided' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating message:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update message' },
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

    await chatService.deleteMessage(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete message' },
      { status: 500 }
    );
  }
}