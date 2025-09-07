import React, { useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export interface PerformanceMetrics {
  fps: number
  frameTime: number
  memoryUsed: number
  drawCalls: number
  triangles: number
  transparentObjects: number
  activeLODLevels: Record<string, number>
  gpuMemory: number
}

export interface PerformanceThresholds {
  targetFPS: number
  minFPS: number
  maxMemoryMB: number
  maxDrawCalls: number
  maxTransparentObjects: number
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  targetFPS: 60,
  minFPS: 45,
  maxMemoryMB: 500,
  maxDrawCalls: 200,
  maxTransparentObjects: 100
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics
  private thresholds: PerformanceThresholds
  private frameHistory: number[] = []
  private lastFrameTime: number = 0
  private updateCallbacks: ((metrics: PerformanceMetrics) => void)[] = []

  constructor(thresholds: Partial<PerformanceThresholds> = {}) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds }
    this.metrics = this.getInitialMetrics()
  }

  private getInitialMetrics(): PerformanceMetrics {
    return {
      fps: 60,
      frameTime: 16.67,
      memoryUsed: 0,
      drawCalls: 0,
      triangles: 0,
      transparentObjects: 0,
      activeLODLevels: {},
      gpuMemory: 0
    }
  }

  updateMetrics(renderer: THREE.WebGLRenderer, scene: THREE.Scene): void {
    const currentTime = performance.now()
    
    // Calculate FPS
    if (this.lastFrameTime > 0) {
      const frameTime = currentTime - this.lastFrameTime
      this.frameHistory.push(frameTime)
      
      // Keep only last 60 frames for average calculation
      if (this.frameHistory.length > 60) {
        this.frameHistory.shift()
      }
      
      const avgFrameTime = this.frameHistory.reduce((a, b) => a + b) / this.frameHistory.length
      this.metrics.fps = 1000 / avgFrameTime
      this.metrics.frameTime = avgFrameTime
    }
    
    this.lastFrameTime = currentTime
    
    // Get rendering info
    const info = renderer.info
    this.metrics.drawCalls = info.render.calls
    this.metrics.triangles = info.render.triangles
    
    // Memory usage
    const memory = (performance as any).memory
    if (memory) {
      this.metrics.memoryUsed = memory.usedJSHeapSize / (1024 * 1024)
    }
    
    // GPU memory (if available)
    const gpuInfo = info as any
    if (gpuInfo.memory) {
      this.metrics.gpuMemory = gpuInfo.memory.textures + gpuInfo.memory.geometries
    }
    
    // Count transparent objects
    this.metrics.transparentObjects = this.countTransparentObjects(scene)
    
    // Notify subscribers
    this.updateCallbacks.forEach(callback => callback(this.metrics))
  }

  private countTransparentObjects(scene: THREE.Scene): number {
    let count = 0
    scene.traverse(object => {
      if (object instanceof THREE.Mesh && object.material) {
        const material = Array.isArray(object.material) 
          ? object.material[0] 
          : object.material
        if (material.transparent) {
          count++
        }
      }
    })
    return count
  }

  updateLODMetrics(lodCounts: Record<string, number>): void {
    this.metrics.activeLODLevels = { ...lodCounts }
  }

  isPerformanceGood(): boolean {
    return (
      this.metrics.fps >= this.thresholds.minFPS &&
      this.metrics.memoryUsed <= this.thresholds.maxMemoryMB &&
      this.metrics.drawCalls <= this.thresholds.maxDrawCalls
    )
  }

  getPerformanceGrade(): 'excellent' | 'good' | 'fair' | 'poor' {
    const fpsRatio = this.metrics.fps / this.thresholds.targetFPS
    const memoryRatio = this.metrics.memoryUsed / this.thresholds.maxMemoryMB
    const drawCallRatio = this.metrics.drawCalls / this.thresholds.maxDrawCalls
    
    const overallScore = (fpsRatio + (1 - memoryRatio) + (1 - drawCallRatio)) / 3
    
    if (overallScore >= 0.9) return 'excellent'
    if (overallScore >= 0.7) return 'good'
    if (overallScore >= 0.5) return 'fair'
    return 'poor'
  }

  getOptimizationSuggestions(): string[] {
    const suggestions: string[] = []
    
    if (this.metrics.fps < this.thresholds.minFPS) {
      suggestions.push('Reduce LOD quality or enable more aggressive culling')
    }
    
    if (this.metrics.memoryUsed > this.thresholds.maxMemoryMB) {
      suggestions.push('Reduce texture resolutions or enable texture streaming')
    }
    
    if (this.metrics.drawCalls > this.thresholds.maxDrawCalls) {
      suggestions.push('Enable batching for similar floor materials')
    }
    
    if (this.metrics.transparentObjects > this.thresholds.maxTransparentObjects) {
      suggestions.push('Increase culling distance for transparent objects')
    }
    
    return suggestions
  }

  subscribe(callback: (metrics: PerformanceMetrics) => void): () => void {
    this.updateCallbacks.push(callback)
    return () => {
      const index = this.updateCallbacks.indexOf(callback)
      if (index >= 0) {
        this.updateCallbacks.splice(index, 1)
      }
    }
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  getThresholds(): PerformanceThresholds {
    return { ...this.thresholds }
  }
}

export const usePerformanceMonitor = (thresholds?: Partial<PerformanceThresholds>) => {
  const monitor = useRef<PerformanceMonitor | null>(null)
  const [metrics, setMetrics] = useState<PerformanceMetrics>()
  
  useEffect(() => {
    monitor.current = new PerformanceMonitor(thresholds)
    
    const unsubscribe = monitor.current.subscribe(setMetrics)
    return unsubscribe
  }, [thresholds])
  
  useFrame(({ gl, scene }) => {
    if (monitor.current) {
      monitor.current.updateMetrics(gl, scene)
    }
  })
  
  return {
    monitor: monitor.current,
    metrics,
    isPerformanceGood: monitor.current?.isPerformanceGood() ?? true,
    grade: monitor.current?.getPerformanceGrade() ?? 'good',
    suggestions: monitor.current?.getOptimizationSuggestions() ?? []
  }
}
