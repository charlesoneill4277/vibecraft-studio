import { AppError, BaseAppError, ErrorSeverity, ErrorCategory, ErrorContext } from './types';

export interface ErrorLogEntry {
  id: string;
  error: AppError;
  timestamp: Date;
  environment: string;
  version: string;
  reported: boolean;
  reportedAt?: Date;
  reportId?: string;
  sessionData?: {
    userId?: string;
    sessionId?: string;
    userAgent?: string;
    url?: string;
  };
}

export interface ErrorAnalytics {
  totalErrors: number;
  errorsBySeverity: Record<ErrorSeverity, number>;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsByCode: Record<string, number>;
  recentErrors: ErrorLogEntry[];
  errorRate: number;
  recoveryRate: number;
}

export interface ErrorReportingConfig {
  enabled: boolean;
  endpoint?: string;
  apiKey?: string;
  batchSize: number;
  flushInterval: number;
  maxRetries: number;
  includeStack: boolean;
  includeBreadcrumbs: boolean;
  sanitizeData: boolean;
}

/**
 * Centralized error logging and reporting service
 */
export class ErrorLogger {
  private logs: ErrorLogEntry[] = [];
  private analytics: ErrorAnalytics = {
    totalErrors: 0,
    errorsBySeverity: {
      [ErrorSeverity.LOW]: 0,
      [ErrorSeverity.MEDIUM]: 0,
      [ErrorSeverity.HIGH]: 0,
      [ErrorSeverity.CRITICAL]: 0,
    },
    errorsByCategory: {
      [ErrorCategory.AUTHENTICATION]: 0,
      [ErrorCategory.AUTHORIZATION]: 0,
      [ErrorCategory.VALIDATION]: 0,
      [ErrorCategory.NETWORK]: 0,
      [ErrorCategory.API]: 0,
      [ErrorCategory.DATABASE]: 0,
      [ErrorCategory.AI_PROVIDER]: 0,
      [ErrorCategory.FILE_SYSTEM]: 0,
      [ErrorCategory.RATE_LIMIT]: 0,
      [ErrorCategory.QUOTA_EXCEEDED]: 0,
      [ErrorCategory.SYSTEM]: 0,
      [ErrorCategory.USER_INPUT]: 0,
      [ErrorCategory.UNKNOWN]: 0,
    },
    errorsByCode: {},
    recentErrors: [],
    errorRate: 0,
    recoveryRate: 0,
  };

  private config: ErrorReportingConfig = {
    enabled: true,
    batchSize: 10,
    flushInterval: 30000, // 30 seconds
    maxRetries: 3,
    includeStack: true,
    includeBreadcrumbs: true,
    sanitizeData: true,
  };

  private reportingQueue: ErrorLogEntry[] = [];
  private breadcrumbs: Array<{
    timestamp: Date;
    category: string;
    message: string;
    data?: any;
  }> = [];

  constructor(config?: Partial<ErrorReportingConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Start periodic reporting
    if (this.config.enabled) {
      this.startPeriodicReporting();
    }

    // Listen for unhandled errors
    this.setupGlobalErrorHandlers();
  }

  /**
   * Log an error
   */
  logError(error: Error | BaseAppError, context?: Partial<ErrorContext>): ErrorLogEntry {
    const appError = this.normalizeError(error, context);
    const logEntry: ErrorLogEntry = {
      id: appError.id,
      error: appError,
      timestamp: new Date(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      reported: false,
      sessionData: this.extractSessionData(appError.context),
    };

    // Add to logs
    this.logs.push(logEntry);
    
    // Update analytics
    this.updateAnalytics(appError);
    
    // Add to reporting queue if enabled
    if (this.config.enabled && this.shouldReport(appError)) {
      this.reportingQueue.push(logEntry);
    }

    // Console logging for development
    if (process.env.NODE_ENV === 'development') {
      this.consoleLog(logEntry);
    }

    // Limit log size
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-500);
    }

    return logEntry;
  }

  /**
   * Add breadcrumb for debugging context
   */
  addBreadcrumb(category: string, message: string, data?: any): void {
    this.breadcrumbs.push({
      timestamp: new Date(),
      category,
      message,
      data: this.config.sanitizeData ? this.sanitizeData(data) : data,
    });

    // Limit breadcrumb size
    if (this.breadcrumbs.length > 50) {
      this.breadcrumbs = this.breadcrumbs.slice(-25);
    }
  }

  /**
   * Get error analytics
   */
  getAnalytics(): ErrorAnalytics {
    return {
      ...this.analytics,
      recentErrors: this.logs.slice(-10),
    };
  }

  /**
   * Get error logs with filtering
   */
  getLogs(filters?: {
    severity?: ErrorSeverity;
    category?: ErrorCategory;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): ErrorLogEntry[] {
    let filteredLogs = [...this.logs];

    if (filters) {
      if (filters.severity) {
        filteredLogs = filteredLogs.filter(log => log.error.severity === filters.severity);
      }
      if (filters.category) {
        filteredLogs = filteredLogs.filter(log => log.error.category === filters.category);
      }
      if (filters.startDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp <= filters.endDate!);
      }
      if (filters.limit) {
        filteredLogs = filteredLogs.slice(-filters.limit);
      }
    }

    return filteredLogs;
  }

  /**
   * Clear logs
   */
  clearLogs(): void {
    this.logs = [];
    this.breadcrumbs = [];
    this.resetAnalytics();
  }

  /**
   * Normalize error to AppError format
   */
  private normalizeError(error: Error | BaseAppError, context?: Partial<ErrorContext>): AppError {
    if (error instanceof BaseAppError) {
      return {
        ...error.toJSON(),
        context: { ...error.context, ...context },
      };
    }

    // Convert regular Error to AppError
    return {
      id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      code: 'UNKNOWN_ERROR' as any,
      category: ErrorCategory.UNKNOWN,
      severity: ErrorSeverity.MEDIUM,
      message: error.message,
      userMessage: 'An unexpected error occurred. Please try again.',
      context: {
        timestamp: new Date(),
        ...context,
      },
      stack: error.stack,
      cause: error,
      recoverable: true,
      retryable: false,
      recoveryActions: [],
    };
  }

  /**
   * Update analytics
   */
  private updateAnalytics(error: AppError): void {
    this.analytics.totalErrors++;
    this.analytics.errorsBySeverity[error.severity]++;
    this.analytics.errorsByCategory[error.category]++;
    
    if (this.analytics.errorsByCode[error.code]) {
      this.analytics.errorsByCode[error.code]++;
    } else {
      this.analytics.errorsByCode[error.code] = 1;
    }

    // Calculate error rate (errors per minute)
    const recentErrors = this.logs.filter(
      log => Date.now() - log.timestamp.getTime() < 60000
    );
    this.analytics.errorRate = recentErrors.length;

    // Calculate recovery rate
    const recoverableErrors = this.logs.filter(log => log.error.recoverable);
    this.analytics.recoveryRate = recoverableErrors.length / Math.max(this.analytics.totalErrors, 1);
  }

  /**
   * Reset analytics
   */
  private resetAnalytics(): void {
    this.analytics = {
      totalErrors: 0,
      errorsBySeverity: {
        [ErrorSeverity.LOW]: 0,
        [ErrorSeverity.MEDIUM]: 0,
        [ErrorSeverity.HIGH]: 0,
        [ErrorSeverity.CRITICAL]: 0,
      },
      errorsByCategory: Object.values(ErrorCategory).reduce((acc, category) => {
        acc[category] = 0;
        return acc;
      }, {} as Record<ErrorCategory, number>),
      errorsByCode: {},
      recentErrors: [],
      errorRate: 0,
      recoveryRate: 0,
    };
  }

  /**
   * Extract session data from context
   */
  private extractSessionData(context: ErrorContext): ErrorLogEntry['sessionData'] {
    return {
      userId: context.userId,
      sessionId: context.sessionId,
      userAgent: context.userAgent,
      url: context.url,
    };
  }

  /**
   * Determine if error should be reported
   */
  private shouldReport(error: AppError): boolean {
    // Don't report low severity errors in production
    if (process.env.NODE_ENV === 'production' && error.severity === ErrorSeverity.LOW) {
      return false;
    }

    // Don't report validation errors
    if (error.category === ErrorCategory.VALIDATION) {
      return false;
    }

    return true;
  }

  /**
   * Console logging for development
   */
  private consoleLog(logEntry: ErrorLogEntry): void {
    const { error } = logEntry;
    const style = this.getConsoleStyle(error.severity);
    
    console.group(`%c${error.severity.toUpperCase()} ERROR`, style);
    console.log('Code:', error.code);
    console.log('Category:', error.category);
    console.log('Message:', error.message);
    console.log('User Message:', error.userMessage);
    console.log('Context:', error.context);
    if (error.stack) {
      console.log('Stack:', error.stack);
    }
    if (this.breadcrumbs.length > 0) {
      console.log('Breadcrumbs:', this.breadcrumbs.slice(-5));
    }
    console.groupEnd();
  }

  /**
   * Get console style for severity
   */
  private getConsoleStyle(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.LOW:
        return 'color: #3b82f6; font-weight: bold;';
      case ErrorSeverity.MEDIUM:
        return 'color: #f59e0b; font-weight: bold;';
      case ErrorSeverity.HIGH:
        return 'color: #ef4444; font-weight: bold;';
      case ErrorSeverity.CRITICAL:
        return 'color: #dc2626; background: #fef2f2; font-weight: bold; padding: 2px 4px;';
      default:
        return 'color: #6b7280; font-weight: bold;';
    }
  }

  /**
   * Sanitize sensitive data
   */
  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sensitiveKeys = [
      'password', 'token', 'apiKey', 'secret', 'key', 'auth',
      'authorization', 'cookie', 'session', 'csrf'
    ];

    const sanitized = { ...data };
    
    for (const key in sanitized) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    }

    return sanitized;
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        this.logError(new Error(`Unhandled Promise Rejection: ${event.reason}`), {
          component: 'Global',
          action: 'unhandledrejection',
        });
      });

      // Handle global errors
      window.addEventListener('error', (event) => {
        this.logError(event.error || new Error(event.message), {
          component: 'Global',
          action: 'error',
          url: event.filename,
          metadata: {
            line: event.lineno,
            column: event.colno,
          },
        });
      });
    }
  }

  /**
   * Start periodic reporting
   */
  private startPeriodicReporting(): void {
    setInterval(() => {
      if (this.reportingQueue.length > 0) {
        this.flushReports();
      }
    }, this.config.flushInterval);
  }

  /**
   * Flush error reports
   */
  private async flushReports(): void {
    if (this.reportingQueue.length === 0) return;

    const batch = this.reportingQueue.splice(0, this.config.batchSize);
    
    try {
      await this.sendErrorReports(batch);
      
      // Mark as reported
      batch.forEach(entry => {
        entry.reported = true;
        entry.reportedAt = new Date();
      });
    } catch (error) {
      console.error('Failed to send error reports:', error);
      
      // Put back in queue for retry (with limit)
      const retriableReports = batch.filter(entry => 
        (entry as any).retryCount < this.config.maxRetries
      );
      
      retriableReports.forEach(entry => {
        (entry as any).retryCount = ((entry as any).retryCount || 0) + 1;
      });
      
      this.reportingQueue.unshift(...retriableReports);
    }
  }

  /**
   * Send error reports to external service
   */
  private async sendErrorReports(reports: ErrorLogEntry[]): Promise<void> {
    if (!this.config.endpoint) {
      return;
    }

    const payload = {
      reports: reports.map(report => ({
        ...report,
        error: {
          ...report.error,
          stack: this.config.includeStack ? report.error.stack : undefined,
        },
        breadcrumbs: this.config.includeBreadcrumbs ? this.breadcrumbs : undefined,
      })),
      environment: process.env.NODE_ENV,
      version: process.env.NEXT_PUBLIC_APP_VERSION,
      timestamp: new Date().toISOString(),
    };

    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Error reporting failed: ${response.status} ${response.statusText}`);
    }
  }
}

// Export singleton instance
export const errorLogger = new ErrorLogger({
  enabled: process.env.NODE_ENV === 'production',
  endpoint: process.env.ERROR_REPORTING_ENDPOINT,
  apiKey: process.env.ERROR_REPORTING_API_KEY,
});