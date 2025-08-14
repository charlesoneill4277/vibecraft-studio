'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  RefreshCw, 
  Home, 
  Bug, 
  ChevronDown, 
  ChevronUp,
  Copy,
  ExternalLink
} from 'lucide-react';
import { errorLogger } from '@/lib/errors/logger';
import { BaseAppError, ErrorSeverity, ErrorCategory } from '@/lib/errors/types';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  showDetails: boolean;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo, retry: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'page' | 'section' | 'component';
  showReportButton?: boolean;
  maxRetries?: number;
}

/**
 * Global Error Boundary Component
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      showDetails: false,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error
    const logEntry = errorLogger.logError(error, {
      component: errorInfo.componentStack?.split('\n')[1]?.trim(),
      action: 'render',
      metadata: {
        componentStack: errorInfo.componentStack,
        level: this.props.level || 'component',
      },
    });

    this.setState({
      errorInfo,
      errorId: logEntry.id,
    });

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Add breadcrumb
    errorLogger.addBreadcrumb('error', 'Error boundary caught error', {
      component: errorInfo.componentStack?.split('\n')[1]?.trim(),
      level: this.props.level,
    });
  }

  handleRetry = () => {
    const maxRetries = this.props.maxRetries || 3;
    
    if (this.state.retryCount >= maxRetries) {
      return;
    }

    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      showDetails: false,
      retryCount: prevState.retryCount + 1,
    }));

    // Add breadcrumb
    errorLogger.addBreadcrumb('recovery', 'User retried after error', {
      retryCount: this.state.retryCount + 1,
      maxRetries,
    });
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  handleReportIssue = () => {
    const { error, errorInfo, errorId } = this.state;
    
    if (!error || !errorId) return;

    // Create issue report
    const report = {
      errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    };

    // Copy to clipboard
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    
    // Open GitHub issues (or support system)
    const issueUrl = `https://github.com/your-org/vibecraft-studio/issues/new?title=Error%20Report%20${errorId}&body=${encodeURIComponent(
      `**Error ID:** ${errorId}\n**Message:** ${error.message}\n**URL:** ${window.location.href}\n\n**Details:**\n\`\`\`\n${JSON.stringify(report, null, 2)}\n\`\`\``
    )}`;
    
    window.open(issueUrl, '_blank');
  };

  handleCopyError = async () => {
    const { error, errorInfo, errorId } = this.state;
    
    if (!error) return;

    const errorDetails = {
      id: errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2));
    } catch (err) {
      console.error('Failed to copy error details:', err);
    }
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(
          this.state.error!,
          this.state.errorInfo!,
          this.handleRetry
        );
      }

      // Default error UI
      return this.renderErrorUI();
    }

    return this.props.children;
  }

  private renderErrorUI() {
    const { error, errorInfo, errorId, showDetails, retryCount } = this.state;
    const { level = 'component', showReportButton = true, maxRetries = 3 } = this.props;
    
    const canRetry = retryCount < maxRetries;
    const isPageLevel = level === 'page';

    return (
      <div className="flex items-center justify-center min-h-[400px] p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <div>
                <CardTitle className="text-xl">
                  {isPageLevel ? 'Page Error' : 'Something went wrong'}
                </CardTitle>
                <CardDescription>
                  {isPageLevel 
                    ? 'This page encountered an error and could not be displayed.'
                    : 'A component on this page encountered an error.'
                  }
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Error Message */}
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {error?.message || 'An unexpected error occurred'}
              </AlertDescription>
            </Alert>

            {/* Error ID */}
            {errorId && (
              <div className="text-sm text-muted-foreground">
                Error ID: <code className="bg-muted px-1 py-0.5 rounded">{errorId}</code>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {canRetry && (
                <Button onClick={this.handleRetry} className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                  {retryCount > 0 && (
                    <span className="text-xs opacity-75">({retryCount}/{maxRetries})</span>
                  )}
                </Button>
              )}
              
              {isPageLevel && (
                <Button variant="outline" onClick={this.handleGoHome} className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Go Home
                </Button>
              )}
              
              <Button variant="outline" onClick={this.handleCopyError} className="flex items-center gap-2">
                <Copy className="h-4 w-4" />
                Copy Error
              </Button>
              
              {showReportButton && (
                <Button variant="outline" onClick={this.handleReportIssue} className="flex items-center gap-2">
                  <Bug className="h-4 w-4" />
                  Report Issue
                  <ExternalLink className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Error Details Toggle */}
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => this.setState({ showDetails: !showDetails })}
                className="flex items-center gap-2 text-muted-foreground"
              >
                {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {showDetails ? 'Hide' : 'Show'} Technical Details
              </Button>
              
              {showDetails && (
                <div className="mt-3 space-y-3">
                  {/* Error Stack */}
                  {error?.stack && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Stack Trace:</h4>
                      <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-40">
                        {error.stack}
                      </pre>
                    </div>
                  )}
                  
                  {/* Component Stack */}
                  {errorInfo?.componentStack && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Component Stack:</h4>
                      <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-40">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Retry Limit Reached */}
            {!canRetry && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Maximum retry attempts reached. Please refresh the page or contact support if the problem persists.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }
}

/**
 * Higher-order component for wrapping components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

/**
 * Specialized error boundaries for different app sections
 */
export const PageErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary level="page" showReportButton={true} maxRetries={2}>
    {children}
  </ErrorBoundary>
);

export const SectionErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary level="section" showReportButton={false} maxRetries={3}>
    {children}
  </ErrorBoundary>
);

export const ComponentErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary level="component" showReportButton={false} maxRetries={1}>
    {children}
  </ErrorBoundary>
);