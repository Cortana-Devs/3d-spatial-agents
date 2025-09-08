"use client";

import React from "react";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import {
  FloatingPanel,
  FloatingPanelHeader,
  FloatingPanelItem,
  FloatingPanelSection,
  FloatingPanelDivider,
} from "./ui/FloatingPanel";
import { Slider } from "./ui/slider";
import { Label } from "./ui/label";
import {
  Users,
  Video,
  Move3D,
  Eye,
  RotateCcw,
  Grid3X3,
  Settings,
  Plus,
  Minus,
  Play,
  Pause,
  GripVertical,
  Square,
  Activity,
  User,
  Zap,
  Clock,
  Repeat,
  Shuffle,
  Home,
} from "lucide-react";
import FloorControlPanel from "./world/FloorControlPanel";
import { quickFloorUtils } from "../utils/floorManager";
import { useWorldStore } from "../store/worldStore";
import { CAMERA_PRESETS } from "./world/CameraController";
import { SimulantUtils } from "./simulants/SimulantManager";
import type { AISimulant, CameraMode } from "../types";
import type { AnimationState } from "../utils/animationController";
import { useSafeCameraMode } from "../hooks/useSafeCameraMode";
import { ifDev, devWarn } from "../utils/devLogger";
import { Y_LEVEL_CONSTANTS } from "../config/yLevelConstants";

type TabKey = "animation" | "simulants" | "camera" | "floor";

const CAMERA_MODE_CONFIG = {
  orbit: { icon: RotateCcw, label: "Orbit" },
  fly: { icon: Move3D, label: "Fly" },
  cinematic: { icon: Video, label: "Cinematic" },
  "follow-simulant": { icon: Eye, label: "Follow" },
} as const;

const ANIMATION_CONFIG = {
  idle: {
    label: "Idle",
    icon: User,
    description: "Standing idle variations",
    color: "bg-blue-500/20 text-blue-300 hover:bg-blue-500/30",
  },
  walking: {
    label: "Walk",
    icon: Activity,
    description: "Walking forward",
    color: "bg-green-500/20 text-green-300 hover:bg-green-500/30",
  },
  running: {
    label: "Run",
    icon: Zap,
    description: "Running fast",
    color: "bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30",
  },
  jumping: {
    label: "Jump",
    icon: Square,
    description: "Jumping action",
    color: "bg-purple-500/20 text-purple-300 hover:bg-purple-500/30",
  },
  building: {
    label: "Build",
    icon: Settings,
    description: "Building/constructing",
    color: "bg-orange-500/20 text-orange-300 hover:bg-orange-500/30",
  },
  communicating: {
    label: "Talk",
    icon: Users,
    description: "Talking/communicating",
    color: "bg-pink-500/20 text-pink-300 hover:bg-pink-500/30",
  },
  thinking: {
    label: "Think",
    icon: Clock,
    description: "Thinking/analyzing",
    color: "bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30",
  },
  celebrating: {
    label: "Celebrate",
    icon: Repeat,
    description: "Celebrating/dancing",
    color: "bg-red-500/20 text-red-300 hover:bg-red-500/30",
  },
} as const;

export default function FloatingSidebar() {
  const {
    simulants,
    addSimulant,
    removeSimulant,
    updateSimulant,
    gridConfig,
    updateGridConfig,
    activeCamera,
    blockCount,
    worldLimits,
    clearAllBlocks,
  } = useWorldStore();

  // Use safe camera mode management
  const safeCameraMode = useSafeCameraMode({
    enableKeyboardShortcuts: false, // Handle keyboard shortcuts manually here
    preventUnintentionalSwitches: true,
  });

  const [activeTab, setActiveTab] = React.useState<TabKey>("animation");
  const [selectedPreset, setSelectedPreset] = React.useState(0);
  const [isFloorPanelOpen, setIsFloorPanelOpen] = React.useState(false);
  // Debounce for quick floor actions to avoid duplicate operations
  const floorActionLockRef = React.useRef(false);
  const handleDebouncedFloorAction = React.useCallback(
    (action: () => void, cooldownMs: number = 300) => {
      if (floorActionLockRef.current) return;
      floorActionLockRef.current = true;
      try {
        action();
      } finally {
        setTimeout(() => {
          floorActionLockRef.current = false;
        }, cooldownMs);
      }
    },
    [],
  );

  // Animation state management
  const [currentAnimation, setCurrentAnimation] =
    React.useState<AnimationState | null>(null);
  const [crossFadeDuration, setCrossFadeDuration] = React.useState(0.3);
  const [animationSpeed, setAnimationSpeed] = React.useState(1.0);
  const [enableIdleCycling, setEnableIdleCycling] = React.useState(true);
  const [idleCycleInterval, setIdleCycleInterval] = React.useState(8);

  // Drag functionality
  const [isDragging, setIsDragging] = React.useState(false);
  const [position, setPosition] = React.useState<{ x: number; y: number }>({
    x: 16,
    y: 120,
  }); // Start below header; avoid SSR mismatch
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });
  const dragRef = React.useRef<HTMLDivElement>(null);

  // After mount, restore saved position from localStorage (client-only)
  React.useEffect(() => {
    try {
      const saved =
        typeof window !== "undefined"
          ? window.localStorage.getItem("floatingSidebarPosition")
          : null;
      if (saved) {
        const parsed = JSON.parse(saved) as { x: number; y: number };
        if (typeof parsed?.x === "number" && typeof parsed?.y === "number") {
          setPosition(parsed);
        }
      }
    } catch {
      // ignore JSON/storage errors
    }
  }, []);

  // Keyboard shortcuts: Cmd/Ctrl + C cycles camera; G toggles grid
  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      // Camera mode cycling with Cmd/Ctrl + C
      if (
        (event.metaKey || event.ctrlKey) &&
        (event.key === "c" || event.key === "C")
      ) {
        event.preventDefault();
        safeCameraMode.cycleCameraMode();
        return;
      }
      if (event.key === "g" || event.key === "G") {
        event.preventDefault();
        updateGridConfig({ visibility: !gridConfig.visibility });
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [safeCameraMode, gridConfig.visibility, updateGridConfig]);

  // Save position on change (client-only)
  React.useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          "floatingSidebarPosition",
          JSON.stringify(position),
        );
      }
    } catch {
      // ignore storage errors
    }
  }, [position]);

  const handleMouseDown = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(true);
      setDragStart({
        x: event.clientX - position.x,
        y: event.clientY - position.y,
      });
    },
    [position],
  );

  const handleTouchStart = React.useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      event.preventDefault();
      const touch = event.touches[0];
      setIsDragging(true);
      setDragStart({
        x: touch.clientX - position.x,
        y: touch.clientY - position.y,
      });
    },
    [position],
  );

  React.useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: event.clientX - dragStart.x,
        y: event.clientY - dragStart.y,
      });
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!isDragging) return;
      event.preventDefault();
      const touch = event.touches[0];
      setPosition({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y,
      });
    };

    const handleMouseUp = () => setIsDragging(false);
    const handleTouchEnd = () => setIsDragging(false);

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });
      document.addEventListener("touchend", handleTouchEnd);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging, dragStart]);

  // Simulant stats for display
  const simulantStats = React.useMemo(() => {
    const stats = {
      total: simulants.size,
      active: 0,
      idle: 0,
      disconnected: 0,
    };
    simulants.forEach((s) => {
      if (s.status === "active") stats.active++;
      else if (s.status === "idle") stats.idle++;
      else stats.disconnected++;
    });
    return stats;
  }, [simulants]);

  // Animation handlers
  const handlePlayAnimation = React.useCallback(
    (animationState: AnimationState) => {
      ifDev(() =>
        devWarn(`Playing animation: ${animationState} for all simulants`),
      );
      setCurrentAnimation(animationState);
      // Apply animation to all simulants
      simulants.forEach((simulant) => {
        updateSimulant(simulant.id, {
          lastAction: `Playing ${animationState}`,
        });
      });
    },
    [simulants, updateSimulant],
  );

  const handleStopAllAnimations = React.useCallback(() => {
    setCurrentAnimation(null);
    simulants.forEach((simulant) => {
      updateSimulant(simulant.id, { lastAction: "Standing idle" });
    });
  }, [simulants, updateSimulant]);

  const handleRandomAnimation = React.useCallback(() => {
    const animations = Object.keys(ANIMATION_CONFIG) as AnimationState[];
    const randomAnimation =
      animations[Math.floor(Math.random() * animations.length)];
    handlePlayAnimation(randomAnimation);
  }, [handlePlayAnimation]);

  const handleToggleIdleCycling = React.useCallback(() => {
    setEnableIdleCycling(!enableIdleCycling);
  }, [enableIdleCycling]);

  // Simulant management handlers
  const handleAddTestSimulant = React.useCallback(() => {
    const position = {
      x: Math.random() * 10,
      y: Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL,
      z: Math.random() * 10,
    };

    const simulantId = `test-simulant-${Date.now()}`;
    const newSimulant: AISimulant = {
      id: simulantId,
      name: `Test Simulant ${simulants.size + 1}`,
      position,
      status: "idle",
      lastAction: "Standing idle",
      conversationHistory: [],
      geminiSessionId: `session-${simulantId}`,
    };
    addSimulant(newSimulant);
  }, []);

  const handleAddPresetSimulant = React.useCallback(() => {
    const presets = [
      { name: "Builder", action: "Looking for the perfect spot to build" },
      { name: "Explorer", action: "Exploring the voxel landscape" },
      { name: "Thinker", action: "Analyzing the world structure" },
      { name: "Social", action: "Looking for someone to chat with" },
    ];

    const preset = presets[selectedPreset % presets.length];
    const position = {
      x: Math.random() * 10,
      y: Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL,
      z: Math.random() * 10,
    };

    const simulantId = `preset-simulant-${Date.now()}`;
    const newSimulant: AISimulant = {
      id: simulantId,
      name: `${preset.name} ${simulants.size + 1}`,
      position,
      status: "active",
      lastAction: preset.action,
      conversationHistory: [],
      geminiSessionId: `session-${simulantId}`,
    };
    addSimulant(newSimulant);
    setSelectedPreset((prev) => (prev + 1) % presets.length);
  }, [selectedPreset]);

  const handleRemoveLastSimulant = React.useCallback(() => {
    const arr = Array.from(simulants.values());
    const last = arr[arr.length - 1];
    if (last) removeSimulant(last.id);
  }, [simulants, removeSimulant]);

  const handleToggleAllSimulants = React.useCallback(() => {
    const hasActive = Array.from(simulants.values()).some(
      (s) => s.status === "active",
    );
    const newStatus = hasActive ? "idle" : "active";
    simulants.forEach((s) => updateSimulant(s.id, { status: newStatus }));
  }, [simulants, updateSimulant]);

  const handleRandomActions = React.useCallback(() => {
    const actions = [
      "Building a tower",
      "Exploring the area",
      "Thinking about life",
      "Looking for friends",
      "Analyzing patterns",
      "Creating art",
      "Resting peacefully",
      "Planning next move",
    ];
    simulants.forEach((s) => {
      const randomAction = actions[Math.floor(Math.random() * actions.length)];
      updateSimulant(s.id, { lastAction: randomAction });
    });
  }, [simulants, updateSimulant]);

  const handleClearSimulants = React.useCallback(() => {
    simulants.forEach((s) => removeSimulant(s.id));
  }, [simulants, removeSimulant]);

  // Camera tab actions with safe mode management
  const handleChangeCameraMode = (mode: CameraMode) => {
    safeCameraMode.changeCameraMode(mode, false, "user");
  };

  return (
    <div
      ref={dragRef}
      className={`fixed z-50 draggable-sidebar ${isDragging ? "dragging" : ""}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? "grabbing" : "default",
      }}
    >
      <FloatingPanel className="w-[320px]">
        {/* Drag handle */}
        <div
          className="flex items-center justify-center py-1 px-2 cursor-grab active:cursor-grabbing border-b border-axiom-neutral-200 dark:border-axiom-neutral-700 touch-none"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          title="Drag to move sidebar"
        >
          <GripVertical
            size={16}
            className="text-axiom-neutral-400 dark:text-axiom-neutral-500 hover:text-axiom-neutral-600 dark:hover:text-axiom-neutral-300"
          />
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 p-2">
          <button
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              activeTab === "animation"
                ? "bg-axiom-primary-500/20 text-axiom-primary-700 dark:text-axiom-primary-300"
                : "text-axiom-neutral-600 dark:text-axiom-neutral-400 hover:text-axiom-neutral-800 dark:hover:text-axiom-neutral-200 hover:bg-axiom-neutral-100 dark:hover:bg-axiom-neutral-800"
            }`}
            onClick={() => setActiveTab("animation")}
            title="Animation Test Controls"
          >
            Animation
          </button>
          <button
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              activeTab === "simulants"
                ? "bg-axiom-primary-500/20 text-axiom-primary-700 dark:text-axiom-primary-300"
                : "text-axiom-neutral-600 dark:text-axiom-neutral-400 hover:text-axiom-neutral-800 dark:hover:text-axiom-neutral-200 hover:bg-axiom-neutral-100 dark:hover:bg-axiom-neutral-800"
            }`}
            onClick={() => setActiveTab("simulants")}
            title="Simulants"
          >
            Simulants
          </button>
          <button
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              activeTab === "camera"
                ? "bg-axiom-primary-500/20 text-axiom-primary-700 dark:text-axiom-primary-300"
                : "text-axiom-neutral-600 dark:text-axiom-neutral-400 hover:text-axiom-neutral-800 dark:hover:text-axiom-neutral-200 hover:bg-axiom-neutral-100 dark:hover:bg-axiom-neutral-800"
            }`}
            onClick={() => setActiveTab("camera")}
            title="Camera"
          >
            Camera
          </button>
          <button
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              activeTab === "floor"
                ? "bg-axiom-primary-500/20 text-axiom-primary-700 dark:text-axiom-primary-300"
                : "text-axiom-neutral-600 dark:text-axiom-neutral-400 hover:text-axiom-neutral-800 dark:hover:text-axiom-neutral-200 hover:bg-axiom-neutral-100 dark:hover:bg-axiom-neutral-800"
            }`}
            onClick={() => setActiveTab("floor")}
            title="Floor Controls"
          >
            Floor
          </button>
        </div>

        <FloatingPanelDivider />

        {/* Tab content */}
        {activeTab === "animation" && (
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {/* Header */}
            <FloatingPanelItem
              label="Animation Controls"
              value={`Simulants: ${simulants.size}`}
            />

            {/* Add Simulant */}
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                onClick={handleAddTestSimulant}
              >
                <Plus size={12} className="mr-1" /> Add Simulant
              </Button>
            </div>

            <FloatingPanelDivider />

            {/* Animation Grid */}
            <FloatingPanelSection title="Play Animations">
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(ANIMATION_CONFIG) as AnimationState[]).map(
                  (animationState) => {
                    const config = ANIMATION_CONFIG[animationState];
                    const Icon = config.icon;
                    const isActive = currentAnimation === animationState;

                    return (
                      <Button
                        key={animationState}
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePlayAnimation(animationState)}
                        disabled={simulants.size === 0}
                        className={`${config.color} ${isActive ? "ring-2 ring-white/30" : ""} flex items-center gap-2 h-10 text-left justify-start`}
                        title={config.description}
                      >
                        <Icon size={14} />
                        <span className="text-sm font-medium">
                          {config.label}
                        </span>
                        {isActive && (
                          <div className="ml-auto w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        )}
                      </Button>
                    );
                  },
                )}
              </div>
            </FloatingPanelSection>

            <FloatingPanelDivider />

            {/* Control Buttons */}
            <FloatingPanelSection title="Controls">
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1"
                  onClick={handleStopAllAnimations}
                  disabled={simulants.size === 0}
                >
                  <Square size={12} className="mr-1" /> Stop All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1"
                  onClick={handleRandomAnimation}
                  disabled={simulants.size === 0}
                >
                  <Shuffle size={12} className="mr-1" /> Random
                </Button>
              </div>
            </FloatingPanelSection>

            <FloatingPanelDivider />

            {/* Animation Settings */}
            <FloatingPanelSection title="Settings">
              {/* Cross-fade Duration */}
              <div className="space-y-1">
                <Label className="text-sm text-axiom-neutral-600 dark:text-axiom-neutral-400">
                  Cross-fade Duration: {crossFadeDuration}s
                </Label>
                <Slider
                  value={[crossFadeDuration]}
                  onValueChange={(value) => setCrossFadeDuration(value[0])}
                  min={0.1}
                  max={2.0}
                  step={0.1}
                  className="w-full"
                />
              </div>

              {/* Animation Speed */}
              <div className="space-y-1">
                <Label className="text-sm text-axiom-neutral-600 dark:text-axiom-neutral-400">
                  Animation Speed: {animationSpeed}x
                </Label>
                <Slider
                  value={[animationSpeed]}
                  onValueChange={(value) => setAnimationSpeed(value[0])}
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  className="w-full"
                />
              </div>

              {/* Idle Cycling */}
              <FloatingPanelItem
                label="Idle Cycling"
                value={enableIdleCycling ? "ON" : "OFF"}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleIdleCycling}
                className={`text-xs w-full ${enableIdleCycling ? "text-axiom-success-600 dark:text-axiom-success-400" : "text-axiom-neutral-500 dark:text-axiom-neutral-500"}`}
              >
                {enableIdleCycling ? "Turn OFF" : "Turn ON"} Idle Cycling
              </Button>

              {enableIdleCycling && (
                <div className="space-y-1">
                  <Label className="text-sm text-axiom-neutral-600 dark:text-axiom-neutral-400">
                    Cycle Interval: {idleCycleInterval}s
                  </Label>
                  <Slider
                    value={[idleCycleInterval]}
                    onValueChange={(value) => setIdleCycleInterval(value[0])}
                    min={3}
                    max={15}
                    step={1}
                    className="w-full"
                  />
                </div>
              )}
            </FloatingPanelSection>

            {/* Current Animation Status */}
            {currentAnimation && (
              <div className="pt-2 border-t border-axiom-neutral-200 dark:border-axiom-neutral-700 text-xs text-axiom-neutral-500 dark:text-axiom-neutral-500">
                Playing: {ANIMATION_CONFIG[currentAnimation].label}
                {enableIdleCycling &&
                  currentAnimation === "idle" &&
                  " (cycling)"}
              </div>
            )}
          </div>
        )}

        {activeTab === "simulants" && (
          <div className="space-y-2">
            <FloatingPanelSection title="Manage Simulants">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddPresetSimulant}
                  disabled={false}
                  className="w-full text-axiom-success-600 dark:text-axiom-success-400 hover:bg-axiom-success-500/20"
                >
                  <Plus size={12} className="mr-1" /> Add
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveLastSimulant}
                  disabled={simulants.size === 0}
                  className="w-full text-axiom-error-600 dark:text-axiom-error-400 hover:bg-axiom-error-500/20"
                >
                  <Minus size={12} className="mr-1" /> Remove
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleAllSimulants}
                  disabled={simulants.size === 0}
                  className="w-full text-axiom-primary-600 dark:text-axiom-primary-400 hover:bg-axiom-primary-500/20 col-span-2"
                >
                  {simulantStats.active > 0 ? (
                    <>
                      <Pause size={12} className="mr-1" /> Pause All
                    </>
                  ) : (
                    <>
                      <Play size={12} className="mr-1" /> Activate All
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRandomActions}
                  disabled={simulants.size === 0}
                  className="w-full text-axiom-warning-600 dark:text-axiom-warning-400 hover:bg-axiom-warning-500/20 col-span-2"
                >
                  <RotateCcw size={12} className="mr-1" /> Random Actions
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSimulants}
                  disabled={simulants.size === 0}
                  className="w-full text-axiom-error-600 dark:text-axiom-error-400 hover:bg-axiom-error-500/20 col-span-2"
                >
                  Clear All
                </Button>
              </div>
            </FloatingPanelSection>

            <FloatingPanelDivider />

            <FloatingPanelItem
              label="Total Simulants"
              value={simulantStats.total}
            />
            <FloatingPanelItem label="Active" value={simulantStats.active} />
            <FloatingPanelItem label="Idle" value={simulantStats.idle} />
            <FloatingPanelItem
              label="Offline"
              value={simulantStats.disconnected || 0}
            />
          </div>
        )}

        {activeTab === "camera" && (
          <div className="space-y-2">
            <FloatingPanelSection title="Camera Modes">
              <div className="grid grid-cols-2 gap-2">
                {(
                  Object.keys(CAMERA_MODE_CONFIG) as Array<
                    keyof typeof CAMERA_MODE_CONFIG
                  >
                ).map((mode) => {
                  const Icon = CAMERA_MODE_CONFIG[mode].icon;
                  const isActive = activeCamera === mode;
                  return (
                    <Button
                      key={mode}
                      variant={isActive ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => handleChangeCameraMode(mode as CameraMode)}
                      className={`${
                        isActive
                          ? "bg-axiom-primary-500/20 text-axiom-primary-700 dark:text-axiom-primary-300 border-axiom-primary-400/30"
                          : ""
                      } w-full justify-start`}
                    >
                      <Icon size={14} className="mr-2" />{" "}
                      {CAMERA_MODE_CONFIG[mode].label}
                    </Button>
                  );
                })}
              </div>
            </FloatingPanelSection>

            <FloatingPanelDivider />

            <FloatingPanelSection title="Grid Settings">
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    updateGridConfig({ visibility: !gridConfig.visibility })
                  }
                  className={`flex-1 ${gridConfig.visibility ? "bg-axiom-success-500/20 text-axiom-success-700 dark:text-axiom-success-300" : ""}`}
                >
                  <Grid3X3 size={14} className="mr-2" />{" "}
                  {gridConfig.visibility ? "Visible" : "Hidden"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    updateGridConfig({ snapToGrid: !gridConfig.snapToGrid })
                  }
                  className={`flex-1 ${gridConfig.snapToGrid ? "bg-axiom-primary-500/20 text-axiom-primary-700 dark:text-axiom-primary-300" : ""}`}
                >
                  <Settings size={14} className="mr-2" /> Snap{" "}
                  {gridConfig.snapToGrid ? "On" : "Off"}
                </Button>
              </div>
            </FloatingPanelSection>

            <div className="text-xs text-axiom-neutral-500 dark:text-axiom-neutral-500">
              Shortcuts: ⌘/Ctrl+C cycle • G toggle grid
            </div>
          </div>
        )}

        {activeTab === "floor" && (
          <div className="space-y-2">
            <FloatingPanelSection title="World Status">
              <FloatingPanelItem
                label="Blocks"
                value={`${blockCount} / ${worldLimits.maxBlocks}`}
                mono
              />
              <FloatingPanelItem
                label="Usage"
                value={`${((blockCount / worldLimits.maxBlocks) * 100).toFixed(1)}%`}
                mono
              />
            </FloatingPanelSection>

            <FloatingPanelDivider />

            {/* Clear Blocks Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (
                  confirm(
                    `Clear all ${blockCount} blocks? This cannot be undone.`,
                  )
                ) {
                  clearAllBlocks();
                }
              }}
              className="w-full text-axiom-error-600 dark:text-axiom-error-400 hover:bg-axiom-error-500/20"
            >
              Clear All Blocks ({blockCount})
            </Button>

            <FloatingPanelSection title="Quick Floor Actions">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    handleDebouncedFloorAction(() => {
                      if (process.env.NODE_ENV === "development") {
                        devWarn(
                          `Floor button: Placing floor with size: ${gridConfig.size}`,
                        );
                      }
                      quickFloorUtils.placeStoneFloor(gridConfig.size);
                    })
                  }
                  className="flex items-center gap-2"
                >
                  <div className="w-3 h-3 bg-gray-500 rounded"></div>
                  Stone Floor
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    handleDebouncedFloorAction(() =>
                      quickFloorUtils.placeWoodFloor(gridConfig.size),
                    )
                  }
                  className="flex items-center gap-2"
                >
                  <div className="w-3 h-3 bg-amber-600 rounded"></div>
                  Wood Floor
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    handleDebouncedFloorAction(() =>
                      quickFloorUtils.placeGlassFloor(gridConfig.size),
                    )
                  }
                  className="flex items-center gap-2"
                >
                  <div className="w-3 h-3 bg-blue-400 rounded opacity-60"></div>
                  Glass Floor
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    handleDebouncedFloorAction(() =>
                      quickFloorUtils.placeCheckerFloor(gridConfig.size),
                    )
                  }
                  className="flex items-center gap-2"
                >
                  <div className="w-3 h-3 bg-gradient-to-br from-gray-500 to-amber-600 rounded"></div>
                  Checker
                </Button>
              </div>
            </FloatingPanelSection>

            <FloatingPanelDivider />

            {/* Advanced controls */}
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                disabled
                onClick={() => setIsFloorPanelOpen(false)}
                className="w-full justify-start text-axiom-neutral-500"
              >
                <Settings size={14} className="mr-2" />
                Advanced Controls (disabled)
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => quickFloorUtils.clearFloorArea(gridConfig.size)}
                className="w-full text-axiom-error-600 dark:text-axiom-error-400 hover:bg-axiom-error-500/20 justify-start"
              >
                <Minus size={14} className="mr-2" />
                Clear Floor Area
              </Button>
            </div>

            <div className="text-xs text-axiom-neutral-500 dark:text-axiom-neutral-500">
              Floor covers {gridConfig.size}×{gridConfig.size} grid area • Press
              F for quick stone floor
            </div>
          </div>
        )}
      </FloatingPanel>

      {/* Advanced floor panel disabled for compact UI */}
      <FloorControlPanel isOpen={false} onClose={() => {}} />
    </div>
  );
}
