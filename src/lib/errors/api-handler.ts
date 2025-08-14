import { NextRequest, NextResponse } from 'next/server';
import { errorLogger } from './logger';
import { 
  BaseAppError, 
  AuthenticationError, 
  AuthorizationError, 
  ValidationError, 
  NetworkError, 
  DatabaseError, 
  SystemError,
  ErrorCode,
  ErrorCategory,
  ErrorSeverity
} from './types';

export interface APIErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId: string;
  };
  success: false;
}

export interface APISuccessResponse<T = any> {
  data: T;
  success: true;
  timestamp: string;
  requestId: string;
}

/**
 * API Error Handler - Centralized error handling for API routes
 */
export class APIErrorHandler {
  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Handle API errors and return standardized response
   */
  static handleError(
    error: Error | BaseAppError,
    request: NextRequest,
    context?: {
      userId?: string;
      action?: string;
      metadata?: Record<string, any>;
    }
  ): NextResponse<APIErrorResponse> {
    const requestId = this.generateRequestId();
    
    // Normalize error
    const appError = this.normalizeError(error, request, requestId, context);
    
    // Log error
    errorLogger.logError(appError, {
      userId: context?.userId,
      url: request.url,
      method: request.method,
      userAgent: request.headers.get('user-agent') || undefined,
      requestId,
      action: context?.action,
      metadata: context?.metadata,
    });

    // Create response
    const response: APIErrorResponse = {
      error: {
        code: appError.code,
        message: appError.userMessage,
        details: this.shouldIncludeDetails(appError) ? {
          category: appError.category,
          severity: appError.severity,
          recoverable: appError.recoverable,
          retryable: appError.retryable,
        } : undefined,
        timestamp: new Date().toISOString(),
        requestId,
      },
      success: false,
    };

    // Determine HTTP status code
    const statusCode = this.getStatusCode(appError);
    
    return NextResponse.json(response, { 
      status: statusCode,
      headers: {
        'X-Request-ID': requestId,
        'X-Error-Code': appError.code,
      },
    });
  }

  /**
   * Handle successful API responses
   */
  static handleSuccess<T>(
    data: T,
    request?: NextRequest,
    statusCode: number = 200
  ): NextResponse<APISuccessResponse<T>> {
    const requestId = this.generateRequestId();
    
    const response: APISuccessResponse<T> = {
      data,
      success: true,
      timestamp: new Date().toISOString(),
      requestId,
    };

    return NextResponse.json(response, {
      status: statusCode,
      headers: {
        'X-Request-ID': requestId,
      },
    });
  }

  /**
   * Async wrapper for API route handlers
   */
  static async withErrorHandling<T>(
    handler: (request: NextRequest, context?: any) => Promise<T>,
    request: NextRequest,
    context?: {
      userId?: string;
      action?: string;
      metadata?: Record<string, any>;
      params?: any;
    }
  ): Promise<NextResponse> {
    try {
      const result = await handler(request, context?.params);
      return this.handleSuccess(result, request);
    } catch (error) {
      return this.handleError(error as Error, request, context);
    }
  }

  /**
   * Normalize different error types to BaseAppError
   */
  private static normalizeError(
    error: Error | BaseAppError,
    request: NextRequest,
    requestId: string,
    context?: {
      userId?: string;
      action?: string;
      metadata?: Record<string, any>;
    }
  ): BaseAppError {
    if (error instanceof BaseAppError) {
      return error;
    }

    // Handle specific error types
    if (error.message.includes('unauthorized') || error.message.includes('authentication')) {
      return new AuthenticationError(
        error.message,
        'Authentication required. Please sign in.',
        {
          userId: context?.userId,
          url: request.url,
          method: request.method,
          requestId,
          action: context?.action,
          metadata: context?.metadata,
        }
      );
    }

    if (error.message.includes('forbidden') || error.message.includes('permission')) {
      return new AuthorizationError(
        error.message,
        'You do not have permission to perform this action.',
        {
          userId: context?.userId,
          url: request.url,
          method: request.method,
          requestId,
          action: context?.action,
          metadata: context?.metadata,
        }
      );
    }

    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return new ValidationError(
        error.message,
        'Please check your input and try again.',
        {
          userId: context?.userId,
          url: request.url,
          method: request.method,
          requestId,
          action: context?.action,
          metadata: context?.metadata,
        }
      );
    }

    if (error.message.includes('network') || error.message.includes('connection')) {
      return new NetworkError(
        error.message,
        'Network connection failed. Please try again.',
        {
          userId: context?.userId,
          url: request.url,
          method: request.method,
          requestId,
          action: context?.action,
          metadata: context?.metadata,
        }
      );
    }

    if (error.message.includes('database') || error.message.includes('sql')) {
      return new DatabaseError(
        error.message,
        'Database operation failed. Please try again.',
        {
          userId: context?.userId,
          url: request.url,
          method: request.method,
          requestId,
          action: context?.action,
          metadata: context?.metadata,
        }
      );
    }

    // Default to system error
    return new SystemError(
      error.message,
      'An unexpected error occurred. Our team has been notified.',
      {
        userId: context?.userId,
        url: request.url,
        method: request.method,
        requestId,
        action: context?.action,
        metadata: {
          ...context?.metadata,
          originalError: error.name,
          stack: error.stack,
        },
      }
    );
  }

  /**
   * Get HTTP status code for error
   */
  private static getStatusCode(error: BaseAppError): number {
    switch (error.category) {
      case ErrorCategory.AUTHENTICATION:
        return 401;
      case ErrorCategory.AUTHORIZATION:
        return 403;
      case ErrorCategory.VALIDATION:
      case ErrorCategory.USER_INPUT:
        return 400;
      case ErrorCategory.NETWORK:
        return 502;
      case ErrorCategory.DATABASE:
        return 503;
      case ErrorCategory.RATE_LIMIT:
        return 429;
      case ErrorCategory.QUOTA_EXCEEDED:
        return 402;
      case ErrorCategory.API:
        return 502;
      case ErrorCategory.FILE_SYSTEM:
        return 422;
      case ErrorCategory.SYSTEM:
        return 500;
      default:
        return 500;
    }
  }

  /**
   * Determine if error details should be included in response
   */
  private static shouldIncludeDetails(error: BaseAppError): boolean {
    // Include details for development
    if (process.env.NODE_ENV === 'development') {
      return true;
    }

    // Include details for non-critical errors
    return error.severity !== ErrorSeverity.CRITICAL;
  }
}

/**
 * Middleware for API error handling
 */
export function withAPIErrorHandling(
  handler: (request: NextRequest, context?: any) => Promise<any>
) {
  return async (request: NextRequest, context?: any) => {
    return APIErrorHandler.withErrorHandling(handler, request, {
      params: context,
      action: `${request.method} ${new URL(request.url).pathname}`,
    });
  };
}

/**
 * Authentication middleware
 */
export function withAuth(
  handler: (request: NextRequest, context?: any) => Promise<any>
) {
  return withAPIErrorHandling(async (request: NextRequest, context?: any) => {
    // This would integrate with your auth system
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      throw new AuthenticationError(
        'No authorization header provided',
        'Authentication required. Please sign in.'
      );
    }

    // Validate token (implement your auth logic here)
    // const user = await validateToken(authHeader);
    
    return handler(request, context);
  });
}

/**
 * Rate limiting middleware
 */
export function withRateLimit(
  limit: number = 100,
  windowMs: number = 60000 // 1 minute
) {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (handler: (request: NextRequest, context?: any) => Promise<any>) => {
    return withAPIErrorHandling(async (request: NextRequest, context?: any) => {
      const clientId = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
      
      const now = Date.now();
      const clientData = requests.get(clientId);
      
      if (!clientData || now > clientData.resetTime) {
        requests.set(clientId, { count: 1, resetTime: now + windowMs });
      } else {
        clientData.count++;
        
        if (clientData.count > limit) {
          throw new BaseAppError(
            ErrorCode.API_RATE_LIMITED,
            ErrorCategory.RATE_LIMIT,
            ErrorSeverity.MEDIUM,
            `Rate limit exceeded: ${clientData.count}/${limit}`,
            'Too many requests. Please try again later.',
            {
              url: request.url,
              method: request.method,
              metadata: {
                limit,
                current: clientData.count,
                resetTime: clientData.resetTime,
              },
            },
            { retryable: true }
          );
        }
      }

      return handler(request, context);
    });
  };
}

/**
 * Validation middleware
 */
export function withValidation<T>(
  schema: (data: any) => T,
  source: 'body' | 'query' | 'params' = 'body'
) {
  return (handler: (request: NextRequest, data: T, context?: any) => Promise<any>) => {
    return withAPIErrorHandling(async (request: NextRequest, context?: any) => {
      let data: any;
      
      try {
        switch (source) {
          case 'body':
            data = await request.json();
            break;
          case 'query':
            data = Object.fromEntries(new URL(request.url).searchParams);
            break;
          case 'params':
            data = context;
            break;
        }
        
        const validatedData = schema(data);
        return handler(request, validatedData, context);
      } catch (error) {
        throw new ValidationError(
          `Validation failed: ${error instanceof Error ? error.message : 'Invalid data'}`,
          'Please check your input and try again.',
          {
            url: request.url,
            method: request.method,
            metadata: { source, data },
          }
        );
      }
    });
  };
}