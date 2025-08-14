import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { usageService } from '@/lib/usage/usage-service';
import { createRateLimitedHandler } from '@/lib/middleware/rate-limit';

async function handleGetQuotas(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const quotas = await usageService.getUserQuotas(user.id);
    const summary = await usageService.getUsageSummary(user.id);

    return NextResponse.json({
      quotas,
      summary,
      success: true
    });

  } catch (error) {
    console.error('Error fetching quotas:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quotas' },
      { status: 500 }
    );
  }
}

async function handleUpdateQuotas(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { planType } = await request.json();

    if (!['free', 'pro', 'enterprise'].includes(planType)) {
      return NextResponse.json(
        { error: 'Invalid plan type' },
        { status: 400 }
      );
    }

    await usageService.updateQuotaLimits(user.id, planType);

    return NextResponse.json({
      message: 'Quotas updated successfully',
      success: true
    });

  } catch (error) {
    console.error('Error updating quotas:', error);
    return NextResponse.json(
      { error: 'Failed to update quotas' },
      { status: 500 }
    );
  }
}

export const GET = createRateLimitedHandler(handleGetQuotas);
export const PUT = createRateLimitedHandler(handleUpdateQuotas);