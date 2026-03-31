/**
 * Dev-only agent performance probe. Enable with `?agentPerf=1` in the URL.
 * Logs aggregated timings once per second to the console.
 */

function readEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get("agentPerf") === "1";
  } catch {
    return false;
  }
}

const enabled = readEnabled();

let accInterestMs = 0;
let accAgentMs = 0;
let agentSamples = 0;
let wallRays = 0;
let groundRays = 0;
let losRays = 0;
let logAccum = 0;

export function agentPerfEnabled(): boolean {
  return enabled;
}

export function perfBeginInterest(): number | null {
  if (!enabled) return null;
  return performance.now();
}

export function perfEndInterest(start: number | null): void {
  if (start == null) return;
  accInterestMs += performance.now() - start;
}

export function perfBeginAgentFrame(): number | null {
  if (!enabled) return null;
  return performance.now();
}

export function perfEndAgentFrame(
  start: number | null,
  rays?: { wall?: number; ground?: number; los?: number },
): void {
  if (start == null) return;
  accAgentMs += performance.now() - start;
  agentSamples += 1;
  if (rays) {
    wallRays += rays.wall ?? 0;
    groundRays += rays.ground ?? 0;
    losRays += rays.los ?? 0;
  }
}

/** Call from YukaSystem once per frame with delta (seconds). */
export function perfOnWorldFrame(deltaSec: number): void {
  if (!enabled) return;
  logAccum += deltaSec;
  if (logAccum < 1) return;
  logAccum -= 1;
  const n = Math.max(1, agentSamples);
  // eslint-disable-next-line no-console
  console.table({
    interestMap_update_ms: accInterestMs.toFixed(3),
    agent_useFrame_total_ms: accAgentMs.toFixed(3),
    agent_useFrame_avg_ms: (accAgentMs / n).toFixed(4),
    agent_frames_sampled: agentSamples,
    wall_rays: wallRays,
    ground_rays: groundRays,
    los_rays: losRays,
  });
  accInterestMs = 0;
  accAgentMs = 0;
  agentSamples = 0;
  wallRays = 0;
  groundRays = 0;
  losRays = 0;
}
