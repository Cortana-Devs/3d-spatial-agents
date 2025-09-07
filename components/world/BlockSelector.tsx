"use client";

import React, { useState, useRef, useCallback, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Mesh } from "three";
import { useWorldStore } from "../../store/worldStore";
import { BlockType, SelectionMode, BLOCK_DEFINITIONS } from "../../types";

// 3D Block Preview Component
interface Block3DPreviewProps {
  type: BlockType;
  isHovered: boolean;
  isSelected: boolean;
}

function Block3DPreview({ type, isHovered, isSelected }: Block3DPreviewProps) {
  const meshRef = useRef<Mesh>(null);
  const definition = BLOCK_DEFINITIONS[type];

  useFrame((state) => {
    if (meshRef.current) {
      // Continuous rotation
      meshRef.current.rotation.x =
        Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.3;
      meshRef.current.rotation.z =
        Math.cos(state.clock.elapsedTime * 0.4) * 0.1;

      // Scale animation based on state
      if (isSelected) {
        const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
        meshRef.current.scale.setScalar(scale);
      } else if (isHovered) {
        const scale = 1.1 + Math.sin(state.clock.elapsedTime * 4) * 0.05;
        meshRef.current.scale.setScalar(scale);
      } else {
        meshRef.current.scale.setScalar(1);
      }
    }
  });

  return (
    <>
      {/* Ambient lighting for preview */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[2, 2, 1]} intensity={0.8} />
      <pointLight position={[-1, 1, 1]} intensity={0.3} color="#00D4FF" />

      {/* Block mesh */}
      <mesh ref={meshRef}>
        <boxGeometry args={[0.9, 0.9, 0.9]} />
        <meshStandardMaterial
          color={definition.color}
          roughness={definition.roughness}
          metalness={definition.metalness}
          transparent={definition.transparency !== undefined}
          opacity={definition.transparency ? 1 - definition.transparency : 1}
          emissive={
            isSelected ? definition.color : definition.emissive || "#000000"
          }
          emissiveIntensity={
            isSelected
              ? 0.3
              : isHovered
                ? 0.2
                : definition.emissiveIntensity || 0
          }
        />
      </mesh>
    </>
  );
}

// Individual Block Selector Item
interface BlockSelectorItemProps {
  type: BlockType;
  isSelected: boolean;
  onSelect: () => void;
  keyboardShortcut: string;
  className?: string;
}

function BlockSelectorItem({
  type,
  isSelected,
  onSelect,
  keyboardShortcut,
  className = "",
}: BlockSelectorItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const definition = BLOCK_DEFINITIONS[type];

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);
  const handleFocus = useCallback(() => setIsFocused(true), []);
  const handleBlur = useCallback(() => setIsFocused(false), []);

  // Focus mode behavior - reduce opacity of non-focused items when any item is focused
  const shouldReduceOpacity = isFocused ? false : isHovered || isSelected;

  return (
    <button
      onClick={onSelect}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={`
        group relative w-full p-4 rounded-xl border transition-all duration-300 ease-out
        flex items-center space-x-4 text-left overflow-hidden
        ${
          isSelected
            ? "border-axiom-primary-400 bg-axiom-primary-50 dark:bg-axiom-primary-900/20 glow-effect shadow-lg"
            : isHovered
              ? "border-axiom-primary-300 bg-axiom-primary-25 dark:bg-axiom-primary-900/10 shadow-md"
              : "border-axiom-neutral-200 dark:border-axiom-neutral-700 bg-white/80 dark:bg-axiom-neutral-800/80 hover:bg-white dark:hover:bg-axiom-neutral-800"
        }
        interactive-hover backdrop-blur-sm
        ${shouldReduceOpacity ? "opacity-100" : "opacity-70"}
        ${className}
      `}
      style={{
        transform: isHovered
          ? "translateY(-2px) scale(1.02)"
          : "translateY(0) scale(1)",
      }}
    >
      {/* 3D Preview Container */}
      <div className="relative w-12 h-12 flex-shrink-0">
        <div
          className={`
          w-full h-full rounded-lg overflow-hidden border-2 transition-all duration-300
          ${
            isSelected
              ? "border-axiom-primary-400 shadow-lg"
              : isHovered
                ? "border-axiom-primary-300 shadow-md"
                : "border-axiom-neutral-300 dark:border-axiom-neutral-600"
          }
        `}
        >
          <Canvas
            camera={{ position: [2, 2, 2], fov: 50 }}
            gl={{
              antialias: true,
              alpha: true,
              powerPreference: "high-performance",
            }}
            dpr={[1, 2]}
          >
            <Block3DPreview
              type={type}
              isHovered={isHovered}
              isSelected={isSelected}
            />
          </Canvas>
        </div>

        {/* Glow effect overlay */}
        {(isSelected || isHovered) && (
          <div
            className={`
              absolute inset-0 rounded-lg pointer-events-none transition-opacity duration-300
              ${isSelected ? "opacity-30" : "opacity-20"}
            `}
            style={{
              background: `radial-gradient(circle, ${definition.color}40 0%, transparent 70%)`,
              filter: "blur(4px)",
            }}
          />
        )}
      </div>

      {/* Block Information */}
      <div className="flex-1 min-w-0">
        <div
          className={`
          font-semibold transition-colors duration-200
          ${
            isSelected
              ? "text-axiom-primary-700 dark:text-axiom-primary-300"
              : "text-axiom-neutral-900 dark:text-axiom-neutral-100"
          }
        `}
        >
          {definition.displayName}
        </div>
        <div className="text-sm text-axiom-neutral-600 dark:text-axiom-neutral-400 truncate mt-1">
          {definition.description}
        </div>
        <div className="flex items-center space-x-2 mt-2">
          <div className="text-xs text-axiom-neutral-500 dark:text-axiom-neutral-500 capitalize">
            {definition.category}
          </div>
          <div className="w-1 h-1 bg-axiom-neutral-400 rounded-full"></div>
          <div className="text-xs text-axiom-neutral-500 dark:text-axiom-neutral-500">
            Durability: {definition.durability}/10
          </div>
        </div>
      </div>

      {/* Keyboard Shortcut */}
      <div className="flex-shrink-0">
        <kbd
          className={`
          px-2 py-1 rounded text-xs font-mono transition-all duration-200
          ${
            isSelected
              ? "bg-axiom-primary-200 dark:bg-axiom-primary-800 text-axiom-primary-800 dark:text-axiom-primary-200"
              : "bg-axiom-neutral-200 dark:bg-axiom-neutral-700 text-axiom-neutral-600 dark:text-axiom-neutral-400"
          }
        `}
        >
          {keyboardShortcut}
        </kbd>
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2">
          <div className="w-2 h-2 bg-axiom-primary-500 rounded-full animate-pulse"></div>
        </div>
      )}
    </button>
  );
}

// Empty Hand Tool Component
interface EmptyHandToolProps {
  isSelected: boolean;
  onSelect: () => void;
  className?: string;
}

function EmptyHandTool({
  isSelected,
  onSelect,
  className = "",
}: EmptyHandToolProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        group relative w-full p-4 rounded-xl border transition-all duration-300 ease-out
        flex items-center space-x-4 text-left overflow-hidden
        ${
          isSelected
            ? "border-axiom-glow-purple bg-axiom-glow-purple/10 glow-effect-purple shadow-lg"
            : isHovered
              ? "border-axiom-glow-purple/50 bg-axiom-glow-purple/5 shadow-md"
              : "border-axiom-neutral-200 dark:border-axiom-neutral-700 bg-white/80 dark:bg-axiom-neutral-800/80"
        }
        interactive-hover backdrop-blur-sm
        ${className}
      `}
      style={{
        transform: isHovered
          ? "translateY(-2px) scale(1.02)"
          : "translateY(0) scale(1)",
      }}
    >
      {/* Tool Icon */}
      <div
        className={`
        w-12 h-12 rounded-lg border-2 flex-shrink-0 flex items-center justify-center transition-all duration-300
        ${
          isSelected
            ? "border-axiom-glow-purple bg-axiom-glow-purple/20"
            : isHovered
              ? "border-axiom-glow-purple/50 bg-axiom-glow-purple/10"
              : "border-axiom-neutral-300 dark:border-axiom-neutral-600 bg-gradient-to-br from-axiom-neutral-100 to-axiom-neutral-200 dark:from-axiom-neutral-700 dark:to-axiom-neutral-800"
        }
      `}
      >
        <svg
          className={`
            w-6 h-6 transition-colors duration-200
            ${
              isSelected
                ? "text-axiom-glow-purple"
                : "text-axiom-neutral-600 dark:text-axiom-neutral-400"
            }
          `}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
          />
        </svg>
      </div>

      {/* Tool Information */}
      <div className="flex-1 min-w-0">
        <div
          className={`
          font-semibold transition-colors duration-200
          ${
            isSelected
              ? "text-axiom-glow-purple"
              : "text-axiom-neutral-900 dark:text-axiom-neutral-100"
          }
        `}
        >
          Select Tool
        </div>
        <div className="text-sm text-axiom-neutral-600 dark:text-axiom-neutral-400 truncate mt-1">
          Select and inspect blocks
        </div>
        <div className="text-xs text-axiom-neutral-500 dark:text-axiom-neutral-500 mt-2">
          Click blocks to inspect • Right-click to remove
        </div>
      </div>

      {/* Keyboard Shortcut */}
      <div className="flex-shrink-0">
        <kbd
          className={`
          px-2 py-1 rounded text-xs font-mono transition-all duration-200
          ${
            isSelected
              ? "bg-axiom-glow-purple/20 text-axiom-glow-purple"
              : "bg-axiom-neutral-200 dark:bg-axiom-neutral-700 text-axiom-neutral-600 dark:text-axiom-neutral-400"
          }
        `}
        >
          0
        </kbd>
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2">
          <div className="w-2 h-2 bg-axiom-glow-purple rounded-full animate-pulse"></div>
        </div>
      )}
    </button>
  );
}

// Main Block Selector Component
interface BlockSelectorProps {
  className?: string;
}

export default function BlockSelector({ className = "" }: BlockSelectorProps) {
  const {
    selectedBlockType,
    selectionMode,
    setSelectedBlockType,
    setSelectionMode,
    blockCount,
    worldLimits,
  } = useWorldStore();

  const [isExpanded, setIsExpanded] = useState(false);
  const blockTypes = useMemo(() => Object.values(BlockType), []);
  const isEmptyHandSelected = selectionMode === SelectionMode.EMPTY;
  const isAtLimit = blockCount >= worldLimits.maxBlocks;

  // Debug logging for selection state (moved to effect to avoid per-render spam)
  React.useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.debug("🎯 BlockSelector: Current state", {
        selectedBlockType,
        selectionMode,
        isEmptyHandSelected,
        blockCount,
        maxBlocks: worldLimits.maxBlocks,
        isAtLimit,
      });
    }
  }, [
    selectedBlockType,
    selectionMode,
    isEmptyHandSelected,
    blockCount,
    worldLimits.maxBlocks,
    isAtLimit,
  ]);

  // Handle keyboard shortcuts for block selection (0-9 keys)
  React.useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only handle shortcuts when not typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Don't handle if modifier keys are pressed (let camera controls handle Cmd/Ctrl + C)
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      // Handle number keys for block selection (0 = empty hand, 1-9 = blocks)
      const keyNumber = parseInt(event.key);
      if (!isNaN(keyNumber) && keyNumber >= 0 && keyNumber <= 9) {
        event.preventDefault();

        if (keyNumber === 0) {
          if (process.env.NODE_ENV === "development") {
            console.debug(
              "⌨️ BlockSelector: Key 0 pressed - setting empty hand",
            );
          }
          setSelectionMode(SelectionMode.EMPTY);
        } else {
          const blockIndex = keyNumber - 1;
          if (blockTypes[blockIndex]) {
            if (process.env.NODE_ENV === "development") {
              console.debug(
                "⌨️ BlockSelector: Key",
                keyNumber,
                "pressed - selecting block",
                blockTypes[blockIndex],
              );
            }
            setSelectedBlockType(blockTypes[blockIndex]);
            setSelectionMode(SelectionMode.PLACE);
          } else {
            if (process.env.NODE_ENV === "development") {
              console.debug(
                "⌨️ BlockSelector: Key",
                keyNumber,
                "pressed - no block at index",
                blockIndex,
              );
            }
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [blockTypes, setSelectedBlockType, setSelectionMode]);

  // Get current selection info for collapsed view
  const currentSelection = isEmptyHandSelected
    ? { name: "Select Tool", icon: "🔍", shortcut: "0" }
    : {
        name: BLOCK_DEFINITIONS[selectedBlockType].displayName,
        icon: "🧱",
        shortcut: (
          Object.values(BlockType).indexOf(selectedBlockType) + 1
        ).toString(),
      };

  return (
    <div className={`minecraft-hotbar ${className}`}>
      {/* Minecraft-style horizontal hotbar */}
      <div className="flex items-center gap-1 p-2 bg-black/60 backdrop-blur-md border border-white/20 rounded-lg shadow-2xl">
        {/* Empty Hand Tool */}
        <div
          className={`hotbar-slot ${isEmptyHandSelected ? "selected" : ""}`}
          onClick={() => setSelectionMode(SelectionMode.EMPTY)}
          title="Select Tool (0)"
        >
          <div className="hotbar-icon">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
              />
            </svg>
          </div>
          <div className="hotbar-number">0</div>
        </div>

        {/* Block Types */}
        {blockTypes.map((type, index) => {
          const definition = BLOCK_DEFINITIONS[type];
          const isSelected =
            selectedBlockType === type && selectionMode === SelectionMode.PLACE;

          return (
            <div
              key={type}
              className={`hotbar-slot ${isSelected ? "selected" : ""} ${isAtLimit && !isSelected ? "disabled" : ""}`}
              onClick={() => {
                if (!isAtLimit || isSelected) {
                  setSelectedBlockType(type);
                  setSelectionMode(SelectionMode.PLACE);
                }
              }}
              title={`${definition.displayName} (${index + 1})`}
            >
              <div
                className="hotbar-icon hotbar-block"
                style={{ backgroundColor: definition.color }}
              >
                <div className="block-texture" />
              </div>
              <div className="hotbar-number">{index + 1}</div>
            </div>
          );
        })}

        {/* Block Counter */}
        <div className="ml-2 sm:ml-3 px-2 sm:px-3 py-1 bg-black/40 rounded text-xs text-white/80 font-mono">
          <span className="hidden sm:inline">
            {blockCount}/{worldLimits.maxBlocks}
          </span>
          <span className="sm:hidden">{blockCount}</span>
        </div>

        {/* Expand Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="ml-1 sm:ml-2 px-1 sm:px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-white/60 hover:text-white/80 transition-colors"
          title="Expand Block Palette"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      {/* Expanded View - Detailed Block Palette */}
      {isExpanded && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-black/80 backdrop-blur-md border border-white/20 rounded-lg p-3 md:p-4 w-[350px] sm:w-[400px] md:min-w-[400px] shadow-2xl max-w-[90vw]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Block Palette</h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-white/60 hover:text-white p-1 rounded"
            >
              ✕
            </button>
          </div>

          {/* Block limit warning */}
          {isAtLimit && (
            <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm mb-4">
              ⚠️ Block limit reached! Remove blocks to place new ones.
            </div>
          )}

          {/* Detailed Block Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-4">
            {/* Empty Hand Tool */}
            <div
              className={`detailed-block-card ${isEmptyHandSelected ? "selected" : ""}`}
              onClick={() => setSelectionMode(SelectionMode.EMPTY)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-600 rounded flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-white font-medium">Select Tool</div>
                  <div className="text-white/60 text-xs">Press 0</div>
                </div>
              </div>
            </div>

            {/* Block Types */}
            {blockTypes.map((type, index) => {
              const definition = BLOCK_DEFINITIONS[type];
              const isSelected =
                selectedBlockType === type &&
                selectionMode === SelectionMode.PLACE;

              return (
                <div
                  key={type}
                  className={`detailed-block-card ${isSelected ? "selected" : ""} ${isAtLimit && !isSelected ? "disabled" : ""}`}
                  onClick={() => {
                    if (!isAtLimit || isSelected) {
                      setSelectedBlockType(type);
                      setSelectionMode(SelectionMode.PLACE);
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded hotbar-block"
                      style={{ backgroundColor: definition.color }}
                    >
                      <div className="block-texture" />
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-medium">
                        {definition.displayName}
                      </div>
                      <div className="text-white/60 text-xs">
                        Press {index + 1}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Instructions */}
          <div className="text-xs text-white/60 space-y-1 border-t border-white/20 pt-3">
            <div>• Use keyboard shortcuts (0-9) for quick selection</div>
            <div>• Left click to place blocks • Right click to remove</div>
            <div>• Key 8: Perfect Clear Glass Block (fully transparent)</div>
            <div>
              • Current: {blockCount}/{worldLimits.maxBlocks} blocks placed
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
