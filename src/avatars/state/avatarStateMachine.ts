/**
 * avatarStateMachine.ts
 * Feature: F01-FEMALE-AVATAR
 *
 * A lightweight, strongly-typed animation state machine orchestrating
 * baseline animation transitions for an avatar runtime.
 *
 * States:
 *  - IDLE
 *  - WALKING
 *  - TALKING
 *  - EMOTING (ephemeral; returns to previous baseline after emote completes)
 *
 * Events (public):
 *  - onUserMove
 *  - onUserStop
 *  - onTalkStart
 *  - onTalkEnd
 *  - onEmoteTrigger (payload: { animId?: string })
 *
 * Responsibilities:
 *  - Deterministic state transitions (finite set)
 *  - Cross-fade aware animation triggering via runtime.play()
 *  - Preservation & restoration of baseline state after EMOTING
 *  - Safe handling of overlapping / rapid events using a transition token
 *  - Debug reporting
 *
 * Non-goals:
 *  - Low-level animation loading (handled by runtime)
 *  - AI logic / mood inference
 *  - Network or remote synchronization
 *
 * Acceptance Highlights Implemented:
 *  - ANY -> EMOTING -> baseline restoration
 *  - IDLE <-> WALKING via movement events
 *  - IDLE -> TALKING -> IDLE via talk events
 *  - Re-triggering EMOTING restarts emote (overwrites previous)
 *  - debug() exposes activeAnimation & state
 */

import { FemaleAvatarRuntime, AvatarRuntimeHandle } from '../female/femaleRuntimeAdapter';

export type AvatarAnimState = 'IDLE' | 'WALKING' | 'TALKING' | 'EMOTING';

export interface StateMachineConfig {
  idleAnim: string;
  walkAnim?: string;
  talkAnim?: string;
  emoteFallback?: string;
  blendMs?: number;
}

/**
 * Transition events recognized by the state machine.
 */
type StateEvent =
  | 'onUserMove'
  | 'onUserStop'
  | 'onTalkStart'
  | 'onTalkEnd'
  | 'onEmoteTrigger';

interface EmoteTriggerPayload {
  animId?: string; // optional override; falls back to config.emoteFallback
}

interface ActiveTransition {
  token: number;
  startedAt: number;
  event: StateEvent;
}

/**
 * Internal helper describing baseline states (IDLE or WALKING only).
 */
type BaselineState = Extract<AvatarAnimState, 'IDLE' | 'WALKING'>;

/**
 * AvatarStateMachine
 * Orchestrates high-level animation semantics and delegates playback to the runtime.
 */
export class AvatarStateMachine {
  private runtime: AvatarRuntimeHandle;
  private config: StateMachineConfig;

  private state: AvatarAnimState = 'IDLE';
  private baseline: BaselineState = 'IDLE';          // Current baseline (IDLE or WALKING)
  private preTalkBaseline: BaselineState = 'IDLE';    // Stores baseline when entering TALKING
  private preEmoteBaseline: AvatarAnimState = 'IDLE'; // Baseline restored after EMOTING
  private activeTransition: ActiveTransition | null = null;
  private transitionSequence = 0;

  // Track currently playing emote animation ID (to disambiguate completion events)
  private currentEmoteAnim: string | null = null;

  // DOM event listener cleanup (animation completion)
  private animationCompleteListener: ((e: Event) => void) | null = null;

  constructor(runtime: AvatarRuntimeHandle, config: StateMachineConfig) {
    this.runtime = runtime;
    this.config = config;
    this.attachAnimationCompletionListener();
    // Kick off baseline idle (fire & forget)
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.ensureBaselineRunning();
  }

  /**
   * Public event dispatcher.
   */
  public handle(event: StateEvent, payload?: unknown): void {
    switch (event) {
      case 'onUserMove':
        this.onUserMove();
        break;
      case 'onUserStop':
        this.onUserStop();
        break;
      case 'onTalkStart':
        this.onTalkStart();
        break;
      case 'onTalkEnd':
        this.onTalkEnd();
        break;
      case 'onEmoteTrigger':
        this.onEmoteTrigger(payload as EmoteTriggerPayload | undefined);
        break;
      default:
        // Exhaustive guard
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _never: never = event;
        break;
    }
  }

  public getState(): AvatarAnimState {
    return this.state;
  }

  public getPreviousBaseline(): AvatarAnimState | null {
    return this.preEmoteBaseline ?? null;
  }

  /**
   * Provide debug snapshot.
   */
  public debug(): { state: AvatarAnimState; activeAnimation: string | null; baseline: BaselineState } {
    return {
      state: this.state,
      baseline: this.baseline,
      activeAnimation: this.runtime.debug().activeAnimation,
    };
  }

  /**
   * Dispose pattern (detach listeners).
   */
  public dispose(): void {
    if (this.animationCompleteListener && typeof window !== 'undefined') {
      window.removeEventListener('avatar:animation:completed', this.animationCompleteListener as EventListener);
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                                Event Logic                                 */
  /* -------------------------------------------------------------------------- */

  private onUserMove(): void {
    if (this.state === 'EMOTING') {
      // Queue baseline change for after emote
      this.baseline = 'WALKING';
      return;
    }
    if (this.state === 'IDLE') {
      this.transitionTo('WALKING');
      return;
    }
    // If TALKING, we ignore movement (by spec transitions).
  }

  private onUserStop(): void {
    if (this.state === 'EMOTING') {
      this.baseline = 'IDLE';
      return;
    }
    if (this.state === 'WALKING') {
      this.transitionTo('IDLE');
    }
    // TALKING -> ignore stop; user might be stationary already.
  }

  private onTalkStart(): void {
    if (this.state === 'IDLE') {
      this.preTalkBaseline = this.baseline; // baseline is IDLE here
      this.transitionTo('TALKING');
    }
    // If WALKING or EMOTING, spec does not define direct transition.
    // Could extend in future with layered talk gestures.
  }

  private onTalkEnd(): void {
    if (this.state === 'TALKING') {
      // Return to preTalkBaseline (currently always IDLE)
      this.transitionTo(this.preTalkBaseline);
    }
  }

  private onEmoteTrigger(payload?: EmoteTriggerPayload): void {
    const animId = payload?.animId || this.config.emoteFallback;
    if (!animId) {
      // eslint-disable-next-line no-console
      console.warn('[STATE][EMOTE] Emote trigger ignored: no emote animation configured.');
      return;
    }
    // ANY -> EMOTING
    this.preEmoteBaseline = this.state === 'EMOTING' ? this.preEmoteBaseline : this.state;
    this.currentEmoteAnim = animId;
    this.transitionTo('EMOTING', { overrideAnimation: animId });
  }

  /* -------------------------------------------------------------------------- */
  /*                            Transition Management                           */
  /* -------------------------------------------------------------------------- */

  /**
   * Ensure baseline idle animation is started when machine constructed.
   */
  private async ensureBaselineRunning(): Promise<void> {
    if (this.state !== 'IDLE') return;
    await this.safePlay(this.config.idleAnim, 'INIT_IDLE');
  }

  /**
   * Core transition method controlling state updates & associated animation selection.
   */
  private transitionTo(next: AvatarAnimState | BaselineState, opts?: { overrideAnimation?: string }): void {
    if (this.state === next && !opts?.overrideAnimation) return;

    const prev = this.state;
    this.state = next as AvatarAnimState;

    if (next === 'IDLE' || next === 'WALKING') {
      // Update baseline when moving into a baseline state
      this.baseline = next as BaselineState;
    }

    let targetAnimation: string | null = null;

    if (next === 'IDLE') {
      targetAnimation = this.config.idleAnim;
    } else if (next === 'WALKING') {
      targetAnimation = this.config.walkAnim ?? this.config.idleAnim;
    } else if (next === 'TALKING') {
      targetAnimation = this.config.talkAnim ?? this.config.idleAnim;
    } else if (next === 'EMOTING') {
      // Non-looping emote
      targetAnimation = opts?.overrideAnimation || this.config.emoteFallback || null;
    }

    if (targetAnimation) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.safePlay(targetAnimation, `${prev}->${next}`);
    }
  }

  /**
   * Plays animation via runtime with concurrency guard token.
   */
  private async safePlay(animId: string, reason: string): Promise<void> {
    const token = ++this.transitionSequence;
    this.activeTransition = {
      token,
      startedAt: performance.now(),
      event: reason as StateEvent,
    };
    try {
      await this.runtime.play(animId, { fadeMs: this.config.blendMs });
      if (this.activeTransition?.token !== token) {
        // A newer transition replaced this one; do nothing.
        return;
      }
      // Mark transition complete
      this.activeTransition = null;
    } catch (err) {
      if (this.activeTransition?.token === token) {
        // eslint-disable-next-line no-console
        console.error('[STATE][PLAY][ERROR]', { animId, error: err });
        this.activeTransition = null;
      }
    }
  }

  /**
   * Restores from EMOTING after completion (if current state still EMOTING).
   */
  private restoreAfterEmote(animationName: string): void {
    if (this.state !== 'EMOTING') return;
    if (this.currentEmoteAnim && this.currentEmoteAnim !== animationName) {
      // Another emote started; ignore completion of previous one.
      return;
    }
    // Determine baseline to restore:
    let restore: AvatarAnimState;
    if (this.preEmoteBaseline === 'WALKING') {
      restore = 'WALKING';
    } else if (this.preEmoteBaseline === 'TALKING') {
      // If emote was triggered mid-talking (spec allows ANY->EMOTING)
      // We restore to TALKING if it was the baseline; otherwise fallback to IDLE.
      restore = 'TALKING';
    } else {
      restore = 'IDLE';
    }
    this.currentEmoteAnim = null;
    this.transitionTo(restore);
  }

  /* -------------------------------------------------------------------------- */
  /*                        Animation Completion Listener                        */
  /* -------------------------------------------------------------------------- */

  /**
   * Listens for runtime's animation completion events to know when EMOTING finishes.
   */
  private attachAnimationCompletionListener(): void {
    if (typeof window === 'undefined') return;
    this.animationCompleteListener = (evt: Event) => {
      const ce = evt as CustomEvent<{
        avatar: string;
        animation: string;
        ts: number;
      }>;
      if (!ce.detail) return;
      if (this.state === 'EMOTING') {
        this.restoreAfterEmote(ce.detail.animation);
      }
    };
    window.addEventListener('avatar:animation:completed', this.animationCompleteListener as EventListener);
  }
}

/* -------------------------------------------------------------------------- */
/*                       Default Female State Machine Factory                  */
/* -------------------------------------------------------------------------- */

/**
 * Provide a default configuration for the female avatar state machine.
 * Mapping of required baseline animations with fallback logic.
 */
export function createDefaultFemaleStateMachine(runtime: AvatarRuntimeHandle): AvatarStateMachine {
  const config: StateMachineConfig = {
    idleAnim: 'idle_1',
    walkAnim: 'walk_cycle',
    talkAnim: 'talk_basic',
    emoteFallback: 'dance_emote',
    blendMs: 250,
  };
  return new AvatarStateMachine(runtime, config);
}

/* -------------------------------------------------------------------------- */
/*                           Development Self-Test Hook                        */
/* -------------------------------------------------------------------------- */

/**
 * Optional dev utility to validate transitions manually in console.
 * (window as any).testFemaleStateMachine?.()
 */
export async function __devTestFemaleStateMachine(): Promise<string> {
  const runtime = new FemaleAvatarRuntime({ blendMs: 150 });
  const sm = createDefaultFemaleStateMachine(runtime);
  await runtime.load();
  sm.handle('onUserMove'); // IDLE -> WALKING
  await delay(200);
  sm.handle('onUserStop'); // WALKING -> IDLE
  await delay(150);
  sm.handle('onTalkStart'); // IDLE -> TALKING
  await delay(300);
  sm.handle('onTalkEnd'); // TALKING -> IDLE
  await delay(150);
  sm.handle('onEmoteTrigger'); // ANY -> EMOTING
  return JSON.stringify(sm.debug());
}

function delay(ms: number): Promise<void> {
  return new Promise(res => setTimeout(res, ms));
}

declare const window: (Window & { testFemaleStateMachine?: () => Promise<string> }) | undefined;
if (typeof window !== 'undefined') {
  (window as unknown as { testFemaleStateMachine?: () => Promise<string> }).testFemaleStateMachine =
    __devTestFemaleStateMachine;
}
