"use client";

import React, { useRef, useCallback, useState } from "react";
import { useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import {
  GLTF,
  AnimationMixer,
  AnimationAction,
  Object3D,
  SkinnedMesh,
  Bone,
  Vector3,
  Euler,
} from "three";
import {
  PlayerAvatarState,
  PlayerAvatarLoader as IPlayerAvatarLoader,
  AvatarPerformanceMetrics,
} from "../../types/playerAvatar";
import { devLog, devWarn, devError } from "@/utils/devLogger";

interface PlayerAvatarLoaderProps {
  onAvatarLoaded?: (avatarState: PlayerAvatarState) => void;
  onLoadingProgress?: (progress: number) => void;
  onError?: (error: Error) => void;
  memoryLimit?: number; // MB
  performanceMode?: "high" | "medium" | "low";
}

interface ProcessedModel {
  gltf: GLTF;
  mixer: AnimationMixer;
  actions: Map<string, AnimationAction>;
  bones: Map<string, Bone>;
  meshes: SkinnedMesh[];
}

/**
 * PlayerAvatarLoader - Extends existing RPM loading for player-specific optimizations
 * Handles model loading, processing, and memory management for player avatars
 */
export class PlayerAvatarLoader implements IPlayerAvatarLoader {
  private scene: Object3D;
  private memoryLimit: number;
  private performanceMode: "high" | "medium" | "low";
  private loadedModels = new Map<string, ProcessedModel>();
  private memoryUsage = 0;

  constructor(
    scene: Object3D,
    memoryLimit: number = 50 * 1024 * 1024, // 50MB default
    performanceMode: "high" | "medium" | "low" = "high",
  ) {
    this.scene = scene;
    this.memoryLimit = memoryLimit;
    this.performanceMode = performanceMode;
  }

  /**
   * Load player avatar with optimizations
   */
  async loadPlayerAvatar(modelUrl: string): Promise<GLTF> {
    try {
      // Check if model is already loaded
      if (this.loadedModels.has(modelUrl)) {
        const cached = this.loadedModels.get(modelUrl)!;
        return cached.gltf;
      }

      // Check memory before loading
      if (this.memoryUsage > this.memoryLimit * 0.8) {
        await this.cleanupOldModels();
      }

      // Load GLTF with progress tracking
      const gltf = await this.loadAvatarGLTF(modelUrl);

      // Process model for player use
      this.processPlayerModel(gltf);

      // Validate model compatibility
      if (!this.validatePlayerModel(gltf)) {
        throw new Error(
          `Model ${modelUrl} is not compatible with player avatar system`,
        );
      }

      // Create processed model entry
      const processedModel = this.createProcessedModel(gltf);
      this.loadedModels.set(modelUrl, processedModel);

      // Update memory usage
      this.updateMemoryUsage(gltf);

      devLog(`✅ Player avatar loaded: ${modelUrl}`);
      return gltf;
    } catch (error) {
      devError(`❌ Failed to load player avatar: ${modelUrl}`, error);
      throw error;
    }
  }

  /**
   * Process player model with specific optimizations
   */
  processPlayerModel(gltf: GLTF): void {
    // Optimize for first-person visibility toggling
    this.setupFirstPersonOptimizations(gltf);

    // Set up bone hierarchy for animation blending
    this.optimizeBoneHierarchy(gltf);

    // Configure LOD levels for performance
    this.setupLODLevels(gltf);

    // Optimize materials for player use
    this.optimizeMaterials(gltf);

    // Setup shadow casting/receiving
    this.configureShadows(gltf);
  }

  /**
   * Validate model for player avatar use
   */
  validatePlayerModel(gltf: GLTF): boolean {
    // Check for required bones
    const requiredBones = ["Hips", "Spine", "Head", "LeftHand", "RightHand"];
    const bones = this.extractBones(gltf);

    for (const boneName of requiredBones) {
      if (!bones.has(boneName)) {
        devWarn(`Missing required bone: ${boneName}`);
        return false;
      }
    }

    // Check for animations
    if (!gltf.animations || gltf.animations.length === 0) {
      devWarn("No animations found in model");
      return false;
    }

    // Check model complexity
    const triangleCount = this.calculateTriangleCount(gltf);
    const maxTriangles = this.getMaxTrianglesForPerformanceMode();

    if (triangleCount > maxTriangles) {
      devWarn(
        `Model too complex: ${triangleCount} triangles (max: ${maxTriangles})`,
      );
      return false;
    }

    return true;
  }

  private async loadAvatarGLTF(modelUrl: string): Promise<GLTF> {
    return new Promise((resolve, reject) => {
      const loader = useGLTF.preload(modelUrl);

      // Note: In a real implementation, you'd use GLTFLoader directly
      // This is a simplified version using drei's pattern
      useGLTF(
        modelUrl,
        (gltf) => {
          resolve(gltf);
        },
        (progress) => {
          // Progress callback would be handled here
        },
        (error) => {
          reject(error);
        },
      );
    });
  }

  private setupFirstPersonOptimizations(gltf: GLTF): void {
    // Find head and body meshes
    const headMeshes: SkinnedMesh[] = [];
    const bodyMeshes: SkinnedMesh[] = [];

    gltf.scene.traverse((child) => {
      if (child instanceof SkinnedMesh) {
        if (
          child.name.toLowerCase().includes("head") ||
          child.name.toLowerCase().includes("face")
        ) {
          headMeshes.push(child);
        } else {
          bodyMeshes.push(child);
        }
      }
    });

    // Add visibility control userData
    headMeshes.forEach((mesh) => {
      mesh.userData.isHeadMesh = true;
      mesh.userData.hideInFirstPerson = true;
    });

    bodyMeshes.forEach((mesh) => {
      mesh.userData.isBodyMesh = true;
      mesh.userData.hideInFirstPerson = false;
    });
  }

  private optimizeBoneHierarchy(gltf: GLTF): void {
    const bones = this.extractBones(gltf);

    // Create bone lookup for fast access
    bones.forEach((bone, name) => {
      bone.userData.boneName = name;
      bone.userData.isPlayerBone = true;
    });

    // Setup IK constraints if needed
    this.setupIKConstraints(bones);
  }

  private setupLODLevels(gltf: GLTF): void {
    gltf.scene.traverse((child) => {
      if (child instanceof SkinnedMesh) {
        // Create LOD versions of geometry
        const highLOD = child.geometry.clone();
        const mediumLOD = this.simplifyGeometry(child.geometry, 0.7);
        const lowLOD = this.simplifyGeometry(child.geometry, 0.4);

        child.userData.lodGeometry = {
          high: highLOD,
          medium: mediumLOD,
          low: lowLOD,
        };

        child.userData.currentLOD = "high";
      }
    });
  }

  private optimizeMaterials(gltf: GLTF): void {
    gltf.scene.traverse((child) => {
      if (child instanceof SkinnedMesh && child.material) {
        const material = child.material as any;

        // Optimize based on performance mode
        switch (this.performanceMode) {
          case "low":
            material.envMapIntensity = 0.3;
            if (material.normalMap) material.normalMap = null;
            break;
          case "medium":
            material.envMapIntensity = 0.6;
            break;
          case "high":
            // Keep full quality
            break;
        }

        // Enable shadow casting/receiving
        material.shadowSide = 2; // DoubleSide for shadows
      }
    });
  }

  private configureShadows(gltf: GLTF): void {
    gltf.scene.traverse((child) => {
      if (child instanceof SkinnedMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  private extractBones(gltf: GLTF): Map<string, Bone> {
    const bones = new Map<string, Bone>();

    gltf.scene.traverse((child) => {
      if (child instanceof Bone) {
        bones.set(child.name, child);
      }
    });

    return bones;
  }

  private setupIKConstraints(bones: Map<string, Bone>): void {
    // Setup basic IK chains for natural movement
    const leftArm = this.createIKChain(
      ["LeftShoulder", "LeftElbow", "LeftHand"],
      bones,
    );
    const rightArm = this.createIKChain(
      ["RightShoulder", "RightElbow", "RightHand"],
      bones,
    );
    const spine = this.createIKChain(["Hips", "Spine", "Chest", "Head"], bones);

    // Store IK chains in userData for animation system
    if (leftArm.length > 0) bones.get("LeftHand")!.userData.ikChain = leftArm;
    if (rightArm.length > 0)
      bones.get("RightHand")!.userData.ikChain = rightArm;
    if (spine.length > 0) bones.get("Head")!.userData.ikChain = spine;
  }

  private createIKChain(boneNames: string[], bones: Map<string, Bone>): Bone[] {
    return boneNames
      .map((name) => bones.get(name))
      .filter((bone) => bone !== undefined) as Bone[];
  }

  private calculateTriangleCount(gltf: GLTF): number {
    let triangleCount = 0;

    gltf.scene.traverse((child) => {
      if (child instanceof SkinnedMesh) {
        const geometry = child.geometry;
        if (geometry.index) {
          triangleCount += geometry.index.count / 3;
        } else {
          triangleCount += geometry.attributes.position.count / 3;
        }
      }
    });

    return Math.floor(triangleCount);
  }

  private getMaxTrianglesForPerformanceMode(): number {
    switch (this.performanceMode) {
      case "low":
        return 5000;
      case "medium":
        return 15000;
      case "high":
        return 50000;
    }
  }

  private createProcessedModel(gltf: GLTF): ProcessedModel {
    const mixer = new AnimationMixer(gltf.scene);
    const actions = new Map<string, AnimationAction>();
    const bones = this.extractBones(gltf);
    const meshes: SkinnedMesh[] = [];

    // Create animation actions
    gltf.animations.forEach((clip, index) => {
      const action = mixer.clipAction(clip);
      const name = clip.name || `animation_${index}`;
      actions.set(name, action);
    });

    // Collect meshes
    gltf.scene.traverse((child) => {
      if (child instanceof SkinnedMesh) {
        meshes.push(child);
      }
    });

    return {
      gltf,
      mixer,
      actions,
      bones,
      meshes,
    };
  }

  private simplifyGeometry(geometry: any, ratio: number): any {
    // Simplified geometry reduction - in production use a proper decimation library
    const simplified = geometry.clone();

    // Basic vertex reduction by sampling
    if (simplified.index && simplified.index.count > 300) {
      const newCount = Math.floor(simplified.index.count * ratio);
      const newIndex = new Uint32Array(newCount);

      for (let i = 0; i < newCount; i++) {
        const sourceIndex = Math.floor(i / ratio);
        newIndex[i] = simplified.index.array[sourceIndex];
      }

      simplified.setIndex(newIndex);
    }

    return simplified;
  }

  private updateMemoryUsage(gltf: GLTF): void {
    // Estimate memory usage
    let estimatedSize = 0;

    gltf.scene.traverse((child) => {
      if (child instanceof SkinnedMesh) {
        const geometry = child.geometry;

        // Estimate geometry size
        Object.values(geometry.attributes).forEach((attribute) => {
          estimatedSize += attribute.array.byteLength;
        });

        // Estimate texture size
        const material = child.material as any;
        if (material.map) estimatedSize += 1024 * 1024; // Estimate 1MB per texture
        if (material.normalMap) estimatedSize += 1024 * 1024;
      }
    });

    this.memoryUsage += estimatedSize;
  }

  private async cleanupOldModels(): Promise<void> {
    // Remove oldest models to free memory
    const models = Array.from(this.loadedModels.entries());
    const modelsToRemove = models.slice(0, Math.floor(models.length / 2));

    modelsToRemove.forEach(([url, model]) => {
      // Dispose of resources
      model.actions.forEach((action) => action.stop());
      model.mixer.uncacheRoot(model.mixer.getRoot());

      model.meshes.forEach((mesh) => {
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => mat.dispose());
        } else {
          mesh.material.dispose();
        }
      });

      this.loadedModels.delete(url);
    });

    // Reset memory usage estimate
    this.memoryUsage = Math.floor(this.memoryUsage * 0.5);

    devLog(`🧹 Cleaned up ${modelsToRemove.length} old avatar models`);
  }

  /**
   * Get cached model if available
   */
  getCachedModel(modelUrl: string): ProcessedModel | null {
    return this.loadedModels.get(modelUrl) || null;
  }

  /**
   * Get current memory usage
   */
  getMemoryUsage(): number {
    return this.memoryUsage;
  }

  /**
   * Clear all cached models
   */
  clearCache(): void {
    this.loadedModels.forEach((model, url) => {
      model.actions.forEach((action) => action.stop());
      model.mixer.uncacheRoot(model.mixer.getRoot());
    });

    this.loadedModels.clear();
    this.memoryUsage = 0;
  }
}

/**
 * React Component Hook for PlayerAvatarLoader
 */
export function usePlayerAvatarLoader({
  onAvatarLoaded,
  onLoadingProgress,
  onError,
  memoryLimit = 50 * 1024 * 1024,
  performanceMode = "high",
}: PlayerAvatarLoaderProps = {}) {
  const { scene } = useThree();
  const loaderRef = useRef<PlayerAvatarLoader>();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Initialize loader
  if (!loaderRef.current) {
    loaderRef.current = new PlayerAvatarLoader(
      scene,
      memoryLimit,
      performanceMode,
    );
  }

  const loadAvatar = useCallback(
    async (modelUrl: string): Promise<PlayerAvatarState | null> => {
      if (!loaderRef.current) return null;

      setIsLoading(true);
      setLoadingProgress(0);

      try {
        const gltf = await loaderRef.current.loadPlayerAvatar(modelUrl);
        const cachedModel = loaderRef.current.getCachedModel(modelUrl);

        if (cachedModel) {
          const avatarState: PlayerAvatarState = {
            modelUrl,
            characterId: `avatar_${Date.now()}`,
            isLoaded: true,
            loadingProgress: 100,
            isVisible: true,
            renderLOD: "high",
            currentAnimation: "idle",
            animationBlendWeight: 1.0,
            position: new Vector3(),
            rotation: new Euler(),
            scale: new Vector3(1, 1, 1),
            animationMixer: cachedModel.mixer,
            currentAnimations: cachedModel.actions,
            transitionState: null,
            lastUpdateTime: performance.now(),
            frameSkipCount: 0,
            memoryUsage: loaderRef.current.getMemoryUsage(),
          };

          onAvatarLoaded?.(avatarState);
          return avatarState;
        }

        return null;
      } catch (error) {
        devError("Failed to load avatar:", error);
        onError?.(error as Error);
        return null;
      } finally {
        setIsLoading(false);
        setLoadingProgress(100);
      }
    },
    [onAvatarLoaded, onError],
  );

  const getMemoryUsage = useCallback((): number => {
    return loaderRef.current?.getMemoryUsage() || 0;
  }, []);

  const clearCache = useCallback((): void => {
    loaderRef.current?.clearCache();
  }, []);

  return {
    loadAvatar,
    isLoading,
    loadingProgress,
    getMemoryUsage,
    clearCache,
  };
}

export default PlayerAvatarLoader;
