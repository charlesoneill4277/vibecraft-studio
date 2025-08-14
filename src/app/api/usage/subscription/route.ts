import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { usageService } from '@/lib/usage/usage-service';
import { createRateLimitedHandler } from '@/lib/middleware/rate-limit';

async function handleGetSubscription(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const subscription = await usageService.getUserSubscription(user.id);

    return NextResponse.json({
      subscription,
      success: true
    });

  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}

async function handleUpdateSubscription(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const subscriptionData = await request.json();

    await usageService.updateSubscription(user.id, subscriptionData);

    return NextResponse.json({
      message: 'Subscription updated successfully',
      success: true
    });

  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to update subscription' },
      { status: 500 }
    );
  }
}

export const GET = createRateLimitedHandler(handleGetSubscription);
export const PUT = createRateLimitedHandler(handleUpdateSubscription);