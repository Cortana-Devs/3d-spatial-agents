"use client";

import React, { useRef, useEffect } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import { Group } from "three";
import { devLog } from "@/utils/devLogger";

/**
 * Basic Animation Test Component
 * Simple test to verify GLB animation loading works
 */
export default function BasicAnimationTest() {
  const groupRef = useRef<Group>(null);

  // Load the Ready Player Me model
  const avatarGLTF = useGLTF("/models/player_ReadyPlayerMe.glb");

  // Load a single animation file directly
  const walkGLTF = useGLTF("/animation_GLB/M_Walk_001.glb");
  const tposeGLTF = useGLTF("/animation_GLB/Masculine_TPose.glb");

  // Get animations from both files
  const allAnimations = [
    ...(avatarGLTF.animations || []),
    ...(walkGLTF.animations || []),
    ...(tposeGLTF.animations || []),
  ];

  const { actions, mixer } = useAnimations(allAnimations, groupRef);

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
    <group ref={groupRef} position={[5, 0, 0]}>
      {/* Ready Player Me Avatar */}
      <primitive object={avatarGLTF.scene} scale={[0.8, 0.8, 0.8]} />

      {/* Debug indicator */}
      <mesh position={[0, 2, 0]}>
        <sphereGeometry args={[0.1]} />
        <meshBasicMaterial color="#00FF00" />
      </mesh>
    </group>
  );
}

// Preload the assets
useGLTF.preload("/models/player_ReadyPlayerMe.glb");
useGLTF.preload("/animation_GLB/M_Walk_001.glb");
useGLTF.preload("/animation_GLB/Masculine_TPose.glb");
