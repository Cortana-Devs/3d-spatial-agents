import { devWarn, devLog } from "@/utils/devLogger";
import {
  PERFORMANCE_TARGETS,
  SkyboxPerformanceMetrics,
} from "../../types/skybox";

export interface PerformanceData {
  timestamp: number;
  frameTime: number;
  memoryUsage: number;
  textureCount: number;
  loadTime?: number;
  transitionTime?: number;
  error?: string;
}

export interface PerformanceThresholds {
  maxFrameTime: number;
  maxMemoryUsage: number;
  maxLoadTime: number;
  maxTransitionTime: number;
}

export class SkyboxPerformanceMonitor {
  private metrics: SkyboxPerformanceMetrics;
  private dataPoints: PerformanceData[] = [];
  private maxDataPoints = 1000; // Keep last 1000 measurements
  private isMonitoring = false;
  private monitoringInterval: number | null = null;
  private frameTimeHistory: number[] = [];
  private loadTimeHistory: number[] = [];
  private transitionTimeHistory: number[] = [];

  private thresholds: PerformanceThresholds = {
    maxFrameTime: 1000 / 60, // 16.67ms for 60fps
    maxMemoryUsage: PERFORMANCE_TARGETS.textureLoading.maxMemoryUsage,
    maxLoadTime: PERFORMANCE_TARGETS.textureLoading.maxLoadTime,
    maxTransitionTime: PERFORMANCE_TARGETS.transitions.duration,
  };

  constructor(customThresholds?: Partial<PerformanceThresholds>) {
    this.metrics = {
      memoryUsage: 0,
      loadTime: 0,
      frameImpact: 0,
      textureResolution: "0x0",
      compressionRatio: 1.0,
      cacheHitRate: 0,
    };

    if (customThresholds) {
      this.thresholds = { ...this.thresholds, ...customThresholds };
    }
  }

  /**
   * Start monitoring performance metrics
   */
  startMonitoring(intervalMs: number = 100): void {
    if (this.isMonitoring) return;

    // Check if we're in browser environment
    if (typeof window === "undefined") {
      devWarn("Performance monitoring not available in SSR environment");
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = window.setInterval(() => {
      this.collectMetrics();
    }, intervalMs);

    // devLog("Skybox performance monitoring started");
  }

  /**
   * Stop monitoring performance metrics
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.monitoringInterval && typeof window !== "undefined") {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    devLog("Skybox performance monitoring stopped");
  }

  /**
   * Collect current performance metrics
   */
  private collectMetrics(): void {
    const now = performance.now();

    // Measure current frame time impact
    const frameTime = this.measureFrameTime();

    // Get memory usage (estimated)
    const memoryUsage = this.estimateMemoryUsage();

    const dataPoint: PerformanceData = {
      timestamp: now,
      frameTime,
      memoryUsage,
      textureCount: this.getActiveTextureCount(),
    };

    this.dataPoints.push(dataPoint);

    // Maintain data point limit
    if (this.dataPoints.length > this.maxDataPoints) {
      this.dataPoints.shift();
    }

    // Update rolling averages
    this.updateMetrics(dataPoint);

    // Check for performance issues
    this.checkThresholds(dataPoint);
  }

  /**
   * Measure frame time impact
   */
  private measureFrameTime(): number {
    // This is a simplified implementation
    // In a real scenario, you'd measure the actual frame time before and after skybox rendering
    if (typeof performance === "undefined") return 16.67; // Default 60fps frame time
    return (performance.now() % 1000) / 60; // Placeholder calculation
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): number {
    // This would integrate with the texture loader's memory tracking
    // For now, return a placeholder
    return this.metrics.memoryUsage;
  }

  /**
   * Get count of active textures
   */
  private getActiveTextureCount(): number {
    // This would integrate with the texture cache
    // For now, return a placeholder
    return 0;
  }

  /**
   * Update performance metrics with new data point
   */
  private updateMetrics(dataPoint: PerformanceData): void {
    // Update frame time history
    this.frameTimeHistory.push(dataPoint.frameTime);
    if (this.frameTimeHistory.length > 60) {
      // Keep last 60 samples (1 second at 60fps)
      this.frameTimeHistory.shift();
    }

    // Calculate frame impact (negative number indicating FPS loss)
    const averageFrameTime =
      this.frameTimeHistory.reduce((sum, time) => sum + time, 0) /
      this.frameTimeHistory.length;
    const targetFrameTime = 1000 / 60; // 16.67ms for 60fps
    this.metrics.frameImpact = Math.min(0, targetFrameTime - averageFrameTime);

    // Update memory usage
    this.metrics.memoryUsage = dataPoint.memoryUsage;

    // Update cache hit rate (would be calculated from texture loader stats)
    // For now, use a placeholder calculation
    this.metrics.cacheHitRate = Math.min(
      1,
      this.dataPoints.length > 10 ? 0.8 : 0.5,
    );
  }

  /**
   * Check if current metrics exceed thresholds
   */
  private checkThresholds(dataPoint: PerformanceData): void {
    const warnings: string[] = [];

    if (dataPoint.frameTime > this.thresholds.maxFrameTime) {
      warnings.push(
        `Frame time exceeded threshold: ${dataPoint.frameTime.toFixed(2)}ms > ${this.thresholds.maxFrameTime.toFixed(2)}ms`,
      );
    }

    if (dataPoint.memoryUsage > this.thresholds.maxMemoryUsage) {
      warnings.push(
        `Memory usage exceeded threshold: ${dataPoint.memoryUsage.toFixed(1)}MB > ${this.thresholds.maxMemoryUsage}MB`,
      );
    }

    if (
      dataPoint.loadTime &&
      dataPoint.loadTime > this.thresholds.maxLoadTime
    ) {
      warnings.push(
        `Load time exceeded threshold: ${dataPoint.loadTime}ms > ${this.thresholds.maxLoadTime}ms`,
      );
    }

    if (
      dataPoint.transitionTime &&
      dataPoint.transitionTime > this.thresholds.maxTransitionTime
    ) {
      warnings.push(
        `Transition time exceeded threshold: ${dataPoint.transitionTime}ms > ${this.thresholds.maxTransitionTime}ms`,
      );
    }

    if (warnings.length > 0) {
      devWarn("Skybox performance warnings:", warnings);
      this.recordWarnings(warnings);
    }
  }

  /**
   * Record performance warnings for later analysis
   */
  private recordWarnings(warnings: string[]): void {
    // In a production environment, you might want to send these to an analytics service
    warnings.forEach((warning) => {
      this.dataPoints[this.dataPoints.length - 1].error = warning;
    });
  }

  /**
   * Record texture load time
   */
  recordLoadTime(
    presetId: string,
    loadTime: number,
    textureResolution?: string,
  ): void {
    this.loadTimeHistory.push(loadTime);
    if (this.loadTimeHistory.length > 100) {
      this.loadTimeHistory.shift();
    }

    // Update average load time
    this.metrics.loadTime =
      this.loadTimeHistory.reduce((sum, time) => sum + time, 0) /
      this.loadTimeHistory.length;

    // Update texture resolution if provided
    if (textureResolution) {
      this.metrics.textureResolution = textureResolution;
    }

    // Add data point for load event (only in browser)
    if (typeof performance !== "undefined") {
      this.dataPoints.push({
        timestamp: performance.now(),
        frameTime: this.measureFrameTime(),
        memoryUsage: this.metrics.memoryUsage,
        textureCount: this.getActiveTextureCount(),
        loadTime,
      });
    }

    devLog(`Skybox load recorded: ${presetId} in ${loadTime}ms`);
  }

  /**
   * Record transition time
   */
  recordTransitionTime(
    fromPreset: string | null,
    toPreset: string,
    transitionTime: number,
  ): void {
    this.transitionTimeHistory.push(transitionTime);
    if (this.transitionTimeHistory.length > 50) {
      this.transitionTimeHistory.shift();
    }

    // Add data point for transition event (only in browser)
    if (typeof performance !== "undefined") {
      this.dataPoints.push({
        timestamp: performance.now(),
        frameTime: this.measureFrameTime(),
        memoryUsage: this.metrics.memoryUsage,
        textureCount: this.getActiveTextureCount(),
        transitionTime,
      });
    }

    devLog(
      `Skybox transition recorded: ${fromPreset || "none"} -> ${toPreset} in ${transitionTime}ms`,
    );
  }

  /**
   * Update memory usage metrics
   */
  updateMemoryUsage(memoryUsageMB: number): void {
    this.metrics.memoryUsage = memoryUsageMB;
  }

  /**
   * Update compression ratio
   */
  updateCompressionRatio(originalSize: number, compressedSize: number): void {
    if (originalSize > 0) {
      this.metrics.compressionRatio = compressedSize / originalSize;
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): SkyboxPerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    averageFrameTime: number;
    averageLoadTime: number;
    averageTransitionTime: number;
    peakMemoryUsage: number;
    warningCount: number;
    dataPointCount: number;
    isHealthy: boolean;
  } {
    const frameTimesOnly = this.dataPoints.map((dp) => dp.frameTime);
    const loadTimesOnly = this.dataPoints
      .filter((dp) => dp.loadTime)
      .map((dp) => dp.loadTime!);
    const transitionTimesOnly = this.dataPoints
      .filter((dp) => dp.transitionTime)
      .map((dp) => dp.transitionTime!);
    const memoryUsages = this.dataPoints.map((dp) => dp.memoryUsage);
    const warningCount = this.dataPoints.filter((dp) => dp.error).length;

    const averageFrameTime =
      frameTimesOnly.length > 0
        ? frameTimesOnly.reduce((sum, time) => sum + time, 0) /
          frameTimesOnly.length
        : 0;

    const averageLoadTime =
      loadTimesOnly.length > 0
        ? loadTimesOnly.reduce((sum, time) => sum + time, 0) /
          loadTimesOnly.length
        : 0;

    const averageTransitionTime =
      transitionTimesOnly.length > 0
        ? transitionTimesOnly.reduce((sum, time) => sum + time, 0) /
          transitionTimesOnly.length
        : 0;

    const peakMemoryUsage =
      memoryUsages.length > 0 ? Math.max(...memoryUsages) : 0;

    const isHealthy =
      averageFrameTime <= this.thresholds.maxFrameTime &&
      peakMemoryUsage <= this.thresholds.maxMemoryUsage &&
      averageLoadTime <= this.thresholds.maxLoadTime &&
      warningCount / Math.max(1, this.dataPoints.length) < 0.1; // Less than 10% warnings

    return {
      averageFrameTime,
      averageLoadTime,
      averageTransitionTime,
      peakMemoryUsage,
      warningCount,
      dataPointCount: this.dataPoints.length,
      isHealthy,
    };
  }

  /**
   * Get performance data for specific time range
   */
  getDataInRange(startTime: number, endTime: number): PerformanceData[] {
    return this.dataPoints.filter(
      (dp) => dp.timestamp >= startTime && dp.timestamp <= endTime,
    );
  }

  /**
   * Export performance data for analysis
   */
  exportData(): {
    metrics: SkyboxPerformanceMetrics;
    dataPoints: PerformanceData[];
    summary: ReturnType<typeof this.getPerformanceSummary>;
    thresholds: PerformanceThresholds;
  } {
    return {
      metrics: this.getMetrics(),
      dataPoints: [...this.dataPoints],
      summary: this.getPerformanceSummary(),
      thresholds: { ...this.thresholds },
    };
  }

  /**
   * Reset all performance data
   */
  reset(): void {
    this.dataPoints = [];
    this.frameTimeHistory = [];
    this.loadTimeHistory = [];
    this.transitionTimeHistory = [];

    this.metrics = {
      memoryUsage: 0,
      loadTime: 0,
      frameImpact: 0,
      textureResolution: "0x0",
      compressionRatio: 1.0,
      cacheHitRate: 0,
    };

    devLog("Skybox performance monitor reset");
  }

  /**
   * Update performance thresholds
   */
  updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    devLog("Skybox performance thresholds updated", this.thresholds);
  }

  /**
   * Cleanup method for component unmount
   */
  destroy(): void {
    this.stopMonitoring();
    this.reset();
  }
}

// Export singleton instance
export const skyboxPerformanceMonitor = new SkyboxPerformanceMonitor();

// Export class for custom instances
export { SkyboxPerformanceMonitor as SkyboxPerformanceMonitorClass };
