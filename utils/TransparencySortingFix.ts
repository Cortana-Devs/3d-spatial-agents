"use client";

import { devLog, devWarn } from "@/utils/devLogger";
import {
  Object3D,
  Vector3,
  Camera,
  Material,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  InstancedMesh,
  Matrix4,
  Color,
  FrontSide,
  BackSide,
  DoubleSide,
} from "three";
import { Block, BlockType } from "../types";

export interface TransparentObject {
  id: string;
  object: Object3D;
  distance: number;
  renderOrder: number;
  blockType?: BlockType;
  position: Vector3;
  opacity: number;
}

export interface TransparencySortingConfig {
  enableDistanceBasedSorting: boolean;
  enableViewportCulling: boolean;
  maxTransparentObjects: number;
  depthSortingMethod: "simple" | "advanced" | "hybrid";
  renderOrderBase: number;
  opacityThreshold: number;
  viewportMargin: number;
}

export class TransparencySortingFix {
  private static instance: TransparencySortingFix | null = null;
  private config: TransparencySortingConfig;
  private transparentObjects: Map<string, TransparentObject> = new Map();
  private sortedObjects: TransparentObject[] = [];
  private lastCameraPosition: Vector3 = new Vector3();
  private lastSortTime: number = 0;
  private sortInterval: number = 16; // 60fps sorting
  private tempMatrix: Matrix4 = new Matrix4();
  private tempVector: Vector3 = new Vector3();

  private constructor() {
    this.config = {
      enableDistanceBasedSorting: true,
      enableViewportCulling: true,
      maxTransparentObjects: 200,
      depthSortingMethod: "hybrid",
      renderOrderBase: 1000,
      opacityThreshold: 0.01,
      viewportMargin: 0.1,
    };
  }

  public static getInstance(): TransparencySortingFix {
    if (!TransparencySortingFix.instance) {
      TransparencySortingFix.instance = new TransparencySortingFix();
    }
    return TransparencySortingFix.instance;
  }

  /**
   * Configure the transparency sorting system
   */
  public configure(config: Partial<TransparencySortingConfig>): void {
    this.config = { ...this.config, ...config };
    devLog("TransparencySortingFix configured:", this.config);
  }

  /**
   * Create an optimized material for NUMBER_7 blocks
   */
  public createOptimizedGlassMaterial(): MeshPhysicalMaterial {
    const material = new MeshPhysicalMaterial({
      // Basic properties
      color: new Color(0.96, 0.98, 1.0), // Very light blue tint
      metalness: 0.0,
      roughness: 0.08, // Very smooth glass

      // Transparency properties
      transparent: true,
      opacity: 0.75, // Balanced opacity for stability
      alphaTest: 0.001, // Very low threshold to prevent z-fighting

      // Physical properties for realistic glass
      transmission: 0.95, // High transmission for glass-like appearance
      thickness: 0.05, // Thin glass for better performance
      ior: 1.5, // Standard glass index of refraction

      // Environment and lighting
      envMapIntensity: 1.2, // Enhanced reflections
      clearcoat: 0.1, // Slight clear coat for depth
      clearcoatRoughness: 0.0,

      // Rendering properties
      depthWrite: true, // Enable depth writing for proper sorting
      depthTest: true, // Enable depth testing
      side: FrontSide, // Front side only for better performance

      // Advanced properties
      reflectivity: 0.9,
    });

    // Performance optimizations
    material.toneMapped = false; // Disable tone mapping for performance
    material.fog = true; // Enable fog for depth perception
    material.dithering = false; // Disable dithering for performance
    material.flatShading = false; // Smooth shading for glass
    material.vertexColors = false; // Disable vertex colors for consistency

    // Set material properties for proper transparency sorting
    material.needsUpdate = true;

    return material;
  }

  /**
   * Register a transparent object for sorting
   */
  public registerTransparentObject(
    id: string,
    object: Object3D,
    blockType?: BlockType,
    opacity: number = 1.0,
  ): void {
    if (this.transparentObjects.size >= this.config.maxTransparentObjects) {
      devWarn(
        `Maximum transparent objects reached (${this.config.maxTransparentObjects})`,
      );
      return;
    }

    const position = new Vector3();
    object.getWorldPosition(position);

    const transparentObj: TransparentObject = {
      id,
      object,
      distance: 0, // Will be calculated during sorting
      renderOrder: this.config.renderOrderBase,
      blockType,
      position: position.clone(),
      opacity,
    };

    this.transparentObjects.set(id, transparentObj);
  }

  /**
   * Unregister a transparent object
   */
  public unregisterTransparentObject(id: string): void {
    this.transparentObjects.delete(id);
  }

  /**
   * Update transparency sorting based on camera position
   */
  public updateTransparencySorting(camera: Camera): void {
    const now = performance.now();
    const cameraPosition = new Vector3();
    camera.getWorldPosition(cameraPosition);

    // Check if we need to re-sort based on camera movement and time
    const cameraMoved =
      cameraPosition.distanceTo(this.lastCameraPosition) > 0.5;
    const timeElapsed = now - this.lastSortTime > this.sortInterval;

    if (!cameraMoved && !timeElapsed) {
      return;
    }

    this.performTransparencySorting(cameraPosition);
    this.applyRenderOrders();

    this.lastCameraPosition.copy(cameraPosition);
    this.lastSortTime = now;
  }

  /**
   * Perform the actual transparency sorting
   */
  private performTransparencySorting(cameraPosition: Vector3): void {
    const objects = Array.from(this.transparentObjects.values());

    // Update distances
    objects.forEach((obj) => {
      obj.object.getWorldPosition(this.tempVector);
      obj.distance = cameraPosition.distanceTo(this.tempVector);
      obj.position.copy(this.tempVector);
    });

    // Sort based on method
    switch (this.config.depthSortingMethod) {
      case "simple":
        this.sortedObjects = this.simpleDistanceSort(objects);
        break;
      case "advanced":
        this.sortedObjects = this.advancedDepthSort(objects, cameraPosition);
        break;
      case "hybrid":
      default:
        this.sortedObjects = this.hybridSort(objects, cameraPosition);
        break;
    }

    // Apply viewport culling if enabled
    if (this.config.enableViewportCulling) {
      this.applyViewportCulling(cameraPosition);
    }
  }

  /**
   * Simple distance-based sorting
   */
  private simpleDistanceSort(
    objects: TransparentObject[],
  ): TransparentObject[] {
    return objects.sort((a, b) => b.distance - a.distance); // Far to near
  }

  /**
   * Advanced depth sorting with view direction consideration
   */
  private advancedDepthSort(
    objects: TransparentObject[],
    cameraPosition: Vector3,
  ): TransparentObject[] {
    return objects.sort((a, b) => {
      // Primary sort: distance from camera
      const distanceDiff = b.distance - a.distance;

      if (Math.abs(distanceDiff) > 0.1) {
        return distanceDiff;
      }

      // Secondary sort: z-depth for objects at similar distances
      const zDiff = b.position.z - a.position.z;

      if (Math.abs(zDiff) > 0.1) {
        return zDiff;
      }

      // Tertiary sort: by block type priority (NUMBER_7 blocks render last)
      if (
        a.blockType === BlockType.NUMBER_7 &&
        b.blockType !== BlockType.NUMBER_7
      ) {
        return 1;
      }
      if (
        b.blockType === BlockType.NUMBER_7 &&
        a.blockType !== BlockType.NUMBER_7
      ) {
        return -1;
      }

      return 0;
    });
  }

  /**
   * Hybrid sorting combining simple and advanced methods
   */
  private hybridSort(
    objects: TransparentObject[],
    cameraPosition: Vector3,
  ): TransparentObject[] {
    // Use simple sorting for objects far away, advanced for close objects
    const nearObjects = objects.filter((obj) => obj.distance < 20);
    const farObjects = objects.filter((obj) => obj.distance >= 20);

    const sortedNear = this.advancedDepthSort(nearObjects, cameraPosition);
    const sortedFar = this.simpleDistanceSort(farObjects);

    return [...sortedFar, ...sortedNear];
  }

  /**
   * Apply viewport culling to hide objects outside view
   */
  private applyViewportCulling(cameraPosition: Vector3): void {
    // Simple frustum culling approximation
    const cullDistance = 100; // Maximum render distance

    this.sortedObjects = this.sortedObjects.filter((obj) => {
      return (
        obj.distance < cullDistance &&
        obj.opacity > this.config.opacityThreshold
      );
    });
  }

  /**
   * Apply calculated render orders to objects
   */
  private applyRenderOrders(): void {
    this.sortedObjects.forEach((obj, index) => {
      // Calculate render order: far objects get lower numbers (render first)
      // Near objects get higher numbers (render last, on top)
      const renderOrder = this.config.renderOrderBase + index;

      // Apply render order to the object
      if (obj.object instanceof InstancedMesh) {
        obj.object.renderOrder = renderOrder;
      } else if ("renderOrder" in obj.object) {
        (obj.object as any).renderOrder = renderOrder;
      }

      // Update the stored render order
      obj.renderOrder = renderOrder;
    });
  }

  /**
   * Fix specific issues with NUMBER_7 blocks
   */
  public fixNUMBER7BlockIssues(instancedMesh: InstancedMesh): void {
    if (!instancedMesh || !instancedMesh.material) return;

    const material = instancedMesh.material as MeshPhysicalMaterial;

    // Ensure proper material configuration
    if (material.transparent) {
      // Fix depth writing and testing
      material.depthWrite = true;
      material.depthTest = true;

      // Ensure proper alpha testing
      material.alphaTest = 0.001;

      // Fix blending mode
      material.premultipliedAlpha = false;

      // Ensure proper side rendering
      material.side = FrontSide;

      // Update material
      material.needsUpdate = true;
    }

    // Set consistent render order for all NUMBER_7 blocks
    instancedMesh.renderOrder = this.config.renderOrderBase + 500; // Middle priority

    // Ensure proper frustum culling
    instancedMesh.frustumCulled = true;
  }

  /**
   * Get sorting statistics for debugging
   */
  public getStats(): {
    totalTransparentObjects: number;
    sortedObjectsCount: number;
    lastSortTime: number;
    averageDistance: number;
    renderOrderRange: { min: number; max: number };
  } {
    const distances = this.sortedObjects.map((obj) => obj.distance);
    const renderOrders = this.sortedObjects.map((obj) => obj.renderOrder);

    return {
      totalTransparentObjects: this.transparentObjects.size,
      sortedObjectsCount: this.sortedObjects.length,
      lastSortTime: this.lastSortTime,
      averageDistance:
        distances.length > 0
          ? distances.reduce((a, b) => a + b, 0) / distances.length
          : 0,
      renderOrderRange: {
        min: renderOrders.length > 0 ? Math.min(...renderOrders) : 0,
        max: renderOrders.length > 0 ? Math.max(...renderOrders) : 0,
      },
    };
  }

  /**
   * Clear all transparent objects (cleanup)
   */
  public clear(): void {
    this.transparentObjects.clear();
    this.sortedObjects = [];
  }

  /**
   * Enable debug logging
   */
  public enableDebugLogging(): void {
    const originalUpdateMethod = this.updateTransparencySorting.bind(this);

    this.updateTransparencySorting = (camera: Camera) => {
      const stats = this.getStats();
      devLog("Transparency Sorting Stats:", stats);
      originalUpdateMethod(camera);
    };
  }
}

// Export singleton instance
export const transparencySortingFix = TransparencySortingFix.getInstance();

// Export utility functions
export const TransparencyFixUtils = {
  /**
   * Quick fix for flickering glass blocks
   */
  quickFixGlassBlock: (instancedMesh: InstancedMesh) => {
    transparencySortingFix.fixNUMBER7BlockIssues(instancedMesh);
  },

  /**
   * Create optimized glass material
   */
  createGlassMaterial: () => {
    return transparencySortingFix.createOptimizedGlassMaterial();
  },

  /**
   * Check if a block type requires transparency sorting
   */
  requiresTransparencySorting: (blockType: BlockType): boolean => {
    return (
      blockType === BlockType.NUMBER_7 ||
      blockType === BlockType.FROSTED_GLASS ||
      blockType === BlockType.NUMBER_6
    );
  },
};
