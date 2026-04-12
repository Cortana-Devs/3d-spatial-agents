import * as YUKA from "yuka";
import type { MovementPersonalityProfile } from "./MovementPersonality";

export class MovementHumanizer {
  /**
   * Applies subtle Perlin-like lateral drift to the vehicle's velocity
   * to prevent perfectly straight, robotic walking paths.
   */
  public static applyOrganicDrift(
    vehicle: YUKA.Vehicle,
    personality: MovementPersonalityProfile,
    delta: number,
    time: number
  ): void {
    const speed = vehicle.velocity.length();
    // Only apply noticeable drift if the agent is actually moving
    if (speed < 0.2) return;

    // Use a pseudo-random seed based on entity ID if available, otherwise just use time
    const seed = (vehicle as any).id 
      ? Array.from((vehicle as any).id as string).reduce((acc, char) => acc + char.charCodeAt(0), 0)
      : Math.random() * 1000;
      
    // The frequency and amplitude are scaled by the personality parameters
    const frequency = 1.2 * personality.gazeRateScalar;
    // Base amplitude is very tiny to avoid agents walking off cliffs or getting stuck
    const amplitude = 0.08 * personality.deliberationSpeedScalar;

    // Lateral drift perpendicular to current velocity direction
    // Direction = velocity normalized
    const fx = vehicle.velocity.x / speed;
    const fz = vehicle.velocity.z / speed;

    // Perpendicular vector for lateral sway
    const px = -fz;
    const pz = fx;

    // Calculate sway factor using sine wave blending
    const sway = Math.sin(time * frequency + seed) * 
                 Math.cos(time * frequency * 0.7 + seed * 1.5) * 
                 amplitude;

    // Apply drift directly to velocity
    // (This requires the physics/YUKA engine to re-clamp maxSpeed, but since 
    // we only add subtle perpendicular forces, it's mostly tangential)
    vehicle.velocity.x += px * sway * delta * 5.0; // scaled by delta so it's acceleration-based
    vehicle.velocity.z += pz * sway * delta * 5.0;
  }
}
