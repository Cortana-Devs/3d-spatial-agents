/**
 * TimeWheelScheduler - High Performance Bucketed Timer
 * Feature ID: F03-ADVANCED-DATA-STRUCTURES - Step 3
 * 
 * Implements efficient O(k) tick scheduling where k = number of due buckets,
 * avoiding O(n) full scan of all scheduled timers.
 * 
 * Performance Target: ≤ 0.3ms for tick with 0-1000 timers
 * Memory: O(slots) + O(scheduled_items)
 */

import { DSError, TimeWheelConfig, TimeWheelScheduler as ITimeWheelScheduler, DS_API_VERSION, DSEvent } from '../types';

interface ScheduledItem {
  id: string;
  callback: () => void;
  targetSlot: number;
  insertionOrder: number;
}

export class TimeWheelScheduler implements ITimeWheelScheduler {
  public readonly apiVersion = DS_API_VERSION;

  private readonly slots: Array<Map<string, ScheduledItem>>;
  private readonly config: Required<TimeWheelConfig>;
  private currentSlot = 0;
  private wheelStartTime = 0;
  private insertionCounter = 0;
  private eventEmitter?: (event: DSEvent) => void;

  constructor(config: TimeWheelConfig, eventEmitter?: (event: DSEvent) => void) {
    // Validate configuration
    if (config.slots <= 0 || !Number.isInteger(config.slots)) {
      throw new DSError('DS_INVALID_CAPACITY', 'TimeWheel slots must be positive integer');
    }
    if (config.slotDurationMs <= 0) {
      throw new DSError('DS_INVALID_CAPACITY', 'TimeWheel slotDurationMs must be positive');
    }

    this.config = {
      slots: config.slots,
      slotDurationMs: config.slotDurationMs,
      maxDriftMs: config.maxDriftMs ?? config.slotDurationMs * 0.1 // 10% default drift tolerance
    };

    // Initialize wheel slots
    this.slots = Array.from({ length: this.config.slots }, () => new Map());
    this.eventEmitter = eventEmitter;
    this.wheelStartTime = Date.now();
  }

  /**
   * Schedule a callback to execute after delayMs
   * Throws if ID already exists
   */
  public schedule(id: string, delayMs: number, cb: () => void): void {
    if (delayMs < 0) {
      throw new DSError('DS_INVALID_CAPACITY', 'Delay cannot be negative', { id, delayMs });
    }

    // Check for duplicate ID across all slots
    if (this.findItemById(id)) {
      throw new DSError('DS_SCHED_DUPLICATE_ID', `Timer ID already exists: ${id}`, { id });
    }

    // Calculate target slot - when this timer should execute
    const slotsFromNow = Math.max(1, Math.ceil(delayMs / this.config.slotDurationMs));
    const targetSlot = (this.currentSlot + slotsFromNow) % this.config.slots;

    const item: ScheduledItem = {
      id,
      callback: cb,
      targetSlot,
      insertionOrder: this.insertionCounter++
    };

    this.slots[targetSlot].set(id, item);
  }

  /**
   * Cancel a scheduled timer
   * Returns true if found and cancelled, false if not found
   */
  public cancel(id: string): boolean {
    const item = this.findItemById(id);
    if (!item) return false;

    this.slots[item.targetSlot].delete(id);
    return true;
  }

  /**
   * Advance the wheel and execute due callbacks
   * O(k) complexity where k = number of due slots
   */
  public tick(nowMs: number): void {
    const elapsedMs = nowMs - this.wheelStartTime;
    const targetSlot = Math.floor(elapsedMs / this.config.slotDurationMs) % this.config.slots;
    
    // Check for excessive drift
    const expectedTime = this.wheelStartTime + (Math.floor(elapsedMs / this.config.slotDurationMs) * this.config.slotDurationMs);
    const drift = Math.abs(nowMs - expectedTime);
    
    if (drift > this.config.maxDriftMs) {
      this.eventEmitter?.({
        type: 'ds:invariant:fail',
        timestamp: nowMs,
        payload: { code: 'DS_TIMEWHEEL_DRIFT', drift, maxDrift: this.config.maxDriftMs }
      });
    }

    // Process slots up to and including the target slot
    let slotsProcessed = 0;
    while (this.currentSlot !== targetSlot && slotsProcessed < this.config.slots) {
      // Advance to next slot
      this.currentSlot = (this.currentSlot + 1) % this.config.slots;
      slotsProcessed++;

      const slotItems = this.slots[this.currentSlot];
      if (slotItems && slotItems.size > 0) {
        // Execute callbacks in deterministic order (by insertion order)
        const sortedItems = Array.from(slotItems.values())
          .sort((a, b) => a.insertionOrder - b.insertionOrder);

        for (const item of sortedItems) {
          try {
            const startTime = performance.now();
            item.callback();
            const latencyMs = performance.now() - startTime;

            this.eventEmitter?.({
              type: 'ds:scheduler:due',
              timestamp: nowMs,
              payload: { id: item.id, latencyMs }
            });
          } catch (error) {
            // Callback errors shouldn't crash the scheduler
            this.eventEmitter?.({
              type: 'ds:invariant:fail',
              timestamp: nowMs,
              payload: { 
                code: 'DS_INVARIANT_VIOLATION', 
                error: error instanceof Error ? error.message : String(error),
                id: item.id 
              }
            });
          }
        }

        // Clear the processed slot
        slotItems.clear();
      }
    }
  }

  /**
   * Debug information for diagnostics
   */
  public debug(): { scheduled: number; wheelTime: number; slots: number } {
    const scheduled = this.slots.reduce((total, slot) => total + slot.size, 0);
    const wheelTime = Math.max(0, Date.now() - this.wheelStartTime);
    
    return {
      scheduled,
      wheelTime,
      slots: this.config.slots
    };
  }

  // Private helpers

  private findItemById(id: string): { targetSlot: number } | null {
    for (let slotIndex = 0; slotIndex < this.slots.length; slotIndex++) {
      if (this.slots[slotIndex].has(id)) {
        return { targetSlot: slotIndex };
      }
    }
    return null;
  }

  /**
   * Get current configuration (for testing)
   */
  public getConfig(): Required<TimeWheelConfig> {
    return { ...this.config };
  }

  /**
   * Force advance to specific slot (for testing)
   */
  public _testAdvanceToSlot(slot: number): void {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Test method not available in production');
    }
    this.currentSlot = slot % this.config.slots;
  }
}

/**
 * Factory function for creating TimeWheelScheduler instances
 */
export function createTimeWheelScheduler(
  config: TimeWheelConfig, 
  eventEmitter?: (event: DSEvent) => void
): ITimeWheelScheduler {
  return new TimeWheelScheduler(config, eventEmitter);
}
