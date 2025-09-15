/**
 * useAvatarAnimator Hook
 * ======================
 *
 * Unified avatar animation controller that integrates:
 * - Semantic animation registry with gender-aware resolution
 * - Multi-layer animation blending (locomotion, expressions, emotes)
 * - Intelligent idle variation cycling
 * - State machine driven animation transitions
 * - Priority-based preloading and caching
 * - Integration with existing avatar selection system
 *
 * Features:
 * - Automatic animation switching based on avatar gender
 * - Liveliness system with micro-animations and variations
 * - Performance optimization with LOD and caching
 * - Event-driven animation triggers
 * - Seamless fallback between masculine/feminine variants
 */

import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useFrame } from "@react-three/fiber";
import { AnimationMixer, AnimationAction, Object3D, Vector3 } from "three";
import { useGLTF } from "@react-three/drei";
import { useActiveAvatarModel } from "../src/hooks/useActiveAvatarModel";
import { getAnimationLoader } from "../services/animationLoader";
import {
  AnimationRegistry,
  AvatarGender,
  SemanticKeys,
  resolveAnimationPath,
  getIdleVariants,
  getTalkingVariants,
  getDanceEmotes,
  STATE_TO_ANIMATION_MAP,
  DEFAULT_TIMINGS,
  PRIORITY_TIERS,
} from "../types/animationRegistry";
import { ANIMATION_REGISTRY } from "../data/animationRegistry";
import { devLog, devWarn } from "../utils/devLogger";

/**
 * Animation layer configuration
 */
interface AnimationLayer {
  name: string;
  weight: number;
  action: AnimationAction | null;
  fadeTarget: number;
  fadeSpeed: number;
  enabled: boolean;
}

/**
 * Locomotion state for state machine
 */
export type LocomotionState =
  | "idle"
  | "walking"
  | "jogging"
  | "running"
  | "crouching"
  | "jumping"
  | "falling";

/**
 * Expression state
 */
export type ExpressionState =
  | "neutral"
  | "talking"
  | "happy"
  | "surprised"
  | "thinking"
  | "confused"
  | "excited";

/**
 * Emote state
 */
export type EmoteState =
  | "none"
  | "dance-casual"
  | "dance-energetic"
  | "dance-rhythmic"
  | "dance-freestyle";

/**
 * Animation controller state
 */
export interface AnimatorState {
  // Core states
  locomotion: LocomotionState;
  expression: ExpressionState;
  emote: EmoteState;

  // Modifiers
  isCrouching: boolean;
  isTalking: boolean;

  // Velocity for locomotion transitions
  velocity: Vector3;
  speed: number;

  // Current animations
  currentIdle: string;
  currentTalk: string;

  // Timing
  lastIdleChange: number;
  lastExpressionChange: number;
  nextIdleCycle: number;

  // System state
  isReady: boolean;
  isPreloading: boolean;
  preloadProgress: number;
}

/**
 * Configuration options
 */
export interface UseAvatarAnimatorOptions {
  // Auto-preload animations on mount
  autoPreload?: boolean;

  // Maximum preload priority tier
  maxPreloadPriority?: number;

  // Enable idle cycling
  enableIdleCycling?: boolean;

  // Idle cycle interval range (ms)
  idleCycleInterval?: [number, number];

  // Enable micro-expressions
  enableMicroExpressions?: boolean;

  // Expression change interval range (ms)
  expressionInterval?: [number, number];

  // Enable performance optimizations
  enableLOD?: boolean;

  // Performance mode
  performanceMode?: "quality" | "balanced" | "performance";

  // Enable logging
  enableLogging?: boolean;

  // Custom animation registry
  customRegistry?: AnimationRegistry;
}

/**
 * Animation controller interface
 */
export interface AvatarAnimatorController {
  // Core animation control
  playAnimation: (
    semanticKey: string,
    options?: {
      loop?: boolean;
      crossFade?: number;
      layer?: string;
      weight?: number;
    },
  ) => Promise<void>;

  stopAnimation: (semanticKey: string, fadeOut?: number) => void;

  // State control
  setLocomotionState: (state: LocomotionState) => void;
  setExpressionState: (state: ExpressionState) => void;
  setEmoteState: (state: EmoteState) => Promise<void>;

  // Locomotion control
  setVelocity: (velocity: Vector3) => void;
  setCrouch: (crouching: boolean) => void;

  // Expression control
  startTalking: (intensity?: number) => void;
  stopTalking: () => void;
  triggerExpression: (expression: ExpressionState, duration?: number) => void;

  // Emote control
  triggerEmote: (emote: EmoteState) => Promise<void>;
  stopEmote: () => void;

  // Idle control
  triggerIdleVariation: () => void;

  // System control
  preloadAnimations: () => Promise<void>;
  dispose: () => void;

  // State access
  state: AnimatorState;

  // Debug
  getDebugInfo: () => Record<string, any>;
}

/**
 * Default configuration
 */
const DEFAULT_OPTIONS: Required<UseAvatarAnimatorOptions> = {
  autoPreload: true,
  maxPreloadPriority: PRIORITY_TIERS.MEDIUM,
  enableIdleCycling: true,
  idleCycleInterval: [15000, 35000], // 15-35 seconds
  enableMicroExpressions: true,
  expressionInterval: [8000, 20000], // 8-20 seconds
  enableLOD: true,
  performanceMode: "balanced",
  enableLogging: false,
  customRegistry: ANIMATION_REGISTRY,
};

/**
 * Performance settings
 */
const PERFORMANCE_SETTINGS = {
  quality: {
    updateFrequency: 60,
    maxConcurrentActions: 8,
    enableBlending: true,
    idleVariationChance: 0.3,
  },
  balanced: {
    updateFrequency: 30,
    maxConcurrentActions: 5,
    enableBlending: true,
    idleVariationChance: 0.2,
  },
  performance: {
    updateFrequency: 15,
    maxConcurrentActions: 3,
    enableBlending: false,
    idleVariationChance: 0.1,
  },
} as const;

/**
 * Main avatar animator hook
 */
export function useAvatarAnimator(
  avatarScene: Object3D | null,
  options: UseAvatarAnimatorOptions = {},
): AvatarAnimatorController {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const { avatarId, modelUrl, isFemale } = useActiveAvatarModel();
  const gender: AvatarGender = isFemale ? "feminine" : "masculine";

  // Load the avatar model
  const { scene: gltfScene, animations } = useGLTF(modelUrl);

  // Core refs
  const mixerRef = useRef<AnimationMixer | null>(null);
  const layersRef = useRef<Map<string, AnimationLayer>>(new Map());
  const currentActionsRef = useRef<Map<string, AnimationAction>>(new Map());
  const schedulerRef = useRef<{
    idleTimer?: NodeJS.Timeout;
    expressionTimer?: NodeJS.Timeout;
  }>({});

  // State
  const [state, setState] = useState<AnimatorState>({
    locomotion: "idle",
    expression: "neutral",
    emote: "none",
    isCrouching: false,
    isTalking: false,
    velocity: new Vector3(),
    speed: 0,
    currentIdle: SemanticKeys.LOCOMOTION_IDLE_PRIMARY,
    currentTalk: SemanticKeys.EXPRESSION_TALK_VARIANT_1,
    lastIdleChange: Date.now(),
    lastExpressionChange: Date.now(),
    nextIdleCycle:
      Date.now() +
      randomBetween(config.idleCycleInterval[0], config.idleCycleInterval[1]),
    isReady: false,
    isPreloading: false,
    preloadProgress: 0,
  });

  // Animation loader
  const animationLoader = useMemo(() => getAnimationLoader(), []);
  const performanceSettings = PERFORMANCE_SETTINGS[config.performanceMode];

  // Initialize mixer when scene is available
  useEffect(() => {
    if (avatarScene && !mixerRef.current) {
      if (config.enableLogging) {
        devLog(`🎭 Initializing avatar animator for ${gender} avatar`);
        devLog(`   Avatar scene:`, avatarScene);
        devLog(`   Model URL:`, modelUrl);
        devLog(`   Avatar ID:`, avatarId);
      }

      // Check avatar scene structure
      let hasSkinnedMesh = false;
      avatarScene.traverse((child) => {
        if (child.type === "SkinnedMesh") {
          hasSkinnedMesh = true;
          if (config.enableLogging) {
            devLog(`   Found SkinnedMesh: ${child.name}`);
          }
        }
      });

      if (!hasSkinnedMesh) {
        devWarn(
          `⚠️ No SkinnedMesh found in ${gender} avatar scene - animations may not work`,
        );
      }

      mixerRef.current = new AnimationMixer(avatarScene);

      // Initialize animation layers
      const layers = new Map<string, AnimationLayer>();
      layers.set("locomotion", {
        name: "locomotion",
        weight: 1.0,
        action: null,
        fadeTarget: 1.0,
        fadeSpeed: 2.0,
        enabled: true,
      });
      layers.set("expression", {
        name: "expression",
        weight: 0.8,
        action: null,
        fadeTarget: 0.0,
        fadeSpeed: 3.0,
        enabled: true,
      });
      layers.set("emote", {
        name: "emote",
        weight: 1.0,
        action: null,
        fadeTarget: 0.0,
        fadeSpeed: 1.5,
        enabled: true,
      });
      layers.set("additive", {
        name: "additive",
        weight: 0.3,
        action: null,
        fadeTarget: 0.0,
        fadeSpeed: 4.0,
        enabled: true,
      });
      layersRef.current = layers;

      // Use requestAnimationFrame to batch state update and avoid immediate re-render
      requestAnimationFrame(() => {
        setState((prev) => ({ ...prev, isReady: true }));
      });

      if (config.enableLogging) {
        devLog(`✅ Avatar animator initialized for ${gender} avatar`);
      }
    }

    return () => {
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
        mixerRef.current = null;
      }
    };
  }, [avatarScene, gender, config.enableLogging, modelUrl, avatarId]);

  /**
   * Preload animations based on priority
   */
  const preloadAnimations = useCallback(async () => {
    if (isPreloadingRef.current) return; // Prevent multiple concurrent preloads

    setState((prev) => ({ ...prev, isPreloading: true, preloadProgress: 0 }));

    // Use a ref to track progress to avoid setState in callback causing re-renders
    const progressCallback = (loadState: any) => {
      const progress =
        loadState.total > 0 ? loadState.loaded / loadState.total : 0;
      // Batch state updates to avoid rapid re-renders
      requestAnimationFrame(() => {
        setState((prev) => ({ ...prev, preloadProgress: progress }));
      });
    };

    animationLoader.onLoadProgress(progressCallback);

    try {
      await animationLoader.preloadAnimations({
        maxPriority: config.maxPreloadPriority,
        gender,
        concurrency: 3,
      });

      setState((prev) => ({
        ...prev,
        isPreloading: false,
        preloadProgress: 1,
      }));

      if (config.enableLogging) {
        devLog(`✅ Preloaded animations for ${gender} avatar`);
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isPreloading: false,
        preloadProgress: 0,
      }));
      if (config.enableLogging) {
        devWarn(`Failed to preload animations:`, error);
      }
    }
  }, [gender, config.maxPreloadPriority, config.enableLogging]);

  /**
   * Stop scheduler timers
   */
  const stopSchedulers = useCallback(() => {
    if (schedulerRef.current.idleTimer) {
      clearTimeout(schedulerRef.current.idleTimer);
      schedulerRef.current.idleTimer = undefined;
    }

    if (schedulerRef.current.expressionTimer) {
      clearTimeout(schedulerRef.current.expressionTimer);
      schedulerRef.current.expressionTimer = undefined;
    }
  }, []);

  // Auto-preload animations - use refs to avoid dependency issues
  const isPreloadingRef = useRef(false);
  useEffect(() => {
    if (
      config.autoPreload &&
      state.isReady &&
      !state.isPreloading &&
      !isPreloadingRef.current
    ) {
      isPreloadingRef.current = true;
      void preloadAnimations().finally(() => {
        isPreloadingRef.current = false;
      });
    }
  }, [
    config.autoPreload,
    state.isReady,
    state.isPreloading,
    preloadAnimations,
  ]);

  /**
   * Play animation by semantic key
   */
  const playAnimation = useCallback(
    async (
      semanticKey: string,
      playOptions: {
        loop?: boolean;
        crossFade?: number;
        layer?: string;
        weight?: number;
      } = {},
    ) => {
      if (!mixerRef.current) return;

      const {
        loop = true,
        crossFade = DEFAULT_TIMINGS.LOCOMOTION_CROSSFADE,
        layer = "locomotion",
        weight = 1.0,
      } = playOptions;

      try {
        // Load animation clip
        if (config.enableLogging) {
          devLog(`🎬 Loading animation: ${semanticKey} for ${gender} avatar`);
        }

        const clip = await animationLoader.loadAnimation(semanticKey, gender);
        if (!clip) {
          devWarn(`❌ Failed to load animation: ${semanticKey} for ${gender}`);

          // Try fallback to opposite gender
          const fallbackGender: AvatarGender =
            gender === "feminine" ? "masculine" : "feminine";
          if (config.enableLogging) {
            devLog(
              `🔄 Trying fallback gender: ${fallbackGender} for ${semanticKey}`,
            );
          }

          const fallbackClip = await animationLoader.loadAnimation(
            semanticKey,
            fallbackGender,
          );
          if (!fallbackClip) {
            devWarn(`❌ Fallback also failed for: ${semanticKey}`);
            return;
          }

          if (config.enableLogging) {
            devLog(
              `✅ Fallback successful: ${semanticKey} using ${fallbackGender} animation`,
            );
          }

          // Use fallback clip
          const fallbackAction = mixerRef.current.clipAction(fallbackClip);
          fallbackAction.setLoop(loop ? 2201 : 2200, loop ? Infinity : 1);
          fallbackAction.weight = weight;
          fallbackAction.clampWhenFinished = !loop;

          // Handle layer switching
          const layerInfo = layersRef.current.get(layer);
          if (layerInfo) {
            if (layerInfo.action && layerInfo.action !== fallbackAction) {
              layerInfo.action.fadeOut(crossFade);
            }

            fallbackAction.reset();
            fallbackAction.fadeIn(crossFade);
            fallbackAction.play();

            layerInfo.action = fallbackAction;
            currentActionsRef.current.set(semanticKey, fallbackAction);

            if (config.enableLogging) {
              devLog(`🎬 Playing ${semanticKey} (fallback) on ${layer} layer`);
            }
          }
          return;
        }

        if (config.enableLogging) {
          devLog(
            `✅ Successfully loaded animation: ${semanticKey} for ${gender}`,
          );
        }

        // Create action
        const action = mixerRef.current.clipAction(clip);
        action.setLoop(loop ? 2201 : 2200, loop ? Infinity : 1); // LoopRepeat : LoopOnce
        action.weight = weight;
        action.clampWhenFinished = !loop;

        // Verify the action was created successfully
        if (!action) {
          devWarn(`❌ Failed to create action for: ${semanticKey}`);
          return;
        }

        // Handle layer switching
        const layerInfo = layersRef.current.get(layer);
        if (layerInfo) {
          // Fade out current action in layer
          if (layerInfo.action && layerInfo.action !== action) {
            layerInfo.action.fadeOut(crossFade);
          }

          // Fade in new action
          action.reset();
          action.fadeIn(crossFade);
          action.play();

          layerInfo.action = action;
          currentActionsRef.current.set(semanticKey, action);

          if (config.enableLogging) {
            devLog(
              `🎬 Playing ${semanticKey} on ${layer} layer (crossFade: ${crossFade}s)`,
            );
          }
        } else {
          devWarn(`❌ No layer found: ${layer} for animation ${semanticKey}`);
        }
      } catch (error) {
        devError(
          `❌ Error playing animation ${semanticKey} for ${gender}:`,
          error,
        );

        // Log additional debug information
        if (config.enableLogging) {
          devLog(`Debug info for failed animation:`);
          devLog(`  Semantic key: ${semanticKey}`);
          devLog(`  Gender: ${gender}`);
          devLog(`  Layer: ${layer}`);
          devLog(`  Mixer exists: ${!!mixerRef.current}`);
          devLog(`  Avatar scene exists: ${!!avatarScene}`);
        }
      }
    },
    [gender, animationLoader, config.enableLogging],
  );

  /**
   * Stop animation
   */
  const stopAnimation = useCallback(
    (semanticKey: string, fadeOut = 0.3) => {
      const action = currentActionsRef.current.get(semanticKey);
      if (action) {
        action.fadeOut(fadeOut);
        currentActionsRef.current.delete(semanticKey);

        if (config.enableLogging) {
          devLog(`⏹️ Stopping ${semanticKey} (fadeOut: ${fadeOut}s)`);
        }
      }
    },
    [config.enableLogging],
  );

  /**
   * Set locomotion state with speed-based transitions
   */
  const setLocomotionState = useCallback(
    (newState: LocomotionState) => {
      if (state.locomotion === newState) return;

      if (config.enableLogging) {
        devLog(
          `🎬 setLocomotionState: ${state.locomotion} → ${newState} (${gender})`,
        );
      }

      let animationKey: string;

      switch (newState) {
        case "idle":
          animationKey = state.currentIdle;
          break;
        case "walking":
          animationKey = STATE_TO_ANIMATION_MAP.walking;
          break;
        case "jogging":
          animationKey = STATE_TO_ANIMATION_MAP.jogging;
          break;
        case "running":
          animationKey = STATE_TO_ANIMATION_MAP.running;
          break;
        case "crouching":
          animationKey = STATE_TO_ANIMATION_MAP.crouching;
          break;
        case "jumping":
          animationKey = STATE_TO_ANIMATION_MAP.jumping;
          break;
        case "falling":
          animationKey = STATE_TO_ANIMATION_MAP.falling;
          break;
        default:
          animationKey = SemanticKeys.LOCOMOTION_IDLE_PRIMARY;
      }

      if (config.enableLogging) {
        devLog(`🎭 Playing animation: ${animationKey} for ${gender} avatar`);
      }

      void playAnimation(animationKey, { layer: "locomotion" });
      setState((prev) => ({ ...prev, locomotion: newState }));
    },
    [
      state.locomotion,
      state.currentIdle,
      playAnimation,
      config.enableLogging,
      gender,
    ],
  );

  /**
   * Set velocity and auto-transition locomotion state
   */
  const setVelocity = useCallback(
    (velocity: Vector3) => {
      const speed = velocity.length();
      const newState = state;

      // Speed-based state transitions with hysteresis
      let targetState: LocomotionState = "idle";

      if (state.isCrouching) {
        targetState = speed > 0.1 ? "crouching" : "idle";
      } else if (speed < 0.5) {
        targetState = "idle";
      } else if (speed < 2.0) {
        targetState = "walking";
      } else if (speed < 4.0) {
        targetState = "jogging";
      } else {
        targetState = "running";
      }

      setState((prev) => ({ ...prev, velocity: velocity.clone(), speed }));

      if (targetState !== state.locomotion) {
        setLocomotionState(targetState);
      }
    },
    [state.isCrouching, state.locomotion, setLocomotionState],
  );

  /**
   * Set expression state
   */
  const setExpressionState = useCallback(
    (newExpression: ExpressionState) => {
      if (state.expression === newExpression) return;

      let animationKey: string;

      switch (newExpression) {
        case "talking":
          animationKey = state.currentTalk;
          break;
        case "happy":
          animationKey = SemanticKeys.EXPRESSION_FACE_HAPPY;
          break;
        case "surprised":
          animationKey = SemanticKeys.EXPRESSION_FACE_SURPRISED;
          break;
        case "thinking":
          animationKey = SemanticKeys.EXPRESSION_FACE_THINKING;
          break;
        case "confused":
          animationKey = SemanticKeys.EXPRESSION_FACE_CONFUSED;
          break;
        case "excited":
          animationKey = SemanticKeys.EXPRESSION_FACE_EXCITED;
          break;
        default:
          animationKey = SemanticKeys.EXPRESSION_FACE_NEUTRAL;
      }

      void playAnimation(animationKey, {
        layer: "expression",
        crossFade: DEFAULT_TIMINGS.EXPRESSION_CROSSFADE,
        weight: 0.8,
      });

      setState((prev) => ({ ...prev, expression: newExpression }));
    },
    [state.expression, state.currentTalk, playAnimation],
  );

  /**
   * Trigger emote
   */
  const setEmoteState = useCallback(
    async (emote: EmoteState): Promise<void> => {
      if (emote === "none") {
        stopEmote();
        return;
      }

      let animationKey: string;

      switch (emote) {
        case "dance-casual":
          animationKey = SemanticKeys.EMOTE_DANCE_CASUAL_1;
          break;
        case "dance-energetic":
          animationKey = SemanticKeys.EMOTE_DANCE_ENERGETIC_1;
          break;
        case "dance-rhythmic":
          animationKey = SemanticKeys.EMOTE_DANCE_RHYTHMIC_1;
          break;
        case "dance-freestyle":
          animationKey = SemanticKeys.EMOTE_DANCE_FREESTYLE_1;
          break;
        default:
          return;
      }

      await playAnimation(animationKey, {
        layer: "emote",
        crossFade: DEFAULT_TIMINGS.EMOTE_FADE_IN,
        weight: 1.0,
      });

      setState((prev) => ({ ...prev, emote }));
    },
    [playAnimation],
  );

  /**
   * Start talking
   */
  const startTalking = useCallback(
    (intensity = 0.5) => {
      if (state.isTalking) return;

      if (config.enableLogging) {
        devLog(
          `🗣️ Starting talking for ${gender} avatar (intensity: ${intensity})`,
        );
      }

      // Select talking variant based on intensity
      const variants = getTalkingVariants(config.customRegistry);

      if (variants.length === 0) {
        devWarn(`❌ No talking variants found for ${gender} avatar`);
        return;
      }

      const variantIndex = Math.min(
        Math.floor(intensity * variants.length),
        variants.length - 1,
      );
      const talkingKey =
        variants[variantIndex] || SemanticKeys.EXPRESSION_TALK_VARIANT_1;

      if (config.enableLogging) {
        devLog(
          `🎭 Selected talking animation: ${talkingKey} (variant ${variantIndex + 1}/${variants.length})`,
        );
      }

      void playAnimation(talkingKey, {
        layer: "expression",
        weight: 0.9,
        crossFade: DEFAULT_TIMINGS.EXPRESSION_CROSSFADE,
      });

      setState((prev) => ({
        ...prev,
        isTalking: true,
        currentTalk: talkingKey,
      }));
    },
    [
      state.isTalking,
      config.customRegistry,
      playAnimation,
      config.enableLogging,
      gender,
    ],
  );

  /**
   * Stop talking
   */
  const stopTalking = useCallback(() => {
    if (!state.isTalking) return;

    setExpressionState("neutral");
    setState((prev) => ({ ...prev, isTalking: false }));
  }, [state.isTalking, setExpressionState]);

  /**
   * Stop emote
   */
  const stopEmote = useCallback(() => {
    const emoteLayer = layersRef.current.get("emote");
    if (emoteLayer?.action) {
      emoteLayer.action.fadeOut(DEFAULT_TIMINGS.EMOTE_FADE_OUT);
      emoteLayer.action = null;
    }

    setState((prev) => ({ ...prev, emote: "none" }));
  }, []);

  /**
   * Trigger idle variation
   */
  const triggerIdleVariation = useCallback(() => {
    if (state.locomotion !== "idle") return;

    const idleVariants = getIdleVariants(config.customRegistry);
    const currentIndex = idleVariants.indexOf(state.currentIdle);

    // Pick a different idle variant
    const availableVariants = idleVariants.filter(
      (_, index) => index !== currentIndex,
    );
    const randomVariant =
      availableVariants[Math.floor(Math.random() * availableVariants.length)];

    if (randomVariant) {
      void playAnimation(randomVariant, {
        layer: "locomotion",
        crossFade: DEFAULT_TIMINGS.IDLE_CROSSFADE,
      });

      setState((prev) => ({
        ...prev,
        currentIdle: randomVariant,
        lastIdleChange: Date.now(),
        nextIdleCycle:
          Date.now() +
          randomBetween(
            config.idleCycleInterval[0],
            config.idleCycleInterval[1],
          ),
      }));

      if (config.enableLogging) {
        devLog(`🎭 Switched to idle variant: ${randomVariant}`);
      }
    }
  }, [
    state.locomotion,
    state.currentIdle,
    config.idleCycleInterval,
    playAnimation,
    config.enableLogging,
  ]);

  /**
   * Start scheduler timers
   */
  const startSchedulers = useCallback(() => {
    if (config.enableIdleCycling) {
      const scheduleNextIdle = () => {
        const delay = randomBetween(
          config.idleCycleInterval[0],
          config.idleCycleInterval[1],
        );
        schedulerRef.current.idleTimer = setTimeout(() => {
          if (Math.random() < performanceSettings.idleVariationChance) {
            triggerIdleVariation();
          }
          scheduleNextIdle();
        }, delay);
      };
      scheduleNextIdle();
    }

    if (config.enableMicroExpressions) {
      const scheduleNextExpression = () => {
        const delay = randomBetween(
          config.expressionInterval[0],
          config.expressionInterval[1],
        );
        schedulerRef.current.expressionTimer = setTimeout(() => {
          if (
            !state.isTalking &&
            state.emote === "none" &&
            Math.random() < 0.3
          ) {
            const expressions: ExpressionState[] = [
              "happy",
              "thinking",
              "surprised",
            ];
            const randomExpression =
              expressions[Math.floor(Math.random() * expressions.length)];
            setExpressionState(randomExpression);

            // Return to neutral after a while
            setTimeout(
              () => {
                if (!state.isTalking) {
                  setExpressionState("neutral");
                }
              },
              randomBetween(2000, 5000),
            );
          }
          scheduleNextExpression();
        }, delay);
      };
      scheduleNextExpression();
    }
  }, [
    config.enableIdleCycling,
    config.enableMicroExpressions,
    config.idleCycleInterval,
    config.expressionInterval,
    triggerIdleVariation,
    state.isTalking,
    state.emote,
    setExpressionState,
    performanceSettings.idleVariationChance,
  ]);

  // Start scheduling timers
  useEffect(() => {
    if (config.enableIdleCycling && state.isReady) {
      startSchedulers();
    }

    return () => {
      stopSchedulers();
    };
  }, [
    config.enableIdleCycling,
    state.isReady,
    startSchedulers,
    stopSchedulers,
  ]);

  /**
   * Update mixer in animation loop
   */
  useFrame((_, delta) => {
    if (mixerRef.current && state.isReady) {
      mixerRef.current.update(delta);
    }
  });

  /**
   * Dispose resources
   */
  const dispose = useCallback(() => {
    stopSchedulers();

    if (mixerRef.current) {
      mixerRef.current.stopAllAction();
      mixerRef.current = null;
    }

    currentActionsRef.current.clear();
    layersRef.current.clear();

    if (config.enableLogging) {
      devLog("🗑️ Avatar animator disposed");
    }
  }, [stopSchedulers, config.enableLogging]);

  /**
   * Get debug information
   */
  const getDebugInfo = useCallback(() => {
    const cacheStats = animationLoader.getCacheStats();

    return {
      state,
      gender,
      avatarId,
      modelUrl,
      mixer: !!mixerRef.current,
      activeActions: currentActionsRef.current.size,
      activeLayers: Array.from(layersRef.current.entries()).map(
        ([name, layer]) => ({
          name,
          weight: layer.weight,
          hasAction: !!layer.action,
          enabled: layer.enabled,
        }),
      ),
      cache: cacheStats,
      performance: config.performanceMode,
    };
  }, [
    state,
    gender,
    avatarId,
    modelUrl,
    animationLoader,
    config.performanceMode,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      dispose();
    };
  }, [dispose]);

  return {
    // Core animation control
    playAnimation,
    stopAnimation,

    // State control
    setLocomotionState,
    setExpressionState,
    setEmoteState,

    // Locomotion control
    setVelocity,
    setCrouch: useCallback((crouching: boolean) => {
      setState((prev) => ({ ...prev, isCrouching: crouching }));
    }, []),

    // Expression control
    startTalking,
    stopTalking,
    triggerExpression: setExpressionState,

    // Emote control
    triggerEmote: setEmoteState,
    stopEmote,

    // Idle control
    triggerIdleVariation,

    // System control
    preloadAnimations,
    dispose,

    // State access
    state,

    // Debug
    getDebugInfo,
  };
}

/**
 * Utility function for random range
 */
function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export default useAvatarAnimator;
