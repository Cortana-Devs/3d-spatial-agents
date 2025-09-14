# Phase 1: Foundation and Core Floor System

## OBJECTIVE
Establish the foundational frosted glass floor block system with basic transparency, core data structures, and integration with the existing block system. Focus on getting the basic transparent floor rendering working with simple visual feedback.

## DELIVERABLES
- Basic frosted glass floor block component
- Core type definitions and interfaces
- Integration with existing block placement system
- Simple transparency rendering
- Basic testing framework setup

## IMPLEMENTATION TASKS

### Task 1.1: Core Type Definitions
**File**: `types/floorTypes.ts`

Create the foundational type definitions for the floor system:

```typescript
export interface FrostedGlassFloor extends Block {
  id: string
  type: 'frosted_glass_floor'
  glassType: GlassType
  transparency: number // 0.1 to 0.9
  roughness: number // 0.3 to 0.8
  colorTint: THREE.Color
  position: THREE.Vector3
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
```

**Success Criteria**:
- All interfaces compile without errors
- Types integrate with existing Block interface
- Clear separation of concerns

### Task 1.2: Configuration System
**File**: `config/floorConstants.ts`

```typescript
export const FLOOR_CONSTANTS = {
  GLASS_PROPERTIES: {
    TRANSPARENCY: { MIN: 0.1, MAX: 0.9, DEFAULT: 0.4 },
    ROUGHNESS: { MIN: 0.3, MAX: 0.8, DEFAULT: 0.6 },
    IOR: 1.52, // Glass index of refraction
    THICKNESS: 0.1
  },

  GLASS_TYPES: {
    clear_frosted: { transparency: 0.8, roughness: 0.3 },
    light_frosted: { transparency: 0.6, roughness: 0.4 },
    medium_frosted: { transparency: 0.4, roughness: 0.6 },
    heavy_frosted: { transparency: 0.2, roughness: 0.8 }
  },

  PERFORMANCE: {
    MAX_FLOORS: 50, // Conservative start
    LOD_DISTANCE: 25,
    CULLING_DISTANCE: 100
  }
} as const
```

### Task 1.3: Basic Frosted Glass Floor Component
**File**: `components/floors/FrostedGlassFloor.tsx`

Create the core floor component with basic transparency:

```typescript
import React, { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { FLOOR_CONSTANTS } from '../../config/floorConstants'
import { FrostedGlassFloor as FrostedGlassFloorType } from '../../types/floorTypes'

interface Props {
  floor: FrostedGlassFloorType
  onInteract?: (floor: FrostedGlassFloorType) => void
}

export const FrostedGlassFloor: React.FC<Props> = ({ floor, onInteract }) => {
  const material = useMemo(() => {
    const glassProps = FLOOR_CONSTANTS.GLASS_TYPES[floor.glassType]
    
    return new THREE.MeshPhysicalMaterial({
      transparent: true,
      opacity: glassProps.transparency,
      roughness: glassProps.roughness,
      metalness: 0.02,
      transmission: 0.9,
      ior: FLOOR_CONSTANTS.GLASS_PROPERTIES.IOR,
      thickness: FLOOR_CONSTANTS.GLASS_PROPERTIES.THICKNESS,
      color: floor.colorTint,
      side: THREE.DoubleSide
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
```

**Success Criteria**:
- Floor renders with transparency
- Different glass types show visual differences
- Proper integration with Three.js material system
- Click interactions work correctly

### Task 1.4: Floor Factory System
**File**: `utils/floorFactory.ts`

```typescript
import * as THREE from 'three'
import { v4 as uuidv4 } from 'uuid'
import { FrostedGlassFloor, GlassType } from '../types/floorTypes'
import { FLOOR_CONSTANTS } from '../config/floorConstants'

export class FloorFactory {
  static createFrostedGlassFloor(
    position: THREE.Vector3,
    glassType: GlassType = 'medium_frosted',
    colorTint: THREE.Color = new THREE.Color(0xffffff)
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
```

### Task 1.5: Integration with Block System
**File**: `hooks/useFloorPlacement.ts`

```typescript
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
```

## TESTING REQUIREMENTS

### Task 1.6: Basic Test Setup
**File**: `__tests__/FloorFoundation.test.tsx`

```typescript
import { render } from '@testing-library/react'
import { Canvas } from '@react-three/fiber'
import { FrostedGlassFloor } from '../components/floors/FrostedGlassFloor'
import { FloorFactory } from '../utils/floorFactory'
import * as THREE from 'three'

describe('Floor Foundation', () => {
  test('FloorFactory creates valid floor', () => {
    const position = new THREE.Vector3(0, 0, 0)
    const floor = FloorFactory.createFrostedGlassFloor(position, 'medium_frosted')
    
    expect(floor.type).toBe('frosted_glass_floor')
    expect(floor.glassType).toBe('medium_frosted')
    expect(floor.position).toEqual(position)
    expect(FloorFactory.validateFloorProperties(floor)).toBe(true)
  })

  test('FrostedGlassFloor component renders', () => {
    const floor = FloorFactory.createFrostedGlassFloor(
      new THREE.Vector3(0, 0, 0),
      'clear_frosted'
    )

    render(
      <Canvas>
        <FrostedGlassFloor floor={floor} />
      </Canvas>
    )
  })
})
```

## VISUAL VALIDATION

### Task 1.7: Development Test Scene
**File**: `debug/FloorTestScene.tsx`

```typescript
import React, { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { FrostedGlassFloor } from '../components/floors/FrostedGlassFloor'
import { FloorFactory } from '../utils/floorFactory'
import { GlassType } from '../types/floorTypes'
import * as THREE from 'three'

export const FloorTestScene: React.FC = () => {
  const [selectedGlassType, setSelectedGlassType] = useState<GlassType>('medium_frosted')
  
  const testFloors = [
    FloorFactory.createFrostedGlassFloor(new THREE.Vector3(-2, 0, 0), 'clear_frosted'),
    FloorFactory.createFrostedGlassFloor(new THREE.Vector3(0, 0, 0), 'light_frosted'),
    FloorFactory.createFrostedGlassFloor(new THREE.Vector3(2, 0, 0), 'medium_frosted'),
    FloorFactory.createFrostedGlassFloor(new THREE.Vector3(4, 0, 0), 'heavy_frosted'),
  ]

  return (
    <>
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 100 }}>
        <h3>Floor Test Scene - Phase 1</h3>
        <div>
          {(['clear_frosted', 'light_frosted', 'medium_frosted', 'heavy_frosted'] as GlassType[]).map(type => (
            <button
              key={type}
              onClick={() => setSelectedGlassType(type)}
              style={{
                margin: '2px',
                backgroundColor: selectedGlassType === type ? '#4CAF50' : '#f0f0f0'
              }}
            >
              {type.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <Canvas camera={{ position: [5, 5, 5] }}>
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} />
        <Environment preset="city" />

        {testFloors.map(floor => (
          <FrostedGlassFloor
            key={floor.id}
            floor={floor}
            onInteract={(floor) => console.log('Floor clicked:', floor.glassType)}
          />
        ))}

        {/* Reference objects for transparency comparison */}
        <mesh position={[0, -1, 0]}>
          <boxGeometry args={[10, 0.1, 10]} />
          <meshStandardMaterial color="#8B4513" />
        </mesh>

        <mesh position={[0, 2, 0]}>
          <sphereGeometry args={[0.5]} />
          <meshStandardMaterial color="#FF6B6B" />
        </mesh>

        <OrbitControls />
      </Canvas>
    </>
  )
}
```

## SUCCESS CRITERIA

### Visual Validation Checklist:
- [ ] Four different glass types are clearly distinguishable
- [ ] Transparency effects are visible and realistic
- [ ] Objects behind floors are partially visible
- [ ] Light reflections appear on floor surfaces
- [ ] Click interactions work properly
- [ ] No rendering errors or console warnings

### Technical Validation:
- [ ] All TypeScript interfaces compile without errors
- [ ] Floor factory creates valid floor objects
- [ ] Component renders without performance issues
- [ ] Integration with existing block system works
- [ ] Test suite passes completely

### Performance Baseline:
- [ ] Scene maintains 60 FPS with 4 transparent floors
- [ ] Memory usage is stable during testing
- [ ] No visual artifacts or z-fighting issues

## NEXT PHASE PREPARATION

Once Phase 1 is complete and validated:
1. Document any performance observations
2. Note visual quality assessments
3. Identify any integration challenges discovered
4. Prepare foundation for advanced material effects in Phase 2

## ESTIMATED TIME: 2-3 days

This phase establishes the solid foundation needed for the more sophisticated features in subsequent phases while providing immediate visual feedback and validation.