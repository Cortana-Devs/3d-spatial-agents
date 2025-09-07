"use client";

import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useThree } from "@react-three/fiber";
import { AnimationMixer, AnimationAction, Clock, Object3D } from "three";
import {
  useAnimationRender,
  useBatchedUpdates,
} from "../../hooks/performance/useIsolatedRender";
import { useWorldStore } from "../../store/worldStore";
import type { AISimulant } from "../../types";

interface AnimationState {
  mixer: AnimationMixer | null;
  actions: Map<string, AnimationAction>;
  currentAnimation: string | null;
  isPlaying: boolean;
  timeScale: number;
  blendDuration: number;
}

interface AnimationMetrics {
  activeMixers: number;
  totalActions: number;
  averageFrameTime: number;
  blendTransitions: number;
  memoryUsage: number;
}

interface ManagedAnimation {
  id: string;
  mixer: AnimationMixer;
  actions: Map<string, AnimationAction>;
  currentAction: AnimationAction | null;
  targetWeight: number;
  currentWeight: number;
  lastUpdate: number;
  priority: number;
}

/**
 * Isolated Animation Manager
 * Prevents interference with block placement and other modules
 * Uses dedicated render loop and performance budgeting
 */
export function IsolatedAnimationManager() {
  const { scene } = useThree();
  const { simulants } = useWorldStore();

  // Animation state management
  const [animations] = useState<Map<string, ManagedAnimation>>(new Map());
  const [metrics, setMetrics] = useState<AnimationMetrics>({
    activeMixers: 0,
    totalActions: 0,
    averageFrameTime: 0,
    blendTransitions: 0,
    memoryUsage: 0,
  });

  // Performance refs
  const clockRef = useRef(new Clock());
  const frameTimesRef = useRef<number[]>([]);
  const lastUpdateRef = useRef(0);
  const maxAnimationsPerFrame = useRef(5); // Budget: max 5 animations per frame

  // Batched updates for performance
  const { queueUpdate, deferHeavyOperation, canExecuteHeavy } =
    useBatchedUpdates("animation");

  // Isolated render loop for animations
  const renderMetrics = useAnimationRender((deltaTime) => {
    const startTime = performance.now();

    // Get delta from Three.js clock for consistency
    const clockDelta = clockRef.current.getDelta();

    // Process animations in priority order with budget limits
    updateAnimationsWithBudget(clockDelta);

    const endTime = performance.now();
    const frameTime = endTime - startTime;

    // Track performance
    frameTimesRef.current.push(frameTime);
    if (frameTimesRef.current.length > 60) {
      frameTimesRef.current.shift();
    }

    // Update metrics every second
    if (endTime - lastUpdateRef.current > 1000) {
      updateMetrics(frameTime);
      lastUpdateRef.current = endTime;
    }
  });

  // Budget-aware animation updates
  const updateAnimationsWithBudget = useCallback(
    (deltaTime: number) => {
      const animationList = Array.from(animations.values())
        .filter((anim) => anim.mixer && anim.currentAction)
        .sort((a, b) => b.priority - a.priority); // Higher priority first

      const budget = maxAnimationsPerFrame.current;
      let processed = 0;

      for (const animation of animationList) {
        if (processed >= budget) break;

        try {
          // Update mixer
          animation.mixer.update(deltaTime);

          // Handle weight blending
          updateAnimationBlending(animation, deltaTime);

          animation.lastUpdate = performance.now();
          processed++;
        } catch (error) {
          console.error(`Animation update error for ${animation.id}:`, error);
        }
      }

      // If we couldn't process all animations, defer the rest
      if (processed < animationList.length && canExecuteHeavy()) {
        const remaining = animationList.slice(processed);
        deferHeavyOperation(() => {
          remaining.forEach((animation) => {
            if (animation.mixer) {
              animation.mixer.update(deltaTime * 0.5); // Reduced delta for deferred updates
            }
          });
        });
      }
    },
    [animations, canExecuteHeavy, deferHeavyOperation],
  );

  // Smooth weight blending between animations
  const updateAnimationBlending = useCallback(
    (animation: ManagedAnimation, deltaTime: number) => {
      const blendSpeed = 3.0; // Blend speed
      const weightDiff = animation.targetWeight - animation.currentWeight;

      if (Math.abs(weightDiff) > 0.01) {
        animation.currentWeight += weightDiff * blendSpeed * deltaTime;
        animation.currentWeight = Math.max(
          0,
          Math.min(1, animation.currentWeight),
        );

        if (animation.currentAction) {
          animation.currentAction.weight = animation.currentWeight;
          animation.currentAction.enabled = animation.currentWeight > 0.01;
        }
      }
    },
    [],
  );

  // Register animation for a simulant
  const registerAnimation = useCallback(
    (
      simulantId: string,
      object: Object3D,
      animationClips: any[],
      priority: number = 5,
    ) => {
      if (animations.has(simulantId)) {
        console.warn(
          `Animation already registered for simulant: ${simulantId}`,
        );
        return;
      }

      const mixer = new AnimationMixer(object);
      const actions = new Map<string, AnimationAction>();

      // Create actions for all clips
      animationClips.forEach((clip, index) => {
        const action = mixer.clipAction(clip);
        action.weight = 0;
        action.enabled = false;
        actions.set(clip.name || `animation_${index}`, action);
      });

      const managedAnimation: ManagedAnimation = {
        id: simulantId,
        mixer,
        actions,
        currentAction: null,
        targetWeight: 0,
        currentWeight: 0,
        lastUpdate: performance.now(),
        priority,
      };

      animations.set(simulantId, managedAnimation);

      queueUpdate(() => {
        setMetrics((prev) => ({
          ...prev,
          activeMixers: animations.size,
          totalActions: Array.from(animations.values()).reduce(
            (sum, anim) => sum + anim.actions.size,
            0,
          ),
        }));
      });

      if (process.env.NODE_ENV === "development") {
        console.log(`🎭 Animation registered for simulant: ${simulantId}`);
      }
    },
    [animations, queueUpdate],
  );

  // Play animation with smooth transition
  const playAnimation = useCallback(
    (
      simulantId: string,
      animationName: string,
      loop: boolean = true,
      fadeTime: number = 0.3,
    ) => {
      const animation = animations.get(simulantId);
      if (!animation) {
        console.warn(`No animation found for simulant: ${simulantId}`);
        return;
      }

      const newAction = animation.actions.get(animationName);
      if (!newAction) {
        console.warn(
          `Animation ${animationName} not found for simulant: ${simulantId}`,
        );
        return;
      }

      // Fade out current animation
      if (animation.currentAction && animation.currentAction !== newAction) {
        animation.targetWeight = 0; // This will be blended in updateAnimationBlending

        // Small delay before starting new animation
        setTimeout(
          () => {
            if (animation.currentAction) {
              animation.currentAction.stop();
            }

            // Start new animation
            newAction.reset();
            newAction.setLoop(loop ? 2201 : 2200, Infinity); // LoopRepeat : LoopOnce
            newAction.play();
            newAction.weight = 0;

            animation.currentAction = newAction;
            animation.targetWeight = 1;
            animation.currentWeight = 0;

            queueUpdate(() => {
              setMetrics((prev) => ({
                ...prev,
                blendTransitions: prev.blendTransitions + 1,
              }));
            });
          },
          (fadeTime * 1000) / 2,
        ); // Half the fade time
      } else {
        // First animation or same animation
        newAction.reset();
        newAction.setLoop(loop ? 2201 : 2200, Infinity);
        newAction.play();

        animation.currentAction = newAction;
        animation.targetWeight = 1;
        animation.currentWeight = 0;
      }

      if (process.env.NODE_ENV === "development") {
        console.log(`🎬 Playing animation: ${animationName} for ${simulantId}`);
      }
    },
    [animations, queueUpdate],
  );

  // Stop animation
  const stopAnimation = useCallback(
    (simulantId: string, fadeTime: number = 0.3) => {
      const animation = animations.get(simulantId);
      if (!animation || !animation.currentAction) return;

      animation.targetWeight = 0;

      setTimeout(() => {
        if (animation.currentAction) {
          animation.currentAction.stop();
          animation.currentAction = null;
        }
      }, fadeTime * 1000);

      if (process.env.NODE_ENV === "development") {
        console.log(`⏹️ Stopping animation for ${simulantId}`);
      }
    },
    [animations],
  );

  // Unregister animation
  const unregisterAnimation = useCallback(
    (simulantId: string) => {
      const animation = animations.get(simulantId);
      if (!animation) return;

      // Stop all actions
      animation.actions.forEach((action) => action.stop());

      // Dispose mixer
      animation.mixer.uncacheRoot(animation.mixer.getRoot());

      animations.delete(simulantId);

      queueUpdate(() => {
        setMetrics((prev) => ({
          ...prev,
          activeMixers: animations.size,
          totalActions: Array.from(animations.values()).reduce(
            (sum, anim) => sum + anim.actions.size,
            0,
          ),
        }));
      });

      if (process.env.NODE_ENV === "development") {
        console.log(`🗑️ Animation unregistered for simulant: ${simulantId}`);
      }
    },
    [animations, queueUpdate],
  );

  // Update performance metrics
  const updateMetrics = useCallback(
    (currentFrameTime: number) => {
      const averageFrameTime =
        frameTimesRef.current.reduce((sum, time) => sum + time, 0) /
        frameTimesRef.current.length;

      // Estimate memory usage (simplified)
      const estimatedMemory = animations.size * 10; // ~10MB per animation mixer

      setMetrics((prev) => ({
        ...prev,
        averageFrameTime,
        memoryUsage: estimatedMemory,
      }));

      // Dynamic performance adjustment
      if (averageFrameTime > 5.0 && maxAnimationsPerFrame.current > 2) {
        maxAnimationsPerFrame.current -= 1;
        console.warn(
          `🐌 Reducing animation budget to ${maxAnimationsPerFrame.current} per frame`,
        );
      } else if (averageFrameTime < 2.0 && maxAnimationsPerFrame.current < 10) {
        maxAnimationsPerFrame.current += 1;
        if (process.env.NODE_ENV === "development") {
          console.log(
            `⚡ Increasing animation budget to ${maxAnimationsPerFrame.current} per frame`,
          );
        }
      }
    },
    [animations],
  );

  // Auto-manage simulant animations
  useEffect(() => {
    const simulantArray = Array.from(simulants.values());

    simulantArray.forEach((simulant) => {
      // This would be connected to actual simulant objects and animations
      // For now, just demonstrate the concept
      if (!animations.has(simulant.id)) {
        if (process.env.NODE_ENV === "development") {
          console.log(
            `Would register animation for simulant: ${simulant.name}`,
          );
        }
      }
    });

    // Cleanup removed simulants
    animations.forEach((animation, id) => {
      if (!simulants.has(id)) {
        unregisterAnimation(id);
      }
    });
  }, [simulants, animations, unregisterAnimation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      animations.forEach((animation, id) => {
        unregisterAnimation(id);
      });
      animations.clear();
    };
  }, [animations, unregisterAnimation]);

  // Memoized API for external components
  const animationAPI = useMemo(
    () => ({
      registerAnimation,
      playAnimation,
      stopAnimation,
      unregisterAnimation,
      getMetrics: () => metrics,
      getRenderMetrics: () => renderMetrics,
    }),
    [
      registerAnimation,
      playAnimation,
      stopAnimation,
      unregisterAnimation,
      metrics,
      renderMetrics,
    ],
  );

  // Development debug display
  const debugDisplay = useMemo(() => {
    if (process.env.NODE_ENV !== "development") return null;

    return (
      <div className="absolute top-4 left-4 bg-black/80 text-white p-2 rounded text-xs">
        <div>Animation Module</div>
        <div>Active Mixers: {metrics.activeMixers}</div>
        <div>Total Actions: {metrics.totalActions}</div>
        <div>Frame Time: {renderMetrics.frameTime.toFixed(2)}ms</div>
        <div>FPS: {renderMetrics.fps}</div>
        <div>Throttled: {renderMetrics.isThrottled ? "Yes" : "No"}</div>
        <div>Budget: {maxAnimationsPerFrame.current}/frame</div>
        <div>Transitions: {metrics.blendTransitions}</div>
        <div>Memory: ~{metrics.memoryUsage}MB</div>
      </div>
    );
  }, [metrics, renderMetrics]);

  // Export API through context or ref
  useEffect(() => {
    // Store API reference globally or in context for other components to use
    if (typeof window !== "undefined") {
      (window as any).__animationAPI = animationAPI;
    }
  }, [animationAPI]);

  return <>{debugDisplay}</>;
}

export default IsolatedAnimationManager;
