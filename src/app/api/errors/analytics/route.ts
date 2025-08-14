import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { errorLogger } from '@/lib/errors/logger';
import { APIErrorHandler } from '@/lib/errors/api-handler';

export async function GET(request: NextRequest) {
  return APIErrorHandler.withErrorHandling(async (request) => {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user has admin permissions (implement your auth logic)
    // const hasAdminAccess = await checkAdminPermissions(user.id);
    // if (!hasAdminAccess) {
    //   throw new Error('Insufficient permissions');
    // }

    const analytics = errorLogger.getAnalytics();
    return analytics;
  }, request, {
    action: 'get_error_analytics',
    userId: 'system', // Would be actual user ID
  });
}

export async function DELETE(request: NextRequest) {
  return APIErrorHandler.withErrorHandling(async (request) => {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user has admin permissions
    // const hasAdminAccess = await checkAdminPermissions(user.id);
    // if (!hasAdminAccess) {
    //   throw new Error('Insufficient permissions');
    // }

    errorLogger.clearLogs();
    
    return { message: 'Error logs cleared successfully' };
  }, request, {
    action: 'clear_error_logs',
    userId: 'system',
  });
}