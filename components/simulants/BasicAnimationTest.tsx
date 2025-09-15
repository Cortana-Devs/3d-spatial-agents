"use client";

import React, { useRef, useEffect, useMemo } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import { Group } from "three";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import { devLog } from "@/utils/devLogger";
import { useActiveAvatarModel } from "@/src/hooks/useActiveAvatarModel";
import useAvatarAnimator from "@/hooks/useAvatarAnimator";

/**
 * Basic Animation Test Component
 * Simple test to verify GLB animation loading works
 */
export default function BasicAnimationTest() {
  const groupRef = useRef<Group>(null);

  // Use the active avatar model (gender-aware)
  const { modelUrl } = useActiveAvatarModel();
  const avatarGLTF = useGLTF(modelUrl);

  // Create a cloned scene to avoid conflicts
  const avatarScene = useMemo(() => {
    return SkeletonUtils.clone(avatarGLTF.scene) as Group;
  }, [avatarGLTF.scene]);

  // Use the new semantic animation system
  const animator = useAvatarAnimator(avatarScene, {
    autoPreload: true,
    enableIdleCycling: true,
    enableMicroExpressions: false,
    performanceMode: "balanced",
    enableLogging: true,
  });

  // Initialize with basic animation state
  useEffect(() => {
    if (animator.state.isReady && !animator.state.isPreloading) {
      animator.setLocomotionState("idle");

      // Test different states every few seconds
      const interval = setInterval(() => {
        const states = ["idle", "walking", "running"] as const;
        const randomState = states[Math.floor(Math.random() * states.length)];
        animator.setLocomotionState(randomState);
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [animator.state.isReady, animator.state.isPreloading]);

  // Use built-in animations as fallback
  const { actions, mixer } = useAnimations(
    avatarGLTF.animations || [],
    avatarScene,
  );

  // Debug logging
  useEffect(() => {
    devLog("🧪 Basic Animation Test - Avatar GLTF:", avatarGLTF);
    devLog("🧪 Basic Animation Test - Walk GLTF:", walkGLTF);
    devLog("🧪 Basic Animation Test - T-pose GLTF:", tposeGLTF);
    devLog("🧪 Basic Animation Test - All animations:", allAnimations);
    devLog("🧪 Basic Animation Test - Actions:", actions);
    devLog(
      "🧪 Basic Animation Test - Available action names:",
      Object.keys(actions),
    );
  }, [avatarGLTF, walkGLTF, tposeGLTF, allAnimations, actions]);

  // Try to play first available animation
  useEffect(() => {
    const actionNames = Object.keys(actions);
    if (actionNames.length > 0) {
      const firstAction = actions[actionNames[0]];
      if (firstAction) {
        devLog(`🎬 Playing first available animation: ${actionNames[0]}`);
        firstAction.play();
      }
    }
  }, [actions]);

  return (
    <group ref={groupRef} position={[5, 0, 5]}>
      <primitive object={avatarScene} scale={[0.8, 0.8, 0.8]} />

      {/* Animation system status indicator */}
      <mesh position={[0, 2, 0]}>
        <sphereGeometry args={[0.1]} />
        <meshBasicMaterial
          color={animator.state.isReady ? "#00FF00" : "#FF0000"}
        />
      </mesh>

      {/* Current state indicator */}
      {process.env.NODE_ENV === "development" && (
        <mesh position={[0, 2.3, 0]}>
          <sphereGeometry args={[0.05]} />
          <meshBasicMaterial
            color={animator.state.locomotion === "idle" ? "#FFFF00" : "#0088FF"}
          />
        </mesh>
      )}
    </group>
  );
}

// Preload avatar models (animations are loaded through semantic system)
useGLTF.preload("/models/player-ready-player-me.glb");
useGLTF.preload("/models/c-girl.glb");
