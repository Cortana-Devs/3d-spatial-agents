/**
 * RequestRouter - Request Validation and Dispatch Pipeline
 * Feature: F02-ENGINE
 * 
 * Handles all engine request processing including:
 * - Request validation and type checking
 * - Permission validation
 * - Request dispatch to appropriate handlers
 * - Response packaging and error handling
 */

import {
  EngineRequest,
  EngineResponse,
  RequestId,
  EntityId,
  Role,
  Capability,
  LogLevel,
  ENGINE_ERROR_CODES
} from './types';

import { PermissionMatrix } from './PermissionMatrix';

/**
 * Request handler function type
 */
export type RequestHandler<T extends EngineRequest = EngineRequest> = (
  request: T
) => Promise<unknown> | unknown;

/**
 * Request validation result
 */
export interface RequestValidationResult {
  valid: boolean;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Request processing pipeline result
 */
export interface RequestProcessingResult {
  requestId: RequestId;
  success: boolean;
  result?: unknown;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  elapsedMs: number;
  stages: {
    validation: number;
    permission: number;
    execution: number;
  };
}

/**
 * Request capability mapping for permission checks
 */
const REQUEST_CAPABILITY_MAP: Record<string, Capability[]> = {
  'entity.register': ['ENTITY_REGISTER'],
  'entity.updateMeta': ['ENTITY_CONTROL'],
  'world.mutate': ['WORLD_MUTATE'],
  'scheduler.schedule': ['SCHEDULE_ACTION'],
  'agent.cycle': ['AGENT_DECIDE'],
  'engine.snapshot': ['ENGINE_INTROSPECT'],
  'strategy.switch': ['STRATEGY_SWITCH']
};

export class RequestRouter {
  private handlers: Map<string, RequestHandler> = new Map();
  private permissionMatrix: PermissionMatrix;
  private readonly logLevel: LogLevel;
  private requestCounter: number = 0;
  private processingStats: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    totalProcessingTimeMs: number;
    averageLatencyMs: number;
  } = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalProcessingTimeMs: 0,
    averageLatencyMs: 0
  };

  constructor(permissionMatrix: PermissionMatrix, logLevel: LogLevel = 'info') {
    this.permissionMatrix = permissionMatrix;
    this.logLevel = logLevel;
    this.log('info', '[ROUTER][INIT]');
  }

  /**
   * Register a request handler for a specific request type
   */
  public registerHandler<T extends EngineRequest>(
    requestType: T['type'],
    handler: RequestHandler<T>
  ): void {
    this.handlers.set(requestType, handler as RequestHandler);
    this.log('debug', `[ROUTER][HANDLER_REGISTERED][type=${requestType}]`);
  }

  /**
   * Unregister a request handler
   */
  public unregisterHandler(requestType: string): void {
    this.handlers.delete(requestType);
    this.log('debug', `[ROUTER][HANDLER_UNREGISTERED][type=${requestType}]`);
  }

  /**
   * Process a request through the complete pipeline
   */
  public async processRequest(request: EngineRequest): Promise<EngineResponse> {
    const startTime = performance.now();
    const stages = { validation: 0, permission: 0, execution: 0 };

    this.log('debug', `[ROUTER][PROCESS_START][id=${request.id}][type=${request.type}][actor=${request.actorId}]`);

    try {
      // Stage 1: Request Validation
      const validationStart = performance.now();
      const validationResult = this.validateRequest(request);
      stages.validation = performance.now() - validationStart;

      if (!validationResult.valid) {
        return this.createErrorResponse(
          request.id,
          validationResult.error!,
          performance.now() - startTime
        );
      }

      // Stage 2: Permission Check
      const permissionStart = performance.now();
      const permissionResult = this.checkPermissions(request);
      stages.permission = performance.now() - permissionStart;

      if (!permissionResult.allowed) {
        const error = {
          code: ENGINE_ERROR_CODES.PERMISSION_DENIED,
          message: `Permission denied: ${permissionResult.reason}`,
          details: {
            actorId: request.actorId,
            role: request.role,
            requiredCapabilities: REQUEST_CAPABILITY_MAP[request.type] || []
          }
        };

        return this.createErrorResponse(
          request.id,
          error,
          performance.now() - startTime
        );
      }

      // Stage 3: Request Execution
      const executionStart = performance.now();
      const result = await this.executeRequest(request);
      stages.execution = performance.now() - executionStart;

      const elapsedMs = performance.now() - startTime;

      // Update statistics
      this.updateStats(true, elapsedMs);

      this.log('info', `[ROUTER][PROCESS_SUCCESS][id=${request.id}][duration=${elapsedMs.toFixed(2)}ms]`);

      return {
        requestId: request.id,
        ok: true,
        result,
        elapsedMs
      };

    } catch (error) {
      const elapsedMs = performance.now() - startTime;
      this.updateStats(false, elapsedMs);

      const engineError = {
        code: ENGINE_ERROR_CODES.INTERNAL_ERROR,
        message: `Request processing failed: ${error}`,
        details: { requestType: request.type, originalError: error }
      };

      this.log('error', `[ROUTER][PROCESS_FAILED][id=${request.id}][error=${error}]`);

      return this.createErrorResponse(request.id, engineError, elapsedMs);
    }
  }

  /**
   * Validate request structure and required fields
   */
  private validateRequest(request: EngineRequest): RequestValidationResult {
    // Basic structure validation
    if (!request.id || typeof request.id !== 'string') {
      return {
        valid: false,
        error: {
          code: ENGINE_ERROR_CODES.VALIDATION_FAILED,
          message: 'Request ID is required and must be a string',
          details: { field: 'id', value: request.id }
        }
      };
    }

    if (!request.actorId || typeof request.actorId !== 'string') {
      return {
        valid: false,
        error: {
          code: ENGINE_ERROR_CODES.VALIDATION_FAILED,
          message: 'Actor ID is required and must be a string',
          details: { field: 'actorId', value: request.actorId }
        }
      };
    }

    if (!request.role || !['HUMAN', 'SIMULANT', 'SYSTEM'].includes(request.role)) {
      return {
        valid: false,
        error: {
          code: ENGINE_ERROR_CODES.VALIDATION_FAILED,
          message: 'Role is required and must be HUMAN, SIMULANT, or SYSTEM',
          details: { field: 'role', value: request.role }
        }
      };
    }

    if (!request.type || typeof request.type !== 'string') {
      return {
        valid: false,
        error: {
          code: ENGINE_ERROR_CODES.VALIDATION_FAILED,
          message: 'Request type is required and must be a string',
          details: { field: 'type', value: request.type }
        }
      };
    }

    if (!request.timestamp || typeof request.timestamp !== 'number') {
      return {
        valid: false,
        error: {
          code: ENGINE_ERROR_CODES.VALIDATION_FAILED,
          message: 'Timestamp is required and must be a number',
          details: { field: 'timestamp', value: request.timestamp }
        }
      };
    }

    // Type-specific validation
    const typeValidation = this.validateRequestType(request);
    if (!typeValidation.valid) {
      return typeValidation;
    }

    return { valid: true };
  }

  /**
   * Validate request-specific payload structure
   */
  private validateRequestType(request: EngineRequest): RequestValidationResult {
    switch (request.type) {
      case 'entity.register':
        if (!request.payload.entityId || typeof request.payload.entityId !== 'string') {
          return {
            valid: false,
            error: {
              code: ENGINE_ERROR_CODES.VALIDATION_FAILED,
              message: 'Entity ID is required for entity registration',
              details: { field: 'payload.entityId', value: request.payload.entityId }
            }
          };
        }
        if (!request.payload.kind || typeof request.payload.kind !== 'string') {
          return {
            valid: false,
            error: {
              code: ENGINE_ERROR_CODES.VALIDATION_FAILED,
              message: 'Entity kind is required for entity registration',
              details: { field: 'payload.kind', value: request.payload.kind }
            }
          };
        }
        break;

      case 'entity.updateMeta':
        if (!request.payload.target || typeof request.payload.target !== 'string') {
          return {
            valid: false,
            error: {
              code: ENGINE_ERROR_CODES.VALIDATION_FAILED,
              message: 'Target entity ID is required for metadata update',
              details: { field: 'payload.target', value: request.payload.target }
            }
          };
        }
        if (!request.payload.patch || typeof request.payload.patch !== 'object') {
          return {
            valid: false,
            error: {
              code: ENGINE_ERROR_CODES.VALIDATION_FAILED,
              message: 'Patch object is required for metadata update',
              details: { field: 'payload.patch', value: request.payload.patch }
            }
          };
        }
        break;

      case 'world.mutate':
        if (!request.payload.operation || typeof request.payload.operation !== 'string') {
          return {
            valid: false,
            error: {
              code: ENGINE_ERROR_CODES.VALIDATION_FAILED,
              message: 'Operation is required for world mutation',
              details: { field: 'payload.operation', value: request.payload.operation }
            }
          };
        }
        break;

      case 'scheduler.schedule':
        if (!request.payload.action || typeof request.payload.action !== 'object') {
          return {
            valid: false,
            error: {
              code: ENGINE_ERROR_CODES.VALIDATION_FAILED,
              message: 'Action object is required for scheduling',
              details: { field: 'payload.action', value: request.payload.action }
            }
          };
        }
        break;

      case 'agent.cycle':
        if (!request.payload.agentId || typeof request.payload.agentId !== 'string') {
          return {
            valid: false,
            error: {
              code: ENGINE_ERROR_CODES.VALIDATION_FAILED,
              message: 'Agent ID is required for agent cycle',
              details: { field: 'payload.agentId', value: request.payload.agentId }
            }
          };
        }
        break;

      case 'strategy.switch':
        if (!request.payload.agentId || typeof request.payload.agentId !== 'string') {
          return {
            valid: false,
            error: {
              code: ENGINE_ERROR_CODES.VALIDATION_FAILED,
              message: 'Agent ID is required for strategy switch',
              details: { field: 'payload.agentId', value: request.payload.agentId }
            }
          };
        }
        if (!request.payload.strategyId || typeof request.payload.strategyId !== 'string') {
          return {
            valid: false,
            error: {
              code: ENGINE_ERROR_CODES.VALIDATION_FAILED,
              message: 'Strategy ID is required for strategy switch',
              details: { field: 'payload.strategyId', value: request.payload.strategyId }
            }
          };
        }
        break;

      case 'engine.snapshot':
        // No specific validation needed for snapshot requests
        break;

      default:
        return {
          valid: false,
          error: {
            code: ENGINE_ERROR_CODES.UNSUPPORTED_REQUEST,
            message: `Unsupported request type: ${request.type}`,
            details: { requestType: request.type }
          }
        };
    }

    return { valid: true };
  }

  /**
   * Check if the request actor has required permissions
   */
  private checkPermissions(request: EngineRequest): { allowed: boolean; reason?: string } {
    const requiredCapabilities = REQUEST_CAPABILITY_MAP[request.type];
    
    if (!requiredCapabilities || requiredCapabilities.length === 0) {
      // No specific permissions required
      return { allowed: true };
    }

    // Check if actor has all required capabilities
    const hasPermission = this.permissionMatrix.hasAllCapabilities(
      request.actorId,
      request.role,
      requiredCapabilities,
      request.id
    );

    if (!hasPermission) {
      return {
        allowed: false,
        reason: `Missing required capabilities: ${requiredCapabilities.join(', ')}`
      };
    }

    return { allowed: true };
  }

  /**
   * Execute the request using registered handler
   */
  private async executeRequest(request: EngineRequest): Promise<unknown> {
    const handler = this.handlers.get(request.type);
    
    if (!handler) {
      throw new Error(`No handler registered for request type: ${request.type}`);
    }

    return await handler(request);
  }

  /**
   * Create error response
   */
  private createErrorResponse(
    requestId: RequestId,
    error: { code: string; message: string; details?: unknown },
    elapsedMs: number
  ): EngineResponse {
    return {
      requestId,
      ok: false,
      error,
      elapsedMs
    };
  }

  /**
   * Update processing statistics
   */
  private updateStats(success: boolean, elapsedMs: number): void {
    this.processingStats.totalRequests++;
    this.processingStats.totalProcessingTimeMs += elapsedMs;
    
    if (success) {
      this.processingStats.successfulRequests++;
    } else {
      this.processingStats.failedRequests++;
    }

    this.processingStats.averageLatencyMs = 
      this.processingStats.totalProcessingTimeMs / this.processingStats.totalRequests;
  }

  /**
   * Get processing statistics
   */
  public getStatistics(): {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    successRate: number;
    averageLatencyMs: number;
    registeredHandlers: string[];
  } {
    const successRate = this.processingStats.totalRequests > 0 
      ? this.processingStats.successfulRequests / this.processingStats.totalRequests 
      : 1;

    return {
      ...this.processingStats,
      successRate,
      registeredHandlers: Array.from(this.handlers.keys())
    };
  }

  /**
   * Generate a unique request ID
   */
  public generateRequestId(): RequestId {
    return `req_${Date.now()}_${++this.requestCounter}`;
  }

  /**
   * Clear all handlers and reset statistics (for testing)
   */
  public clear(): void {
    this.handlers.clear();
    this.processingStats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalProcessingTimeMs: 0,
      averageLatencyMs: 0
    };
    this.requestCounter = 0;
    this.log('info', '[ROUTER][CLEARED]');
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
 * Factory function to create RequestRouter instance
 */
export function createRequestRouter(
  permissionMatrix: PermissionMatrix,
  logLevel?: LogLevel
): RequestRouter {
  return new RequestRouter(permissionMatrix, logLevel);
}
