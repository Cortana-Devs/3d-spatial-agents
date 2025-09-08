import { devLog } from "@/utils/devLogger";

/**
 * Centralized logger utility with leveled logging, namespace filtering, and environment gating.
 *
 * Goals:
 * - Replace scattered devLog(...) calls with a consistent, configurable logger
 * - Gate verbose logs in production by default (env gating), while allowing overrides
 * - Support log levels (trace, debug, info, warn, error, silent)
 * - Namespace-based enabling similar to "debug" packages (e.g., "world:*,-world:noise")
 * - Zero crashes in SSR and safe in browser (guards around window/localStorage)
 *
 * Quick usage:
 *   import { createLogger } from "@/utils/logging/logger";
 *   const log = createLogger("world:VoxelCanvas");
 *   log.debug("Block array updated", { count: blocks.length });
 *
 * Local overrides (browser console):
 *   localStorage.setItem("DESC_LOG_LEVEL", "debug");    // override level
 *   localStorage.setItem("DESC_DEBUG", "world:*,skybox:*,-noise:*"); // enable only matching namespaces
 *
 * Env vars (build-time):
 *   NEXT_PUBLIC_DESC_LOG_LEVEL=debug
 *   NEXT_PUBLIC_DESC_DEBUG=world:*
 */

export type LogLevel = "silent" | "error" | "warn" | "info" | "debug" | "trace";

export interface Logger {
  namespace: string;
  level: LogLevel;
  trace: (...args: any[]) => void;
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  group: (label?: string) => void;
  groupEnd: () => void;
  time: (label?: string) => void;
  timeEnd: (label?: string) => void;
  setLevel: (level: LogLevel) => void;
  child: (suffix: string) => Logger;
}

type TransportEvent = {
  level: LogLevel;
  namespace: string;
  args: any[];
  timestamp: number;
};

type Transport = (event: TransportEvent) => void;

const LEVEL_ORDER: Record<LogLevel, number> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  trace: 5,
};

// Environment detection (safe for SSR)
const isBrowser = typeof window !== "undefined";
const isDev = (() => {
  try {
    return process.env.NODE_ENV !== "production";
  } catch {
    return true;
  }
})();

// Console guard
const c = ((): Console => {
  const noop = () => {};
  return (typeof console !== "undefined"
    ? console
    : ({
        log: noop,
        warn: noop,
        error: noop,
        info: noop,
        debug: noop,
        trace: noop,
        group: noop,
        groupCollapsed: noop,
        groupEnd: noop,
        time: noop,
        timeEnd: noop,
      } as unknown as Console)) as Console;
})();

// Global state (kept minimal; no localStorage access at module init)
let GLOBAL_LEVEL: LogLevel = isDev ? "debug" : "warn";
let ENABLE_PATTERN_RAW: string | null = null;
let ENABLE_INCLUDES: RegExp[] = [];
let ENABLE_EXCLUDES: RegExp[] = [];
const TRANSPORTS: Set<Transport> = new Set();

// Try to read overrides (lazy) – called on first createLogger/use
let initialized = false;
function initializeOnce() {
  if (initialized) return;
  initialized = true;

  // Build-time env overrides
  const envLevel =
    (safeString(process.env.NEXT_PUBLIC_DESC_LOG_LEVEL) ||
      safeString(process.env.DESC_LOG_LEVEL)) ??
    null;
  if (envLevel && isValidLevel(envLevel)) {
    GLOBAL_LEVEL = envLevel;
  }

  const envPattern =
    safeString(process.env.NEXT_PUBLIC_DESC_DEBUG) ||
    safeString(process.env.DESC_DEBUG) ||
    null;
  if (envPattern) {
    setEnabledNamespaces(envPattern, false);
  }

  // Runtime (browser) overrides via localStorage
  if (isBrowser) {
    try {
      const lsLevel = window.localStorage.getItem("DESC_LOG_LEVEL");
      if (lsLevel && isValidLevel(lsLevel)) {
        GLOBAL_LEVEL = lsLevel as LogLevel;
      }
      const lsPattern = window.localStorage.getItem("DESC_DEBUG");
      if (lsPattern) {
        setEnabledNamespaces(lsPattern, false);
      }
    } catch {
      // ignore
    }
  }
}

function safeString(v: any): string | undefined {
  if (typeof v === "string" && v.trim().length) return v.trim();
  return undefined;
}

function isValidLevel(level: string): level is LogLevel {
  return level in LEVEL_ORDER;
}

// Namespace glob -> RegExp compiler
function globToRegex(glob: string): RegExp {
  // Escape regex special chars, then replace * and ? with regex equivalents
  const escaped = glob.replace(/[-[\]{}()+.,\\^$|#\s]/g, "\\$&");
  const pattern = "^" + escaped.replace(/\*/g, ".*").replace(/\?/g, ".") + "$";
  return new RegExp(pattern);
}

function compilePattern(patternRaw: string) {
  const parts = patternRaw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  const includes: RegExp[] = [];
  const excludes: RegExp[] = [];

  for (const part of parts) {
    if (part.startsWith("-")) {
      excludes.push(globToRegex(part.slice(1)));
    } else {
      includes.push(globToRegex(part));
    }
  }

  return { includes, excludes };
}

function setEnabledNamespaces(pattern: string, persist = true) {
  ENABLE_PATTERN_RAW = pattern;
  const { includes, excludes } = compilePattern(pattern);
  ENABLE_INCLUDES = includes;
  ENABLE_EXCLUDES = excludes;

  if (persist && isBrowser) {
    try {
      window.localStorage.setItem("DESC_DEBUG", pattern);
    } catch {
      // ignore
    }
  }
}

function getEnabledNamespaces(): string | null {
  return ENABLE_PATTERN_RAW;
}

function isNamespaceEnabled(ns: string): boolean {
  if (!ENABLE_PATTERN_RAW) return true; // no filter set => allow all
  for (const rx of ENABLE_EXCLUDES) {
    if (rx.test(ns)) return false;
  }
  if (ENABLE_INCLUDES.length === 0) return true;
  for (const rx of ENABLE_INCLUDES) {
    if (rx.test(ns)) return true;
  }
  return false;
}

// Level check
function isLevelEnabled(target: LogLevel, current: LogLevel): boolean {
  return LEVEL_ORDER[target] <= LEVEL_ORDER[current];
}

// Color hashing for consistent namespace styles
function hashStringToHue(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    // simple DJB2 variant
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  // Fold to positive
  return Math.abs(hash) % 360;
}

function nsStyle(ns: string): string {
  const hue = hashStringToHue(ns);
  const sat = 65;
  const light = 50;
  return `color: hsl(${hue} ${sat}% ${light}%); font-weight: 600`;
}

// Transport handling
function emitToTransports(event: TransportEvent) {
  if (TRANSPORTS.size === 0) return;
  for (const t of TRANSPORTS) {
    try {
      t(event);
    } catch {
      // ignore transport errors
    }
  }
}

// Public API: level management
export function setGlobalLogLevel(level: LogLevel) {
  if (!isValidLevel(level)) return;
  GLOBAL_LEVEL = level;
  if (isBrowser) {
    try {
      window.localStorage.setItem("DESC_LOG_LEVEL", level);
    } catch {
      // ignore
    }
  }
}

export function getGlobalLogLevel(): LogLevel {
  return GLOBAL_LEVEL;
}

export function enableNamespaces(pattern: string) {
  setEnabledNamespaces(pattern, true);
}

export function getEnabledNamespacesPattern(): string | null {
  return getEnabledNamespaces();
}

export function addTransport(transport: Transport) {
  TRANSPORTS.add(transport);
}

export function removeTransport(transport: Transport) {
  TRANSPORTS.delete(transport);
}

// Logger factory
export function createLogger(namespace: string, initialLevel?: LogLevel): Logger {
  initializeOnce();

  let level = initialLevel ?? GLOBAL_LEVEL;

  const logAt =
    (lvl: LogLevel) =>
    (...args: any[]) => {
      if (!isNamespaceEnabled(namespace)) return;
      if (!isLevelEnabled(lvl, level)) return;

      const ts = Date.now();

      // Emit to transports (before console)
      emitToTransports({ level: lvl, namespace, args, timestamp: ts });

      // Style tag + args
      const tag = `%c[${namespace}]`;
      const style = nsStyle(namespace);

      switch (lvl) {
        case "trace":
          // Use debug fallback if trace not available
          (c.trace || c.debug || c.log).apply(c, [tag, style, ...args]);
          break;
        case "debug":
          (c.debug || c.log).apply(c, [tag, style, ...args]);
          break;
        case "info":
          (c.info || c.log).apply(c, [tag, style, ...args]);
          break;
        case "warn":
          c.warn.apply(c, [tag, style, ...args]);
          break;
        case "error":
          c.error.apply(c, [tag, style, ...args]);
          break;
      }
    };

  // group/time helpers still respect gating
  const groupImpl = (label?: string) => {
    if (!isNamespaceEnabled(namespace)) return;
    if (!isLevelEnabled("debug", level)) return; // groups are considered "debug"
    const tag = `%c[${namespace}]`;
    const style = nsStyle(namespace);
    const lab = label ? ` ${label}` : "";
    (c.groupCollapsed || c.group).apply(c, [`${tag}${lab}`, style]);
  };

  const groupEndImpl = () => {
    if (!isNamespaceEnabled(namespace)) return;
    if (!isLevelEnabled("debug", level)) return;
    c.groupEnd && c.groupEnd();
  };

  const timeImpl = (label = "default") => {
    if (!isNamespaceEnabled(namespace)) return;
    if (!isLevelEnabled("debug", level)) return;
    c.time && c.time(`[${namespace}] ${label}`);
  };

  const timeEndImpl = (label = "default") => {
    if (!isNamespaceEnabled(namespace)) return;
    if (!isLevelEnabled("debug", level)) return;
    c.timeEnd && c.timeEnd(`[${namespace}] ${label}`);
  };

  const setLevel = (next: LogLevel) => {
    if (isValidLevel(next)) level = next;
  };

  const child = (suffix: string): Logger =>
    createLogger(`${namespace}:${suffix}`, level);

  return {
    namespace,
    get level() {
      return level;
    },
    set level(next: LogLevel) {
      setLevel(next);
    },
    trace: logAt("trace"),
    debug: logAt("debug"),
    info: logAt("info"),
    warn: logAt("warn"),
    error: logAt("error"),
    group: groupImpl,
    groupEnd: groupEndImpl,
    time: timeImpl,
    timeEnd: timeEndImpl,
    setLevel,
    child,
  };
}

// A convenient default logger for app-wide messages
export const logger = createLogger("app");

// Initialize default gating explicitly once for clarity
// - In development: default level "debug", no namespace filter
// - In production: default level "warn", no namespace filter
// Users can override via localStorage or env variables described above.
