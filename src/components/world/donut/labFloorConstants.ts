/** Shared bounds for the main lab slab, ground, and matching perimeter walls. */
export type LabHubCenter = { x: number; y: number; z: number };

export const DEFAULT_LAB_HUB: LabHubCenter = { x: 0, y: 4, z: 0 };

/** Donut minimal world: walkable ring between inner and outer radii. */
export const DEFAULT_RING_OUTER_RADIUS = 95;
export const DEFAULT_RING_INNER_RADIUS = 38;
export const DEFAULT_RING_CURVE_SEGMENTS = 72;

// Universal Scale Standards
export const PLAYER_HEIGHT_STANDARD = 5.2;  // The Robot character is exactly this tall in THREE units
export const HUMAN_REAL_HEIGHT = 1.7;       // A standard human is logically 1.7m tall
export const ENV_PROP_SCALE_FACTOR = PLAYER_HEIGHT_STANDARD / HUMAN_REAL_HEIGHT; // Ratio applied to trees, fish, benches
