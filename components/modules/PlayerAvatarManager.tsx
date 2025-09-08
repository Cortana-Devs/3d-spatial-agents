"use client";

import React, {
  useRef,
  useCallback,
  useState,
  useEffect,
  useMemo,
} from "react";
import { useThree, useFrame } from "@react-three/fiber";
import {
  Vector3,
  Euler,
  AnimationMixer,
  AnimationAction,
  Object3D,
  Clock,
} from "three";
import { useModuleSystem } from "./ModuleManager";
import { useWorldStore } from "../../store/worldStore";
import { usePlayerAvatarLoader } from "../animations/PlayerAvatarLoader";
import { devLog, devWarn, devError } from "@/utils/devLogger";
import {
  PlayerAvatarState,
  PlayerAvatarManager as IPlayerAvatarManager,
  MovementAnimationState,
  MovementState,
  AvatarPerformanceMetrics,
  AnimationTransition,
  AvatarEvent,
  AvatarEventHandler,
} from "../../types/playerAvatar";

interface PlayerAvatarManagerProps {
  modelUrl?: string;
  enableAnimations?: boolean;
  performanceMode?: "high" | "medium" | "low";
  hideInFirstPerson?: boolean;
  onAvatarLoaded?: (avatar: PlayerAvatarState) => void;
  onAnimationChanged?: (animation: string) => void;
  onError?: (error: Error) => void;
}

interface ManagedAnimation {
  action: AnimationAction;
  weight: number;
  targetWeight: number;
  fadeSpeed: number;
  isActive: boolean;
}

/**
 * PlayerAvatarManager - Core avatar system that manages player character state,
 * animations, and integration with the PlayerControlModule
 */
export function PlayerAvatarManager({
  modelUrl = "/models/default-avatar.glb",
  enableAnimations = true,
  performanceMode = "high",
  hideInFirstPerson = true,
  onAvatarLoaded,
  onAnimationChanged,
  onError,
}: PlayerAvatarManagerProps) {
  const { scene, camera } = useThree();
  const {
    playerAvatar,
    setPlayerAvatar,
    updateAvatarState,
    clearPlayerAvatar,
    activeCamera,
  } = useWorldStore();

  // Avatar loader hook
  const { loadAvatar, isLoading, getMemoryUsage, clearCache } =
    usePlayerAvatarLoader({
      onAvatarLoaded,
      onError,
      performanceMode,
    });

  // State management
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentMovementState, setCurrentMovementState] =
    useState<MovementAnimationState>("idle");
  const [animations, setAnimations] = useState<Map<string, ManagedAnimation>>(
    new Map(),
  );
  const [eventHandlers] = useState<Set<AvatarEventHandler>>(new Set());

  // Performance refs
  const clockRef = useRef(new Clock());
  const lastPositionRef = useRef(new Vector3());
  const velocityRef = useRef(new Vector3());
  const frameTimesRef = useRef<number[]>([]);
  const avatarObjectRef = useRef<Object3D>();
  const transitionRef = useRef<AnimationTransition | null>(null);

  // Register with module system for performance isolation
  const { requestFrame, setEnabled, getStats } = useModuleSystem({
    id: "player-avatar",
    priority: 8, // High priority, just below controls
    maxFrameTime: 6, // 6ms max per frame
    targetFPS: 60,
    canSkipFrames: true, // Can skip frames under pressure
  });

  // Core avatar management implementation
  const avatarManagerAPI: IPlayerAvatarManager = useMemo(
    () => ({
      async loadAvatar(modelUrl: string): Promise<PlayerAvatarState> {
        try {
          const avatarState = await loadAvatar(modelUrl);
          if (avatarState) {
            // Add to scene
            if (avatarState.animationMixer) {
              const root = avatarState.animationMixer.getRoot();
              if (root && !scene.children.includes(root)) {
                scene.add(root);
                avatarObjectRef.current = root;
              }
            }

            // Setup initial animations
            if (enableAnimations) {
              await this.setupAnimations(avatarState);
            }

            // Update store
            setPlayerAvatar(avatarState);
            setIsInitialized(true);

            // Fire event
            this.fireEvent({ type: "loaded", timestamp: performance.now() });

            devLog("🎮 Player avatar loaded successfully");
            return avatarState;
          }
          throw new Error("Failed to load avatar state");
        } catch (error) {
          devError("Failed to load avatar:", error);
          onError?.(error as Error);
          throw error;
        }
      },

      unloadAvatar(): void {
        if (playerAvatar && avatarObjectRef.current) {
          // Remove from scene
          scene.remove(avatarObjectRef.current);

          // Stop all animations
          if (playerAvatar.animationMixer) {
            playerAvatar.currentAnimations.forEach((action) => action.stop());
            playerAvatar.animationMixer.uncacheRoot(avatarObjectRef.current);
          }

          // Clear state
          clearPlayerAvatar();
          setAnimations(new Map());
          setIsInitialized(false);
          avatarObjectRef.current = undefined;

          // Fire event
          this.fireEvent({ type: "unloaded", timestamp: performance.now() });

          devLog("🗑️ Player avatar unloaded");
        }
      },

      updateAvatarTransform(position: Vector3, rotation: Euler): void {
        if (playerAvatar && avatarObjectRef.current) {
          // Update object transform
          avatarObjectRef.current.position.copy(position);
          avatarObjectRef.current.rotation.copy(rotation);

          // Update state
          updateAvatarState({
            position: position.clone(),
            rotation: rotation.clone(),
            lastUpdateTime: performance.now(),
          });

          // Calculate velocity for animation
          const deltaTime = clockRef.current.getDelta();
          if (deltaTime > 0) {
            velocityRef.current
              .copy(position)
              .sub(lastPositionRef.current)
              .divideScalar(deltaTime);
            lastPositionRef.current.copy(position);

            // Update movement animations based on velocity
            if (enableAnimations) {
              this.updateMovementAnimations();
            }
          }
        }
      },

      playAnimation(name: string, loop: boolean = true): void {
        if (!playerAvatar || !enableAnimations) return;

        const action = playerAvatar.currentAnimations.get(name);
        if (!action) {
          devWarn(`Animation '${name}' not found`);
          return;
        }

        // Stop current animation
        const currentAnim = animations.get(playerAvatar.currentAnimation);
        if (currentAnim && currentAnim.action !== action) {
          currentAnim.targetWeight = 0;
          currentAnim.fadeSpeed = 2.0;
        }

        // Start new animation
        action.reset();
        action.setLoop(loop ? 2201 : 2200, Infinity); // LoopRepeat : LoopOnce
        action.play();

        const managedAnim: ManagedAnimation = {
          action,
          weight: 0,
          targetWeight: 1,
          fadeSpeed: 2.0,
          isActive: true,
        };

        animations.set(name, managedAnim);
        setAnimations(new Map(animations));

        updateAvatarState({
          currentAnimation: name,
          lastUpdateTime: performance.now(),
        });

        onAnimationChanged?.(name);

        // Fire event
        this.fireEvent({
          type: "animation-changed",
          timestamp: performance.now(),
          data: { animation: name, loop },
        });
      },

      transitionToAnimation(name: string, duration: number = 0.3): void {
        if (!playerAvatar || !enableAnimations) return;

        const fromAction = animations.get(
          playerAvatar.currentAnimation,
        )?.action;
        const toAction = playerAvatar.currentAnimations.get(name);

        if (!toAction) {
          devWarn(`Target animation '${name}' not found`);
          return;
        }

        // Setup transition
        transitionRef.current = {
          from: playerAvatar.currentAnimation,
          to: name,
          duration,
          startTime: performance.now(),
          easing: "easeInOut",
        };

        // Start target animation
        toAction.reset();
        toAction.play();
        toAction.weight = 0;

        const managedAnim: ManagedAnimation = {
          action: toAction,
          weight: 0,
          targetWeight: 1,
          fadeSpeed: 1 / duration,
          isActive: true,
        };

        animations.set(name, managedAnim);

        // Set source animation to fade out
        if (fromAction && animations.has(playerAvatar.currentAnimation)) {
          const fromManaged = animations.get(playerAvatar.currentAnimation)!;
          fromManaged.targetWeight = 0;
          fromManaged.fadeSpeed = 1 / duration;
        }

        setAnimations(new Map(animations));
      },

      blendAnimations(
        primary: string,
        secondary: string,
        weight: number,
      ): void {
        if (!playerAvatar || !enableAnimations) return;

        const primaryAction = playerAvatar.currentAnimations.get(primary);
        const secondaryAction = playerAvatar.currentAnimations.get(secondary);

        if (!primaryAction || !secondaryAction) {
          devWarn("One or both blend animations not found");
          return;
        }

        // Update weights
        const primaryManaged = animations.get(primary);
        const secondaryManaged = animations.get(secondary);

        if (primaryManaged) {
          primaryManaged.targetWeight = 1 - weight;
          primaryManaged.fadeSpeed = 3.0;
        }

        if (secondaryManaged) {
          secondaryManaged.targetWeight = weight;
          secondaryManaged.fadeSpeed = 3.0;
        } else {
          // Create new managed animation for secondary
          secondaryAction.reset();
          secondaryAction.play();
          secondaryAction.weight = 0;

          const managed: ManagedAnimation = {
            action: secondaryAction,
            weight: 0,
            targetWeight: weight,
            fadeSpeed: 3.0,
            isActive: true,
          };

          animations.set(secondary, managed);
        }

        setAnimations(new Map(animations));
      },

      setVisible(visible: boolean): void {
        if (avatarObjectRef.current) {
          avatarObjectRef.current.visible = visible;

          updateAvatarState({
            isVisible: visible,
            lastUpdateTime: performance.now(),
          });
        }
      },

      setLOD(level: "high" | "medium" | "low"): void {
        if (!avatarObjectRef.current) return;

        // Update LOD on all meshes
        avatarObjectRef.current.traverse((child) => {
          if (child.userData.lodGeometry) {
            const geometry = child.userData.lodGeometry[level];
            if (geometry && child.geometry !== geometry) {
              child.geometry = geometry;
            }
          }
        });

        updateAvatarState({
          renderLOD: level,
          lastUpdateTime: performance.now(),
        });

        // Fire event
        this.fireEvent({
          type: "lod-changed",
          timestamp: performance.now(),
          data: { level },
        });
      },

      getAvatarState(): PlayerAvatarState {
        return playerAvatar!;
      },

      saveAvatarState(): void {
        if (playerAvatar) {
          localStorage.setItem(
            "player-avatar-state",
            JSON.stringify({
              modelUrl: playerAvatar.modelUrl,
              characterId: playerAvatar.characterId,
              currentAnimation: playerAvatar.currentAnimation,
              renderLOD: playerAvatar.renderLOD,
              isVisible: playerAvatar.isVisible,
            }),
          );
        }
      },

      restoreAvatarState(state: PlayerAvatarState): void {
        setPlayerAvatar(state);
      },

      getPerformanceMetrics(): AvatarPerformanceMetrics {
        const stats = getStats();
        const avgFrameTime =
          frameTimesRef.current.reduce((sum, time) => sum + time, 0) /
          Math.max(frameTimesRef.current.length, 1);

        return {
          averageFPS: stats?.averageFPS || 0,
          frameTimeP99: Math.max(...frameTimesRef.current.slice(-30)),
          renderTime: avgFrameTime,
          memoryUsage: getMemoryUsage(),
          textureMemory: 0, // Would need WebGL context to calculate
          geometryMemory: 0,
          animationUpdateTime: avgFrameTime * 0.3, // Estimate
          blendCalculationTime: avgFrameTime * 0.1,
          activeAnimations: animations.size,
          moduleUpdateTime: stats?.frameTime || 0,
          stateSyncTime: 0.5, // Estimate
          networkBandwidth: 0, // No network sync yet
        };
      },

      optimizeForPerformance(): void {
        const metrics = this.getPerformanceMetrics();

        // Auto-adjust LOD based on performance
        if (metrics.averageFPS < 45) {
          this.setLOD("medium");
        } else if (metrics.averageFPS < 30) {
          this.setLOD("low");
        }

        // Reduce animation update rate if struggling
        if (metrics.frameTimeP99 > 16) {
          updateAvatarState({ frameSkipCount: 2 });
        }

        // Clean up unused animations
        this.cleanupAnimations();
      },

      // Private helper methods
      async setupAnimations(avatarState: PlayerAvatarState): Promise<void> {
        if (!avatarState.animationMixer) return;

        // Setup default animations
        const defaultAnimations = ["idle", "walk", "run", "jump"];
        const newAnimations = new Map<string, ManagedAnimation>();

        avatarState.currentAnimations.forEach((action, name) => {
          if (defaultAnimations.includes(name.toLowerCase())) {
            action.weight = name === "idle" ? 1 : 0;
            action.enabled = true;

            const managed: ManagedAnimation = {
              action,
              weight: action.weight,
              targetWeight: action.weight,
              fadeSpeed: 2.0,
              isActive: name === "idle",
            };

            newAnimations.set(name, managed);

            if (name === "idle") {
              action.play();
            }
          }
        });

        setAnimations(newAnimations);
        setCurrentMovementState("idle");
      },

      updateMovementAnimations(): void {
        const speed = velocityRef.current.length();
        let targetState: MovementAnimationState = "idle";

        if (speed > 0.1) {
          if (speed > 4.0) {
            targetState = "running";
          } else {
            targetState = "walking";
          }
        }

        if (targetState !== currentMovementState) {
          this.transitionToAnimation(targetState, 0.2);
          setCurrentMovementState(targetState);
        }
      },

      cleanupAnimations(): void {
        animations.forEach((managed, name) => {
          if (!managed.isActive && managed.weight < 0.01) {
            managed.action.stop();
            animations.delete(name);
          }
        });
        setAnimations(new Map(animations));
      },

      fireEvent(event: AvatarEvent): void {
        eventHandlers.forEach((handler) => {
          try {
            handler(event);
          } catch (error) {
            devError("Avatar event handler error:", error);
          }
        });
      },
    }),
    [
      playerAvatar,
      animations,
      scene,
      camera,
      isLoading,
      enableAnimations,
      onAnimationChanged,
      onError,
    ],
  );

  // Avatar update loop
  const avatarUpdateLoop = useCallback(
    (deltaTime: number) => {
      if (!playerAvatar || !isInitialized) return;

      const startTime = performance.now();

      // Update animation mixer
      if (playerAvatar.animationMixer && enableAnimations) {
        playerAvatar.animationMixer.update(deltaTime);

        // Update animation blending
        animations.forEach((managed, name) => {
          const weightDiff = managed.targetWeight - managed.weight;
          if (Math.abs(weightDiff) > 0.01) {
            managed.weight += weightDiff * managed.fadeSpeed * deltaTime;
            managed.weight = Math.max(0, Math.min(1, managed.weight));
            managed.action.weight = managed.weight;

            if (managed.weight < 0.01) {
              managed.isActive = false;
              managed.action.enabled = false;
            } else {
              managed.action.enabled = true;
            }
          }
        });

        // Handle transitions
        if (transitionRef.current) {
          const transition = transitionRef.current;
          const elapsed = performance.now() - transition.startTime;
          const progress = Math.min(elapsed / (transition.duration * 1000), 1);

          if (progress >= 1) {
            transitionRef.current = null;
            updateAvatarState({
              currentAnimation: transition.to,
              transitionState: null,
            });
          } else {
            updateAvatarState({
              transitionState: transition,
            });
          }
        }
      }

      // Handle first-person visibility
      if (hideInFirstPerson && avatarObjectRef.current) {
        const shouldHide = activeCamera === "fly"; // Assuming fly mode is first-person
        if (avatarObjectRef.current.visible !== !shouldHide) {
          avatarObjectRef.current.visible = !shouldHide;
          updateAvatarState({ isVisible: !shouldHide });
        }
      }

      // Track performance
      const frameTime = performance.now() - startTime;
      frameTimesRef.current.push(frameTime);
      if (frameTimesRef.current.length > 60) {
        frameTimesRef.current.shift();
      }

      // Update state timestamp
      updateAvatarState({ lastUpdateTime: performance.now() });
    },
    [
      playerAvatar,
      isInitialized,
      animations,
      enableAnimations,
      hideInFirstPerson,
      activeCamera,
    ],
  );

  // Register update loop
  React.useEffect(() => {
    requestFrame(avatarUpdateLoop);
  }, [requestFrame, avatarUpdateLoop]);

  // Auto-load avatar on mount
  useEffect(() => {
    if (!isInitialized && !isLoading) {
      avatarManagerAPI.loadAvatar(modelUrl).catch(devError);
    }
  }, [isInitialized, isLoading, modelUrl, avatarManagerAPI]);

  // Enable/disable based on avatar state
  useEffect(() => {
    setEnabled(isInitialized && playerAvatar !== null);
  }, [setEnabled, isInitialized, playerAvatar]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isInitialized) {
        avatarManagerAPI.unloadAvatar();
      }
    };
  }, []);

  // Export API for other components
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__playerAvatarAPI = avatarManagerAPI;
    }
  }, [avatarManagerAPI]);

  // Development debug info
  const debugInfo = useMemo(() => {
    if (process.env.NODE_ENV !== "development") return null;

    const metrics = avatarManagerAPI.getPerformanceMetrics();

    return (
      <div className="absolute top-20 left-4 bg-black/80 text-white p-2 rounded text-xs">
        <div className="text-green-400 font-bold">Player Avatar</div>
        <div>Status: {isInitialized ? "Loaded" : "Loading"}</div>
        <div>Animation: {playerAvatar?.currentAnimation || "None"}</div>
        <div>LOD: {playerAvatar?.renderLOD || "N/A"}</div>
        <div>Memory: {Math.round(metrics.memoryUsage / 1024 / 1024)}MB</div>
        <div>FPS: {metrics.averageFPS.toFixed(0)}</div>
        <div>Frame: {metrics.renderTime.toFixed(2)}ms</div>
        <div>Animations: {metrics.activeAnimations}</div>
        <div>Visible: {playerAvatar?.isVisible ? "Yes" : "No"}</div>
      </div>
    );
  }, [isInitialized, playerAvatar, avatarManagerAPI]);

  return <group name="player-avatar-manager">{debugInfo}</group>;
}

export default PlayerAvatarManager;
