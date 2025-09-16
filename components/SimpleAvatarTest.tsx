"use client";

import React, { useRef, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { Object3D } from "three";
import { useActiveAvatarModel } from "../src/hooks/useActiveAvatarModel";

/**
 * Simple Avatar Test Component
 * ===========================
 *
 * Ultra-simple component that just displays an avatar without any animation system.
 * This is to test if the R3F Canvas setup works correctly.
 */

interface SimpleAvatarTestProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Basic avatar mesh - just displays the model
 */
function SimpleAvatarMesh() {
  const { modelUrl, avatarId } = useActiveAvatarModel();
  const { scene } = useGLTF(modelUrl);
  const avatarRef = useRef<Object3D>(null);

  useEffect(() => {
    if (avatarRef.current && scene) {
      avatarRef.current.clear();
      avatarRef.current.add(scene.clone());
    }
  }, [scene, avatarId]);

  return <primitive ref={avatarRef} object={new Object3D()} />;
}

/**
 * Basic scene setup
 */
function SimpleScene() {
  return (
    <>
      {/* Basic lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} />
      <pointLight position={[-5, 5, 5]} intensity={0.3} />

      {/* Avatar */}
      <SimpleAvatarMesh />
    </>
  );
}

/**
 * Main component
 */
export default function SimpleAvatarTest({
  className,
  style = { width: "100%", height: "600px" },
}: SimpleAvatarTestProps) {
  return (
    <div className={className} style={{ ...style, position: "relative" }}>
      {/* Simple status indicator */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          background: "rgba(0, 0, 0, 0.7)",
          color: "white",
          padding: "8px 12px",
          borderRadius: "4px",
          fontSize: "12px",
          zIndex: 1000,
        }}
      >
        ✅ Simple Avatar Test - No Animation System
      </div>

      <Canvas
        shadows
        gl={{ antialias: true }}
        camera={{ position: [0, 1.6, 3], fov: 50 }}
      >
        {/* Camera controls */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
        />

        {/* Scene */}
        <SimpleScene />
      </Canvas>
    </div>
  );
}

/**
 * Preload models
 */
useGLTF.preload("/models/player-ready-player-me.glb");
useGLTF.preload("/models/c-girl.glb");
