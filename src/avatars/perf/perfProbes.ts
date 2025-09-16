/**
 * perfProbes.ts
 * Feature: F01-FEMALE-AVATAR
 *
 * Lightweight performance instrumentation for avatar loading / animation systems.
 * Goals:
 *  - Minimal overhead (<0.1ms typical) when disabled
 *  - Provide start()/end() token API
 *  - Chronological sample retention for dev diagnostics
 *  - Structured logging with [PERF][AVATAR] tag
 *
 * Exports:
 *  - interface PerfSample
 *  - class PerfProbe
 *  - function getGlobalAvatarPerfProbe()
 *  - function logPerfSample(sample: PerfSample): void
 *
 * Non-goals:
 *  - Statistical aggregation (mean, variance)
 *  - Remote shipping / batching
 *  - Automatic GC of old samples (caller can clear)
 *
 * Validation Targets Mapping:
 *  - start/end → durationMs > 0 (async path)
 *  - getSamples chronological
 *  - clear() empties sample list
 *  - logPerfSample includes [PERF][AVATAR] + label
 *  - Calling start/end in a tight loop (1000x) does not throw
 */

export interface PerfSample {
  /**
   * Semantic label provided at start() time.
   */
  label: string;
  /**
   * Duration in milliseconds (fixed to 2 decimals) from start() to end().
   */
  durationMs: number;
  /**
   * High-resolution timestamp (performance.now()) when the measurement ended.
   */
  at: number;
}

interface InFlight {
  label: string;
  start: number;
}

let perfNow: () => number = () =>
  (typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now());

/**
 * PerfProbe
 * A small, allocation-conscious performance measurement utility.
 *
 * Usage:
 *   const probe = getGlobalAvatarPerfProbe();
 *   const t = probe.start('avatar_load');
 *   await doWork();
 *   const sample = probe.end(t);
 *   if (sample) logPerfSample(sample);
 */
export class PerfProbe {
  private inFlight: Map<string, InFlight> = new Map();
  private samples: PerfSample[] = [];
  private tokenCounter = 0;
  private maxSamples: number;

  /**
   * @param maxSamples Maximum retained samples before oldest are dropped (ring buffer behavior).
   */
  constructor(maxSamples = 500) {
    this.maxSamples = maxSamples;
  }

  /**
   * Start a new timing segment and return a token that must be passed to end().
   * Multiple segments with the same label are allowed concurrently via unique tokens.
   */
  start(label: string): string {
    const token = `${++this.tokenCounter}_${label}_${perfNow().toFixed(3)}`;
    this.inFlight.set(token, { label, start: perfNow() });
    return token;
  }

  /**
   * End a timing segment identified by token.
   * Returns null if token not found (already ended / invalidated).
   */
  end(token: string): PerfSample | null {
    const flight = this.inFlight.get(token);
    if (!flight) return null;
    this.inFlight.delete(token);

    const endTs = perfNow();
    const duration = endTs - flight.start;
    const sample: PerfSample = {
      label: flight.label,
      durationMs: +duration.toFixed(2),
      at: endTs,
    };

    this.samples.push(sample);
    if (this.samples.length > this.maxSamples) {
      // Drop oldest (simple shift; O(n) but maxSamples small)
      this.samples.shift();
    }
    return sample;
  }

  /**
   * Return a shallow copy of recorded samples in chronological order (oldest -> newest).
   */
  getSamples(): PerfSample[] {
    return this.samples.slice();
  }

  /**
   * Remove all stored samples & in-flight measurements.
   */
  clear(): void {
    this.samples = [];
    this.inFlight.clear();
  }

  /**
   * Returns count of currently in-flight measurements (debug aid).
   */
  getInFlightCount(): number {
    return this.inFlight.size;
  }

  /**
   * Returns a snapshot summary object (for quick debug UIs).
   */
  summarize(): { totalSamples: number; inFlight: number; last?: PerfSample } {
    return {
      totalSamples: this.samples.length,
      inFlight: this.inFlight.size,
      last: this.samples[this.samples.length - 1],
    };
  }
}

/* -------------------------------------------------------------------------- */
/*                           Global Singleton Access                           */
/* -------------------------------------------------------------------------- */

let globalProbe: PerfProbe | null = null;

/**
 * Access a shared global probe instance for the avatar system.
 * Intentionally lazily constructed to avoid startup cost if unused.
 */
export function getGlobalAvatarPerfProbe(): PerfProbe {
  if (!globalProbe) {
    globalProbe = new PerfProbe();
  }
  return globalProbe;
}

/* -------------------------------------------------------------------------- */
/*                               Logging Utility                               */
/* -------------------------------------------------------------------------- */

declare const process: { env?: Record<string, string | undefined> } | undefined;

const DEBUG_ENABLED =
  (typeof process !== 'undefined' && process.env && process.env.AVATAR_DEBUG === '1') ||
  (typeof window !== 'undefined' &&
    ((window as unknown as { AVATAR_DEBUG?: number | string }).AVATAR_DEBUG === 1 ||
      (window as unknown as { AVATAR_DEBUG?: number | string }).AVATAR_DEBUG === '1'));

/**
 * Structured log for a performance sample.
 * Adheres to log tag lexicon: [PERF][AVATAR]
 */
export function logPerfSample(sample: PerfSample): void {
  // Use console.log (not console.debug) so it appears even without devtools filtering.
  // eslint-disable-next-line no-console
  console.log('[PERF][AVATAR]', sample.label, {
    durationMs: sample.durationMs,
    at: +sample.at.toFixed(2),
  });
}

/**
 * Convenience wrapper: end a token & log if valid.
 */
export function endAndLog(token: string, probe: PerfProbe = getGlobalAvatarPerfProbe()): PerfSample | null {
  const s = probe.end(token);
  if (s) logPerfSample(s);
  return s;
}

/**
 * Conditional debug dump (only if AVATAR_DEBUG=1).
 */
export function debugDumpPerfSamples(probe: PerfProbe = getGlobalAvatarPerfProbe()): void {
  if (!DEBUG_ENABLED) return;
  const samples = probe.getSamples();
  // eslint-disable-next-line no-console
  console.debug('[PERF][AVATAR][DUMP]', {
    count: samples.length,
    last: samples[samples.length - 1],
  });
}

/* -------------------------------------------------------------------------- */
/*                           Minimal Self-Diagnostics                          */
/* -------------------------------------------------------------------------- */
/**
 * Quick self-test (development only):
 *   (window as any).testAvatarPerf?.()
 */
export function __devSelfTestProbe(): string {
  const probe = new PerfProbe();
  const tokens: string[] = [];
  for (let i = 0; i < 5; i++) {
    const t = probe.start('unit_test_segment');
    // Simulate a tiny workload
    for (let j = 0; j < 1000; j++) {
      // no-op loop
    }
    probe.end(t);
    tokens.push(t);
  }
  const summary = probe.summarize();
  return `PerfProbeSelfTest(samples=${summary.totalSamples}, inFlight=${summary.inFlight}, last=${summary.last?.durationMs}ms)`;
}

declare const window: (Window & { testAvatarPerf?: () => string }) | undefined;
if (typeof window !== 'undefined' && DEBUG_ENABLED) {
  window.testAvatarPerf = __devSelfTestProbe;
}
