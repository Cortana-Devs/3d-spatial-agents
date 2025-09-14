"use client";

import React, { useState, useCallback, useMemo } from "react";
import {
  Plus,
  Minus,
  User,
  Users,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  Settings,
  UserPlus,
  Crown,
  Briefcase,
  Heart,
  Baby,
  Coffee,
  Sparkles,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  ExecutiveIcon,
  AssistantIcon,
  CreativeIcon,
  ParentIcon,
  LeaderIcon,
  CustomIcon,
} from "@/components/icons/CharacterIcons";
import { Button } from "@/components/ui/button";
import {
  AvatarSelector,
  useAvatarSelection,
  setAvatar,
  type AvatarId,
} from "@/src/state/avatarSelectionStore";
import { useWorldStore } from "@/store/worldStore";
import { AISimulant } from "@/types";
import { v4 as uuidv4 } from "uuid";

/* -------------------------------------------------------------------------- */
/*                              Character Presets                             */
/* -------------------------------------------------------------------------- */

interface CharacterPreset {
  id: string;
  name: string;
  role: string;
  personality: string;
  initialAction: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  description: string;
  defaultAvatar: AvatarId;
}

const CHARACTER_PRESETS: CharacterPreset[] = [
  {
    id: "professional",
    name: "Executive",
    role: "Business Professional",
    personality:
      "Confident, strategic, and goal-oriented. Speaks with authority and focuses on efficiency.",
    initialAction: "Reviewing quarterly reports",
    icon: ExecutiveIcon,
    color: "bg-blue-500/20 text-blue-300 border-blue-400/30",
    description:
      "Perfect for business simulations and professional environments",
    defaultAvatar: "male-default",
  },
  {
    id: "assistant",
    name: "Virtual Assistant",
    role: "AI Helper",
    personality:
      "Helpful, organized, and proactive. Always ready to assist and solve problems.",
    initialAction: "Organizing the workspace",
    icon: AssistantIcon,
    color: "bg-green-500/20 text-green-300 border-green-400/30",
    description: "Ideal for office automation and customer service scenarios",
    defaultAvatar: "female-c-girl",
  },
  {
    id: "creative",
    name: "Creative Director",
    role: "Artist & Visionary",
    personality:
      "Imaginative, expressive, and innovative. Thinks outside the box and inspires others.",
    initialAction: "Sketching new concepts",
    icon: CreativeIcon,
    color: "bg-purple-500/20 text-purple-300 border-purple-400/30",
    description: "Great for creative projects and brainstorming sessions",
    defaultAvatar: "female-c-girl",
  },
  {
    id: "family-parent",
    name: "Parent Figure",
    role: "Family Member",
    personality:
      "Caring, protective, and nurturing. Prioritizes family well-being and harmony.",
    initialAction: "Planning family activities",
    icon: ParentIcon,
    color: "bg-pink-500/20 text-pink-300 border-pink-400/30",
    description: "Perfect for family dynamics and relationship simulations",
    defaultAvatar: "female-c-girl",
  },
  {
    id: "leader",
    name: "Team Leader",
    role: "Manager",
    personality:
      "Inspiring, decisive, and collaborative. Motivates teams and drives results.",
    initialAction: "Coordinating team objectives",
    icon: LeaderIcon,
    color: "bg-yellow-500/20 text-yellow-300 border-yellow-400/30",
    description: "Excellent for leadership training and team dynamics",
    defaultAvatar: "male-default",
  },
  {
    id: "custom",
    name: "Custom Character",
    role: "Personalized",
    personality: "Define your own personality and role for this character.",
    initialAction: "Awaiting instructions",
    icon: CustomIcon,
    color: "bg-gray-500/20 text-gray-300 border-gray-400/30",
    description:
      "Create a fully customized character with your own specifications",
    defaultAvatar: "male-default",
  },
];

/* -------------------------------------------------------------------------- */
/*                              Panel Sub-Components                          */
/* -------------------------------------------------------------------------- */

interface CharacterCardProps {
  preset: CharacterPreset;
  onSelect: (preset: CharacterPreset, avatar: AvatarId) => void;
  isSelected: boolean;
}

function CharacterCard({ preset, onSelect, isSelected }: CharacterCardProps) {
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarId>(
    preset.defaultAvatar,
  );
  const [isExpanded, setIsExpanded] = useState(false);
  const Icon = preset.icon;

  const handleSelect = useCallback(() => {
    onSelect(preset, selectedAvatar);
  }, [preset, selectedAvatar, onSelect]);

  return (
    <div
      className={`
      character-card relative p-3 rounded-lg border transition-all duration-200 cursor-pointer
      ${
        isSelected
          ? `${preset.color} ring-2 ring-white/20 selected`
          : "bg-axiom-neutral-100/50 dark:bg-axiom-neutral-800/50 border-axiom-neutral-200 dark:border-axiom-neutral-700 hover:bg-axiom-neutral-200/50 dark:hover:bg-axiom-neutral-700/50"
      }
    `}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div
            className={`
            character-icon-wrapper p-2 rounded-lg
            ${isSelected ? preset.color : "bg-axiom-neutral-200 dark:bg-axiom-neutral-700"}
          `}
          >
            <Icon size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-medium text-sm text-axiom-neutral-900 dark:text-axiom-neutral-100 truncate">
              {preset.name}
            </h4>
            <p className="text-xs text-axiom-neutral-600 dark:text-axiom-neutral-400 truncate">
              {preset.role}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="h-6 w-6 p-0"
          >
            {isExpanded ? (
              <ChevronDown size={12} />
            ) : (
              <ChevronRight size={12} />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSelect}
            className="h-6 px-2 text-xs"
          >
            Add
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-axiom-neutral-200 dark:border-axiom-neutral-700 space-y-3">
          <p className="text-xs text-axiom-neutral-600 dark:text-axiom-neutral-400">
            {preset.description}
          </p>

          <div className="space-y-2">
            <label className="text-xs font-medium text-axiom-neutral-700 dark:text-axiom-neutral-300">
              Avatar Selection:
            </label>
            <div className="scale-90 origin-left">
              <AvatarSelector
                onChange={setSelectedAvatar}
                className="avatar-selector-compact"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface SimulantListItemProps {
  simulant: AISimulant;
  onUpdate: (id: string, updates: Partial<AISimulant>) => void;
  onRemove: (id: string) => void;
}

function SimulantListItem({
  simulant,
  onUpdate,
  onRemove,
}: SimulantListItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusColor = useMemo(() => {
    switch (simulant.status) {
      case "active":
        return "bg-green-500/20 text-green-300";
      case "idle":
        return "bg-yellow-500/20 text-yellow-300";
      case "disconnected":
        return "bg-red-500/20 text-red-300";
      default:
        return "bg-gray-500/20 text-gray-300";
    }
  }, [simulant.status]);

  const toggleStatus = useCallback(() => {
    const newStatus = simulant.status === "active" ? "idle" : "active";
    onUpdate(simulant.id, { status: newStatus });
  }, [simulant.id, simulant.status, onUpdate]);

  return (
    <div className="simulant-list-item p-3 rounded-lg bg-axiom-neutral-100/50 dark:bg-axiom-neutral-800/50 border border-axiom-neutral-200 dark:border-axiom-neutral-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className={`status-indicator w-2 h-2 rounded-full ${statusColor} ${simulant.status}`}
          />
          <div className="min-w-0 flex-1">
            <h4 className="font-medium text-sm text-axiom-neutral-900 dark:text-axiom-neutral-100 truncate">
              {simulant.name}
            </h4>
            <p className="text-xs text-axiom-neutral-600 dark:text-axiom-neutral-400 truncate">
              {simulant.lastAction}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleStatus}
            className="h-6 w-6 p-0"
            title={simulant.status === "active" ? "Pause" : "Activate"}
          >
            {simulant.status === "active" ? (
              <Pause size={12} />
            ) : (
              <Play size={12} />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="h-6 w-6 p-0"
          >
            {isExpanded ? (
              <ChevronDown size={12} />
            ) : (
              <ChevronRight size={12} />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(simulant.id)}
            className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/20"
            title="Remove"
          >
            <Minus size={12} />
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-axiom-neutral-200 dark:border-axiom-neutral-700 space-y-2">
          <div className="text-xs">
            <span className="text-axiom-neutral-500 dark:text-axiom-neutral-400">
              Position:
            </span>
            <span className="ml-2 text-axiom-neutral-700 dark:text-axiom-neutral-300 font-mono">
              ({simulant.position.x.toFixed(1)},{" "}
              {simulant.position.y.toFixed(1)}, {simulant.position.z.toFixed(1)}
              )
            </span>
          </div>
          <div className="text-xs">
            <span className="text-axiom-neutral-500 dark:text-axiom-neutral-400">
              Status:
            </span>
            <span
              className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${statusColor}`}
            >
              {simulant.status}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Main Panel Component                          */
/* -------------------------------------------------------------------------- */

interface SimulantPanelProps {
  className?: string;
}

export default function SimulantPanel({ className = "" }: SimulantPanelProps) {
  const { simulants, addSimulant, removeSimulant, updateSimulant } =
    useWorldStore();

  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [showCharacterLibrary, setShowCharacterLibrary] = useState(false);

  // Calculate simulant statistics
  const simulantStats = useMemo(() => {
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

  // Character creation handler
  const handleCreateCharacter = useCallback(
    (preset: CharacterPreset, avatarId: AvatarId) => {
      const simulantId = uuidv4();
      const position = {
        x: Math.random() * 10 - 5,
        y: 0,
        z: Math.random() * 10 - 5,
      };

      const newSimulant: AISimulant = {
        id: simulantId,
        name:
          preset.id === "custom"
            ? `Custom ${simulants.size + 1}`
            : `${preset.name} ${simulants.size + 1}`,
        position,
        status: "active",
        lastAction: preset.initialAction,
        conversationHistory: [],
        geminiSessionId: `session-${simulantId}`,
      };

      addSimulant(newSimulant);
      setAvatar(avatarId); // Set the selected avatar globally
      setSelectedPreset(null);
      setShowCharacterLibrary(false);
    },
    [simulants.size, addSimulant],
  );

  // Bulk operations
  const handleToggleAllSimulants = useCallback(() => {
    const hasActive = Array.from(simulants.values()).some(
      (s) => s.status === "active",
    );
    const newStatus = hasActive ? "idle" : "active";
    simulants.forEach((s) => updateSimulant(s.id, { status: newStatus }));
  }, [simulants, updateSimulant]);

  const handleRandomActions = useCallback(() => {
    const actions = [
      "Exploring the environment",
      "Thinking deeply",
      "Observing surroundings",
      "Planning next move",
      "Analyzing the situation",
    ];
    simulants.forEach((s) => {
      const randomAction = actions[Math.floor(Math.random() * actions.length)];
      updateSimulant(s.id, { lastAction: randomAction });
    });
  }, [simulants, updateSimulant]);

  const handleClearSimulants = useCallback(() => {
    if (simulants.size === 0) return;
    if (
      confirm(`Remove all ${simulants.size} simulants? This cannot be undone.`)
    ) {
      simulants.forEach((s) => removeSimulant(s.id));
    }
  }, [simulants, removeSimulant]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-axiom-neutral-900 dark:text-axiom-neutral-100">
            Simulants
          </h3>
          <p className="text-sm text-axiom-neutral-600 dark:text-axiom-neutral-400">
            {simulantStats.total} characters • {simulantStats.active} active
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCharacterLibrary(!showCharacterLibrary)}
          className="text-axiom-primary-600 dark:text-axiom-primary-400 hover:bg-axiom-primary-500/20"
        >
          <UserPlus size={16} className="mr-2" />
          Add Character
        </Button>
      </div>

      {/* Character Library */}
      {showCharacterLibrary && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-axiom-neutral-900 dark:text-axiom-neutral-100">
              Character Library
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCharacterLibrary(false)}
              className="text-xs"
            >
              Cancel
            </Button>
          </div>

          <div className="grid gap-2">
            {CHARACTER_PRESETS.map((preset) => (
              <CharacterCard
                key={preset.id}
                preset={preset}
                onSelect={handleCreateCharacter}
                isSelected={selectedPreset === preset.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Statistics Panel */}
      <div className="stats-grid">
        <div className="stats-card bg-axiom-neutral-100/50 dark:bg-axiom-neutral-800/50">
          <div className="stats-value text-axiom-neutral-900 dark:text-axiom-neutral-100">
            {simulantStats.total}
          </div>
          <div className="stats-label text-axiom-neutral-600 dark:text-axiom-neutral-400">
            Total
          </div>
        </div>
        <div className="stats-card bg-green-500/10">
          <div className="stats-value text-green-600 dark:text-green-400">
            {simulantStats.active}
          </div>
          <div className="stats-label text-green-600 dark:text-green-400">
            Active
          </div>
        </div>
        <div className="stats-card bg-yellow-500/10">
          <div className="stats-value text-yellow-600 dark:text-yellow-400">
            {simulantStats.idle}
          </div>
          <div className="stats-label text-yellow-600 dark:text-yellow-400">
            Idle
          </div>
        </div>
        <div className="stats-card bg-red-500/10">
          <div className="stats-value text-red-600 dark:text-red-400">
            {simulantStats.disconnected}
          </div>
          <div className="stats-label text-red-600 dark:text-red-400">
            Offline
          </div>
        </div>
      </div>

      {/* Bulk Operations */}
      {simulantStats.total > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-axiom-neutral-900 dark:text-axiom-neutral-100">
            Bulk Actions
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleAllSimulants}
              className="text-axiom-primary-600 dark:text-axiom-primary-400 hover:bg-axiom-primary-500/20"
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
              className="text-axiom-warning-600 dark:text-axiom-warning-400 hover:bg-axiom-warning-500/20"
            >
              <RotateCcw size={12} className="mr-1" /> Random Actions
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearSimulants}
            className="w-full text-axiom-error-600 dark:text-axiom-error-400 hover:bg-axiom-error-500/20"
          >
            <Trash2 size={12} className="mr-1" /> Clear All Simulants
          </Button>
        </div>
      )}

      {/* Simulant List */}
      {simulantStats.total > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-axiom-neutral-900 dark:text-axiom-neutral-100">
            Active Simulants
          </h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {Array.from(simulants.values()).map((simulant) => (
              <SimulantListItem
                key={simulant.id}
                simulant={simulant}
                onUpdate={updateSimulant}
                onRemove={removeSimulant}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {simulantStats.total === 0 && !showCharacterLibrary && (
        <div className="text-center py-8">
          <Users
            size={48}
            className="mx-auto text-axiom-neutral-400 dark:text-axiom-neutral-600 mb-4"
          />
          <h4 className="text-lg font-medium text-axiom-neutral-700 dark:text-axiom-neutral-300 mb-2">
            No Simulants Yet
          </h4>
          <p className="text-sm text-axiom-neutral-600 dark:text-axiom-neutral-400 mb-4">
            Add your first AI character to bring your virtual world to life.
          </p>
          <Button
            variant="ghost"
            onClick={() => setShowCharacterLibrary(true)}
            className="text-axiom-primary-600 dark:text-axiom-primary-400 hover:bg-axiom-primary-500/20"
          >
            <UserPlus size={16} className="mr-2" />
            Add Your First Character
          </Button>
        </div>
      )}

      {/* Global Avatar Selection */}
      <div className="pt-4 border-t border-axiom-neutral-200 dark:border-axiom-neutral-700">
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-axiom-neutral-900 dark:text-axiom-neutral-100">
            Default Avatar Style
          </h4>
          <p className="text-xs text-axiom-neutral-600 dark:text-axiom-neutral-400">
            Choose the default avatar appearance for new characters
          </p>
          <AvatarSelector className="scale-90 origin-left" />
        </div>
      </div>
    </div>
  );
}
