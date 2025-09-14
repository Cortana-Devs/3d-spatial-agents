import * as THREE from 'three'

export interface BenchmarkScenario {
  floors: any[]
  objects: THREE.Object3D[]
  lights: THREE.Light[]
  cleanup: () => void
}

export interface PerformanceSample {
  timestamp: number
  fps: number
  frameTime: number
  memoryUsage: number
  drawCalls: number
  triangles: number
}

export interface BenchmarkTest {
  id: string
  name: string
  description: string
  setup: (scene: THREE.Scene) => BenchmarkScenario
  duration: number
  targetMetrics: {
    minFPS: number
    maxMemoryMB: number
    maxDrawCalls: number
  }
}

export interface BenchmarkResult {
  testId: string
  startTime: number
  endTime: number
  samples: PerformanceSample[]
  summary: {
    averageFPS: number
    minFPS: number
    maxFPS: number
    averageMemory: number
    peakMemory: number
    averageDrawCalls: number
    maxDrawCalls: number
    frameDrops: number
    passed: boolean
  }
}

export interface ValidationResult {
  criteria: string
  passed: boolean
  notes: string
}
