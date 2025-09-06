import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useRef, useMemo, useCallback } from 'react'

export class LightReflectionManager {
  private reflectionProbes: Map<string, THREE.CubeCamera> = new Map()
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private maxProbes: number = 8

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
    this.renderer = renderer
    this.scene = scene
  }

  createReflectionProbe(
    position: THREE.Vector3,
    resolution: number = 256
  ): THREE.CubeCamera {
    const renderTarget = new THREE.WebGLCubeRenderTarget(resolution)
    renderTarget.texture.type = THREE.HalfFloatType
    
    const cubeCamera = new THREE.CubeCamera(0.1, 100, renderTarget)
    cubeCamera.position.copy(position)
    
    return cubeCamera
  }

  updateReflectionProbe(
    cubeCamera: THREE.CubeCamera,
    excludeObjects: THREE.Object3D[] = []
  ): void {
    // Temporarily hide excluded objects
    const originalVisible = excludeObjects.map(obj => obj.visible)
    excludeObjects.forEach(obj => obj.visible = false)
    
    // Update the cube camera
    cubeCamera.update(this.renderer, this.scene)
    
    // Restore visibility
    excludeObjects.forEach((obj, i) => obj.visible = originalVisible[i])
  }

  getEnvironmentMap(floorPosition: THREE.Vector3): THREE.Texture | null {
    // Find or create the nearest reflection probe
    const probeKey = `${Math.floor(floorPosition.x / 5)}_${Math.floor(floorPosition.z / 5)}`
    
    if (!this.reflectionProbes.has(probeKey)) {
      if (this.reflectionProbes.size >= this.maxProbes) {
        return null // Max probes reached
      }
      
      const probe = this.createReflectionProbe(floorPosition)
      this.reflectionProbes.set(probeKey, probe)
      this.scene.add(probe)
    }
    
    const probe = this.reflectionProbes.get(probeKey)!
    return probe.renderTarget.texture
  }

  cleanup(): void {
    this.reflectionProbes.forEach(probe => {
      probe.renderTarget.dispose()
      this.scene.remove(probe)
    })
    this.reflectionProbes.clear()
  }
}

export const useReflectionSystem = () => {
  const { gl, scene } = useThree()
  const reflectionManager = useMemo(() => 
    new LightReflectionManager(gl, scene), [gl, scene]
  )

  const updateReflections = useCallback((floors: THREE.Mesh[]) => {
    floors.forEach(floor => {
      const envMap = reflectionManager.getEnvironmentMap(floor.position)
      if (envMap && floor.material instanceof THREE.MeshPhysicalMaterial) {
        floor.material.envMap = envMap
        floor.material.needsUpdate = true
      }
    })
  }, [reflectionManager])

  return { reflectionManager, updateReflections }
}
