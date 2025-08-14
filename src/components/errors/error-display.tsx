'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  XCircle, 
  AlertCircle, 
  Info, 
  RefreshCw, 
  Home, 
  Settings, 
  ExternalLink,
  Clock,
  Shield,
  Wifi,
  Database,
  Bot,
  FileX,
  Zap
} from 'lucide-react';
import { AppError, ErrorSeverity, ErrorCategory, RecoveryAction } from '@/lib/errors/types';

interface ErrorDisplayProps {
  error: AppError;
  onRetry?: () => void;
  onDismiss?: () => void;
  compact?: boolean;
  showRecoveryActions?: boolean;
}

/**
 * User-friendly error display component
 */
export function ErrorDisplay({ 
  error, 
  onRetry, 
  onDismiss, 
  compact = false,
  showRecoveryActions = true 
}: ErrorDisplayProps) {
  const getSeverityIcon = (severity: ErrorSeverity) => {
    switch (severity) {
      case ErrorSeverity.LOW:
        return <Info className="h-4 w-4 text-blue-500" />;
      case ErrorSeverity.MEDIUM:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case ErrorSeverity.HIGH:
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case ErrorSeverity.CRITICAL:
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getCategoryIcon = (category: ErrorCategory) => {
    switch (category) {
      case ErrorCategory.AUTHENTICATION:
      case ErrorCategory.AUTHORIZATION:
        return <Shield className="h-4 w-4" />;
      case ErrorCategory.NETWORK:
        return <Wifi className="h-4 w-4" />;
      case ErrorCategory.DATABASE:
        return <Database className="h-4 w-4" />;
      case ErrorCategory.AI_PROVIDER:
        return <Bot className="h-4 w-4" />;
      case ErrorCategory.FILE_SYSTEM:
        return <FileX className="h-4 w-4" />;
      case ErrorCategory.RATE_LIMIT:
      case ErrorCategory.QUOTA_EXCEEDED:
        return <Zap className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getSeverityVariant = (severity: ErrorSeverity): 'default' | 'destructive' => {
    return severity === ErrorSeverity.HIGH || severity === ErrorSeverity.CRITICAL 
      ? 'destructive' 
      : 'default';
  };

  const getSeverityColor = (severity: ErrorSeverity): string => {
    switch (severity) {
      case ErrorSeverity.LOW:
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case ErrorSeverity.MEDIUM:
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case ErrorSeverity.HIGH:
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case ErrorSeverity.CRITICAL:
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const handleRecoveryAction = (action: RecoveryAction) => {
    try {
      action.action();
    } catch (err) {
      console.error('Recovery action failed:', err);
    }
  };

  if (compact) {
    return (
      <Alert variant={getSeverityVariant(error.severity)} className="mb-4">
        <div className="flex items-center gap-2">
          {getSeverityIcon(error.severity)}
          {getCategoryIcon(error.category)}
        </div>
        <AlertDescription className="flex items-center justify-between">
          <span>{error.userMessage}</span>
          <div className="flex items-center gap-2 ml-4">
            {error.retryable && onRetry && (
              <Button size="sm" variant="outline" onClick={onRetry}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            )}
            {onDismiss && (
              <Button size="sm" variant="ghost" onClick={onDismiss}>
                ×
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className={`border-l-4 ${getSeverityColor(error.severity)}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {getSeverityIcon(error.severity)}
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Error Occurred
                <Badge variant="outline" className="text-xs">
                  {error.category.replace('_', ' ')}
                </Badge>
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Clock className="h-3 w-3" />
                {error.context.timestamp.toLocaleString()}
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {error.severity}
            </Badge>
            {onDismiss && (
              <Button size="sm" variant="ghost" onClick={onDismiss}>
                ×
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* User Message */}
        <Alert variant={getSeverityVariant(error.severity)}>
          {getCategoryIcon(error.category)}
          <AlertDescription>{error.userMessage}</AlertDescription>
        </Alert>

        {/* Error Details */}
        <div className="text-sm text-muted-foreground space-y-2">
          <div>
            <strong>Error Code:</strong> <code className="bg-muted px-1 py-0.5 rounded">{error.code}</code>
          </div>
          <div>
            <strong>Error ID:</strong> <code className="bg-muted px-1 py-0.5 rounded">{error.id}</code>
          </div>
          {error.context.component && (
            <div>
              <strong>Component:</strong> {error.context.component}
            </div>
          )}
          {error.context.url && (
            <div>
              <strong>URL:</strong> {error.context.url}
            </div>
          )}
        </div>

        {/* Recovery Actions */}
        {showRecoveryActions && error.recoveryActions && error.recoveryActions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Suggested Actions:</h4>
            <div className="flex flex-wrap gap-2">
              {error.recoveryActions.map((action) => (
                <Button
                  key={action.id}
                  size="sm"
                  variant={action.primary ? "default" : "outline"}
                  onClick={() => handleRecoveryAction(action)}
                  className="text-xs"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Default Actions */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          {error.retryable && onRetry && (
            <Button size="sm" onClick={onRetry} className="flex items-center gap-2">
              <RefreshCw className="h-3 w-3" />
              Try Again
            </Button>
          )}
          
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => window.location.href = '/dashboard'}
            className="flex items-center gap-2"
          >
            <Home className="h-3 w-3" />
            Go Home
          </Button>
          
          {error.category === ErrorCategory.AUTHENTICATION && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => window.location.href = '/login'}
              className="flex items-center gap-2"
            >
              <Shield className="h-3 w-3" />
              Sign In
            </Button>
          )}
          
          {(error.category === ErrorCategory.AI_PROVIDER || error.category === ErrorCategory.QUOTA_EXCEEDED) && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => window.location.href = '/settings/ai-providers'}
              className="flex items-center gap-2"
            >
              <Settings className="h-3 w-3" />
              AI Settings
            </Button>
          )}
        </div>

        {/* Help Link */}
        {error.severity === ErrorSeverity.HIGH || error.severity === ErrorSeverity.CRITICAL ? (
          <div className="text-xs text-muted-foreground">
            Need help? {' '}
            <a 
              href={`/help/errors/${error.code.toLowerCase()}`}
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              View troubleshooting guide
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * Error list component for displaying multiple errors
 */
interface ErrorListProps {
  errors: AppError[];
  onRetry?: (errorId: string) => void;
  onDismiss?: (errorId: string) => void;
  onClearAll?: () => void;
  maxVisible?: number;
}

export function ErrorList({ 
  errors, 
  onRetry, 
  onDismiss, 
  onClearAll,
  maxVisible = 5 
}: ErrorListProps) {
  const visibleErrors = errors.slice(0, maxVisible);
  const hiddenCount = Math.max(0, errors.length - maxVisible);

  if (errors.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">
          Recent Errors ({errors.length})
        </h3>
        {onClearAll && errors.length > 0 && (
          <Button size="sm" variant="outline" onClick={onClearAll}>
            Clear All
          </Button>
        )}
      </div>
      
      <div className="space-y-3">
        {visibleErrors.map((error) => (
          <ErrorDisplay
            key={error.id}
            error={error}
            onRetry={onRetry ? () => onRetry(error.id) : undefined}
            onDismiss={onDismiss ? () => onDismiss(error.id) : undefined}
            compact={true}
            showRecoveryActions={false}
          />
        ))}
        
        {hiddenCount > 0 && (
          <div className="text-center text-sm text-muted-foreground py-2">
            ... and {hiddenCount} more error{hiddenCount !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}