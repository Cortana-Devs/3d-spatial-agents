/**
 * Agent Drive System — Numeric needs that create emergent motivation.
 *
 * Each drive is a 0–100 value. The subconscious monitors these every frame
 * and triggers conscious thinking (LLM call) when a drive crosses its threshold.
 *
 * NEW DRIVES (beyond original 4):
 *   energy    — depletes with movement and tasks; restored by resting in the Garden.
 *               Creates the work → rest → work rhythm. Without rest, agents feel robotic.
 *   focus     — improves in the Workshop; drops with interruptions and idleness.
 *               When focus is high, agents prefer focused tasks over socializing.
 *   wonder    — satisfied by views, discoveries, beauty.
 *               Leads agents to the Observatory, Gallery, and the fountain.
 *   belonging — satisfied by being in a preferred zone; arranging and tending one's space.
 *               Creates gentle territorial attachment without aggressive possession.
 */

import type { AgentDrives } from "@/types/agent";

export type { AgentDrives } from "@/types/agent";

/** Per-drive configuration */
interface DriveConfig {
  /** Below this value, the drive fires the conscious mind */
  threshold: number;
  /** How fast this drive decays per second naturally */
  decayRate: number;
  /** How much satisfaction a completed action gives back */
  satisfyAmount: number;
  /** Minimum seconds between conscious triggers for this specific drive */
  cooldownSec: number;
  /** Human-readable label for LLM context */
  label: string;
}

export const DRIVE_CONFIGS: Record<keyof AgentDrives, DriveConfig> = {
  tidiness: {
    threshold: 40,
    decayRate: 0,
    satisfyAmount: 30,
    cooldownSec: 15,
    label: "Tidiness",
  },
  curiosity: {
    threshold: 30,
    decayRate: 1.5,
    satisfyAmount: 40,
    cooldownSec: 30,
    label: "Curiosity",
  },
  helpfulness: {
    threshold: 50,
    decayRate: 0,
    satisfyAmount: 50,
    cooldownSec: 10,
    label: "Helpfulness",
  },
  social: {
    threshold: 35,
    decayRate: 1.0,
    satisfyAmount: 45,
    cooldownSec: 20,
    label: "Social",
  },
  energy: {
    threshold: 30,
    decayRate: 1.2,          // depletes faster while moving; restored by resting
    satisfyAmount: 60,       // Large boost on task completion
    cooldownSec: 45,          // don't spam "I'm tired" LLM calls
    label: "Energy",
  },
  focus: {
    threshold: 25,
    decayRate: 0.5,
    satisfyAmount: 35,
    cooldownSec: 40,
    label: "Focus",
  },
  wonder: {
    threshold: 25,
    decayRate: 1.2,
    satisfyAmount: 45,
    cooldownSec: 35,
    label: "Wonder",
  },
  belonging: {
    threshold: 20,
    decayRate: 0.3,
    satisfyAmount: 40,
    cooldownSec: 60,
    label: "Belonging",
  },
};

// ============================================================================
// Drive Manager — one per agent
// ============================================================================

export class DriveManager {
  public drives: AgentDrives;
  private lastTriggerTime: Record<keyof AgentDrives, number>;

  constructor() {
    this.drives = {
      tidiness: 80,
      curiosity: 70,
      helpfulness: 60,
      social: 60,
      energy: 85,
      focus: 65,
      wonder: 60,
      belonging: 55,
    };
    this.lastTriggerTime = {
      tidiness: 0,
      curiosity: 0,
      helpfulness: 0,
      social: 0,
      energy: 0,
      focus: 0,
      wonder: 0,
      belonging: 0,
    };
  }

  /**
   * Called every frame by the subconscious.
   * Updates drive values based on environmental perception.
   * Accepts optional personality drive weight multipliers.
   */
  update(
    deltaSec: number,
    context: {
      nearbyFloorItems: number;
      playerDistance: number | null;
      nearbyAgentCount: number;
      isIdle: boolean;
      isMoving: boolean;
      isInPreferredZone: boolean;
      driveWeights?: Partial<Record<keyof AgentDrives, number>>;
    },
  ): void {
    const {
      nearbyFloorItems,
      playerDistance,
      nearbyAgentCount,
      isIdle,
      isMoving,
      isInPreferredZone,
      driveWeights = {},
    } = context;

    const w = (key: keyof AgentDrives) => driveWeights[key] ?? 1.0;

    // --- Tidiness ---
    if (nearbyFloorItems > 0) {
      this.drives.tidiness = Math.max(
        0,
        this.drives.tidiness - nearbyFloorItems * 3 * deltaSec,
      );
    } else {
      this.drives.tidiness = Math.min(
        100,
        this.drives.tidiness + 2 * deltaSec,
      );
    }

    // --- Curiosity ---
    if (isIdle) {
      this.drives.curiosity = Math.max(
        0,
        this.drives.curiosity -
          DRIVE_CONFIGS.curiosity.decayRate * deltaSec * w("curiosity"),
      );
    }

    // --- Helpfulness ---
    if (playerDistance !== null && playerDistance < 10) {
      this.drives.helpfulness = Math.min(
        100,
        this.drives.helpfulness + 5 * deltaSec,
      );
    } else {
      this.drives.helpfulness = Math.max(
        0,
        this.drives.helpfulness - 0.5 * deltaSec,
      );
    }

    // --- Social ---
    if (nearbyAgentCount === 0) {
      this.drives.social = Math.max(
        0,
        this.drives.social -
          DRIVE_CONFIGS.social.decayRate * deltaSec * w("social"),
      );
    } else {
      this.drives.social = Math.min(
        100,
        this.drives.social + 2.0 * deltaSec * nearbyAgentCount,
      );
    }

    // --- Energy ---
    if (isMoving) {
      const effectiveDecay =
        DRIVE_CONFIGS.energy.decayRate *
        (isInPreferredZone ? 0.7 : 1.0) *
        w("energy");
      this.drives.energy = Math.max(0, this.drives.energy - effectiveDecay * deltaSec);
    } else {
      const effectiveRecovery = (isInPreferredZone ? 0.3 : 0.1) * deltaSec;
      this.drives.energy = Math.min(100, this.drives.energy + effectiveRecovery);
    }

    // --- Focus ---
    // Decays when idle or interrupted; slow natural recovery
    if (isIdle) {
      this.drives.focus = Math.max(
        0,
        this.drives.focus -
          DRIVE_CONFIGS.focus.decayRate * deltaSec * w("focus"),
      );
    } else {
      this.drives.focus = Math.min(
        100,
        this.drives.focus + 0.2 * deltaSec,
      );
    }

    // --- Wonder ---
    // Decays over time always; large satisfaction burst from CONTEMPLATE/POI visits
    this.drives.wonder = Math.max(
      0,
      this.drives.wonder -
        DRIVE_CONFIGS.wonder.decayRate * deltaSec * w("wonder"),
    );

    // --- Belonging ---
    // Slightly recovers when in preferred zone, decays otherwise
    if (isInPreferredZone) {
      this.drives.belonging = Math.min(
        100,
        this.drives.belonging + 1.5 * deltaSec * w("belonging"),
      );
    } else {
      this.drives.belonging = Math.max(
        0,
        this.drives.belonging -
          DRIVE_CONFIGS.belonging.decayRate * deltaSec * w("belonging"),
      );
    }
  }

  /**
   * Apply zone influence effects to all drives.
   * Separate from update() so zone effects are cleanly decoupled.
   */
  public applyZoneEffects(
    effects: Partial<Record<keyof AgentDrives, number>>,
    deltaSec: number,
    driveWeights: Partial<Record<keyof AgentDrives, number>> = {},
  ): void {
    for (const [key, rate] of Object.entries(effects) as [
      keyof AgentDrives,
      number,
    ][]) {
      if (this.drives[key] !== undefined) {
        const w = driveWeights[key] ?? 1.0;
        this.drives[key] = Math.max(
          0,
          Math.min(100, this.drives[key] + rate * deltaSec * w),
        );
      }
    }
  }

  /**
   * Returns the most urgent unmet drive, or null if all are satisfied.
   */
  getUrgentDrive(): { drive: keyof AgentDrives; value: number } | null {
    const now = Date.now();
    let mostUrgent: { drive: keyof AgentDrives; value: number } | null = null;

    const ACTIONABLE_DRIVES: (keyof AgentDrives)[] = [
      "energy",
      "tidiness",
      "curiosity",
      "wonder",
      "social",
    ];

    for (const key of ACTIONABLE_DRIVES) {
      const config = DRIVE_CONFIGS[key];
      const value = this.drives[key];

      if (value > config.threshold) continue;
      if (now - this.lastTriggerTime[key] < config.cooldownSec * 1000) continue;

      if (!mostUrgent || value < mostUrgent.value) {
        mostUrgent = { drive: key, value };
      }
    }

    return mostUrgent;
  }

  markTriggered(drive: keyof AgentDrives): void {
    this.lastTriggerTime[drive] = Date.now();
  }

  satisfy(drive: keyof AgentDrives): void {
    const amount = DRIVE_CONFIGS[drive].satisfyAmount;
    this.drives[drive] = Math.min(100, this.drives[drive] + amount);
  }

  /**
   * Compact string for LLM context injection.
   * e.g. "Energy:28/100(LOW) Wonder:22/100(LOW) Curiosity:72/100"
   */
  toContextString(): string {
    return (Object.keys(this.drives) as (keyof AgentDrives)[])
      .map((key) => {
        const val = Math.round(this.drives[key]);
        const config = DRIVE_CONFIGS[key];
        const flag = val <= config.threshold ? "(LOW)" : "";
        return `${config.label}:${val}/100${flag}`;
      })
      .join(" | ");
  }
}
