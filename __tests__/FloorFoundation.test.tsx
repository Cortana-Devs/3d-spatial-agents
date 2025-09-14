import { render } from '@testing-library/react'
import { Canvas } from '@react-three/fiber'
import { Vector3 } from 'three'
import { FrostedGlassFloor } from '@components/floors/FrostedGlassFloor'
import { FloorFactory } from '../utils/floorFactory'
import '@testing-library/jest-dom'

describe('Floor Foundation', () => {
  test('FloorFactory creates valid floor', () => {
    const position = new Vector3(0, 0, 0)
    const floor = FloorFactory.createFrostedGlassFloor(position, 'medium_frosted')
    
    expect(floor.type).toBe('frosted_glass_floor')
    expect(floor.glassType).toBe('medium_frosted')
    expect(floor.position).toEqual(position)
    expect(FloorFactory.validateFloorProperties(floor)).toBe(true)
  })

  test('FrostedGlassFloor component renders', () => {
    const floor = FloorFactory.createFrostedGlassFloor(
      new Vector3(0, 0, 0),
      'clear_frosted'
    )

    render(
      <Canvas>
        <FrostedGlassFloor floor={floor} />
      </Canvas>
    )
  })
})
