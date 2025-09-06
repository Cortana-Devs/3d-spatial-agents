import { Vector3, Color } from 'three'
import { v4 as uuidv4 } from 'uuid'
import { FrostedGlassFloor, GlassType } from '../types/floorTypes'
import { FLOOR_CONSTANTS } from '../config/floorConstants'

export class FloorFactory {
  static createFrostedGlassFloor(
    position: Vector3,
    glassType: GlassType = 'medium_frosted',
    colorTint: Color = new Color(0xffffff)
  ): FrostedGlassFloor {
    const glassProps = FLOOR_CONSTANTS.GLASS_TYPES[glassType]
    
    return {
      id: uuidv4(),
      type: 'frosted_glass_floor',
      glassType,
      transparency: glassProps.transparency,
      roughness: glassProps.roughness,
      colorTint,
      position: position.clone(),
      metadata: {
        createdAt: Date.now(),
        placedBy: 'system', // TODO: Get actual player ID
        durability: 100,
        walkable: true
      }
    }
  }

  static validateFloorProperties(floor: FrostedGlassFloor): boolean {
    const { TRANSPARENCY, ROUGHNESS } = FLOOR_CONSTANTS.GLASS_PROPERTIES
    
    return (
      floor.transparency >= TRANSPARENCY.MIN &&
      floor.transparency <= TRANSPARENCY.MAX &&
      floor.roughness >= ROUGHNESS.MIN &&
      floor.roughness <= ROUGHNESS.MAX
    )
  }
}
