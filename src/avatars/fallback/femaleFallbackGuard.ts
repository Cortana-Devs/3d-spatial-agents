/**
 * femaleFallbackGuard.ts
 * Feature: F01-FEMALE-AVATAR
 *
 * Purpose:
 *  Provide a resilient wrapper for loading the female avatar runtime that:
 *    - Enforces a timeout (guarding against network / decoding stall)
 *    - Classifies errors as recoverable / non-recoverable
 *    - Emits standardized events & log records
 *    - Returns a structured result indicating success or fallback necessity
 *
 * Exports:
 *  - interface FallbackResult { succeeded: boolean; error?: Error }
 *  - async function guardedLoadFemale(...)
 *  - function isRecoverableLoadError(err: unknown): boolean
 *  - function onFemaleLoadFailure(err: Error): void
 *
 * Behavior:
 *  - On success → returns { runtime, result: { succeeded: true } }
 *  - On timeout or recoverable failure → returns { runtime: null, result: { succeeded: false, error } }
 *  - On non-recoverable failure → still returns same shape; caller may escalate.
 *
 * Non-goals:
 *  - Construction / management of male fallback runtime (handled upstream)
 *  - UI toast presentation (only provide hook points / structured events)
 *
 * Events Emitted (CustomEvent on window if available):
 *  - avatar:load:failure  (payload: { avatar: 'female-c-girl', error: string, ts: number, timeout: boolean })
 *
 * Logging Tags Used:
 *  - [AVATAR][LOAD]
 *
 * Strict TS: No `any` usage.
 */

import { createFemaleAvatarRuntime, FemaleAvatarRuntime } from '../female/femaleRuntimeAdapter';
import { SkeletonMismatchError } from '../female/assetNormalization';
import { AvatarLogTag, logAvatar } from '../logging/avatarLogger';

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

export interface FallbackResult {
  succeeded: boolean;
  error?: Error;
  timeout?: boolean;
}

export interface GuardedLoadOptions {
  /**
   * Milliseconds before we treat the load as timed out (default 5000).
   * Must be > 0. If set very low, expect higher false positives.
   */
  timeoutMs?: number;
  /**
   * Optional custom avatar id (future extension). Currently unused but reserved.
   */
  avatarIdOverride?: string;
}

/**
 * Shape returned by guarded load.
 */
export interface GuardedLoadReturn {
  runtime: FemaleAvatarRuntime | null;
  result: FallbackResult;
}

/* -------------------------------------------------------------------------- */
/*                              Helper: Emit Event                            */
/* -------------------------------------------------------------------------- */

function emitFailureEvent(detail: {
  avatar: string;
  error: string;
  ts: number;
  timeout: boolean;
  recoverable: boolean;
}): void {
  if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
    window.dispatchEvent(new CustomEvent('avatar:load:failure', { detail }));
  }
}

/* -------------------------------------------------------------------------- */
/*                       Error Classification Heuristics                      */
/* -------------------------------------------------------------------------- */

/**
 * Decide whether an error scenario qualifies as recoverable
 * (meaning the system can fallback to male avatar seamlessly).
 */
export function isRecoverableLoadError(err: unknown): boolean {
  if (!err) return true;
  if (err instanceof DOMException && err.name === 'AbortError') return true;
  if (err instanceof SkeletonMismatchError) {
    // Skeleton mismatch is typically content error; treat as recoverable fallback
    return true;
  }
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    // Network-ish cues
    if (msg.includes('network') || msg.includes('failed to fetch') || msg.includes('timeout')) {
      return true;
    }
    // GLTF structural issues (missing scene) can be recovered by fallback.
    if (msg.includes('gltf') || msg.includes('no scene root')) {
      return true;
    }
  }
  return true; // Default optimistic stance—nearly all load failures can fallback.
}

/* -------------------------------------------------------------------------- */
/*                               Failure Handler                              */
/* -------------------------------------------------------------------------- */

/**
 * Centralized failure-side effects: logging + event emission.
 * Consumers may extend by subscribing to 'avatar:load:failure'.
 */
export function onFemaleLoadFailure(err: Error, meta?: { timeout?: boolean }): void {
  const recoverable = isRecoverableLoadError(err);
  const timeout = meta?.timeout === true;
  logAvatar(AvatarLogTag.AVATAR_LOAD, 'Female avatar load failure', {
    error: err.message,
    recoverable,
    timeout,
  });
  emitFailureEvent({
    avatar: 'female-c-girl',
    error: err.message,
    ts: performance.now(),
    timeout,
    recoverable,
  });
}

/* -------------------------------------------------------------------------- */
/*                          Guarded Load Main Function                        */
/* -------------------------------------------------------------------------- */

/**
 * guardedLoadFemale
 *
 * Wraps creation & loading of a FemaleAvatarRuntime in a timeout & error guard.
 * If a timeout elapses first, the underlying load result is ignored and the
 * runtime (when eventually available) is disposed to prevent leaks.
 *
 * @param runtimeFactory Factory producing a fresh female runtime (dependency injection)
 * @param opts Guard options (timeout)
 */
export async function guardedLoadFemale(
  runtimeFactory: () => FemaleAvatarRuntime = () => createFemaleAvatarRuntime(),
  opts?: GuardedLoadOptions
): Promise<GuardedLoadReturn> {
  const timeoutMs = opts?.timeoutMs && opts.timeoutMs > 0 ? opts.timeoutMs : 5000;

  // Produce runtime early so that we can dispose if a timeout occurs.
  const runtime = runtimeFactory();
  const start = performance.now();
  let finished = false;

  // Promise: runtime.load()
  const loadPromise = runtime
    .load()
    .then(() => {
      if (finished) {
        // Completed after timeout - must dispose to prevent orphaned resources.
        runtime.dispose();
        return;
      }
      finished = true;
    })
    .catch(err => {
      if (finished) {
        // Late error after timeout already processed - dispose.
        runtime.dispose();
        return;
      }
      finished = true;
      throw err;
    });

  // Promise: timeout sentinel
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    const id = setTimeout(() => {
      if (finished) return;
      finished = true;
      const timeoutError = new Error(
        `Female avatar load timed out after ${timeoutMs}ms`
      );
      (timeoutError as { code?: string }).code = 'AVATAR_LOAD_TIMEOUT';
      reject(timeoutError);
    }, timeoutMs);
    // Defensive clear if loadPromise settles first
    loadPromise.finally(() => clearTimeout(id)).catch(() => {
      /* swallow here, handled above */
    });
  });

  // Race them
  try {
    await Promise.race([loadPromise, timeoutPromise]);
    // Success path
    const durationMs = performance.now() - start;
    logAvatar(AvatarLogTag.AVATAR_LOAD, 'Female avatar load success (guarded)', {
      durationMs: +durationMs.toFixed(2),
      timeoutMs,
    });
    return {
      runtime,
      result: { succeeded: true },
    };
  } catch (err) {
    const errorObj = err instanceof Error ? err : new Error(String(err));
    const timeout = (errorObj as { code?: string }).code === 'AVATAR_LOAD_TIMEOUT';
    onFemaleLoadFailure(errorObj, { timeout });
    return {
      runtime: null,
      result: {
        succeeded: false,
        error: errorObj,
        timeout,
      },
    };
  }
}

/* -------------------------------------------------------------------------- */
/*                           Development Self-Test Hook                        */
/* -------------------------------------------------------------------------- */
/**
 * Manual dev utility (call in browser console):
 *   (window as any).testFemaleFallback?.()
 */
export async function __devTestFemaleFallback(): Promise<string> {
  const { runtime, result } = await guardedLoadFemale(() => createFemaleAvatarRuntime(), {
    timeoutMs: 2500,
  });
  if (result.succeeded && runtime) {
    runtime.dispose();
    return 'FallbackGuardTest: SUCCESS path OK';
  }
  return `FallbackGuardTest: FAILURE path (timeout=${!!result.timeout}) error=${result.error?.message}`;
}

declare const window: (Window & { testFemaleFallback?: () => Promise<string> }) | undefined;
if (typeof window !== 'undefined') {
  (window as unknown as { testFemaleFallback?: () => Promise<string> }).testFemaleFallback =
    __devTestFemaleFallback;
}
