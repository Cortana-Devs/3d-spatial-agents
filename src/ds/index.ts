/**
 * Advanced Data Structures - Main Export Module
 * Feature ID: F03-ADVANCED-DATA-STRUCTURES
 * Version: 1.0.0
 * 
 * High-performance, deterministic data structures for the Descendants engine.
 * Provides unified API for timing, rate limiting, spatial indexing, and more.
 */

// Core types and interfaces
export * from './types';

// Step 3: Time wheel and token bucket (COMPLETED)
export { TimeWheelScheduler, createTimeWheelScheduler } from './timing/TimeWheelScheduler';
export { TokenBucketMap, createTokenBucketMap } from './rate/TokenBucketMap';
export type { TokenBucketConfig, TokenBucketMapOptions } from './rate/TokenBucketMap';

// Step 4: Spatial indices (COMPLETED)
export * from './spatial';

// Step 5: Vector indices (COMPLETED)
export * from './vector';

// Step 6: Weighted scorer + diff engine (COMPLETED)
export * from './scoring';

// Re-export common interfaces for convenience
export type { 
  TimeWheelConfig,
  TimeWheelScheduler as ITimeWheelScheduler,
  TokenBucketMap as ITokenBucketMap,
  TokenBucket,
  DSEvent,
  DSErrorCode
} from './types';

// Version and metadata
export const DS_VERSION = '1.0.0';
export const DS_STEP_COMPLETED = 6; // Steps 1-6 completed

/**
 * Create a basic event emitter for data structure events
 * This is a simple implementation - can be replaced with more sophisticated event system
 */
export function createDSEventEmitter(): (event: import('./types').DSEvent) => void {
  const listeners: Array<(event: import('./types').DSEvent) => void> = [];
  
  const emitter = (event: import('./types').DSEvent) => {
    // Add timestamp if not present
    if (!event.timestamp) {
      event.timestamp = Date.now();
    }
    
    // Emit to all listeners
    for (const listener of listeners) {
      try {
        listener(event);
      } catch (error) {
        console.warn('[DS] Event listener error:', error);
      }
    }
  };

  // Add subscribe method to the emitter function
  (emitter as any).subscribe = (listener: (event: import('./types').DSEvent) => void) => {
    listeners.push(listener);
    return () => {
      const index = listeners.indexOf(listener);
      if (index >= 0) listeners.splice(index, 1);
    };
  };

  return emitter;
}
