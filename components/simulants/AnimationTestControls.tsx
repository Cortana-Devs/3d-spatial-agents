"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Separator } from "../ui/separator";
import { Slider } from "../ui/slider";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { devError } from "@/utils/devLogger";
import {
  Square,
  Settings,
  User,
  Activity,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import { useWorldStore } from "../../store/worldStore";
import type { AnimationState } from "../../utils/animationController";
import { usePerformanceOptimization } from "../../utils/usePerformanceOptimization";
import PerformanceDebugPanel from "./PerformanceDebugPanel";

/**
 * Animation test controls interface props
 */
export interface AnimationTestControlsProps {
  simulantId?: string;
  className?: string;
  showAdvanced?: boolean;
  showPerformancePanel?: boolean;
  onAnimationChange?: (simulantId: string, animation: string) => void;
  onError?: (error: string) => void;
}

/**
 * Available animations with metadata
 */
const AVAILABLE_ANIMATIONS = [
  {
    key: "idle" as AnimationState,
    label: "Idle",
    icon: "🧍",
    description: "Standing peacefully",
    color: "bg-blue-500/20 text-blue-300 hover:bg-blue-500/30",
  },
  {
    key: "walking" as AnimationState,
    label: "Walk",
    icon: "🚶",
    description: "Walking around the world",
    color: "bg-green-500/20 text-green-300 hover:bg-green-500/30",
  },
  {
    key: "running" as AnimationState,
    label: "Run",
    icon: "🏃",
    description: "Running with excitement",
    color: "bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30",
  },
  {
    key: "jumping" as AnimationState,
    label: "Jump",
    icon: "🦘",
    description: "Jumping with joy",
    color: "bg-orange-500/20 text-orange-300 hover:bg-orange-500/30",
  },
  {
    key: "building" as AnimationState,
    label: "Build",
    icon: "🔨",
    description: "Building structures",
    color: "bg-purple-500/20 text-purple-300 hover:bg-purple-500/30",
  },
  {
    key: "communicating" as AnimationState,
    label: "Talk",
    icon: "💬",
    description: "Talking to friends",
    color: "bg-pink-500/20 text-pink-300 hover:bg-pink-500/30",
  },
  {
    key: "thinking" as AnimationState,
    label: "Think",
    icon: "🤔",
    description: "Thinking deeply",
    color: "bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30",
  },
  {
    key: "celebrating" as AnimationState,
    label: "Celebrate",
    icon: "🎉",
    description: "Celebrating success",
    color: "bg-red-500/20 text-red-300 hover:bg-red-500/30",
  },
] as const;

/**
 * Animation state tracking
 */
interface AnimationStateInfo {
  currentAnimation: string | null;
  isPlaying: boolean;
  transitionProgress: number;
  error: string | null;
}

/**
 * Animation Test Controls Component
 * Provides interface for testing and controlling simulant animations
 */
export default function AnimationTestControls({
  simulantId,
  className = "",
  showAdvanced = false,
  showPerformancePanel = false,
  onAnimationChange,
  onError,
}: AnimationTestControlsProps) {
  const { simulants, updateSimulant } = useWorldStore();

  // Component state
  const [selectedSimulant, setSelectedSimulant] = useState<string | null>(
    simulantId || null,
  );
  const [isExpanded, setIsExpanded] = useState(true); // Auto-expand when simulants are available
  const [showAdvancedControls, setShowAdvancedControls] =
    useState(showAdvanced);
  const [showPerformanceDebug, setShowPerformanceDebug] =
    useState(showPerformancePanel);
  const [crossFadeDuration, setCrossFadeDuration] = useState(0.3);
  const [animationSpeed, setAnimationSpeed] = useState(1.0);
  const [enableRealTimeUpdates, setEnableRealTimeUpdates] = useState(true);

  // Performance optimization for all simulants
  const simulantArray = useMemo(
    () => Array.from(simulants.values()),
    [simulants],
  );
  const performanceOptimization = usePerformanceOptimization(simulantArray, {
    enableAutoQualityAdjustment: true,
    enableMemoryManagement: true,
    enableCulling: true,
    enableLOD: true,
    initialQuality: "high",
    maxRenderDistance: 100,
    enableLogging: process.env.NODE_ENV === "development",
    onQualityChange: (quality) => {
      if (process.env.NODE_ENV === "development") {
        void import("@/utils/devLogger").then(({ devLog }) =>
          devLog("🎯 Global quality changed:", quality.name),
        );
      }
    },
    onPerformanceWarning: (warning) => {
      if (process.env.NODE_ENV === "development") {
        console.warn("⚠️ Performance warning:", warning);
      }
      onError?.(warning);
    },
  });

  // Animation state tracking
  const [animationStates, setAnimationStates] = useState<
    Map<string, AnimationStateInfo>
  >(new Map());

  // Get simulant list for dropdown
  const simulantList = useMemo(() => {
    return Array.from(simulants.values()).map((simulant) => ({
      id: simulant.id,
      name: simulant.name,
      status: simulant.status,
      lastAction: simulant.lastAction,
    }));
  }, [simulants]);

  // Get current simulant
  const currentSimulant = useMemo(() => {
    if (!selectedSimulant) return null;
    return simulants.get(selectedSimulant) || null;
  }, [selectedSimulant, simulants]);

  // Get current animation state for selected simulant
  const currentAnimationState = useMemo(() => {
    if (!selectedSimulant) return null;
    return (
      animationStates.get(selectedSimulant) || {
        currentAnimation: null,
        isPlaying: false,
        transitionProgress: 0,
        error: null,
      }
    );
  }, [selectedSimulant, animationStates]);

  // Auto-select first simulant if none selected
  useEffect(() => {
    if (!selectedSimulant && simulantList.length > 0) {
      setSelectedSimulant(simulantList[0].id);
    }
  }, [selectedSimulant, simulantList]);

  // Update animation state based on simulant's lastAction
  useEffect(() => {
    if (!currentSimulant || !enableRealTimeUpdates) return;

    const mapActionToAnimation = (action: string): string => {
      const lowerAction = action.toLowerCase();

      if (lowerAction.includes("jump") || lowerAction.includes("leap"))
        return "jumping";
      if (lowerAction.includes("run") || lowerAction.includes("sprint"))
        return "running";
      if (lowerAction.includes("walk") || lowerAction.includes("move"))
        return "walking";
      if (lowerAction.includes("build") || lowerAction.includes("construct"))
        return "building";
      if (lowerAction.includes("talk") || lowerAction.includes("communicate"))
        return "communicating";
      if (lowerAction.includes("think") || lowerAction.includes("analyze"))
        return "thinking";
      if (lowerAction.includes("celebrate") || lowerAction.includes("dance"))
        return "celebrating";

      return "idle";
    };

    const detectedAnimation = mapActionToAnimation(currentSimulant.lastAction);

    setAnimationStates((prev) => {
      const newStates = new Map(prev);
      const currentState = newStates.get(selectedSimulant!) || {
        currentAnimation: null,
        isPlaying: false,
        transitionProgress: 0,
        error: null,
      };

      if (currentState.currentAnimation !== detectedAnimation) {
        newStates.set(selectedSimulant!, {
          ...currentState,
          currentAnimation: detectedAnimation,
          isPlaying: true,
          transitionProgress: 0,
        });
      }

      return newStates;
    });
  }, [currentSimulant?.lastAction, selectedSimulant, enableRealTimeUpdates]);

  /**
   * Handle animation change
   */
  const handleAnimationChange = useCallback(
    (animationKey: AnimationState) => {
      if (!selectedSimulant) {
        const error = "No simulant selected";
        onError?.(error);
        return;
      }

      try {
        // Find animation metadata
        const animationData = AVAILABLE_ANIMATIONS.find(
          (anim) => anim.key === animationKey,
        );
        if (!animationData) {
          throw new Error(`Animation "${animationKey}" not found`);
        }

        // Update simulant's last action to trigger animation change
        updateSimulant(selectedSimulant, {
          lastAction: animationData.description,
        });

        // Update local animation state
        setAnimationStates((prev) => {
          const newStates = new Map(prev);
          newStates.set(selectedSimulant, {
            currentAnimation: animationKey,
            isPlaying: true,
            transitionProgress: 0,
            error: null,
          });
          return newStates;
        });

        // Call callback
        onAnimationChange?.(selectedSimulant, animationKey);

        void import("@/utils/devLogger").then(({ devLog }) =>
          devLog(
            `🎬 Animation changed: ${animationKey} for simulant ${selectedSimulant}`,
          ),
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown animation error";

        // Update error state
        setAnimationStates((prev) => {
          const newStates = new Map(prev);
          const currentState = newStates.get(selectedSimulant!) || {
            currentAnimation: null,
            isPlaying: false,
            transitionProgress: 0,
            error: null,
          };

          newStates.set(selectedSimulant!, {
            ...currentState,
            error: errorMessage,
          });
          return newStates;
        });

        onError?.(errorMessage);
        devError("Animation change failed:", error);
      }
    },
    [selectedSimulant, updateSimulant, onAnimationChange, onError],
  );

  /**
   * Handle simulant selection change
   */
  const handleSimulantChange = useCallback((simulantId: string) => {
    setSelectedSimulant(simulantId);
  }, []);

  /**
   * Stop current animation
   */
  const handleStopAnimation = useCallback(() => {
    if (!selectedSimulant) return;

    updateSimulant(selectedSimulant, {
      lastAction: "Standing still",
    });

    setAnimationStates((prev) => {
      const newStates = new Map(prev);
      const currentState = newStates.get(selectedSimulant) || {
        currentAnimation: null,
        isPlaying: false,
        transitionProgress: 0,
        error: null,
      };

      newStates.set(selectedSimulant, {
        ...currentState,
        currentAnimation: "idle",
        isPlaying: false,
      });
      return newStates;
    });
  }, [selectedSimulant, updateSimulant]);

  /**
   * Clear animation error
   */
  const handleClearError = useCallback(() => {
    if (!selectedSimulant) return;

    setAnimationStates((prev) => {
      const newStates = new Map(prev);
      const currentState = newStates.get(selectedSimulant) || {
        currentAnimation: null,
        isPlaying: false,
        transitionProgress: 0,
        error: null,
      };

      newStates.set(selectedSimulant, {
        ...currentState,
        error: null,
      });
      return newStates;
    });
  }, [selectedSimulant]);

  // Don't render if no simulants
  if (simulantList.length === 0) {
    return (
      <div className={`fixed bottom-6 left-6 z-50 ${className}`}>
        <Card className="bg-black/20 backdrop-blur-md border-white/10 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-white/60">
              <User size={16} />
              <span className="text-sm">No simulants available</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-6 left-6 z-50 ${className}`}>
      <Card className="bg-black/20 backdrop-blur-md border-white/10 text-white min-w-[300px]">
        {/* Header */}
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity size={18} />
              Animation Controls
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-white hover:bg-white/10"
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </Button>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="pt-0 space-y-4">
            {/* Simulant Selection */}
            <div className="space-y-2">
              <Label className="text-sm text-white/80">Select Simulant</Label>
              <div className="relative">
                <select
                  value={selectedSimulant || ""}
                  onChange={(e) => handleSimulantChange(e.target.value)}
                  className="w-full bg-black/30 border border-white/20 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  {simulantList.map((simulant) => (
                    <option
                      key={simulant.id}
                      value={simulant.id}
                      className="bg-black text-white"
                    >
                      {simulant.name} ({simulant.status})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Separator className="bg-white/10" />

            {/* Current Animation State */}
            {currentAnimationState && (
              <div className="space-y-2">
                <Label className="text-sm text-white/80">Current State</Label>
                <div className="bg-black/30 rounded-md p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Animation:</span>
                    <span className="text-sm font-medium text-blue-300">
                      {currentAnimationState.currentAnimation || "None"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Status:</span>
                    <span
                      className={`text-sm font-medium ${
                        currentAnimationState.isPlaying
                          ? "text-green-300"
                          : "text-gray-300"
                      }`}
                    >
                      {currentAnimationState.isPlaying ? "Playing" : "Stopped"}
                    </span>
                  </div>
                  {currentAnimationState.transitionProgress > 0 &&
                    currentAnimationState.transitionProgress < 1 && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Transition:</span>
                          <span className="text-sm text-yellow-300">
                            {Math.round(
                              currentAnimationState.transitionProgress * 100,
                            )}
                            %
                          </span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-1">
                          <div
                            className="bg-yellow-400 h-1 rounded-full transition-all duration-100"
                            style={{
                              width: `${currentAnimationState.transitionProgress * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  {currentAnimationState.error && (
                    <div className="flex items-center gap-2 text-red-300 text-sm">
                      <AlertCircle size={14} />
                      <span>{currentAnimationState.error}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearError}
                        className="ml-auto text-red-300 hover:bg-red-500/20 h-6 px-2"
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <Separator className="bg-white/10" />

            {/* Animation Buttons */}
            <div className="space-y-3">
              <Label className="text-sm text-white/80">Animations</Label>
              <div className="grid grid-cols-2 gap-2">
                {AVAILABLE_ANIMATIONS.map((animation) => {
                  const isActive =
                    currentAnimationState?.currentAnimation === animation.key;
                  const hasError = currentAnimationState?.error && isActive;

                  return (
                    <Button
                      key={animation.key}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAnimationChange(animation.key)}
                      disabled={!selectedSimulant}
                      className={`
                        ${animation.color}
                        ${isActive ? "ring-2 ring-white/30" : ""}
                        ${hasError ? "ring-2 ring-red-500/50" : ""}
                        flex items-center gap-2 h-10 text-left justify-start
                      `}
                      title={animation.description}
                    >
                      <span className="text-base">{animation.icon}</span>
                      <span className="text-sm font-medium">
                        {animation.label}
                      </span>
                      {isActive && currentAnimationState?.isPlaying && (
                        <div className="ml-auto w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleStopAnimation}
                disabled={
                  !selectedSimulant || !currentAnimationState?.isPlaying
                }
                className="flex-1 text-red-300 hover:bg-red-500/20"
              >
                <Square size={14} className="mr-1" />
                Stop
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvancedControls(!showAdvancedControls)}
                className="text-white/60 hover:bg-white/10"
              >
                <Settings size={14} />
              </Button>
              {process.env.NODE_ENV === "development" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPerformanceDebug(!showPerformanceDebug)}
                  className="text-white/60 hover:bg-white/10"
                  title="Performance Monitor"
                >
                  📊
                </Button>
              )}
            </div>

            {/* Advanced Controls */}
            {showAdvancedControls && (
              <>
                <Separator className="bg-white/10" />
                <div className="space-y-4">
                  <Label className="text-sm text-white/80">
                    Advanced Settings
                  </Label>

                  {/* Cross-fade Duration */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-white/60">
                        Cross-fade Duration
                      </Label>
                      <span className="text-xs text-white/60">
                        {crossFadeDuration.toFixed(1)}s
                      </span>
                    </div>
                    <Slider
                      value={[crossFadeDuration]}
                      onValueChange={([value]) => setCrossFadeDuration(value)}
                      min={0.1}
                      max={2.0}
                      step={0.1}
                      className="w-full"
                    />
                  </div>

                  {/* Animation Speed */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-white/60">
                        Animation Speed
                      </Label>
                      <span className="text-xs text-white/60">
                        {animationSpeed.toFixed(1)}x
                      </span>
                    </div>
                    <Slider
                      value={[animationSpeed]}
                      onValueChange={([value]) => setAnimationSpeed(value)}
                      min={0.1}
                      max={3.0}
                      step={0.1}
                      className="w-full"
                    />
                  </div>

                  {/* Real-time Updates Toggle */}
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-white/60">
                      Real-time Updates
                    </Label>
                    <Switch
                      checked={enableRealTimeUpdates}
                      onCheckedChange={setEnableRealTimeUpdates}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Instructions */}
            <div className="text-xs text-white/40 pt-2 border-t border-white/10 space-y-1">
              <div>• Click animation buttons to test different states</div>
              <div>
                • Select different simulants to control multiple characters
              </div>
              <div>• Use advanced settings to fine-tune transitions</div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Performance Debug Panel */}
      {showPerformanceDebug && process.env.NODE_ENV === "development" && (
        <PerformanceDebugPanel
          performanceOptimization={performanceOptimization}
          onClose={() => setShowPerformanceDebug(false)}
        />
      )}
    </div>
  );
}
