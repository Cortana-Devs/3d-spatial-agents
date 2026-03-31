/** Seconds between UtilityBrain.evaluate calls */
export const UTILITY_CHECK_INTERVAL_MS = 3000;

/** LLM cooldown tiers from player distance (meters). */
export const PLAYER_NEAR_DIST = 5;
export const PLAYER_MID_DIST = 15;
export const LLM_COOLDOWN_NEAR_SEC = 8;
export const LLM_COOLDOWN_MID_SEC = 20;
export const LLM_COOLDOWN_FAR_SEC = 45;

/** After a failed/null brain call, act like this many seconds of cooldown have already elapsed (faster retry). */
export const BRAIN_FAILURE_RETRY_SEC = 4;

/** Suppress random subconscious phrases this long after LLM-driven speech (ms). */
export const SUBCONSCIOUS_AFTER_LLM_SUPPRESS_MS = 9000;
