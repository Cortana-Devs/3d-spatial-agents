/**
 * Simulation Constants
 *
 * Single source of truth for all runtime-tuning numerics.
 * Previously fragmented across four files (agent.ts, brain.ts, taskQueue.ts, world.ts).
 *
 * Sections:
 *   A — Agent physics & interaction
 *   B — LLM / Brain timing
 *   C — Task queue & navigation
 *   D — World geometry (Donut lab)
 */

// ── A: Agent physics & interaction ────────────────────────────────────────────

/** Player proximity / greet flow */
export const PLAYER_GREET_DISTANCE = 6.0;
export const PLAYER_LEAVE_DISTANCE = 10.0;
export const PLAYER_COOLDOWN_TIME = 15.0;

/** Dedupe repeated LLM script injections */
export const SCRIPT_COOLDOWN_MS = 30_000;

/** Ground ray / step-up for agent physics */
export const MAX_STEP_UP = 0.5;

/** Abort stuck navigation and recover */
export const STUCK_TIMER_THRESHOLD_SEC = 4.0;

/** Y position for YUKA vehicle spawn / ground snap in the lab */
export const AGENT_VEHICLE_SPAWN_Y = 4.0;

// ── B: LLM / Brain timing ─────────────────────────────────────────────────────

/** Milliseconds between UtilityBrain.evaluate calls */
export const UTILITY_CHECK_INTERVAL_MS = 3000;

/** LLM cooldown tiers based on player distance (meters). */
export const PLAYER_NEAR_DIST = 5;
export const PLAYER_MID_DIST = 15;
export const LLM_COOLDOWN_NEAR_SEC = 8;
export const LLM_COOLDOWN_MID_SEC = 20;
export const LLM_COOLDOWN_FAR_SEC = 45;

/** After a failed/null brain call, apply this many seconds of elapsed cooldown (faster retry). */
export const BRAIN_FAILURE_RETRY_SEC = 4;

/** Suppress random subconscious phrases this long after LLM-driven speech (ms). */
export const SUBCONSCIOUS_AFTER_LLM_SUPPRESS_MS = 9000;

// ── C: Task queue & navigation ────────────────────────────────────────────────

/** Navigation / stuck detection */
export const TASK_STUCK_WINDOW_SEC = 2.5;
export const TASK_PATH_REFRESH_INTERVAL_SEC = 1.5;
export const TASK_STUCK_MIN_DISTANCE = 1.0;
export const TASK_REPATH_INTERVAL_SEC = 8.0;
export const TASK_MAX_RETRIES = 5;
export const TASK_ARRIVAL_DIST = 2.5;
export const TASK_CLOSE_APPROACH_DIST = 4.0;

/** Wait for partner vehicle/store position before cancelling COLLABORATE. */
export const TASK_COLLABORATE_PARTNER_WAIT_MAX_SEC = 3;

/** Default task durations (seconds) */
export const TASK_SIT_DEFAULT_DURATION = 12.0;
export const TASK_LEAN_DEFAULT_DURATION = 6.0;
export const TASK_LOOKAT_DEFAULT_DURATION = 4.0;
export const TASK_EMOTE_DEFAULT_DURATION = 2.5;
export const TASK_PRESENT_DEFAULT_DURATION = 8.0;

// ── D: World geometry (Donut lab) ─────────────────────────────────────────────

/** Donut lab radial bounds (align with scene geometry). */
export const RING_INNER_VOID = 38;
export const RING_INNER_RADIUS = 39;
export const MAX_SAFE_RADIUS = 94;
export const RING_OUTER_WALL = 95;

export const FLOOR_Y = 0;

/** Margins used inside clampToDonutRing. */
export const DONUT_OUTER_MARGIN = 1.0;
export const DONUT_INNER_PUSH = 1.5;
export const DONUT_INNER_ESCAPE = 2.5;
