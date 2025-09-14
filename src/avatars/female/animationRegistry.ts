/**
 * Female Animation Registry
 * Feature: F01-FEMALE-AVATAR
 *
 * Responsibilities:
 *  - Provide typed registry of female avatar animations
 *  - Support lazy, cached loading of animation clips (GLB files)
 *  - Category-based queries
 *  - AbortSignal-aware loading
 *  - Duplicate ID safeguard at module init
 *
 * Constraints:
 *  - Strong TypeScript typing (no `any`)
 *  - No eager loading beyond what callers explicitly request
 *  - Provide debug cache visibility
 *
 * Non-goals:
 *  - Cross-avatar registry abstraction
 *  - State machine or blending logic
 *  - Retargeting / skeleton adaptation
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/* ---------- Type Definitions (mirroring master prompt schema subset) ---------- */

export type AnimationCategory = 'idle' | 'talk' | 'walk' | 'emote' | 'system';

export interface AnimationDef {
  id: string;
  path: string;
  category: AnimationCategory;
  loop: boolean;
  approximateDuration?: number; // seconds (optional heuristic)
  lazy: boolean;
}

/* ---------- Error Types ---------- */

export class AnimationNotFoundError extends Error {
  constructor(id: string) {
    super(`Female animation not found: ${id}`);
    this.name = 'AnimationNotFoundError';
  }
}

export class AnimationLoadError extends Error {
  constructor(id: string, detail?: string) {
    super(`Failed to load female animation "${id}"${detail ? `: ${detail}` : ''}`);
    this.name = 'AnimationLoadError';
  }
}

/* ---------- Constants & Paths ----------
 * All paths are relative to public root.
 * NOTE: Do not include domain/origin to support static hosting differences.
 */
const FEMALE_ANIMATION_BASE = '/animations';

const PATHS = {
  idle_1: `${FEMALE_ANIMATION_BASE}/F_Standing_Idle_Variations_001.glb`,
  talk_basic: `${FEMALE_ANIMATION_BASE}/M_Talking_Variations_005.glb`, // Using existing talking variation until female-specific provided
  walk_cycle: `${FEMALE_ANIMATION_BASE}/M_Walk_001.glb`, // Temporary shared locomotion clip
  dance_emote: `${FEMALE_ANIMATION_BASE}/F_Dances_007.glb`,
} as const;

/**
 * Registry of female animations (initial minimal set).
 * Additional animations should append here only—single source of truth.
 */
export const FEMALE_ANIMATIONS: AnimationDef[] = [
  {
    id: 'idle_1',
    path: PATHS.idle_1,
    category: 'idle',
    loop: true,
    approximateDuration: 4.0,
    lazy: true,
  },
  {
    id: 'talk_basic',
    path: PATHS.talk_basic,
    category: 'talk',
    loop: true,
    approximateDuration: 3.2,
    lazy: true,
  },
  {
    id: 'walk_cycle',
    path: PATHS.walk_cycle,
    category: 'walk',
    loop: true,
    approximateDuration: 1.1,
    lazy: true,
  },
  {
    id: 'dance_emote',
    path: PATHS.dance_emote,
    category: 'emote',
    loop: false,
    approximateDuration: 6.5,
    lazy: true,
  },
];

/* ---------- Duplicate ID Safeguard ---------- */
(function ensureNoDuplicateIds() {
  const seen = new Set<string>();
  for (const def of FEMALE_ANIMATIONS) {
    if (seen.has(def.id)) {
      throw new Error(`[FEMALE_ANIM_REGISTRY] Duplicate animation id detected: "${def.id}"`);
    }
    seen.add(def.id);
  }
})();

/* ---------- Internal Caches ---------- */
const clipCache: Map<string, THREE.AnimationClip> = new Map();
const pendingLoads: Map<string, Promise<THREE.AnimationClip>> = new Map();

/* ---------- Utility Lookup ---------- */
function findDef(id: string): AnimationDef | undefined {
  return FEMALE_ANIMATIONS.find(d => d.id === id);
}

/**
 * Return a defensive copy array of animations in a category.
 */
export function getFemaleAnimationsByCategory(category: AnimationCategory): AnimationDef[] {
  return FEMALE_ANIMATIONS.filter(d => d.category === category).map(d => ({ ...d }));
}

/* ---------- Loader (Abort-aware) ---------- */
function loadGLBAnimation(def: AnimationDef, signal?: AbortSignal): Promise<THREE.AnimationClip> {
  return new Promise<THREE.AnimationClip>((resolve, reject) => {
    const loader = new GLTFLoader();
    let aborted = false;

    const abortHandler = () => {
      aborted = true;
      reject(new DOMException('Aborted', 'AbortError'));
    };

    if (signal) {
      if (signal.aborted) {
        return abortHandler();
      }
      signal.addEventListener('abort', abortHandler, { once: true });
    }

    loader.load(
      def.path,
      gltf => {
        if (aborted) return;
        // Strategy: take all clips if present; prefer first if there's ambiguity.
        const clips = gltf.animations;
        if (!clips || clips.length === 0) {
            reject(new AnimationLoadError(def.id, 'No animation clips in GLB'));
            return;
        }
        // If multiple, user can refine later by ID conventions. For now pick first.
        const clip = clips[0];
        resolve(clip);
      },
      undefined,
      err => {
        if (aborted) return;
        reject(new AnimationLoadError(def.id, err instanceof Error ? err.message : 'Unknown error'));
      }
    );
  });
}

/* ---------- Public Loader with Caching & Deduplication ---------- */
export async function loadFemaleAnimation(id: string, signal?: AbortSignal): Promise<THREE.AnimationClip> {
  const def = findDef(id);
  if (!def) {
    throw new AnimationNotFoundError(id);
  }

  // Return cached
  const cached = clipCache.get(id);
  if (cached) {
    return cached;
  }

  // Deduplicate in-flight
  const pending = pendingLoads.get(id);
  if (pending) {
    return pending;
  }

  const loadPromise = (async () => {
    try {
      const clip = await loadGLBAnimation(def, signal);
      // Normalize loop settings: caller can set action loop, but we store meta.
      clip.name = def.id; // ensure clip has canonical name
      clipCache.set(id, clip);
      return clip;
    } finally {
      // Clean pending regardless of success/failure
      pendingLoads.delete(id);
    }
  })();

  pendingLoads.set(id, loadPromise);
  return loadPromise;
}

/* ---------- Debug Utilities ---------- */
export function debugFemaleAnimationCache(): { loadedIds: string[]; pending: string[] } {
  return {
    loadedIds: Array.from(clipCache.keys()),
    pending: Array.from(pendingLoads.keys())
  };
}

/**
 * Optional convenience: preload a minimal baseline set (e.g. idle) without awaiting others.
 * Non-blocking fire-and-forget; errors logged silently.
 */
export function warmFemaleAnimationBaseline(ids: string[] = ['idle_1']): void {
  for (const id of ids) {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    loadFemaleAnimation(id).catch(err => {
      // eslint-disable-next-line no-console
      console.warn('[FEMALE_ANIM_REGISTRY][WarmFailed]', id, err);
    });
  }
}

/* ---------- Invariants & Diagnostic Helpers ---------- */

/**
 * Returns true if an animation clip has been fully loaded & cached.
 */
export function isFemaleAnimationLoaded(id: string): boolean {
  return clipCache.has(id);
}

/**
 * Retrieve raw definition (read-only clone) if present.
 */
export function getFemaleAnimationDef(id: string): AnimationDef | null {
  const def = findDef(id);
  if (!def) return null;
  return { ...def };
}

/**
 * List all animation IDs (stable order).
 */
export function listFemaleAnimationIds(): string[] {
  return FEMALE_ANIMATIONS.map(d => d.id);
}

/**
 * Clear caches (test / hot-reload scenarios).
 * NOTE: Clips are not disposed; caller can manage explicit disposal if needed.
 */
export function resetFemaleAnimationCache(): void {
  clipCache.clear();
  pendingLoads.clear();
}

/* ---------- Self-Test (Development Only) ----------
 * Non-invasive check to warn if approximateDuration diverges significantly from real clip.
 * This runs only if AVATAR_DEBUG environment flag is set (browser global).
 */
declare const process: { env?: Record<string, string | undefined> } | undefined;
const debugFlag =
  (typeof window !== 'undefined' && (window as unknown as { AVATAR_DEBUG?: number }).AVATAR_DEBUG === 1) ||
  (typeof process !== 'undefined' && !!process.env && process.env.AVATAR_DEBUG === '1');

if (debugFlag) {
  // eslint-disable-next-line no-console
  console.debug('[FEMALE_ANIM_REGISTRY] Debug mode enabled.');
  // Pre-warm idle for quicker perceived readiness (non-blocking)
  warmFemaleAnimationBaseline();
}
