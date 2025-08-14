import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { FeatureFlagService } from '@/lib/feature-flags/service'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const projectId = searchParams.get('projectId')
    const userRole = searchParams.get('userRole')

    const context = {
      userId: user.id,
      userRole: userRole || undefined,
      projectId: projectId || undefined,
      environment: process.env.NODE_ENV as any,
    }

    try {
      const adminService = new FeatureFlagService(createAdminClient())
      const flags = await adminService.getAllFlags(context)
      return NextResponse.json({ flags })
    } catch (flagError) {
      // If feature flags table doesn't exist, return empty flags
      console.log('Feature flags table not found, returning empty flags:', flagError)
      return NextResponse.json({ flags: {} })
    }
  } catch (error) {
    console.error('Error fetching feature flags:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
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
    const { flagName, feedback } = body

    if (!flagName || !feedback) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const adminService = new FeatureFlagService(createAdminClient())
    await adminService.submitFeedback(flagName, user.id, feedback)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error submitting feedback:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}