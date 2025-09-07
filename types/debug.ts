import * as THREE from 'three'

export interface FloorDebugData {
  floorId: string
  materialProperties: {
    transparency: number
    roughness: number
    glassType: string
    colorTint: string
  }
  navigationProperties: {
    walkable: boolean
    safetyLevel: 'safe' | 'caution' | 'risky' | 'dangerous' | 'avoid'
    slippery: boolean
    navigationCost: number
    structuralConfidence: number
  }
  performanceData: {
    lodLevel: string
    renderCost: number
    memoryUsage: number
  }
  renderingInfo: {
    vertexCount: number
    triangleCount: number
    textureResolution: number
  }
  aiAnalysis: {
    safetyLevel: 'safe' | 'caution' | 'risky' | 'dangerous' | 'avoid'
    walkable: boolean
    slippery: boolean
    navigationCost: number
    requiresSpecialBehavior: boolean
    alternativePathWeight: number
    structuralConfidence: number
  }
}

export interface TestResult {
  testId: string
  passed: boolean
  timestamp: number
  duration: number
  validationResults: ValidationResult[]
  performanceMetrics?: {
    averageFPS: number
    memoryUsage: number
    drawCalls: number
  }
}

export interface ValidationResult {
  criteria: string
  passed: boolean
  notes: string
}

export interface PerformanceMetrics {
  fps: number
  frameTime: number
  drawCalls: number
  triangles: number
  memoryUsed: number
  transparentObjects: number
}

export interface BenchmarkScenario {
  floors: any[]
  objects: THREE.Object3D[]
  lights: THREE.Light[]
  cleanup: () => void
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

export interface PerformanceSample {
  timestamp: number
  fps: number
  frameTime: number
  memoryUsage: number
  drawCalls: number
  triangles: number
}
