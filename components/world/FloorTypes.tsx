import * as THREE from 'three';

export type GlassType = 
  | 'clear_frosted' | 'light_frosted' | 'medium_frosted' 
  | 'heavy_frosted' | 'textured_frosted' | 'patterned_frosted'
  | 'blue_frosted' | 'green_frosted' | 'amber_frosted'
  | 'rose_frosted' | 'purple_frosted' | 'neutral_frosted'
  | 'illuminated_frosted' | 'reactive_frosted' | 'smart_frosted'
  | 'heated_frosted' | 'pressure_sensitive' | 'sound_dampening'
  | 'reinforced_frosted' | 'tempered_frosted' | 'layered_frosted'
  | 'flexible_frosted' | 'composite_frosted' | 'impact_resistant';

export type SurfaceTexture = 'smooth' | 'etched' | 'rippled' | 'honeycomb' | 'linear' | 'organic';
export type ColorTint = 'clear' | 'warm' | 'cool' | 'blue' | 'green' | 'amber' | 'rose' | 'purple';
export type SafetyLevel = 'safe' | 'caution' | 'avoid' | 'dangerous';

export interface GlassProperties {
  transparency: number; // 0.1 - 0.9
  roughness: number; // 0.3 - 0.8
  ior: number; // Index of refraction (1.52 for glass)
  transmission: number; // 0.8 - 1.0
  thickness: number; // 0.05 - 0.2
  tint: THREE.Color;
  surfaceNormals: THREE.Vector3[];
  lightScattering: ScatteringData;
}

export interface ScatteringData {
  intensity: number;
  radius: number;
  samples: number;
  enabled: boolean;
}

export interface NavigationProperties {
  walkable: boolean;
  slippery: boolean;
  soundAbsorption: number; // 0.0 - 1.0
  aiVisibility: 'transparent' | 'semi_opaque' | 'visible_barrier';
  pathfindingWeight: number; // Multiplier for pathfinding cost
  safetyRating: SafetyLevel;
}

export interface LightingProperties {
  emissive: boolean;
  emissiveColor: THREE.Color;
  emissiveIntensity: number;
  reflectivity: number; // 0.0 - 1.0
  causticGeneration: boolean;
  shadowCasting: 'none' | 'soft' | 'hard';
  lightScattering: boolean;
}

export interface StructuralData {
  durability: number; // 0.0 - 1.0
  loadCapacity: number; // kg/m²
  flexibility: number; // 0.0 - 1.0 (rigid to flexible)
  thermalExpansion: number;
  shatterResistance: number; // 0.0 - 1.0
}

export interface FrostedGlassFloor {
  id: string;
  position: THREE.Vector3;
  glassType: GlassType;
  transparency: number;
  roughness: number;
  lightTransmission: number;
  surfaceTexture: SurfaceTexture;
  colorTint: ColorTint;
  navigationProperties: NavigationProperties;
  structuralIntegrity: StructuralData;
  lightingEffects: LightingProperties;
  glassProperties: GlassProperties;
  created: Date;
  lastModified: Date;
}

// types/materialTypes.ts
export interface MaterialCacheEntry {
  material: THREE.Material;
  properties: GlassProperties;
  lastUsed: number;
  referenceCount: number;
}

export interface FrostingEffect {
  noiseScale: number;
  noiseIntensity: number;
  normalMapStrength: number;
  roughnessVariation: number;
}

export interface LightReflectionSystem {
  environmentMapping: boolean;
  realtimeReflections: boolean;
  reflectionResolution: number;
  updateFrequency: number;
}

// types/navigationTypes.ts
export interface NavigationData {
  canWalkOn: boolean;
  canSeeThrough: boolean;
  safetyAssessment: SafetyLevel;
  alternativePaths: THREE.Vector3[];
  visualCues: VisualCue[];
}

export interface VisualCue {
  type: 'warning' | 'safe' | 'danger' | 'info';
  position: THREE.Vector3;
  message: string;
  priority: number;
}

export interface NavigationMesh {
  vertices: THREE.Vector3[];
  faces: number[][];
  walkableAreas: WalkableArea[];
  obstacles: THREE.Box3[];
}

export interface WalkableArea {
  bounds: THREE.Box3;
  safetyLevel: SafetyLevel;
  properties: NavigationProperties;
}