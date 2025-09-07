import { Vector3 } from "three";

// Block Type Enum - Enhanced with additional properties
export enum BlockType {
  STONE = "stone",
  LEAF = "leaf",
  WOOD = "wood",
  FROSTED_GLASS = "frosted_glass",
  FLOOR = "floor",
  NUMBER_4 = "number_4",
  NUMBER_5 = "number_5",
  NUMBER_6 = "number_6",
  NUMBER_7 = "number_7",
}

// Selection Mode Enum - for UI interaction modes
export enum SelectionMode {
  EMPTY = "empty", // Empty hand - for selecting/inspecting blocks
  PLACE = "place", // Placement mode - for placing blocks
}

// Block Material Properties for 3D rendering
export interface BlockMaterialProperties {
  color: string;
  roughness: number;
  metalness: number;
  transparency?: number;
  emissive?: string;
  emissiveIntensity?: number;
  textureUrl?: string;
  normalMapUrl?: string;
  description: string;
  category: "solid" | "organic" | "natural";
}

// Glass specific properties for enhanced rendering
export interface GlassProperties {
  refractionRatio?: number;
  envMapIntensity?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  transmission?: number;
  ior?: number;
}

// Enhanced Block Definition with all properties
export interface BlockDefinition extends BlockMaterialProperties {
  type: BlockType;
  displayName: string;
  durability: number; // 1-10 scale for future features
  stackable: boolean;
  buildable: boolean; // Can AI simulants use this block type
  glowable: boolean; // Can this block emit light
  customProperties?: GlassProperties; // Advanced glass properties
}

// Block Metadata Structure with creation timestamps and extended properties
export interface BlockMetadata {
  createdAt: number;
  modifiedAt: number;
  createdBy: string; // 'human' | simulant-id
  glow?: number; // 0-1 intensity
  durability?: number; // Current durability (0-1)
  tags?: string[]; // Custom tags for organization
  version?: number; // For future migration support
  customProperties?: Record<string, unknown>; // Extensible properties
}

// Enhanced Block Interface
export interface Block {
  id: string;
  position: { x: number; y: number; z: number };
  type: BlockType;
  color: string;
  metadata: BlockMetadata;
}

// Block Configuration with Axiom Design System colors and Stone texture
export const BLOCK_DEFINITIONS: Record<BlockType, BlockDefinition> = {
  [BlockType.STONE]: {
    type: BlockType.STONE,
    displayName: "Stone Block",
    color: "#666666",
    roughness: 0.8,
    metalness: 0.1,
    textureUrl: "/Stone_texture.webp", // Using the provided texture
    description: "Solid foundation material with natural stone texture",
    category: "solid",
    durability: 10,
    stackable: true,
    buildable: true,
    glowable: false,
  },
  [BlockType.LEAF]: {
    type: BlockType.LEAF,
    displayName: "Leaf Block",
    color: "#4CAF50",
    roughness: 0.9,
    metalness: 0,
    transparency: 0.1,
    emissive: "#2E7D32",
    emissiveIntensity: 0.1,
    description: "Organic living material with subtle glow",
    category: "organic",
    durability: 3,
    stackable: true,
    buildable: true,
    glowable: true,
  },
  [BlockType.WOOD]: {
    type: BlockType.WOOD,
    displayName: "Wood Block",
    color: "#8D6E63",
    roughness: 0.7,
    metalness: 0,
    description: "Natural building material with warm tones",
    category: "natural",
    durability: 6,
    stackable: true,
    buildable: true,
    glowable: false,
  },
  [BlockType.FROSTED_GLASS]: {
    type: BlockType.FROSTED_GLASS,
    displayName: "Frosted Glass Block",
    color: "#E3F2FD",
    roughness: 0.1,
    metalness: 0.0,
    transparency: 0.3,
    emissive: "#BBDEFB",
    emissiveIntensity: 0.05,
    description:
      "Transparent frosted glass block with subtle light transmission",
    category: "solid",
    durability: 4,
    stackable: true,
    buildable: true,
    glowable: true,
  },
  [BlockType.FLOOR]: {
    type: BlockType.FLOOR,
    displayName: "Floor Block",
    color: "#8B4513",
    roughness: 0.6,
    metalness: 0.0,
    transparency: 0,
    description: "Solid floor block that covers the full grid area",
    category: "solid",
    durability: 10,
    stackable: false,
    buildable: true,
    glowable: false,
  },
  [BlockType.NUMBER_4]: {
    type: BlockType.NUMBER_4,
    displayName: "Number 4 Block",
    color: "#FFD54F",
    roughness: 0.5,
    metalness: 0.2,
    emissive: "#FFF176",
    emissiveIntensity: 0.3,
    description: "Special numbered block displaying '4' with golden glow",
    category: "solid",
    durability: 8,
    stackable: true,
    buildable: true,
    glowable: true,
  },
  [BlockType.NUMBER_5]: {
    type: BlockType.NUMBER_5,
    displayName: "Number 5 Block",
    color: "#FFEB3B", // Bright yellow
    roughness: 0.5,
    metalness: 0.2,
    emissive: "#FFF59D",
    emissiveIntensity: 0.3,
    description: "Special numbered block displaying '5' with yellow glow",
    category: "solid",
    durability: 8,
    stackable: true,
    buildable: true,
    glowable: true,
  },
  [BlockType.NUMBER_6]: {
    type: BlockType.NUMBER_6,
    displayName: "Sunset Glass Block",
    color: "#FFB74D", // Warm sunset orange base
    roughness: 0.05, // Very smooth for better reflections
    metalness: 0.1,
    transparency: 0.6, // More transparent for better blending
    emissive: "#FF9800", // Warm glow
    emissiveIntensity: 0.2,
    description:
      "Premium frosted glass with perfect blending and sunset reflections",
    category: "solid",
    durability: 8,
    stackable: true,
    buildable: true,
    glowable: true,
    // Custom properties for enhanced glass effects
    customProperties: {
      refractionRatio: 0.98,
      envMapIntensity: 1.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      transmission: 0.95,
      ior: 1.5,
    },
  },
  [BlockType.NUMBER_7]: {
    type: BlockType.NUMBER_7,
    displayName: "Ultra-Light Glass Block",
    color: "#F0F8FF", // Barely visible tint
    roughness: 0.1, // Slight roughness for performance
    metalness: 0.0,
    transparency: 0.85, // Performance-optimized transparency
    emissive: "#000000", // No emissive for performance
    emissiveIntensity: 0.0,
    description:
      "Performance-optimized ultra-light glass with minimal rendering cost",
    category: "solid",
    durability: 9,
    stackable: true,
    buildable: true,
    glowable: false,
  },
};

// Block Validation Error Types
export enum BlockValidationError {
  INVALID_TYPE = "INVALID_TYPE",
  INVALID_POSITION = "INVALID_POSITION",
  POSITION_OCCUPIED = "POSITION_OCCUPIED",
  WORLD_LIMIT_REACHED = "WORLD_LIMIT_REACHED",
  INVALID_METADATA = "INVALID_METADATA",
  INVALID_COLOR = "INVALID_COLOR",
  MISSING_REQUIRED_FIELDS = "MISSING_REQUIRED_FIELDS",
}

// Validation Result Interface
export interface BlockValidationResult {
  isValid: boolean;
  errors: BlockValidationError[];
  warnings?: string[];
}

// Block Position Validation
export interface PositionConstraints {
  minX?: number;
  maxX?: number;
  minY?: number;
  maxY?: number;
  minZ?: number;
  maxZ?: number;
}

// Block Creation Parameters
export interface CreateBlockParams {
  position: Vector3 | { x: number; y: number; z: number };
  type: BlockType;
  createdBy: string;
  customColor?: string;
  metadata?: Partial<BlockMetadata>;
}

// Block Update Parameters
export interface UpdateBlockParams {
  id: string;
  color?: string;
  metadata?: Partial<BlockMetadata>;
  modifiedBy: string;
}

// Utility type for block queries
export interface BlockQuery {
  position?: Vector3 | { x: number; y: number; z: number };
  type?: BlockType;
  createdBy?: string;
  createdAfter?: number;
  createdBefore?: number;
  hasGlow?: boolean;
  tags?: string[];
}

// Export all block types for easy access
export const ALL_BLOCK_TYPES = Object.values(BlockType);

// Helper function to get block definition
export function getBlockDefinition(type: BlockType): BlockDefinition {
  return BLOCK_DEFINITIONS[type];
}

// Helper function to check if block type exists
export function isValidBlockType(type: string): type is BlockType {
  return Object.values(BlockType).includes(type as BlockType);
}

// Helper function to get all available block types
export function getAvailableBlockTypes(): BlockType[] {
  return ALL_BLOCK_TYPES;
}

// Helper function to get block types by category
export function getBlockTypesByCategory(
  category: "solid" | "organic" | "natural",
): BlockType[] {
  return ALL_BLOCK_TYPES.filter(
    (type) => BLOCK_DEFINITIONS[type].category === category,
  );
}
