/**
 * Performance Monitor Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PerformanceMonitor, LODCalculator, QUALITY_PRESETS } from '../performanceMonitor';
import { Vector3 } from 'three';

describe('PerformanceMonitor', () => {
  let performanceMonitor: PerformanceMonitor;

  beforeEach(() => {
    performanceMonitor = new PerformanceMonitor('high', {}, { enableLogging: false });
  });

  it('should initialize with correct default quality', () => {
    const quality = performanceMonitor.getCurrentQuality();
    expect(quality.name).toBe('high');
    expect(quality.maxAnimatedSimulants).toBe(10);
  });

  it('should update performance metrics', () => {
    performanceMonitor.update(0.016); // 60 FPS
    const metrics = performanceMonitor.getMetrics();
    
    expect(metrics.frameRate).toBeGreaterThan(0);
    expect(metrics.lastUpdateTime).toBeGreaterThan(0);
  });

  it('should change quality level', () => {
    performanceMonitor.setQuality('low');
    const quality = performanceMonitor.getCurrentQuality();
    
    expect(quality.name).toBe('low');
    expect(quality.maxAnimatedSimulants).toBe(3);
  });

  it('should generate performance report', () => {
    performanceMonitor.update(0.016);
    const report = performanceMonitor.getPerformanceReport();
    
    expect(report).toHaveProperty('quality');
    expect(report).toHaveProperty('averageFPS');
    expect(report).toHaveProperty('memoryUsageMB');
    expect(report).toHaveProperty('recommendations');
    expect(Array.isArray(report.recommendations)).toBe(true);
  });

  it('should reset performance counters', () => {
    performanceMonitor.update(0.016);
    performanceMonitor.reset();
    
    const metrics = performanceMonitor.getMetrics();
    expect(metrics.droppedFrames).toBe(0);
  });
});

describe('LODCalculator', () => {
  let lodCalculator: LODCalculator;

  beforeEach(() => {
    lodCalculator = new LODCalculator(QUALITY_PRESETS.high);
    lodCalculator.updateCameraPosition(new Vector3(0, 0, 0));
  });

  it('should calculate correct LOD levels based on distance', () => {
    // High quality preset: { high: 20, medium: 40, low: 80, cull: 120 }
    // Logic: if distance > cull return 'culled', if distance > low return 'low', if distance > medium return 'medium', else 'high'
    
    // Close position - should be high LOD (distance 5 <= 20)
    const closePosition = new Vector3(5, 0, 0);
    expect(lodCalculator.calculateLOD(closePosition)).toBe('high');

    // Still high LOD at distance 30 (30 <= 40)
    const mediumPosition = new Vector3(30, 0, 0);
    expect(lodCalculator.calculateLOD(mediumPosition)).toBe('high');

    // Medium LOD at distance 50 (40 < 50 <= 80)
    const mediumPosition2 = new Vector3(50, 0, 0);
    expect(lodCalculator.calculateLOD(mediumPosition2)).toBe('medium');

    // Low LOD at distance 90 (80 < 90 <= 120)
    const farPosition = new Vector3(90, 0, 0);
    expect(lodCalculator.calculateLOD(farPosition)).toBe('low');

    // Very far distance - should be culled (distance 150 > 120)
    const veryFarPosition = new Vector3(150, 0, 0);
    expect(lodCalculator.calculateLOD(veryFarPosition)).toBe('culled');
  });

  it('should determine culling correctly', () => {
    const closePosition = new Vector3(10, 0, 0);
    const farPosition = new Vector3(150, 0, 0);

    expect(lodCalculator.shouldCull(closePosition)).toBe(false);
    expect(lodCalculator.shouldCull(farPosition)).toBe(true);
  });

  it('should calculate update frequency based on distance', () => {
    const closePosition = new Vector3(5, 0, 0);
    const farPosition = new Vector3(60, 0, 0);
    const culledPosition = new Vector3(150, 0, 0);

    const closeFreq = lodCalculator.getUpdateFrequency(closePosition);
    const farFreq = lodCalculator.getUpdateFrequency(farPosition);
    const culledFreq = lodCalculator.getUpdateFrequency(culledPosition);

    expect(closeFreq).toBeGreaterThan(farFreq);
    expect(farFreq).toBeGreaterThan(culledFreq);
    expect(culledFreq).toBe(0);
  });

  it('should calculate render scale based on LOD', () => {
    const closePosition = new Vector3(5, 0, 0);
    const farPosition = new Vector3(60, 0, 0);
    const culledPosition = new Vector3(150, 0, 0);

    const closeScale = lodCalculator.getRenderScale(closePosition);
    const farScale = lodCalculator.getRenderScale(farPosition);
    const culledScale = lodCalculator.getRenderScale(culledPosition);

    expect(closeScale).toBe(1.0);
    expect(farScale).toBeLessThan(closeScale);
    expect(culledScale).toBe(0);
  });

  it('should update quality settings', () => {
    lodCalculator.updateQuality(QUALITY_PRESETS.low);
    
    // With low quality, distances should be shorter
    // Low quality: { high: 10, medium: 20, low: 40, cull: 80 }
    const position = new Vector3(25, 0, 0);
    const lod = lodCalculator.calculateLOD(position);
    
    // This position (25) should be medium LOD with low quality settings (20 < 25 <= 40)
    expect(lod).toBe('medium');
  });
});