"use client";

import React, { useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Stats } from "@react-three/drei";
import { Object3D } from "three";
import { useActiveAvatarModel } from "@/src/hooks/useActiveAvatarModel";
import { useAvatarSelection } from "@/src/state/avatarSelectionStore";
import useAvatarAnimator from "@/hooks/useAvatarAnimator";
import {
  runAnimationTestSuite,
  testCriticalAnimations,
  logTestResults,
  testAnimationResolution,
} from "@/utils/animationTestUtils";
import { SemanticKeys } from "@/types/animationRegistry";

function DebugAvatar() {
  const { modelUrl, isFemale, avatarId } = useActiveAvatarModel();
  const { scene } = useGLTF(modelUrl);
  const avatarRef = React.useRef<Object3D>(null);
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [testResults, setTestResults] = useState<any>(null);

  // Initialize animator
  const animator = useAvatarAnimator(avatarRef.current, {
    autoPreload: true,
    enableIdleCycling: true,
    enableMicroExpressions: true,
    performanceMode: "quality",
    enableLogging: true, // Enable logging for debugging
  });

  // Update debug info
  useEffect(() => {
    const interval = setInterval(() => {
      if (animator) {
        const info = animator.getDebugInfo();
        setDebugInfo({
          ...info,
          isFemale,
          avatarId,
          modelUrl,
          animatorReady: animator.state.isReady,
          isPreloading: animator.state.isPreloading,
          preloadProgress: animator.state.preloadProgress,
          locomotionState: animator.state.locomotion,
          expressionState: animator.state.expression,
          emoteState: animator.state.emote,
        });
      }
    }, 500);

    return () => clearInterval(interval);
  }, [animator, isFemale, avatarId, modelUrl]);

  // Test animations when ready
  useEffect(() => {
    if (animator.state.isReady && !animator.state.isPreloading) {
      console.log("🎭 Animator ready, testing animations...");

      // Test idle first
      setTimeout(() => {
        console.log("Testing idle animation");
        animator.setLocomotionState("idle");
      }, 1000);

      // Test walk
      setTimeout(() => {
        console.log("Testing walk animation");
        animator.setLocomotionState("walking");
      }, 3000);

      // Test run
      setTimeout(() => {
        console.log("Testing run animation");
        animator.setLocomotionState("running");
      }, 5000);

      // Test talk
      setTimeout(() => {
        console.log("Testing talk animation");
        animator.startTalking(0.7);
      }, 7000);

      // Test celebrate
      setTimeout(() => {
        console.log("Testing celebrate animation");
        animator.triggerEmote("dance-casual");
      }, 9000);
    }
  }, [animator.state.isReady, animator.state.isPreloading]);

  // Run animation tests when avatar changes
  useEffect(() => {
    const runTests = async () => {
      if (isFemale) {
        console.log("🔍 Testing female animations...");
        const femaleResults = await testCriticalAnimations("feminine");
        setTestResults(femaleResults);
        logTestResults(femaleResults, "Female Animation Test Results");

        // Test specific animation resolution
        const idleResolution = testAnimationResolution(
          SemanticKeys.LOCOMOTION_IDLE_PRIMARY,
          "feminine",
        );
        console.log("Idle animation resolution:", idleResolution);
      } else {
        console.log("🔍 Testing male animations...");
        const maleResults = await testCriticalAnimations("masculine");
        setTestResults(maleResults);
        logTestResults(maleResults, "Male Animation Test Results");
      }
    };

    runTests();
  }, [isFemale, avatarId]);

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

export default function DebugFemaleAnimations() {
  const selection = useAvatarSelection();
  const [logs, setLogs] = useState<string[]>([]);

  // Capture console logs
  useEffect(() => {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    const captureLog = (level: string, ...args: any[]) => {
      const message = `[${level}] ${args.join(" ")}`;
      setLogs((prev) => [...prev.slice(-20), message]); // Keep last 20 logs
    };

    console.log = (...args) => {
      originalLog(...args);
      captureLog("LOG", ...args);
    };

    console.warn = (...args) => {
      originalWarn(...args);
      captureLog("WARN", ...args);
    };

    console.error = (...args) => {
      originalError(...args);
      captureLog("ERROR", ...args);
    };

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);

  return (
    <div className="w-full h-screen flex">
      {/* 3D Scene */}
      <div className="flex-1">
        <Canvas shadows camera={{ position: [0, 1.5, 3], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
          <DebugAvatar />
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
          />
          <Stats />
        </Canvas>
      </div>

      {/* Debug Panel */}
      <div className="w-96 bg-gray-900 text-white p-4 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Female Animation Debug</h2>

        {/* Avatar Controls */}
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

        {/* Debug Info */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Debug Info</h3>
          <div className="text-xs space-y-1">
            <div>Current: {selection.current}</div>
            <div>
              Is Female: {String(selection.current === "female-c-girl")}
            </div>
          </div>
        </div>

        {/* Test Results */}
        {testResults && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">
              Animation Test Results
            </h3>
            <div className="bg-gray-800 p-2 rounded text-xs">
              <div>Gender: {testResults.gender}</div>
              <div>
                Success Rate: {testResults.summary.successful}/
                {testResults.summary.total}
              </div>
              {testResults.summary.errors.length > 0 && (
                <div className="mt-2">
                  <div className="text-red-400">Errors:</div>
                  {testResults.summary.errors.map(
                    (error: string, index: number) => (
                      <div key={index} className="text-red-300 ml-2">
                        • {error}
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Manual Test Buttons */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Manual Tests</h3>
          <div className="space-y-2">
            <button
              onClick={() => runAnimationTestSuite()}
              className="w-full p-2 bg-blue-600 hover:bg-blue-500 rounded text-sm"
            >
              Run Full Test Suite
            </button>
            <button
              onClick={async () => {
                const gender =
                  selection.current === "female-c-girl"
                    ? "feminine"
                    : "masculine";
                const results = await testCriticalAnimations(gender);
                setTestResults(results);
                logTestResults(results);
              }}
              className="w-full p-2 bg-green-600 hover:bg-green-500 rounded text-sm"
            >
              Test Critical Animations
            </button>
          </div>
        </div>

        {/* Console Logs */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Console Logs</h3>
          <div className="bg-black p-2 rounded text-xs h-64 overflow-y-auto font-mono">
            {logs.map((log, index) => (
              <div
                key={index}
                className={`mb-1 ${
                  log.includes("[ERROR]")
                    ? "text-red-400"
                    : log.includes("[WARN]")
                      ? "text-yellow-400"
                      : "text-green-400"
                }`}
              >
                {log}
              </div>
            ))}
          </div>
        </div>

        {/* Clear Logs */}
        <button
          onClick={() => setLogs([])}
          className="w-full p-2 bg-red-600 hover:bg-red-500 rounded"
        >
          Clear Logs
        </button>
      </div>
    </div>
  );
}
