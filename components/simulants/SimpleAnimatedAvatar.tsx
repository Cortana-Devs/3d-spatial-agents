"use client";

import React, { useRef, useEffect, useMemo } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import { Group, AnimationClip } from "three";
import { AISimulant } from "../../types";

interface SimpleAnimatedAvatarProps {
  simulant: AISimulant;
  scale?: number;
}

/**
 * Simple Animated Avatar Component
 * Minimal implementation to test basic animation functionality
 */
export default function SimpleAnimatedAvatar({ 
  simulant, 
  scale = 0.8 
}: SimpleAnimatedAvatarProps) {
  const groupRef = useRef<Group>(null);
  
  // Load the avatar model
  const avatarGLTF = useGLTF("/models/player_ReadyPlayerMe.glb");
  
  // Load a single animation for testing
  const walkGLTF = useGLTF("/animation_GLB/M_Walk_001.glb");
  const tposeGLTF = useGLTF("/animation_GLB/Masculine_TPose.glb");
  
  // Remove root motion from locomotion animations
  const sanitizedAnimations = useMemo(() => {
    const shouldStripPosition = (trackName: string): boolean => {
      const lowerName = trackName.toLowerCase();
      // Strip position tracks from common root bones that cause translation
      return lowerName.endsWith('.position') && (
        lowerName.includes('hip') || 
        lowerName.includes('root') || 
        lowerName.includes('armature') ||
        lowerName.includes('mixamo') ||
        lowerName.includes('hips')
      );
    };
    
    const allAnimations = [
      ...(avatarGLTF.animations || []),
      ...(walkGLTF.animations || []),
      ...(tposeGLTF.animations || [])
    ];
    
    return allAnimations.map((clip) => {
      if (!clip || !clip.tracks || clip.tracks.length === 0) return clip;
      
      // Clone the clip to avoid modifying the original
      const clonedClip = clip.clone();
      
      // Filter out position tracks that cause root motion
      clonedClip.tracks = clonedClip.tracks.filter((track) => 
        !shouldStripPosition(track.name)
      );
      
      console.log(`🔧 Processed animation: ${clip.name}, tracks: ${clip.tracks.length} → ${clonedClip.tracks.length}`);
      
      return clonedClip;
    });
  }, [avatarGLTF.animations, walkGLTF.animations, tposeGLTF.animations]);
  
  const { actions, mixer } = useAnimations(sanitizedAnimations, groupRef);
  
  // Track current action to avoid restarting the same animation
  const currentActionRef = useRef<string | null>(null);

  // Simple animation logic based on simulant action
  useEffect(() => {
    const actionNames = Object.keys(actions);
    console.log(`🎭 Simple Avatar - Available actions for ${simulant.id}:`, actionNames);
    
    if (actionNames.length === 0) return;
    
    // Don't restart the same animation
    if (currentActionRef.current === simulant.lastAction) return;
    currentActionRef.current = simulant.lastAction;
    
    // Stop all current animations
    Object.values(actions).forEach(action => {
      if (action) action.stop();
    });
    
    // Determine which animation to play based on simulant action
    let targetAction = null;
    
    if (simulant.lastAction.toLowerCase().includes('walk')) {
      // Try to find walk animation
      targetAction = actions[actionNames.find(name => 
        name.toLowerCase().includes('walk') && !name.toLowerCase().includes('jump')
      ) || ''] || null;
    }
    
    // Default to T-pose/idle animation only if no specific match
    if (!targetAction && actionNames.length > 0) {
      // Look for T-pose or idle animations specifically
      const idleAction = actionNames.find(name => 
        name.toLowerCase().includes('tpose') || 
        name.toLowerCase().includes('t-pose') ||
        name.toLowerCase().includes('idle')
      );
      
      if (idleAction) {
        targetAction = actions[idleAction];
      }
      // Don't auto-play walking animations as fallback
    }
    
    if (targetAction) {
      console.log(`🎬 Simple Avatar - Playing: ${targetAction.getClip().name} for ${simulant.id}`);
      targetAction.reset().play();
    }
  }, [actions, simulant.lastAction, simulant.id]);
  
  return (
    <group ref={groupRef} position={[simulant.position.x, simulant.position.y, simulant.position.z]}>
      <primitive 
        object={avatarGLTF.scene} 
        scale={[scale, scale, scale]}
      />
      
      {/* Simple status indicator */}
      <mesh position={[0, 2, 0]}>
        <sphereGeometry args={[0.05]} />
        <meshBasicMaterial color={simulant.status === 'active' ? '#00FF00' : '#FFFF00'} />
      </mesh>
    </group>
  );
}

// Preload assets
useGLTF.preload("/models/player_ReadyPlayerMe.glb");
useGLTF.preload("/animation_GLB/M_Walk_001.glb");
useGLTF.preload("/animation_GLB/Masculine_TPose.glb");
