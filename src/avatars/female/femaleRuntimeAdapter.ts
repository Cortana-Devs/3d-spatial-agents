/**
 * femaleRuntimeAdapter.ts
 * Feature: F01-FEMALE-AVATAR
 *
 * Implements a runtime adapter for the female avatar conforming to the
 * AvatarRuntimeHandle contract described in the master prompt.
 *
 * Responsibilities:
 *  - Lazy model load (normalized)
 *  - Lazy animation clip acquisition & caching (delegated to registry)
 *  - Cross-fade playback control
 *  - Dispose & memory cleanup
 *  - Debug reporting & minimal metrics logging
 *  - Concurrency safety via generation token (prevents race conflicts)
 *
 * Non-goals:
 *  - High-level state machine orchestration (separate module)
 *  - AI / mood logic (stub only)
 *  - Network or remote streaming of assets
 *
 * Constraints:
 *  - Strong TypeScript typing (no `any`)
 *  - No global mutable leak (internal static caches only for clips handled elsewhere)
 *  - Aborts / concurrency guard to handle rapid toggles
 */
import * as THREE from 'three';
import {
  loadAndNormalizeFemaleAvatar,
  NormalizedAvatarAsset,
  disposeNormalizedAsset,
  summarizeFemaleAsset,
} from './assetNormalization';
import {
  loadFemaleAnimation,
  AnimationNotFoundError,
  debugFemaleAnimationCache,
  getFemaleAnimationDef,
} from './animationRegistry';

/* -------------------------------------------------------------------------- */
/*                             Avatar Runtime Types                            */
/* -------------------------------------------------------------------------- */

export type AvatarId = 'male-default' | 'female-c-girl';

export interface AvatarDebugInfo {
  activeAnimation: string | null;
  loadedAnimations: string[];
  memoryEstimateKB?: number;
}

export interface AvatarRuntimeHandle {
  id: AvatarId;
  load(): Promise<void>;
  play(
    animId: string,
    opts?: {
      fadeMs?: number;
      loopOverride?: boolean;
    }
  ): Promise<void>;
  stop(animId?: string): void;
  dispose(): void;
  setMood?(mood: string): void;
  debug(): AvatarDebugInfo;
}

export interface FemaleAvatarRuntimeOptions {
  blendMs?: number;
  enableMetrics?: boolean;
}

/* -------------------------------------------------------------------------- */
/*                               Config & Helpers                              */
/* -------------------------------------------------------------------------- */

const ENV_BLEND = (() => {
  if (typeof process !== 'undefined' && process.env && process.env.AVATAR_ANIM_BLEND_MS) {
    const parsed = parseInt(process.env.AVATAR_ANIM_BLEND_MS, 10);
    if (!Number.isNaN(parsed) && parsed >= 0) return parsed;
  }
  if (typeof window !== 'undefined') {
    const win = window as unknown as { AVATAR_ANIM_BLEND_MS?: string | number };
    const val = win.AVATAR_ANIM_BLEND_MS;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const parsed = parseInt(val, 10);
      if (!Number.isNaN(parsed) && parsed >= 0) return parsed;
    }
  }
  return 250;
})();

const DEFAULT_BLEND_MS = ENV_BLEND;
const DEFAULT_ID: AvatarId = 'female-c-girl';

interface ActiveActionEntry {
  id: string;
  action: THREE.AnimationAction;
  clip: THREE.AnimationClip;
}

/* Lightweight event emission using DOM CustomEvent; decoupled from any central bus.
   This avoids coupling to yet-unimplemented event bus while still satisfying
   acceptance criteria for events:
   - avatar:animation:started
   - avatar:animation:completed
   - avatar:animation:error
   - avatar:load:start
   - avatar:load:success
   - avatar:load:failure
*/
function emitAvatarEvent<T extends Record<string, unknown>>(name: string, detail: T): void {
  if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }
}

/* Logging wrapper honoring AVATAR_DEBUG */
const AVATAR_DEBUG_ENABLED = (() => {
  if (typeof process !== 'undefined' && process.env && process.env.AVATAR_DEBUG === '1') return true;
  if (typeof window !== 'undefined') {
    const w = window as unknown as { AVATAR_DEBUG?: number | string };
    return w.AVATAR_DEBUG === 1 || w.AVATAR_DEBUG === '1';
  }
  return false;
})();

function log(tag: string, message: string, data?: Record<string, unknown>): void {
  // eslint-disable-next-line no-console
  console.log(tag, message, data ?? '');
}

function debugLog(tag: string, message: string, data?: Record<string, unknown>): void {
  if (!AVATAR_DEBUG_ENABLED) return;
  // eslint-disable-next-line no-console
  console.debug(tag, message, data ?? '');
}

/* -------------------------------------------------------------------------- */
/*                         FemaleAvatarRuntime Class                           */
/* -------------------------------------------------------------------------- */

export class FemaleAvatarRuntime implements AvatarRuntimeHandle {
  public readonly id: AvatarId = DEFAULT_ID;

  private options: Required<FemaleAvatarRuntimeOptions>;

  private asset: NormalizedAvatarAsset | null = null;
  private sceneRoot: THREE.Group | null = null;
  private mixer: THREE.AnimationMixer | null = null;

  private active: ActiveActionEntry | null = null;
  private disposed = false;
  private loaded = false;
  private loadPromise: Promise<void> | null = null;

  private generation = 0; // increments upon dispose / re-init to invalidate obsolete plays

  // Keep reference to previous action for cross-fade
  private lastAction: THREE.AnimationAction | null = null;

  constructor(opts?: FemaleAvatarRuntimeOptions) {
    this.options = {
      blendMs: opts?.blendMs ?? DEFAULT_BLEND_MS,
      enableMetrics: opts?.enableMetrics ?? true,
    };
  }

  /**
   * Load / initialize model if not already loaded.
   * Deduplicates concurrent calls.
   */
  public async load(): Promise<void> {
    if (this.disposed) {
      throw new Error('FemaleAvatarRuntime: cannot load after dispose');
    }
    if (this.loaded) return;
    if (this.loadPromise) return this.loadPromise;

    emitAvatarEvent('avatar:load:start', { avatar: this.id, ts: performance.now() });
    const genAtStart = this.generation;
    const startTime = performance.now();

    this.loadPromise = (async () => {
      try {
        const normalized = await loadAndNormalizeFemaleAvatar();
        if (this.disposed || genAtStart !== this.generation) {
          // If disposed mid-load or generation changed, discard asset.
          disposeNormalizedAsset(normalized);
          return;
        }
        this.asset = normalized;
        this.sceneRoot = normalized.scene;
        this.mixer = new THREE.AnimationMixer(this.sceneRoot);
        this.loaded = true;
        const durationMs = performance.now() - startTime;
        emitAvatarEvent('avatar:load:success', {
          avatar: this.id,
            durationMs,
            ts: performance.now()
        });
        log('[AVATAR][LOAD]', 'Female avatar loaded', {
          durationMs: +durationMs.toFixed(2),
          summary: summarizeFemaleAsset(),
        });
      } catch (err) {
        emitAvatarEvent('avatar:load:failure', {
          avatar: this.id,
          error: err instanceof Error ? err.message : String(err),
          ts: performance.now()
        });
        log('[AVATAR][LOAD]', 'Female avatar load failure', {
          error: err instanceof Error ? err.message : String(err),
        });
        throw err;
      } finally {
        this.loadPromise = null;
      }
    })();

    return this.loadPromise;
  }

  /**
   * Play an animation by ID with optional fade override.
   * Ensures model + animation loaded, performs cross-fade, sets loop policy.
   */
  public async play(
    animId: string,
    opts?: { fadeMs?: number; loopOverride?: boolean }
  ): Promise<void> {
    if (this.disposed) throw new Error('FemaleAvatarRuntime: play() after dispose');
    // Ensure model is loaded
    await this.load();
    if (!this.mixer || !this.sceneRoot) {
      throw new Error('FemaleAvatarRuntime: mixer not initialized');
    }

    const currentGeneration = this.generation;
    const fadeMs = opts?.fadeMs ?? this.options.blendMs;

    // Acquire clip
    let clip: THREE.AnimationClip;
    try {
      clip = await loadFemaleAnimation(animId);
    } catch (err) {
      emitAvatarEvent('avatar:animation:error', {
        avatar: this.id,
        animation: animId,
        error: err instanceof Error ? err.message : String(err),
        ts: performance.now()
      });
      if (err instanceof AnimationNotFoundError) {
        throw err;
      }
      throw new Error(`FemaleAvatarRuntime: failed to load animation ${animId}: ${
        err instanceof Error ? err.message : String(err)
      }`);
    }

    // Ensure not disposed since async step
    if (this.disposed || currentGeneration !== this.generation) return;

    // Mixer step to finalize previous animation fade-out
    this.mixer.stopAllAction(); // We manage only one active channel
    const action = this.mixer.clipAction(clip);
    // Determine loop style
    const def = getFemaleAnimationDef(animId);
    const loop = opts?.loopOverride ?? (def ? def.loop : true);
    action.loop = loop ? THREE.LoopRepeat : THREE.LoopOnce;
    action.clampWhenFinished = !loop;
    action.enabled = true;

    const now = performance.now();
    emitAvatarEvent('avatar:animation:started', {
      avatar: this.id,
      animation: animId,
      ts: now
    });

    // Cross-fade
    if (this.lastAction && fadeMs > 0) {
      this.lastAction.crossFadeTo(action, fadeMs / 1000, false);
    } else {
      action.reset();
    }
    action.play();

    // Track active
    this.active = {
      id: animId,
      action,
      clip,
    };
    this.lastAction = action;

    log('[ANIM][PLAY]', 'Female animation play', {
      animId,
      fadeMs,
      loop,
      clipDuration: +clip.duration.toFixed(2),
    });

    if (!loop) {
      // Setup onComplete callback using mixer events
      const onLoopFinished = (e: THREE.Event & { action?: THREE.AnimationAction }) => {
        if (e.action === action) {
          emitAvatarEvent('avatar:animation:completed', {
            avatar: this.id,
            animation: animId,
            ts: performance.now()
          });
          this.mixer?.removeEventListener('finished', onLoopFinished);
          // Keep lastAction reference (for potential cross-fade) but mark active null
          if (this.active && this.active.id === animId) {
            this.active = null;
          }
        }
      };
      this.mixer.addEventListener('finished', onLoopFinished);
    }
  }

  /**
   * Stop either currently active animation or a specific one by ID.
   * If the specified animation is not active, it is a no-op.
   */
  public stop(animId?: string): void {
    if (!this.mixer) return;
    if (animId) {
      if (this.active && this.active.id === animId) {
        this.active.action.stop();
        this.active = null;
      }
      return;
    }
    // Stop current
    if (this.active) {
      this.active.action.stop();
      this.active = null;
    }
  }

  /**
   * Update function (optional external call each frame).
   * Not part of interface but typically needed; leaving protected for potential extension.
   */
  protected update(deltaSeconds: number): void {
    if (this.mixer && !this.disposed) {
      this.mixer.update(deltaSeconds);
    }
  }

  /**
   * Dispose of runtime resources.
   * After calling this, the runtime must not be reused.
   */
  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.generation++;

    if (this.mixer) {
      try {
        // Attempt to stop actions
        this.mixer.stopAllAction();
      } catch {
        /* ignore */
      }
      // @ts-expect-error release
      this.mixer._actions = [];
      this.mixer = null;
    }

    if (this.asset) {
      // Deep dispose geometry & materials
      disposeNormalizedAsset(this.asset);
      this.asset = null;
    }

    this.sceneRoot = null;
    this.active = null;
    this.lastAction = null;
    this.loadPromise = null;

    log('[AVATAR][LOAD]', 'Female avatar runtime disposed', { generation: this.generation });
  }

  /**
   * Optional hook for future AI/mood system. Currently no-op with debug log.
   */
  public setMood(mood: string): void {
    debugLog('[AVATAR][MOOD]', 'Set mood invoked (stub)', { mood });
  }

  /**
   * Debug info with currently active animation & loaded clip ids.
   */
  public debug(): AvatarDebugInfo {
    const animCache = debugFemaleAnimationCache();
    return {
      activeAnimation: this.active?.id ?? null,
      loadedAnimations: animCache.loadedIds,
      memoryEstimateKB: this.asset ? Math.round(this.asset.estimatedVRAMMB * 1024) : undefined,
    };
  }

  /**
   * Access underlying scene root (read-only). Returns null if not yet loaded.
   */
  public getScene(): THREE.Group | null {
    return this.sceneRoot;
  }

  /**
   * Indicates loaded & not disposed state.
   */
  public isReady(): boolean {
    return this.loaded && !this.disposed;
  }

  /**
   * Advance time (public). Consumers that manage render loops can call this.
   */
  public tick(deltaSeconds: number): void {
    this.update(deltaSeconds);
  }
}

/* -------------------------------------------------------------------------- */
/*                                 Factory API                                 */
/* -------------------------------------------------------------------------- */

/**
 * Factory to create a new female avatar runtime.
 */
export function createFemaleAvatarRuntime(opts?: FemaleAvatarRuntimeOptions): FemaleAvatarRuntime {
  return new FemaleAvatarRuntime(opts);
}

/* -------------------------------------------------------------------------- */
/*                              Self Diagnostics                               */
/* -------------------------------------------------------------------------- */

/**
 * Lightweight test / validation routine (development only).
 * Not executed automatically—intended for manual invocation in a debug console:
 *   (window as any).testFemaleRuntime?.()
 */
export function __devValidateFemaleRuntime(): Promise<string> {
  const runtime = createFemaleAvatarRuntime({ blendMs: 150 });
  return runtime
    .load()
    .then(async () => {
      await runtime.play('idle_1');
      runtime.tick(0.016);
      const info = runtime.debug();
      runtime.dispose();
      return `FemaleRuntime validated: active=${info.activeAnimation}`;
    })
    .catch(err => {
      runtime.dispose();
      throw err;
    });
}

// Expose optional dev hook
declare const window: (Window & { testFemaleRuntime?: () => Promise<string> }) | undefined;
if (typeof window !== 'undefined' && AVATAR_DEBUG_ENABLED) {
  window.testFemaleRuntime = __devValidateFemaleRuntime;
}
