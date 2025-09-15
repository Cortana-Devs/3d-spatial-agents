"use client";

import React, { useRef, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment, Stats } from "@react-three/drei";
import { Object3D } from "three";
import { useActiveAvatarModel } from "../src/hooks/useActiveAvatarModel";
import useAvatarAnimator from "../hooks/useAvatarAnimator";

/**
 * Minimal AnimatedAvatar Component
 * ===============================
 *
 * A simplified version to test the R3F hooks issue.
 * This component ensures useAvatarAnimator is only called inside Canvas.
 */

interface MinimalAnimatedAvatarProps {
  showControls?: boolean;
  showStats?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Avatar mesh component - MUST be inside Canvas
 */
function AvatarMesh() {
  const { modelUrl, avatarId } = useActiveAvatarModel();
  const { scene } = useGLTF(modelUrl);
  const avatarRef = useRef<Object3D>(null);

  // This hook MUST be called inside Canvas
  const animator = useAvatarAnimator(avatarRef.current, {
    autoPreload: true,
    enableIdleCycling: true,
    enableMicroExpressions: false,
    performanceMode: "performance",
    enableLogging: false, // Disable to reduce spam
  });

  useEffect(() => {
    if (avatarRef.current && scene) {
      avatarRef.current.clear();
      avatarRef.current.add(scene.clone());
    }
  }, [scene, avatarId]);

  // Auto-start with idle when ready
  useEffect(() => {
    if (animator.state.isReady && !animator.state.isPreloading) {
      animator.setLocomotionState("idle");
    }
  }, [animator.state.isReady, animator.state.isPreloading]);

  return <primitive ref={avatarRef} object={new Object3D()} />;
}

/**
 * Scene setup component
 */
function Scene({ showStats }: { showStats: boolean }) {
  return (
    <>
      {/* Basic lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} />

      {/* Environment */}
      <Environment preset="studio" />

      {/* Avatar */}
      <AvatarMesh />

      {/* Performance stats */}
      {showStats && <Stats />}
    </>
  );
}

/**
 * Main component - NO R3F hooks here
 */
export default function MinimalAnimatedAvatar({
  showControls = true,
  showStats = false,
  className,
  style = { width: "100%", height: "600px" },
}: MinimalAnimatedAvatarProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Simple loading state
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!isLoaded) {
    return (
      <div
        className={className}
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1a1a1a',
          color: 'white'
        }}
      >
        Loading Avatar...
      </div>
    );
  }

  return (
    <div className={className} style={{ ...style, position: "relative" }}>
      <Canvas
        shadows
        gl={{ antialias: true }}
        camera={{ position: [0, 1.6, 3], fov: 50 }}
      >
        {/* Controls */}
        {showControls && (
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
          />
        )}

        {/* Scene with avatar */}
        <Scene showStats={showStats} />
      </Canvas>
    </div>
  );
}

/**
 * Preload models
 */
useGLTF.preload("/models/player-ready-player-me.glb");
useGLTF.preload("/models/c-girl.glb");
