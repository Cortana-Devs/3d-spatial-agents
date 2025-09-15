/**
 * mockRuntime.ts
 * Feature: F01-FEMALE-AVATAR
 *
 * Test helper providing a lightweight in-memory mock implementation of
 * AvatarRuntimeHandle for unit and integration tests without invoking
 * Three.js / GLTF loading.
 *
 * Capabilities:
 *  - Captures play() / stop() / dispose() calls
 *  - Simulates async load() & play() delays (configurable)
 *  - Provides inspection snapshot & reset utilities
 *  - Optional failure modes for negative tests
 *
 * Non-goals:
 *  - Real animation blending
 *  - Memory footprint estimation beyond static stub
 *  - Event emission replication (tests can manually emit if needed)
 */

import type {
  AvatarRuntimeHandle,
  AvatarDebugInfo,
  AvatarId,
} from "../../../src/avatars/female/femaleRuntimeAdapter";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

export interface MockRuntimeInspection {
  playCalls: string[];
  stopCalls: string[];
  disposed: boolean;
  loaded: boolean;
  activeAnimation: string | null;
  loadCalls: number;
  lastPlayOptions?: { fadeMs?: number; loopOverride?: boolean };
}

export interface MockRuntimeOptions {
  /**
   * Simulated load latency in ms (default 5).
   */
  loadLatencyMs?: number;
  /**
   * Simulated play latency in ms (default 1).
   */
  playLatencyMs?: number;
  /**
   * Force load() to reject once with error message (consumed after first attempt).
   */
  failFirstLoadMessage?: string;
  /**
   * Avatar id to report (default 'female-c-girl').
   */
  avatarId?: AvatarId;
}

/* -------------------------------------------------------------------------- */
/*                               Internal State                               */
/* -------------------------------------------------------------------------- */

const DEFAULTS: Required<
  Omit<MockRuntimeOptions, "failFirstLoadMessage" | "avatarId">
> = {
  loadLatencyMs: 5,
  playLatencyMs: 1,
};

interface InternalState extends MockRuntimeInspection {
  options: MockRuntimeOptions;
  failNextLoad?: string;
  generation: number;
}

function createInitialState(opts: MockRuntimeOptions): InternalState {
  return {
    playCalls: [],
    stopCalls: [],
    disposed: false,
    loaded: false,
    activeAnimation: null,
    loadCalls: 0,
    lastPlayOptions: undefined,
    options: opts,
    failNextLoad: opts.failFirstLoadMessage,
    generation: 0,
  };
}

/* We keep one global state per created mock so tests can inspect each instance
   independently if needed. For simplicity, primary functions operate on a single
   default singleton. */
let singletonState: InternalState | null = null;

function ensureState(opts: MockRuntimeOptions): InternalState {
  if (!singletonState) singletonState = createInitialState(opts);
  return singletonState;
}

/* -------------------------------------------------------------------------- */
/*                               Public Helpers                               */
/* -------------------------------------------------------------------------- */

/**
 * Returns a shallow snapshot of current inspection data.
 */
export function getMockRuntimeInspection(): MockRuntimeInspection {
  if (!singletonState) {
    return {
      playCalls: [],
      stopCalls: [],
      disposed: false,
      loaded: false,
      activeAnimation: null,
      loadCalls: 0,
      lastPlayOptions: undefined,
    };
  }
  const {
    playCalls,
    stopCalls,
    disposed,
    loaded,
    activeAnimation,
    loadCalls,
    lastPlayOptions,
  } = singletonState;
  return {
    playCalls: [...playCalls],
    stopCalls: [...stopCalls],
    disposed,
    loaded,
    activeAnimation,
    loadCalls,
    lastPlayOptions: lastPlayOptions ? { ...lastPlayOptions } : undefined,
  };
}

/**
 * Reset internal singleton for test isolation.
 */
export function resetMockRuntimeInspection(): void {
  if (singletonState) {
    const opts = singletonState.options;
    singletonState = createInitialState(opts);
  }
}

/**
 * Create a new mock avatar runtime.
 * NOTE: This implementation shares an internal state singleton. If you need
 * multiple isolated mocks simultaneously, extend this file with a factory
 * returning independent state objects.
 */
export function createMockAvatarRuntime(
  options: MockRuntimeOptions = {},
): AvatarRuntimeHandle {
  const opts: MockRuntimeOptions = {
    loadLatencyMs: options.loadLatencyMs ?? DEFAULTS.loadLatencyMs,
    playLatencyMs: options.playLatencyMs ?? DEFAULTS.playLatencyMs,
    failFirstLoadMessage: options.failFirstLoadMessage,
    avatarId: options.avatarId ?? "female-c-girl",
  };
  const state = ensureState(opts);

  const runtime: AvatarRuntimeHandle = {
    id: opts.avatarId ?? "female-c-girl",

    async load(): Promise<void> {
      if (state.disposed) {
        throw new Error("MockRuntime: load() called after dispose");
      }
      state.loadCalls++;
      if (state.failNextLoad) {
        const msg = state.failNextLoad;
        state.failNextLoad = undefined;
        return delayReject(msg, opts.loadLatencyMs!);
      }
      if (state.loaded) return;
      await delay(opts.loadLatencyMs!);
      state.loaded = true;
    },

    async play(
      animId: string,
      playOpts?: { fadeMs?: number; loopOverride?: boolean },
    ): Promise<void> {
      if (state.disposed) {
        throw new Error("MockRuntime: play() after dispose");
      }
      if (!state.loaded) {
        // Auto-load convenience for tests
        await runtime.load();
      }
      state.lastPlayOptions = playOpts ? { ...playOpts } : undefined;
      state.playCalls.push(animId);
      // Simulate asynchronous scheduling & potential overlap
      await delay(opts.playLatencyMs!);
      if (state.disposed) return;
      state.activeAnimation = animId;
    },

    stop(animId?: string): void {
      if (state.disposed) return;
      state.stopCalls.push(animId ?? "<ALL>");
      if (!animId || state.activeAnimation === animId) {
        state.activeAnimation = null;
      }
    },

    dispose(): void {
      if (state.disposed) return;
      state.disposed = true;
      state.activeAnimation = null;
      state.generation++;
    },

    setMood(mood: string): void {
      // Optional stub (no-op); accessible for tests verifying hook presence
      if (process.env?.AVATAR_DEBUG === "1") {
        // eslint-disable-next-line no-console
        console.debug("[MOCK][AVATAR][MOOD]", mood);
      }
    },

    debug(): AvatarDebugInfo {
      return {
        activeAnimation: state.activeAnimation,
        loadedAnimations: [...new Set(state.playCalls)],
        memoryEstimateKB: 512, // static stub
      };
    },
  };

  return runtime;
}

/**
 * Utility to create a runtime whose load() always fails with given message.
 * Useful for fallback guard tests.
 */
export function createFailingMockRuntime(
  message = "Simulated load failure",
): AvatarRuntimeHandle {
  return createMockAvatarRuntime({ failFirstLoadMessage: message });
}

/* -------------------------------------------------------------------------- */
/*                               Internal Helpers                              */
/* -------------------------------------------------------------------------- */

function delay(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

function delayReject(message: string, ms: number): Promise<never> {
  return new Promise((_, rej) => setTimeout(() => rej(new Error(message)), ms));
}

/* -------------------------------------------------------------------------- */
/*                            Development Self-Test                            */
/* -------------------------------------------------------------------------- */
export async function __devMockRuntimeSelfTest(): Promise<string> {
  resetMockRuntimeInspection();
  const rt = createMockAvatarRuntime({ loadLatencyMs: 2, playLatencyMs: 1 });
  await rt.load();
  await rt.play("idle_1");
  rt.stop();
  rt.dispose();
  const snap = getMockRuntimeInspection();
  return `MockRuntimeTest(play=${snap.playCalls.length}, stop=${snap.stopCalls.length}, disposed=${snap.disposed})`;
}

// Optional global exposure when running in browser dev mode
declare const window:
  | (Window & { testMockRuntime?: () => Promise<string> })
  | undefined;
if (typeof window !== "undefined" && !window.testMockRuntime) {
  window.testMockRuntime = __devMockRuntimeSelfTest;
}
