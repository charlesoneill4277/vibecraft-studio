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
    const { projectId, contextItems } = body

    if (!projectId || !Array.isArray(contextItems)) {
      return NextResponse.json(
        { error: 'projectId and contextItems are required' },
        { status: 400 }
      )
    }

    const preview = await contextInjectionService.previewContext(
      user.id,
      projectId,
      contextItems
    )

    return NextResponse.json(preview)
  } catch (error) {
    console.error('Error previewing context:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Access denied') ? 403 : 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to preview context' },
      { status: 500 }
    )
  }
}