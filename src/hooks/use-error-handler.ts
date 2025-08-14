import { useState, useCallback, useEffect } from 'react';
import { errorLogger } from '@/lib/errors/logger';
import { BaseAppError, AppError, ErrorSeverity, ErrorCategory } from '@/lib/errors/types';

interface UseErrorHandlerOptions {
  onError?: (error: AppError) => void;
  autoReport?: boolean;
  maxErrors?: number;
}

interface UseErrorHandlerReturn {
  errors: AppError[];
  hasErrors: boolean;
  lastError: AppError | null;
  reportError: (error: Error | BaseAppError, context?: any) => void;
  clearError: (errorId: string) => void;
  clearAllErrors: () => void;
  retryLastError: () => void;
  getErrorsByCategory: (category: ErrorCategory) => AppError[];
  getErrorsBySeverity: (severity: ErrorSeverity) => AppError[];
}

/**
 * Hook for managing errors in React components
 */
export function useErrorHandler(options: UseErrorHandlerOptions = {}): UseErrorHandlerReturn {
  const { onError, autoReport = true, maxErrors = 10 } = options;
  
  const [errors, setErrors] = useState<AppError[]>([]);
  const [lastRetryAction, setLastRetryAction] = useState<(() => void) | null>(null);

  const reportError = useCallback((
    error: Error | BaseAppError, 
    context?: {
      component?: string;
      action?: string;
      metadata?: any;
      retryAction?: () => void;
    }
  ) => {
    const logEntry = errorLogger.logError(error, {
      component: context?.component,
      action: context?.action,
      metadata: context?.metadata,
    });

    const appError = logEntry.error;
    
    setErrors(prev => {
      const newErrors = [appError, ...prev].slice(0, maxErrors);
      return newErrors;
    });

    if (context?.retryAction) {
      setLastRetryAction(() => context.retryAction);
    }

    if (onError) {
      onError(appError);
    }

    // Add breadcrumb
    errorLogger.addBreadcrumb('error', 'Error reported via useErrorHandler', {
      component: context?.component,
      action: context?.action,
    });
  }, [onError, maxErrors]);

  const clearError = useCallback((errorId: string) => {
    setErrors(prev => prev.filter(error => error.id !== errorId));
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors([]);
    setLastRetryAction(null);
  }, []);

  const retryLastError = useCallback(() => {
    if (lastRetryAction) {
      try {
        lastRetryAction();
        // Clear the last error if retry succeeds
        if (errors.length > 0) {
          clearError(errors[0].id);
        }
      } catch (error) {
        reportError(error as Error, {
          action: 'retry',
          component: 'useErrorHandler',
        });
      }
    }
  }, [lastRetryAction, errors, clearError, reportError]);

  const getErrorsByCategory = useCallback((category: ErrorCategory) => {
    return errors.filter(error => error.category === category);
  }, [errors]);

  const getErrorsBySeverity = useCallback((severity: ErrorSeverity) => {
    return errors.filter(error => error.severity === severity);
  }, [errors]);

  return {
    errors,
    hasErrors: errors.length > 0,
    lastError: errors[0] || null,
    reportError,
    clearError,
    clearAllErrors,
    retryLastError,
    getErrorsByCategory,
    getErrorsBySeverity,
  };
}

/**
 * Hook for async operations with error handling
 */
interface UseAsyncWithErrorOptions<T> {
  onError?: (error: AppError) => void;
  onSuccess?: (data: T) => void;
  retryable?: boolean;
  component?: string;
}

interface UseAsyncWithErrorReturn<T> {
  data: T | null;
  loading: boolean;
  error: AppError | null;
  execute: (...args: any[]) => Promise<void>;
  retry: () => Promise<void>;
  reset: () => void;
}

export function useAsyncWithError<T>(
  asyncFunction: (...args: any[]) => Promise<T>,
  options: UseAsyncWithErrorOptions<T> = {}
): UseAsyncWithErrorReturn<T> {
  const { onError, onSuccess, retryable = true, component } = options;
  
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [lastArgs, setLastArgs] = useState<any[]>([]);

  const { reportError } = useErrorHandler({ onError });

  const execute = useCallback(async (...args: any[]) => {
    setLoading(true);
    setError(null);
    setLastArgs(args);

    try {
      const result = await asyncFunction(...args);
      setData(result);
      
      if (onSuccess) {
        onSuccess(result);
      }

      // Add success breadcrumb
      errorLogger.addBreadcrumb('success', 'Async operation completed', {
        component,
        args: args.length,
      });
    } catch (err) {
      const appError = reportError(err as Error, {
        component,
        action: 'async_operation',
        metadata: { args },
        retryAction: retryable ? () => execute(...args) : undefined,
      });
      
      setError(appError);
    } finally {
      setLoading(false);
    }
  }, [asyncFunction, onSuccess, reportError, component, retryable]);

  const retry = useCallback(async () => {
    if (lastArgs.length > 0) {
      await execute(...lastArgs);
    }
  }, [execute, lastArgs]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
    setLastArgs([]);
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    retry,
    reset,
  };
}

/**
 * Hook for form error handling
 */
interface UseFormErrorsOptions {
  onError?: (error: AppError) => void;
}

interface UseFormErrorsReturn {
  fieldErrors: Record<string, string>;
  generalError: string | null;
  hasErrors: boolean;
  setFieldError: (field: string, message: string) => void;
  setGeneralError: (message: string) => void;
  clearFieldError: (field: string) => void;
  clearAllErrors: () => void;
  handleSubmitError: (error: Error | BaseAppError) => void;
}

export function useFormErrors(options: UseFormErrorsOptions = {}): UseFormErrorsReturn {
  const { onError } = options;
  
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const { reportError } = useErrorHandler({ onError });

  const setFieldError = useCallback((field: string, message: string) => {
    setFieldErrors(prev => ({ ...prev, [field]: message }));
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors(prev => {
      const { [field]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setFieldErrors({});
    setGeneralError(null);
  }, []);

  const handleSubmitError = useCallback((error: Error | BaseAppError) => {
    const appError = reportError(error, {
      component: 'form',
      action: 'submit',
    });

    // Set appropriate error based on category
    if (appError.category === ErrorCategory.VALIDATION) {
      // Try to extract field-specific errors from the message
      const fieldMatch = appError.message.match(/field[:\s]+(\w+)/i);
      if (fieldMatch) {
        setFieldError(fieldMatch[1], appError.userMessage);
      } else {
        setGeneralError(appError.userMessage);
      }
    } else {
      setGeneralError(appError.userMessage);
    }
  }, [reportError, setFieldError]);

  return {
    fieldErrors,
    generalError,
    hasErrors: Object.keys(fieldErrors).length > 0 || generalError !== null,
    setFieldError,
    setGeneralError,
    clearFieldError,
    clearAllErrors,
    handleSubmitError,
  };
}

/**
 * Hook for global error monitoring
 */
interface UseErrorMonitoringReturn {
  analytics: any;
  recentErrors: AppError[];
  errorRate: number;
  refreshAnalytics: () => void;
  clearLogs: () => void;
}

export function useErrorMonitoring(): UseErrorMonitoringReturn {
  const [analytics, setAnalytics] = useState(errorLogger.getAnalytics());
  const [recentErrors, setRecentErrors] = useState<AppError[]>([]);

  const refreshAnalytics = useCallback(() => {
    const newAnalytics = errorLogger.getAnalytics();
    setAnalytics(newAnalytics);
    setRecentErrors(newAnalytics.recentErrors.map(log => log.error));
  }, []);

  const clearLogs = useCallback(() => {
    errorLogger.clearLogs();
    refreshAnalytics();
  }, [refreshAnalytics]);

  useEffect(() => {
    // Refresh analytics periodically
    const interval = setInterval(refreshAnalytics, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [refreshAnalytics]);

  return {
    analytics,
    recentErrors,
    errorRate: analytics.errorRate,
    refreshAnalytics,
    clearLogs,
  };
}