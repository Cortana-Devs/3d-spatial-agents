/Users/chamaththiwanka/Desktop/Projects/Descendants/Descendants/utils/devLogger.ts
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
 *  ifDev(() => { /* dev-only side effects */ });
 *
 * Notes:
 * - This utility only uses console.warn and console.error (allowed by lint).
 * - In production builds, logging is disabled by default.
 */

type LogArgs = unknown[];

const isDevEnv =
  typeof process !== "undefined"
    ? process.env.NODE_ENV !== "production"
    : true;

// Allow opt-in toggling for tests or special cases
let enabled = isDevEnv;

// Persist "once" keys across HMR in dev
const ONCE_KEY = "__DEV_LOG_ONCE_SET__";
const globalOnceSet: Set<string> =
  (globalThis as any)[ONCE_KEY] ||
  ((globalThis as any)[ONCE_KEY] = new Set<string>());

function shouldLog(): boolean {
  return enabled && isDevEnv;
}

function tag(scope?: string): string {
  return scope ? `[DEV:${scope}]` : "[DEV]";
}

export function setDevLoggingEnabled(value: boolean): void {
  enabled = value;
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
export function devOnce(key: string, message?: unknown, ...args: LogArgs): void {
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
  const start = typeof performance !== "undefined" ? performance.now() : Date.now();
  try {
    return fn();
  } finally {
    const end = typeof performance !== "undefined" ? performance.now() : Date.now();
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
