import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { contextInjectionService } from '@/lib/context/context-injection-service'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { contextItemId, feedback, userMessage } = body

    if (!contextItemId || !feedback || !userMessage) {
      return NextResponse.json(
        { error: 'contextItemId, feedback, and userMessage are required' },
        { status: 400 }
      )
    }

    if (!['helpful', 'not_helpful', 'irrelevant'].includes(feedback)) {
      return NextResponse.json(
        { error: 'feedback must be one of: helpful, not_helpful, irrelevant' },
        { status: 400 }
      )
    }

    await contextInjectionService.updateContextRelevance(
      user.id,
      contextItemId,
      feedback,
      userMessage
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error providing context feedback:', error)
    
    return NextResponse.json(
      { error: 'Failed to provide context feedback' },
      { status: 500 }
    )
  }
}