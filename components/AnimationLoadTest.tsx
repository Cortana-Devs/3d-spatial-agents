"use client";

import React, { useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { Object3D, AnimationMixer, AnimationAction } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { useActiveAvatarModel } from "@/src/hooks/useActiveAvatarModel";
import { useAvatarSelection } from "@/src/state/avatarSelectionStore";

interface TestResult {
  gender: string;
  animationFile: string;
  success: boolean;
  error?: string;
  animationCount?: number;
  duration?: number;
}

function DirectAnimationTest() {
  const { modelUrl, isFemale, avatarId } = useActiveAvatarModel();
  const { scene } = useGLTF(modelUrl);
  const avatarRef = React.useRef<Object3D>(null);
  const mixerRef = React.useRef<AnimationMixer | null>(null);
  const [currentAction, setCurrentAction] = React.useState<AnimationAction | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize mixer
  useEffect(() => {
    if (avatarRef.current && !mixerRef.current) {
      mixerRef.current = new AnimationMixer(avatarRef.current);
      console.log("🎭 Animation mixer initialized");
    }

    return () => {
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
        mixerRef.current = null;
      }
    };
  }, [avatarRef.current]);

  // Test specific animation file
  const testAnimationFile = async (animationPath: string, description: string) => {
    if (!mixerRef.current) {
      console.error("No mixer available");
      return;
    }

    setIsLoading(true);
    const startTime = Date.now();

    try {
      console.log(`🔍 Testing ${description}: ${animationPath}`);

      const loader = new GLTFLoader();
      const gltf = await new Promise((resolve, reject) => {
        loader.load(animationPath, resolve, undefined, reject);
      });

      const duration = Date.now() - startTime;
      const animationCount = gltf.animations?.length || 0;

      if (animationCount === 0) {
        throw new Error("No animations found in GLTF file");
      }

      // Try to play the animation
      const clip = gltf.animations[0];
      const action = mixerRef.current.clipAction(clip);

      // Stop current action
      if (currentAction) {
        currentAction.fadeOut(0.3);
      }

      // Play new action
      action.reset();
      action.fadeIn(0.3);
      action.play();
      setCurrentAction(action);

      const result: TestResult = {
        gender: isFemale ? "feminine" : "masculine",
        animationFile: description,
        success: true,
        animationCount,
        duration,
      };

      setTestResults(prev => [...prev, result]);
      console.log(`✅ ${description} loaded successfully`, result);

    } catch (error) {
      const result: TestResult = {
        gender: isFemale ? "feminine" : "masculine",
        animationFile: description,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };

      setTestResults(prev => [...prev, result]);
      console.error(`❌ ${description} failed:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update mixer on each frame
  useEffect(() => {
    let animationId: number;

    const animate = (time: number) => {
      if (mixerRef.current) {
        mixerRef.current.update(0.016); // 60fps
      }
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  return (
    <group>
      <primitive
        ref={avatarRef}
        object={scene}
        scale={[1, 1, 1]}
        position={[0, 0, 0]}
      />
    </group>
  );
}

export default function AnimationLoadTest() {
  const selection = useAvatarSelection();
  const { isFemale } = useActiveAvatarModel();
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  // Animation paths to test
  const testAnimations = {
    feminine: {
      idle: "/animations/animation-library-master/feminine/glb/idle/F_Standing_Idle_001.glb",
      walk: "/animations/animation-library-master/feminine/glb/locomotion/F_Walk_002.glb",
      run: "/animations/animation-library-master/feminine/glb/locomotion/F_Run_001.glb",
      talk: "/animations/animation-library-master/feminine/glb/expression/F_Talking_Variations_001.glb",
      dance: "/animations/animation-library-master/feminine/glb/dance/F_Dances_001.glb",
    },
    masculine: {
      idle: "/animations/animation-library-master/masculine/glb/idle/M_Standing_Idle_001.glb",
      walk: "/animations/animation-library-master/masculine/glb/locomotion/M_Walk_002.glb",
      run: "/animations/animation-library-master/masculine/glb/locomotion/M_Run_001.glb",
      talk: "/animations/animation-library-master/masculine/glb/expression/M_Talking_Variations_001.glb",
      dance: "/animations/animation-library-master/masculine/glb/dance/M_Dances_001.glb",
    },
  };

  const currentAnimations = isFemale ? testAnimations.feminine : testAnimations.masculine;

  const testAllAnimations = async () => {
    setTestResults([]);

    for (const [name, path] of Object.entries(currentAnimations)) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Delay between tests

      try {
        console.log(`Testing ${name}: ${path}`);
        const loader = new GLTFLoader();

        const startTime = Date.now();
        const gltf = await new Promise((resolve, reject) => {
          loader.load(path, resolve, undefined, reject);
        });
        const duration = Date.now() - startTime;

        const result: TestResult = {
          gender: isFemale ? "feminine" : "masculine",
          animationFile: `${name} (${path})`,
          success: true,
          animationCount: gltf.animations?.length || 0,
          duration,
        };

        setTestResults(prev => [...prev, result]);
        console.log(`✅ ${name} loaded successfully`);

      } catch (error) {
        const result: TestResult = {
          gender: isFemale ? "feminine" : "masculine",
          animationFile: `${name} (${path})`,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };

        setTestResults(prev => [...prev, result]);
        console.error(`❌ ${name} failed:`, error);
      }
    }
  };

  return (
    <div className="w-full h-screen flex">
      {/* 3D Scene */}
      <div className="flex-1">
        <Canvas shadows camera={{ position: [0, 1.5, 3], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
          <DirectAnimationTest />
          <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
        </Canvas>
      </div>

      {/* Control Panel */}
      <div className="w-96 bg-gray-900 text-white p-4 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Animation Load Test</h2>

        {/* Avatar Selection */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Avatar Selection</h3>
          <div className="space-y-2">
            <button
              onClick={() => selection.setAvatar("male-default")}
              className={`w-full p-2 rounded ${
                selection.current === "male-default"
                  ? "bg-blue-600"
                  : "bg-gray-600 hover:bg-gray-500"
              }`}
            >
              Male Avatar
            </button>
            <button
              onClick={() => selection.setAvatar("female-c-girl")}
              className={`w-full p-2 rounded ${
                selection.current === "female-c-girl"
                  ? "bg-pink-600"
                  : "bg-gray-600 hover:bg-gray-500"
              }`}
            >
              Female Avatar
            </button>
          </div>
        </div>

        {/* Test Controls */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Test Controls</h3>
          <button
            onClick={testAllAnimations}
            className="w-full p-2 bg-green-600 hover:bg-green-500 rounded"
          >
            Test All Animations
          </button>
        </div>

        {/* Current Info */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Current Info</h3>
          <div className="text-sm space-y-1">
            <div>Avatar: {selection.current}</div>
            <div>Gender: {isFemale ? "Female" : "Male"}</div>
            <div>Testing: {isFemale ? "Feminine" : "Masculine"} animations</div>
          </div>
        </div>

        {/* Test Results */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Test Results</h3>
          <div className="space-y-2">
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`p-2 rounded text-xs ${
                  result.success ? "bg-green-800" : "bg-red-800"
                }`}
              >
                <div className="font-semibold">
                  {result.success ? "✅" : "❌"} {result.animationFile}
                </div>
                {result.success ? (
                  <div className="text-green-200">
                    {result.animationCount} animations, {result.duration}ms
                  </div>
                ) : (
                  <div className="text-red-200">{result.error}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        {testResults.length > 0 && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Summary</h3>
            <div className="text-sm">
              <div>
                Success: {testResults.filter(r => r.success).length}/{testResults.length}
              </div>
              <div>
                Failed: {testResults.filter(r => !r.success).length}/{testResults.length}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
