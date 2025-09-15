"use client";

import React, { useEffect } from "react";
import { ActiveAvatarModelProvider } from "@/src/hooks/useActiveAvatarModel";
import ComprehensiveAnimationTester from "@/components/testing/ComprehensiveAnimationTester";
import ConsoleSpamController from "@/components/dev/ConsoleSpamController";

export default function ComprehensiveAnimationTestPage() {
  // Auto-disable spam for better testing experience
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const autoDisable = urlParams.get("nospam") !== "false"; // Default to disabled

    if (autoDisable) {
      try {
        if (window.__DEV_LOGS__) {
          window.__DEV_LOGS__.disable();
        }
        localStorage.setItem("__DEV_LOG_ENABLED__", "0");

        // Suppress animation spam for cleaner testing
        const originalWarn = console.warn;
        console.warn = (...args: any[]) => {
          const message = args.join(" ");
          if (
            message.includes("🎭") ||
            message.includes("🎬") ||
            message.includes("[DEV") ||
            message.includes("Performance warning") ||
            message.includes("Animation transition")
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
    <div className="min-h-screen bg-black text-white">
      <ConsoleSpamController />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 p-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold text-white mb-2">
            🧪 Comprehensive Animation Testing System
          </h1>
          <p className="text-gray-300 text-sm max-w-4xl">
            Systematic testing interface for all avatar animations. Use test suites for batch testing
            or individual controls for specific animations. Monitor results in real-time with detailed
            performance metrics and error reporting.
          </p>
        </div>
      </div>

      {/* Main Testing Interface */}
      <div className="pt-24 h-screen">
        <ActiveAvatarModelProvider autoLoadFemaleRuntime={true}>
          <ComprehensiveAnimationTester
            style={{ width: "100%", height: "calc(100vh - 96px)" }}
          />
        </ActiveAvatarModelProvider>
      </div>

      {/* Instructions Footer */}
      <div className="absolute bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-400">
            <div>
              <h3 className="font-bold text-white mb-1">🎯 Test Suites</h3>
              <ul className="space-y-1">
                <li>• Essential Locomotion - Core movement</li>
                <li>• All Idle Variants - All idle animations</li>
                <li>• Walking/Running - Movement variations</li>
                <li>• Expressions & Talking - Facial animations</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-white mb-1">🎮 Controls</h3>
              <ul className="space-y-1">
                <li>• Left Panel - Test controls & suites</li>
                <li>• Right Panel - Results & monitoring</li>
                <li>• Search/Filter - Find specific animations</li>
                <li>• Stop Button - Halt running tests</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-white mb-1">📊 Features</h3>
              <ul className="space-y-1">
                <li>• Real-time test results</li>
                <li>• Performance monitoring</li>
                <li>• Error tracking & reporting</li>
                <li>• Gender-aware animation testing</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
