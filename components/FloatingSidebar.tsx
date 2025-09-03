"use client";

import React from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Separator } from "./ui/separator";
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
} from "lucide-react";
import { useWorldStore } from "../store/worldStore";
import { CAMERA_PRESETS } from "./world/CameraController";
import { SimulantUtils } from "./simulants/SimulantManager";
import type { AISimulant, CameraMode } from "../types";

type TabKey = "animation" | "simulants" | "camera";

const CAMERA_MODE_CONFIG = {
  orbit: { icon: RotateCcw, label: "Orbit" },
  fly: { icon: Move3D, label: "Fly" },
  cinematic: { icon: Video, label: "Cinematic" },
  "follow-simulant": { icon: Eye, label: "Follow" },
} as const;

export default function FloatingSidebar() {
  const {
    simulants,
    addSimulant,
    removeSimulant,
    updateSimulant,
    gridConfig,
    updateGridConfig,
    setCameraMode,
    activeCamera,
  } = useWorldStore();

  const [activeTab, setActiveTab] = React.useState<TabKey>("animation");
  const [selectedPreset, setSelectedPreset] = React.useState(0);
  
  // Drag functionality
  const [isDragging, setIsDragging] = React.useState(false);
  const [position, setPosition] = React.useState(() => {
    // Load position from localStorage, fallback to default
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('floatingSidebarPosition');
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
      if ((event.metaKey || event.ctrlKey) && (event.key === "c" || event.key === "C")) {
        event.preventDefault();
        const modes: CameraMode[] = ["orbit", "fly", "cinematic", "follow-simulant"];
        const idx = modes.indexOf(activeCamera as CameraMode);
        const next = modes[(idx + 1) % modes.length];
        // Skip follow-simulant if no active simulants
        if (next === "follow-simulant" && Array.from(simulants.values()).every(s => s.status !== "active")) {
          const afterNext = modes[(idx + 2) % modes.length];
          setCameraMode(afterNext);
        } else {
          setCameraMode(next);
        }
      }
      if (event.key === "g" || event.key === "G") {
        event.preventDefault();
        updateGridConfig({ visibility: !gridConfig.visibility });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeCamera, simulants, setCameraMode, gridConfig.visibility, updateGridConfig]);

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
        if (typeof window !== 'undefined') {
          localStorage.setItem('floatingSidebarPosition', JSON.stringify(newPosition));
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
        if (typeof window !== 'undefined') {
          localStorage.setItem('floatingSidebarPosition', JSON.stringify(newPosition));
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
      document.addEventListener("touchmove", handleTouchMove, { passive: false });
      document.addEventListener("touchend", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleTouchMove, handleMouseUp]);

  // Animation tab actions
  const handleAddTestSimulant = () => {
    const simulantId = `simulant-${Date.now()}`;
    const newSimulant: AISimulant = {
      id: simulantId,
      name: `Test Simulant`,
      position: { x: 0, y: 0, z: 0 },
      status: "idle",
      lastAction: "standing idle",
      conversationHistory: [],
      geminiSessionId: `session-${simulantId}`,
    };
    addSimulant(newSimulant);
  };

  const handleStartWalking = () => {
    simulants.forEach((simulant) => {
      updateSimulant(simulant.id, { lastAction: "walk forward", status: "active" });
    });
  };

  const handleStopWalking = () => {
    simulants.forEach((simulant) => {
      updateSimulant(simulant.id, { lastAction: "standing idle", status: "idle" });
    });
  };

  // Simulants tab actions (compact copy of existing controls)
  const simulantStats = React.useMemo(() => {
    const stats = { total: 0, active: 0, idle: 0, disconnected: 0 } as Record<string, number>;
    simulants.forEach((s) => {
      stats.total++;
      stats[s.status] = (stats[s.status] || 0) + 1;
    });
    return stats;
  }, [simulants]);

  const handleAddPresetSimulant = React.useCallback(() => {
    const presets = [
      { name: "Builder", defaultAction: "Looking for the perfect spot to build" },
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
    const spawnPosition = spawnPositions[simulants.size] || { x: 0, y: 0, z: 0 };

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
    const hasActive = Array.from(simulants.values()).some((s) => s.status === "active");
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

  // Camera tab actions
  const handleChangeCameraMode = (mode: CameraMode) => setCameraMode(mode);

  return (
    <div 
      ref={dragRef}
      className={`fixed z-50 draggable-sidebar ${isDragging ? 'dragging' : ''}`}
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'default',
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
          <GripVertical size={16} className="text-white/40 hover:text-white/60" />
        </div>
        
        {/* Tab bar */}
        <div className="flex items-center gap-1 p-2">
          <button
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              activeTab === "animation" ? "bg-white/20 text-white" : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
            onClick={() => setActiveTab("animation")}
            title="Animation Test Controls"
          >
            Animation
          </button>
          <button
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              activeTab === "simulants" ? "bg-white/20 text-white" : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
            onClick={() => setActiveTab("simulants")}
            title="Simulants"
          >
            Simulants
          </button>
          <button
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              activeTab === "camera" ? "bg-white/20 text-white" : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
            onClick={() => setActiveTab("camera")}
            title="Camera"
          >
            Camera
          </button>
        </div>

        <Separator className="bg-white/10" />

        {/* Tab content */}
        {activeTab === "animation" && (
          <div className="p-3 space-y-2">
            <div className="text-xs text-white/60">Animation Test Controls</div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="flex-1 text-white/80 hover:bg-white/10" onClick={handleAddTestSimulant}>
                <Plus size={12} className="mr-1" /> Add Test Simulant
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="default" size="sm" className="flex-1" onClick={handleStartWalking}>
                <Play size={12} className="mr-1" /> Start Walking
              </Button>
              <Button variant="ghost" size="sm" className="flex-1 text-white/80 hover:bg-white/10" onClick={handleStopWalking}>
                <Pause size={12} className="mr-1" /> T-Pose
              </Button>
            </div>
            <div className="text-[10px] text-white/50 pt-1">Simulants: {simulants.size} • Default: Idle • Walking: loop</div>
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
                  <><Pause size={12} className="mr-1" /> Pause All</>
                ) : (
                  <><Play size={12} className="mr-1" /> Activate All</>
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
              {(Object.keys(CAMERA_MODE_CONFIG) as Array<keyof typeof CAMERA_MODE_CONFIG>).map((mode) => {
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
                    <Icon size={14} className="mr-2" /> {CAMERA_MODE_CONFIG[mode].label}
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
                onClick={() => updateGridConfig({ visibility: !gridConfig.visibility })}
                className={`flex-1 ${gridConfig.visibility ? "bg-green-500/20 text-green-300" : "text-white hover:bg-white/10"}`}
              >
                <Grid3X3 size={14} className="mr-2" /> {gridConfig.visibility ? "Visible" : "Hidden"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateGridConfig({ snapToGrid: !gridConfig.snapToGrid })}
                className={`flex-1 ${gridConfig.snapToGrid ? "bg-blue-500/20 text-blue-300" : "text-white hover:bg-white/10"}`}
              >
                <Settings size={14} className="mr-2" /> Snap {gridConfig.snapToGrid ? "On" : "Off"}
              </Button>
            </div>
            <div className="text-[10px] text-white/50">Shortcuts: ⌘/Ctrl+C cycle • G toggle grid</div>
          </div>
        )}
      </Card>
    </div>
  );
}


