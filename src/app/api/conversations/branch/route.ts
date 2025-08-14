import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { conversationService } from '@/lib/conversations/conversation-service'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { sourceConversationId, branchPointMessageId, title, description } = body

    if (!sourceConversationId || !branchPointMessageId) {
      return NextResponse.json(
        { error: 'sourceConversationId and branchPointMessageId are required' },
        { status: 400 }
      )
    }

    const branchedConversation = await conversationService.branchConversation(
      user.id,
      {
        sourceConversationId,
        branchPointMessageId,
        title,
        description
      }
    )

    return NextResponse.json(branchedConversation)
  } catch (error) {
    console.error('Error branching conversation:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Access denied') ? 403 : 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to branch conversation' },
      { status: 500 }
    )
  }
}