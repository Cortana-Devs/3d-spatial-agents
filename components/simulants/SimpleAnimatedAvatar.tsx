"use client";

import React, { useRef, useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { Group } from "three";
import { AISimulant } from "../../types";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import { debugSimulantYPositioning } from "../../utils/debugLogger";
import { useActiveAvatarModel } from "@/src/hooks/useActiveAvatarModel";
import useAvatarAnimator from "@/hooks/useAvatarAnimator";

interface SimpleAnimatedAvatarProps {
  simulant: AISimulant;
  scale?: number;
  enableBoneAnimations?: boolean;
  animationQuality?: number;
  updateFrequency?: number;
}

export default function SimpleAnimatedAvatar({
  simulant,
  scale = 0.8,
  enableBoneAnimations = true,
  animationQuality = 1.0,
  updateFrequency = 30,
}: SimpleAnimatedAvatarProps) {
  const groupRef = useRef<Group>(null);

  // Use the active avatar model (gender-aware)
  const { modelUrl, isFemale } = useActiveAvatarModel();
  const avatarGLTF = useGLTF(modelUrl);

  // Create a per-instance clone of the avatar to avoid re-parenting conflicts between simulants
  const avatarScene = useMemo(() => {
    return SkeletonUtils.clone(avatarGLTF.scene) as Group;
  }, [avatarGLTF.scene]);

  // Use the new semantic animation system
  const animator = useAvatarAnimator(avatarScene, {
    autoPreload: false, // Don't auto-preload for each simulant instance
    enableIdleCycling: true,
    enableMicroExpressions: false, // Disable for performance on multiple simulants
    performanceMode: "performance", // Use performance mode for simulants
    enableLogging: true, // Enable logging for debugging female animations
  });

  // Debug: Log avatar gender and animation state changes
  useEffect(() => {
    console.log(`🎭 SimpleAnimatedAvatar initialized:`, {
      simulantId: simulant.id,
      isFemale,
      modelUrl,
      animatorReady: animator.state.isReady,
      isPreloading: animator.state.isPreloading,
      locomotionState: animator.state.locomotion,
    });
  }, [
    simulant.id,
    isFemale,
    modelUrl,
    animator.state.isReady,
    animator.state.isPreloading,
    animator.state.locomotion,
  ]);

  // Initialize with idle state when animator is ready
  useEffect(() => {
    if (animator.state.isReady && !animator.state.isPreloading) {
      console.log(
        `🎬 Setting initial idle state for ${isFemale ? "female" : "male"} simulant ${simulant.id}`,
      );
      animator.setLocomotionState("idle");
    }
  }, [
    animator.state.isReady,
    animator.state.isPreloading,
    isFemale,
    simulant.id,
  ]);

  // Map simulant actions to animation states
  useEffect(() => {
    if (!animator.state.isReady) {
      console.log(
        `⏳ Animator not ready yet for ${isFemale ? "female" : "male"} simulant ${simulant.id}`,
      );
      return;
    }

    const action = simulant.lastAction.toLowerCase();
    const gender = isFemale ? "female" : "male";

    console.log(
      `🎬 Mapping action "${action}" for ${gender} simulant ${simulant.id}`,
    );

    if (action.includes("walk") || action.includes("moving")) {
      console.log(`  → Setting walking state for ${gender}`);
      animator.setLocomotionState("walking");
    } else if (action.includes("run")) {
      console.log(`  → Setting running state for ${gender}`);
      animator.setLocomotionState("running");
    } else if (action.includes("crouch")) {
      console.log(`  → Setting crouching state for ${gender}`);
      animator.setLocomotionState("crouching");
    } else if (action.includes("talk") || action.includes("speak")) {
      console.log(`  → Starting talking for ${gender}`);
      animator.startTalking(0.5);
    } else if (action.includes("dance") || action.includes("celebrat")) {
      console.log(`  → Triggering dance emote for ${gender}`);
      animator.triggerEmote("dance-casual");
    } else {
      console.log(`  → Setting idle state for ${gender}`);
      animator.setLocomotionState("idle");
      if (animator.state.isTalking) {
        animator.stopTalking();
      }
    }
  }, [simulant.lastAction, animator, isFemale, simulant.id]);

  // Debug log Y positioning when simulant position changes
  useEffect(() => {
    debugSimulantYPositioning.logDefaultPositioning(
      simulant.id,
      simulant.position,
      "SimpleAnimatedAvatar position update",
    );

    // Validate Y positioning
    const isProperlyGrounded = Math.abs(simulant.position.y - 0.5) < 0.1;
    debugSimulantYPositioning.logValidation(
      simulant.id,
      simulant.position,
      isProperlyGrounded,
      isProperlyGrounded
        ? []
        : [
            `Y position ${simulant.position.y} is not at ground level (expected ~0.5)`,
          ],
    );
  }, [simulant.position, simulant.id]);

  return (
    <group
      ref={groupRef}
      position={[simulant.position.x, simulant.position.y, simulant.position.z]}
    >
      <primitive
        object={avatarScene}
        scale={[scale, scale, scale]}
        frustumCulled={true}
        matrixAutoUpdate={updateFrequency > 30}
      />

      {/* Status indicator with LOD-aware sizing */}
      <mesh position={[0, 2, 0]}>
        <sphereGeometry args={[enableBoneAnimations ? 0.05 : 0.08]} />
        <meshBasicMaterial
          color={simulant.status === "active" ? "#00FF00" : "#FFFF00"}
          transparent={animationQuality < 0.8}
          opacity={Math.max(0.5, animationQuality)}
        />
      </mesh>

      {/* Animation state debug indicator (development only) */}
      {process.env.NODE_ENV === "development" && (
        <mesh position={[0, 2.3, 0]}>
          <sphereGeometry args={[0.02]} />
          <meshBasicMaterial
            color={
              animator.state.isReady
                ? animator.state.locomotion === "idle"
                  ? "#00ff00"
                  : "#0088ff"
                : "#ff4444"
            }
          />
        </mesh>
      )}
    </group>
  );
}

// Preload avatar models (animations are now loaded through the semantic system)
useGLTF.preload("/models/player-ready-player-me.glb");
useGLTF.preload("/models/c-girl.glb");
