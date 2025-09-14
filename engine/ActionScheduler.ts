/**
 * ActionScheduler - Task Scheduling and Execution System
 * Feature: F02-ENGINE
 * 
 * Handles immediate, delayed, and recurring actions with deterministic execution ordering.
 * Provides priority-based scheduling with cancellation support and performance monitoring.
 */

import {
  ScheduledAction,
  ScheduledActionInput,
  LogLevel,
  ENGINE_ERROR_CODES
} from './types';

/**
 * Action execution result
 */
export interface ActionExecutionResult {
  actionId: string;
  success: boolean;
  result?: unknown;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  executionTimeMs: number;
  timestamp: number;
}

/**
 * Scheduled action queue types
 */
type ActionQueue = 'immediate' | 'delayed' | 'recurring';

/**
 * Action executor function type
 */
export type ActionExecutor = (action: ScheduledAction) => Promise<unknown> | unknown;

/**
 * Priority queue implementation for deterministic ordering
 */
class PriorityQueue<T> {
  private items: Array<{ item: T; priority: number; insertionOrder: number }> = [];
  private insertionCounter = 0;

  public enqueue(item: T, priority: number = 0): void {
    this.items.push({ item, priority, insertionOrder: this.insertionCounter++ });
    this.items.sort((a, b) => {
      // Higher priority first, then by insertion order for determinism
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.insertionOrder - b.insertionOrder;
    });
  }

  public dequeue(): T | undefined {
    const result = this.items.shift();
    return result?.item;
  }

  public peek(): T | undefined {
    return this.items[0]?.item;
  }

  public get size(): number {
    return this.items.length;
  }

  public clear(): void {
    this.items = [];
    this.insertionCounter = 0;
  }

  public toArray(): T[] {
    return this.items.map(item => item.item);
  }
}

export class ActionScheduler {
  private actions: Map<string, ScheduledAction> = new Map();
  private immediateQueue: PriorityQueue<string> = new PriorityQueue();
  private delayedActions: ScheduledAction[] = [];
  private executors: Map<string, ActionExecutor> = new Map();
  private readonly logLevel: LogLevel;
  private actionCounter: number = 0;
  private executionHistory: ActionExecutionResult[] = [];
  private readonly maxHistorySize: number;

  // Performance tracking
  private totalExecutions: number = 0;
  private totalExecutionTimeMs: number = 0;
  private failedExecutions: number = 0;

  constructor(maxHistorySize: number = 1000, logLevel: LogLevel = 'info') {
    this.maxHistorySize = maxHistorySize;
    this.logLevel = logLevel;
    this.log('info', '[SCHEDULER][INIT]');
  }

  /**
   * Register an action executor for a specific action type
   */
  public registerExecutor(actionType: string, executor: ActionExecutor): void {
    this.executors.set(actionType, executor);
    this.log('debug', `[SCHEDULER][EXECUTOR_REGISTERED][type=${actionType}]`);
  }

  /**
   * Unregister an action executor
   */
  public unregisterExecutor(actionType: string): void {
    this.executors.delete(actionType);
    this.log('debug', `[SCHEDULER][EXECUTOR_UNREGISTERED][type=${actionType}]`);
  }

  /**
   * Schedule an action
   */
  public scheduleAction(input: ScheduledActionInput): ScheduledAction {
    const action: ScheduledAction = {
      id: input.id || this.generateActionId(),
      runAt: input.runAt,
      repeatEveryMs: input.repeatEveryMs,
      actionType: input.actionType,
      payload: input.payload,
      priority: input.priority || 0,
      createdAt: Date.now(),
      cancelled: false,
      runs: 0
    };

    // Validate action
    this.validateAction(action);

    // Store action
    this.actions.set(action.id, action);

    // Determine queue based on timing
    const now = Date.now();
    if (action.runAt <= now) {
      // Immediate execution
      this.immediateQueue.enqueue(action.id, action.priority);
      this.log('debug', `[SCHEDULER][IMMEDIATE][id=${action.id}][type=${action.actionType}]`);
    } else {
      // Delayed execution
      this.delayedActions.push(action);
      this.sortDelayedActions();
      this.log('debug', `[SCHEDULER][DELAYED][id=${action.id}][type=${action.actionType}][runAt=${action.runAt}]`);
    }

    return action;
  }

  /**
   * Cancel a scheduled action
   */
  public cancelAction(actionId: string): boolean {
    const action = this.actions.get(actionId);
    if (!action) {
      this.log('warn', `[SCHEDULER][CANCEL_FAILED][id=${actionId}][reason=not_found]`);
      return false;
    }

    if (action.cancelled) {
      this.log('debug', `[SCHEDULER][CANCEL_ALREADY][id=${actionId}]`);
      return true;
    }

    action.cancelled = true;
    this.log('info', `[SCHEDULER][CANCELLED][id=${actionId}][type=${action.actionType}]`);
    return true;
  }

  /**
   * Process immediate actions queue
   */
  public async processImmediateActions(): Promise<ActionExecutionResult[]> {
    const results: ActionExecutionResult[] = [];
    
    while (this.immediateQueue.size > 0) {
      const actionId = this.immediateQueue.dequeue();
      if (!actionId) break;

      const action = this.actions.get(actionId);
      if (!action || action.cancelled) {
        continue;
      }

      const result = await this.executeAction(action);
      results.push(result);

      // Handle recurring actions
      if (result.success && action.repeatEveryMs && !action.cancelled) {
        this.rescheduleRecurringAction(action);
      } else if (!action.repeatEveryMs) {
        // Remove non-recurring actions after execution
        this.actions.delete(actionId);
      }
    }

    return results;
  }

  /**
   * Process delayed actions that are now due
   */
  public processDueActions(currentTime?: number): string[] {
    const now = currentTime || Date.now();
    const dueActionIds: string[] = [];

    // Find actions that are now due
    let i = 0;
    while (i < this.delayedActions.length) {
      const action = this.delayedActions[i];
      
      if (action.runAt <= now && !action.cancelled) {
        // Move to immediate queue
        this.immediateQueue.enqueue(action.id, action.priority);
        dueActionIds.push(action.id);
        
        // Remove from delayed queue
        this.delayedActions.splice(i, 1);
      } else {
        i++;
      }
    }

    if (dueActionIds.length > 0) {
      this.log('debug', `[SCHEDULER][DUE_ACTIONS][count=${dueActionIds.length}]`);
    }

    return dueActionIds;
  }

  /**
   * Execute a single action
   */
  private async executeAction(action: ScheduledAction): Promise<ActionExecutionResult> {
    const startTime = performance.now();
    const timestamp = Date.now();

    this.log('debug', `[SCHEDULER][EXECUTE_START][id=${action.id}][type=${action.actionType}][runs=${action.runs}]`);

    try {
      const executor = this.executors.get(action.actionType);
      if (!executor) {
        throw new Error(`No executor registered for action type: ${action.actionType}`);
      }

      // Execute the action
      const result = await executor(action);
      
      // Update action state
      action.runs++;
      
      const executionTimeMs = performance.now() - startTime;
      
      // Update statistics
      this.totalExecutions++;
      this.totalExecutionTimeMs += executionTimeMs;

      const executionResult: ActionExecutionResult = {
        actionId: action.id,
        success: true,
        result,
        executionTimeMs,
        timestamp
      };

      this.addToHistory(executionResult);
      this.log('info', `[SCHEDULER][EXECUTE_SUCCESS][id=${action.id}][duration=${executionTimeMs.toFixed(2)}ms]`);

      return executionResult;

    } catch (error) {
      const executionTimeMs = performance.now() - startTime;
      this.failedExecutions++;

      const executionResult: ActionExecutionResult = {
        actionId: action.id,
        success: false,
        error: {
          code: ENGINE_ERROR_CODES.INTERNAL_ERROR,
          message: `Action execution failed: ${error}`,
          details: { actionType: action.actionType, payload: action.payload, error }
        },
        executionTimeMs,
        timestamp
      };

      this.addToHistory(executionResult);
      this.log('error', `[SCHEDULER][EXECUTE_FAILED][id=${action.id}][error=${error}]`);

      return executionResult;
    }
  }

  /**
   * Reschedule a recurring action
   */
  private rescheduleRecurringAction(action: ScheduledAction): void {
    if (!action.repeatEveryMs || action.cancelled) {
      return;
    }

    action.runAt = Date.now() + action.repeatEveryMs;
    this.delayedActions.push(action);
    this.sortDelayedActions();

    this.log('debug', `[SCHEDULER][RECURRING_RESCHEDULED][id=${action.id}][nextRun=${action.runAt}]`);
  }

  /**
   * Get action by ID
   */
  public getAction(actionId: string): ScheduledAction | undefined {
    return this.actions.get(actionId);
  }

  /**
   * Get all scheduled actions
   */
  public getAllActions(): ScheduledAction[] {
    return Array.from(this.actions.values());
  }

  /**
   * Get active (non-cancelled) actions
   */
  public getActiveActions(): ScheduledAction[] {
    return Array.from(this.actions.values()).filter(action => !action.cancelled);
  }

  /**
   * Get pending actions count
   */
  public getPendingActionsCount(): number {
    return this.immediateQueue.size + this.delayedActions.filter(a => !a.cancelled).length;
  }

  /**
   * Get next action execution time
   */
  public getNextExecutionTime(): number | null {
    if (this.immediateQueue.size > 0) {
      return Date.now(); // Immediate execution available
    }

    const activeDelayed = this.delayedActions.filter(a => !a.cancelled);
    if (activeDelayed.length === 0) {
      return null;
    }

    return Math.min(...activeDelayed.map(a => a.runAt));
  }

  /**
   * Get scheduler statistics
   */
  public getStatistics(): {
    totalActions: number;
    activeActions: number;
    pendingActions: number;
    immediateQueueSize: number;
    delayedActionsCount: number;
    totalExecutions: number;
    failedExecutions: number;
    averageExecutionTimeMs: number;
    successRate: number;
    registeredExecutors: string[];
    nextExecutionInMs: number | null;
  } {
    const nextExecution = this.getNextExecutionTime();
    const nextExecutionInMs = nextExecution ? Math.max(0, nextExecution - Date.now()) : null;

    return {
      totalActions: this.actions.size,
      activeActions: this.getActiveActions().length,
      pendingActions: this.getPendingActionsCount(),
      immediateQueueSize: this.immediateQueue.size,
      delayedActionsCount: this.delayedActions.filter(a => !a.cancelled).length,
      totalExecutions: this.totalExecutions,
      failedExecutions: this.failedExecutions,
      averageExecutionTimeMs: this.totalExecutions > 0 ? this.totalExecutionTimeMs / this.totalExecutions : 0,
      successRate: this.totalExecutions > 0 ? (this.totalExecutions - this.failedExecutions) / this.totalExecutions : 1,
      registeredExecutors: Array.from(this.executors.keys()),
      nextExecutionInMs
    };
  }

  /**
   * Clear all actions (for testing/reset)
   */
  public clear(): void {
    const actionCount = this.actions.size;
    this.actions.clear();
    this.immediateQueue.clear();
    this.delayedActions = [];
    this.executionHistory = [];
    
    this.log('info', `[SCHEDULER][CLEARED][actions=${actionCount}]`);
  }

  /**
   * Get recent execution history
   */
  public getExecutionHistory(count?: number): ActionExecutionResult[] {
    const history = this.executionHistory.slice();
    if (count !== undefined) {
      return history.slice(-count);
    }
    return history;
  }

  /**
   * Validate action input
   */
  private validateAction(action: ScheduledAction): void {
    if (!action.actionType) {
      throw new Error('Action type is required');
    }

    if (action.runAt < 0) {
      throw new Error('runAt cannot be negative');
    }

    if (action.repeatEveryMs !== undefined && action.repeatEveryMs <= 0) {
      throw new Error('repeatEveryMs must be positive');
    }

    if (this.actions.has(action.id)) {
      throw new Error(`Action with ID ${action.id} already exists`);
    }
  }

  /**
   * Sort delayed actions by execution time for deterministic ordering
   */
  private sortDelayedActions(): void {
    this.delayedActions.sort((a, b) => {
      if (a.runAt !== b.runAt) {
        return a.runAt - b.runAt;
      }
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.id.localeCompare(b.id); // Deterministic tiebreaker
    });
  }

  /**
   * Generate unique action ID
   */
  private generateActionId(): string {
    return `action_${Date.now()}_${++this.actionCounter}`;
  }

  /**
   * Add execution result to history with rotation
   */
  private addToHistory(result: ActionExecutionResult): void {
    this.executionHistory.push(result);
    
    if (this.executionHistory.length > this.maxHistorySize) {
      this.executionHistory = this.executionHistory.slice(-this.maxHistorySize);
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
 * Factory function to create ActionScheduler instance
 */
export function createActionScheduler(
  maxHistorySize?: number,
  logLevel?: LogLevel
): ActionScheduler {
  return new ActionScheduler(maxHistorySize, logLevel);
}
