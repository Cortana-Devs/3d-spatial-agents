/**
 * avatarSelectionStore.ts
 * Feature: F01-FEMALE-AVATAR
 *
 * Responsibilities:
 *  - Maintain current avatar selection (male-default | female-c-girl)
 *  - Persist selection to localStorage
 *  - Emit 'avatar:changed' CustomEvent (window) + internal subscriber callbacks
 *  - Provide React hook for consumption with external store semantics
 *  - Offer debug utilities & deterministic initialization
 *
 * Acceptance Targets (per master prompt slice):
 *  - Switching emits avatar:changed once with { previous, next, timestamp }
 *  - Persistence survives reload via AVATAR_PREF_KEY
 *  - Rapid toggles remain consistent without race
 *  - Strong typing (no `any`)
 *
 * Non-goals:
 *  - Loading / attaching 3D assets
 *  - Animation logic / state machine
 *  - Error toasts / UI styling (handled elsewhere)
 */

import * as React from 'react';

/* -------------------------------------------------------------------------- */
/*                                Type Schema                                 */
/* -------------------------------------------------------------------------- */

export type AvatarId = 'male-default' | 'female-c-girl';

export interface AvatarSelectionState {
  current: AvatarId;
  lastChangeTs: number;
}

export interface AvatarChangedPayload {
  previous: AvatarId;
  next: AvatarId;
  timestamp: number;
}

interface InternalStore {
  state: AvatarSelectionState;
  listeners: Set<() => void>;
}

/* -------------------------------------------------------------------------- */
/*                               Config & Consts                              */
/* -------------------------------------------------------------------------- */

const AVATAR_PREF_KEY = 'selectedAvatar';
const DEFAULT_AVATAR: AvatarId = 'male-default';
const VALID_AVATARS: ReadonlySet<AvatarId> = new Set<AvatarId>([
  'male-default',
  'female-c-girl',
]);

/* -------------------------------------------------------------------------- */
/*                        Local Storage Safe Helpers                          */
/* -------------------------------------------------------------------------- */

function safeGetStoredAvatar(): AvatarId {
  if (typeof window === 'undefined') return DEFAULT_AVATAR;
  try {
    const raw = window.localStorage.getItem(AVATAR_PREF_KEY);
    if (raw && VALID_AVATARS.has(raw as AvatarId)) {
      return raw as AvatarId;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_AVATAR;
}

function safePersistAvatar(id: AvatarId): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(AVATAR_PREF_KEY, id);
  } catch {
    /* ignore persistence failure */
  }
}

/* -------------------------------------------------------------------------- */
/*                          Internal Store Singleton                          */
/* -------------------------------------------------------------------------- */

const store: InternalStore = {
  state: {
    current: safeGetStoredAvatar(),
    lastChangeTs: Date.now(),
  },
  listeners: new Set<() => void>(),
};

/* -------------------------------------------------------------------------- */
/*                         Event Emission (Browser)                           */
/* -------------------------------------------------------------------------- */

const GLOBAL_EVENT_NAME = 'avatar:changed';

function emitAvatarChanged(previous: AvatarId, next: AvatarId, timestamp: number): void {
  if (typeof window !== 'undefined') {
    const detail: AvatarChangedPayload = { previous, next, timestamp };
    const event = new CustomEvent<AvatarChangedPayload>(GLOBAL_EVENT_NAME, { detail });
    window.dispatchEvent(event);
  }
  logSwitch(previous, next, timestamp);
  for (const l of store.listeners) {
    l();
  }
}

/* -------------------------------------------------------------------------- */
/*                                 Logging                                    */
/* -------------------------------------------------------------------------- */

function logSwitch(previous: AvatarId, next: AvatarId, timestamp: number): void {
  // eslint-disable-next-line no-console
  console.log(
    '[AVATAR][SWITCH]',
    JSON.stringify({
      previous,
      next,
      ts: timestamp,
      delta: timestamp - store.state.lastChangeTs,
    })
  );
}

/* -------------------------------------------------------------------------- */
/*                            Public Store API                                */
/* -------------------------------------------------------------------------- */

/**
 * Read current immutable snapshot.
 */
export function getAvatarSelectionState(): AvatarSelectionState {
  return { ...store.state };
}

/**
 * Set active avatar. No-op if same ID.
 */
export function setAvatar(next: AvatarId): void {
  if (!VALID_AVATARS.has(next)) {
    throw new Error(`Invalid avatar id: ${next}`);
  }
  const previous = store.state.current;
  if (previous === next) {
    return; // no change
  }
  const timestamp = Date.now();
  store.state = {
    current: next,
    lastChangeTs: timestamp,
  };
  safePersistAvatar(next);
  emitAvatarChanged(previous, next, timestamp);
}

/**
 * Add a low-level subscription to internal store changes (including avatar:changed).
 * Returns an unsubscribe function.
 */
export function subscribeAvatarSelection(listener: () => void): () => void {
  store.listeners.add(listener);
  return () => {
    store.listeners.delete(listener);
  };
}

/**
 * Register a high-level event listener for avatar:changed CustomEvent.
 * Returns unsubscribe function.
 */
export function onAvatarChanged(fn: (payload: AvatarChangedPayload) => void): () => void {
  const handler = (evt: Event) => {
    const ce = evt as CustomEvent<AvatarChangedPayload>;
    fn(ce.detail);
  };
  if (typeof window !== 'undefined') {
    window.addEventListener(GLOBAL_EVENT_NAME, handler as EventListener);
  }
  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener(GLOBAL_EVENT_NAME, handler as EventListener);
    }
  };
}

/* -------------------------------------------------------------------------- */
/*                      React External Store Integration                      */
/* -------------------------------------------------------------------------- */

/**
 * useAvatarSelection - React hook returning selection state with automatic re-render on changes.
 */
export function useAvatarSelection(): AvatarSelectionState {
  return React.useSyncExternalStore(
    subscribeAvatarSelection,
    () => store.state,
    () => store.state // SSR fallback
  );
}

/* -------------------------------------------------------------------------- */
/*                              Debug Utilities                               */
/* -------------------------------------------------------------------------- */

export function debugAvatarSelection(): Record<string, unknown> {
  return {
    current: store.state.current,
    lastChangeTs: store.state.lastChangeTs,
    listeners: store.listeners.size,
  };
}

/**
 * Force reset (useful for tests / hot reload scenarios).
 */
export function _resetAvatarSelectionForTests(id: AvatarId = DEFAULT_AVATAR): void {
  store.state = {
    current: id,
    lastChangeTs: Date.now(),
  };
  for (const l of store.listeners) {
    l();
  }
}

/* -------------------------------------------------------------------------- */
/*                        Optional Initial Event Emit                         */
/* -------------------------------------------------------------------------- */
/**
 * Some systems may expect at least one avatar:changed to bootstrap; leaving
 * this disabled by default to avoid redundant noise. Provide an opt-in.
 */
export function emitInitialAvatarSelectionEvent(): void {
  const { current, lastChangeTs } = store.state;
  emitAvatarChanged(current, current, lastChangeTs);
}

/* -------------------------------------------------------------------------- */
/*                         Minimal Inline Avatar UI                           */
/* -------------------------------------------------------------------------- */
/**
 * A lightweight UI component (unstyled) to toggle avatar selection.
 * Keeping it here as per request to bundle store + selector in single file.
 */
export interface AvatarSelectorProps {
  className?: string;
  optionLabels?: Partial<Record<AvatarId, string>>;
  onChange?(next: AvatarId): void;
}

const DEFAULT_LABELS: Record<AvatarId, string> = {
  'male-default': 'Male',
  'female-c-girl': 'Female',
};

export function AvatarSelector(props: AvatarSelectorProps): JSX.Element {
  const { className, optionLabels, onChange } = props;
  const labels = { ...DEFAULT_LABELS, ...(optionLabels ?? {}) };
  const state = useAvatarSelection();

  const handleSelect = (id: AvatarId) => {
    setAvatar(id);
    if (onChange) onChange(id);
  };

  return (
    <div
      className={className ?? 'avatar-selector'}
      role="radiogroup"
      aria-label="Avatar Selection"
      style={{
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center',
        fontFamily: 'sans-serif',
      }}
    >
      {([...VALID_AVATARS] as AvatarId[]).map(id => {
        const active = state.current === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => handleSelect(id)}
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: 6,
              cursor: 'pointer',
              border: active ? '2px solid #4b9fff' : '1px solid #888',
              background: active ? '#1f2d40' : '#222',
              color: active ? '#fff' : '#bbb',
              fontSize: '0.875rem',
              transition: 'all 120ms ease',
            }}
          >
            {labels[id]}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Module Summary                                */
/* -------------------------------------------------------------------------- */
export const AVATAR_SELECTION_VERSION = '1.0.0';
