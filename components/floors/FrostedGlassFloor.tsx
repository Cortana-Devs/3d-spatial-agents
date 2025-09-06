import React, { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshPhysicalMaterial, DoubleSide } from 'three'
import { FLOOR_CONSTANTS } from '../../config/floorConstants'
import { FrostedGlassFloor as FrostedGlassFloorType } from '../../types/floorTypes'

interface Props {
  floor: FrostedGlassFloorType
  onInteract?: (floor: FrostedGlassFloorType) => void
  materialPreset?: string
  lodEnabled?: boolean
  batchingEnabled?: boolean
}

export const FrostedGlassFloor: React.FC<Props> = ({ floor, onInteract }) => {
  const material = useMemo(() => {
    const glassProps = FLOOR_CONSTANTS.GLASS_TYPES[floor.glassType]
    
    return new MeshPhysicalMaterial({
      transparent: true,
      opacity: glassProps.transparency,
      roughness: glassProps.roughness,
      metalness: 0.02,
      transmission: 0.9,
      ior: FLOOR_CONSTANTS.GLASS_PROPERTIES.IOR,
      thickness: FLOOR_CONSTANTS.GLASS_PROPERTIES.THICKNESS,
      color: floor.colorTint,
      side: DoubleSide
    })
  }, [floor.glassType, floor.colorTint])

  return (
    <mesh
      position={floor.position}
      material={material}
      onClick={() => onInteract?.(floor)}
      userData={{ blockType: 'frosted_glass_floor', id: floor.id }}
    >
      <boxGeometry args={[1, 0.1, 1]} />
    </mesh>
  )
}
