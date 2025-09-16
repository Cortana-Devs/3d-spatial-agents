"use client";

import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment } from "@react-three/drei";
import { Object3D, Group } from "three";
import { useActiveAvatarModel } from "../../src/hooks/useActiveAvatarModel";

/**
 * Stable Avatar Test
 * ==================
 *
 * Fixes the "character flash and go out" issue by:
 * - Preventing avatar disposal during re-renders
 * - Using stable object references
 * - Proper cleanup and persistence patterns
 * - Avoiding animation system conflicts
 */

interface StableAvatarTestProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Stable Avatar Mesh Component
 *
 * Key fixes for flashing issue:
 * 1. Use Group instead of Object3D for better stability
 * 2. Prevent clearing/disposing during re-renders
 * 3. Stable scene cloning and management
 * 4. No animation system interference initially
 */
function StableAvatarMesh() {
  const { modelUrl, avatarId, isFemale } = useActiveAvatarModel();
  const { scene } = useGLTF(modelUrl);
  const groupRef = useRef<Group>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [sceneInstance, setSceneInstance] = useState<Object3D | null>(null);

  // Stable scene setup - prevents flashing
  const stableScene = useMemo(() => {
    if (!scene) return null;

    console.log("🎭 Creating stable scene instance for:", { avatarId, isFemale });

    // Clone the scene once and keep it stable
    const clonedScene = scene.clone();

    // Ensure proper positioning and scaling
    clonedScene.position.set(0, 0, 0);
    clonedScene.rotation.set(0, 0, 0);
    clonedScene.scale.set(1, 1, 1);

    // Ensure all meshes are visible and properly configured
    clonedScene.traverse((child: any) => {
      if (child.isMesh) {
        child.visible = true;
        child.castShadow = true;
        child.receiveShadow = true;

        if (child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((material) => {
            material.transparent = false;
            material.opacity = 1;
            material.visible = true;
            material.needsUpdate = true;
          });
        }
      }
    });

    return clonedScene;
  }, [scene, avatarId]); // Only recreate when scene or avatarId changes

  // Add scene to group with persistence
  useEffect(() => {
    if (groupRef.current && stableScene && !isLoaded) {
      console.log("📦 Adding stable scene to group");

      // Clear any existing children first
      while (groupRef.current.children.length > 0) {
        groupRef.current.remove(groupRef.current.children[0]);
      }

      // Add the stable scene
      groupRef.current.add(stableScene);
      setSceneInstance(stableScene);
      setIsLoaded(true);

      console.log("✅ Avatar loaded and stable:", {
        children: groupRef.current.children.length,
        position: stableScene.position,
        scale: stableScene.scale,
      });
    }
  }, [stableScene, isLoaded]);

  // Cleanup only when component unmounts, not on re-renders
  useEffect(() => {
    return () => {
      console.log("🧹 Cleaning up avatar on unmount");
      if (groupRef.current) {
        while (groupRef.current.children.length > 0) {
          groupRef.current.remove(groupRef.current.children[0]);
        }
      }
      setIsLoaded(false);
      setSceneInstance(null);
    };
  }, []); // Empty dependency array - only on unmount

  return (
    <group ref={groupRef} position={[0, 0, 0]} scale={[1, 1, 1]}>
      {/* Fallback indicator while loading */}
      {!isLoaded && (
        <mesh position={[0, 1, 0]}>
          <boxGeometry args={[0.2, 1.8, 0.2]} />
          <meshStandardMaterial color="#4CAF50" />
        </mesh>
      )}
    </group>
  );
}

/**
 * Status Display Component
 */
function StatusDisplay() {
  const { avatarId, isFemale, modelUrl } = useActiveAvatarModel();
  const [frameCount, setFrameCount] = useState(0);

  // Frame counter to show stability
  useEffect(() => {
    const interval = setInterval(() => {
      setFrameCount(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        top: 20,
        left: 20,
        background: "rgba(0, 0, 0, 0.8)",
        color: "white",
        padding: "16px",
        borderRadius: "8px",
        fontSize: "12px",
        fontFamily: "monospace",
        zIndex: 1000,
        maxWidth: "300px",
      }}
    >
      <h3 style={{ margin: "0 0 12px 0", color: "#4CAF50" }}>
        🎭 Stable Avatar Test
      </h3>

      <div style={{ marginBottom: "12px" }}>
        <div><strong>Avatar ID:</strong> {avatarId}</div>
        <div><strong>Gender:</strong> {isFemale ? "Female" : "Male"}</div>
        <div><strong>Model:</strong> {modelUrl.split('/').pop()}</div>
        <div><strong>Uptime:</strong> {frameCount}s</div>
      </div>

      <div style={{
        padding: "8px",
        background: "rgba(76, 175, 80, 0.2)",
        borderRadius: "4px",
        border: "1px solid #4CAF50"
      }}>
        <div style={{ color: "#4CAF50", fontWeight: "bold", marginBottom: "4px" }}>
          ✅ Stability Fixes Applied:
        </div>
        <div style={{ fontSize: "11px" }}>
          • Prevented avatar disposal on re-render<br/>
          • Stable scene instance management<br/>
          • No animation system conflicts<br/>
          • Proper cleanup on unmount only<br/>
          • Persistent object references
        </div>
      </div>

      <div style={{ marginTop: "12px", fontSize: "11px", color: "#ccc" }}>
        <div><strong>Expected Behavior:</strong></div>
        <div>• Avatar loads once and stays visible</div>
        <div>• No flashing or disappearing</div>
        <div>• Stable rendering at 60 FPS</div>
        <div>• Smooth camera controls</div>
      </div>
    </div>
  );
}

/**
 * Stable Scene Setup
 */
function StableScene() {
  return (
    <>
      {/* Stable lighting setup */}
      <ambientLight intensity={0.8} />
      <directionalLight
        position={[10, 10, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-10, 10, 10]} intensity={0.6} />
      <pointLight position={[0, 5, 0]} intensity={0.4} />

      {/* Environment for better lighting */}
      <Environment preset="apartment" />

      {/* Ground reference */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#333" transparent opacity={0.5} />
      </mesh>

      {/* Grid helper */}
      <gridHelper args={[10, 10]} position={[0, 0, 0]} />

      {/* Reference objects for scale */}
      <mesh position={[2, 0.9, 0]}>
        <boxGeometry args={[0.1, 1.8, 0.1]} />
        <meshStandardMaterial color="#f44336" />
      </mesh>
      <mesh position={[-2, 0.9, 0]}>
        <boxGeometry args={[0.1, 1.8, 0.1]} />
        <meshStandardMaterial color="#2196F3" />
      </mesh>

      {/* Avatar - stable rendering */}
      <StableAvatarMesh />
    </>
  );
}

/**
 * Main Stable Avatar Test Component
 */
export default function StableAvatarTest({
  className,
  style = { width: "100%", height: "600px" },
}: StableAvatarTestProps) {
  const [canvasKey, setCanvasKey] = useState(0);

  // Force canvas remount only when absolutely necessary
  const refreshCanvas = useCallback(() => {
    console.log("🔄 Refreshing canvas");
    setCanvasKey(prev => prev + 1);
  }, []);

  return (
    <div
      className={className}
      style={{ ...style, position: "relative", background: "#111" }}
    >
      {/* Status Display */}
      <StatusDisplay />

      {/* Controls Info */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          left: 20,
          background: "rgba(0, 0, 0, 0.8)",
          color: "white",
          padding: "12px",
          borderRadius: "6px",
          fontSize: "11px",
          zIndex: 1000,
        }}
      >
        <div style={{ marginBottom: "8px" }}>
          <strong>Camera Controls:</strong>
        </div>
        <div>• Left Click + Drag: Rotate</div>
        <div>• Right Click + Drag: Pan</div>
        <div>• Scroll: Zoom In/Out</div>
        <div>• Double Click: Reset View</div>
      </div>

      {/* Emergency Refresh Button */}
      <div
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          zIndex: 1000,
        }}
      >
        <button
          onClick={refreshCanvas}
          style={{
            background: "#FF9800",
            color: "white",
            border: "none",
            padding: "8px 12px",
            borderRadius: "4px",
            fontSize: "12px",
            cursor: "pointer",
            marginBottom: "8px",
          }}
        >
          🔄 Refresh Canvas
        </button>
        <div
          style={{
            background: "rgba(76, 175, 80, 0.8)",
            color: "white",
            padding: "8px 12px",
            borderRadius: "4px",
            fontSize: "12px",
            fontWeight: "bold",
            textAlign: "center",
          }}
        >
          🎭 STABLE VERSION
        </div>
      </div>

      {/* 3D Canvas with stability measures */}
      <Canvas
        key={canvasKey} // Force remount when needed
        shadows
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
          preserveDrawingBuffer: false, // Prevent memory issues
        }}
        camera={{
          position: [3, 2, 5],
          fov: 60,
          near: 0.1,
          far: 100,
        }}
        onCreated={({ camera, scene }) => {
          camera.lookAt(0, 1, 0);
          scene.background = null;
          console.log("🎬 Canvas created successfully");
        }}
        frameloop="always" // Ensure continuous rendering
      >
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          target={[0, 1, 0]}
          minDistance={1}
          maxDistance={15}
          minPolarAngle={0}
          maxPolarAngle={Math.PI * 0.9}
          enableDamping={true}
          dampingFactor={0.05}
        />

        <StableScene />
      </Canvas>
    </div>
  );
}

/**
 * Preload models with error handling
 */
try {
  useGLTF.preload("/models/player-ready-player-me.glb");
  useGLTF.preload("/models/c-girl.glb");
} catch (error) {
  console.warn("Model preload failed:", error);
}
