// Error types and classes
export * from './types';

// Error logger
export { errorLogger } from './logger';
export type { ErrorAnalytics, ErrorLogEntry, ErrorReportingConfig } from './logger';

// API error handler
export { APIErrorHandler, withAPIErrorHandling, withAuth, withRateLimit, withValidation } from './api-handler';
export type { APIErrorResponse, APISuccessResponse } from './api-handler';

// React components (re-exported for convenience)
// Note: Import these directly from their component files in your app
// export { ErrorBoundary, withErrorBoundary, PageErrorBoundary, SectionErrorBoundary, ComponentErrorBoundary } from '@/components/errors/error-boundary';
// export { ErrorDisplay, ErrorList } from '@/components/errors/error-display';
// export { ErrorAnalyticsDashboard } from '@/components/errors/error-analytics';

// React hooks (re-exported for convenience)
// Note: Import these directly from their hook files in your app
// export { useErrorHandler, useAsyncWithError, useFormErrors, useErrorMonitoring } from '@/hooks/use-error-handler';