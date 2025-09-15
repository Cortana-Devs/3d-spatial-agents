/**
 * AnimatedAvatar Component
 * ========================
 *
 * A comprehensive avatar component that showcases the new semantic animation system
 * with gender-aware resolution, multi-layer blending, and intelligent liveliness.
 *
 * Features:
 * - Automatic gender-aware animation loading
 * - Real-time animation controls and state management
 * - Performance monitoring and debug information
 * - Preloading progress indication
 * - Interactive emote and expression triggers
 * - Seamless integration with avatar selection system
 */

import React, { useRef, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment, Stats } from "@react-three/drei";
import { Object3D, Vector3 } from "three";
import { useActiveAvatarModel } from "../src/hooks/useActiveAvatarModel";
import useAvatarAnimator, {
  LocomotionState,
  ExpressionState,
  EmoteState,
  UseAvatarAnimatorOptions,
} from "../hooks/useAvatarAnimator";
import { AvatarSelector } from "../src/state/avatarSelectionStore";

/**
 * Component props
 */
interface AnimatedAvatarProps {
  // Animation system options
  animatorOptions?: UseAvatarAnimatorOptions;

  // Scene options
  showStats?: boolean;
  showControls?: boolean;
  showEnvironment?: boolean;

  // Canvas options
  shadows?: boolean;
  antialias?: boolean;

  // Debug options
  showDebugInfo?: boolean;
  enableLogging?: boolean;

  // Style
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Control panel for testing animations
 */
interface ControlPanelProps {
  animator: ReturnType<typeof useAvatarAnimator> | null;
  isVisible: boolean;
}

function ControlPanel({ animator, isVisible }: ControlPanelProps) {
  const [velocity, setVelocity] = useState({ x: 0, y: 0, z: 0 });
  const [showDebug, setShowDebug] = useState(false);

  if (!isVisible || !animator) return null;

  const debugInfo = animator.getDebugInfo();

  const handleVelocityChange = (axis: "x" | "y" | "z", value: number) => {
    const newVelocity = { ...velocity, [axis]: value };
    setVelocity(newVelocity);
    animator.setVelocity(
      new Vector3(newVelocity.x, newVelocity.y, newVelocity.z),
    );
  };

  const locomotionStates: LocomotionState[] = [
    "idle",
    "walking",
    "jogging",
    "running",
    "crouching",
  ];
  const expressionStates: ExpressionState[] = [
    "neutral",
    "happy",
    "surprised",
    "thinking",
    "confused",
    "excited",
  ];
  const emoteStates: EmoteState[] = [
    "none",
    "dance-casual",
    "dance-energetic",
    "dance-rhythmic",
    "dance-freestyle",
  ];

  return (
    <div
      className="animation-controls"
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
        maxWidth: "300px",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          margin: "0 0 12px 0",
          color: "#4CAF50",
          fontSize: "14px",
          fontWeight: "bold",
        }}
      >
        Animation Controls
      </div>

      {/* Avatar Selection */}
      <div style={{ marginBottom: "16px" }}>
        <label
          style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}
        >
          Avatar:
        </label>
        <AvatarSelector />
      </div>

      {/* Preload Status */}
      {animator.state.isPreloading && (
        <div style={{ marginBottom: "16px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "4px",
              fontWeight: "bold",
            }}
          >
            Preloading:
          </label>
          <div
            style={{
              width: "100%",
              height: "8px",
              backgroundColor: "#333",
              borderRadius: "4px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${animator.state.preloadProgress * 100}%`,
                height: "100%",
                backgroundColor: "#4CAF50",
                transition: "width 0.2s ease",
              }}
            />
          </div>
          <span style={{ fontSize: "10px", opacity: 0.7 }}>
            {Math.round(animator.state.preloadProgress * 100)}%
          </span>
        </div>
      )}

      {/* Current State */}
      <div style={{ marginBottom: "16px" }}>
        <label
          style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}
        >
          Current State:
        </label>
        <div style={{ fontSize: "11px", opacity: 0.8 }}>
          <div>Locomotion: {animator.state.locomotion}</div>
          <div>Expression: {animator.state.expression}</div>
          <div>Emote: {animator.state.emote}</div>
          <div>Speed: {animator.state.speed.toFixed(2)}</div>
        </div>
      </div>

      {/* Velocity Control */}
      <div style={{ marginBottom: "16px" }}>
        <label
          style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}
        >
          Velocity:
        </label>
        {["x", "y", "z"].map((axis) => (
          <div key={axis} style={{ marginBottom: "4px" }}>
            <label style={{ display: "inline-block", width: "12px" }}>
              {axis}:
            </label>
            <input
              type="range"
              min="-5"
              max="5"
              step="0.1"
              value={velocity[axis as keyof typeof velocity]}
              onChange={(e) =>
                handleVelocityChange(
                  axis as "x" | "y" | "z",
                  parseFloat(e.target.value),
                )
              }
              style={{ width: "80px", marginLeft: "8px" }}
            />
            <span style={{ marginLeft: "8px", fontSize: "10px" }}>
              {velocity[axis as keyof typeof velocity].toFixed(1)}
            </span>
          </div>
        ))}
      </div>

      {/* Locomotion States */}
      <div style={{ marginBottom: "16px" }}>
        <label
          style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}
        >
          Locomotion:
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
          {locomotionStates.map((state) => (
            <button
              key={state}
              onClick={() => animator.setLocomotionState(state)}
              style={{
                padding: "2px 6px",
                fontSize: "10px",
                border: "none",
                borderRadius: "3px",
                backgroundColor:
                  animator.state.locomotion === state ? "#4CAF50" : "#555",
                color: "white",
                cursor: "pointer",
              }}
            >
              {state}
            </button>
          ))}
        </div>
      </div>

      {/* Expression States */}
      <div style={{ marginBottom: "16px" }}>
        <label
          style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}
        >
          Expression:
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
          {expressionStates.map((state) => (
            <button
              key={state}
              onClick={() => animator.setExpressionState(state)}
              style={{
                padding: "2px 6px",
                fontSize: "10px",
                border: "none",
                borderRadius: "3px",
                backgroundColor:
                  animator.state.expression === state ? "#2196F3" : "#555",
                color: "white",
                cursor: "pointer",
              }}
            >
              {state}
            </button>
          ))}
        </div>
      </div>

      {/* Emote States */}
      <div style={{ marginBottom: "16px" }}>
        <label
          style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}
        >
          Emotes:
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
          {emoteStates.map((state) => (
            <button
              key={state}
              onClick={() => animator.setEmoteState(state)}
              style={{
                padding: "2px 6px",
                fontSize: "10px",
                border: "none",
                borderRadius: "3px",
                backgroundColor:
                  animator.state.emote === state ? "#FF9800" : "#555",
                color: "white",
                cursor: "pointer",
              }}
            >
              {state}
            </button>
          ))}
        </div>
      </div>

      {/* Talking Control */}
      <div style={{ marginBottom: "16px" }}>
        <label
          style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}
        >
          Talking:
        </label>
        <div style={{ display: "flex", gap: "4px" }}>
          <button
            onClick={() => animator.startTalking(0.3)}
            style={{
              padding: "4px 8px",
              fontSize: "10px",
              border: "none",
              borderRadius: "3px",
              backgroundColor: "#E91E63",
              color: "white",
              cursor: "pointer",
            }}
          >
            Start
          </button>
          <button
            onClick={() => animator.stopTalking()}
            style={{
              padding: "4px 8px",
              fontSize: "10px",
              border: "none",
              borderRadius: "3px",
              backgroundColor: "#757575",
              color: "white",
              cursor: "pointer",
            }}
          >
            Stop
          </button>
        </div>
      </div>

      {/* Actions */}
      <div style={{ marginBottom: "16px" }}>
        <label
          style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}
        >
          Actions:
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
          <button
            onClick={() => animator.triggerIdleVariation()}
            style={{
              padding: "4px 8px",
              fontSize: "10px",
              border: "none",
              borderRadius: "3px",
              backgroundColor: "#795548",
              color: "white",
              cursor: "pointer",
            }}
          >
            Idle Variation
          </button>
          <button
            onClick={() => animator.setCrouch(!animator.state.isCrouching)}
            style={{
              padding: "4px 8px",
              fontSize: "10px",
              border: "none",
              borderRadius: "3px",
              backgroundColor: animator.state.isCrouching
                ? "#FF5722"
                : "#607D8B",
              color: "white",
              cursor: "pointer",
            }}
          >
            {animator.state.isCrouching ? "Stand" : "Crouch"}
          </button>
        </div>
      </div>

      {/* Debug Toggle */}
      <div style={{ marginBottom: "8px" }}>
        <button
          onClick={() => setShowDebug(!showDebug)}
          style={{
            padding: "4px 8px",
            fontSize: "10px",
            border: "none",
            borderRadius: "3px",
            backgroundColor: showDebug ? "#9C27B0" : "#424242",
            color: "white",
            cursor: "pointer",
          }}
        >
          {showDebug ? "Hide Debug" : "Show Debug"}
        </button>
      </div>

      {/* Debug Information */}
      {showDebug && (
        <div
          style={{
            background: "rgba(0, 0, 0, 0.5)",
            padding: "8px",
            borderRadius: "4px",
            fontSize: "10px",
            maxHeight: "200px",
            overflow: "auto",
          }}
        >
          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

/**
 * Avatar mesh component that uses the animation system
 * This component MUST be inside the Canvas to use R3F hooks
 */
function AvatarMesh({
  onAnimatorReady,
}: {
  onAnimatorReady?: (animator: ReturnType<typeof useAvatarAnimator>) => void;
}) {
  const { modelUrl, isFemale, avatarId } = useActiveAvatarModel();
  const { scene } = useGLTF(modelUrl);
  const avatarRef = useRef<Object3D>(null);

  // Initialize animator with the loaded scene - this must be inside Canvas
  const animator = useAvatarAnimator(avatarRef.current, {
    autoPreload: true,
    enableIdleCycling: true,
    enableMicroExpressions: true,
    performanceMode: "balanced",
    enableLogging: true,
  });

  useEffect(() => {
    if (avatarRef.current && scene) {
      // Ensure the animator has the latest scene reference
      avatarRef.current.clear();
      avatarRef.current.add(scene.clone());
    }
  }, [scene, avatarId]);

  // Auto-start with idle animation when ready
  useEffect(() => {
    if (animator.state.isReady && !animator.state.isPreloading) {
      animator.setLocomotionState("idle");
    }
  }, [animator.state.isReady, animator.state.isPreloading]);

  // Notify parent component about animator
  useEffect(() => {
    if (onAnimatorReady && animator) {
      onAnimatorReady(animator);
    }
  }, [onAnimatorReady, animator]);

  return <primitive ref={avatarRef} object={new Object3D()} />;
}

/**
 * Scene setup component
 */
function Scene({
  showEnvironment,
  showStats,
  onAnimatorReady,
}: {
  showEnvironment: boolean;
  showStats: boolean;
  onAnimatorReady?: (animator: ReturnType<typeof useAvatarAnimator>) => void;
}) {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[-5, 5, 5]} intensity={0.5} />

      {/* Environment */}
      {showEnvironment && <Environment preset="studio" />}

      {/* Avatar */}
      <AvatarMesh onAnimatorReady={onAnimatorReady} />

      {/* Performance stats */}
      {showStats && <Stats />}
    </>
  );
}

/**
 * Main AnimatedAvatar component
 */
export default function AnimatedAvatar({
  animatorOptions = {},
  showStats = false,
  showControls = true,
  showEnvironment = true,
  shadows = true,
  antialias = true,
  showDebugInfo = false,
  enableLogging = false,
  className,
  style = { width: "100%", height: "600px" },
}: AnimatedAvatarProps) {
  const [animator, setAnimator] = useState<ReturnType<
    typeof useAvatarAnimator
  > | null>(null);

  const handleAnimatorReady = (
    animatorInstance: ReturnType<typeof useAvatarAnimator>,
  ) => {
    setAnimator(animatorInstance);
  };

  return (
    <div className={className} style={{ ...style, position: "relative" }}>
      {/* Control Panel - Outside Canvas */}
      <ControlPanel animator={animator} isVisible={showControls} />

      <Canvas
        shadows={shadows}
        gl={{ antialias }}
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

        {/* Scene */}
        <Scene
          showEnvironment={showEnvironment}
          showStats={showStats}
          onAnimatorReady={handleAnimatorReady}
        />
      </Canvas>
    </div>
  );
}

/**
 * Preload avatar models for better performance
 */
useGLTF.preload("/models/player-ready-player-me.glb");
useGLTF.preload("/models/c-girl.glb");
