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
    const { projectId, exportData } = body

    if (!projectId || !exportData) {
      return NextResponse.json(
        { error: 'projectId and exportData are required' },
        { status: 400 }
      )
    }

    // Validate export data structure
    if (!exportData.conversation || !Array.isArray(exportData.messages)) {
      return NextResponse.json(
        { error: 'Invalid export data format' },
        { status: 400 }
      )
    }

    const importedConversation = await conversationService.importConversation(
      user.id,
      projectId,
      exportData
    )

    return NextResponse.json(importedConversation)
  } catch (error) {
    console.error('Error importing conversation:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Access denied') ? 403 : 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to import conversation' },
      { status: 500 }
    )
  }
}