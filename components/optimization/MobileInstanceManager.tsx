"use client";

import React, { useRef, useEffect, useCallback, useMemo } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { devWarn } from "@/utils/devLogger";
import {
  InstancedMesh,
  Matrix4,
  Vector3,
  Quaternion,
  Color,
  BufferGeometry,
  Material,
  Frustum,
  Matrix3,
  Box3,
  Sphere,
  Camera,
  WebGLRenderer,
  Object3D,
  BufferAttribute,
  Float32BufferAttribute,
  InstancedBufferGeometry,
  InstancedBufferAttribute,
} from "three";

// Mobile-specific instance configuration
interface MobileInstanceConfig {
  maxInstances: number;
  cullingDistance: number;
  lodDistances: number[];
  enableFrustumCulling: boolean;
  enableOcclusionCulling: boolean;
  enableDistanceCulling: boolean;
  batchSize: number;
  memoryPoolSize: number;
  thermalThrottling: boolean;
  adaptiveQuality: boolean;
  targetFPS: number;
}

// Instance data structure optimized for mobile
interface MobileInstanceData {
  id: string;
  position: Vector3;
  rotation: Quaternion;
  scale: Vector3;
  color: Color;
  visible: boolean;
  distance: number;
  lodLevel: number;
  lastUpdate: number;
  cullingFlags: number; // Bitfield for different culling types
}

// Memory pool for efficient object reuse
class MobileObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn: (obj: T) => void;
  private maxSize: number;

  constructor(
    createFn: () => T,
    resetFn: (obj: T) => void,
    initialSize: number = 50,
    maxSize: number = 200,
  ) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;

    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(createFn());
    }
  }

  acquire(): T {
    return this.pool.pop() || this.createFn();
  }

  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.resetFn(obj);
      this.pool.push(obj);
    }
  }

  clear(): void {
    // Properly dispose of pooled objects if they have a dispose method
    this.pool.forEach((item) => {
      if (
        item &&
        typeof (item as { dispose?: () => void }).dispose === "function"
      ) {
        (item as { dispose: () => void }).dispose();
      }
    });
    this.pool = [];
  }

  getStats() {
    return {
      poolSize: this.pool.length,
      maxSize: this.maxSize,
    };
  }
}

// Spatial partitioning for efficient culling
class MobileSpatialGrid {
  private grid: Map<string, Set<string>> = new Map();
  private cellSize: number;
  private instances: Map<string, MobileInstanceData> = new Map();

  constructor(cellSize: number = 32) {
    this.cellSize = cellSize;
  }

  private getGridKey(position: Vector3): string {
    const x = Math.floor(position.x / this.cellSize);
    const y = Math.floor(position.y / this.cellSize);
    const z = Math.floor(position.z / this.cellSize);
    return `${x},${y},${z}`;
  }

  addInstance(instance: MobileInstanceData): void {
    const key = this.getGridKey(instance.position);

    if (!this.grid.has(key)) {
      this.grid.set(key, new Set());
    }

    this.grid.get(key)!.add(instance.id);
    this.instances.set(instance.id, instance);
  }

  removeInstance(instanceId: string): void {
    const instance = this.instances.get(instanceId);
    if (instance) {
      const key = this.getGridKey(instance.position);
      const cell = this.grid.get(key);
      if (cell) {
        cell.delete(instanceId);
        if (cell.size === 0) {
          this.grid.delete(key);
        }
      }
      this.instances.delete(instanceId);
    }
  }

  updateInstance(instance: MobileInstanceData): void {
    this.removeInstance(instance.id);
    this.addInstance(instance);
  }

  getInstancesInRadius(center: Vector3, radius: number): MobileInstanceData[] {
    const result: MobileInstanceData[] = [];
    const cellRadius = Math.ceil(radius / this.cellSize);

    const centerKey = this.getGridKey(center);
    const [cx, cy, cz] = centerKey.split(",").map(Number);

    for (let x = cx - cellRadius; x <= cx + cellRadius; x++) {
      for (let y = cy - cellRadius; y <= cy + cellRadius; y++) {
        for (let z = cz - cellRadius; z <= cz + cellRadius; z++) {
          const key = `${x},${y},${z}`;
          const cell = this.grid.get(key);

          if (cell) {
            for (const instanceId of cell) {
              const instance = this.instances.get(instanceId);
              if (instance && center.distanceTo(instance.position) <= radius) {
                result.push(instance);
              }
            }
          }
        }
      }
    }

    return result;
  }

  clear(): void {
    this.grid.clear();
    this.instances.clear();
  }

  getStats() {
    return {
      cellCount: this.grid.size,
      instanceCount: this.instances.size,
      avgInstancesPerCell: this.instances.size / Math.max(this.grid.size, 1),
    };
  }
}

// Mobile-optimized instanced renderer
class MobileInstancedRenderer {
  private instancedMesh: InstancedMesh | null = null;
  private instances: Map<string, MobileInstanceData> = new Map();
  private spatialGrid: MobileSpatialGrid;
  private matrixPool: MobileObjectPool<Matrix4>;
  private vectorPool: MobileObjectPool<Vector3>;
  private config: MobileInstanceConfig;
  private frustum: Frustum = new Frustum();
  private tempMatrix: Matrix4 = new Matrix4();
  private tempVector: Vector3 = new Vector3();
  private lastCullTime: number = 0;
  private cullInterval: number = 16; // Cull every 16ms (60fps)
  private visibleInstances: string[] = [];
  private cullingStats = {
    total: 0,
    frustumCulled: 0,
    distanceCulled: 0,
    lodCulled: 0,
    visible: 0,
  };

  constructor(
    geometry: BufferGeometry,
    material: Material,
    config: MobileInstanceConfig,
  ) {
    this.config = config;
    this.spatialGrid = new MobileSpatialGrid(32);

    // Initialize object pools
    this.matrixPool = new MobileObjectPool(
      () => new Matrix4(),
      (matrix) => matrix.identity(),
      50,
      config.memoryPoolSize,
    );

    this.vectorPool = new MobileObjectPool(
      () => new Vector3(),
      (vector) => vector.set(0, 0, 0),
      50,
      config.memoryPoolSize,
    );

    // Create instanced mesh
    this.createInstancedMesh(geometry, material);
  }

  private createInstancedMesh(
    geometry: BufferGeometry,
    material: Material,
  ): void {
    // Create optimized geometry for mobile
    const mobileGeometry = this.optimizeGeometry(geometry);

    this.instancedMesh = new InstancedMesh(
      mobileGeometry,
      material,
      this.config.maxInstances,
    );

    // Set up instanced attributes for mobile optimization
    this.setupInstancedAttributes();

    // Enable frustum culling
    this.instancedMesh.frustumCulled = this.config.enableFrustumCulling;

    // Set render order for better mobile performance
    this.instancedMesh.renderOrder = 0;
  }

  private optimizeGeometry(geometry: BufferGeometry): BufferGeometry {
    // Clone and optimize geometry for mobile
    const optimized = geometry.clone();

    // Remove unnecessary attributes for mobile
    const keepAttributes = ["position", "normal", "uv"];
    const attributesToRemove: string[] = [];

    for (const attributeName in optimized.attributes) {
      if (!keepAttributes.includes(attributeName)) {
        attributesToRemove.push(attributeName);
      }
    }

    attributesToRemove.forEach((attr) => {
      optimized.deleteAttribute(attr);
    });

    // Optimize indices
    if (!optimized.index) {
      optimized.setIndex(
        Array.from(
          { length: optimized.attributes.position.count },
          (_, i) => i,
        ),
      );
    }

    // Compute bounding sphere for efficient culling
    optimized.computeBoundingSphere();
    optimized.computeBoundingBox();

    return optimized;
  }

  private setupInstancedAttributes(): void {
    if (!this.instancedMesh) return;

    const geometry = this.instancedMesh.geometry as InstancedBufferGeometry;

    // Set up instance matrix attribute (more memory efficient than individual transforms)
    const matrixAttribute = new InstancedBufferAttribute(
      new Float32Array(this.config.maxInstances * 16),
      16,
    );
    matrixAttribute.setUsage(35048); // THREE.DynamicDrawUsage
    geometry.setAttribute("instanceMatrix", matrixAttribute);

    // Color per instance
    const colorAttribute = new InstancedBufferAttribute(
      new Float32Array(this.config.maxInstances * 3),
      3,
    );
    colorAttribute.setUsage(35048);
    geometry.setAttribute("instanceColor", colorAttribute);

    // Custom attributes for mobile optimization
    const distanceAttribute = new InstancedBufferAttribute(
      new Float32Array(this.config.maxInstances),
      1,
    );
    distanceAttribute.setUsage(35048);
    geometry.setAttribute("instanceDistance", distanceAttribute);

    const lodAttribute = new InstancedBufferAttribute(
      new Float32Array(this.config.maxInstances),
      1,
    );
    lodAttribute.setUsage(35048);
    geometry.setAttribute("instanceLOD", lodAttribute);
  }

  addInstance(
    id: string,
    position: Vector3,
    rotation?: Quaternion,
    scale?: Vector3,
    color?: Color,
  ): void {
    if (this.instances.size >= this.config.maxInstances) {
      devWarn("Maximum instances reached, cannot add more");
      return;
    }

    const instance: MobileInstanceData = {
      id,
      position: position.clone(),
      rotation: rotation ? rotation.clone() : new Quaternion(),
      scale: scale ? scale.clone() : new Vector3(1, 1, 1),
      color: color ? color.clone() : new Color(0xffffff),
      visible: true,
      distance: 0,
      lodLevel: 0,
      lastUpdate: performance.now(),
      cullingFlags: 0,
    };

    this.instances.set(id, instance);
    this.spatialGrid.addInstance(instance);
    this.updateInstanceMatrix(instance);
  }

  removeInstance(id: string): void {
    const instance = this.instances.get(id);
    if (instance) {
      this.instances.delete(id);
      this.spatialGrid.removeInstance(id);

      // Mark the slot as unused
      if (this.instancedMesh) {
        const index = Array.from(this.instances.keys()).indexOf(id);
        if (index !== -1) {
          this.instancedMesh.setMatrixAt(
            index,
            new Matrix4().makeScale(0, 0, 0),
          );
          this.instancedMesh.instanceMatrix.needsUpdate = true;
        }
      }
    }
  }

  updateInstance(
    id: string,
    position?: Vector3,
    rotation?: Quaternion,
    scale?: Vector3,
    color?: Color,
  ): void {
    const instance = this.instances.get(id);
    if (!instance) return;

    let needsUpdate = false;

    if (position && !position.equals(instance.position)) {
      this.spatialGrid.removeInstance(id);
      instance.position.copy(position);
      this.spatialGrid.addInstance(instance);
      needsUpdate = true;
    }

    if (rotation && !rotation.equals(instance.rotation)) {
      instance.rotation.copy(rotation);
      needsUpdate = true;
    }

    if (scale && !scale.equals(instance.scale)) {
      instance.scale.copy(scale);
      needsUpdate = true;
    }

    if (color && !color.equals(instance.color)) {
      instance.color.copy(color);
      needsUpdate = true;
    }

    if (needsUpdate) {
      instance.lastUpdate = performance.now();
      this.updateInstanceMatrix(instance);
    }
  }

  private updateInstanceMatrix(instance: MobileInstanceData): void {
    if (!this.instancedMesh) return;

    const index = Array.from(this.instances.keys()).indexOf(instance.id);
    if (index === -1) return;

    // Use object pool for temporary matrix
    const matrix = this.matrixPool.acquire();
    matrix.compose(instance.position, instance.rotation, instance.scale);

    this.instancedMesh.setMatrixAt(index, matrix);
    this.instancedMesh.setColorAt(index, instance.color);

    // Update custom attributes
    const geometry = this.instancedMesh.geometry as InstancedBufferGeometry;
    const distanceAttr = geometry.attributes
      .instanceDistance as InstancedBufferAttribute;
    const lodAttr = geometry.attributes.instanceLOD as InstancedBufferAttribute;

    if (distanceAttr) {
      distanceAttr.setX(index, instance.distance);
      distanceAttr.needsUpdate = true;
    }

    if (lodAttr) {
      lodAttr.setX(index, instance.lodLevel);
      lodAttr.needsUpdate = true;
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;

    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }

    // Return matrix to pool
    this.matrixPool.release(matrix);
  }

  // Mobile-optimized culling system
  performCulling(camera: Camera, renderer: WebGLRenderer): void {
    const now = performance.now();

    // Thermal throttling - reduce cull frequency when overheating
    let cullInterval = this.cullInterval;
    if (this.config.thermalThrottling) {
      // This would be connected to your thermal management system
      cullInterval = this.cullInterval * 2; // Double interval when throttling
    }

    if (now - this.lastCullTime < cullInterval) return;

    // Update frustum
    this.frustum.setFromProjectionMatrix(
      this.tempMatrix.multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse,
      ),
    );

    this.cullingStats = {
      total: this.instances.size,
      frustumCulled: 0,
      distanceCulled: 0,
      lodCulled: 0,
      visible: 0,
    };

    this.visibleInstances = [];
    const cameraPosition = this.vectorPool.acquire();
    camera.getWorldPosition(cameraPosition);

    // Process instances in batches for better mobile performance
    const instanceArray = Array.from(this.instances.values());
    const batchSize = this.config.batchSize;
    let processed = 0;

    const processBatch = () => {
      const end = Math.min(processed + batchSize, instanceArray.length);

      for (let i = processed; i < end; i++) {
        const instance = instanceArray[i];
        this.cullInstance(instance, cameraPosition);
      }

      processed = end;

      // Continue processing in next frame if there are more instances
      if (processed < instanceArray.length) {
        requestAnimationFrame(processBatch);
      } else {
        // Culling complete, update render count
        if (this.instancedMesh) {
          this.instancedMesh.count = this.visibleInstances.length;
        }

        this.vectorPool.release(cameraPosition);
        this.lastCullTime = now;
      }
    };

    processBatch();
  }

  private cullInstance(
    instance: MobileInstanceData,
    cameraPosition: Vector3,
  ): void {
    let visible = true;
    instance.cullingFlags = 0;

    // Calculate distance
    instance.distance = instance.position.distanceTo(cameraPosition);

    // Distance culling
    if (
      this.config.enableDistanceCulling &&
      instance.distance > this.config.cullingDistance
    ) {
      visible = false;
      instance.cullingFlags |= 1; // Distance culled
      this.cullingStats.distanceCulled++;
    }

    // Frustum culling (simplified for mobile performance)
    if (visible && this.config.enableFrustumCulling) {
      if (!this.frustum.containsPoint(instance.position)) {
        // Use spatial grid for more efficient frustum culling
        const nearbyInstances = this.spatialGrid.getInstancesInRadius(
          instance.position,
          2,
        );
        const hasVisibleNearby = nearbyInstances.some(
          (nearby) =>
            nearby.id !== instance.id &&
            this.frustum.containsPoint(nearby.position),
        );

        if (!hasVisibleNearby) {
          visible = false;
          instance.cullingFlags |= 2; // Frustum culled
          this.cullingStats.frustumCulled++;
        }
      }
    }

    // LOD system
    if (visible) {
      instance.lodLevel = this.calculateLODLevel(instance.distance);

      // Cull extremely distant instances even if they pass other tests
      if (instance.lodLevel >= this.config.lodDistances.length) {
        visible = false;
        instance.cullingFlags |= 4; // LOD culled
        this.cullingStats.lodCulled++;
      }
    }

    instance.visible = visible;

    if (visible) {
      this.visibleInstances.push(instance.id);
      this.cullingStats.visible++;
      this.updateInstanceMatrix(instance);
    }
  }

  private calculateLODLevel(distance: number): number {
    for (let i = 0; i < this.config.lodDistances.length; i++) {
      if (distance <= this.config.lodDistances[i]) {
        return i;
      }
    }
    return this.config.lodDistances.length;
  }

  // Memory management for mobile
  garbageCollect(): void {
    // Clean up unused instances
    const now = performance.now();
    const maxAge = 30000; // 30 seconds

    const toRemove: string[] = [];
    for (const [id, instance] of this.instances) {
      if (!instance.visible && now - instance.lastUpdate > maxAge) {
        toRemove.push(id);
      }
    }

    toRemove.forEach((id) => this.removeInstance(id));

    // Clear object pools periodically
    if (toRemove.length > 0) {
      this.matrixPool.clear();
      this.vectorPool.clear();
    }
  }

  // Adaptive quality based on performance
  adjustQualityForPerformance(avgFrameTime: number): void {
    if (!this.config.adaptiveQuality) return;

    const targetFrameTime = 1000 / this.config.targetFPS;

    if (avgFrameTime > targetFrameTime * 1.5) {
      // Reduce quality
      this.config.cullingDistance = Math.max(
        50,
        this.config.cullingDistance * 0.9,
      );
      this.config.batchSize = Math.max(50, this.config.batchSize * 0.8);
      this.cullInterval = Math.min(33, this.cullInterval * 1.2); // Reduce cull frequency
    } else if (avgFrameTime < targetFrameTime * 0.8) {
      // Increase quality gradually
      this.config.cullingDistance = Math.min(
        200,
        this.config.cullingDistance * 1.05,
      );
      this.config.batchSize = Math.min(500, this.config.batchSize * 1.1);
      this.cullInterval = Math.max(8, this.cullInterval * 0.95);
    }
  }

  getMesh(): InstancedMesh | null {
    return this.instancedMesh;
  }

  getStats() {
    return {
      totalInstances: this.instances.size,
      visibleInstances: this.visibleInstances.length,
      cullingStats: this.cullingStats,
      spatialGrid: this.spatialGrid.getStats(),
      objectPools: {
        matrices: this.matrixPool.getStats(),
        vectors: this.vectorPool.getStats(),
      },
      config: this.config,
    };
  }

  dispose(): void {
    if (this.instancedMesh) {
      this.instancedMesh.geometry.dispose();
      if (Array.isArray(this.instancedMesh.material)) {
        this.instancedMesh.material.forEach((mat) => mat.dispose());
      } else {
        this.instancedMesh.material.dispose();
      }
    }

    this.instances.clear();
    this.spatialGrid.clear();
    this.matrixPool.clear();
    this.vectorPool.clear();
    this.visibleInstances = [];
  }
}

// React component interface
interface MobileInstanceManagerProps {
  geometry: BufferGeometry;
  material: Material;
  config?: Partial<MobileInstanceConfig>;
  onStatsUpdate?: (stats: unknown) => void;
  children?: React.ReactNode;
}

export function MobileInstanceManager({
  geometry,
  material,
  config = {},
  onStatsUpdate,
  children,
}: MobileInstanceManagerProps) {
  const { camera, gl } = useThree();
  const rendererRef = useRef<MobileInstancedRenderer>();

  // Default mobile configuration
  const defaultConfig: MobileInstanceConfig = {
    maxInstances: 10000,
    cullingDistance: 150,
    lodDistances: [25, 75, 150],
    enableFrustumCulling: true,
    enableOcclusionCulling: false,
    enableDistanceCulling: true,
    batchSize: 200,
    memoryPoolSize: 500,
    thermalThrottling: true,
    adaptiveQuality: true,
    targetFPS: 30,
  };

  const finalConfig = useMemo(
    () => ({ ...defaultConfig, ...config }),
    [config],
  );

  // Initialize renderer
  useEffect(() => {
    if (!camera || !gl) return;

    rendererRef.current = new MobileInstancedRenderer(
      geometry,
      material,
      finalConfig,
    );

    return () => {
      rendererRef.current?.dispose();
    };
  }, [geometry, material, finalConfig, camera, gl]);

  // Performance monitoring and culling loop
  useFrame((state, deltaTime) => {
    if (!rendererRef.current || !camera || !gl) return;

    // Perform culling
    rendererRef.current.performCulling(camera, gl);

    // Adaptive quality adjustment
    const frameTime = deltaTime * 1000;
    rendererRef.current.adjustQualityForPerformance(frameTime);

    // Periodic garbage collection (every 5 seconds)
    if (Math.random() < 0.02) {
      // ~2% chance per frame at 60fps = ~5s
      rendererRef.current.garbageCollect();
    }

    // Update stats
    if (onStatsUpdate) {
      onStatsUpdate(rendererRef.current.getStats());
    }
  });

  // Render the instanced mesh
  const mesh = rendererRef.current?.getMesh();

  return (
    <>
      {mesh && <primitive object={mesh} />}
      {children}
    </>
  );
}

// Hook for managing instances
export function useMobileInstances() {
  const rendererRef = useRef<MobileInstancedRenderer>();

  const addInstance = useCallback(
    (
      id: string,
      position: Vector3,
      rotation?: Quaternion,
      scale?: Vector3,
      color?: Color,
    ) => {
      rendererRef.current?.addInstance(id, position, rotation, scale, color);
    },
    [],
  );

  const removeInstance = useCallback((id: string) => {
    rendererRef.current?.removeInstance(id);
  }, []);

  const updateInstance = useCallback(
    (
      id: string,
      position?: Vector3,
      rotation?: Quaternion,
      scale?: Vector3,
      color?: Color,
    ) => {
      rendererRef.current?.updateInstance(id, position, rotation, scale, color);
    },
    [],
  );

  const getStats = useCallback(() => {
    return rendererRef.current?.getStats() || null;
  }, []);

  return {
    addInstance,
    removeInstance,
    updateInstance,
    getStats,
    rendererRef,
  };
}

export default MobileInstanceManager;
