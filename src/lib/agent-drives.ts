/**
 * Agent Drive System — Numeric needs that create emergent motivation.
 *
 * Each drive is a 0–100 value. The subconscious monitors these every frame
 * and triggers conscious thinking (LLM call) when a drive crosses its threshold.
 *
 * Drives replace hardcoded prompt rules like "If you see an OBJECT you MUST place it."
 * Instead, the agent's tidiness drive drops when floor items are nearby,
 * and when it crosses the threshold, the LLM is asked "What do you want to do?"
 *
 * සිංහලෙන්: Agent ට "ආශාව" (Drive) තිබෙනවා. Tidiness drive එක අඩු වුණාම
 * Agent ට "බිම තියෙන දේවල් තියාගන්න ඕන" කියන motivation එක ඇති වෙනවා.
 */

// ============================================================================
// Drive Schema
// ============================================================================

export interface AgentDrives {
  /** Drops when floor items exist nearby. Satisfied by placing items on surfaces. */
  tidiness: number;
  /** Decays over time. Satisfied by exploring new zones. */
  curiosity: number;
  /** Spikes when player is nearby or gives a command. Satisfied by completing tasks. */
  helpfulness: number;
  /** Decays over time. Satisfied by greeting another agent or the player. */
  social: number;
}

/** Per-drive configuration */
interface DriveConfig {
  /** Below this value, the drive fires the conscious mind */
  threshold: number;
  /** How fast this drive decays per second naturally */
  decayRate: number;
  /** How much satisfaction a completed action gives back (added to the drive) */
  satisfyAmount: number;
  /** Minimum seconds between conscious triggers for this specific drive */
  cooldownSec: number;
}

export const DRIVE_CONFIGS: Record<keyof AgentDrives, DriveConfig> = {
  tidiness: {
    threshold: 40,
    decayRate: 0, // Only drops when floor items are perceived
    satisfyAmount: 30,
    cooldownSec: 15,
  },
  curiosity: {
    threshold: 30,
    decayRate: 1.5, // Drops ~1.5/s → threshold in ~45s of idling
    satisfyAmount: 40,
    cooldownSec: 30,
  },
  helpfulness: {
    threshold: 50,
    decayRate: 0, // Only spikes on player proximity events
    satisfyAmount: 50,
    cooldownSec: 10,
  },
  social: {
    threshold: 35,
    decayRate: 1.0, // Drops ~1/s → threshold in ~65s of no social contact
    satisfyAmount: 45,
    cooldownSec: 20,
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
    };
    this.lastTriggerTime = {
      tidiness: 0,
      curiosity: 0,
      helpfulness: 0,
      social: 0,
    };
  }

  /**
   * Called every frame by the subconscious.
   * Updates drive values based on environmental perception.
   */
  update(
    deltaSec: number,
    context: {
      nearbyFloorItems: number;
      playerDistance: number | null;
      nearbyAgentCount: number;
      isIdle: boolean;
    },
  ): void {
    const { nearbyFloorItems, playerDistance, nearbyAgentCount, isIdle } =
      context;

    // --- Tidiness: drops proportional to visible floor clutter ---
    if (nearbyFloorItems > 0) {
      this.drives.tidiness = Math.max(
        0,
        this.drives.tidiness - nearbyFloorItems * 3 * deltaSec,
      );
    } else {
      // Slowly recover when area is clean
      this.drives.tidiness = Math.min(100, this.drives.tidiness + 2 * deltaSec);
    }

    // --- Curiosity: natural decay when idle ---
    if (isIdle) {
      this.drives.curiosity = Math.max(
        0,
        this.drives.curiosity - DRIVE_CONFIGS.curiosity.decayRate * deltaSec,
      );
    }

    // --- Helpfulness: spikes when player is close ---
    if (playerDistance !== null && playerDistance < 10) {
      this.drives.helpfulness = Math.min(
        100,
        this.drives.helpfulness + 5 * deltaSec,
      );
    } else {
      // Decays when player is far
      this.drives.helpfulness = Math.max(
        0,
        this.drives.helpfulness - 0.5 * deltaSec,
      );
    }

    // --- Social: decays without contact ---
    if (nearbyAgentCount === 0) {
      this.drives.social = Math.max(
        0,
        this.drives.social - DRIVE_CONFIGS.social.decayRate * deltaSec,
      );
    }
  }

  /**
   * Called by the subconscious to check if any drive warrants conscious thought.
   * Returns the name and value of the most urgent unmet drive, or null.
   */
  getUrgentDrive(): { drive: keyof AgentDrives; value: number } | null {
    const now = Date.now();
    let mostUrgent: { drive: keyof AgentDrives; value: number } | null = null;

    for (const key of Object.keys(DRIVE_CONFIGS) as (keyof AgentDrives)[]) {
      const config = DRIVE_CONFIGS[key];
      const value = this.drives[key];

      if (value > config.threshold) continue; // Drive is satisfied
      if (now - this.lastTriggerTime[key] < config.cooldownSec * 1000) continue; // On cooldown

      if (!mostUrgent || value < mostUrgent.value) {
        mostUrgent = { drive: key, value };
      }
    }

    return mostUrgent;
  }

  /**
   * Mark a drive as having triggered conscious thought (starts cooldown).
   */
  markTriggered(drive: keyof AgentDrives): void {
    this.lastTriggerTime[drive] = Date.now();
  }

  /**
   * Satisfy a drive by a named amount after completing a relevant action.
   */
  satisfy(drive: keyof AgentDrives): void {
    const amount = DRIVE_CONFIGS[drive].satisfyAmount;
    this.drives[drive] = Math.min(100, this.drives[drive] + amount);
  }

  /**
   * Format drives into a compact string for the LLM context.
   * e.g. "Tidiness:35/100(LOW) Curiosity:72/100 Social:28/100(LOW) Helpfulness:60/100"
   */
  toContextString(): string {
    return (Object.keys(this.drives) as (keyof AgentDrives)[])
      .map((key) => {
        const val = Math.round(this.drives[key]);
        const config = DRIVE_CONFIGS[key];
        const label = key.charAt(0).toUpperCase() + key.slice(1);
        const flag = val <= config.threshold ? "(LOW)" : "";
        return `${label}:${val}/100${flag}`;
      })
      .join(" | ");
  }
}
