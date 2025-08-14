import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { conversationService } from '@/lib/conversations/conversation-service'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const query = searchParams.get('query')
    const conversationIds = searchParams.get('conversationIds')?.split(',').filter(Boolean)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!projectId || !query) {
      return NextResponse.json(
        { error: 'projectId and query are required' },
        { status: 400 }
      )
    }

    const result = await conversationService.searchMessages(
      user.id,
      projectId,
      query,
      { conversationIds, limit, offset }
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error searching messages:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Access denied') ? 403 : 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to search messages' },
      { status: 500 }
    )
  }
}