"use client";

import React, { useRef, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment } from "@react-three/drei";
import { Object3D, Box3, Vector3 } from "three";
import { useActiveAvatarModel } from "../../src/hooks/useActiveAvatarModel";
import useAvatarAnimator from "../../hooks/useAvatarAnimator";

/**
 * Debug Avatar Test
 * =================
 *
 * Comprehensive debug version that shows detailed information about avatar loading,
 * positioning, scaling, and visibility issues.
 */

interface DebugAvatarTestProps {
  className?: string;
  style?: React.CSSProperties;
}

interface DebugInfo {
  avatarLoaded: boolean;
  sceneChildren: number;
  boundingBox: string;
  position: string;
  scale: string;
  rotation: string;
  materials: number;
  meshes: number;
  bones: number;
  animations: number;
  animatorReady: boolean;
  errors: string[];
}

/**
 * Debug Avatar Mesh Component
 */
function DebugAvatarMesh({
  onDebugUpdate,
}: {
  onDebugUpdate: (info: DebugInfo) => void;
}) {
  const { modelUrl, avatarId, isFemale } = useActiveAvatarModel();
  const { scene, animations } = useGLTF(modelUrl);
  const avatarRef = useRef<Object3D>(null);
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    avatarLoaded: false,
    sceneChildren: 0,
    boundingBox: "Not calculated",
    position: "0, 0, 0",
    scale: "1, 1, 1",
    rotation: "0, 0, 0",
    materials: 0,
    meshes: 0,
    bones: 0,
    animations: 0,
    animatorReady: false,
    errors: [],
  });

  // Initialize animator
  const animator = useAvatarAnimator(avatarRef.current, {
    autoPreload: false,
    enableIdleCycling: false,
    enableMicroExpressions: false,
    performanceMode: "performance",
    enableLogging: true, // Enable logging for debug
  });

  // Update debug info when animator state changes
  useEffect(() => {
    const newInfo = {
      ...debugInfo,
      animatorReady: animator.state.isReady,
    };
    setDebugInfo(newInfo);
    onDebugUpdate(newInfo);
  }, [animator.state.isReady, onDebugUpdate]);

  // Setup avatar with detailed debugging
  useEffect(() => {
    if (avatarRef.current && scene) {
      try {
        console.log("🔍 Setting up avatar:", { modelUrl, avatarId, isFemale });

        avatarRef.current.clear();

        // Clone and analyze the scene
        const clonedScene = scene.clone();

        // Calculate bounding box
        const box = new Box3().setFromObject(clonedScene);
        const size = box.getSize(new Vector3());
        const center = box.getCenter(new Vector3());

        // Count scene elements
        let meshCount = 0;
        let materialCount = 0;
        let boneCount = 0;
        const materialSet = new Set();

        clonedScene.traverse((child: any) => {
          if (child.isMesh) {
            meshCount++;
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach((mat) => materialSet.add(mat.uuid));
              } else {
                materialSet.add(child.material.uuid);
              }
            }
          }
          if (child.isBone) {
            boneCount++;
          }
        });

        materialCount = materialSet.size;

        // Position avatar at origin and ensure proper scale
        clonedScene.position.set(0, 0, 0);
        clonedScene.rotation.set(0, 0, 0);

        // Auto-scale if the avatar is too small or large
        const maxDimension = Math.max(size.x, size.y, size.z);
        let scale = 1;
        if (maxDimension > 0) {
          if (maxDimension < 0.5) {
            scale = 2; // Scale up if too small
          } else if (maxDimension > 3) {
            scale = 1.8 / maxDimension; // Scale down if too large
          }
        }
        clonedScene.scale.set(scale, scale, scale);

        // Ensure materials are properly configured
        clonedScene.traverse((child: any) => {
          if (child.isMesh && child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach((material) => {
              material.transparent = false;
              material.opacity = 1;
              material.visible = true;
              material.needsUpdate = true;
            });
            child.castShadow = true;
            child.receiveShadow = true;
            child.visible = true;
          }
        });

        avatarRef.current.add(clonedScene);

        // Update debug info
        const newInfo: DebugInfo = {
          avatarLoaded: true,
          sceneChildren: clonedScene.children.length,
          boundingBox: `Size: ${size.x.toFixed(2)}, ${size.y.toFixed(2)}, ${size.z.toFixed(2)} | Center: ${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)}`,
          position: `${clonedScene.position.x.toFixed(2)}, ${clonedScene.position.y.toFixed(2)}, ${clonedScene.position.z.toFixed(2)}`,
          scale: `${clonedScene.scale.x.toFixed(2)}, ${clonedScene.scale.y.toFixed(2)}, ${clonedScene.scale.z.toFixed(2)}`,
          rotation: `${clonedScene.rotation.x.toFixed(2)}, ${clonedScene.rotation.y.toFixed(2)}, ${clonedScene.rotation.z.toFixed(2)}`,
          materials: materialCount,
          meshes: meshCount,
          bones: boneCount,
          animations: animations.length,
          animatorReady: animator.state.isReady,
          errors: [],
        };

        setDebugInfo(newInfo);
        onDebugUpdate(newInfo);

        console.log("✅ Avatar setup complete:", newInfo);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const newInfo = {
          ...debugInfo,
          errors: [...debugInfo.errors, errorMessage],
        };
        setDebugInfo(newInfo);
        onDebugUpdate(newInfo);
        console.error("❌ Avatar setup failed:", error);
      }
    }
  }, [scene, avatarId, animations, onDebugUpdate]);

  // Start animation when ready
  useEffect(() => {
    if (animator.state.isReady && debugInfo.avatarLoaded) {
      setTimeout(() => {
        try {
          animator.setLocomotionState("idle");
          console.log("🎭 Started idle animation");
        } catch (error) {
          console.error("Failed to start animation:", error);
        }
      }, 500);
    }
  }, [animator.state.isReady, debugInfo.avatarLoaded]);

  return (
    <group ref={avatarRef} position={[0, 0, 0]}>
      {/* Reference objects for scale */}
      <mesh position={[2, 0, 0]}>
        <boxGeometry args={[0.1, 2, 0.1]} />
        <meshStandardMaterial color="red" />
      </mesh>
      <mesh position={[-2, 0, 0]}>
        <boxGeometry args={[0.1, 2, 0.1]} />
        <meshStandardMaterial color="blue" />
      </mesh>

      {/* Grid helper at ground level */}
      <gridHelper args={[10, 10]} position={[0, -1, 0]} />
    </group>
  );
}

/**
 * Debug Info Panel
 */
function DebugPanel({ debugInfo }: { debugInfo: DebugInfo }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 20,
        left: 20,
        background: "rgba(0, 0, 0, 0.9)",
        color: "white",
        padding: "16px",
        borderRadius: "8px",
        fontSize: "12px",
        fontFamily: "monospace",
        maxWidth: "400px",
        zIndex: 1000,
      }}
    >
      <h3 style={{ margin: "0 0 12px 0", color: "#4CAF50" }}>
        🔍 Avatar Debug Information
      </h3>

      <div style={{ marginBottom: "12px" }}>
        <div style={{ color: debugInfo.avatarLoaded ? "#4CAF50" : "#f44336" }}>
          Avatar Loaded: {debugInfo.avatarLoaded ? "✅ Yes" : "❌ No"}
        </div>
        <div style={{ color: debugInfo.animatorReady ? "#4CAF50" : "#f44336" }}>
          Animator Ready: {debugInfo.animatorReady ? "✅ Yes" : "❌ No"}
        </div>
      </div>

      <div style={{ marginBottom: "12px" }}>
        <div><strong>Scene Info:</strong></div>
        <div>Children: {debugInfo.sceneChildren}</div>
        <div>Meshes: {debugInfo.meshes}</div>
        <div>Materials: {debugInfo.materials}</div>
        <div>Bones: {debugInfo.bones}</div>
        <div>Animations: {debugInfo.animations}</div>
      </div>

      <div style={{ marginBottom: "12px" }}>
        <div><strong>Transform:</strong></div>
        <div>Position: {debugInfo.position}</div>
        <div>Scale: {debugInfo.scale}</div>
        <div>Rotation: {debugInfo.rotation}</div>
      </div>

      <div style={{ marginBottom: "12px" }}>
        <div><strong>Bounding Box:</strong></div>
        <div style={{ fontSize: "10px" }}>{debugInfo.boundingBox}</div>
      </div>

      {debugInfo.errors.length > 0 && (
        <div style={{ marginBottom: "12px" }}>
          <div style={{ color: "#f44336" }}><strong>Errors:</strong></div>
          {debugInfo.errors.map((error, index) => (
            <div key={index} style={{ color: "#f44336", fontSize: "10px" }}>
              • {error}
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: "10px", color: "#888", marginTop: "12px" }}>
        Debug Info: Camera should see avatar between red and blue reference poles.
        Grid is at ground level. Avatar should be roughly 1.8 units tall.
      </div>
    </div>
  );
}

/**
 * Enhanced Scene with Better Lighting
 */
function DebugScene({ onDebugUpdate }: { onDebugUpdate: (info: DebugInfo) => void }) {
  return (
    <>
      {/* Multiple light sources for maximum visibility */}
      <ambientLight intensity={1.0} />
      <directionalLight position={[10, 10, 10]} intensity={1.5} castShadow />
      <directionalLight position={[-10, 10, -10]} intensity={1.0} />
      <pointLight position={[0, 5, 0]} intensity={0.8} />
      <pointLight position={[5, 2, 5]} intensity={0.6} />
      <pointLight position={[-5, 2, -5]} intensity={0.6} />

      {/* Environment for reflections */}
      <Environment preset="warehouse" />

      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#404040" />
      </mesh>

      {/* Avatar */}
      <DebugAvatarMesh onDebugUpdate={onDebugUpdate} />
    </>
  );
}

/**
 * Main Debug Component
 */
export default function DebugAvatarTest({
  className,
  style = { width: "100%", height: "600px" },
}: DebugAvatarTestProps) {
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    avatarLoaded: false,
    sceneChildren: 0,
    boundingBox: "Not calculated",
    position: "0, 0, 0",
    scale: "1, 1, 1",
    rotation: "0, 0, 0",
    materials: 0,
    meshes: 0,
    bones: 0,
    animations: 0,
    animatorReady: false,
    errors: [],
  });

  const handleDebugUpdate = (info: DebugInfo) => {
    setDebugInfo(info);
  };

  return (
    <div
      className={className}
      style={{ ...style, position: "relative", background: "#222" }}
    >
      {/* Debug Panel */}
      <DebugPanel debugInfo={debugInfo} />

      {/* Camera Controls Info */}
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
        }}
      >
        <div><strong>Controls:</strong></div>
        <div>• Mouse: Rotate view</div>
        <div>• Scroll: Zoom in/out</div>
        <div>• Drag: Pan camera</div>
        <div>• Look for avatar between reference poles</div>
      </div>

      {/* Status Indicator */}
      <div
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          background: debugInfo.avatarLoaded ? "rgba(76, 175, 80, 0.8)" : "rgba(244, 67, 54, 0.8)",
          color: "white",
          padding: "8px 12px",
          borderRadius: "4px",
          fontSize: "12px",
          fontWeight: "bold",
        }}
      >
        {debugInfo.avatarLoaded ? "🟢 AVATAR LOADED" : "🔴 LOADING..."}
      </div>

      {/* 3D Canvas */}
      <Canvas
        shadows
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
          preserveDrawingBuffer: true,
        }}
        camera={{
          position: [3, 2, 6],
          fov: 75,
          near: 0.1,
          far: 1000,
        }}
        onCreated={({ camera }) => {
          camera.lookAt(0, 1, 0);
        }}
      >
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          target={[0, 1, 0]}
          minDistance={1}
          maxDistance={20}
          minPolarAngle={0}
          maxPolarAngle={Math.PI * 0.9}
        />

        <DebugScene onDebugUpdate={handleDebugUpdate} />
      </Canvas>
    </div>
  );
}

/**
 * Preload models
 */
useGLTF.preload("/models/player-ready-player-me.glb");
useGLTF.preload("/models/c-girl.glb");
