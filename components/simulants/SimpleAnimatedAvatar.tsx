"use client";

import React, { useRef, useEffect, useMemo } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import { Group } from "three";
import { AISimulant } from "../../types";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";

interface SimpleAnimatedAvatarProps {
  simulant: AISimulant;
  scale?: number;
}

export default function SimpleAnimatedAvatar({ 
  simulant, 
  scale = 0.8 
}: SimpleAnimatedAvatarProps) {
  const groupRef = useRef<Group>(null);
  
  // Load avatar
  const avatarGLTF = useGLTF("/models/player_ReadyPlayerMe.glb");
  
  // Create a per-instance clone of the avatar to avoid re-parenting conflicts between simulants
  const avatarScene = useMemo(() => {
    return SkeletonUtils.clone(avatarGLTF.scene) as Group;
  }, [avatarGLTF.scene]);
  
  // Load varied animations
  const walkGLTF = useGLTF("/animation_GLB/M_Walk_001.glb");
  const runGLTF = useGLTF("/animation_GLB/M_Run_001.glb");
  const crouchWalkGLTF = useGLTF("/animation_GLB/M_Crouch_Walk_003.glb");
  const walkBackGLTF = useGLTF("/animation_GLB/M_Walk_Backwards_001.glb");
  const jumpGLTF = useGLTF("/animation_GLB/M_Walk_Jump_002.glb");
  const danceGLTF = useGLTF("/animation_GLB/F_Dances_007.glb");
  const talkGLTF = useGLTF("/animation_GLB/M_Talking_Variations_005.glb");
  const expressionGLTF = useGLTF("/animation_GLB/M_Standing_Expressions_013.glb");
  const tposeGLTF = useGLTF("/animation_GLB/Masculine_TPose.glb");
  const idle1GLTF = useGLTF("/animation_GLB/F_Standing_Idle_Variations_001.glb");
  const idle2GLTF = useGLTF("/animation_GLB/F_Standing_Idle_Variations_002.glb");
  const idle3GLTF = useGLTF("/animation_GLB/F_Standing_Idle_Variations_006.glb");
  
  // Strip root motion
  const shouldStripPosition = (trackName: string) => {
    const lower = trackName.toLowerCase();
    return lower.endsWith(".position") && (lower.includes("hip") || lower.includes("mixamorig") || lower.includes("root"));
  };
  
  // Sanitize
  const sanitizedAnimations = useMemo(() => {
    const allGLTFs = [avatarGLTF, walkGLTF, runGLTF, crouchWalkGLTF, walkBackGLTF, jumpGLTF, danceGLTF, talkGLTF, expressionGLTF, tposeGLTF, idle1GLTF, idle2GLTF, idle3GLTF];
    const allAnimations = allGLTFs.flatMap(gltf => gltf.animations || []);
    return allAnimations.map(clip => {
      if (!clip?.tracks?.length) return clip;
      const cloned = clip.clone();
      cloned.tracks = cloned.tracks.filter(track => !shouldStripPosition(track.name));
      return cloned;
    });
  }, [avatarGLTF, walkGLTF, runGLTF, crouchWalkGLTF, walkBackGLTF, jumpGLTF, danceGLTF, talkGLTF, expressionGLTF, tposeGLTF, idle1GLTF, idle2GLTF, idle3GLTF]);
  
  // Bind animations to the cloned avatar scene to ensure proper track resolution
  const { actions } = useAnimations(sanitizedAnimations, avatarScene);
  
  useEffect(() => {
    const actionNames = Object.keys(actions);
    if (!actionNames.length) return;
    Object.values(actions).forEach(action => action?.stop());
    
    const lastActionLower = simulant.lastAction.toLowerCase();
    let categoryNames: string[] = [];
    
    if (lastActionLower.includes('walk')) {
      categoryNames = actionNames.filter(name => name.toLowerCase().includes('walk') && !name.toLowerCase().includes('jump') && !name.toLowerCase().includes('crouch'));
    } else if (lastActionLower.includes('run')) {
      categoryNames = actionNames.filter(name => name.toLowerCase().includes('run'));
    } else if (lastActionLower.includes('crouch')) {
      categoryNames = actionNames.filter(name => name.toLowerCase().includes('crouch'));
    } else if (lastActionLower.includes('jump')) {
      categoryNames = actionNames.filter(name => name.toLowerCase().includes('jump'));
    } else if (lastActionLower.includes('dance')) {
      categoryNames = actionNames.filter(name => name.toLowerCase().includes('dance'));
    } else if (lastActionLower.includes('talk')) {
      categoryNames = actionNames.filter(name => name.toLowerCase().includes('talk'));
    } else if (lastActionLower.includes('expression')) {
      categoryNames = actionNames.filter(name => name.toLowerCase().includes('expression'));
    } else if (lastActionLower.includes('back')) {
      categoryNames = actionNames.filter(name => name.toLowerCase().includes('back'));
    } else {
      categoryNames = actionNames.filter(name => name.toLowerCase().includes('idle') || name.toLowerCase().includes('tpose'));
    }
    
    if (categoryNames.length) {
      const targetName = categoryNames[Math.floor(Math.random() * categoryNames.length)];
      const targetAction = actions[targetName];
      if (targetAction) {
        targetAction.reset().play();
        targetAction.time = Math.random() * targetAction.getClip().duration;
      }
    }
  }, [actions, simulant.lastAction, simulant.id]);
  
  return (
    <group ref={groupRef} position={[simulant.position.x, simulant.position.y, simulant.position.z]}>
      <primitive object={avatarScene} scale={[scale, scale, scale]} />
      <mesh position={[0, 2, 0]}>
        <sphereGeometry args={[0.05]} />
        <meshBasicMaterial color={simulant.status === 'active' ? '#00FF00' : '#FFFF00'} />
      </mesh>
    </group>
  );
}

// Preload all
useGLTF.preload("/models/player_ReadyPlayerMe.glb");
useGLTF.preload("/animation_GLB/M_Walk_001.glb");
useGLTF.preload("/animation_GLB/M_Run_001.glb");
useGLTF.preload("/animation_GLB/M_Crouch_Walk_003.glb");
useGLTF.preload("/animation_GLB/M_Walk_Backwards_001.glb");
useGLTF.preload("/animation_GLB/M_Walk_Jump_002.glb");
useGLTF.preload("/animation_GLB/F_Dances_007.glb");
useGLTF.preload("/animation_GLB/M_Talking_Variations_005.glb");
useGLTF.preload("/animation_GLB/M_Standing_Expressions_013.glb");
useGLTF.preload("/animation_GLB/Masculine_TPose.glb");
useGLTF.preload("/animation_GLB/F_Standing_Idle_Variations_001.glb");
useGLTF.preload("/animation_GLB/F_Standing_Idle_Variations_002.glb");
useGLTF.preload("/animation_GLB/F_Standing_Idle_Variations_006.glb");
