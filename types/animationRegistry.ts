/**
 * Animation Registry System
 * =========================
 *
 * This module defines the comprehensive animation registry for Ready Player Me avatars,
 * providing semantic animation keys, gender-aware asset resolution, and metadata for
 * intelligent animation blending and scheduling.
 *
 * Features:
 * - Semantic animation keys (e.g., 'locomotion.walk.forward')
 * - Gender-aware fallback resolution (feminine/masculine armature)
 * - Priority-based preloading tiers
 * - Animation metadata for blending hints and categorization
 * - Non-duplicating registry design
 * - Type-safe semantic key system
 */

export type AvatarGender = 'feminine' | 'masculine';

export type AnimationCategory =
  | 'locomotion'
  | 'idle'
  | 'expression'
  | 'emote'
  | 'transition'
  | 'base';

export type BlendHint =
  | 'locomotion'    // Full body locomotion (replaces base layer)
  | 'upper'         // Upper body only (spine up)
  | 'fullbody'      // Full body override (emotes/dances)
  | 'additive'      // Additive layer (breathing, micro-movements)
  | 'facial'        // Face/head only
  | 'transition';   // Temporary transition states

export type CaptureGender = 'F' | 'M'; // Original motion capture performer

/**
 * Metadata for each animation variant
 */
export interface AnimationMeta {
  /** Animation category for organization */
  category: AnimationCategory;

  /** Whether this animation should loop */
  loop: boolean;

  /** One-shot animations (jumps, transitions) */
  oneShot?: boolean;

  /** Preload priority (0-100, lower = higher priority) */
  priority: number;

  /** Blending hint for layer system */
  blendHint: BlendHint;

  /** Original motion capture performer */
  captureGender?: CaptureGender;

  /** Style tags for classification */
  styleTags?: string[];

  /** Estimated duration in seconds (if known) */
  duration?: number;

  /** Default crossfade duration for transitions */
  defaultCrossFade?: number;

  /** Animation intensity (0-1) for expression variants */
  intensity?: number;
}

/**
 * Gender-aware animation variant definition
 */
export interface GenderedVariant {
  /** Path to feminine armature animation */
  feminine?: string;

  /** Path to masculine armature animation */
  masculine?: string;

  /** Animation metadata */
  meta: AnimationMeta;
}

/**
 * Complete animation registry mapping semantic keys to gendered variants
 */
export type AnimationRegistry = Record<string, GenderedVariant>;

/**
 * Semantic animation keys - organized by category and function
 */
export namespace SemanticKeys {
  // Base poses
  export const BASE_T_POSE_FEMININE = 'base.tpose.feminine';
  export const BASE_T_POSE_MASCULINE = 'base.tpose.masculine';

  // Locomotion - Idle
  export const LOCOMOTION_IDLE_PRIMARY = 'locomotion.idle.primary';
  export const LOCOMOTION_IDLE_VARIANT_1 = 'locomotion.idle.variant.1';
  export const LOCOMOTION_IDLE_VARIANT_2 = 'locomotion.idle.variant.2';
  export const LOCOMOTION_IDLE_VARIANT_3 = 'locomotion.idle.variant.3';
  export const LOCOMOTION_IDLE_VARIANT_4 = 'locomotion.idle.variant.4';
  export const LOCOMOTION_IDLE_VARIANT_5 = 'locomotion.idle.variant.5';
  export const LOCOMOTION_IDLE_VARIANT_6 = 'locomotion.idle.variant.6';
  export const LOCOMOTION_IDLE_VARIANT_7 = 'locomotion.idle.variant.7';
  export const LOCOMOTION_IDLE_VARIANT_8 = 'locomotion.idle.variant.8';
  export const LOCOMOTION_IDLE_VARIANT_9 = 'locomotion.idle.variant.9';

  // Locomotion - Walking
  export const LOCOMOTION_WALK_FORWARD_NORMAL = 'locomotion.walk.forward.normal';
  export const LOCOMOTION_WALK_FORWARD_ALT = 'locomotion.walk.forward.alt';
  export const LOCOMOTION_WALK_BACKWARD = 'locomotion.walk.backward';
  export const LOCOMOTION_WALK_STRAFE_LEFT = 'locomotion.walk.strafe.left';
  export const LOCOMOTION_WALK_STRAFE_RIGHT = 'locomotion.walk.strafe.right';

  // Locomotion - Jogging
  export const LOCOMOTION_JOG_FORWARD = 'locomotion.jog.forward';
  export const LOCOMOTION_JOG_FORWARD_ALT = 'locomotion.jog.forward.alt';
  export const LOCOMOTION_JOG_BACKWARD = 'locomotion.jog.backward';
  export const LOCOMOTION_JOG_STRAFE_LEFT = 'locomotion.jog.strafe.left';
  export const LOCOMOTION_JOG_STRAFE_RIGHT = 'locomotion.jog.strafe.right';

  // Locomotion - Running
  export const LOCOMOTION_RUN_FORWARD = 'locomotion.run.forward';
  export const LOCOMOTION_RUN_BACKWARD = 'locomotion.run.backward';
  export const LOCOMOTION_RUN_STRAFE_LEFT = 'locomotion.run.strafe.left';
  export const LOCOMOTION_RUN_STRAFE_RIGHT = 'locomotion.run.strafe.right';

  // Locomotion - Crouching
  export const LOCOMOTION_CROUCH_IDLE = 'locomotion.crouch.idle';
  export const LOCOMOTION_CROUCH_WALK = 'locomotion.crouch.walk';
  export const LOCOMOTION_CROUCH_WALK_BACKWARD = 'locomotion.crouch.walk.backward';
  export const LOCOMOTION_CROUCH_STRAFE_LEFT = 'locomotion.crouch.strafe.left';
  export const LOCOMOTION_CROUCH_STRAFE_RIGHT = 'locomotion.crouch.strafe.right';

  // Locomotion - Jumping & Falling
  export const LOCOMOTION_JUMP_WALK = 'locomotion.jump.walk';
  export const LOCOMOTION_JUMP_JOG = 'locomotion.jump.jog';
  export const LOCOMOTION_JUMP_RUN = 'locomotion.jump.run';
  export const LOCOMOTION_FALL_IDLE = 'locomotion.fall.idle';
  export const LOCOMOTION_FALL_LOOP = 'locomotion.fall.loop';

  // Expressions - Talking
  export const EXPRESSION_TALK_VARIANT_1 = 'expression.talk.variant.1';
  export const EXPRESSION_TALK_VARIANT_2 = 'expression.talk.variant.2';
  export const EXPRESSION_TALK_VARIANT_3 = 'expression.talk.variant.3';
  export const EXPRESSION_TALK_VARIANT_4 = 'expression.talk.variant.4';
  export const EXPRESSION_TALK_VARIANT_5 = 'expression.talk.variant.5';
  export const EXPRESSION_TALK_VARIANT_6 = 'expression.talk.variant.6';

  // Expressions - Standing Expressions
  export const EXPRESSION_FACE_NEUTRAL = 'expression.face.neutral';
  export const EXPRESSION_FACE_HAPPY = 'expression.face.happy';
  export const EXPRESSION_FACE_SURPRISED = 'expression.face.surprised';
  export const EXPRESSION_FACE_THINKING = 'expression.face.thinking';
  export const EXPRESSION_FACE_CONFUSED = 'expression.face.confused';
  export const EXPRESSION_FACE_EXCITED = 'expression.face.excited';

  // Emotes - Dances
  export const EMOTE_DANCE_CASUAL_1 = 'emote.dance.casual.1';
  export const EMOTE_DANCE_CASUAL_2 = 'emote.dance.casual.2';
  export const EMOTE_DANCE_ENERGETIC_1 = 'emote.dance.energetic.1';
  export const EMOTE_DANCE_ENERGETIC_2 = 'emote.dance.energetic.2';
  export const EMOTE_DANCE_RHYTHMIC_1 = 'emote.dance.rhythmic.1';
  export const EMOTE_DANCE_RHYTHMIC_2 = 'emote.dance.rhythmic.2';
  export const EMOTE_DANCE_FREESTYLE_1 = 'emote.dance.freestyle.1';
  export const EMOTE_DANCE_FREESTYLE_2 = 'emote.dance.freestyle.2';
}

/**
 * Animation resolution options
 */
export interface AnimationResolutionOptions {
  /** Preferred capture gender (overrides default gender preference) */
  preferCapture?: CaptureGender;

  /** Allow fallback to opposite gender if preferred not available */
  allowFallback?: boolean;

  /** Throw error if animation not found (vs returning null) */
  strict?: boolean;
}

/**
 * Resolve animation path for given semantic key and avatar gender
 */
export function resolveAnimationPath(
  registry: AnimationRegistry,
  semanticKey: string,
  avatarGender: AvatarGender,
  options: AnimationResolutionOptions = {}
): string | null {
  const { allowFallback = true, strict = false } = options;

  const entry = registry[semanticKey];
  if (!entry) {
    if (strict) {
      throw new Error(`Animation not found in registry: ${semanticKey}`);
    }
    return null;
  }

  // Primary resolution based on avatar gender
  let primaryPath = avatarGender === 'feminine' ? entry.feminine : entry.masculine;

  // Apply capture preference override if specified
  if (options.preferCapture && entry.meta.captureGender) {
    const preferFeminine = options.preferCapture === 'F';
    if (preferFeminine && entry.feminine) {
      primaryPath = entry.feminine;
    } else if (!preferFeminine && entry.masculine) {
      primaryPath = entry.masculine;
    }
  }

  // Return primary path if available
  if (primaryPath) {
    return primaryPath;
  }

  // Fallback to opposite gender if allowed
  if (allowFallback) {
    const fallbackPath = avatarGender === 'feminine' ? entry.masculine : entry.feminine;
    if (fallbackPath) {
      return fallbackPath;
    }
  }

  // No valid path found
  if (strict) {
    throw new Error(`No valid animation path for ${semanticKey} (gender: ${avatarGender})`);
  }

  return null;
}

/**
 * Get all semantic keys for a specific category
 */
export function getAnimationsByCategory(
  registry: AnimationRegistry,
  category: AnimationCategory
): string[] {
  return Object.keys(registry).filter(key => registry[key].meta.category === category);
}

/**
 * Get animations sorted by priority (for preloading)
 */
export function getAnimationsByPriority(
  registry: AnimationRegistry,
  maxPriority?: number
): Array<{ key: string; priority: number }> {
  const animations = Object.entries(registry)
    .map(([key, variant]) => ({
      key,
      priority: variant.meta.priority
    }))
    .filter(item => maxPriority === undefined || item.priority <= maxPriority)
    .sort((a, b) => a.priority - b.priority);

  return animations;
}

/**
 * Get idle animation variants for cycling
 */
export function getIdleVariants(registry: AnimationRegistry): string[] {
  return Object.keys(registry).filter(key =>
    key.startsWith('locomotion.idle.') && registry[key].meta.category === 'locomotion'
  );
}

/**
 * Get talking animation variants
 */
export function getTalkingVariants(registry: AnimationRegistry): string[] {
  return Object.keys(registry).filter(key =>
    key.startsWith('expression.talk.') && registry[key].meta.category === 'expression'
  );
}

/**
 * Get dance/emote animations
 */
export function getDanceEmotes(registry: AnimationRegistry): string[] {
  return Object.keys(registry).filter(key =>
    key.startsWith('emote.dance.') && registry[key].meta.category === 'emote'
  );
}

/**
 * Utility to check if animation is looping
 */
export function isLoopingAnimation(registry: AnimationRegistry, key: string): boolean {
  return registry[key]?.meta.loop ?? false;
}

/**
 * Utility to check if animation is one-shot
 */
export function isOneShotAnimation(registry: AnimationRegistry, key: string): boolean {
  return registry[key]?.meta.oneShot ?? false;
}

/**
 * Get default crossfade duration for animation
 */
export function getDefaultCrossFade(registry: AnimationRegistry, key: string): number {
  return registry[key]?.meta.defaultCrossFade ?? 0.3;
}

/**
 * Get blend hint for animation
 */
export function getBlendHint(registry: AnimationRegistry, key: string): BlendHint | null {
  return registry[key]?.meta.blendHint ?? null;
}

/**
 * Type-safe semantic key union (for TypeScript auto-completion)
 */
export type SemanticAnimationKey = typeof SemanticKeys[keyof typeof SemanticKeys];

/**
 * Animation state for state machine integration
 */
export type AnimationStateCategory =
  | 'idle'
  | 'walking'
  | 'jogging'
  | 'running'
  | 'crouching'
  | 'jumping'
  | 'falling'
  | 'talking'
  | 'expressing'
  | 'dancing';

/**
 * Map animation state to primary semantic keys
 */
export const STATE_TO_ANIMATION_MAP: Record<AnimationStateCategory, string> = {
  idle: SemanticKeys.LOCOMOTION_IDLE_PRIMARY,
  walking: SemanticKeys.LOCOMOTION_WALK_FORWARD_NORMAL,
  jogging: SemanticKeys.LOCOMOTION_JOG_FORWARD,
  running: SemanticKeys.LOCOMOTION_RUN_FORWARD,
  crouching: SemanticKeys.LOCOMOTION_CROUCH_IDLE,
  jumping: SemanticKeys.LOCOMOTION_JUMP_WALK,
  falling: SemanticKeys.LOCOMOTION_FALL_IDLE,
  talking: SemanticKeys.EXPRESSION_TALK_VARIANT_1,
  expressing: SemanticKeys.EXPRESSION_FACE_NEUTRAL,
  dancing: SemanticKeys.EMOTE_DANCE_CASUAL_1,
};

/**
 * Preload priority tiers
 */
export const PRIORITY_TIERS = {
  CRITICAL: 0,      // Core locomotion + primary idle
  HIGH: 20,         // All locomotion variants + fallback
  MEDIUM: 40,       // Expressions + talking
  LOW: 60,          // Dances + emotes
  OPTIONAL: 80      // Extended/experimental
} as const;

/**
 * Default animation timings
 */
export const DEFAULT_TIMINGS = {
  LOCOMOTION_CROSSFADE: 0.25,
  IDLE_CROSSFADE: 0.8,
  EXPRESSION_CROSSFADE: 0.4,
  EMOTE_FADE_IN: 0.35,
  EMOTE_FADE_OUT: 0.5,
  JUMP_TRANSITION: 0.15,
  LAND_TRANSITION: 0.2
} as const;
