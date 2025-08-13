import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { featureFlagAdminService } from '@/lib/feature-flags/admin'
import type { UpdateFeatureFlagRequest } from '@/types/feature-flags'

interface RouteParams {
  params: {
    id: string
  }
}

async function checkAdminAccess(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return { error: 'Authentication required', status: 401 }
  }

  // Check if user is admin
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (userError || !userData) {
    return { error: 'User not found', status: 404 }
  }

  const isAdmin = userData.email?.includes('admin') || 
                  user.app_metadata?.role === 'admin' ||
                  user.user_metadata?.role === 'admin'

  if (!isAdmin) {
    return { error: 'Admin access required', status: 403 }
  }

  return { user }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authCheck = await checkAdminAccess(request)
    if ('error' in authCheck) {
      return NextResponse.json(
        { error: authCheck.error },
        { status: authCheck.status }
      )
    }

    const flag = await featureFlagAdminService.getFeatureFlag(params.id)
    
    if (!flag) {
      return NextResponse.json(
        { error: 'Feature flag not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ flag })
  } catch (error) {
    console.error('Error getting feature flag:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authCheck = await checkAdminAccess(request)
    if ('error' in authCheck) {
      return NextResponse.json(
        { error: authCheck.error },
        { status: authCheck.status }
      )
    }

    const body = await request.json() as UpdateFeatureFlagRequest

    const flag = await featureFlagAdminService.updateFeatureFlag(params.id, body)
    return NextResponse.json({ flag })
  } catch (error) {
    console.error('Error updating feature flag:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authCheck = await checkAdminAccess(request)
    if ('error' in authCheck) {
      return NextResponse.json(
        { error: authCheck.error },
        { status: authCheck.status }
      )
    }

    await featureFlagAdminService.deleteFeatureFlag(params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting feature flag:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}