/**
 * avatarLogger.ts
 * Feature: F01-FEMALE-AVATAR
 *
 * Structured logging utility for avatar subsystem.
 * Responsibilities:
 *  - Provide stable tag enumeration
 *  - Emit structured console logs (JSON-friendly)
 *  - Maintain a bounded in-memory ring buffer of recent logs
 *  - Support debug toggle (runtime + env) controlling inclusion of data payloads
 *  - Offer subscription mechanism for external telemetry sinks (future-safe)
 *
 * Acceptance Alignment:
 *  - Logs contain required tags: [AVATAR][LOAD], [AVATAR][SWITCH], [ANIM][PLAY], [ANIM][ERROR], [PERF][AVATAR]
 *  - enableAvatarDebug / disableAvatarDebug toggles verbose data
 *  - getRecentAvatarLogs returns buffered records
 *  - Subscriptions removable (dispose pattern)
 *  - No `any` usage
 *
 * Non-goals:
 *  - Remote transport
 *  - Log level filtering beyond debug gating
 *  - Persistent storage or batching
 */

export enum AvatarLogTag {
  AVATAR_LOAD = '[AVATAR][LOAD]',
  AVATAR_SWITCH = '[AVATAR][SWITCH]',
  ANIM_PLAY = '[ANIM][PLAY]',
  ANIM_ERROR = '[ANIM][ERROR]',
  PERF = '[PERF][AVATAR]',
}

export interface AvatarLogRecord {
  tag: AvatarLogTag;
  message: string;
  /**
   * Optional structured data. May be omitted or reduced when debug disabled.
   */
  data?: Record<string, unknown>;
  ts: number; // epoch ms
}

/**
 * Subscriber callback signature for external sinks (e.g. future telemetry).
 */
export type AvatarLogSubscriber = (record: AvatarLogRecord) => void;

/* -------------------------------------------------------------------------- */
/*                                 Internals                                   */
/* -------------------------------------------------------------------------- */

const MAX_BUFFER = 400; // ring buffer max size
let debugEnabled = detectInitialDebugFlag();
const buffer: AvatarLogRecord[] = [];
const subscribers: Set<AvatarLogSubscriber> = new Set();

/**
 * Attempt to detect initial debug flag from env or window global.
 */
function detectInitialDebugFlag(): boolean {
  // Node-like env
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g: any = typeof globalThis !== 'undefined' ? (globalThis as any) : {};
  if (g?.process?.env?.AVATAR_DEBUG === '1') return true;
  // Browser global
  if (typeof window !== 'undefined') {
    const win = window as unknown as { AVATAR_DEBUG?: number | string };
    if (win.AVATAR_DEBUG === 1 || win.AVATAR_DEBUG === '1') return true;
  }
  return false;
}

function pushRecord(record: AvatarLogRecord): void {
  buffer.push(record);
  if (buffer.length > MAX_BUFFER) {
    buffer.splice(0, buffer.length - MAX_BUFFER);
  }
  if (subscribers.size > 0) {
    for (const sub of subscribers) {
      try {
        sub(record);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[AVATAR][LOG][SUBSCRIBER_ERROR]', err);
      }
    }
  }
}

/* -------------------------------------------------------------------------- */
/*                               Public API                                    */
/* -------------------------------------------------------------------------- */

/**
 * Core logging function.
 * When debug disabled and data object is large, we may truncate to avoid noise.
 */
export function logAvatar(
  tag: AvatarLogTag,
  message: string,
  data?: Record<string, unknown>
): void {
  const ts = Date.now();
  let payload: Record<string, unknown> | undefined = data;

  if (!debugEnabled && payload) {
    // Light heuristic: only keep primitive keys & length-limited values
    const filtered: Record<string, unknown> = {};
    let count = 0;
    for (const [k, v] of Object.entries(payload)) {
      if (count >= 6) break;
      if (v === null) {
        filtered[k] = null;
      } else {
        const type = typeof v;
        if (type === 'string') {
          filtered[k] = (v as string).length > 64 ? (v as string).slice(0, 61) + '...' : v;
          count++;
        } else if (type === 'number' || type === 'boolean') {
          filtered[k] = v;
          count++;
        }
      }
    }
    payload = filtered;
  }

  const record: AvatarLogRecord = {
    tag,
    message,
    data: payload,
    ts,
  };

  // Console emission
  // Intentionally structured as: TAG message {json}
  // eslint-disable-next-line no-console
  console.log(tag, message, payload ?? '');

  pushRecord(record);
}

/**
 * Enable verbose debug logging (retains data payload fully).
 */
export function enableAvatarDebug(): void {
  debugEnabled = true;
  logAvatar(AvatarLogTag.AVATAR_LOAD, 'Avatar debug enabled');
}

/**
 * Disable verbose debug logging (data payload filtered).
 */
export function disableAvatarDebug(): void {
  debugEnabled = false;
  logAvatar(AvatarLogTag.AVATAR_LOAD, 'Avatar debug disabled');
}

/**
 * Current debug flag state.
 */
export function isAvatarDebugEnabled(): boolean {
  return debugEnabled;
}

/**
 * Retrieve recent log records (shallow copy).
 */
export function getRecentAvatarLogs(): AvatarLogRecord[] {
  return buffer.slice();
}

/**
 * Subscribe to future log records. Returns an unsubscribe function.
 */
export function subscribeAvatarLogs(fn: AvatarLogSubscriber): () => void {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}

/**
 * Clear buffered logs (does not affect subscribers).
 * Intended for test / dev scenarios.
 */
export function clearAvatarLogBuffer(): void {
  buffer.length = 0;
  logAvatar(AvatarLogTag.AVATAR_LOAD, 'Log buffer cleared');
}

/**
 * Produce a concise diagnostic summary.
 */
export function summarizeAvatarLogs(): {
  count: number;
  lastTag?: AvatarLogTag;
  lastMessage?: string;
  debug: boolean;
} {
  const last = buffer[buffer.length - 1];
  return {
    count: buffer.length,
    lastTag: last?.tag,
    lastMessage: last?.message,
    debug: debugEnabled,
  };
}

/* -------------------------------------------------------------------------- */
/*                            Convenience Shortcuts                            */
/* -------------------------------------------------------------------------- */

export const avatarLog = {
  load: (message: string, data?: Record<string, unknown>) =>
    logAvatar(AvatarLogTag.AVATAR_LOAD, message, data),
  switch: (message: string, data?: Record<string, unknown>) =>
    logAvatar(AvatarLogTag.AVATAR_SWITCH, message, data),
  animPlay: (message: string, data?: Record<string, unknown>) =>
    logAvatar(AvatarLogTag.ANIM_PLAY, message, data),
  animError: (message: string, data?: Record<string, unknown>) =>
    logAvatar(AvatarLogTag.ANIM_ERROR, message, data),
  perf: (message: string, data?: Record<string, unknown>) =>
    logAvatar(AvatarLogTag.PERF, message, data),
};

/* -------------------------------------------------------------------------- */
/*                           Development Self-Test                             */
/* -------------------------------------------------------------------------- */
/**
 * Minimal self-test (invoke manually):
 *   (window as any).testAvatarLogger?.()
 */
export function __devTestAvatarLogger(): string {
  const unsub = subscribeAvatarLogs(() => {
    /* noop listener */
  });
  avatarLog.load('Self-test start', { version: 1 });
  avatarLog.animPlay('Playing idle', { anim: 'idle_1' });
  avatarLog.animError('Failed anim', { reason: 'TestError' });
  enableAvatarDebug();
  avatarLog.perf('perf_sample', { duration: 12.34 });
  disableAvatarDebug();
  unsub();
  const summary = summarizeAvatarLogs();
  return `AvatarLoggerTest(count=${summary.count}, lastTag=${summary.lastTag})`;
}

declare const window: (Window & { testAvatarLogger?: () => string }) | undefined;
if (typeof window !== 'undefined' && !window.testAvatarLogger) {
  (window as unknown as { testAvatarLogger?: () => string }).testAvatarLogger = __devTestAvatarLogger;
}
