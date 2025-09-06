import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { FrostedGlassFloor } from "../../components/floors/FrostedGlassFloor";
import { FloorLODManager } from "../FloorLODManager";
import { TransparencyBatcher } from "../TransparencyBatcher";
import { PerformanceMonitor } from "../PerformanceMonitor";
import { AdaptiveQualityManager } from "../AdaptiveQuality";
import { TransparentNavMeshGenerator } from "../../src/components/floors/ai/TransparentNavMeshGenerator";
import { TransparentPathfinder } from "../../src/components/floors/ai/TransparentPathfinder";
import { useReflectionSystem } from "../LightReflectionSystem";
import { useCausticSystem } from "../../effects/CausticSystem";
import { FrostedGlassMaterial } from "../../materials/FrostedGlassMaterial";
import * as THREE from "three";

export interface FloorSystemConfig {
  maxFloors: number;
  enableLOD: boolean;
  enableBatching: boolean;
  enableAINavigation: boolean;
  enableAdvancedEffects: boolean;
  enablePerformanceMonitoring: boolean;
  qualityPreset: "ultra" | "high" | "medium" | "low" | "auto";
  debugMode: boolean;
}

export interface FloorSystemState {
  floors: Map<string, any>;
  navMesh: any;
  performanceMetrics: any;
  qualityLevel: string;
  systemHealth: "excellent" | "good" | "degraded" | "critical";
}

export class FloorSystemManager {
  private config: FloorSystemConfig;
  private state: FloorSystemState;
  private lodManager: FloorLODManager | null = null;
  private batcher: TransparencyBatcher | null = null;
  private performanceMonitor: PerformanceMonitor | null = null;
  private qualityManager: AdaptiveQualityManager | null = null;
  private navMeshGenerator: TransparentNavMeshGenerator | null = null;
  private pathfinder: TransparentPathfinder | null = null;
  private updateCallbacks: ((state: FloorSystemState) => void)[] = [];

  constructor(config: Partial<FloorSystemConfig> = {}) {
    this.config = {
      maxFloors: 100,
      enableLOD: true,
      enableBatching: true,
      enableAINavigation: true,
      enableAdvancedEffects: true,
      enablePerformanceMonitoring: true,
      qualityPreset: "auto",
      debugMode: false,
      ...config,
    };

    this.state = {
      floors: new Map(),
      navMesh: null,
      performanceMetrics: null,
      qualityLevel: this.config.qualityPreset,
      systemHealth: "good",
    };
  }

  initialize(
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
  ): void {
    // Initialize subsystems based on configuration
    if (this.config.enablePerformanceMonitoring) {
      this.performanceMonitor = new PerformanceMonitor();
    }

    if (this.config.enableLOD) {
      this.lodManager = new FloorLODManager(camera, {
        targetFPS: 60,
        minFPS: 45,
        maxMemoryUsage: 500,
        getCurrentFPS: () => this.performanceMonitor?.getMetrics().fps || 60,
        getMemoryUsage: () =>
          this.performanceMonitor?.getMetrics().memoryUsed || 0,
      });
    }

    if (this.config.enableBatching) {
      this.batcher = new TransparencyBatcher(camera);
    }

    if (this.config.enableAINavigation) {
      this.navMeshGenerator = new TransparentNavMeshGenerator();
    }

    if (
      this.config.qualityPreset === "auto" &&
      this.performanceMonitor &&
      this.lodManager
    ) {
      this.qualityManager = new AdaptiveQualityManager(
        this.performanceMonitor,
        this.lodManager,
      );
    }
  }

  addFloor(floor: any): void {
    if (this.state.floors.size >= this.config.maxFloors) {
      console.warn(
        `Floor system: Maximum floors (${this.config.maxFloors}) reached`,
      );
      return;
    }

    this.state.floors.set(floor.id, floor);
    this.updateNavMesh();
    this.notifyStateChange();
  }

  removeFloor(floorId: string): void {
    if (this.state.floors.delete(floorId)) {
      this.updateNavMesh();
      this.notifyStateChange();
    }
  }

  updateFloor(floor: any): void {
    if (this.state.floors.has(floor.id)) {
      this.state.floors.set(floor.id, floor);
      this.updateNavMesh();
      this.notifyStateChange();
    }
  }

  private updateNavMesh(): void {
    if (!this.config.enableAINavigation || !this.navMeshGenerator) return;

    const floors = Array.from(this.state.floors.values());
    const worldBounds = new THREE.Box3(
      new THREE.Vector3(-100, -10, -100),
      new THREE.Vector3(100, 10, 100),
    );

    this.state.navMesh = this.navMeshGenerator.generateNavMesh(
      floors,
      worldBounds,
    );

    if (this.pathfinder) {
      this.pathfinder = new TransparentPathfinder(
        this.state.navMesh.nodes,
        this.state.navMesh.edges,
      );
    }
  }

  update(
    deltaTime: number,
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
  ): void {
    const floors = Array.from(this.state.floors.values());

    // Update performance monitoring
    if (this.performanceMonitor) {
      this.performanceMonitor.updateMetrics(renderer, scene);
      this.state.performanceMetrics = this.performanceMonitor.getMetrics();
      this.updateSystemHealth();
    }

    // Update LOD system
    if (this.lodManager && this.config.enableLOD) {
      this.lodManager.updateLOD(floors);
    }

    // Update transparency batching
    if (this.batcher && this.config.enableBatching) {
      this.batcher.batchFloors(floors);
      this.batcher.updateBatches(Date.now());
    }

    // Update adaptive quality
    if (this.qualityManager) {
      // Quality manager handles its own updates based on performance data
    }

    this.notifyStateChange();
  }

  private updateSystemHealth(): void {
    if (!this.state.performanceMetrics) return;

    const metrics = this.state.performanceMetrics;
    const fps = metrics.fps;
    const memory = metrics.memoryUsed;

    if (fps >= 55 && memory <= 300) {
      this.state.systemHealth = "excellent";
    } else if (fps >= 45 && memory <= 400) {
      this.state.systemHealth = "good";
    } else if (fps >= 30 && memory <= 600) {
      this.state.systemHealth = "degraded";
    } else {
      this.state.systemHealth = "critical";
    }
  }

  getPathfinder(): TransparentPathfinder | null {
    return this.pathfinder;
  }

  getPerformanceMetrics(): any {
    return this.state.performanceMetrics;
  }

  getSystemState(): FloorSystemState {
    return { ...this.state };
  }

  updateConfiguration(newConfig: Partial<FloorSystemConfig>): void {
    this.config = { ...this.config, ...newConfig };
    // Reinitialize systems if necessary
  }

  subscribe(callback: (state: FloorSystemState) => void): () => void {
    this.updateCallbacks.push(callback);
    return () => {
      const index = this.updateCallbacks.indexOf(callback);
      if (index >= 0) {
        this.updateCallbacks.splice(index, 1);
      }
    };
  }

  private notifyStateChange(): void {
    this.updateCallbacks.forEach((callback) => callback(this.state));
  }

  dispose(): void {
    this.batcher?.dispose();
    this.updateCallbacks.length = 0;
    this.state.floors.clear();
  }
}

export const useFloorSystem = (config?: Partial<FloorSystemConfig>) => {
  const { camera, gl, scene } = useThree();
  const systemRef = useRef<FloorSystemManager | null>(null);
  const [systemState, setSystemState] = useState<FloorSystemState>();

  useEffect(() => {
    systemRef.current = new FloorSystemManager(config);
    systemRef.current.initialize(camera, gl, scene);

    const unsubscribe = systemRef.current.subscribe(setSystemState);
    return () => {
      unsubscribe();
      systemRef.current?.dispose();
    };
  }, [camera, gl, scene, config]);

  useFrame((state, delta) => {
    systemRef.current?.update(delta, gl, scene);
  });

  return {
    system: systemRef.current,
    state: systemState,
    addFloor: (floor: any) => systemRef.current?.addFloor(floor),
    removeFloor: (floorId: string) => systemRef.current?.removeFloor(floorId),
    updateFloor: (floor: any) => systemRef.current?.updateFloor(floor),
    getPathfinder: () => systemRef.current?.getPathfinder(),
    getPerformanceMetrics: () => systemRef.current?.getPerformanceMetrics(),
  };
};
