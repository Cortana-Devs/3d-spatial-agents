/**
 * Single switch for which environment mounts inside the Canvas.
 * Extend the union and `SceneWorldRoot` when you add new worlds.
 */
export type SceneWorldMode = "minimal" | "full";

export const SCENE_WORLD_MODE: SceneWorldMode = "minimal";
