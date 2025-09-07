import { BenchmarkScenario } from './types';
import { FloorFactory } from '../utils/floorFactory';
import { Scene, Object3D, Light, DirectionalLight, AmbientLight, Mesh, BoxGeometry, MeshStandardMaterial, Vector3 } from 'three';

export interface TestScene {
  scene: Scene;
  objects: Object3D[];
  lights: Light[];
  cleanup: () => void;
}

export interface BenchmarkTest {
  name: string;
  setup: () => TestScene;
  description: string;
}

export const benchmarkHelpers = {
  setupBasicRenderingTest: (): TestScene => {
    const scene = new Scene();

export const setupTransparencyStressTest = (scene: THREE.Scene): BenchmarkScenario => {
  const floors = []
  const objects = []
  const lights = []

  // Create overlapping transparent floors
  for (let layer = 0; layer < 5; layer++) {
    for (let x = -5; x <= 5; x += 2) {
      for (let z = -5; z <= 5; z += 2) {
        const floor = FloorFactory.createFrostedGlassFloor(
          new THREE.Vector3(x, layer * 0.5, z),
          'clear_frosted'
        )
        floor.transparency = 0.8
        floors.push(floor)
      }
    }
  }

  // Add colored lights for visual effect
  const colors = [0xff6b6b, 0x4ecdc4, 0xffbe0b]
  colors.forEach((color, index) => {
    const light = new THREE.PointLight(color, 1)
    light.position.set(
      Math.cos(index * Math.PI * 2 / 3) * 8,
      6,
      Math.sin(index * Math.PI * 2 / 3) * 8
    )
    lights.push(light)
  })

  return {
    floors,
    objects,
    lights,
    cleanup: () => {
      objects.forEach(obj => scene.remove(obj))
      lights.forEach(light => scene.remove(light))
    }
  }
}

export const setupLODEffectivenessTest = (scene: THREE.Scene): BenchmarkScenario => {
  const floors = []
  const objects = []
  const lights = []

  // Create floors at various distances for LOD testing
  for (let distance = 5; distance <= 100; distance += 15) {
    for (let angle = 0; angle < 360; angle += 60) {
      const x = Math.cos(angle * Math.PI / 180) * distance
      const z = Math.sin(angle * Math.PI / 180) * distance
      const floor = FloorFactory.createFrostedGlassFloor(
        new THREE.Vector3(x, 0, z),
        'medium_frosted'
      )
      floors.push(floor)
    }
  }

  // Add distance markers
  for (let distance = 20; distance <= 100; distance += 20) {
    const marker = new THREE.Mesh(
      new THREE.RingGeometry(distance - 0.5, distance + 0.5, 64),
      new THREE.MeshBasicMaterial({ color: 0x666666, transparent: true, opacity: 0.3 })
    )
    marker.rotation.x = -Math.PI / 2
    objects.push(marker)
  }

  return {
    floors,
    objects,
    lights,
    cleanup: () => {
      objects.forEach(obj => scene.remove(obj))
      lights.forEach(light => scene.remove(light))
    }
  }
}

export const setupBatchingOptimizationTest = (scene: THREE.Scene): BenchmarkScenario => {
  const floors = []
  const objects = []
  const lights = []

  // Create many floors with similar materials for batching test
  const materialTypes = ['clear_frosted', 'medium_frosted', 'heavy_frosted']
  
  for (let x = -20; x <= 20; x += 4) {
    for (let z = -20; z <= 20; z += 4) {
      const materialType = materialTypes[Math.floor(Math.random() * materialTypes.length)]
      const floor = FloorFactory.createFrostedGlassFloor(
        new THREE.Vector3(x, 0, z),
        materialType as 'clear_frosted' | 'medium_frosted' | 'heavy_frosted'
      )
      floors.push(floor)
    }
  }

  // Add a grid helper
  const grid = new THREE.GridHelper(40, 40)
  objects.push(grid)

  return {
    floors,
    objects,
    lights,
    cleanup: () => {
      objects.forEach(obj => scene.remove(obj))
      lights.forEach(light => scene.remove(light))
    }
  }
}

export const setupMemoryStressTest = (scene: THREE.Scene): BenchmarkScenario => {
  const floors = []
  const objects = []
  const lights = []

  // Create floors with different materials to test texture memory usage
  const glassTypes = ['clear_frosted', 'light_frosted', 'medium_frosted', 'heavy_frosted']
  
  for (let i = 0; i < 200; i++) {
    const x = (Math.random() - 0.5) * 100
    const z = (Math.random() - 0.5) * 100
    const glassType = glassTypes[Math.floor(Math.random() * glassTypes.length)]
    
    const floor = FloorFactory.createFrostedGlassFloor(
      new THREE.Vector3(x, 0, z),
      glassType as 'clear_frosted' | 'light_frosted' | 'medium_frosted' | 'heavy_frosted'
    )
    floors.push(floor)
  }

  // Add debug spheres to mark boundaries
  const boundaryMarkers = [
    new THREE.Vector3(-50, 0, -50),
    new THREE.Vector3(50, 0, -50),
    new THREE.Vector3(-50, 0, 50),
    new THREE.Vector3(50, 0, 50)
  ]

  boundaryMarkers.forEach(pos => {
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(1),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    )
    marker.position.copy(pos)
    objects.push(marker)
  })

  return {
    floors,
    objects,
    lights,
    cleanup: () => {
      objects.forEach(obj => scene.remove(obj))
      lights.forEach(light => scene.remove(light))
    }
  }
}
