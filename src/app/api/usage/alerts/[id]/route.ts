import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { usageService } from '@/lib/usage/usage-service';
import { createRateLimitedHandler } from '@/lib/middleware/rate-limit';

async function handleUpdateAlert(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { action } = await request.json();
    const { id } = await params;
    const alertId = id;

    if (action === 'mark_read') {
      await usageService.markAlertAsRead(alertId);
    } else if (action === 'dismiss') {
      await usageService.dismissAlert(alertId);
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: `Alert ${action === 'mark_read' ? 'marked as read' : 'dismissed'} successfully`,
      success: true
    });

  } catch (error) {
    console.error('Error updating alert:', error);
    return NextResponse.json(
      { error: 'Failed to update alert' },
      { status: 500 }
    );
  }
}

export const PATCH = createRateLimitedHandler(handleUpdateAlert);