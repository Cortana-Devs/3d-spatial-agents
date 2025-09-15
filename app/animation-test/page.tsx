"use client";

import React, { useEffect } from "react";
import { ActiveAvatarModelProvider } from "@/src/hooks/useActiveAvatarModel";
import StableAvatarTest from "@/components/testing/StableAvatarTest";
import ConsoleSpamController from "@/components/dev/ConsoleSpamController";

export default function AnimationTestPage() {
  // Auto-disable spam based on environment variables or URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const autoDisable =
      process.env.NEXT_PUBLIC_AUTO_DISABLE_SPAM === "true" ||
      urlParams.get("nospam") === "true" ||
      urlParams.get("devlog") === "false";

    if (autoDisable) {
      // Disable dev logger
      try {
        if (window.__DEV_LOGS__) {
          window.__DEV_LOGS__.disable();
        }
        localStorage.setItem("__DEV_LOG_ENABLED__", "0");

        // Also suppress React DevTools and animation spam
        const originalWarn = console.warn;
        console.warn = (...args: any[]) => {
          const message = args.join(" ");
          if (
            message.includes("React DevTools") ||
            message.includes("[DEV") ||
            message.includes("🎭") ||
            message.includes("🎬") ||
            message.includes("Performance warning")
          ) {
            return;
          }
          originalWarn(...args);
        };
      } catch (error) {
        console.error("Failed to auto-disable spam:", error);
      }
    }
  }, []);
  return (
    <div className="min-h-screen bg-gray-900">
      <ConsoleSpamController />
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold text-white mb-4">
          Avatar Animation System Test
        </h1>

        <p className="text-gray-300 mb-6">
          This page tests the new semantic animation system with gender-aware
          asset resolution. Use the controls to test different animations and
          switch between male/female avatars.
        </p>

        <div className="bg-gray-800 rounded-lg p-4 h-[600px]">
          <ActiveAvatarModelProvider autoLoadFemaleRuntime={true}>
            <StableAvatarTest style={{ width: "100%", height: "100%" }} />
          </ActiveAvatarModelProvider>
        </div>

        <div className="mt-6 bg-gray-800 rounded-lg p-4">
          <h2 className="text-xl font-bold text-white mb-2">
            🎭 Fixed Character Flashing:
          </h2>
          <ul className="text-gray-300 space-y-1">
            <li>✅ Fixed character flash and disappear issue</li>
            <li>🎯 Stable avatar persistence across re-renders</li>
            <li>📦 Proper object lifecycle management</li>
            <li>⚡ Optimized scene disposal patterns</li>
            <li>🔒 Prevented animation system conflicts</li>
            <li>💫 Smooth 60 FPS stable rendering</li>
            <li>🎮 Responsive camera controls</li>
          </ul>
        </div>

        <div className="mt-4 bg-gray-800 rounded-lg p-4">
          <h2 className="text-xl font-bold text-white mb-2">
            Stability Features:
          </h2>
          <div className="text-gray-300 space-y-2">
            <div className="flex items-center gap-4">
              <span className="font-semibold">Current Mode:</span>
              <span className="text-green-400">🎭 Stable Avatar</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-semibold">Behavior:</span>
              <span className="text-blue-400">
                Avatar loads once and stays visible
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-semibold">Controls:</span>
              <span className="text-green-400">
                Smooth camera rotation/zoom
              </span>
            </div>
            <div className="text-sm text-gray-400 mt-2">
              Avatar should load once and remain stable without flashing.
              <br />
              Reference poles show scale, grid shows ground level.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
