"use client";

import { Vector3, Camera, Frustum, Matrix4 } from "three";
import { Block, BlockType } from "../../types";

// Performance-oriented transparency optimization system
export interface TransparencyConfig {
  maxTransparentBlocks: number;
  cullingDistance: number;
  performanceMode: "ultra" | "high" | "balanced" | "low";
  enableDistanceCulling: boolean;
  enableFrustumCulling: boolean;
  enableOcclusionCulling: boolean;
  batchSize: number;
}

export interface TransparentBlock {
  block: Block;
  distance: number;
  isVisible: boolean;
  renderPriority: number;
  lastFrameRendered: number;
}

export class TransparencyOptimizer {
  private config: TransparencyConfig;
  private camera: Camera | null = null;
  private frustum = new Frustum();
  private cameraMatrix = new Matrix4();
  private frameCount = 0;
  private hasWarnedAboutCamera = false;
  private performanceMetrics = {
    transparentBlocksProcessed: 0,
    culledBlocks: 0,
    renderTime: 0,
    lastOptimizationTime: 0,
  };

  constructor(config: Partial<TransparencyConfig> = {}) {
    this.config = {
      maxTransparentBlocks: 200,
      cullingDistance: 150,
      performanceMode: "balanced",
      enableDistanceCulling: true,
      enableFrustumCulling: true,
      enableOcclusionCulling: false,
      batchSize: 50,
      ...config,
    };
  }

  // Initialize with camera for culling calculations
  initialize(camera: Camera): void {
    this.camera = camera;
    this.updatePerformanceSettings();
  }

  // Auto-adjust settings based on performance mode
  private updatePerformanceSettings(): void {
    switch (this.config.performanceMode) {
      case "ultra":
        this.config.maxTransparentBlocks = 500;
        this.config.cullingDistance = 300;
        this.config.batchSize = 100;
        break;
      case "high":
        this.config.maxTransparentBlocks = 300;
        this.config.cullingDistance = 200;
        this.config.batchSize = 75;
        break;
      case "balanced":
        this.config.maxTransparentBlocks = 200;
        this.config.cullingDistance = 150;
        this.config.batchSize = 50;
        break;
      case "low":
        this.config.maxTransparentBlocks = 100;
        this.config.cullingDistance = 100;
        this.config.batchSize = 25;
        break;
    }
  }

  // Process transparent blocks with performance optimization
  optimizeTransparentBlocks(allBlocks: Map<string, Block>): {
    visibleTransparentBlocks: TransparentBlock[];
    culledCount: number;
    performanceGain: number;
  } {
    if (!this.camera) {
      // Only warn once per session to avoid spam
      if (!this.hasWarnedAboutCamera) {
        console.warn(
          "TransparencyOptimizer: Camera not initialized - transparency optimization disabled",
        );
        this.hasWarnedAboutCamera = true;
      }
      return {
        visibleTransparentBlocks: [],
        culledCount: 0,
        performanceGain: 0,
      };
    }

    const startTime = performance.now();
    this.frameCount++;

    // Extract transparent blocks (NUMBER_7 primarily)
    const transparentBlocks = this.extractTransparentBlocks(allBlocks);

    // Update frustum for culling
    this.updateFrustum();

    // Apply optimization pipeline
    const optimizedBlocks = this.applyOptimizationPipeline(transparentBlocks);

    // Calculate performance metrics
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    const culledCount = transparentBlocks.length - optimizedBlocks.length;
    const performanceGain = culledCount / Math.max(transparentBlocks.length, 1);

    this.performanceMetrics = {
      transparentBlocksProcessed: transparentBlocks.length,
      culledBlocks: culledCount,
      renderTime,
      lastOptimizationTime: endTime,
    };

    return {
      visibleTransparentBlocks: optimizedBlocks,
      culledCount,
      performanceGain,
    };
  }

  // Extract blocks that need transparency rendering
  private extractTransparentBlocks(
    allBlocks: Map<string, Block>,
  ): TransparentBlock[] {
    const transparentBlocks: TransparentBlock[] = [];
    const cameraPosition = this.camera!.position;

    for (const block of allBlocks.values()) {
      // Check if block type requires transparency
      if (this.requiresTransparency(block.type)) {
        const blockPosition = new Vector3(
          block.position.x,
          block.position.y,
          block.position.z,
        );

        const distance = cameraPosition.distanceTo(blockPosition);

        transparentBlocks.push({
          block,
          distance,
          isVisible: true,
          renderPriority: this.calculateRenderPriority(block, distance),
          lastFrameRendered: this.frameCount,
        });
      }
    }

    return transparentBlocks;
  }

  // Check if block type requires transparency rendering
  private requiresTransparency(blockType: BlockType): boolean {
    return (
      blockType === BlockType.NUMBER_7 ||
      blockType === BlockType.FROSTED_GLASS ||
      blockType === BlockType.NUMBER_6
    ); // Sunset glass
  }

  // Calculate render priority for sorting
  private calculateRenderPriority(block: Block, distance: number): number {
    let priority = 1000 - distance; // Closer blocks have higher priority

    // Special priority adjustments
    if (block.type === BlockType.NUMBER_7) {
      priority += 100; // NUMBER_7 blocks are performance-critical
    }

    return Math.max(0, priority);
  }

  // Apply comprehensive optimization pipeline
  private applyOptimizationPipeline(
    transparentBlocks: TransparentBlock[],
  ): TransparentBlock[] {
    let optimizedBlocks = [...transparentBlocks];

    // Step 1: Distance culling
    if (this.config.enableDistanceCulling) {
      optimizedBlocks = this.applyDistanceCulling(optimizedBlocks);
    }

    // Step 2: Frustum culling
    if (this.config.enableFrustumCulling) {
      optimizedBlocks = this.applyFrustumCulling(optimizedBlocks);
    }

    // Step 3: Performance-based culling
    optimizedBlocks = this.applyPerformanceCulling(optimizedBlocks);

    // Step 4: Priority sorting for optimal rendering order
    optimizedBlocks = this.sortByRenderPriority(optimizedBlocks);

    // Step 5: Limit to maximum count
    optimizedBlocks = this.limitMaximumCount(optimizedBlocks);

    return optimizedBlocks;
  }

  // Distance-based culling
  private applyDistanceCulling(blocks: TransparentBlock[]): TransparentBlock[] {
    return blocks.filter((transparentBlock) => {
      if (transparentBlock.distance > this.config.cullingDistance) {
        transparentBlock.isVisible = false;
        return false;
      }
      return true;
    });
  }

  // Frustum culling for off-screen blocks
  private applyFrustumCulling(blocks: TransparentBlock[]): TransparentBlock[] {
    return blocks.filter((transparentBlock) => {
      const blockPosition = new Vector3(
        transparentBlock.block.position.x,
        transparentBlock.block.position.y,
        transparentBlock.block.position.z,
      );

      if (!this.frustum.containsPoint(blockPosition)) {
        transparentBlock.isVisible = false;
        return false;
      }

      return true;
    });
  }

  // Performance-based adaptive culling
  private applyPerformanceCulling(
    blocks: TransparentBlock[],
  ): TransparentBlock[] {
    // Get current performance metrics
    const isPerformanceCritical = this.performanceMetrics.renderTime > 16; // >60 FPS threshold

    if (!isPerformanceCritical) {
      return blocks; // No additional culling needed
    }

    // Aggressive culling for performance
    const targetReduction = 0.5; // Reduce by 50% when performance is critical
    const maxBlocks = Math.floor(blocks.length * (1 - targetReduction));

    return blocks
      .sort((a, b) => b.renderPriority - a.renderPriority)
      .slice(0, maxBlocks);
  }

  // Sort blocks by render priority
  private sortByRenderPriority(blocks: TransparentBlock[]): TransparentBlock[] {
    return blocks.sort((a, b) => {
      // Primary sort: render priority
      if (a.renderPriority !== b.renderPriority) {
        return b.renderPriority - a.renderPriority;
      }

      // Secondary sort: distance (back to front for transparency)
      return b.distance - a.distance;
    });
  }

  // Limit to maximum transparent blocks
  private limitMaximumCount(blocks: TransparentBlock[]): TransparentBlock[] {
    if (blocks.length <= this.config.maxTransparentBlocks) {
      return blocks;
    }

    return blocks.slice(0, this.config.maxTransparentBlocks);
  }

  // Update frustum for culling calculations
  private updateFrustum(): void {
    if (!this.camera) return;

    this.cameraMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse,
    );
    this.frustum.setFromProjectionMatrix(this.cameraMatrix);
  }

  // Get transparency optimization statistics
  getOptimizationStats(): {
    totalTransparentBlocks: number;
    visibleBlocks: number;
    culledBlocks: number;
    cullingEfficiency: number;
    averageRenderTime: number;
    performanceMode: string;
    recommendations: string[];
  } {
    const cullingEfficiency =
      this.performanceMetrics.culledBlocks /
      Math.max(this.performanceMetrics.transparentBlocksProcessed, 1);

    const recommendations: string[] = [];

    if (this.performanceMetrics.renderTime > 16) {
      recommendations.push("Consider reducing transparency quality");
      recommendations.push("Enable more aggressive culling");
    }

    if (cullingEfficiency < 0.3) {
      recommendations.push("Increase culling distance for better performance");
    }

    if (this.performanceMetrics.transparentBlocksProcessed > 300) {
      recommendations.push(
        "Too many transparent blocks - consider using opaque alternatives",
      );
    }

    return {
      totalTransparentBlocks:
        this.performanceMetrics.transparentBlocksProcessed,
      visibleBlocks:
        this.performanceMetrics.transparentBlocksProcessed -
        this.performanceMetrics.culledBlocks,
      culledBlocks: this.performanceMetrics.culledBlocks,
      cullingEfficiency,
      averageRenderTime: this.performanceMetrics.renderTime,
      performanceMode: this.config.performanceMode,
      recommendations,
    };
  }

  // Dynamic performance adjustment
  adjustPerformanceMode(targetFPS: number, currentFPS: number): void {
    if (currentFPS < targetFPS * 0.8) {
      // Performance is poor, reduce quality
      if (this.config.performanceMode === "ultra") {
        this.config.performanceMode = "high";
      } else if (this.config.performanceMode === "high") {
        this.config.performanceMode = "balanced";
      } else if (this.config.performanceMode === "balanced") {
        this.config.performanceMode = "low";
      }

      this.updatePerformanceSettings();
      console.log(
        `🔧 Transparency optimizer: Reduced to ${this.config.performanceMode} mode`,
      );
    } else if (currentFPS > targetFPS * 1.1) {
      // Performance is good, can increase quality
      if (this.config.performanceMode === "low") {
        this.config.performanceMode = "balanced";
      } else if (this.config.performanceMode === "balanced") {
        this.config.performanceMode = "high";
      } else if (this.config.performanceMode === "high") {
        this.config.performanceMode = "ultra";
      }

      this.updatePerformanceSettings();
      console.log(
        `🚀 Transparency optimizer: Increased to ${this.config.performanceMode} mode`,
      );
    }
  }

  // Batch process transparent blocks for GPU efficiency
  createRenderBatches(
    transparentBlocks: TransparentBlock[],
  ): TransparentBlock[][] {
    const batches: TransparentBlock[][] = [];
    const batchSize = this.config.batchSize;

    for (let i = 0; i < transparentBlocks.length; i += batchSize) {
      batches.push(transparentBlocks.slice(i, i + batchSize));
    }

    return batches;
  }

  // Update configuration at runtime
  updateConfig(newConfig: Partial<TransparencyConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.updatePerformanceSettings();
  }

  // Export performance report
  exportPerformanceReport(): string {
    const stats = this.getOptimizationStats();

    return `
=== TRANSPARENCY OPTIMIZER REPORT ===
Performance Mode: ${stats.performanceMode}
Total Transparent Blocks: ${stats.totalTransparentBlocks}
Visible After Culling: ${stats.visibleBlocks}
Culled Blocks: ${stats.culledBlocks}
Culling Efficiency: ${(stats.cullingEfficiency * 100).toFixed(1)}%
Average Render Time: ${stats.averageRenderTime.toFixed(2)}ms
Frame Rate Impact: ${stats.averageRenderTime < 16 ? "Low" : "High"}

Recommendations:
${stats.recommendations.map((rec) => `• ${rec}`).join("\n")}
=====================================
    `;
  }
}

// Singleton instance for global use
export const transparencyOptimizer = new TransparencyOptimizer();

// Utility functions for easy integration
export const TransparencyUtils = {
  // Quick performance check
  isTransparencyPerformant: (blockCount: number): boolean => {
    return blockCount < 200; // Conservative threshold
  },

  // Get recommended settings based on device capabilities
  getRecommendedConfig: (): Partial<TransparencyConfig> => {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("webgl2");

    if (!gl) {
      return { performanceMode: "low", maxTransparentBlocks: 50 };
    }

    const maxTextureUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
    const maxVertexAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);

    if (maxTextureUnits >= 32 && maxVertexAttribs >= 16) {
      return { performanceMode: "ultra", maxTransparentBlocks: 500 };
    } else if (maxTextureUnits >= 16 && maxVertexAttribs >= 8) {
      return { performanceMode: "high", maxTransparentBlocks: 300 };
    } else {
      return { performanceMode: "balanced", maxTransparentBlocks: 200 };
    }
  },

  // Auto-configure based on scene complexity
  autoConfigureForScene: (
    totalBlocks: number,
    transparentBlocks: number,
  ): Partial<TransparencyConfig> => {
    const transparentRatio = transparentBlocks / totalBlocks;

    if (transparentRatio > 0.3 || totalBlocks > 2000) {
      return {
        performanceMode: "low",
        maxTransparentBlocks: 100,
        enableOcclusionCulling: true,
      };
    } else if (transparentRatio > 0.15 || totalBlocks > 1000) {
      return {
        performanceMode: "balanced",
        maxTransparentBlocks: 200,
      };
    } else {
      return {
        performanceMode: "high",
        maxTransparentBlocks: 300,
      };
    }
  },
};

export default TransparencyOptimizer;
