import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { usageService } from '@/lib/usage/usage-service';
import { createRateLimitedHandler } from '@/lib/middleware/rate-limit';

async function handleGetAnalytics(request: NextRequest) {
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
    const days = parseInt(url.searchParams.get('days') || '30');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    // Get usage analytics
    const analytics = await usageService.getUsageAnalytics(user.id, days);

    // Get cost breakdown
    const costStartDate = startDate ? new Date(startDate) : new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const costEndDate = endDate ? new Date(endDate) : new Date();
    const costBreakdown = await usageService.getCostBreakdown(user.id, costStartDate, costEndDate);

    // Get total usage stats
    const totalStats = await usageService.getTotalUsageStats(user.id);

    // Get usage summary
    const summary = await usageService.getUsageSummary(user.id);

    return NextResponse.json({
      analytics,
      costBreakdown,
      totalStats,
      summary,
      period: {
        startDate: costStartDate.toISOString(),
        endDate: costEndDate.toISOString(),
        days
      },
      success: true
    });

  } catch (error) {
    console.error('Error fetching usage analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage analytics' },
      { status: 500 }
    );
  }
}

export const GET = createRateLimitedHandler(handleGetAnalytics);