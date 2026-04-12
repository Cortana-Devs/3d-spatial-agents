export class ConversationBus {
  private static instance: ConversationBus;
  
  public activeSpeakerId: string | null = null;
  public speakerEndTime: number = 0;

  static getInstance(): ConversationBus {
    if (!this.instance) {
      this.instance = new ConversationBus();
    }
    return this.instance;
  }

  /**
   * Attempts to claim the speaking floor.
   * Returns true if granted or already holds it.
   */
  public requestFloor(agentId: string): boolean {
    const now = Date.now();
    if (!this.activeSpeakerId || this.speakerEndTime <= now) {
      this.activeSpeakerId = agentId;
      return true;
    }
    return this.activeSpeakerId === agentId;
  }

  /**
   * Holds the floor for a specific duration.
   */
  public holdFloor(agentId: string, durationMs: number): void {
    if (this.activeSpeakerId === agentId) {
      this.speakerEndTime = Date.now() + durationMs;
    }
  }

  /**
   * Voluntarily releases the floor early.
   */
  public releaseFloor(agentId: string): void {
    if (this.activeSpeakerId === agentId) {
      this.activeSpeakerId = null;
      this.speakerEndTime = 0;
    }
  }

  public getActiveSpeaker(): string | null {
    if (this.activeSpeakerId && this.speakerEndTime > Date.now()) {
      return this.activeSpeakerId;
    }
    return null;
  }
}
