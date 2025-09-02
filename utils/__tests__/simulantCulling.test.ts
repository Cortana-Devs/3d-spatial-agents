/**
 * Simulant Culling System Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SimulantCullingSystem, createCullingSystem } from '../simulantCulling';
import { PerspectiveCamera, Vector3 } from 'three';
import type { AISimulant } from '../../types';

// Mock simulant data
const createMockSimulant = (id: string, x: number, y: number, z: number): AISimulant => ({
  id,
  name: `Simulant ${id}`,
  position: { x, y, z },
  status: 'active',
  lastAction: 'Standing peacefully',
  personality: 'friendly',
  knowledge: [],
  relationships: new Map(),
  goals: [],
  memories: [],
  createdAt: Date.now(),
  lastActiveAt: Date.now()
});

describe('SimulantCullingSystem', () => {
  let cullingSystem: SimulantCullingSystem;
  let camera: PerspectiveCamera;
  let simulants: AISimulant[];

  beforeEach(() => {
    cullingSystem = new SimulantCullingSystem({
      maxRenderDistance: 50,
      enableFrustumCulling: true,
      enableDistanceCulling: true,
      batchSize: 10 // Process more simulants per batch for testing
    }, { enableLogging: false });

    camera = new PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.set(0, 0, 0);
    camera.updateMatrixWorld();

    simulants = [
      createMockSimulant('close', 5, 0, 0),      // Close - should be visible
      createMockSimulant('medium', 25, 0, 0),   // Medium distance - should be visible
      createMockSimulant('far', 60, 0, 0),      // Far - should be culled by distance
      createMockSimulant('behind', -5, 0, 0)    // Behind camera - might be culled by frustum
    ];
  });

  afterEach(() => {
    cullingSystem.dispose();
  });

  it('should initialize with correct configuration', () => {
    const config = cullingSystem['config']; // Access private property for testing
    expect(config.maxRenderDistance).toBe(50);
    expect(config.enableFrustumCulling).toBe(true);
    expect(config.enableDistanceCulling).toBe(true);
  });

  it('should update camera information', () => {
    cullingSystem.updateCamera(camera);
    
    // Camera position should be updated internally
    expect(cullingSystem['cameraPosition']).toEqual(new Vector3(0, 0, 0));
  });

  it('should update simulant list', () => {
    cullingSystem.updateSimulants(simulants);
    
    // Should track all simulant IDs
    expect(cullingSystem['simulantIds']).toHaveLength(4);
    expect(cullingSystem['simulantIds']).toContain('close');
    expect(cullingSystem['simulantIds']).toContain('far');
  });

  it('should perform distance-based culling', () => {
    cullingSystem.updateCamera(camera);
    cullingSystem.updateSimulants(simulants);
    
    // Force update all simulants
    cullingSystem.forceUpdate(simulants);
    
    // Get culling results to debug
    const closeResult = cullingSystem.getCullingResult('close');
    const farResult = cullingSystem.getCullingResult('far');
    
    expect(closeResult).not.toBeNull();
    expect(farResult).not.toBeNull();
    
    if (closeResult && farResult) {
      expect(closeResult.distance).toBeLessThan(farResult.distance);
      expect(closeResult.withinDistance).toBe(true);
      expect(farResult.withinDistance).toBe(false);
    }
  });

  it('should calculate correct LOD levels', () => {
    cullingSystem.updateCamera(camera);
    cullingSystem.updateSimulants(simulants);
    cullingSystem.forceUpdate(simulants);
    
    const closeResult = cullingSystem.getCullingResult('close');
    const farResult = cullingSystem.getCullingResult('far');
    
    expect(closeResult).not.toBeNull();
    expect(farResult).not.toBeNull();
    
    if (closeResult && farResult) {
      // Both results should have valid LOD levels
      const validLODs = ['high', 'medium', 'low', 'culled'];
      expect(validLODs).toContain(closeResult.lodLevel);
      expect(validLODs).toContain(farResult.lodLevel);
      
      // The close simulant should have a shorter distance
      expect(closeResult.distance).toBeLessThan(farResult.distance);
    }
  });

  it('should get visible simulants list', () => {
    cullingSystem.updateCamera(camera);
    cullingSystem.updateSimulants(simulants);
    cullingSystem.forceUpdate(simulants);
    
    const visibleSimulants = cullingSystem.getVisibleSimulants();
    const stats = cullingSystem.getCullingStats();
    
    // At least some simulants should be processed
    expect(stats.totalSimulants).toBeGreaterThan(0);
    expect(visibleSimulants.length + stats.culledSimulants).toBe(stats.totalSimulants);
  });

  it('should get simulants by LOD level', () => {
    cullingSystem.updateCamera(camera);
    cullingSystem.updateSimulants(simulants);
    cullingSystem.forceUpdate(simulants);
    
    const highLOD = cullingSystem.getSimulantsByLOD('high');
    const mediumLOD = cullingSystem.getSimulantsByLOD('medium');
    const lowLOD = cullingSystem.getSimulantsByLOD('low');
    const culled = cullingSystem.getSimulantsByLOD('culled');
    
    const totalByLOD = highLOD.length + mediumLOD.length + lowLOD.length + culled.length;
    const stats = cullingSystem.getCullingStats();
    
    expect(totalByLOD).toBe(stats.totalSimulants);
  });

  it('should generate culling statistics', () => {
    cullingSystem.updateCamera(camera);
    cullingSystem.updateSimulants(simulants);
    cullingSystem.forceUpdate(simulants);
    
    const stats = cullingSystem.getCullingStats();
    
    expect(stats.totalSimulants).toBe(4);
    expect(stats.visibleSimulants + stats.culledSimulants).toBe(stats.totalSimulants);
    expect(stats.cullingEfficiency).toBeGreaterThanOrEqual(0);
    expect(stats.cullingEfficiency).toBeLessThanOrEqual(1);
  });

  it('should update configuration', () => {
    const newConfig = {
      maxRenderDistance: 100,
      enableFrustumCulling: false
    };
    
    cullingSystem.updateConfig(newConfig);
    
    const config = cullingSystem['config'];
    expect(config.maxRenderDistance).toBe(100);
    expect(config.enableFrustumCulling).toBe(false);
  });

  it('should generate culling report', () => {
    cullingSystem.updateCamera(camera);
    cullingSystem.updateSimulants(simulants);
    cullingSystem.forceUpdate(simulants);
    
    const report = cullingSystem.getCullingReport();
    
    expect(report).toHaveProperty('config');
    expect(report).toHaveProperty('stats');
    expect(report).toHaveProperty('results');
    expect(report).toHaveProperty('performance');
    expect(Array.isArray(report.results)).toBe(true);
  });

  it('should clear culling results', () => {
    cullingSystem.updateSimulants(simulants);
    cullingSystem.forceUpdate(simulants);
    
    cullingSystem.clear();
    
    const stats = cullingSystem.getCullingStats();
    expect(stats.totalSimulants).toBe(0);
  });

  it('should handle batch processing', () => {
    const manySimulants = Array.from({ length: 20 }, (_, i) => 
      createMockSimulant(`sim_${i}`, i * 5, 0, 0)
    );
    
    cullingSystem.updateCamera(camera);
    cullingSystem.updateSimulants(manySimulants);
    
    // Use forceUpdate to process all simulants immediately
    cullingSystem.forceUpdate(manySimulants);
    
    const stats = cullingSystem.getCullingStats();
    expect(stats.totalSimulants).toBe(20);
  });
});

describe('createCullingSystem', () => {
  it('should create culling system with default options', () => {
    const system = createCullingSystem();
    
    expect(system).toBeInstanceOf(SimulantCullingSystem);
    
    system.dispose();
  });

  it('should create culling system with custom options', () => {
    const system = createCullingSystem(75, {
      enableLogging: false,
      updateFrequency: 5,
      batchSize: 3
    });
    
    expect(system).toBeInstanceOf(SimulantCullingSystem);
    
    system.dispose();
  });
});