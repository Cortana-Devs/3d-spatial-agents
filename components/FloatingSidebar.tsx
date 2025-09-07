"use client";

import React from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Separator } from "./ui/separator";
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

type TabKey = "animation" | "simulants" | "camera" | "floor";

const CAMERA_MODE_CONFIG = {
  orbit: { icon: RotateCcw, label: "Orbit" },
  fly: { icon: Move3D, label: "Fly" },
  cinematic: { icon: Video, label: "Cinematic" },
  "follow-simulant": { icon: Eye, label: "Follow" },
} as const;

// Animation configuration for the sidebar
const ANIMATION_CONFIG = {
  idle: {
    icon: User,
    label: "Idle",
    color: "bg-blue-500/20 text-blue-300 hover:bg-blue-500/30",
    description: "Standing idle variations",
  },
  walking: {
    icon: Activity,
    label: "Walk",
    color: "bg-green-500/20 text-green-300 hover:bg-green-500/30",
    description: "Walking forward",
  },
  running: {
    icon: Zap,
    label: "Run",
    color: "bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30",
    description: "Running fast",
  },
  jumping: {
    icon: Square,
    label: "Jump",
    color: "bg-purple-500/20 text-purple-300 hover:bg-purple-500/30",
    description: "Jumping action",
  },
  building: {
    icon: Settings,
    label: "Build",
    color: "bg-orange-500/20 text-orange-300 hover:bg-orange-500/30",
    description: "Building/constructing",
  },
  communicating: {
    icon: Users,
    label: "Talk",
    color: "bg-pink-500/20 text-pink-300 hover:bg-pink-500/30",
    description: "Talking/communicating",
  },
  thinking: {
    icon: Clock,
    label: "Think",
    color: "bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30",
    description: "Thinking/analyzing",
  },
  celebrating: {
    icon: Repeat,
    label: "Celebrate",
    color: "bg-red-500/20 text-red-300 hover:bg-red-500/30",
    description: "Celebrating/dancing",
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
  const [position, setPosition] = React.useState(() => {
    // Load position from localStorage, fallback to default
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("floatingSidebarPosition");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return { x: 16, y: 120 };
        }
      }
    }
    return { x: 16, y: 120 }; // Start below header
  });
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });
  const dragRef = React.useRef<HTMLDivElement>(null);

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

      // Handle 'F' key for quick floor placement
      if (event.key === "f" || event.key === "F") {
        event.preventDefault();
        handleDebouncedFloorAction(() => {
          // Clear blocks first if near limit
          if (blockCount > worldLimits.maxBlocks * 0.9) {
            if (process.env.NODE_ENV === "development") {
              console.warn("Clearing blocks before placing floor due to limit");
            }
            clearAllBlocks();
          }
          // Normalize placement to y=0 via FloorManager defaults
          if (process.env.NODE_ENV === "development") {
            console.warn(
              `Placing floor with size: ${gridConfig.size} (total blocks: ${gridConfig.size * gridConfig.size})`,
            );
          }
          quickFloorUtils.placeStoneFloor(gridConfig.size);
          if (process.env.NODE_ENV === "development") {
            console.warn(
              `Quick stone floor placed at y=0 (${gridConfig.size}×${gridConfig.size})`,
            );
          }
        });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    safeCameraMode,
    gridConfig.visibility,
    updateGridConfig,
    gridConfig.size,
  ]);

  // Drag event handlers
  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (dragRef.current) {
      setIsDragging(true);
      const rect = dragRef.current.getBoundingClientRect();
      setDragStart({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  }, []);

  const handleTouchStart = React.useCallback((e: React.TouchEvent) => {
    if (dragRef.current && e.touches.length === 1) {
      setIsDragging(true);
      const rect = dragRef.current.getBoundingClientRect();
      const touch = e.touches[0];
      setDragStart({
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      });
    }
  }, []);

  const handleMouseMove = React.useCallback(
    (e: MouseEvent) => {
      if (isDragging) {
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;

        // Constrain to viewport bounds
        const maxX = window.innerWidth - 320; // sidebar width
        const maxY = window.innerHeight - 400; // approximate sidebar height

        const newPosition = {
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(80, Math.min(newY, maxY)), // Keep below header (80px min)
        };
        setPosition(newPosition);

        // Save position to localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem(
            "floatingSidebarPosition",
            JSON.stringify(newPosition),
          );
        }
      }
    },
    [isDragging, dragStart],
  );

  const handleTouchMove = React.useCallback(
    (e: TouchEvent) => {
      if (isDragging && e.touches.length === 1) {
        e.preventDefault();
        const touch = e.touches[0];
        const newX = touch.clientX - dragStart.x;
        const newY = touch.clientY - dragStart.y;

        // Constrain to viewport bounds
        const maxX = window.innerWidth - 320; // sidebar width
        const maxY = window.innerHeight - 400; // approximate sidebar height

        const newPosition = {
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(80, Math.min(newY, maxY)), // Keep below header (80px min)
        };
        setPosition(newPosition);

        // Save position to localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem(
            "floatingSidebarPosition",
            JSON.stringify(newPosition),
          );
        }
      }
    },
    [isDragging, dragStart],
  );

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add global mouse and touch event listeners for dragging
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });
      document.addEventListener("touchend", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleTouchMove, handleMouseUp]);

  // Animation control functions
  const handlePlayAnimation = (animationState: AnimationState) => {
    setCurrentAnimation(animationState);

    // Map animation states to actions
    const actionMap: Record<AnimationState, string> = {
      idle: "standing idle",
      walking: "walk forward",
      running: "run forward",
      jumping: "jump up",
      building: "building a structure",
      communicating: "talking to someone",
      thinking: "thinking deeply",
      celebrating: "celebrating victory",
    };

    const action = actionMap[animationState];
    simulants.forEach((simulant) => {
      updateSimulant(simulant.id, {
        lastAction: action,
        status: animationState === "idle" ? "idle" : "active",
      });
    });
  };

  const handleStopAllAnimations = () => {
    setCurrentAnimation(null);
    simulants.forEach((simulant) => {
      updateSimulant(simulant.id, {
        lastAction: "standing idle",
        status: "idle",
      });
    });
  };

  const handleRandomAnimation = () => {
    const animations: AnimationState[] = [
      "idle",
      "walking",
      "running",
      "jumping",
      "building",
      "communicating",
      "thinking",
      "celebrating",
    ];
    const randomAnimation =
      animations[Math.floor(Math.random() * animations.length)];
    handlePlayAnimation(randomAnimation);
  };

  const handleToggleIdleCycling = () => {
    setEnableIdleCycling(!enableIdleCycling);
    // Note: The actual cycling is handled by the animation controller
    // This is just for UI state management
  };

  // Animation tab actions
  const handleAddTestSimulant = () => {
    const simulantId = `simulant-${Date.now()}`;
    const spawnPositions = SimulantUtils.calculateSpawnPositions(
      simulants.size + 1,
      0,
      0,
      3 + simulants.size * 0.5,
    );
    const spawnPosition = spawnPositions[simulants.size] ||
      spawnPositions[0] || { x: 0, y: 0, z: 0 };

    const newSimulant: AISimulant = {
      id: simulantId,
      name: `Test Simulant`,
      position: spawnPosition,
      status: "idle",
      lastAction: "standing idle",
      conversationHistory: [],
      geminiSessionId: `session-${simulantId}`,
    };
    addSimulant(newSimulant);
  };

  // Simulants tab actions (compact copy of existing controls)
  const simulantStats = React.useMemo(() => {
    const stats = { total: 0, active: 0, idle: 0, disconnected: 0 } as Record<
      string,
      number
    >;
    simulants.forEach((s) => {
      stats.total++;
      stats[s.status] = (stats[s.status] || 0) + 1;
    });
    return stats;
  }, [simulants]);

  const handleAddPresetSimulant = React.useCallback(() => {
    const presets = [
      {
        name: "Builder",
        defaultAction: "Looking for the perfect spot to build",
      },
      { name: "Explorer", defaultAction: "Exploring the voxel landscape" },
      { name: "Thinker", defaultAction: "Analyzing the world structure" },
      { name: "Social", defaultAction: "Looking for someone to chat with" },
    ];
    const preset = presets[selectedPreset];

    const simulantId = `simulant-${Date.now()}`;
    const spawnPositions = SimulantUtils.calculateSpawnPositions(
      simulants.size + 1,
      0,
      0,
      3 + simulants.size * 0.5,
    );
    const spawnPosition = spawnPositions[simulants.size] ||
      spawnPositions[0] || { x: 0, y: 0, z: 0 };

    const newSimulant: AISimulant = {
      id: simulantId,
      name: `${preset.name}-${simulants.size + 1}`,
      position: spawnPosition,
      status: "active",
      lastAction: preset.defaultAction,
      conversationHistory: [],
      geminiSessionId: `session-${simulantId}`,
    };
    addSimulant(newSimulant);
    setSelectedPreset((p) => (p + 1) % presets.length);
  }, [simulants.size, selectedPreset, addSimulant]);

  const handleRemoveLastSimulant = React.useCallback(() => {
    if (simulants.size === 0) return;
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
      <Card className="bg-black/20 backdrop-blur-md border-white/10 text-white w-[320px] shadow-xl">
        {/* Drag handle */}
        <div
          className="flex items-center justify-center py-1 px-2 cursor-grab active:cursor-grabbing border-b border-white/10 touch-none"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          title="Drag to move sidebar"
        >
          <GripVertical
            size={16}
            className="text-white/40 hover:text-white/60"
          />
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 p-2">
          <button
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              activeTab === "animation"
                ? "bg-white/20 text-white"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
            onClick={() => setActiveTab("animation")}
            title="Animation Test Controls"
          >
            Animation
          </button>
          <button
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              activeTab === "simulants"
                ? "bg-white/20 text-white"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
            onClick={() => setActiveTab("simulants")}
            title="Simulants"
          >
            Simulants
          </button>
          <button
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              activeTab === "camera"
                ? "bg-white/20 text-white"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
            onClick={() => setActiveTab("camera")}
            title="Camera"
          >
            Camera
          </button>
          <button
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              activeTab === "floor"
                ? "bg-white/20 text-white"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
            onClick={() => setActiveTab("floor")}
            title="Floor Controls"
          >
            Floor
          </button>
        </div>

        <Separator className="bg-white/10" />

        {/* Tab content */}
        {activeTab === "animation" && (
          <div className="p-3 space-y-3 max-h-[500px] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="text-xs text-white/60">Animation Controls</div>
              <div className="text-[10px] text-white/50">
                Simulants: {simulants.size}
              </div>
            </div>

            {/* Add Simulant */}
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 text-white/80 hover:bg-white/10"
                onClick={handleAddTestSimulant}
              >
                <Plus size={12} className="mr-1" /> Add Simulant
              </Button>
            </div>

            <Separator className="bg-white/10" />

            {/* Animation Grid */}
            <div className="space-y-2">
              <div className="text-xs text-white/60">Play Animations</div>
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
            </div>

            <Separator className="bg-white/10" />

            {/* Control Buttons */}
            <div className="space-y-2">
              <div className="text-xs text-white/60">Controls</div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-white/80 hover:bg-white/10"
                  onClick={handleStopAllAnimations}
                  disabled={simulants.size === 0}
                >
                  <Square size={12} className="mr-1" /> Stop All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-white/80 hover:bg-white/10"
                  onClick={handleRandomAnimation}
                  disabled={simulants.size === 0}
                >
                  <Shuffle size={12} className="mr-1" /> Random
                </Button>
              </div>
            </div>

            <Separator className="bg-white/10" />

            {/* Animation Settings */}
            <div className="space-y-3">
              <div className="text-xs text-white/60">Settings</div>

              {/* Cross-fade Duration */}
              <div className="space-y-1">
                <Label className="text-[10px] text-white/70">
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
                <Label className="text-[10px] text-white/70">
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
              <div className="flex items-center justify-between">
                <Label className="text-[10px] text-white/70">
                  Idle Cycling
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleIdleCycling}
                  className={`text-xs ${enableIdleCycling ? "text-green-300" : "text-white/50"}`}
                >
                  {enableIdleCycling ? "ON" : "OFF"}
                </Button>
              </div>

              {enableIdleCycling && (
                <div className="space-y-1">
                  <Label className="text-[10px] text-white/70">
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
            </div>

            {/* Current Animation Status */}
            {currentAnimation && (
              <div className="text-[10px] text-white/50 pt-2 border-t border-white/10">
                Playing: {ANIMATION_CONFIG[currentAnimation].label}
                {enableIdleCycling &&
                  currentAnimation === "idle" &&
                  " (cycling)"}
              </div>
            )}
          </div>
        )}

        {activeTab === "simulants" && (
          <div className="p-3 space-y-2">
            <div className="text-xs text-white/60">Manage Simulants</div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddPresetSimulant}
                disabled={false}
                className="w-full text-green-300 hover:bg-green-500/20"
              >
                <Plus size={12} className="mr-1" /> Add
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveLastSimulant}
                disabled={simulants.size === 0}
                className="w-full text-red-300 hover:bg-red-500/20"
              >
                <Minus size={12} className="mr-1" /> Remove
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleAllSimulants}
                disabled={simulants.size === 0}
                className="w-full text-blue-300 hover:bg-blue-500/20 col-span-2"
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
                className="w-full text-yellow-300 hover:bg-yellow-500/20 col-span-2"
              >
                <RotateCcw size={12} className="mr-1" /> Random Actions
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSimulants}
                disabled={simulants.size === 0}
                className="w-full text-red-300 hover:bg-red-500/20 col-span-2"
              >
                Clear All
              </Button>
            </div>
            <Separator className="bg-white/10" />
            <div className="grid grid-cols-4 gap-2 text-[10px] text-white/60">
              <div>Total: {simulantStats.total}</div>
              <div>Active: {simulantStats.active}</div>
              <div>Idle: {simulantStats.idle}</div>
              <div>Off: {simulantStats.disconnected || 0}</div>
            </div>
          </div>
        )}

        {activeTab === "camera" && (
          <div className="p-3 space-y-2">
            <div className="text-xs text-white/60">Camera Modes</div>
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
                        ? "bg-blue-500/20 text-blue-300 border-blue-400/30"
                        : "text-white hover:bg-white/10"
                    } w-full justify-start`}
                  >
                    <Icon size={14} className="mr-2" />{" "}
                    {CAMERA_MODE_CONFIG[mode].label}
                  </Button>
                );
              })}
            </div>
            <Separator className="bg-white/10" />
            <div className="text-xs text-white/60">Grid</div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  updateGridConfig({ visibility: !gridConfig.visibility })
                }
                className={`flex-1 ${gridConfig.visibility ? "bg-green-500/20 text-green-300" : "text-white hover:bg-white/10"}`}
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
                className={`flex-1 ${gridConfig.snapToGrid ? "bg-blue-500/20 text-blue-300" : "text-white hover:bg-white/10"}`}
              >
                <Settings size={14} className="mr-2" /> Snap{" "}
                {gridConfig.snapToGrid ? "On" : "Off"}
              </Button>
            </div>
            <div className="text-[10px] text-white/50">
              Shortcuts: ⌘/Ctrl+C cycle • G toggle grid
            </div>
          </div>
        )}

        {activeTab === "floor" && (
          <div className="p-2 space-y-2">
            {/* Debug Info */}
            <div className="bg-white/5 rounded p-2 text-xs">
              <div className="text-white/60 mb-1">World Status</div>
              <div className="text-white">
                Blocks: {blockCount} / {worldLimits.maxBlocks}
              </div>
              <div className="text-white/70">
                Usage: {((blockCount / worldLimits.maxBlocks) * 100).toFixed(1)}
                %
              </div>
            </div>

            {/* Clear Blocks Button */}
            <button
              onClick={() => {
                if (
                  confirm(
                    `Clear all ${blockCount} blocks? This cannot be undone.`,
                  )
                ) {
                  clearAllBlocks();
                }
              }}
              className="w-full px-3 py-2 bg-red-600/80 hover:bg-red-600 text-white text-xs rounded transition-colors"
            >
              Clear All Blocks ({blockCount})
            </button>

            <div className="text-xs text-white/60">Quick Floor Actions</div>

            {/* Quick floor buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  handleDebouncedFloorAction(() => {
                    if (process.env.NODE_ENV === "development") {
                      console.warn(
                        `Floor button: Placing floor with size: ${gridConfig.size}`,
                      );
                    }
                    quickFloorUtils.placeStoneFloor(gridConfig.size);
                  })
                }
                className="text-white hover:bg-white/10 flex items-center gap-2"
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
                className="text-white hover:bg-white/10 flex items-center gap-2"
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
                className="text-white hover:bg-white/10 flex items-center gap-2"
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
                className="text-white hover:bg-white/10 flex items-center gap-2"
              >
                <div className="w-3 h-3 bg-gradient-to-br from-gray-500 to-amber-600 rounded"></div>
                Checker
              </Button>
            </div>

            <Separator className="bg-white/10" />

            {/* Advanced controls */}
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                disabled
                onClick={() => setIsFloorPanelOpen(false)}
                className="w-full text-white/60 hover:bg-white/10 justify-start"
              >
                <Settings size={14} className="mr-2" />
                Advanced Controls (disabled)
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => quickFloorUtils.clearFloorArea(gridConfig.size)}
                className="w-full text-red-300 hover:bg-red-500/20 justify-start"
              >
                <Minus size={14} className="mr-2" />
                Clear Floor Area
              </Button>
            </div>

            <div className="text-[10px] text-white/50">
              Floor covers {gridConfig.size}×{gridConfig.size} grid area • Press
              F for quick stone floor
            </div>
          </div>
        )}
      </Card>

      {/* Advanced floor panel disabled for compact UI */}
      <FloorControlPanel isOpen={false} onClose={() => {}} />
    </div>
  );
}
