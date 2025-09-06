import { Vector3 } from "three";
import type { Block, BlockType } from "./blocks";

// Re-export block types from dedicated block module
export * from "./blocks";

// Re-export animation types
export * as animationTypes from "./animations";

// Re-export skybox types
export * from "./skybox";

// AI Simulant Types
export interface AISimulant {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  status: "active" | "idle" | "disconnected";
  lastAction: string;
  conversationHistory: ChatMessage[];
  geminiSessionId: string;
}

export type SimulantStatus = "active" | "idle" | "disconnected";
export type SimulantCapability =
  | "build"
  | "destroy"
  | "move"
  | "communicate"
  | "observe";

// Camera Types
export type CameraMode = "orbit" | "fly" | "follow-simulant" | "cinematic";

export interface CameraState {
  position: Vector3;
  target: Vector3;
  fov: number;
  following?: string; // simulant ID
}

// Communication Types
export interface ChatMessage {
  id: string;
  senderId: string; // 'human' | simulant-id
  senderName: string;
  content: string;
  timestamp: number;
  type: "public" | "private" | "system";
  worldPosition?: Vector3; // For spatial chat
}

// Real-time Events
export interface BlockChange {
  type: "add" | "remove" | "update";
  block: Block;
  userId: string;
  timestamp: number;
}

export interface SimulantUpdate {
  simulantId: string;
  position?: Vector3;
  status?: SimulantStatus;
  action?: string;
  timestamp: number;
}

// World State
export interface WorldState {
  // World Data
  blocks: Block[];
  worldLimits: { maxBlocks: 1000 };

  // Human User State
  selectedBlockType: BlockType;
  activeCamera: CameraMode;

  // AI Simulant State
  simulants: Map<string, AISimulant>;

  // Real-time Synchronization
  lastUpdate: number;
  syncStatus: "connected" | "disconnected" | "syncing";
}

// Action Types
export interface SimulantAction {
  type: "place_block" | "remove_block" | "move" | "chat" | "query_world";
  parameters: Record<string, unknown>;
  simulantId: string;
}

export interface ActionResult {
  success: boolean;
  message: string;
  worldChange?: BlockChange;
  newPosition?: Vector3;
}

// Configuration Types
export interface SimulantConfig {
  name: string;
  personality?: string;
  initialPosition?: Vector3;
  capabilities: SimulantCapability[];
}

// Block Definitions
export interface BlockDefinition {
  color: string;
  roughness: number;
  metalness: number;
  transparency?: number;
  description: string;
}

// Performance and Rendering
export interface RenderingConfig {
  instancedRendering: boolean;
  lodSystem: {
    highDetail: number; // 0-30 units
    mediumDetail: number; // 30-60 units
    lowDetail: number; // 60+ units
  };
  frustumCulling: boolean;
  occlusionCulling: boolean;
}

// Grid System Configuration
export interface GridConfig {
  size: number; // Grid size (number of cells)
  cellSize: number; // Size of each cell
  opacity: number; // Base opacity (0-1)
  visibility: boolean; // Show/hide grid
  fadeDistance: number; // Distance at which grid starts fading
  fadeStrength: number; // How quickly grid fades
  rippleEnabled: boolean; // Enable interaction ripples
  snapToGrid: boolean; // Enable snap-to-grid functionality
  showSnapIndicators: boolean; // Show visual snap indicators
}

export interface PerformanceMetrics {
  frameRate: number; // Target: 60 FPS
  memoryUsage: number; // Target: < 500MB
  networkLatency: number; // Target: < 100ms
  aiResponseTime: number; // Target: < 2s
  blockRenderCount: number; // Target: 1000 blocks
  simultaneousUsers: number; // Target: 10 users
}

// Connection and Presence
export type ConnectionStatus = "connected" | "disconnected" | "reconnecting";

export interface PresenceState {
  userId: string;
  userType: "human" | "simulant";
  position?: Vector3;
  lastSeen: number;
  isActive: boolean;
}
