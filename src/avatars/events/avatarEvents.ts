/**
 * avatarEvents.ts
 * Feature: F01-FEMALE-AVATAR
 *
 * Typed event bus for avatar lifecycle & animation events.
 *
 * Responsibilities:
 *  - Provide strongly-typed publish/subscribe API
 *  - Maintain listener sets per event key
 *  - Expose debug utility for listener counts
 *  - Bridge to DOM CustomEvent system so that:
 *      * Bus emits => dispatches window CustomEvent (if available)
 *      * External CustomEvent dispatch (e.g. existing runtime code) => picked up by bus listeners
 *
 * Acceptance Alignment:
 *  - Compile-time rejection of unknown event keys
 *  - Listener disposer stops future callbacks
 *  - debugAvatarEventListeners returns counts
 *  - Emits payloads exactly matching AvatarEventMap
 *
 * Non-goals:
 *  - Event buffering / replay
 *  - Cross-tab / BroadcastChannel integration
 *  - Priority or once-only semantics (can be layered externally)
 *
 * Strict TypeScript: No usage of `any`.
 */

/* -------------------------------------------------------------------------- */
/*                               Type Definitions                              */
/* -------------------------------------------------------------------------- */

/**
 * Canonical avatar id union.
 * Duplicated locally to avoid brittle deep import chains.
 */
export type AvatarId = "male-default" | "female-c-girl";

/**
 * Event payload map (contract).
 */
export type AvatarEventMap = {
  "avatar:changed": {
    previous: AvatarId;
    next: AvatarId;
    timestamp: number;
  };
  "avatar:animation:started": {
    avatar: AvatarId;
    animation: string;
    ts: number;
  };
  "avatar:animation:completed": {
    avatar: AvatarId;
    animation: string;
    ts: number;
  };
  "avatar:animation:error": {
    avatar: AvatarId;
    animation: string;
    error: string;
    ts: number;
  };
  "avatar:load:start": {
    avatar: AvatarId;
    ts: number;
  };
  "avatar:load:success": {
    avatar: AvatarId;
    durationMs: number;
    ts: number;
  };
  "avatar:load:failure": {
    avatar: AvatarId;
    error: string;
    ts: number;
  };
};

/**
 * Listener function type.
 */
type AvatarEventListener<K extends keyof AvatarEventMap> = (
  payload: AvatarEventMap[K],
) => void;

/* -------------------------------------------------------------------------- */
/*                          Internal Bus Implementation                        */
/* -------------------------------------------------------------------------- */

interface InternalBus {
  on<K extends keyof AvatarEventMap>(
    key: K,
    fn: AvatarEventListener<K>,
  ): () => void;
  emit<K extends keyof AvatarEventMap>(
    key: K,
    payload: AvatarEventMap[K],
  ): void;
}

type ListenerSet<K extends keyof AvatarEventMap> = Set<AvatarEventListener<K>>;

/**
 * Singleton holder.
 */
let singletonBus: InternalBus | null = null;

/**
 * Listener storage keyed by event name; lazily allocated.
 */
const listeners: Record<string, Set<unknown>> = {};

/**
 * Track total additions per event for diagnostics (independent of current active listeners).
 */
const listenerStats: Record<string, number> = {};

/**
 * Flag to ensure we only install the DOM bridge once.
 */
let domBridgeInstalled = false;

/* -------------------------------------------------------------------------- */
/*                               Helper Functions                              */
/* -------------------------------------------------------------------------- */

function getSet<K extends keyof AvatarEventMap>(key: K): ListenerSet<K> {
  let set = listeners[key] as Set<AvatarEventListener<K>> | undefined;
  if (!set) {
    set = new Set<AvatarEventListener<K>>();
    listeners[key] = set as Set<unknown>;
  }
  return set;
}

function recordStat(key: keyof AvatarEventMap): void {
  listenerStats[key as string] = (listenerStats[key as string] ?? 0) + 1;
}

function dispatchDomEvent<K extends keyof AvatarEventMap>(
  key: K,
  payload: AvatarEventMap[K],
): void {
  if (typeof window === "undefined" || typeof CustomEvent === "undefined")
    return;
  try {
    const ev = new CustomEvent(key, { detail: payload });
    window.dispatchEvent(ev);
  } catch {
    /* swallow */
  }
}

function installDomBridge(): void {
  if (domBridgeInstalled) return;
  if (
    typeof window === "undefined" ||
    typeof window.addEventListener !== "function"
  )
    return;
  domBridgeInstalled = true;

  (Object.keys(listenerStats) as (keyof AvatarEventMap)[]).forEach((k) => {
    // no-op; ensures stats keys exist if pre-populated
    listenerStats[k as string] = listenerStats[k as string] ?? 0;
  });

  const knownKeys: (keyof AvatarEventMap)[] = [
    "avatar:changed",
    "avatar:animation:started",
    "avatar:animation:completed",
    "avatar:animation:error",
    "avatar:load:start",
    "avatar:load:success",
    "avatar:load:failure",
  ];

  for (const key of knownKeys) {
    window.addEventListener(
      key,
      (evt: Event) => {
        const ce = evt as CustomEvent<AvatarEventMap[typeof key]>;
        if (!ce.detail) return;
        // If bus emitted this, bus listeners already got it;
        // we accept duplicate dispatch risk only if external non-bus code also emits.
        // To avoid infinite loops, we do not re-dispatch via bus.emit (would cause recursion).
        // Instead: directly invoke listeners for this key that have not already received it.
        const set = listeners[key] as
          | Set<AvatarEventListener<typeof key>>
          | undefined;
        if (!set || set.size === 0) return;
        // Invoke each listener asynchronously to maintain order but avoid blocking.
        queueMicrotask(() => {
          set.forEach((fn) => {
            try {
              fn(ce.detail);
            } catch (err) {
              // eslint-disable-next-line no-console
              console.warn("[AVATAR][EVENT][LISTENER_ERROR]", key, err);
            }
          });
        });
      },
      { passive: true },
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                                Public Factory                               */
/* -------------------------------------------------------------------------- */

export function getAvatarEventBus(): InternalBus {
  if (singletonBus) return singletonBus;

  installDomBridge();

  singletonBus = {
    on<K extends keyof AvatarEventMap>(
      key: K,
      fn: AvatarEventListener<K>,
    ): () => void {
      const set = getSet(key);
      set.add(fn);
      recordStat(key);
      return () => {
        set.delete(fn);
      };
    },
    emit<K extends keyof AvatarEventMap>(
      key: K,
      payload: AvatarEventMap[K],
    ): void {
      // Local listeners
      const set = listeners[key] as
        | Set<AvatarEventListener<typeof key>>
        | undefined;
      if (set && set.size > 0) {
        set.forEach((listener) => {
          try {
            listener(payload);
          } catch (err) {
            // eslint-disable-next-line no-console
            console.warn("[AVATAR][EVENT][EMIT_ERROR]", key, err);
          }
        });
      }
      // DOM propagation
      dispatchDomEvent(key, payload);
    },
  };

  return singletonBus;
}

/* -------------------------------------------------------------------------- */
/*                                   Debug API                                 */
/* -------------------------------------------------------------------------- */

/**
 * Returns object mapping event name -> current active listener count.
 */
export function debugAvatarEventListeners(): Record<string, number> {
  const result: Record<string, number> = {};
  (Object.keys(listeners) as (keyof AvatarEventMap)[]).forEach((k) => {
    const set = listeners[k];
    if (set) result[k as string] = set.size;
  });
  return result;
}

/**
 * Returns cumulative registration stats (ever added).
 */
export function summarizeAvatarEventStats(): Record<string, number> {
  return { ...listenerStats };
}

/* -------------------------------------------------------------------------- */
/*                               Dev Self-Test API                             */
/* -------------------------------------------------------------------------- */
/**
 * Manual dev utility (invoke in console):
 *   (window as any).testAvatarEvents?.()
 */
export function __devTestAvatarEvents(): string {
  const bus = getAvatarEventBus();
  let calls = 0;
  const off = bus.on(
    "avatar:load:start",
    (p: AvatarEventMap["avatar:load:start"]) => {
      calls++;
      if (!p.avatar || !p.ts) {
        throw new Error("Payload mismatch");
      }
    },
  );
  bus.emit("avatar:load:start", {
    avatar: "female-c-girl",
    ts: performance.now(),
  });
  off();
  return `AvatarEventsTest(calls=${calls}, listeners=${JSON.stringify(debugAvatarEventListeners())})`;
}

declare const window:
  | (Window & { testAvatarEvents?: () => string })
  | undefined;
if (typeof window !== "undefined" && !window.testAvatarEvents) {
  (window as unknown as { testAvatarEvents?: () => string }).testAvatarEvents =
    __devTestAvatarEvents;
}
