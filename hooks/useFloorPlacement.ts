import { useCallback } from 'react'
import { useWorldStore } from '../stores/worldStore' // Assuming this exists
import { FloorFactory } from '../utils/floorFactory'
import { GlassType } from '../types/floorTypes'

export const useFloorPlacement = () => {
  const { addBlock, removeBlock } = useWorldStore()

  const placeFloor = useCallback((
    position: THREE.Vector3,
    glassType: GlassType = 'medium_frosted'
  ) => {
    const floor = FloorFactory.createFrostedGlassFloor(position, glassType)
    addBlock(floor)
    return floor
  }, [addBlock])

  const removeFloor = useCallback((floorId: string) => {
    removeBlock(floorId)
  }, [removeBlock])

  return {
    placeFloor,
    removeFloor
  }
}
