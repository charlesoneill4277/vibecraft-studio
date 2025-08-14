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
    const { contextItems, format = 'markdown' } = body

    if (!Array.isArray(contextItems)) {
      return NextResponse.json(
        { error: 'contextItems must be an array' },
        { status: 400 }
      )
    }

    const formattedContext = await contextInjectionService.getFormattedContext(
      contextItems,
      format
    )

    return NextResponse.json({ formattedContext })
  } catch (error) {
    console.error('Error formatting context:', error)
    
    return NextResponse.json(
      { error: 'Failed to format context' },
      { status: 500 }
    )
  }
}