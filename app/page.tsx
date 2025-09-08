"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import BlockSelector from "../components/world/BlockSelector";
import WorldInfo from "../components/world/WorldInfo";
import FloatingSidebar from "../components/FloatingSidebar";
import { FloatingHelp } from "../components/ui/FloatingPanel";

import { ArchipelagoTest } from "../components/debug/ArchipelagoTest";

// Dynamically import VoxelCanvas to avoid SSR issues with Three.js
const VoxelCanvas = dynamic(() => import("../components/world/VoxelCanvas"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-axiom-neutral-100 dark:bg-axiom-neutral-800">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 bg-axiom-primary-500 rounded-full mx-auto animate-glow-pulse"></div>
        <p className="text-axiom-neutral-600 dark:text-axiom-neutral-400">
          Loading 3D World...
        </p>
      </div>
    </div>
  ),
});

export default function Home() {
  const [showArchipelagoTest, setShowArchipelagoTest] = useState(false);

  // Note: Keyboard shortcuts are now handled by individual components
  // BlockSelector handles 0-9 for block selection (0=select tool, 1-7=blocks)
  // CameraControls handles Cmd/Ctrl+C for camera mode cycling

  return (
    <div className="min-h-screen bg-gradient-to-br from-axiom-neutral-50 to-axiom-neutral-100 dark:from-axiom-neutral-900 dark:to-axiom-neutral-950">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="flex-shrink-0">
            <h1 className="text-xl md:text-2xl font-bold text-axiom-primary bg-gradient-to-r from-axiom-primary-600 to-axiom-glow-purple bg-clip-text text-transparent">
              Descendants™
            </h1>
            <p className="text-xs md:text-sm text-axiom-neutral-600 dark:text-axiom-neutral-400">
              Living Metaverse Editor
            </p>
          </div>

          <FloatingHelp
            instructions={[
              "Tap to place • Drag to orbit",
              "Click to place • Drag to orbit • Scroll to zoom",
            ]}
            action="Click to place blocks"
            className="ml-4 md:ml-8 hidden sm:block"
          />
        </div>
      </header>

      {/* Main 3D Viewport */}
      <main className="h-screen">
        <VoxelCanvas />
      </main>

      {/* Floating Sidebar with Tabs (Animation, Simulants, Camera) */}
      <FloatingSidebar />

      {/* Right Panel - World Info */}
      <div className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 z-10 hidden lg:block">
        <WorldInfo />
      </div>

      {/* Bottom Center - Minecraft-style Block Selector */}
      <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-10">
        <BlockSelector />
      </div>

      {/* Archipelago Test Toggle */}
      <button
        onClick={() => setShowArchipelagoTest(!showArchipelagoTest)}
        className="fixed top-4 left-4 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg z-30 font-medium text-xs shadow-lg"
      >
        🏝️ {showArchipelagoTest ? "Hide" : "Show"}
      </button>

      {/* Archipelago Test Panel */}
      {showArchipelagoTest && (
        <ArchipelagoTest
          visible={showArchipelagoTest}
          onToggle={() => setShowArchipelagoTest(false)}
        />
      )}
    </div>
  );
}
