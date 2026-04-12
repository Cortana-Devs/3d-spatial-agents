import type { MovementPersonalityProfile } from "./MovementPersonality";

export type AwarenessState = 'IGNORING' | 'OBSERVING' | 'GREETING' | 'INTERACTING' | 'COOLDOWN';

export class PlayerAwarenessModule {
  public state: AwarenessState = 'IGNORING';
  private timer: number = 0;

  public evaluate(
    distanceToPlayer: number,
    isChatOpen: boolean,
    delta: number,
    personality: MovementPersonalityProfile
  ): AwarenessState {
    if (isChatOpen) {
      if (this.state !== 'INTERACTING') {
        this.state = 'INTERACTING';
      }
      return this.state;
    }

    if (this.state === 'INTERACTING' && !isChatOpen) {
      this.state = 'COOLDOWN';
      this.timer = 15.0; // 15 seconds cooldown before greeting again
      return this.state;
    }

    if (this.state === 'COOLDOWN') {
      this.timer -= delta;
      if (this.timer <= 0) {
        this.state = 'IGNORING';
      } else {
        return this.state;
      }
    }

    // Outer radius for observing is 8m, inner for greeting is ~3m.
    // If agent is highly social, distances are larger.
    const greetDist = 3.0 + personality.proxemicsOffset * 2;
    const observeDist = 8.0 + personality.proxemicsOffset * 3;

    switch (this.state) {
      case 'IGNORING':
        if (distanceToPlayer < observeDist) {
          this.state = 'OBSERVING';
          this.timer = 0;
        }
        break;

      case 'OBSERVING':
        if (distanceToPlayer > observeDist + 1.0) { // +1m hysteresis
          this.state = 'IGNORING';
        } else if (distanceToPlayer < greetDist) {
          this.state = 'GREETING';
          this.timer = 0;
        }
        break;

      case 'GREETING':
        // Stay in greeting state even if they step back slightly (hysteresis + 1.5m)
        if (distanceToPlayer > greetDist + 1.5) {
          this.state = 'OBSERVING';
        }
        break;
    }

    return this.state;
  }
}
