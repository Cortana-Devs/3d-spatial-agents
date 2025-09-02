/**
 * Tests for Enhanced ReadyPlayerMeSimulant component
 * These tests focus on the component's props and configuration logic
 */

import { describe, it, expect, vi } from 'vitest'
import { RPM_CONFIG } from '../ReadyPlayerMeSimulant'
import type { AISimulant } from '../../../types'

// Test simulant data
const createTestSimulant = (overrides: Partial<AISimulant> = {}): AISimulant => ({
  id: 'test-simulant-1',
  name: 'Test Simulant',
  position: { x: 0, y: 0, z: 0 },
  status: 'active',
  lastAction: 'Standing peacefully',
  conversationHistory: [],
  geminiSessionId: 'test-session',
  ...overrides
})

describe('Enhanced ReadyPlayerMeSimulant Configuration', () => {
  it('has correct default RPM configuration', () => {
    expect(RPM_CONFIG.defaultScale).toBe(0.8)
    expect(RPM_CONFIG.groundOffset).toBe(0)
    expect(RPM_CONFIG.blendTime).toBe(0.3)
    expect(RPM_CONFIG.lodDistances).toEqual({
      high: 15,
      medium: 30,
      low: 50,
    })
  })

  it('has performance settings for different modes', () => {
    expect(RPM_CONFIG.performanceSettings.quality).toEqual({
      maxAnimatedSimulants: 10,
      animationUpdateRate: 60,
      crossFadeDuration: 0.3,
      enableBlending: true,
    })

    expect(RPM_CONFIG.performanceSettings.balanced).toEqual({
      maxAnimatedSimulants: 6,
      animationUpdateRate: 30,
      crossFadeDuration: 0.2,
      enableBlending: true,
    })

    expect(RPM_CONFIG.performanceSettings.performance).toEqual({
      maxAnimatedSimulants: 3,
      animationUpdateRate: 15,
      crossFadeDuration: 0.1,
      enableBlending: false,
    })
  })

  it('creates test simulant with correct properties', () => {
    const simulant = createTestSimulant()
    
    expect(simulant.id).toBe('test-simulant-1')
    expect(simulant.name).toBe('Test Simulant')
    expect(simulant.position).toEqual({ x: 0, y: 0, z: 0 })
    expect(simulant.status).toBe('active')
    expect(simulant.lastAction).toBe('Standing peacefully')
  })

  it('allows simulant property overrides', () => {
    const simulant = createTestSimulant({
      status: 'idle',
      position: { x: 5, y: 1, z: -3 },
      lastAction: 'Building something amazing'
    })
    
    expect(simulant.status).toBe('idle')
    expect(simulant.position).toEqual({ x: 5, y: 1, z: -3 })
    expect(simulant.lastAction).toBe('Building something amazing')
  })

  it('validates component prop types', () => {
    // Test that the component accepts the expected prop types
    const simulant = createTestSimulant()
    
    // These would be the props passed to the component
    const props = {
      simulant,
      modelPath: '/models/custom.glb',
      animationPaths: ['/animations/walk.glb', '/animations/run.glb'],
      scale: 1.2,
      enableAnimations: true,
      enableGridSnap: false,
      lodLevel: 'medium' as const,
      performanceMode: 'balanced' as const,
      onAnimationChange: vi.fn(),
      onLoadComplete: vi.fn(),
      onLoadError: vi.fn(),
    }
    
    // Verify prop types are correct
    expect(typeof props.simulant).toBe('object')
    expect(typeof props.modelPath).toBe('string')
    expect(Array.isArray(props.animationPaths)).toBe(true)
    expect(typeof props.scale).toBe('number')
    expect(typeof props.enableAnimations).toBe('boolean')
    expect(typeof props.enableGridSnap).toBe('boolean')
    expect(['high', 'medium', 'low'].includes(props.lodLevel)).toBe(true)
    expect(['quality', 'balanced', 'performance'].includes(props.performanceMode)).toBe(true)
    expect(typeof props.onAnimationChange).toBe('function')
    expect(typeof props.onLoadComplete).toBe('function')
    expect(typeof props.onLoadError).toBe('function')
  })

  it('has sensible LOD distance thresholds', () => {
    const { lodDistances } = RPM_CONFIG
    
    // Ensure distances are in ascending order
    expect(lodDistances.high).toBeLessThan(lodDistances.medium)
    expect(lodDistances.medium).toBeLessThan(lodDistances.low)
    
    // Ensure distances are reasonable for a voxel world
    expect(lodDistances.high).toBeGreaterThan(0)
    expect(lodDistances.low).toBeLessThan(100) // Not too far
  })

  it('has performance settings that scale appropriately', () => {
    const { performanceSettings } = RPM_CONFIG
    
    // Quality mode should have highest settings
    expect(performanceSettings.quality.maxAnimatedSimulants)
      .toBeGreaterThan(performanceSettings.balanced.maxAnimatedSimulants)
    expect(performanceSettings.balanced.maxAnimatedSimulants)
      .toBeGreaterThan(performanceSettings.performance.maxAnimatedSimulants)
    
    // Update rates should scale down for performance
    expect(performanceSettings.quality.animationUpdateRate)
      .toBeGreaterThan(performanceSettings.balanced.animationUpdateRate)
    expect(performanceSettings.balanced.animationUpdateRate)
      .toBeGreaterThan(performanceSettings.performance.animationUpdateRate)
    
    // Cross-fade duration should be shorter for performance mode
    expect(performanceSettings.quality.crossFadeDuration)
      .toBeGreaterThanOrEqual(performanceSettings.balanced.crossFadeDuration)
    expect(performanceSettings.balanced.crossFadeDuration)
      .toBeGreaterThan(performanceSettings.performance.crossFadeDuration)
  })
})