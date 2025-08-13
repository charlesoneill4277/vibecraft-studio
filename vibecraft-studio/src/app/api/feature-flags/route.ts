import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { featureFlagService } from '@/lib/feature-flags/service'

export async function GET(request: NextRequest) {
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

    // Get all feature flags for the user
    const flags = await featureFlagService.getAllFlags(context)

    return NextResponse.json({ flags })
  } catch (error) {
    console.error('Error getting feature flags:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { flagName, feedback } = body

    if (!flagName || !feedback) {
      return NextResponse.json(
        { error: 'Flag name and feedback are required' },
        { status: 400 }
      )
    }

    // Submit feedback
    await featureFlagService.submitFeedback(flagName, user.id, feedback)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error submitting feedback:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}