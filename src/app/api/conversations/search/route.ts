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
    const isArchivedParam = searchParams.get('isArchived')
    const isPinnedParam = searchParams.get('isPinned')
    const sortBy = searchParams.get('sortBy') as 'created_at' | 'updated_at' | 'last_message_at' | 'title'
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc'
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')

    if (!projectId) {
      return NextResponse.json(
        { error: 'ProjectId is required' },
        { status: 400 }
      )
    }

    // Properly handle boolean parameters - only set if explicitly true/false
    let isArchived: boolean | undefined = undefined
    if (isArchivedParam === 'true') isArchived = true
    else if (isArchivedParam === 'false') isArchived = false

    let isPinned: boolean | undefined = undefined
    if (isPinnedParam === 'true') isPinned = true
    else if (isPinnedParam === 'false') isPinned = false

    // Parse numeric parameters with defaults
    const limit = limitParam ? parseInt(limitParam) : 50
    const offset = offsetParam ? parseInt(offsetParam) : 0

    const options = {
      query: query || undefined,
      tags: tags && tags.length > 0 ? tags : undefined,
      isArchived,
      isPinned,
      sortBy: sortBy || 'last_message_at',
      sortOrder: sortOrder || 'desc',
      limit: isNaN(limit) ? 50 : Math.max(1, Math.min(100, limit)), // Clamp between 1-100
      offset: isNaN(offset) ? 0 : Math.max(0, offset)
    }

    console.log('Search conversations with options:', { projectId, options })

    const result = await conversationService.getProjectConversations(
      user.id,
      projectId,
      options
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error searching conversations:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Access denied') ? 403 : 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to search conversations' },
      { status: 500 }
    )
  }
}