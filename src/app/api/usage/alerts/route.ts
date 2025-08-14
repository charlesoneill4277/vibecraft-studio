import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { usageService } from '@/lib/usage/usage-service';
import { createRateLimitedHandler } from '@/lib/middleware/rate-limit';

async function handleGetAlerts(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true';

    const alerts = await usageService.getUserAlerts(user.id, unreadOnly);

    return NextResponse.json({
      alerts,
      success: true
    });

  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

async function handleCreateAlert(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const alertData = await request.json();

    const alertId = await usageService.createUsageAlert({
      userId: user.id,
      ...alertData
    });

    return NextResponse.json({
      alertId,
      message: 'Alert created successfully',
      success: true
    });

  } catch (error) {
    console.error('Error creating alert:', error);
    return NextResponse.json(
      { error: 'Failed to create alert' },
      { status: 500 }
    );
  }
}

export const GET = createRateLimitedHandler(handleGetAlerts);
export const POST = createRateLimitedHandler(handleCreateAlert);