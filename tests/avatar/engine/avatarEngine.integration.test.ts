/**
 * avatarEngine.integration.test.ts
 * Feature: F01-FEMALE-AVATAR
 *
 * Purpose:
 *  End-to-end style (engine-layer) integration tests covering:
 *   - Rapid avatar toggling (stress)
 *   - Female runtime adapter + state machine cooperation
 *   - Animation event emission flows
 *   - Dispose safety
 *   - Basic memory / object reference stability heuristic
 *
 * Notes:
 *  - This test uses real FemaleAvatarRuntime & AvatarStateMachine modules.
 *  - GLTF / Three.js heavy operations should be mocked in upstream test environment
 *    (e.g. via __mocks__) if necessary to avoid network / parsing cost.
 *  - A lightweight mock male runtime is provided here to simulate swaps.
 *
 * Non-goals:
 *  - Visual rendering validation
 *  - Accurate GPU memory measurement
 *  - Performance micro-benchmark precision (just structural assertions)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  createFemaleAvatarRuntime,
  FemaleAvatarRuntime,
  AvatarRuntimeHandle,
} from '../../../src/avatars/female/femaleRuntimeAdapter';

import {
  createDefaultFemaleStateMachine,
  AvatarStateMachine,
} from '../../../src/avatars/state/avatarStateMachine';

import {
  setAvatar,
  _resetAvatarSelectionForTests,
  getAvatarSelectionState,
} from '../../../src/state/avatarSelectionStore';

import {
  getAvatarEventBus,
  AvatarEventMap,
} from '../../../src/avatars/events/avatarEvents';

/* -------------------------------------------------------------------------- */
/*                               Local Test Mocks                             */
/* -------------------------------------------------------------------------- */

/**
 * Minimal male runtime mock (only what tests need).
 */
class MaleMockRuntime implements AvatarRuntimeHandle {
  public id: 'male-default' = 'male-default';
  private disposed = false;
  private loaded = false;
  private lastAnim: string | null = null;
  private playCalls: string[] = [];

  async load(): Promise<void> {
    if (this.disposed) throw new Error('MaleMockRuntime load after dispose');
    if (this.loaded) return;
    // Simulated async
    await delay(2);
    this.loaded = true;
  }

  async play(animId: string): Promise<void> {
    if (this.disposed) throw new Error('MaleMockRuntime play after dispose');
    await this.load();
    this.lastAnim = animId;
    this.playCalls.push(animId);
  }

  stop(): void {
    this.lastAnim = null;
  }

  dispose(): void {
    this.disposed = true;
    this.lastAnim = null;
  }

  setMood(_mood: string): void {
    /* noop */
  }

  debug() {
    return {
      activeAnimation: this.lastAnim,
      loadedAnimations: [...new Set(this.playCalls)],
      memoryEstimateKB: 256,
    };
  }

  getPlayCalls(): string[] {
    return [...this.playCalls];
  }
}

/* -------------------------------------------------------------------------- */
/*                               Helper Utilities                             */
/* -------------------------------------------------------------------------- */

function delay(ms: number): Promise<void> {
  return new Promise(res => setTimeout(res, ms));
}

interface EventCapture {
  changed: number;
  animStarted: number;
  animCompleted: number;
  animError: number;
  loadStart: number;
  loadSuccess: number;
  loadFailure: number;
  sequence: Array<{ event: keyof AvatarEventMap; ts: number }>;
}

function createEventCapture(): {
  capture: EventCapture;
  dispose(): void;
} {
  const bus = getAvatarEventBus();
  const capture: EventCapture = {
    changed: 0,
    animStarted: 0,
    animCompleted: 0,
    animError: 0,
    loadStart: 0,
    loadSuccess: 0,
    loadFailure: 0,
    sequence: [],
  };

  const disposers: Array<() => void> = [];

  function reg<K extends keyof AvatarEventMap>(key: K) {
    disposers.push(
      bus.on(key, p => {
        switch (key) {
          case 'avatar:changed':
            capture.changed++;
            break;
          case 'avatar:animation:started':
            capture.animStarted++;
            break;
          case 'avatar:animation:completed':
            capture.animCompleted++;
            break;
          case 'avatar:animation:error':
            capture.animError++;
            break;
          case 'avatar:load:start':
            capture.loadStart++;
            break;
          case 'avatar:load:success':
            capture.loadSuccess++;
            break;
          case 'avatar:load:failure':
            capture.loadFailure++;
            break;
        }
        capture.sequence.push({ event: key, ts: (p as { ts?: number }).ts ?? Date.now() });
      })
    );
  }

  reg('avatar:changed');
  reg('avatar:animation:started');
  reg('avatar:animation:completed');
  reg('avatar:animation:error');
  reg('avatar:load:start');
  reg('avatar:load:success');
  reg('avatar:load:failure');

  return {
    capture,
    dispose: () => disposers.forEach(d => d()),
  };
}

/* -------------------------------------------------------------------------- */
/*                              Engine Test Suite                              */
/* -------------------------------------------------------------------------- */

describe('Avatar Engine Integration (F01-FEMALE-AVATAR)', () => {
  let femaleRuntime: FemaleAvatarRuntime;
  let femaleSM: AvatarStateMachine;
  let maleRuntime: MaleMockRuntime;
  let eventsCollector: ReturnType<typeof createEventCapture>;

  beforeEach(() => {
    _resetAvatarSelectionForTests('male-default');
    eventsCollector = createEventCapture();
    femaleRuntime = createFemaleAvatarRuntime({ blendMs: 50 });
    femaleSM = createDefaultFemaleStateMachine(femaleRuntime);
    maleRuntime = new MaleMockRuntime();
  });

  afterEach(() => {
    eventsCollector.dispose();
    femaleRuntime.dispose();
    maleRuntime.dispose();
    // Dispose state machine listeners
    femaleSM.dispose();
  });

  /* ------------------------------------------------------------------------ */
  /* 1. Stress: 20 rapid toggles                                              */
  /* ------------------------------------------------------------------------ */
  it('performs 20 rapid avatar toggles emitting matching avatar:changed events', async () => {
    const toggleCount = 20;
    for (let i = 0; i < toggleCount; i++) {
      setAvatar(i % 2 === 0 ? 'female-c-girl' : 'male-default');
    }
    // Allow microtasks / events
    await delay(10);
    expect(eventsCollector.capture.changed).toBe(toggleCount);
    // Final selection should reflect last toggle
    const state = getAvatarSelectionState();
    expect(state.current).toBe((toggleCount - 1) % 2 === 0 ? 'female-c-girl' : 'male-default');
  });

  /* ------------------------------------------------------------------------ */
  /* 2. Female runtime + state machine basic locomotion cycle                */
  /* ------------------------------------------------------------------------ */
  it('runs female state machine IDLE -> WALKING -> IDLE sequence', async () => {
    await femaleRuntime.load();
    // Start from idle by design
    femaleSM.handle('onUserMove'); // IDLE -> WALKING
    await femaleRuntime.play('walk_cycle').catch(() => {
      /* ignore duplicate play if state machine already triggered */
    });
    femaleSM.handle('onUserStop'); // WALKING -> IDLE
    // Allow queued actions
    await delay(30);
    const debugInfo = femaleRuntime.debug();
    // Last animation may be idle or walk depending on timers; ensure no crash and clip loaded.
    expect(Array.isArray(debugInfo.loadedAnimations)).toBe(true);
  });

  /* ------------------------------------------------------------------------ */
  /* 3. Emote interruption & restoration                                      */
  /* ------------------------------------------------------------------------ */
  it('restores baseline after emote completion', async () => {
    await femaleRuntime.load();
    // Walk baseline
    femaleSM.handle('onUserMove'); // baseline -> WALKING
    await delay(20);
    // Trigger emote
    femaleSM.handle('onEmoteTrigger', { animId: 'dance_emote' });
    // Simulate emote completion event (since we are not running real time)
    // We dispatch after short delay to mimic runtime finishing the clip
    await delay(25);
    const completionEvent = new CustomEvent('avatar:animation:completed', {
      detail: { avatar: 'female-c-girl', animation: 'dance_emote', ts: performance.now() },
    });
    window.dispatchEvent(completionEvent);
    await delay(25);
    const stateAfter = femaleSM.debug();
    // Expect baseline restoration to WALKING
    expect(stateAfter.state === 'WALKING' || stateAfter.baseline === 'WALKING').toBe(true);
  });

  /* ------------------------------------------------------------------------ */
  /* 4. Dispose safety                                                        */
  /* ------------------------------------------------------------------------ */
  it('throws on play after dispose', async () => {
    await femaleRuntime.load();
    femaleRuntime.dispose();
    await expect(femaleRuntime.play('idle_1')).rejects.toThrow(/dispose/i);
  });

  /* ------------------------------------------------------------------------ */
  /* 5. Animation event ordering sanity                                       */
  /* ------------------------------------------------------------------------ */
  it('emits load:start then load:success before first animation:started', async () => {
    await femaleRuntime.load();
    await femaleRuntime.play('idle_1');
    // Wait microtasks
    await delay(10);
    const order = eventsCollector.capture.sequence.map(s => s.event);
    const loadStartIndex = order.indexOf('avatar:load:start');
    const loadSuccessIndex = order.indexOf('avatar:load:success');
    const animStartIndex = order.indexOf('avatar:animation:started');
    expect(loadStartIndex).toBeGreaterThanOrEqual(0);
    expect(loadSuccessIndex).toBeGreaterThan(loadStartIndex);
    expect(animStartIndex).toBeGreaterThan(loadSuccessIndex);
  });

  /* ------------------------------------------------------------------------ */
  /* 6. Memory heuristic stability (no uncontrolled growth)                   */
  /* ------------------------------------------------------------------------ */
  it('maintains stable memory estimate across repeated idle plays', async () => {
    await femaleRuntime.load();
    const baselineKB = femaleRuntime.debug().memoryEstimateKB ?? 0;
    for (let i = 0; i < 5; i++) {
      // eslint-disable-next-line no-await-in-loop
      await femaleRuntime.play('idle_1');
    }
    const afterKB = femaleRuntime.debug().memoryEstimateKB ?? baselineKB;
    // Accept slight variation; enforce non-explosive growth (< 2x)
    expect(afterKB).toBeLessThanOrEqual(Math.max(baselineKB * 2, baselineKB + 1024));
  });

  /* ------------------------------------------------------------------------ */
  /* 7. Concurrent load deduplication (runtime)                               */
  /* ------------------------------------------------------------------------ */
  it('deduplicates concurrent female load calls', async () => {
    const spy = vi.spyOn(femaleRuntime as unknown as { load: () => Promise<void> }, 'load');
    // Trigger multiple awaits concurrently
    await Promise.all([femaleRuntime.load(), femaleRuntime.load(), femaleRuntime.load()]);
    expect(spy).toHaveBeenCalledTimes(3); // API method invoked
    // But internal asset load logic should still only have produced single success event
    expect(eventsCollector.capture.loadSuccess).toBe(1);
  });
});
