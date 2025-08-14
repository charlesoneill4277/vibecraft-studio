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
    const tags = searchParams.get('tags')?.split(',').filter(Boolean)
    const isArchived = searchParams.get('isArchived')
    const isPinned = searchParams.get('isPinned')
    const sortBy = searchParams.get('sortBy') as 'created_at' | 'updated_at' | 'last_message_at' | 'title'
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!projectId) {
      return NextResponse.json(
        { error: 'ProjectId is required' },
        { status: 400 }
      )
    }

    const options = {
      query: query || undefined,
      tags: tags || undefined,
      isArchived: isArchived === 'true' ? true : isArchived === 'false' ? false : undefined,
      isPinned: isPinned === 'true' ? true : isPinned === 'false' ? false : undefined,
      sortBy: sortBy || 'last_message_at',
      sortOrder: sortOrder || 'desc',
      limit,
      offset
    }

    const result = await conversationService.getProjectConversations(
      user.id,
      projectId,
      options
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error getting conversations:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Access denied') ? 403 : 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to get conversations' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      projectId, 
      title, 
      description, 
      parentConversationId, 
      branchPointMessageId, 
      tags 
    } = body

    if (!projectId) {
      return NextResponse.json(
        { error: 'ProjectId is required' },
        { status: 400 }
      )
    }

    const conversation = await conversationService.createConversation(user.id, {
      projectId,
      title,
      description,
      parentConversationId,
      branchPointMessageId,
      tags
    })

    return NextResponse.json(conversation)
  } catch (error) {
    console.error('Error creating conversation:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Access denied') ? 403 : 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    )
  }
}