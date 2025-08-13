import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { featureFlagService } from '@/lib/feature-flags/service'

interface RouteParams {
  params: {
    name: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const userRole = searchParams.get('userRole')

    // Build context
    const context = {
      userId: user.id,
      userRole: userRole || undefined,
      projectId: projectId || undefined,
      environment: process.env.NODE_ENV as any,
      userAgent: request.headers.get('user-agent') || undefined
    }

    // Evaluate the specific feature flag
    const evaluation = await featureFlagService.evaluateFlag(params.name, context)

    return NextResponse.json({ evaluation })
  } catch (error) {
    console.error('Error evaluating feature flag:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}