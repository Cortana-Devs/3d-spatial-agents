/**
 * Animation Memory Manager Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AnimationMemoryManager, getGlobalMemoryManager, disposeGlobalMemoryManager } from '../animationMemoryManager';
import { AnimationClip, KeyframeTrack } from 'three';

// Mock GLTF object
const mockGLTF = {
  scene: {
    traverse: vi.fn()
  },
  animations: []
};

// Mock AnimationClip
const createMockClip = (name: string): AnimationClip => {
  // Create larger arrays to ensure non-zero size
  const times = new Float32Array(100); // 100 * 4 bytes = 400 bytes
  const values = new Float32Array(300); // 300 * 4 bytes = 1200 bytes
  for (let i = 0; i < times.length; i++) {
    times[i] = i / 30; // 30 FPS
  }
  for (let i = 0; i < values.length; i++) {
    values[i] = Math.sin(i * 0.1);
  }
  
  const track = new KeyframeTrack(`${name}.position`, times, values);
  const clip = new AnimationClip(name, times[times.length - 1], [track]);
  return clip;
};

describe('AnimationMemoryManager', () => {
  let memoryManager: AnimationMemoryManager;

  beforeEach(() => {
    memoryManager = new AnimationMemoryManager({}, { enableLogging: false });
  });

  afterEach(() => {
    memoryManager.dispose();
  });

  it('should cache and retrieve avatars', () => {
    const path = '/models/test.glb';
    memoryManager.cacheAvatar(path, mockGLTF as any);
    
    const cached = memoryManager.getCachedAvatar(path);
    expect(cached).toBe(mockGLTF);
  });

  it('should cache and retrieve animation clips', () => {
    const clipName = 'test_animation';
    const clip = createMockClip(clipName);
    
    memoryManager.cacheClip(clipName, clip);
    
    const cached = memoryManager.getCachedClip(clipName);
    expect(cached).toBe(clip);
  });

  it('should return null for non-existent assets', () => {
    const avatar = memoryManager.getCachedAvatar('/nonexistent.glb');
    const clip = memoryManager.getCachedClip('nonexistent_clip');
    
    expect(avatar).toBeNull();
    expect(clip).toBeNull();
  });

  it('should track memory statistics', () => {
    const clip = createMockClip('test');
    memoryManager.cacheClip('test', clip);
    
    const stats = memoryManager.getMemoryStats();
    
    expect(stats.totalAssets).toBe(1);
    expect(stats.clipCount).toBe(1);
    expect(stats.avatarCount).toBe(0);
    expect(stats.totalSize).toBeGreaterThan(0);
  });

  it('should manage references correctly', () => {
    const clipName = 'test_clip';
    const clip = createMockClip(clipName);
    
    memoryManager.cacheClip(clipName, clip);
    memoryManager.addReference(clipName);
    memoryManager.addReference(clipName);
    
    // References should be tracked (initial 1 + 2 added = 3)
    const stats = memoryManager.getMemoryStats();
    expect(stats.totalAssets).toBe(1);
    
    memoryManager.removeReference(clipName);
    // Should still have the asset (2 references remaining)
    const statsAfter = memoryManager.getMemoryStats();
    expect(statsAfter.totalAssets).toBe(1);
  });

  it('should detect memory pressure', () => {
    // Test the memory pressure calculation directly by mocking the stats
    const smallManager = new AnimationMemoryManager({
      maxCacheSize: 100,
      memoryPressureThreshold: 0.8 // 80% threshold
    }, { enableLogging: false });
    
    // Mock the getMemoryStats method to return high memory usage
    const originalGetMemoryStats = smallManager.getMemoryStats.bind(smallManager);
    smallManager.getMemoryStats = vi.fn().mockReturnValue({
      totalAssets: 1,
      totalSize: 90, // 90% of 100 byte limit
      avatarCount: 0,
      clipCount: 1,
      cacheHitRate: 0,
      memoryPressure: 0.9 // 90% pressure
    });
    
    const isHighPressure = smallManager.isMemoryPressureHigh();
    expect(isHighPressure).toBe(true);
    
    // Restore original method
    smallManager.getMemoryStats = originalGetMemoryStats;
    smallManager.dispose();
  });

  it('should perform cleanup', () => {
    const clip = createMockClip('test');
    memoryManager.cacheClip('test', clip);
    
    // Force cleanup
    memoryManager.performCleanup(true);
    
    // Asset should be removed
    const cached = memoryManager.getCachedClip('test');
    expect(cached).toBeNull();
  });

  it('should clear all cache', () => {
    memoryManager.cacheAvatar('/test.glb', mockGLTF as any);
    memoryManager.cacheClip('test', createMockClip('test'));
    
    memoryManager.clearCache();
    
    const stats = memoryManager.getMemoryStats();
    expect(stats.totalAssets).toBe(0);
    expect(stats.avatarCount).toBe(0);
    expect(stats.clipCount).toBe(0);
  });

  it('should generate cache report', () => {
    const clip = createMockClip('test');
    memoryManager.cacheClip('test', clip);
    
    const report = memoryManager.getCacheReport();
    
    expect(report).toHaveProperty('stats');
    expect(report).toHaveProperty('config');
    expect(report.stats.totalAssets).toBe(1);
  });
});

describe('Global Memory Manager', () => {
  afterEach(() => {
    disposeGlobalMemoryManager();
  });

  it('should create and return global instance', () => {
    const manager1 = getGlobalMemoryManager();
    const manager2 = getGlobalMemoryManager();
    
    expect(manager1).toBe(manager2); // Should be the same instance
  });

  it('should dispose global instance', () => {
    const manager = getGlobalMemoryManager();
    disposeGlobalMemoryManager();
    
    // Getting a new instance should create a new one
    const newManager = getGlobalMemoryManager();
    expect(newManager).not.toBe(manager);
  });
});