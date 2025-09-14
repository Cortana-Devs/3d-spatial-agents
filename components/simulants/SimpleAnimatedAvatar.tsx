"use client";

import React, { useRef, useEffect, useMemo } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import { Group } from "three";
import { AISimulant } from "../../types";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import { debugSimulantYPositioning } from "../../utils/debugLogger";

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
  updateFrequency = 60,
}: SimpleAnimatedAvatarProps) {
  const groupRef = useRef<Group>(null);
  const lastUpdateRef = useRef<number>(0);
  const animationTimeRef = useRef<number>(0);

  // Load avatar with LOD considerations
  const avatarGLTF = useGLTF("/models/player-ready-player-me.glb");

  // Create a per-instance clone of the avatar to avoid re-parenting conflicts between simulants
  const avatarScene = useMemo(() => {
    return SkeletonUtils.clone(avatarGLTF.scene) as Group;
  }, [avatarGLTF.scene]);

  // Load varied animations
  const walkGLTF = useGLTF("/animations/M_Walk_001.glb");
  const runGLTF = useGLTF("/animations/M_Run_001.glb");
  const crouchWalkGLTF = useGLTF("/animations/M_Crouch_Walk_003.glb");
  const walkBackGLTF = useGLTF("/animations/M_Walk_Backwards_001.glb");
  const jumpGLTF = useGLTF("/animations/M_Walk_Jump_002.glb");
  const danceGLTF = useGLTF("/animations/F_Dances_007.glb");
  const talkGLTF = useGLTF("/animations/M_Talking_Variations_005.glb");
  const expressionGLTF = useGLTF(
    "/animations/M_Standing_Expressions_013.glb",
  );
  const tposeGLTF = useGLTF("/animations/Masculine_TPose.glb");
  const idle1GLTF = useGLTF(
    "/animations/F_Standing_Idle_Variations_001.glb",
  );
  const idle2GLTF = useGLTF(
    "/animations/F_Standing_Idle_Variations_002.glb",
  );
  const idle3GLTF = useGLTF(
    "/animations/F_Standing_Idle_Variations_006.glb",
  );

  // Strip root motion and apply quality filtering
  const shouldStripPosition = (trackName: string) => {
    const lower = trackName.toLowerCase();
    return (
      lower.endsWith(".position") &&
      (lower.includes("hip") ||
        lower.includes("mixamorig") ||
        lower.includes("root"))
    );
  };

  const shouldIncludeTrack = (trackName: string) => {
    if (!enableBoneAnimations) {
      // Only include essential tracks for low LOD
      const lower = trackName.toLowerCase();
      return (
        lower.includes("spine") ||
        lower.includes("head") ||
        lower.includes("hip")
      );
    }
    return true;
  };

  // Sanitize and optimize animations based on quality settings
  const sanitizedAnimations = useMemo(() => {
    const allGLTFs = [
      avatarGLTF,
      walkGLTF,
      runGLTF,
      crouchWalkGLTF,
      walkBackGLTF,
      jumpGLTF,
      danceGLTF,
      talkGLTF,
      expressionGLTF,
      tposeGLTF,
      idle1GLTF,
      idle2GLTF,
      idle3GLTF,
    ];
    const allAnimations = allGLTFs.flatMap((gltf) => gltf.animations || []);
    return allAnimations.map((clip) => {
      if (!clip?.tracks?.length) return clip;
      const cloned = clip.clone();

      // Filter tracks based on LOD settings
      cloned.tracks = cloned.tracks.filter(
        (track) =>
          !shouldStripPosition(track.name) && shouldIncludeTrack(track.name),
      );

      // Reduce keyframe density for lower quality
      if (animationQuality < 1.0) {
        cloned.tracks = cloned.tracks.map((track) => {
          const reducedTrack = track.clone();
          const originalLength = reducedTrack.times.length;
          const targetLength = Math.max(
            2,
            Math.floor(originalLength * animationQuality),
          );

          if (targetLength < originalLength) {
            const step = Math.floor(originalLength / targetLength);
            const newTimes = [];
            const newValues = [];

            for (let i = 0; i < originalLength; i += step) {
              if (newTimes.length < targetLength) {
                newTimes.push(reducedTrack.times[i]);
                const valueSize = reducedTrack.values.length / originalLength;
                for (let j = 0; j < valueSize; j++) {
                  newValues.push(reducedTrack.values[i * valueSize + j]);
                }
              }
            }

            reducedTrack.times = new Float32Array(newTimes);
            reducedTrack.values = new Float32Array(newValues);
          }

          return reducedTrack;
        });
      }

      return cloned;
    });
  }, [
    avatarGLTF,
    walkGLTF,
    runGLTF,
    crouchWalkGLTF,
    walkBackGLTF,
    jumpGLTF,
    danceGLTF,
    talkGLTF,
    expressionGLTF,
    tposeGLTF,
    idle1GLTF,
    idle2GLTF,
    idle3GLTF,
    enableBoneAnimations,
    animationQuality,
  ]);

  // Bind animations to the cloned avatar scene to ensure proper track resolution
  const { actions } = useAnimations(sanitizedAnimations, avatarScene);

  // Performance-optimized animation updates
  useEffect(() => {
    const currentTime = performance.now();
    const timeSinceLastUpdate = currentTime - lastUpdateRef.current;
    const updateInterval = 1000 / updateFrequency;

    // Skip update if not enough time has passed (frame rate limiting)
    if (timeSinceLastUpdate < updateInterval && lastUpdateRef.current !== 0) {
      return;
    }

    lastUpdateRef.current = currentTime;

    const actionNames = Object.keys(actions);
    if (!actionNames.length) return;

    // Stop all actions before starting new one
    Object.values(actions).forEach((action) => action?.stop());

    const lastActionLower = simulant.lastAction.toLowerCase();
    let categoryNames: string[] = [];

    // Animation selection logic with LOD considerations
    if (!enableBoneAnimations) {
      // For low LOD, prefer simpler animations
      categoryNames = actionNames.filter(
        (name) =>
          name.toLowerCase().includes("idle") ||
          name.toLowerCase().includes("tpose"),
      );
    } else {
      // Full animation selection for high LOD
      if (lastActionLower.includes("walk")) {
        categoryNames = actionNames.filter(
          (name) =>
            name.toLowerCase().includes("walk") &&
            !name.toLowerCase().includes("jump") &&
            !name.toLowerCase().includes("crouch"),
        );
      } else if (lastActionLower.includes("run")) {
        categoryNames = actionNames.filter((name) =>
          name.toLowerCase().includes("run"),
        );
      } else if (lastActionLower.includes("crouch")) {
        categoryNames = actionNames.filter((name) =>
          name.toLowerCase().includes("crouch"),
        );
      } else if (lastActionLower.includes("jump")) {
        categoryNames = actionNames.filter((name) =>
          name.toLowerCase().includes("jump"),
        );
      } else if (lastActionLower.includes("dance")) {
        categoryNames = actionNames.filter((name) =>
          name.toLowerCase().includes("dance"),
        );
      } else if (lastActionLower.includes("talk")) {
        categoryNames = actionNames.filter((name) =>
          name.toLowerCase().includes("talk"),
        );
      } else if (lastActionLower.includes("expression")) {
        categoryNames = actionNames.filter((name) =>
          name.toLowerCase().includes("expression"),
        );
      } else if (lastActionLower.includes("back")) {
        categoryNames = actionNames.filter((name) =>
          name.toLowerCase().includes("back"),
        );
      } else {
        categoryNames = actionNames.filter(
          (name) =>
            name.toLowerCase().includes("idle") ||
            name.toLowerCase().includes("tpose"),
        );
      }
    }

    if (categoryNames.length) {
      const targetName =
        categoryNames[Math.floor(Math.random() * categoryNames.length)];
      const targetAction = actions[targetName];
      if (targetAction) {
        targetAction.reset().play();

        // Apply quality-based playback rate
        targetAction.setEffectiveTimeScale(animationQuality);
        targetAction.time = Math.random() * targetAction.getClip().duration;

        // Store animation time for consistency
        animationTimeRef.current = targetAction.time;
      }
    }
  }, [
    actions,
    simulant.lastAction,
    simulant.id,
    updateFrequency,
    enableBoneAnimations,
    animationQuality,
  ]);

  // Debug log Y positioning when simulant position changes
  React.useEffect(() => {
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

      {/* LOD debug indicator (development only) */}
      {process.env.NODE_ENV === "development" && (
        <mesh position={[0, 2.3, 0]}>
          <sphereGeometry args={[0.02]} />
          <meshBasicMaterial
            color={
              enableBoneAnimations && animationQuality >= 0.8
                ? "#00ff00"
                : enableBoneAnimations && animationQuality >= 0.5
                  ? "#ffaa00"
                  : "#ff4444"
            }
          />
        </mesh>
      )}
    </group>
  );
}

// Preload all
useGLTF.preload("/models/player-ready-player-me.glb");
useGLTF.preload("/animations/M_Walk_001.glb");
useGLTF.preload("/animations/M_Run_001.glb");
useGLTF.preload("/animations/M_Crouch_Walk_003.glb");
useGLTF.preload("/animations/M_Walk_Backwards_001.glb");
useGLTF.preload("/animations/M_Walk_Jump_002.glb");
useGLTF.preload("/animations/F_Dances_007.glb");
useGLTF.preload("/animations/M_Talking_Variations_005.glb");
useGLTF.preload("/animations/M_Standing_Expressions_013.glb");
useGLTF.preload("/animations/Masculine_TPose.glb");
useGLTF.preload("/animations/F_Standing_Idle_Variations_001.glb");
useGLTF.preload("/animations/F_Standing_Idle_Variations_002.glb");
useGLTF.preload("/animations/F_Standing_Idle_Variations_006.glb");
