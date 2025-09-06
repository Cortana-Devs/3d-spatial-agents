import { Vector3, Color } from 'three'
import { BlockType } from './blocks'

export interface Block {
  id: string
  type: BlockType | 'frosted_glass_floor'
  position: Vector3
  metadata?: Record<string, any>
}

export interface FrostedGlassFloor extends Block {
  id: string
  type: 'frosted_glass_floor'
  glassType: GlassType
  transparency: number // 0.1 to 0.9
  roughness: number // 0.3 to 0.8
  colorTint: Color
  position: Vector3
  metadata: FloorMetadata
}

export type GlassType = 
  | 'clear_frosted' 
  | 'light_frosted' 
  | 'medium_frosted' 
  | 'heavy_frosted'

export interface FloorMetadata {
  createdAt: number
  placedBy: string
  durability: number
  walkable: boolean
}

export interface FloorSystemConfig {
  maxTransparentFloors: number
  defaultTransparency: number
  defaultRoughness: number
  performanceMode: 'high' | 'medium' | 'low'
}
