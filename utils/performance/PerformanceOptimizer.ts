import { Object3D, WebGLRenderer, Camera, Scene, BufferGeometry, Material } from 'three';

// Performance budgets and thresholds
interface PerformanceBudgets {
  targetFPS: number;
  maxDrawCalls: number;
  maxTriangles: number;
  maxMemoryMB: number;
  maxGPUMemoryMB: number;
  frameTimeBudgetMS: number;
}

// Performance metrics collected per frame
interface FrameMetrics {
  frameTime: number;
  fps: number;
  drawCalls: number;
  triangles: number;
  memoryUsage: number;
  gpuMemoryUsage: number;
  timestamp: number;
  cpuTime: number;
  gpuTime: number;
}

// Optimization techniques available
type OptimizationTechnique =
  | 'frustum_culling'
  | 'occlusion_culling'
  | 'lod_reduction'
  | 'texture_compression'
  | 'geometry_simplification'
  | 'instancing'
  | 'batching'
  | 'temporal_upsampling'
  | 'adaptive_quality'
  | 'memory_pooling';

// Device capability tiers
type DeviceTier = 'mobile' | 'low' | 'medium' | 'high' | 'ultra';

// Smart optimization state
interface OptimizationState {
  activeTechniques: Set<OptimizationTechnique>;
  qualityLevel: number; // 0.0 to 1.0
  adaptiveMode: boolean;
  lastOptimization: number;
  stabilityScore: number;
  performanceTrend: 'improving' | 'stable' | 'degrading';
}

// Object pools for zero-allocation operations
class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn: (obj: T) => void;
  private maxSize: number;
  private borrowed = 0;

  constructor(createFn: () => T, resetFn: (obj: T) => void, maxSize = 1000) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
  }

  get(): T {
    if (this.pool.length > 0) {
      this.borrowed++;
      return this.pool.pop()!;
    }
    this.borrowed++;
    return this.createFn();
  }

  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.resetFn(obj);
      this.pool.push(obj);
      this.borrowed = Math.max(0, this.borrowed - 1);
    }
  }

  clear(): void {
    this.pool.length = 0;
    this.borrowed = 0;
  }

  getStats() {
    return {
      poolSize: this.pool.length,
      borrowed: this.borrowed,
      utilization: this.borrowed / (this.pool.length + this.borrowed + 1)
    };
  }
}

// Advanced memory manager with garbage collection optimization
class MemoryManager {
  private disposableObjects: Set<{ dispose(): void }> = new Set();
  private weakRefs: WeakRef<any>[] = [];
  private lastGC = 0;
  private memoryPressure = 0;

  register(obj: { dispose(): void }): void {
    this.disposableObjects.add(obj);
  }

  unregister(obj: { dispose(): void }): void {
    this.disposableObjects.delete(obj);
  }

  trackWeakly<T extends object>(obj: T): WeakRef<T> {
    const ref = new WeakRef(obj);
    this.weakRefs.push(ref);
    return ref;
  }

  forceCleanup(): void {
    // Dispose registered objects
    this.disposableObjects.forEach(obj => {
      try {
        obj.dispose();
      } catch (e) {
        console.warn('Error disposing object:', e);
      }
    });
    this.disposableObjects.clear();

    // Clean up weak references
    this.weakRefs = this.weakRefs.filter(ref => ref.deref() !== undefined);

    // Force garbage collection if available
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
    }

    this.lastGC = performance.now();
  }

  getMemoryPressure(): number {
    // @ts-ignore - experimental API
    const memInfo = (performance as any).memory;
    if (memInfo) {
      const usage = memInfo.usedJSHeapSize / memInfo.totalJSHeapSize;
      this.memoryPressure = usage;
      return usage;
    }
    return this.memoryPressure;
  }

  shouldTriggerGC(): boolean {
    const timeSinceGC = performance.now() - this.lastGC;
    const pressure = this.getMemoryPressure();

    return (pressure > 0.8 && timeSinceGC > 5000) ||
           (pressure > 0.9 && timeSinceGC > 1000) ||
           timeSinceGC > 30000;
  }
}

// GPU resource monitoring and management
class GPUResourceManager {
  private renderer: WebGLRenderer;
  private gl: WebGLRenderingContext | WebGL2RenderingContext;
  private memoryInfo: any;
  private resourceRegistry = new Map<string, { size: number, type: string }>();

  constructor(renderer: WebGLRenderer) {
    this.renderer = renderer;
    this.gl = renderer.getContext();

    // Try to get GPU memory extension
    this.memoryInfo = this.gl.getExtension('WEBGL_debug_renderer_info');
  }

  registerResource(id: string, resource: BufferGeometry | Material, type: string): void {
    let size = 0;

    if (resource instanceof BufferGeometry) {
      // Estimate geometry memory usage
      const attributes = resource.attributes;
      Object.values(attributes).forEach(attr => {
        if (attr.array) {
          size += attr.array.byteLength;
        }
      });

      const index = resource.index;
      if (index && index.array) {
        size += index.array.byteLength;
      }
    }

    this.resourceRegistry.set(id, { size, type });
  }

  unregisterResource(id: string): void {
    this.resourceRegistry.delete(id);
  }

  getTotalGPUMemory(): number {
    let total = 0;
    this.resourceRegistry.forEach(resource => {
      total += resource.size;
    });
    return total / (1024 * 1024); // MB
  }

  getResourcesByType(): Map<string, number> {
    const byType = new Map<string, number>();
    this.resourceRegistry.forEach(resource => {
      const current = byType.get(resource.type) || 0;
      byType.set(resource.type, current + resource.size);
    });
    return byType;
  }

  isMemoryPressure(): boolean {
    const totalMB = this.getTotalGPUMemory();

    // Conservative thresholds based on typical GPU memory
    if (totalMB > 1000) return true; // >1GB indicates pressure on most devices

    return false;
  }

  cleanup(): void {
    // Force WebGL resource cleanup
    this.gl.flush();
    this.gl.finish();

    // Clear resource registry
    this.resourceRegistry.clear();
  }
}

// Temporal performance analysis with prediction
class PerformanceAnalyzer {
  private metrics: FrameMetrics[] = [];
  private readonly maxHistory = 300; // 5 seconds at 60fps
  private predictions: number[] = [];
  private trendWindow = 60;

  addMetrics(metrics: FrameMetrics): void {
    this.metrics.push(metrics);

    if (this.metrics.length > this.maxHistory) {
      this.metrics.shift();
    }

    // Update predictions
    this.updatePredictions();
  }

  private updatePredictions(): void {
    if (this.metrics.length < 30) return;

    const recent = this.metrics.slice(-30);
    const trend = this.calculateTrend(recent.map(m => m.fps));

    // Simple linear prediction for next few frames
    const lastFPS = recent[recent.length - 1].fps;
    this.predictions = Array.from({ length: 10 }, (_, i) =>
      Math.max(10, lastFPS + (trend * (i + 1)))
    );
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumXX = values.reduce((sum, _, x) => sum + x * x, 0);

    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  getCurrentTrend(): 'improving' | 'stable' | 'degrading' {
    if (this.metrics.length < this.trendWindow) return 'stable';

    const recent = this.metrics.slice(-this.trendWindow);
    const trend = this.calculateTrend(recent.map(m => m.fps));

    if (trend > 1) return 'improving';
    if (trend < -1) return 'degrading';
    return 'stable';
  }

  getStabilityScore(): number {
    if (this.metrics.length < 30) return 0.5;

    const recent = this.metrics.slice(-30);
    const fps = recent.map(m => m.fps);
    const mean = fps.reduce((a, b) => a + b) / fps.length;
    const variance = fps.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / fps.length;
    const coefficientOfVariation = Math.sqrt(variance) / mean;

    // Lower CV = higher stability
    return Math.max(0, Math.min(1, 1 - coefficientOfVariation));
  }

  predictNextFrameTime(): number {
    if (this.predictions.length === 0) return 16.67;
    return 1000 / this.predictions[0];
  }

  shouldOptimize(budget: PerformanceBudgets): boolean {
    if (this.metrics.length < 10) return false;

    const recent = this.metrics.slice(-10);
    const avgFPS = recent.reduce((sum, m) => sum + m.fps, 0) / recent.length;
    const avgFrameTime = recent.reduce((sum, m) => sum + m.frameTime, 0) / recent.length;

    return avgFPS < budget.targetFPS * 0.9 ||
           avgFrameTime > budget.frameTimeBudgetMS * 1.1;
  }
}

// Main performance optimizer with buttery smooth tactics
export class PerformanceOptimizer {
  private state: OptimizationState;
  private budgets: PerformanceBudgets;
  private analyzer: PerformanceAnalyzer;
  private memoryManager: MemoryManager;
  private gpuManager: GPUResourceManager | null = null;
  private objectPools: Map<string, ObjectPool<any>>;
  private deviceTier: DeviceTier;
  private adaptationCooldown = 0;
  private frameCounter = 0;

  constructor(
    renderer?: WebGLRenderer,
    deviceTier: DeviceTier = 'medium'
  ) {
    this.deviceTier = deviceTier;
    this.budgets = this.getDefaultBudgets(deviceTier);
    this.analyzer = new PerformanceAnalyzer();
    this.memoryManager = new MemoryManager();
    this.objectPools = new Map();

    if (renderer) {
      this.gpuManager = new GPUResourceManager(renderer);
    }

    this.state = {
      activeTechniques: new Set(),
      qualityLevel: deviceTier === 'ultra' ? 1.0 :
                   deviceTier === 'high' ? 0.8 :
                   deviceTier === 'medium' ? 0.6 :
                   deviceTier === 'low' ? 0.4 : 0.2,
      adaptiveMode: true,
      lastOptimization: 0,
      stabilityScore: 0.5,
      performanceTrend: 'stable'
    };

    // Initialize essential optimizations based on device tier
    this.initializeOptimizations();
  }

  private getDefaultBudgets(tier: DeviceTier): PerformanceBudgets {
    const budgetsByTier: Record<DeviceTier, PerformanceBudgets> = {
      mobile: {
        targetFPS: 30,
        maxDrawCalls: 50,
        maxTriangles: 50000,
        maxMemoryMB: 100,
        maxGPUMemoryMB: 50,
        frameTimeBudgetMS: 33.33
      },
      low: {
        targetFPS: 45,
        maxDrawCalls: 100,
        maxTriangles: 100000,
        maxMemoryMB: 200,
        maxGPUMemoryMB: 100,
        frameTimeBudgetMS: 22.22
      },
      medium: {
        targetFPS: 60,
        maxDrawCalls: 200,
        maxTriangles: 250000,
        maxMemoryMB: 500,
        maxGPUMemoryMB: 250,
        frameTimeBudgetMS: 16.67
      },
      high: {
        targetFPS: 90,
        maxDrawCalls: 300,
        maxTriangles: 500000,
        maxMemoryMB: 1000,
        maxGPUMemoryMB: 500,
        frameTimeBudgetMS: 11.11
      },
      ultra: {
        targetFPS: 120,
        maxDrawCalls: 500,
        maxTriangles: 1000000,
        maxMemoryMB: 2000,
        maxGPUMemoryMB: 1000,
        frameTimeBudgetMS: 8.33
      }
    };

    return budgetsByTier[tier];
  }

  private initializeOptimizations(): void {
    // Always enable these for buttery smoothness
    this.state.activeTechniques.add('frustum_culling');
    this.state.activeTechniques.add('memory_pooling');

    // Device-specific optimizations
    if (this.deviceTier === 'mobile' || this.deviceTier === 'low') {
      this.state.activeTechniques.add('lod_reduction');
      this.state.activeTechniques.add('geometry_simplification');
      this.state.activeTechniques.add('adaptive_quality');
    }

    if (this.deviceTier === 'high' || this.deviceTier === 'ultra') {
      this.state.activeTechniques.add('occlusion_culling');
      this.state.activeTechniques.add('instancing');
      this.state.activeTechniques.add('temporal_upsampling');
    }
  }

  // Main optimization update - call every frame
  public update(metrics: Partial<FrameMetrics>): void {
    this.frameCounter++;

    const currentTime = performance.now();
    const frameMetrics: FrameMetrics = {
      frameTime: metrics.frameTime || 16.67,
      fps: metrics.fps || 60,
      drawCalls: metrics.drawCalls || 0,
      triangles: metrics.triangles || 0,
      memoryUsage: metrics.memoryUsage || this.memoryManager.getMemoryPressure() * 1000,
      gpuMemoryUsage: metrics.gpuMemoryUsage || this.gpuManager?.getTotalGPUMemory() || 0,
      timestamp: currentTime,
      cpuTime: metrics.cpuTime || metrics.frameTime || 16.67,
      gpuTime: metrics.gpuTime || 0
    };

    this.analyzer.addMetrics(frameMetrics);

    // Update state
    this.state.stabilityScore = this.analyzer.getStabilityScore();
    this.state.performanceTrend = this.analyzer.getCurrentTrend();

    // Adaptive optimization every 10 frames for stability
    if (this.frameCounter % 10 === 0 && this.state.adaptiveMode) {
      this.adaptiveOptimization(frameMetrics);
    }

    // Memory management every 60 frames
    if (this.frameCounter % 60 === 0) {
      this.manageMemory();
    }

    // Emergency optimization if performance is critical
    if (frameMetrics.fps < this.budgets.targetFPS * 0.5) {
      this.emergencyOptimization();
    }
  }

  private adaptiveOptimization(metrics: FrameMetrics): void {
    if (this.adaptationCooldown > 0) {
      this.adaptationCooldown--;
      return;
    }

    const shouldOptimize = this.analyzer.shouldOptimize(this.budgets);
    const trend = this.state.performanceTrend;

    if (shouldOptimize && trend === 'degrading') {
      this.increaseOptimization();
      this.adaptationCooldown = 30; // Cooldown to prevent oscillation
    } else if (!shouldOptimize && trend === 'improving' && this.state.stabilityScore > 0.8) {
      this.decreaseOptimization();
      this.adaptationCooldown = 60; // Longer cooldown for quality increases
    }
  }

  private increaseOptimization(): void {
    // Reduce quality level
    this.state.qualityLevel = Math.max(0.1, this.state.qualityLevel - 0.1);

    // Add more aggressive optimizations
    if (!this.state.activeTechniques.has('lod_reduction')) {
      this.state.activeTechniques.add('lod_reduction');
    }
    if (!this.state.activeTechniques.has('geometry_simplification')) {
      this.state.activeTechniques.add('geometry_simplification');
    }
    if (!this.state.activeTechniques.has('adaptive_quality') && this.state.qualityLevel < 0.5) {
      this.state.activeTechniques.add('adaptive_quality');
    }

    console.log(`🔧 Performance: Increased optimization (quality: ${(this.state.qualityLevel * 100).toFixed(0)}%)`);
  }

  private decreaseOptimization(): void {
    // Increase quality level
    this.state.qualityLevel = Math.min(1.0, this.state.qualityLevel + 0.05);

    // Remove some optimizations for better quality
    if (this.state.qualityLevel > 0.7 && this.deviceTier !== 'mobile') {
      this.state.activeTechniques.delete('geometry_simplification');
    }
    if (this.state.qualityLevel > 0.9) {
      this.state.activeTechniques.delete('adaptive_quality');
    }

    console.log(`✨ Performance: Decreased optimization (quality: ${(this.state.qualityLevel * 100).toFixed(0)}%)`);
  }

  private emergencyOptimization(): void {
    console.warn('🚨 Emergency optimization triggered!');

    // Aggressive quality reduction
    this.state.qualityLevel = Math.max(0.1, this.state.qualityLevel * 0.5);

    // Enable all optimizations
    this.state.activeTechniques.add('lod_reduction');
    this.state.activeTechniques.add('geometry_simplification');
    this.state.activeTechniques.add('adaptive_quality');
    this.state.activeTechniques.add('batching');

    // Force memory cleanup
    this.memoryManager.forceCleanup();
    this.gpuManager?.cleanup();
  }

  private manageMemory(): void {
    const memoryPressure = this.memoryManager.getMemoryPressure();
    const gpuPressure = this.gpuManager?.isMemoryPressure() || false;

    if (memoryPressure > 0.8 || gpuPressure || this.memoryManager.shouldTriggerGC()) {
      this.memoryManager.forceCleanup();

      // Clear object pools if they're too large
      this.objectPools.forEach(pool => {
        const stats = pool.getStats();
        if (stats.utilization < 0.3 && stats.poolSize > 100) {
          pool.clear();
        }
      });
    }
  }

  // Public API methods
  public getObjectPool<T>(
    name: string,
    createFn: () => T,
    resetFn: (obj: T) => void,
    maxSize = 1000
  ): ObjectPool<T> {
    if (!this.objectPools.has(name)) {
      this.objectPools.set(name, new ObjectPool(createFn, resetFn, maxSize));
    }
    return this.objectPools.get(name)!;
  }

  public registerDisposable(obj: { dispose(): void }): void {
    this.memoryManager.register(obj);
  }

  public registerGPUResource(id: string, resource: BufferGeometry | Material, type: string): void {
    this.gpuManager?.registerResource(id, resource, type);
  }

  public isOptimizationActive(technique: OptimizationTechnique): boolean {
    return this.state.activeTechniques.has(technique);
  }

  public getQualityLevel(): number {
    return this.state.qualityLevel;
  }

  public getPerformanceMetrics() {
    return {
      qualityLevel: this.state.qualityLevel,
      activeTechniques: Array.from(this.state.activeTechniques),
      stabilityScore: this.state.stabilityScore,
      trend: this.state.performanceTrend,
      memoryPressure: this.memoryManager.getMemoryPressure(),
      gpuMemoryMB: this.gpuManager?.getTotalGPUMemory() || 0,
      poolStats: Object.fromEntries(
        Array.from(this.objectPools.entries()).map(([name, pool]) => [name, pool.getStats()])
      )
    };
  }

  public setAdaptiveMode(enabled: boolean): void {
    this.state.adaptiveMode = enabled;
  }

  public forceQualityLevel(level: number): void {
    this.state.qualityLevel = Math.max(0, Math.min(1, level));
    this.state.adaptiveMode = false;
  }

  public dispose(): void {
    this.memoryManager.forceCleanup();
    this.gpuManager?.cleanup();
    this.objectPools.forEach(pool => pool.clear());
    this.objectPools.clear();
  }
}

// Global performance optimizer instance
let globalOptimizer: PerformanceOptimizer | null = null;

export const getGlobalOptimizer = (renderer?: WebGLRenderer, deviceTier?: DeviceTier): PerformanceOptimizer => {
  if (!globalOptimizer) {
    globalOptimizer = new PerformanceOptimizer(renderer, deviceTier);
  }
  return globalOptimizer;
};

export const disposeGlobalOptimizer = (): void => {
  if (globalOptimizer) {
    globalOptimizer.dispose();
    globalOptimizer = null;
  }
};

// Utility functions for common optimizations
export const OptimizationUtils = {
  // Calculate optimal LOD level based on distance and screen space
  calculateLOD: (distance: number, screenSize: number, maxLOD = 3): number => {
    const distanceFactor = Math.min(distance / 100, 1);
    const sizeFactor = Math.max(0, 1 - screenSize / 1000);
    return Math.floor((distanceFactor + sizeFactor) * maxLOD);
  },

  // Determine if object should be culled
  shouldCull: (distance: number, maxDistance: number, screenSize: number, minScreenSize = 1): boolean => {
    return distance > maxDistance || screenSize < minScreenSize;
  },

  // Calculate appropriate quality multiplier
  getQualityMultiplier: (optimizer: PerformanceOptimizer, baseQuality = 1.0): number => {
    return baseQuality * optimizer.getQualityLevel();
  },

  // Smart batching decision
  shouldBatch: (optimizer: PerformanceOptimizer, objectCount: number, triangleCount: number): boolean => {
    return optimizer.isOptimizationActive('batching') &&
           objectCount > 10 &&
           triangleCount < 1000; // Don't batch complex geometry
  }
};
