import type { AgentDrives, AgentPersonality } from "@/types/agent";

export interface MovementPersonalityProfile {
  walkSpeedScalar: number;
  socialDecelSensitivity: number;
  idleFrequency: number;
  gazeWanderRate: number;
  proxemicsOffset: number;
  thresholdPauseScalar: number;
  deliberationSpeedScalar: number;
  arrivalOvershootChance: number;
  gazeRateScalar: number;
}

export class MovementPersonality {
  private cachedProfile: MovementPersonalityProfile;
  private lastDriveSnapshot: string = "";

  constructor(
    initialDrives: AgentDrives,
    private personalityConfig: AgentPersonality
  ) {
    this.cachedProfile = this.computeProfile(initialDrives, this.personalityConfig);
    this.lastDriveSnapshot = this.captureSnapshot(initialDrives);
  }

  public getProfile(drives: AgentDrives): MovementPersonalityProfile {
    const currentSnapshot = this.captureSnapshot(drives);
    if (currentSnapshot !== this.lastDriveSnapshot) {
      this.cachedProfile = this.computeProfile(drives, this.personalityConfig);
      this.lastDriveSnapshot = currentSnapshot;
    }
    return this.cachedProfile;
  }

  /**
   * Quantizes drives to nearest 5 to prevent constant recomputations.
   * e.g., "E85C70S60W55F90"
   */
  private captureSnapshot(drives: AgentDrives): string {
    const q = (val: number) => Math.round(val / 5) * 5;
    return `E${q(drives.energy)}C${q(drives.curiosity)}S${q(drives.social)}W${q(drives.wonder)}F${q(drives.focus)}`;
  }

  private computeProfile(
    drives: AgentDrives,
    personality: AgentPersonality
  ): MovementPersonalityProfile {
    const w = personality.driveWeights || {};
    
    // Safely get weight or default to 1.0
    const wEnergy = w.energy ?? 1.0;
    const wCuriosity = w.curiosity ?? 1.0;
    const wSocial = w.social ?? 1.0;
    const wWonder = w.wonder ?? 1.0;
    const wFocus = w.focus ?? 1.0;

    // Derived parameters using the formulas from the spec
    const walkSpeedScalar = 0.85 + (drives.energy / 100) * 0.3 + (wCuriosity - 1) * 0.1;
    const socialDecelSensitivity = 0.5 + wSocial * 0.75;
    const idleFrequency = 1.0 + (wWonder - 1) * 0.3;
    const gazeWanderRate = 0.5 + wCuriosity * 0.5;
    const proxemicsOffset = Math.max(0, (1.5 - wSocial) * 0.4);
    const thresholdPauseScalar = 0.7 + (wFocus * 0.3);
    const deliberationSpeedScalar = 1.5 - wFocus * 0.5;
    const arrivalOvershootChance = 0.1 + (wWonder - 1) * 0.15;

    return {
      walkSpeedScalar: Math.max(0.4, walkSpeedScalar),
      socialDecelSensitivity: Math.max(0, socialDecelSensitivity),
      idleFrequency: Math.max(0.1, idleFrequency),
      gazeWanderRate: Math.max(0.1, gazeWanderRate),
      proxemicsOffset,
      thresholdPauseScalar: Math.max(0, thresholdPauseScalar),
      deliberationSpeedScalar: Math.max(0.1, deliberationSpeedScalar),
      arrivalOvershootChance: Math.max(0, Math.min(1, arrivalOvershootChance)),
      gazeRateScalar: Math.max(0.1, gazeWanderRate), // Reuse gazeWanderRate logic for parity
    };
  }
}
