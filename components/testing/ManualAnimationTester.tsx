"use client";

import React, { useState, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment, Stats } from "@react-three/drei";
import { Object3D, Vector3 } from "three";
import { useActiveAvatarModel } from "../../src/hooks/useActiveAvatarModel";
import useAvatarAnimator from "../../hooks/useAvatarAnimator";
import { ANIMATION_REGISTRY } from "../../data/animationRegistry";
import { SemanticKeys } from "../../types/animationRegistry";

/**
 * Manual Animation Tester
 * =======================
 *
 * Simple, user-friendly interface for manually testing avatar animations.
 * Perfect for quick testing and demonstration purposes.
 */

interface ManualAnimationTesterProps {
  className?: string;
  style?: React.CSSProperties;
  showStats?: boolean;
  showControls?: boolean;
}

/**
 * Avatar component with animation system - MUST be inside Canvas
 */
function AnimatedAvatarMesh({ onAnimatorReady }: { onAnimatorReady: (animator: any) => void }) {
  const { modelUrl, avatarId } = useActiveAvatarModel();
  const { scene } = useGLTF(modelUrl);
  const avatarRef = useRef<Object3D>(null);

  const animator = useAvatarAnimator(avatarRef.current, {
    autoPreload: true,
    enableIdleCycling: true,
    enableMicroExpressions: true,
    performanceMode: "balanced",
    enableLogging: false,
  });

  useEffect(() => {
    if (avatarRef.current && scene) {
      avatarRef.current.clear();
      avatarRef.current.add(scene.clone());
    }
  }, [scene, avatarId]);

  useEffect(() => {
    if (onAnimatorReady && animator) {
      onAnimatorReady(animator);
    }
  }, [onAnimatorReady, animator]);

  // Auto-start with idle when ready
  useEffect(() => {
    if (animator.state.isReady && !animator.state.isPreloading) {
      animator.setLocomotionState("idle");
    }
  }, [animator.state.isReady, animator.state.isPreloading]);

  return <primitive ref={avatarRef} object={new Object3D()} />;
}

/**
 * Simple Animation Controls Panel
 */
function SimpleControlPanel({ animator }: { animator: any }) {
  const [velocity, setVelocity] = useState({ x: 0, y: 0, z: 0 });
  const [currentAnimation, setCurrentAnimation] = useState<string>('idle');

  if (!animator) {
    return (
      <div className="absolute top-4 left-4 bg-black/80 text-white p-4 rounded-lg text-sm">
        Loading animator...
      </div>
    );
  }

  const locomotionStates = [
    { key: 'idle', label: 'Idle', color: '#4CAF50' },
    { key: 'walking', label: 'Walking', color: '#2196F3' },
    { key: 'jogging', label: 'Jogging', color: '#FF9800' },
    { key: 'running', label: 'Running', color: '#f44336' },
    { key: 'crouching', label: 'Crouching', color: '#9C27B0' },
  ];

  const expressionStates = [
    { key: 'neutral', label: 'Neutral', color: '#607D8B' },
    { key: 'happy', label: 'Happy', color: '#FFEB3B' },
    { key: 'surprised', label: 'Surprised', color: '#E91E63' },
    { key: 'thinking', label: 'Thinking', color: '#3F51B5' },
    { key: 'confused', label: 'Confused', color: '#795548' },
    { key: 'excited', label: 'Excited', color: '#FF5722' },
  ];

  const emoteStates = [
    { key: 'none', label: 'None', color: '#666' },
    { key: 'dance-casual', label: 'Dance Casual', color: '#4CAF50' },
    { key: 'dance-energetic', label: 'Dance Energetic', color: '#FF9800' },
    { key: 'dance-rhythmic', label: 'Dance Rhythmic', color: '#E91E63' },
    { key: 'dance-freestyle', label: 'Dance Freestyle', color: '#9C27B0' },
  ];

  const testAnimations = [
    { key: SemanticKeys.LOCOMOTION_IDLE_PRIMARY, label: 'Basic Idle' },
    { key: SemanticKeys.LOCOMOTION_WALK_FORWARD_NORMAL, label: 'Walk Forward' },
    { key: SemanticKeys.LOCOMOTION_JOG_FORWARD, label: 'Jog Forward' },
    { key: SemanticKeys.LOCOMOTION_RUN_FORWARD, label: 'Run Forward' },
    { key: SemanticKeys.EXPRESSION_TALK_VARIANT_1, label: 'Talk Animation' },
    { key: SemanticKeys.EMOTE_DANCE_CASUAL_1, label: 'Casual Dance' },
  ];

  const handleVelocityChange = (axis: 'x' | 'y' | 'z', value: number) => {
    const newVelocity = { ...velocity, [axis]: value };
    setVelocity(newVelocity);
    animator.setVelocity(new Vector3(newVelocity.x, newVelocity.y, newVelocity.z));
  };

  const playDirectAnimation = (animationKey: string) => {
    try {
      animator.playAnimation(animationKey, 'fullbody', 0.3);
      setCurrentAnimation(animationKey);
    } catch (error) {
      console.warn(`Failed to play animation: ${animationKey}`, error);
    }
  };

  return (
    <div className="absolute top-4 left-4 bg-black/90 text-white p-4 rounded-lg text-sm max-w-xs max-h-[80vh] overflow-y-auto">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🎮</span>
        <h3 className="font-bold text-green-400">Animation Controls</h3>
      </div>

      {/* Current Status */}
      <div className="mb-4 p-2 bg-white/10 rounded text-xs">
        <div><strong>Status:</strong> {animator.state?.isReady ? '✅ Ready' : '⏳ Loading'}</div>
        <div><strong>Current:</strong> {currentAnimation}</div>
        <div><strong>Speed:</strong> {animator.state?.speed?.toFixed(2) || '0.00'}</div>
      </div>

      {/* Locomotion States */}
      <div className="mb-4">
        <h4 className="font-semibold mb-2 text-blue-400">🚶 Locomotion:</h4>
        <div className="grid grid-cols-2 gap-1">
          {locomotionStates.map((state) => (
            <button
              key={state.key}
              onClick={() => {
                animator.setLocomotionState(state.key);
                setCurrentAnimation(state.key);
              }}
              className="px-2 py-1 rounded text-xs transition-all hover:scale-105"
              style={{
                backgroundColor: animator.state?.locomotion === state.key ? state.color : '#333',
                color: 'white',
              }}
            >
              {state.label}
            </button>
          ))}
        </div>
      </div>

      {/* Expression States */}
      <div className="mb-4">
        <h4 className="font-semibold mb-2 text-yellow-400">😊 Expressions:</h4>
        <div className="grid grid-cols-2 gap-1">
          {expressionStates.map((state) => (
            <button
              key={state.key}
              onClick={() => {
                animator.setExpressionState(state.key);
                setCurrentAnimation(`expression.${state.key}`);
              }}
              className="px-2 py-1 rounded text-xs transition-all hover:scale-105"
              style={{
                backgroundColor: animator.state?.expression === state.key ? state.color : '#333',
                color: 'white',
              }}
            >
              {state.label}
            </button>
          ))}
        </div>
      </div>

      {/* Emote States */}
      <div className="mb-4">
        <h4 className="font-semibold mb-2 text-purple-400">💃 Emotes:</h4>
        <div className="grid grid-cols-1 gap-1">
          {emoteStates.map((state) => (
            <button
              key={state.key}
              onClick={() => {
                animator.setEmoteState(state.key);
                setCurrentAnimation(`emote.${state.key}`);
              }}
              className="px-2 py-1 rounded text-xs transition-all hover:scale-105"
              style={{
                backgroundColor: animator.state?.emote === state.key ? state.color : '#333',
                color: 'white',
              }}
            >
              {state.label}
            </button>
          ))}
        </div>
      </div>

      {/* Direct Animation Tests */}
      <div className="mb-4">
        <h4 className="font-semibold mb-2 text-red-400">🎬 Direct Tests:</h4>
        <div className="space-y-1">
          {testAnimations.map((anim) => (
            <button
              key={anim.key}
              onClick={() => playDirectAnimation(anim.key)}
              className="w-full px-2 py-1 bg-red-600 hover:bg-red-500 rounded text-xs transition-all hover:scale-105"
            >
              ▶️ {anim.label}
            </button>
          ))}
        </div>
      </div>

      {/* Talking Controls */}
      <div className="mb-4">
        <h4 className="font-semibold mb-2 text-pink-400">💬 Talking:</h4>
        <div className="grid grid-cols-2 gap-1">
          <button
            onClick={() => {
              animator.startTalking(0.5);
              setCurrentAnimation('talking');
            }}
            className="px-2 py-1 bg-pink-600 hover:bg-pink-500 rounded text-xs transition-all hover:scale-105"
          >
            Start Talk
          </button>
          <button
            onClick={() => {
              animator.stopTalking();
              setCurrentAnimation('stopped talking');
            }}
            className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs transition-all hover:scale-105"
          >
            Stop Talk
          </button>
        </div>
      </div>

      {/* Velocity Controls */}
      <div className="mb-4">
        <h4 className="font-semibold mb-2 text-cyan-400">⚡ Velocity:</h4>
        {['x', 'y', 'z'].map((axis) => (
          <div key={axis} className="mb-2">
            <label className="block text-xs mb-1">{axis.toUpperCase()}:</label>
            <input
              type="range"
              min="-3"
              max="3"
              step="0.1"
              value={velocity[axis as keyof typeof velocity]}
              onChange={(e) => handleVelocityChange(axis as 'x' | 'y' | 'z', parseFloat(e.target.value))}
              className="w-full"
            />
            <span className="text-xs text-gray-400">
              {velocity[axis as keyof typeof velocity].toFixed(1)}
            </span>
          </div>
        ))}
      </div>

      {/* Special Actions */}
      <div>
        <h4 className="font-semibold mb-2 text-orange-400">🎯 Actions:</h4>
        <div className="space-y-1">
          <button
            onClick={() => {
              animator.triggerIdleVariation();
              setCurrentAnimation('idle variation');
            }}
            className="w-full px-2 py-1 bg-orange-600 hover:bg-orange-500 rounded text-xs transition-all hover:scale-105"
          >
            🔄 Idle Variation
          </button>
          <button
            onClick={() => {
              const newCrouchState = !animator.state?.isCrouching;
              animator.setCrouch(newCrouchState);
              setCurrentAnimation(newCrouchState ? 'crouching' : 'standing');
            }}
            className="w-full px-2 py-1 bg-purple-600 hover:bg-purple-500 rounded text-xs transition-all hover:scale-105"
          >
            {animator.state?.isCrouching ? '🧍 Stand Up' : '🦆 Crouch'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Scene Component
 */
function TestScene({
  onAnimatorReady,
  showStats
}: {
  onAnimatorReady: (animator: any) => void;
  showStats: boolean;
}) {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[-5, 5, 5]} intensity={0.3} />

      {/* Environment */}
      <Environment preset="studio" />

      {/* Avatar */}
      <AnimatedAvatarMesh onAnimatorReady={onAnimatorReady} />

      {/* Performance Stats */}
      {showStats && <Stats />}
    </>
  );
}

/**
 * Main Manual Animation Tester Component
 */
export default function ManualAnimationTester({
  className,
  style = { width: "100%", height: "600px" },
  showStats = false,
  showControls = true,
}: ManualAnimationTesterProps) {
  const [animator, setAnimator] = useState<any>(null);

  const handleAnimatorReady = (animatorInstance: any) => {
    setAnimator(animatorInstance);
  };

  return (
    <div className={className} style={{ ...style, position: "relative", background: '#111' }}>
      {/* Controls */}
      {showControls && <SimpleControlPanel animator={animator} />}

      {/* Avatar Status */}
      <div className="absolute top-4 right-4 bg-black/80 text-white p-3 rounded-lg text-xs">
        <div className="flex items-center gap-2">
          <span className="text-green-400">●</span>
          <span>Avatar: {animator?.state?.isReady ? 'Ready' : 'Loading...'}</span>
        </div>
        {animator?.state?.isPreloading && (
          <div className="mt-2">
            <div className="w-24 h-1 bg-gray-700 rounded">
              <div
                className="h-1 bg-green-400 rounded transition-all duration-300"
                style={{ width: `${(animator.state.preloadProgress || 0) * 100}%` }}
              />
            </div>
            <div className="text-xs mt-1 text-gray-400">
              {Math.round((animator.state.preloadProgress || 0) * 100)}%
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 bg-black/80 text-white p-3 rounded-lg text-xs max-w-sm">
        <div className="font-semibold mb-2 text-blue-400">💡 Quick Guide:</div>
        <ul className="space-y-1 text-gray-300">
          <li>• Use locomotion buttons for movement states</li>
          <li>• Try expressions for facial animations</li>
          <li>• Test emotes for dance animations</li>
          <li>• Direct tests play specific animations</li>
          <li>• Adjust velocity for movement intensity</li>
        </ul>
      </div>

      {/* 3D Canvas */}
      <Canvas
        shadows
        gl={{ antialias: true }}
        camera={{ position: [0, 1.6, 4], fov: 50 }}
      >
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          target={[0, 1, 0]}
        />

        <TestScene
          onAnimatorReady={handleAnimatorReady}
          showStats={showStats}
        />
      </Canvas>
    </div>
  );
}
