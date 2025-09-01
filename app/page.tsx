'use client';

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useWorldStore } from '../store/worldStore';
import { BlockType } from '../types';
import BlockSelector from '../components/world/BlockSelector';
import WorldInfo from '../components/world/WorldInfo';

// Dynamically import VoxelCanvas to avoid SSR issues with Three.js
const VoxelCanvas = dynamic(() => import('../components/world/VoxelCanvas'), {
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
  )
});

export default function Home() {
  const { setSelectedBlockType } = useWorldStore();

  // Keyboard shortcuts for block selection
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      switch (event.key) {
        case '1':
          setSelectedBlockType(BlockType.STONE);
          break;
        case '2':
          setSelectedBlockType(BlockType.LEAF);
          break;
        case '3':
          setSelectedBlockType(BlockType.WOOD);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [setSelectedBlockType]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-axiom-neutral-50 to-axiom-neutral-100 dark:from-axiom-neutral-900 dark:to-axiom-neutral-950">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-axiom-primary bg-gradient-to-r from-axiom-primary-600 to-axiom-glow-purple bg-clip-text text-transparent">
              Descendants™
            </h1>
            <p className="text-sm text-axiom-neutral-600 dark:text-axiom-neutral-400">
              Living Metaverse Editor
            </p>
          </div>
          
          <div className="floating-panel px-4 py-2">
            <div className="text-xs text-axiom-neutral-600 dark:text-axiom-neutral-400">
              Click to place blocks • Drag to orbit • Scroll to zoom
            </div>
          </div>
        </div>
      </header>

      {/* Main 3D Viewport */}
      <main className="h-screen">
        <VoxelCanvas />
      </main>

      {/* Left Panel - Block Selector */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 z-10">
        <BlockSelector />
      </div>

      {/* Right Panel - World Info */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 z-10">
        <WorldInfo />
      </div>

      {/* Bottom Instructions */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
        <div className="floating-panel px-6 py-3">
          <div className="flex items-center space-x-6 text-xs text-axiom-neutral-600 dark:text-axiom-neutral-400">
            <div className="flex items-center space-x-2">
              <kbd className="px-2 py-1 bg-axiom-neutral-200 dark:bg-axiom-neutral-700 rounded text-xs">1</kbd>
              <span>Stone</span>
            </div>
            <div className="flex items-center space-x-2">
              <kbd className="px-2 py-1 bg-axiom-neutral-200 dark:bg-axiom-neutral-700 rounded text-xs">2</kbd>
              <span>Leaf</span>
            </div>
            <div className="flex items-center space-x-2">
              <kbd className="px-2 py-1 bg-axiom-neutral-200 dark:bg-axiom-neutral-700 rounded text-xs">3</kbd>
              <span>Wood</span>
            </div>
            <div className="w-px h-4 bg-axiom-neutral-300 dark:bg-axiom-neutral-600"></div>
            <div>Left click to place • Right click to remove</div>
          </div>
        </div>
      </div>
    </div>
  );
}
