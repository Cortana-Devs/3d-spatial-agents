/**
 * Dev Logger
 * Centralizes development-only logging to avoid no-console violations.
 *
 * Usage:
 *  import { devLog, devWarn, devError, createScopedLogger, measure, ifDev } from "@/utils/devLogger";
 *
 *  devLog("Something happened", details);
 *  devWarn("Potential issue", { id });
 *  devError("Recoverable error", err);
 *
 *  const uiLog = createScopedLogger("UI");
 *  uiLog.log("Mounted");
 *
 *  const result = measure("heavyOp", () => heavyOp());
 *
 *  ifDev(() => { // dev-only side effects });
 *
 * Notes:
 * - This utility only uses console.warn and console.error (allowed by lint).
 * - In production builds, logging is disabled by default.
 */

type LogArgs = unknown[];

const isDevEnv =
  typeof process !== "undefined" ? process.env.NODE_ENV !== "production" : true;

// Allow opt-in toggling for tests or special cases
// Toggle sources
const DEV_LOG_LS_KEY = "__DEV_LOG_ENABLED__";
const DEV_LOG_QUERY_KEY = "devlog";
const DEV_LOG_ENV =
  typeof process !== "undefined"
    ? (process.env.NEXT_PUBLIC_DEV_LOG ??
      process.env.NEXT_PUBLIC_DEBUG_LOG ??
      process.env.NEXT_PUBLIC_LOGS)
    : undefined;

function parseBoolish(v: unknown): boolean | undefined {
  if (v == null) return undefined;
  const s = String(v).toLowerCase().trim();
  if (s === "1" || s === "true" || s === "on" || s === "yes" || s === "y")
    return true;
  if (s === "0" || s === "false" || s === "off" || s === "no" || s === "n")
    return false;
  return undefined;
}

function resolveInitialEnabled(): boolean {
  // Check for performance mode first
  const perfMode = parseBoolish(
    typeof process !== "undefined"
      ? (process.env.NEXT_PUBLIC_PERF_MODE ?? process.env.PERF_MODE)
      : undefined,
  );
  if (perfMode === true) return false; // Disable all logs in perf mode

  // default to NODE_ENV
  let base = isDevEnv;

  // Env (works in both server and client when NEXT_PUBLIC_*)
  const envParsed = parseBoolish(DEV_LOG_ENV);
  if (typeof envParsed === "boolean") base = envParsed;

  // Browser-only: query param and localStorage
  if (typeof window !== "undefined") {
    try {
      const search = typeof location !== "undefined" ? location.search : "";
      if (search) {
        const qs = new URLSearchParams(search);
        if (qs.has(DEV_LOG_QUERY_KEY)) {
          const qv = qs.get(DEV_LOG_QUERY_KEY);
          const qParsed = parseBoolish(qv ?? "");
          if (typeof qParsed === "boolean") {
            window.localStorage?.setItem(DEV_LOG_LS_KEY, qParsed ? "1" : "0");
            return qParsed;
          }
        }
      }
      const ls = window.localStorage?.getItem(DEV_LOG_LS_KEY);
      const lsParsed = parseBoolish(ls ?? undefined);
      if (typeof lsParsed === "boolean") return lsParsed;
    } catch {
      // ignore storage errors (Safari private mode, etc.)
    }
  }

  return base;
}

const initialEnabled = resolveInitialEnabled();
let enabled = initialEnabled;

// Persist "once" keys across HMR in dev
const ONCE_KEY = "__DEV_LOG_ONCE_SET__";
const globalOnceSet: Set<string> =
  (globalThis as any)[ONCE_KEY] ||
  ((globalThis as any)[ONCE_KEY] = new Set<string>());

function shouldLog(): boolean {
  // Check performance mode at runtime too
  const perfMode = parseBoolish(
    typeof process !== "undefined"
      ? (process.env.NEXT_PUBLIC_PERF_MODE ?? process.env.PERF_MODE)
      : undefined,
  );
  if (perfMode === true) return false;

  return enabled && isDevEnv;
}

function tag(scope?: string): string {
  return scope ? `[DEV:${scope}]` : "[DEV]";
}

export function setDevLoggingEnabled(value: boolean): void {
  enabled = value;
  try {
    if (typeof window !== "undefined") {
      window.localStorage?.setItem(DEV_LOG_LS_KEY, value ? "1" : "0");
    }
  } catch {}
}

export function devLog(message?: unknown, ...args: LogArgs): void {
  if (!shouldLog()) return;
  // Using console.warn to comply with ESLint rule that disallows console.log
  console.warn(tag(), message, ...args);
}

export function devWarn(message?: unknown, ...args: LogArgs): void {
  if (!shouldLog()) return;
  console.warn(tag("WARN"), message, ...args);
}

export function devError(message?: unknown, ...args: LogArgs): void {
  if (!shouldLog()) return;
  console.error(tag("ERROR"), message, ...args);
}

/**
 * Log a message only once per unique key (per HMR session in dev).
 */
export function devOnce(
  key: string,
  message?: unknown,
  ...args: LogArgs
): void {
  if (!shouldLog()) return;
  if (globalOnceSet.has(key)) return;
  globalOnceSet.add(key);
  console.warn(tag("ONCE"), message ?? key, ...args);
}

/**
 * Create a scoped logger that prefixes messages with a scope name
 * to make logs easy to filter.
 */
export function createScopedLogger(scope: string) {
  return {
    log: (message?: unknown, ...args: LogArgs) => {
      if (!shouldLog()) return;
      console.warn(tag(scope), message, ...args);
    },
    warn: (message?: unknown, ...args: LogArgs) => {
      if (!shouldLog()) return;
      console.warn(tag(`${scope}:WARN`), message, ...args);
    },
    error: (message?: unknown, ...args: LogArgs) => {
      if (!shouldLog()) return;
      console.error(tag(`${scope}:ERROR`), message, ...args);
    },
    once: (key: string, message?: unknown, ...args: LogArgs) => {
      if (!shouldLog()) return;
      const scopedKey = `${scope}:${key}`;
      if (globalOnceSet.has(scopedKey)) return;
      globalOnceSet.add(scopedKey);
      console.warn(tag(`${scope}:ONCE`), message ?? key, ...args);
    },
  };
}

/**
 * Measure a synchronous function's execution time and log it in dev.
 * Returns the function's result.
 */
export function measure<T>(label: string, fn: () => T): T {
  const start =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  try {
    return fn();
  } finally {
    const end =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    if (shouldLog()) {
      const duration = (end - start).toFixed(2);
      console.warn(tag("TIMING"), `${label}: ${duration}ms`);
    }
  }
}

/**
 * Execute a callback only in development mode.
 */
export function ifDev(cb: () => void): void {
  if (shouldLog()) cb();
}

// Expose helpers on window for quick toggling and inspection
declare global {
  interface Window {
    __DEV_LOGS__?: {
      enable: () => void;
      disable: () => void;
      set: (value: boolean) => void;
      status: () => boolean;
      clearOnceKeys: () => void;
    };
  }
}

(function setupDevLogsGlobal() {
  if (typeof window === "undefined") return;

  const set = (value: boolean) => {
    setDevLoggingEnabled(value);
    try {
      window.localStorage?.setItem(DEV_LOG_LS_KEY, value ? "1" : "0");
    } catch {}
    console.warn(
      tag("TOGGLE"),
      `Dev logging ${value ? "ENABLED" : "DISABLED"}`,
    );
  };

  window.__DEV_LOGS__ = {
    enable: () => set(true),
    disable: () => set(false),
    set,
    status: () => shouldLog(),
    clearOnceKeys: () => {
      globalOnceSet.clear();
      console.warn(tag("ONCE"), "Cleared dev-once keys");
    },
  };

  // Show console instructions on first load
  if (shouldLog()) {
    console.warn(
      tag("INFO"),
      "🔧 Dev Logs Controls:\n" +
        "  • __DEV_LOGS__.disable() - Turn off all dev logs\n" +
        "  • __DEV_LOGS__.enable() - Turn on dev logs\n" +
        "  • __DEV_LOGS__.status() - Check current status\n" +
        "  • Add ?devlog=false to URL to disable via query param",
    );
  }
})();

const devLogger = {
  setEnabled: setDevLoggingEnabled,
  log: devLog,
  warn: devWarn,
  error: devError,
  once: devOnce,
  createScopedLogger,
  measure,
  ifDev,
};

export default devLogger;
