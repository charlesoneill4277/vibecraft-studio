import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { featureFlagAdminService } from '@/lib/feature-flags/admin'
import type { CreateFeatureFlagRequest } from '@/types/feature-flags'

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

  // For now, check if user email contains 'admin' or has admin role in metadata
  // In production, you'd have a proper role system
  const isAdmin = userData.email?.includes('admin') || 
                  user.app_metadata?.role === 'admin' ||
                  user.user_metadata?.role === 'admin'

  if (!isAdmin) {
    return { error: 'Admin access required', status: 403 }
  }

  return { user }
}

export async function GET(_request: NextRequest) {
  try {
    const authCheck = await checkAdminAccess(_request)
    if ('error' in authCheck) {
      return NextResponse.json(
        { error: authCheck.error },
        { status: authCheck.status }
      )
    }

    const flags = await featureFlagAdminService.getAllFeatureFlags()
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
    const authCheck = await checkAdminAccess(request)
    if ('error' in authCheck) {
      return NextResponse.json(
        { error: authCheck.error },
        { status: authCheck.status }
      )
    }

    const body = await request.json() as CreateFeatureFlagRequest

    // Validate required fields
    if (!body.name || !body.flagType || body.defaultValue === undefined) {
      return NextResponse.json(
        { error: 'Name, flagType, and defaultValue are required' },
        { status: 400 }
      )
    }

    const flag = await featureFlagAdminService.createFeatureFlag(body, authCheck.user.id)
    return NextResponse.json({ flag }, { status: 201 })
  } catch (error) {
    console.error('Error creating feature flag:', error)
    
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json(
        { error: 'Feature flag with this name already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}