/**
 * EventBus - Typed Event System for Engine Internal Communication
 * Feature: F02-ENGINE
 * 
 * Provides type-safe pub/sub event system with:
 * - Discriminated union event types
 * - Depth overflow protection
 * - Synchronous event dispatch
 * - Clean subscription management
 */

import {
  EngineEvent,
  EventListener,
  EventListenerMap,
  EventId,
  LogLevel,
  ENGINE_ERROR_CODES
} from './types';

export class EventBus {
  private listeners: EventListenerMap = new Map();
  private eventDepth: number = 0;
  private readonly maxEventDepth: number;
  private readonly logLevel: LogLevel;
  private eventCounter: number = 0;

  constructor(maxEventDepth: number = 32, logLevel: LogLevel = 'info') {
    this.maxEventDepth = maxEventDepth;
    this.logLevel = logLevel;
  }

  /**
   * Subscribe to events of a specific type
   */
  public on<T extends EngineEvent>(
    eventType: T['type'],
    listener: EventListener<T>
  ): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    const listenersSet = this.listeners.get(eventType)!;
    listenersSet.add(listener as EventListener);

    this.log('debug', `[EVENT][SUB][type=${eventType}][listeners=${listenersSet.size}]`);

    // Return unsubscribe function
    return () => {
      listenersSet.delete(listener as EventListener);
      if (listenersSet.size === 0) {
        this.listeners.delete(eventType);
      }
      this.log('debug', `[EVENT][UNSUB][type=${eventType}][remaining=${listenersSet.size}]`);
    };
  }

  /**
   * Remove specific listener
   */
  public off<T extends EngineEvent>(
    eventType: T['type'],
    listener: EventListener<T>
  ): void {
    const listenersSet = this.listeners.get(eventType);
    if (listenersSet) {
      listenersSet.delete(listener as EventListener);
      if (listenersSet.size === 0) {
        this.listeners.delete(eventType);
      }
      this.log('debug', `[EVENT][OFF][type=${eventType}][remaining=${listenersSet.size}]`);
    }
  }

  /**
   * Remove all listeners for a specific event type
   */
  public removeAllListeners(eventType?: string): void {
    if (eventType) {
      this.listeners.delete(eventType);
      this.log('debug', `[EVENT][CLEAR][type=${eventType}]`);
    } else {
      const totalListeners = Array.from(this.listeners.values())
        .reduce((sum, set) => sum + set.size, 0);
      this.listeners.clear();
      this.log('debug', `[EVENT][CLEAR_ALL][removed=${totalListeners}]`);
    }
  }

  /**
   * Emit an event to all registered listeners
   * Includes depth overflow protection to prevent infinite recursion
   */
  public emit<T extends EngineEvent>(event: T): boolean {
    // Check for event overflow protection
    if (this.eventDepth >= this.maxEventDepth) {
      this.log('error', `[EVENT][OVERFLOW][depth=${this.eventDepth}][type=${event.type}]`);
      
      // Emit error event (if not already in overflow to prevent infinite loop)
      if (event.type !== 'error:raised') {
        this.emitError({
          code: ENGINE_ERROR_CODES.EVENT_OVERFLOW,
          message: `Event depth overflow at ${this.eventDepth}`,
          details: { eventType: event.type, maxDepth: this.maxEventDepth }
        });
      }
      return false;
    }

    const listenersSet = this.listeners.get(event.type);
    if (!listenersSet || listenersSet.size === 0) {
      this.log('debug', `[EVENT][EMIT][type=${event.type}][listeners=0]`);
      return true;
    }

    this.eventDepth++;
    const startTime = performance.now();

    try {
      this.log('debug', `[EVENT][EMIT][type=${event.type}][listeners=${listenersSet.size}][depth=${this.eventDepth}]`);

      // Create a copy of listeners to handle concurrent modifications
      const listeners = Array.from(listenersSet);
      
      for (const listener of listeners) {
        try {
          listener(event);
        } catch (error) {
          this.log('error', `[EVENT][LISTENER_ERROR][type=${event.type}][error=${error}]`);
          
          // Emit error event for listener failures (avoid recursion for error events)
          if (event.type !== 'error:raised') {
            this.emitError({
              code: ENGINE_ERROR_CODES.INTERNAL_ERROR,
              message: `Event listener failed for ${event.type}`,
              details: { originalEvent: event, listenerError: error }
            });
          }
        }
      }

      const elapsedMs = performance.now() - startTime;
      this.log('debug', `[EVENT][EMIT_COMPLETE][type=${event.type}][duration=${elapsedMs.toFixed(2)}ms]`);

      return true;
    } finally {
      this.eventDepth--;
    }
  }

  /**
   * Helper method to emit error events
   */
  private emitError(error: { code: string; message: string; details?: unknown }): void {
    const errorEvent: EngineEvent = {
      eventId: this.generateEventId(),
      timestamp: Date.now(),
      type: 'error:raised',
      payload: { error, context: { eventDepth: this.eventDepth } }
    } as any; // Type assertion needed due to discriminated union complexity

    // Direct emit to avoid recursion issues
    const listenersSet = this.listeners.get('error:raised');
    if (listenersSet) {
      for (const listener of listenersSet) {
        try {
          listener(errorEvent);
        } catch (listenerError) {
          this.log('error', `[EVENT][ERROR_LISTENER_FAILED][error=${listenerError}]`);
        }
      }
    }
  }

  /**
   * Get current event depth (for debugging)
   */
  public getCurrentDepth(): number {
    return this.eventDepth;
  }

  /**
   * Get listener count for a specific event type
   */
  public getListenerCount(eventType: string): number {
    const listenersSet = this.listeners.get(eventType);
    return listenersSet ? listenersSet.size : 0;
  }

  /**
   * Get total listener count across all event types
   */
  public getTotalListenerCount(): number {
    return Array.from(this.listeners.values())
      .reduce((sum, set) => sum + set.size, 0);
  }

  /**
   * Get all registered event types
   */
  public getRegisteredEventTypes(): string[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * Create snapshot of EventBus state for debugging
   */
  public getSnapshot(): {
    totalListeners: number;
    eventTypes: Record<string, number>;
    currentDepth: number;
    maxDepth: number;
    eventsEmitted: number;
  } {
    const eventTypes: Record<string, number> = {};
    
    for (const [eventType, listenersSet] of this.listeners) {
      eventTypes[eventType] = listenersSet.size;
    }

    return {
      totalListeners: this.getTotalListenerCount(),
      eventTypes,
      currentDepth: this.eventDepth,
      maxDepth: this.maxEventDepth,
      eventsEmitted: this.eventCounter
    };
  }

  /**
   * Generate unique event ID
   */
  public generateEventId(): EventId {
    return `evt_${Date.now()}_${++this.eventCounter}`;
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

  /**
   * Reset the EventBus (useful for testing)
   */
  public reset(): void {
    this.listeners.clear();
    this.eventDepth = 0;
    this.eventCounter = 0;
    this.log('debug', '[EVENT][RESET]');
  }
}

/**
 * Factory function to create EventBus instance
 */
export function createEventBus(
  maxEventDepth?: number,
  logLevel?: LogLevel
): EventBus {
  return new EventBus(maxEventDepth, logLevel);
}
