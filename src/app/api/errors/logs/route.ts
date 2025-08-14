import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { errorLogger } from '@/lib/errors/logger';
import { APIErrorHandler } from '@/lib/errors/api-handler';
import { ErrorSeverity, ErrorCategory } from '@/lib/errors/types';

export async function GET(request: NextRequest) {
  return APIErrorHandler.withErrorHandling(async (request) => {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { searchParams } = new URL(request.url);
    const severity = searchParams.get('severity') as ErrorSeverity | null;
    const category = searchParams.get('category') as ErrorCategory | null;
    const limit = parseInt(searchParams.get('limit') || '50');
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;

    const filters = {
      severity: severity || undefined,
      category: category || undefined,
      startDate,
      endDate,
      limit,
    };

    const logs = errorLogger.getLogs(filters);
    
    return {
      logs,
      total: logs.length,
      filters,
    };
  }, request, {
    action: 'get_error_logs',
    userId: 'system',
  });
}

export async function POST(request: NextRequest) {
  return APIErrorHandler.withErrorHandling(async (request) => {
    const body = await request.json();
    const { error, context } = body;

    if (!error || !error.message) {
      throw new Error('Invalid error data');
    }

    // Create error object
    const errorObj = new Error(error.message);
    if (error.stack) {
      errorObj.stack = error.stack;
    }

    // Log the error
    const logEntry = errorLogger.logError(errorObj, {
      component: context?.component,
      action: context?.action,
      url: context?.url,
      userAgent: context?.userAgent,
      metadata: context?.metadata,
    });

    return {
      logged: true,
      errorId: logEntry.id,
      timestamp: logEntry.timestamp,
    };
  }, request, {
    action: 'log_client_error',
  });
}