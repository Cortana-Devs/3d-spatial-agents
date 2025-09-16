/**
 * threeStubs.ts
 * Feature: F01-FEMALE-AVATAR
 *
 * Purpose:
 *  Lightweight pure TypeScript stubs for a minimal subset of Three.js
 *  used inside avatar engine integration tests where real Three.js
 *  functionality is unnecessary or would introduce GPU / async loader cost.
 *
 * Usage:
 *  Import the helpers createMockClip / createMockMixer in tests that
 *  need deterministic animation objects without real GLTF parsing.
 *
 * Design Notes:
 *  - Provides a tiny event system on MockAnimationMixer to simulate
 *    'finished' events for non-looping clips.
 *  - Avoids any dynamic import or global side effects.
 *  - Strongly typed; no usage of `any`.
 *
 * Exports:
 *  - class MockAnimationClip   (shape compatible w/ subset of THREE.AnimationClip)
 *  - class MockAnimationAction (subset)
 *  - class MockAnimationMixer  (subset + event dispatcher)
 *  - function createMockClip(name, duration)
 *  - function createMockMixer()
 *
 * Non-goals:
 *  - Rendering, matrix math, skeleton handling
 *  - Full AnimationAction / Mixer parity
 *
 * License: MIT (project-aligned)
 */

/* -------------------------------------------------------------------------- */
/*                               Clip / Action Types                          */
/* -------------------------------------------------------------------------- */

export class MockAnimationClip {
  public name: string;
  public duration: number;
  public tracks: ReadonlyArray<unknown>;

  constructor(name: string, duration: number) {
    this.name = name;
    this.duration = duration;
    this.tracks = [];
  }

  clone(): MockAnimationClip {
    return new MockAnimationClip(this.name, this.duration);
  }
}

type LoopMode = "LoopRepeat" | "LoopOnce";

export class MockAnimationAction {
  public readonly clip: MockAnimationClip;
  public loop: LoopMode;
  public enabled: boolean;
  public clampWhenFinished: boolean;
  private _isPlaying: boolean;
  private _mixer: MockAnimationMixer;
  private _time: number;

  constructor(clip: MockAnimationClip, mixer: MockAnimationMixer) {
    this.clip = clip;
    this._mixer = mixer;
    this.loop = "LoopRepeat";
    this.enabled = true;
    this.clampWhenFinished = false;
    this._isPlaying = false;
    this._time = 0;
  }

  play(): this {
    this._isPlaying = true;
    this._time = 0;
    return this;
  }

  stop(): this {
    this._isPlaying = false;
    return this;
  }

  reset(): this {
    this._time = 0;
    return this;
  }

  isPlaying(): boolean {
    return this._isPlaying;
  }

  /**
   * Simulate cross fade: we just stop current and start target immediately.
   * Accepts durationSeconds to match signature semantics.
   */
  crossFadeTo(
    target: MockAnimationAction,
    _durationSeconds: number,
    _warp: boolean,
  ): void {
    this.stop();
    target.reset().play();
  }

  /** Advance local time; if non-loop and exceeds duration => finished event */
  _advance(deltaSeconds: number): void {
    if (!this._isPlaying) return;
    this._time += deltaSeconds;
    if (this.loop === "LoopOnce" && this._time >= this.clip.duration) {
      this._isPlaying = false;
      if (this.clampWhenFinished) {
        this._time = this.clip.duration;
      }
      this._mixer._emitFinished(this);
    } else if (this.loop === "LoopRepeat" && this.clip.duration > 0) {
      while (this._time >= this.clip.duration) {
        this._time -= this.clip.duration;
      }
    }
  }
}

/* -------------------------------------------------------------------------- */
/*                               Mixer & Events                                */
/* -------------------------------------------------------------------------- */

export interface MixerEventMap {
  finished: { action: MockAnimationAction };
}

type MixerListener<K extends keyof MixerEventMap> = (
  payload: MixerEventMap[K],
) => void;

export class MockAnimationMixer {
  private actions: Map<string, MockAnimationAction> = new Map();
  private listeners: Record<string, Set<MixerListener<"finished">>> = {};
  private _disposed = false;

  clipAction(clip: MockAnimationClip): MockAnimationAction {
    if (this._disposed) {
      throw new Error("MockAnimationMixer: clipAction after dispose");
    }
    let action = this.actions.get(clip.name);
    if (!action) {
      action = new MockAnimationAction(clip, this);
      this.actions.set(clip.name, action);
    }
    return action;
  }

  update(deltaSeconds: number): void {
    if (this._disposed) return;
    for (const action of this.actions.values()) {
      action._advance(deltaSeconds);
    }
  }

  stopAllAction(): void {
    for (const a of this.actions.values()) {
      a.stop();
    }
  }

  addEventListener(
    type: keyof MixerEventMap,
    fn: MixerListener<"finished">,
  ): void {
    if (type === "finished") {
      (this.listeners[type] ??= new Set()).add(fn as MixerListener<"finished">);
    }
  }

  removeEventListener(
    type: keyof MixerEventMap,
    fn: MixerListener<"finished">,
  ): void {
    if (type !== "finished") return;
    const set = this.listeners[type];
    if (set) set.delete(fn as MixerListener<"finished">);
  }

  dispose(): void {
    this.stopAllAction();
    this.actions.clear();
    this.listeners = {};
    this._disposed = true;
  }

  _emitFinished(action: MockAnimationAction): void {
    const set = this.listeners.finished;
    if (!set || set.size === 0) return;
    const payload = { action };
    // Fire synchronously (matching Three.js style)
    set.forEach((listener) => {
      try {
        listener(payload);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[MOCK][MIXER][LISTENER_ERROR]", err);
      }
    });
  }
}

/* -------------------------------------------------------------------------- */
/*                            Factory Helper Functions                         */
/* -------------------------------------------------------------------------- */

/**
 * Create a mock clip with given name & duration (seconds).
 */
export function createMockClip(
  name: string,
  duration: number,
): MockAnimationClip {
  return new MockAnimationClip(name, duration);
}

/**
 * Create a mock mixer exposing only subset required by tests.
 */
export function createMockMixer(): MockAnimationMixer {
  return new MockAnimationMixer();
}

/* -------------------------------------------------------------------------- */
/*                              Optional Convenience                            */
/* -------------------------------------------------------------------------- */

/**
 * Utility to fabricate a non-looping action and auto-run it to completion
 * for tests expecting a 'finished' event.
 */
export async function playOnceAndFinish(
  mixer: MockAnimationMixer,
  clip: MockAnimationClip,
  stepSeconds = 0.1,
): Promise<void> {
  const action = mixer.clipAction(clip);
  action.loop = "LoopOnce";
  action.clampWhenFinished = true;
  action.play();
  let elapsed = 0;
  while (elapsed < clip.duration + stepSeconds * 0.5) {
    mixer.update(stepSeconds);
    elapsed += stepSeconds;
  }
}

/* -------------------------------------------------------------------------- */
/*                           Development Self-Test Hook                        */
/* -------------------------------------------------------------------------- */
export async function __devThreeStubSelfTest(): Promise<string> {
  const mixer = createMockMixer();
  const testClip = createMockClip("demo", 0.25);
  let finished = 0;
  mixer.addEventListener("finished", () => {
    finished++;
  });
  const action = mixer.clipAction(testClip);
  action.loop = "LoopOnce";
  action.clampWhenFinished = true;
  action.play();
  for (let i = 0; i < 10; i++) {
    mixer.update(0.05);
  }
  return `ThreeStubSelfTest(finished=${finished}, active=${action.isPlaying()})`;
}

// Optional global exposure (browser)
declare const window:
  | (Window & { testThreeStubs?: () => Promise<string> })
  | undefined;
if (typeof window !== "undefined" && !window.testThreeStubs) {
  window.testThreeStubs = __devThreeStubSelfTest;
}
