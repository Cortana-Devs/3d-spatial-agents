/** Shared bounds for the main lab slab, ground, and matching perimeter walls. */
export type LabHubCenter = { x: number; y: number; z: number };

export const DEFAULT_LAB_HUB: LabHubCenter = { x: 0, y: 4, z: 0 };

/** Rectangle lab (OfficeHub / legacy). */
export const DEFAULT_LAB_FLOOR_WIDTH = 200;
export const DEFAULT_LAB_FLOOR_DEPTH = 150;

/** Donut minimal world: walkable ring between inner and outer radii (no wall on inner edge). */
export const DEFAULT_RING_OUTER_RADIUS = 95;
export const DEFAULT_RING_INNER_RADIUS = 38;
export const DEFAULT_RING_CURVE_SEGMENTS = 72;
/** Facets for the outer circular wall mesh + OBBs. */
export const DEFAULT_RING_WALL_SEGMENTS = 48;
