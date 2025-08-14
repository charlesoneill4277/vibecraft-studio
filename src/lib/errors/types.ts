/**
 * Standardized error types and classification system
 */

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  NETWORK = 'network',
  API = 'api',
  DATABASE = 'database',
  AI_PROVIDER = 'ai_provider',
  FILE_SYSTEM = 'file_system',
  RATE_LIMIT = 'rate_limit',
  QUOTA_EXCEEDED = 'quota_exceeded',
  SYSTEM = 'system',
  USER_INPUT = 'user_input',
  UNKNOWN = 'unknown',
}

export enum ErrorCode {
  // Authentication Errors
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  AUTH_INVALID = 'AUTH_INVALID',
  AUTH_EXPIRED = 'AUTH_EXPIRED',
  
  // Authorization Errors
  ACCESS_DENIED = 'ACCESS_DENIED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // Validation Errors
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Network Errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  CONNECTION_REFUSED = 'CONNECTION_REFUSED',
  
  // API Errors
  API_ERROR = 'API_ERROR',
  API_RATE_LIMITED = 'API_RATE_LIMITED',
  API_UNAVAILABLE = 'API_UNAVAILABLE',
  
  // Database Errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  DATABASE_CONNECTION_FAILED = 'DATABASE_CONNECTION_FAILED',
  RECORD_NOT_FOUND = 'RECORD_NOT_FOUND',
  DUPLICATE_RECORD = 'DUPLICATE_RECORD',
  
  // AI Provider Errors
  AI_PROVIDER_ERROR = 'AI_PROVIDER_ERROR',
  AI_PROVIDER_UNAVAILABLE = 'AI_PROVIDER_UNAVAILABLE',
  AI_QUOTA_EXCEEDED = 'AI_QUOTA_EXCEEDED',
  AI_INVALID_REQUEST = 'AI_INVALID_REQUEST',
  
  // File System Errors
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_UPLOAD_FAILED = 'FILE_UPLOAD_FAILED',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  
  // System Errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  
  // Unknown
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface ErrorContext {
  userId?: string;
  projectId?: string;
  sessionId?: string;
  userAgent?: string;
  url?: string;
  method?: string;
  timestamp: Date;
  requestId?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
}

export interface AppError {
  id: string;
  code: ErrorCode;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  context: ErrorContext;
  stack?: string;
  cause?: Error;
  recoverable: boolean;
  retryable: boolean;
  recoveryActions?: RecoveryAction[];
}

export interface RecoveryAction {
  id: string;
  label: string;
  description: string;
  action: () => void | Promise<void>;
  primary?: boolean;
}

export interface ErrorReport {
  error: AppError;
  reported: boolean;
  reportedAt?: Date;
  reportId?: string;
}

/**
 * Base class for application errors
 */
export class BaseAppError extends Error {
  public readonly id: string;
  public readonly code: ErrorCode;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly userMessage: string;
  public readonly context: ErrorContext;
  public readonly recoverable: boolean;
  public readonly retryable: boolean;
  public readonly recoveryActions: RecoveryAction[];

  constructor(
    code: ErrorCode,
    category: ErrorCategory,
    severity: ErrorSeverity,
    message: string,
    userMessage: string,
    context: Partial<ErrorContext> = {},
    options: {
      recoverable?: boolean;
      retryable?: boolean;
      recoveryActions?: RecoveryAction[];
      cause?: Error;
    } = {}
  ) {
    super(message);
    
    this.name = 'BaseAppError';
    this.id = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.code = code;
    this.category = category;
    this.severity = severity;
    this.userMessage = userMessage;
    this.context = {
      timestamp: new Date(),
      ...context,
    };
    this.recoverable = options.recoverable ?? true;
    this.retryable = options.retryable ?? false;
    this.recoveryActions = options.recoveryActions ?? [];
    
    if (options.cause) {
      this.cause = options.cause;
    }
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BaseAppError);
    }
  }

  toJSON(): AppError {
    return {
      id: this.id,
      code: this.code,
      category: this.category,
      severity: this.severity,
      message: this.message,
      userMessage: this.userMessage,
      context: this.context,
      stack: this.stack,
      cause: this.cause,
      recoverable: this.recoverable,
      retryable: this.retryable,
      recoveryActions: this.recoveryActions,
    };
  }
}

/**
 * Specific error classes for different categories
 */
export class AuthenticationError extends BaseAppError {
  constructor(
    message: string,
    userMessage: string = 'Authentication required. Please sign in.',
    context: Partial<ErrorContext> = {}
  ) {
    super(
      ErrorCode.AUTH_REQUIRED,
      ErrorCategory.AUTHENTICATION,
      ErrorSeverity.MEDIUM,
      message,
      userMessage,
      context,
      { recoverable: true, retryable: false }
    );
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends BaseAppError {
  constructor(
    message: string,
    userMessage: string = 'You do not have permission to perform this action.',
    context: Partial<ErrorContext> = {}
  ) {
    super(
      ErrorCode.ACCESS_DENIED,
      ErrorCategory.AUTHORIZATION,
      ErrorSeverity.MEDIUM,
      message,
      userMessage,
      context,
      { recoverable: false, retryable: false }
    );
    this.name = 'AuthorizationError';
  }
}

export class ValidationError extends BaseAppError {
  constructor(
    message: string,
    userMessage: string = 'Please check your input and try again.',
    context: Partial<ErrorContext> = {}
  ) {
    super(
      ErrorCode.VALIDATION_FAILED,
      ErrorCategory.VALIDATION,
      ErrorSeverity.LOW,
      message,
      userMessage,
      context,
      { recoverable: true, retryable: false }
    );
    this.name = 'ValidationError';
  }
}

export class NetworkError extends BaseAppError {
  constructor(
    message: string,
    userMessage: string = 'Network connection failed. Please check your internet connection.',
    context: Partial<ErrorContext> = {}
  ) {
    super(
      ErrorCode.NETWORK_ERROR,
      ErrorCategory.NETWORK,
      ErrorSeverity.HIGH,
      message,
      userMessage,
      context,
      { recoverable: true, retryable: true }
    );
    this.name = 'NetworkError';
  }
}

export class AIProviderError extends BaseAppError {
  constructor(
    message: string,
    userMessage: string = 'AI service is temporarily unavailable. Please try again.',
    context: Partial<ErrorContext> = {}
  ) {
    super(
      ErrorCode.AI_PROVIDER_ERROR,
      ErrorCategory.AI_PROVIDER,
      ErrorSeverity.HIGH,
      message,
      userMessage,
      context,
      { recoverable: true, retryable: true }
    );
    this.name = 'AIProviderError';
  }
}

export class DatabaseError extends BaseAppError {
  constructor(
    message: string,
    userMessage: string = 'Database operation failed. Please try again.',
    context: Partial<ErrorContext> = {}
  ) {
    super(
      ErrorCode.DATABASE_ERROR,
      ErrorCategory.DATABASE,
      ErrorSeverity.CRITICAL,
      message,
      userMessage,
      context,
      { recoverable: true, retryable: true }
    );
    this.name = 'DatabaseError';
  }
}

export class SystemError extends BaseAppError {
  constructor(
    message: string,
    userMessage: string = 'A system error occurred. Our team has been notified.',
    context: Partial<ErrorContext> = {}
  ) {
    super(
      ErrorCode.INTERNAL_SERVER_ERROR,
      ErrorCategory.SYSTEM,
      ErrorSeverity.CRITICAL,
      message,
      userMessage,
      context,
      { recoverable: true, retryable: true }
    );
    this.name = 'SystemError';
  }
}