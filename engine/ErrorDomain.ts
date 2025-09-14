/**
 * ErrorDomain - Typed Error System and Recovery Paths
 * Feature: F02-ENGINE
 * 
 * Provides comprehensive error handling with:
 * - Typed error definitions
 * - Error classification and severity levels
 * - Recovery strategies and patterns
 * - Error context and debugging information
 */

import { ENGINE_ERROR_CODES, EngineError, LogLevel } from './types';

/**
 * Error severity levels for prioritizing and handling errors
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Error categories for classification and routing
 */
export type ErrorCategory = 
  | 'permission'
  | 'validation'
  | 'resource'
  | 'system'
  | 'configuration'
  | 'network'
  | 'timeout'
  | 'conflict';

/**
 * Recovery strategy types
 */
export type RecoveryStrategy = 
  | 'retry'
  | 'fallback'
  | 'circuit_breaker'
  | 'escalate'
  | 'ignore'
  | 'manual_intervention';

/**
 * Enhanced error information with context and recovery guidance
 */
export interface EnhancedEngineError extends EngineError {
  severity: ErrorSeverity;
  category: ErrorCategory;
  timestamp: number;
  requestId?: string;
  actorId?: string;
  stack?: string;
  recoverable: boolean;
  suggestedRecovery?: RecoveryStrategy[];
  retryAfterMs?: number;
  context?: Record<string, unknown>;
}

/**
 * Error recovery result
 */
export interface ErrorRecoveryResult {
  success: boolean;
  strategy: RecoveryStrategy;
  message: string;
  retryAfterMs?: number;
  escalated?: boolean;
}

/**
 * Error statistics for monitoring
 */
export interface ErrorStatistics {
  totalErrors: number;
  errorsByCode: Record<string, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  errorsByCategory: Record<ErrorCategory, number>;
  recentErrors: EnhancedEngineError[];
  criticalErrorRate: number;
  mostFrequentErrors: Array<{ code: string; count: number; lastOccurrence: number }>;
}

/**
 * Error pattern for automated detection and handling
 */
export interface ErrorPattern {
  id: string;
  name: string;
  description: string;
  codes: string[];
  threshold: number;
  timeWindowMs: number;
  severity: ErrorSeverity;
  autoRecovery?: RecoveryStrategy;
  notification?: boolean;
}

export class ErrorDomain {
  private errorHistory: EnhancedEngineError[] = [];
  private readonly maxHistorySize: number;
  private readonly logLevel: LogLevel;
  private errorPatterns: Map<string, ErrorPattern> = new Map();
  private errorCounts: Map<string, { count: number; lastSeen: number }> = new Map();

  // Circuit breaker states for error-prone operations
  private circuitBreakers: Map<string, { 
    failures: number; 
    lastFailure: number; 
    state: 'closed' | 'open' | 'half-open' 
  }> = new Map();

  constructor(maxHistorySize: number = 1000, logLevel: LogLevel = 'info') {
    this.maxHistorySize = maxHistorySize;
    this.logLevel = logLevel;
    this.initializeDefaultPatterns();
    this.log('info', '[ERROR_DOMAIN][INIT]');
  }

  /**
   * Create an enhanced error from basic error information
   */
  public createError(
    code: string,
    message: string,
    details?: unknown,
    context?: {
      requestId?: string;
      actorId?: string;
      severity?: ErrorSeverity;
      category?: ErrorCategory;
    }
  ): EnhancedEngineError {
    const errorMetadata = this.getErrorMetadata(code);
    
    const error: EnhancedEngineError = {
      code,
      message,
      details,
      severity: context?.severity || errorMetadata.severity,
      category: context?.category || errorMetadata.category,
      timestamp: Date.now(),
      requestId: context?.requestId,
      actorId: context?.actorId,
      stack: new Error().stack,
      recoverable: errorMetadata.recoverable,
      suggestedRecovery: errorMetadata.suggestedRecovery,
      retryAfterMs: errorMetadata.retryAfterMs,
      context: (details && typeof details === 'object') ? { ...details as Record<string, unknown> } : undefined
    };

    this.recordError(error);
    return error;
  }

  /**
   * Record an error occurrence for tracking and analysis
   */
  public recordError(error: EnhancedEngineError): void {
    // Add to history with rotation
    this.errorHistory.push(error);
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
    }

    // Update error counts
    const errorKey = error.code;
    const currentCount = this.errorCounts.get(errorKey) || { count: 0, lastSeen: 0 };
    this.errorCounts.set(errorKey, {
      count: currentCount.count + 1,
      lastSeen: error.timestamp
    });

    // Check for error patterns
    this.checkErrorPatterns(error);

    // Log based on severity
    const logLevel = this.getLogLevelForSeverity(error.severity);
    this.log(logLevel, `[ERROR][${error.severity.toUpperCase()}][${error.code}] ${error.message}${error.requestId ? ` [req=${error.requestId}]` : ''}${error.actorId ? ` [actor=${error.actorId}]` : ''}`);
  }

  /**
   * Attempt to recover from an error using suggested strategies
   */
  public async attemptRecovery(
    error: EnhancedEngineError,
    retryCallback?: () => Promise<unknown>
  ): Promise<ErrorRecoveryResult> {
    if (!error.recoverable || !error.suggestedRecovery) {
      return {
        success: false,
        strategy: 'manual_intervention',
        message: 'Error is not recoverable or has no suggested recovery strategies'
      };
    }

    for (const strategy of error.suggestedRecovery) {
      const result = await this.executeRecoveryStrategy(strategy, error, retryCallback);
      if (result.success) {
        this.log('info', `[ERROR_RECOVERY][SUCCESS][strategy=${strategy}][code=${error.code}]`);
        return result;
      }
    }

    // All recovery strategies failed
    return {
      success: false,
      strategy: 'escalate',
      message: 'All recovery strategies failed',
      escalated: true
    };
  }

  /**
   * Check if an operation should be allowed based on circuit breaker state
   */
  public checkCircuitBreaker(operationId: string): boolean {
    const breaker = this.circuitBreakers.get(operationId);
    
    if (!breaker) {
      // Initialize circuit breaker
      this.circuitBreakers.set(operationId, { failures: 0, lastFailure: 0, state: 'closed' });
      return true;
    }

    const now = Date.now();
    const timeSinceLastFailure = now - breaker.lastFailure;

    switch (breaker.state) {
      case 'closed':
        return true;
      
      case 'open':
        // Check if enough time has passed to try half-open
        if (timeSinceLastFailure > 60000) { // 1 minute timeout
          breaker.state = 'half-open';
          return true;
        }
        return false;
      
      case 'half-open':
        return true;
      
      default:
        return true;
    }
  }

  /**
   * Record a circuit breaker failure
   */
  public recordCircuitBreakerFailure(operationId: string): void {
    const breaker = this.circuitBreakers.get(operationId) || { failures: 0, lastFailure: 0, state: 'closed' as const };
    
    breaker.failures++;
    breaker.lastFailure = Date.now();

    if (breaker.failures >= 5) { // Threshold for opening circuit
      breaker.state = 'open';
      this.log('warn', `[CIRCUIT_BREAKER][OPEN][operation=${operationId}][failures=${breaker.failures}]`);
    }

    this.circuitBreakers.set(operationId, breaker);
  }

  /**
   * Record a circuit breaker success
   */
  public recordCircuitBreakerSuccess(operationId: string): void {
    const breaker = this.circuitBreakers.get(operationId);
    
    if (breaker) {
      if (breaker.state === 'half-open') {
        breaker.state = 'closed';
        breaker.failures = 0;
        this.log('info', `[CIRCUIT_BREAKER][CLOSED][operation=${operationId}]`);
      }
    }
  }

  /**
   * Get error statistics for monitoring and debugging
   */
  public getStatistics(): ErrorStatistics {
    const now = Date.now();
    const recentWindow = 60000; // 1 minute
    const recentErrors = this.errorHistory.filter(error => now - error.timestamp < recentWindow);

    const errorsByCode: Record<string, number> = {};
    const errorsBySeverity: Record<ErrorSeverity, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    const errorsByCategory: Record<ErrorCategory, number> = {
      permission: 0, validation: 0, resource: 0, system: 0,
      configuration: 0, network: 0, timeout: 0, conflict: 0
    };

    for (const error of this.errorHistory) {
      errorsByCode[error.code] = (errorsByCode[error.code] || 0) + 1;
      errorsBySeverity[error.severity]++;
      errorsByCategory[error.category]++;
    }

    const criticalErrors = this.errorHistory.filter(error => error.severity === 'critical').length;
    const criticalErrorRate = this.errorHistory.length > 0 ? criticalErrors / this.errorHistory.length : 0;

    const mostFrequentErrors = Array.from(this.errorCounts.entries())
      .map(([code, data]) => ({ code, count: data.count, lastOccurrence: data.lastSeen }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalErrors: this.errorHistory.length,
      errorsByCode,
      errorsBySeverity,
      errorsByCategory,
      recentErrors: recentErrors.slice(-10),
      criticalErrorRate,
      mostFrequentErrors
    };
  }

  /**
   * Register a custom error pattern for automated detection
   */
  public registerErrorPattern(pattern: ErrorPattern): void {
    this.errorPatterns.set(pattern.id, pattern);
    this.log('debug', `[ERROR_PATTERN][REGISTERED][id=${pattern.id}][name=${pattern.name}]`);
  }

  /**
   * Get recent errors by severity level
   */
  public getRecentErrorsBySeverity(severity: ErrorSeverity, count: number = 10): EnhancedEngineError[] {
    return this.errorHistory
      .filter(error => error.severity === severity)
      .slice(-count)
      .reverse();
  }

  /**
   * Clear error history (for testing/reset)
   */
  public clear(): void {
    const errorCount = this.errorHistory.length;
    this.errorHistory = [];
    this.errorCounts.clear();
    this.circuitBreakers.clear();
    this.log('info', `[ERROR_DOMAIN][CLEARED][errors=${errorCount}]`);
  }

  /**
   * Execute a specific recovery strategy
   */
  private async executeRecoveryStrategy(
    strategy: RecoveryStrategy,
    error: EnhancedEngineError,
    retryCallback?: () => Promise<unknown>
  ): Promise<ErrorRecoveryResult> {
    switch (strategy) {
      case 'retry':
        if (retryCallback) {
          try {
            await retryCallback();
            return { success: true, strategy, message: 'Retry successful' };
          } catch (retryError) {
            return { 
              success: false, 
              strategy, 
              message: `Retry failed: ${retryError}`,
              retryAfterMs: error.retryAfterMs || 5000
            };
          }
        }
        return { success: false, strategy, message: 'No retry callback provided' };

      case 'fallback':
        return { success: true, strategy, message: 'Fallback strategy applied' };

      case 'circuit_breaker':
        this.recordCircuitBreakerFailure(error.code);
        return { success: true, strategy, message: 'Circuit breaker activated' };

      case 'ignore':
        return { success: true, strategy, message: 'Error ignored as per strategy' };

      default:
        return { success: false, strategy, message: 'Unknown recovery strategy' };
    }
  }

  /**
   * Check for error patterns in recent errors
   */
  private checkErrorPatterns(error: EnhancedEngineError): void {
    for (const pattern of this.errorPatterns.values()) {
      if (pattern.codes.includes(error.code)) {
        const recentMatchingErrors = this.getRecentErrorsForPattern(pattern);
        
        if (recentMatchingErrors.length >= pattern.threshold) {
          this.log('warn', `[ERROR_PATTERN][DETECTED][pattern=${pattern.name}][errors=${recentMatchingErrors.length}]`);
          
          if (pattern.autoRecovery) {
            this.executeRecoveryStrategy(pattern.autoRecovery, error);
          }
        }
      }
    }
  }

  /**
   * Get recent errors matching a specific pattern
   */
  private getRecentErrorsForPattern(pattern: ErrorPattern): EnhancedEngineError[] {
    const cutoff = Date.now() - pattern.timeWindowMs;
    return this.errorHistory.filter(error => 
      error.timestamp >= cutoff && pattern.codes.includes(error.code)
    );
  }

  /**
   * Get metadata for error codes
   */
  private getErrorMetadata(code: string): {
    severity: ErrorSeverity;
    category: ErrorCategory;
    recoverable: boolean;
    suggestedRecovery?: RecoveryStrategy[];
    retryAfterMs?: number;
  } {
    const metadata: Record<string, any> = {
      [ENGINE_ERROR_CODES.PERMISSION_DENIED]: {
        severity: 'medium',
        category: 'permission',
        recoverable: false
      },
      [ENGINE_ERROR_CODES.VALIDATION_FAILED]: {
        severity: 'low',
        category: 'validation',
        recoverable: false
      },
      [ENGINE_ERROR_CODES.ENTITY_NOT_FOUND]: {
        severity: 'medium',
        category: 'resource',
        recoverable: true,
        suggestedRecovery: ['retry', 'fallback']
      },
      [ENGINE_ERROR_CODES.ENTITY_DUPLICATE]: {
        severity: 'low',
        category: 'conflict',
        recoverable: false
      },
      [ENGINE_ERROR_CODES.SCHEDULER_CONFLICT]: {
        severity: 'medium',
        category: 'conflict',
        recoverable: true,
        suggestedRecovery: ['retry'],
        retryAfterMs: 1000
      },
      [ENGINE_ERROR_CODES.NOT_INITIALIZED]: {
        severity: 'high',
        category: 'system',
        recoverable: false
      },
      [ENGINE_ERROR_CODES.INTERNAL_ERROR]: {
        severity: 'high',
        category: 'system',
        recoverable: true,
        suggestedRecovery: ['retry', 'circuit_breaker'],
        retryAfterMs: 5000
      },
      [ENGINE_ERROR_CODES.UNSUPPORTED_REQUEST]: {
        severity: 'low',
        category: 'validation',
        recoverable: false
      },
      [ENGINE_ERROR_CODES.EVENT_OVERFLOW]: {
        severity: 'critical',
        category: 'system',
        recoverable: true,
        suggestedRecovery: ['circuit_breaker']
      }
    };

    return metadata[code] || {
      severity: 'medium',
      category: 'system',
      recoverable: true,
      suggestedRecovery: ['retry']
    };
  }

  /**
   * Initialize default error patterns
   */
  private initializeDefaultPatterns(): void {
    const defaultPatterns: ErrorPattern[] = [
      {
        id: 'rapid_permission_denials',
        name: 'Rapid Permission Denials',
        description: 'Multiple permission denied errors in short timeframe',
        codes: [ENGINE_ERROR_CODES.PERMISSION_DENIED],
        threshold: 5,
        timeWindowMs: 30000,
        severity: 'high',
        autoRecovery: 'circuit_breaker',
        notification: true
      },
      {
        id: 'recurring_internal_errors',
        name: 'Recurring Internal Errors',
        description: 'Multiple internal errors suggesting system instability',
        codes: [ENGINE_ERROR_CODES.INTERNAL_ERROR],
        threshold: 3,
        timeWindowMs: 60000,
        severity: 'critical',
        autoRecovery: 'escalate',
        notification: true
      }
    ];

    for (const pattern of defaultPatterns) {
      this.registerErrorPattern(pattern);
    }
  }

  /**
   * Get log level based on error severity
   */
  private getLogLevelForSeverity(severity: ErrorSeverity): LogLevel {
    switch (severity) {
      case 'low': return 'debug';
      case 'medium': return 'info';
      case 'high': return 'warn';
      case 'critical': return 'error';
      default: return 'info';
    }
  }

  /**
   * Internal logging method
   */
  private log(level: LogLevel, message: string): void {
    if (this.shouldLog(level)) {
      const logMethods = {
        silent: () => {},
        error: console.error,
        warn: console.warn,
        info: console.info,
        debug: console.debug
      };
      
      logMethods[level](message);
    }
  }

  /**
   * Check if message should be logged based on current log level
   */
  private shouldLog(messageLevel: LogLevel): boolean {
    const levels = ['silent', 'error', 'warn', 'info', 'debug'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(messageLevel);
    
    return currentLevelIndex >= messageLevelIndex;
  }
}

/**
 * Factory function to create ErrorDomain instance
 */
export function createErrorDomain(
  maxHistorySize?: number,
  logLevel?: LogLevel
): ErrorDomain {
  return new ErrorDomain(maxHistorySize, logLevel);
}
