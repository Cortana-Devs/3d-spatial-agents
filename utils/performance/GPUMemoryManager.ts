"use client";

import {
  BufferGeometry,
  Material,
  WebGLRenderer,
  InstancedMesh,
  BufferAttribute,
  DataTexture,
  RGBAFormat,
  LinearFilter,
  ClampToEdgeWrapping,
} from "three";
import { devLog } from "@/utils/devLogger";

// GPU Memory Configuration
const GPU_MEMORY_CONFIG = {
  MAX_BUFFER_SIZE: 64 * 1024 * 1024, // 64MB
  GC_THRESHOLD: 0.8, // Trigger cleanup at 80% capacity
} as const;

// GPU Resource tracking
interface GPUResourceInfo {
  id: string;
  type: "geometry" | "material" | "texture" | "buffer";
  size: number;
  lastUsed: number;
  refCount: number;
  priority: number;
}

// GPU Memory Manager with advanced optimization
export class GPUMemoryManager {
  private static instance: GPUMemoryManager;
  private renderer: WebGLRenderer | null = null;

  // Resource tracking
  private resources = new Map<string, GPUResourceInfo>();
  private memoryUsage = {
    geometries: 0,
    materials: 0,
    textures: 0,
    buffers: 0,
    total: 0,
  };

  // Performance metrics
  private metrics = {
    allocations: 0,
    deallocations: 0,
    poolHits: 0,
    poolMisses: 0,
    gcTriggered: 0,
    lastGCTime: 0,
    memoryPressure: 0,
  };

  private constructor() {
    this.startMemoryMonitoring();
  }

  static getInstance(): GPUMemoryManager {
    if (!GPUMemoryManager.instance) {
      GPUMemoryManager.instance = new GPUMemoryManager();
    }
    return GPUMemoryManager.instance;
  }

  // Initialize with renderer for WebGL info access
  initialize(renderer: WebGLRenderer): void {
    this.renderer = renderer;
    this.logGPUCapabilities();
  }

  private logGPUCapabilities(): void {
    if (!this.renderer) return;

    const gl = this.renderer.getContext();
    const info = this.renderer.info;

    if (process.env.NODE_ENV === "development") {
      devLog("🚀 GPU Capabilities:", {
        renderer: info.render.calls,
        triangles: info.render.triangles,
        points: info.render.points,
        lines: info.render.lines,
        memory: {
          geometries: info.memory.geometries,
          textures: info.memory.textures,
        },
        maxTextures: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
        maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
        maxVaryingVectors: gl.getParameter(gl.MAX_VARYING_VECTORS),
        maxFragmentUniforms: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
        maxVertexUniforms: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
      });
    }
  }

  // Smart geometry allocation with automatic batching
  allocateGeometry(
    id: string,
    vertexCount: number,
    hasColors = false,
  ): BufferGeometry {
    this.metrics.allocations++;

    const geometry = new BufferGeometry();
    this.metrics.poolHits++;

    // Pre-allocate buffers based on vertex count
    const positions = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);

    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    geometry.setAttribute("normal", new BufferAttribute(normals, 3));
    geometry.setAttribute("uv", new BufferAttribute(uvs, 2));

    if (hasColors) {
      const colors = new Float32Array(vertexCount * 3);
      geometry.setAttribute("color", new BufferAttribute(colors, 3));
    }

    // Track resource
    const size = this.calculateGeometrySize(geometry);
    this.trackResource(id, "geometry", size);

    return geometry;
  }

  // Optimized buffer allocation
  allocateBuffer(size: number): Float32Array {
    return new Float32Array(size);
  }

  // Smart texture allocation with compression
  allocateTexture(
    id: string,
    width: number,
    height: number,
    format = RGBAFormat,
  ): DataTexture {
    const size = width * height * this.getBytesPerPixel(format);
    const data = new Uint8Array(size);

    const texture = new DataTexture(data, width, height, format);
    texture.generateMipmaps = false;
    texture.minFilter = LinearFilter;
    texture.magFilter = LinearFilter;
    texture.wrapS = ClampToEdgeWrapping;
    texture.wrapT = ClampToEdgeWrapping;

    this.trackResource(id, "texture", size);
    return texture;
  }

  // Instance management for large numbers of identical objects
  createInstancedRenderer(
    geometry: BufferGeometry,
    material: Material,
    maxInstances: number,
  ): InstancedMesh {
    const mesh = new InstancedMesh(geometry, material, maxInstances);

    // Pre-allocate instance attributes
    mesh.instanceMatrix.setUsage(35048); // DYNAMIC_DRAW

    return mesh;
  }

  // Memory pressure management
  private checkMemoryPressure(): number {
    const totalMemory = this.memoryUsage.total;
    const maxMemory = GPU_MEMORY_CONFIG.MAX_BUFFER_SIZE;
    const pressure = totalMemory / maxMemory;

    this.metrics.memoryPressure = pressure;

    if (pressure > GPU_MEMORY_CONFIG.GC_THRESHOLD) {
      this.triggerGarbageCollection();
    }

    return pressure;
  }

  private triggerGarbageCollection(): void {
    this.metrics.gcTriggered++;
    this.metrics.lastGCTime = Date.now();

    // Find least recently used resources
    const sortedResources = Array.from(this.resources.entries()).sort(
      ([, a], [, b]) => a.lastUsed - b.lastUsed,
    );

    // Remove 20% of least recently used resources
    const removeCount = Math.floor(sortedResources.length * 0.2);

    for (let i = 0; i < removeCount; i++) {
      const [id] = sortedResources[i];
      this.releaseResource(id);
    }
  }

  private trackResource(
    id: string,
    type: GPUResourceInfo["type"],
    size: number,
  ): void {
    const resource: GPUResourceInfo = {
      id,
      type,
      size,
      lastUsed: Date.now(),
      refCount: 1,
      priority: type === "geometry" ? 1 : type === "texture" ? 2 : 3,
    };

    this.resources.set(id, resource);
    const key =
      type === "buffer"
        ? "buffers"
        : (`${type}s` as keyof typeof this.memoryUsage);
    this.memoryUsage[key] += size;
    this.memoryUsage.total += size;
  }

  releaseResource(id: string): void {
    const resource = this.resources.get(id);
    if (!resource) return;

    this.metrics.deallocations++;

    resource.refCount--;
    if (resource.refCount <= 0) {
      this.resources.delete(id);
      const key =
        resource.type === "buffer"
          ? "buffers"
          : (`${resource.type}s` as keyof typeof this.memoryUsage);
      this.memoryUsage[key] -= resource.size;
      this.memoryUsage.total -= resource.size;
    }
  }

  // Utility methods
  private calculateGeometrySize(geometry: BufferGeometry): number {
    let size = 0;
    Object.values(geometry.attributes).forEach((attr) => {
      size += (attr as BufferAttribute).array.byteLength;
    });
    if (geometry.index) {
      size += geometry.index.array.byteLength;
    }
    return size;
  }

  private getBytesPerPixel(format: number): number {
    switch (format) {
      case RGBAFormat:
        return 4;
      default:
        return 4;
    }
  }

  // Performance monitoring
  private startMemoryMonitoring(): void {
    setInterval(() => {
      this.checkMemoryPressure();

      if (process.env.NODE_ENV === "development") {
        devLog("💾 Memory Manager Stats:", {
          memoryUsage: this.memoryUsage,
          metrics: this.metrics,
          resourceCount: this.resources.size,
          memoryPressure: `${(this.metrics.memoryPressure * 100).toFixed(1)}%`,
        });
      }
    }, 10000); // Every 10 seconds
  }

  // Public API
  getMemoryStats() {
    return {
      usage: { ...this.memoryUsage },
      metrics: { ...this.metrics },
      pressure: this.metrics.memoryPressure,
      resourceCount: this.resources.size,
    };
  }

  // Cleanup
  dispose(): void {
    this.resources.clear();
  }
}

// Export singleton instance
export const gpuMemoryManager = GPUMemoryManager.getInstance();

// Performance utilities
export class GPUPerformanceOptimizer {
  private static renderState = {
    lastMaterialType: "",
    lastGeometryId: 0,
    lastTextureId: 0,
    stateChanges: 0,
  };

  // Minimize WebGL state changes
  static optimizeRenderOrder<
    T extends { material: Material; geometry: BufferGeometry },
  >(renderables: T[]): T[] {
    return renderables.sort((a, b) => {
      // Sort by material type first (most expensive state change)
      if (a.material.type !== b.material.type) {
        return a.material.type.localeCompare(b.material.type);
      }

      // Then by geometry
      return a.geometry.id - b.geometry.id;
    });
  }

  // Batch similar draw calls
  static batchDrawCalls<T extends { material: Material; count: number }>(
    drawCalls: T[],
  ): Array<T[]> {
    const batches = new Map<string, T[]>();

    drawCalls.forEach((call) => {
      const key = `${call.material.type}`;
      if (!batches.has(key)) {
        batches.set(key, []);
      }
      batches.get(key)!.push(call);
    });

    return Array.from(batches.values());
  }

  // Track state changes for debugging
  static trackStateChange(
    type: "material" | "geometry" | "texture",
    id: string | number,
  ): void {
    const state = GPUPerformanceOptimizer.renderState;

    if (type === "material" && typeof id === "string") {
      if (state.lastMaterialType !== id) {
        state.lastMaterialType = id;
        state.stateChanges++;
      }
    } else if (type === "geometry" && typeof id === "number") {
      if (state.lastGeometryId !== id) {
        state.lastGeometryId = id;
        state.stateChanges++;
      }
    } else if (type === "texture" && typeof id === "number") {
      if (state.lastTextureId !== id) {
        state.lastTextureId = id;
        state.stateChanges++;
      }
    }
  }

  static getStateChangeCount(): number {
    return GPUPerformanceOptimizer.renderState.stateChanges;
  }

  static resetStateTracking(): void {
    GPUPerformanceOptimizer.renderState.stateChanges = 0;
  }
}
