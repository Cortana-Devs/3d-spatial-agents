"use client";

import React, { useState, useCallback } from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Separator } from "../ui/separator";
import {
  Camera,
  Move3D,
  Eye,
  Video,
  RotateCcw,
  Maximize2,
  ArrowUp,
  Navigation,
  Grid3X3,
  Settings,
} from "lucide-react";
import { useWorldStore } from "../../store/worldStore";
import { CameraMode } from "../../types";
import { CAMERA_PRESETS } from "./CameraController";

interface CameraControlsProps {
  currentMode: CameraMode;
  onModeChange: (mode: CameraMode) => void;
  onPresetApply?: (presetName: keyof typeof CAMERA_PRESETS) => void;
  onFocusOnBlock?: (blockId: string) => void;
  className?: string;
}

const CAMERA_MODE_CONFIG = {
  orbit: {
    icon: RotateCcw,
    label: "Orbit",
    description: "Rotate around the world",
  },
  fly: {
    icon: Move3D,
    label: "Fly",
    description: "Free flight with WASD",
  },
  cinematic: {
    icon: Video,
    label: "Cinematic",
    description: "Smooth camera movements",
  },
  "follow-simulant": {
    icon: Eye,
    label: "Follow",
    description: "Track AI simulants",
  },
} as const;

const PRESET_CONFIG = {
  overview: {
    icon: Maximize2,
    label: "Overview",
    description: "Wide view of the world",
  },
  closeup: {
    icon: Camera,
    label: "Close-up",
    description: "Detailed view",
  },
  topDown: {
    icon: ArrowUp,
    label: "Top Down",
    description: "Bird's eye view",
  },
  side: {
    icon: Navigation,
    label: "Side View",
    description: "Profile perspective",
  },
} as const;

export default function CameraControls({
  currentMode,
  onModeChange,
  onPresetApply,
  className = "",
}: CameraControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [modeChangeNotification, setModeChangeNotification] = useState<
    string | null
  >(null);
  const { simulants, gridConfig, updateGridConfig } = useWorldStore();

  // Calculate active simulants
  const activeSimulants = Array.from(simulants.values()).filter(
    (s) => s.status === "active",
  );

  // Show notification when camera mode changes
  React.useEffect(() => {
    const modeName = CAMERA_MODE_CONFIG[currentMode].label;
    setModeChangeNotification(`Camera: ${modeName}`);

    const timer = setTimeout(() => {
      setModeChangeNotification(null);
    }, 2000);

    return () => clearTimeout(timer);
  }, [currentMode]);

  // Handle keyboard shortcuts - Cmd/Ctrl + C to cycle camera modes
  React.useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only handle shortcuts when not typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Cmd/Ctrl + C to cycle through camera modes
      if (
        (event.metaKey || event.ctrlKey) &&
        (event.key === "c" || event.key === "C")
      ) {
        event.preventDefault();

        // Cycle through camera modes
        const modes: CameraMode[] = [
          "orbit",
          "fly",
          "cinematic",
          "follow-simulant",
        ];
        const currentIndex = modes.indexOf(currentMode);
        const nextIndex = (currentIndex + 1) % modes.length;

        // Skip follow-simulant if no active simulants
        if (
          modes[nextIndex] === "follow-simulant" &&
          activeSimulants.length === 0
        ) {
          const afterNext = (nextIndex + 1) % modes.length;
          onModeChange(modes[afterNext]);
        } else {
          onModeChange(modes[nextIndex]);
        }
      }

      // G key to toggle grid visibility
      if (event.key === "g" || event.key === "G") {
        event.preventDefault();
        updateGridConfig({ visibility: !gridConfig.visibility });
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [
    currentMode,
    onModeChange,
    activeSimulants.length,
    gridConfig.visibility,
    updateGridConfig,
  ]);

  const handleModeChange = useCallback(
    (mode: CameraMode) => {
      onModeChange(mode);
      // Auto-collapse on mobile after selection
      if (window.innerWidth < 768) {
        setIsExpanded(false);
      }
    },
    [onModeChange],
  );

  const handlePresetApply = useCallback(
    (presetName: keyof typeof CAMERA_PRESETS) => {
      onPresetApply?.(presetName);
      setShowPresets(false);
    },
    [onPresetApply],
  );

  return (
    <>
      {/* Camera mode change notification */}
      {modeChangeNotification && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-blue-500/90 backdrop-blur-md text-white px-4 py-2 rounded-lg shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2">
              {React.createElement(CAMERA_MODE_CONFIG[currentMode].icon, {
                size: 16,
              })}
              <span className="font-medium">{modeChangeNotification}</span>
            </div>
          </div>
        </div>
      )}

      <div
        className={`fixed top-16 md:top-20 left-4 md:left-6 z-50 ${className}`}
      >
        <Card className="bg-black/20 backdrop-blur-md border-white/10 text-white">
          {/* Main camera mode toggle */}
          <div className="p-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full justify-between text-white hover:bg-white/10"
            >
              <div className="flex items-center gap-2">
                {React.createElement(CAMERA_MODE_CONFIG[currentMode].icon, {
                  size: 16,
                })}
                <span className="text-sm font-medium">
                  {CAMERA_MODE_CONFIG[currentMode].label}
                </span>
                {currentMode === "fly" && (
                  <span className="text-xs bg-green-500 text-white px-1 rounded animate-pulse">
                    WASD
                  </span>
                )}
              </div>
              <span className="text-xs text-white/60">⌘C</span>
            </Button>
          </div>

          {/* Expanded camera controls */}
          {isExpanded && (
            <>
              <Separator className="bg-white/10" />
              <div className="p-3 space-y-2">
                <div className="text-xs text-white/60 mb-2">Camera Modes</div>

                {Object.entries(CAMERA_MODE_CONFIG).map(([mode, config]) => {
                  const isActive = currentMode === mode;
                  const Icon = config.icon;

                  return (
                    <Button
                      key={mode}
                      variant={isActive ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => handleModeChange(mode as CameraMode)}
                      className={`w-full justify-between text-left ${
                        isActive
                          ? "bg-blue-500/20 text-blue-300 border-blue-400/30"
                          : "text-white hover:bg-white/10"
                      }`}
                      disabled={
                        mode === "follow-simulant" &&
                        activeSimulants.length === 0
                      }
                    >
                      <div className="flex items-center gap-2">
                        <Icon size={14} />
                        <div>
                          <div className="text-sm">{config.label}</div>
                          <div className="text-xs opacity-60">
                            {config.description}
                          </div>
                        </div>
                      </div>
                      <div className="w-4"></div>
                    </Button>
                  );
                })}

                {/* Follow simulant selection */}
                {currentMode === "follow-simulant" &&
                  activeSimulants.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-white/10">
                      <div className="text-xs text-white/60 mb-2">
                        Active Simulants
                      </div>
                      {activeSimulants.map((simulant) => (
                        <Button
                          key={simulant.id}
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // This would trigger following the specific simulant
                            void import("@/utils/devLogger").then(
                              ({ devLog }) =>
                                devLog("Following simulant:", simulant.name),
                            );
                          }}
                          className="w-full justify-start text-white hover:bg-white/10"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-400"></div>
                            <span className="text-sm">{simulant.name}</span>
                          </div>
                        </Button>
                      ))}
                    </div>
                  )}

                {/* Grid Controls */}
                <div className="mt-3 pt-2 border-t border-white/10">
                  <div className="text-xs text-white/60 mb-2">
                    Grid Settings
                  </div>

                  {/* Grid Visibility Toggle */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      updateGridConfig({ visibility: !gridConfig.visibility })
                    }
                    className={`w-full justify-between text-left ${
                      gridConfig.visibility
                        ? "bg-green-500/20 text-green-300 border-green-400/30"
                        : "text-white hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Grid3X3 size={14} />
                      <div>
                        <div className="text-sm">Grid</div>
                        <div className="text-xs opacity-60">
                          {gridConfig.visibility ? "Visible" : "Hidden"}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs">
                      {gridConfig.visibility ? "ON" : "OFF"}
                    </div>
                  </Button>

                  {/* Grid Opacity Control */}
                  {gridConfig.visibility && (
                    <div className="mt-2 px-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-white/60">Opacity</span>
                        <span className="text-xs text-white/60">
                          {Math.round(gridConfig.opacity * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.1"
                        value={gridConfig.opacity}
                        onChange={(e) =>
                          updateGridConfig({
                            opacity: parseFloat(e.target.value),
                          })
                        }
                        className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                      />
                    </div>
                  )}

                  {/* Snap to Grid Toggle */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      updateGridConfig({ snapToGrid: !gridConfig.snapToGrid })
                    }
                    className={`w-full justify-between text-left mt-1 ${
                      gridConfig.snapToGrid
                        ? "bg-blue-500/20 text-blue-300 border-blue-400/30"
                        : "text-white hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Settings size={14} />
                      <div>
                        <div className="text-sm">Snap to Grid</div>
                        <div className="text-xs opacity-60">
                          {gridConfig.snapToGrid ? "Enabled" : "Disabled"}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs">
                      {gridConfig.snapToGrid ? "ON" : "OFF"}
                    </div>
                  </Button>
                </div>

                {/* Camera presets */}
                <div className="mt-3 pt-2 border-t border-white/10">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPresets(!showPresets)}
                    className="w-full justify-start text-white hover:bg-white/10"
                  >
                    <span className="text-sm">Camera Presets</span>
                  </Button>

                  {showPresets && (
                    <div className="mt-2 space-y-1">
                      {Object.entries(PRESET_CONFIG).map(([preset, config]) => {
                        const Icon = config.icon;

                        return (
                          <Button
                            key={preset}
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handlePresetApply(
                                preset as keyof typeof CAMERA_PRESETS,
                              )
                            }
                            className="w-full justify-start text-white hover:bg-white/10"
                          >
                            <div className="flex items-center gap-2">
                              <Icon size={12} />
                              <div>
                                <div className="text-xs">{config.label}</div>
                                <div className="text-xs opacity-50">
                                  {config.description}
                                </div>
                              </div>
                            </div>
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Fly mode instructions */}
                {currentMode === "fly" && (
                  <div className="mt-3 pt-2 border-t border-white/10">
                    <div className="text-xs text-white/60 mb-2">
                      🚀 Fly Controls Active
                    </div>
                    <div className="text-xs text-white/40 space-y-1">
                      <div className="text-green-400 font-semibold">
                        ✓ WASD - Move around
                      </div>
                      <div className="text-green-400">✓ Space - Fly up</div>
                      <div className="text-green-400">✓ Shift - Fly down</div>
                      <div className="text-blue-400">Mouse - Look around</div>
                      <div className="text-yellow-400 font-bold animate-pulse">
                        👆 Click canvas to lock cursor
                      </div>
                    </div>
                    <div className="mt-2 p-2 bg-green-500/10 border border-green-400/30 rounded text-green-300 text-xs">
                      💡 Make sure to click the 3D canvas first, then use WASD
                      keys
                    </div>
                  </div>
                )}

                {/* Orbit mode instructions */}
                {currentMode === "orbit" && (
                  <div className="mt-3 pt-2 border-t border-white/10">
                    <div className="text-xs text-white/60 mb-2">
                      Orbit Controls
                    </div>
                    <div className="text-xs text-white/40 space-y-1">
                      <div>Left Click - Rotate</div>
                      <div>Right Click - Pan</div>
                      <div>Scroll - Zoom</div>
                      <div>Double Click - Focus block</div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </Card>

        {/* Quick mode indicators */}
        {!isExpanded && (
          <div className="mt-2 flex gap-1">
            {Object.entries(CAMERA_MODE_CONFIG).map(([mode, config]) => (
              <Button
                key={mode}
                variant="ghost"
                size="sm"
                onClick={() => handleModeChange(mode as CameraMode)}
                className={`w-8 h-8 p-0 ${
                  currentMode === mode
                    ? "bg-blue-500/20 text-blue-300 border border-blue-400/30"
                    : "bg-black/20 text-white/60 hover:bg-white/10 hover:text-white"
                }`}
                title={config.label}
              >
                {React.createElement(config.icon, { size: 14 })}
              </Button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export type { CameraControlsProps };
