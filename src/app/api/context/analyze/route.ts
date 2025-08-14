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
    const { projectId, message, options } = body

    if (!projectId || !message) {
      return NextResponse.json(
        { error: 'projectId and message are required' },
        { status: 400 }
      )
    }

    const analysisResult = await contextInjectionService.analyzeMessageForContext(
      user.id,
      projectId,
      message,
      options
    )

    // Log the context injection event
    try {
      await supabase.rpc('log_context_injection', {
        p_user_id: user.id,
        p_project_id: projectId,
        p_conversation_id: null, // Would be provided if available
        p_user_message: message,
        p_context_items_count: analysisResult.suggestedContext.length,
        p_total_relevance_score: analysisResult.suggestedContext.reduce(
          (acc, item) => acc + item.relevanceScore, 0
        ),
        p_estimated_tokens: analysisResult.estimatedTokens,
        p_context_types: [...new Set(analysisResult.suggestedContext.map(item => item.type))],
        p_injection_method: 'automatic',
        p_metadata: { options }
      })
    } catch (logError) {
      console.error('Failed to log context injection:', logError)
      // Don't fail the request if logging fails
    }

    return NextResponse.json(analysisResult)
  } catch (error) {
    console.error('Error analyzing message for context:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Access denied') ? 403 : 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to analyze message for context' },
      { status: 500 }
    )
  }
}