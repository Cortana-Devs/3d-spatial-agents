import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Vector3 } from 'three';
import { useWorldStore, positionToKey, keyToPosition } from '../worldStore';
import { BlockType, AISimulant } from '../../types';

// Mock UUID for consistent testing
vi.mock('uuid', () => ({
  v4: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9)
}));

describe('WorldStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useWorldStore.getState().resetStore();
  });

  describe('Spatial Hash Map Operations', () => {
    it('should convert position to key correctly', () => {
      const position = new Vector3(1.7, 2.3, -3.1);
      const key = positionToKey(position);
      expect(key).toBe('2,2,-3'); // Rounded values
    });

    it('should convert key to position correctly', () => {
      const key = '1,2,-3';
      const position = keyToPosition(key);
      expect(position.x).toBe(1);
      expect(position.y).toBe(2);
      expect(position.z).toBe(-3);
    });

    it('should provide O(1) block lookups', () => {
      const store = useWorldStore.getState();
      const position = new Vector3(5, 10, -2);

      // Add a block
      const success = store.addBlock(position, BlockType.STONE, 'human');
      expect(success).toBe(true);

      // O(1) lookup
      const block = store.getBlock(position);
      expect(block).toBeDefined();
      expect(block?.type).toBe(BlockType.STONE);
      expect(block?.position).toEqual({ x: 5, y: 10, z: -2 });
    });
  });

  describe('Block Operations', () => {
    it('should add blocks successfully with collision detection', () => {
      let store = useWorldStore.getState();
      const position = new Vector3(0, 0, 0);

      // First block should succeed
      const success1 = store.addBlock(position, BlockType.STONE, 'human');
      expect(success1).toBe(true);

      // Get fresh state
      store = useWorldStore.getState();
      expect(store.blockCount).toBe(1);

      // Second block at same position should fail (collision detection)
      const success2 = store.addBlock(position, BlockType.WOOD, 'human');
      expect(success2).toBe(false);

      // Get fresh state
      store = useWorldStore.getState();
      expect(store.blockCount).toBe(1); // Count unchanged
    });

    it('should remove blocks successfully', () => {
      let store = useWorldStore.getState();
      const position = new Vector3(1, 1, 1);

      // Add block
      store.addBlock(position, BlockType.LEAF, 'human');
      store = useWorldStore.getState();
      expect(store.blockCount).toBe(1);

      // Remove block
      const success = store.removeBlock(position, 'human');
      expect(success).toBe(true);
      store = useWorldStore.getState();
      expect(store.blockCount).toBe(0);
      expect(store.getBlock(position)).toBeUndefined();
    });

    it('should remove blocks by ID', () => {
      const store = useWorldStore.getState();
      const position = new Vector3(2, 2, 2);

      // Add block
      store.addBlock(position, BlockType.WOOD, 'human');
      const block = store.getBlock(position);
      expect(block).toBeDefined();

      // Remove by ID
      const success = store.removeBlockById(block!.id, 'human');
      expect(success).toBe(true);
      expect(store.blockCount).toBe(0);
    });

    it('should enforce 1000-block limit', () => {
      let store = useWorldStore.getState();

      // Add blocks up to limit
      for (let i = 0; i < 1000; i++) {
        const success = store.addBlock(new Vector3(i, 0, 0), BlockType.STONE, 'human');
        expect(success).toBe(true);
      }

      // Get fresh state
      store = useWorldStore.getState();
      expect(store.blockCount).toBe(1000);

      // 1001st block should fail
      const success = store.addBlock(new Vector3(1000, 0, 0), BlockType.STONE, 'human');
      expect(success).toBe(false);

      // Get fresh state
      store = useWorldStore.getState();
      expect(store.blockCount).toBe(1000);
    });

    it('should provide efficient block counting', () => {
      let store = useWorldStore.getState();

      // Add multiple blocks
      for (let i = 0; i < 10; i++) {
        store.addBlock(new Vector3(i, 0, 0), BlockType.STONE, 'human');
      }

      // Get fresh state and check count
      store = useWorldStore.getState();
      expect(store.blockCount).toBe(10);

      // Remove some blocks
      for (let i = 0; i < 5; i++) {
        store.removeBlock(new Vector3(i, 0, 0), 'human');
      }

      // Get fresh state and check count
      store = useWorldStore.getState();
      expect(store.blockCount).toBe(5);
    });

    it('should check block existence efficiently', () => {
      const store = useWorldStore.getState();
      const position = new Vector3(3, 3, 3);

      expect(store.hasBlock(position)).toBe(false);

      store.addBlock(position, BlockType.LEAF, 'human');
      expect(store.hasBlock(position)).toBe(true);

      store.removeBlock(position, 'human');
      expect(store.hasBlock(position)).toBe(false);
    });
  });

  describe('Undo/Redo System', () => {
    it('should save snapshots before changes', () => {
      const store = useWorldStore.getState();

      // Initial state - no undo available
      expect(store.canUndo()).toBe(false);

      // Add block (should save snapshot)
      store.addBlock(new Vector3(0, 0, 0), BlockType.STONE, 'human');
      expect(store.canUndo()).toBe(true);
    });

    it('should undo block operations', () => {
      let store = useWorldStore.getState();
      const position = new Vector3(1, 1, 1);

      // Add block
      store.addBlock(position, BlockType.STONE, 'human');

      // Get fresh state
      store = useWorldStore.getState();
      expect(store.blockCount).toBe(1);
      expect(store.hasBlock(position)).toBe(true);

      // Undo
      const undoSuccess = store.undo();
      expect(undoSuccess).toBe(true);

      // Get fresh state
      store = useWorldStore.getState();
      expect(store.blockCount).toBe(0);
      expect(store.hasBlock(position)).toBe(false);
    });

    it('should redo block operations', () => {
      let store = useWorldStore.getState();
      const position = new Vector3(2, 2, 2);

      // Add block and undo
      store.addBlock(position, BlockType.LEAF, 'human');
      store.undo();

      // Get fresh state
      store = useWorldStore.getState();
      expect(store.canRedo()).toBe(true);

      // Redo
      const redoSuccess = store.redo();
      expect(redoSuccess).toBe(true);

      // Get fresh state
      store = useWorldStore.getState();
      expect(store.blockCount).toBe(1);
      expect(store.hasBlock(position)).toBe(true);
    });

    it('should maintain circular buffer with max 50 states', () => {
      const store = useWorldStore.getState();

      // Add 60 blocks to exceed buffer limit
      for (let i = 0; i < 60; i++) {
        store.addBlock(new Vector3(i, 0, 0), BlockType.STONE, 'human');
      }

      // History should be limited to 50 states
      const history = useWorldStore.getState().history;
      expect(history.states.length).toBeLessThanOrEqual(50);
    });

    it('should clear redo history when new changes are made', () => {
      const store = useWorldStore.getState();

      // Add two blocks
      store.addBlock(new Vector3(0, 0, 0), BlockType.STONE, 'human');
      store.addBlock(new Vector3(1, 0, 0), BlockType.WOOD, 'human');

      // Undo once
      store.undo();
      expect(store.canRedo()).toBe(true);

      // Add new block (should clear redo history)
      store.addBlock(new Vector3(2, 0, 0), BlockType.LEAF, 'human');
      expect(store.canRedo()).toBe(false);
    });
  });

  describe('Simulant Management', () => {
    it('should add and manage simulants', () => {
      let store = useWorldStore.getState();

      const simulant: AISimulant = {
        id: 'sim-1',
        name: 'TestBot',
        position: { x: 0, y: 0, z: 0 },
        status: 'active',
        lastAction: 'spawned',
        conversationHistory: [],
        geminiSessionId: 'session-1'
      };

      store.addSimulant(simulant);

      // Get fresh state
      store = useWorldStore.getState();
      expect(store.simulants.has('sim-1')).toBe(true);
      expect(store.simulants.get('sim-1')).toEqual(simulant);
    });

    it('should update simulant properties', () => {
      let store = useWorldStore.getState();

      const simulant: AISimulant = {
        id: 'sim-2',
        name: 'TestBot2',
        position: { x: 0, y: 0, z: 0 },
        status: 'active',
        lastAction: 'spawned',
        conversationHistory: [],
        geminiSessionId: 'session-2'
      };

      store.addSimulant(simulant);

      // Update position and status
      store.updateSimulant('sim-2', {
        position: { x: 5, y: 5, z: 5 },
        status: 'idle'
      });

      // Get fresh state
      store = useWorldStore.getState();
      const updated = store.simulants.get('sim-2');
      expect(updated?.position).toEqual({ x: 5, y: 5, z: 5 });
      expect(updated?.status).toBe('idle');
    });

    it('should remove simulants', () => {
      let store = useWorldStore.getState();

      const simulant: AISimulant = {
        id: 'sim-3',
        name: 'TestBot3',
        position: { x: 0, y: 0, z: 0 },
        status: 'active',
        lastAction: 'spawned',
        conversationHistory: [],
        geminiSessionId: 'session-3'
      };

      store.addSimulant(simulant);

      // Get fresh state
      store = useWorldStore.getState();
      expect(store.simulants.has('sim-3')).toBe(true);

      store.removeSimulant('sim-3');

      // Get fresh state
      store = useWorldStore.getState();
      expect(store.simulants.has('sim-3')).toBe(false);
    });
  });

  describe('World Statistics', () => {
    it('should calculate world statistics correctly', () => {
      const store = useWorldStore.getState();

      // Add blocks of different types
      store.addBlock(new Vector3(0, 0, 0), BlockType.STONE, 'human');
      store.addBlock(new Vector3(1, 0, 0), BlockType.STONE, 'human');
      store.addBlock(new Vector3(2, 0, 0), BlockType.LEAF, 'human');
      store.addBlock(new Vector3(0, 1, 0), BlockType.WOOD, 'human');

      // Add simulant
      const simulant: AISimulant = {
        id: 'sim-stats',
        name: 'StatsBot',
        position: { x: 0, y: 0, z: 0 },
        status: 'active',
        lastAction: 'testing',
        conversationHistory: [],
        geminiSessionId: 'session-stats'
      };
      store.addSimulant(simulant);

      const stats = store.getWorldStats();

      expect(stats.totalBlocks).toBe(4);
      expect(stats.blocksByType.stone).toBe(2);
      expect(stats.blocksByType.leaf).toBe(1);
      expect(stats.blocksByType.wood).toBe(1);
      expect(stats.activeSimulants).toBe(1);
      expect(stats.worldSize.min.x).toBe(0);
      expect(stats.worldSize.max.x).toBe(2);
    });
  });

  describe('Utility Functions', () => {
    it('should update selected block type', () => {
      const store = useWorldStore.getState();

      expect(store.selectedBlockType).toBe(BlockType.STONE); // default

      store.setSelectedBlockType(BlockType.LEAF);
      expect(useWorldStore.getState().selectedBlockType).toBe(BlockType.LEAF);
    });

    it('should update camera mode', () => {
      const store = useWorldStore.getState();

      expect(store.activeCamera).toBe('orbit'); // default

      store.setCameraMode('fly');
      expect(useWorldStore.getState().activeCamera).toBe('fly');
    });

    it('should update sync status', () => {
      const store = useWorldStore.getState();

      expect(store.syncStatus).toBe('disconnected'); // default

      store.setSyncStatus('connected');
      expect(useWorldStore.getState().syncStatus).toBe('connected');
    });

    it('should clear world completely', () => {
      let store = useWorldStore.getState();

      // Add some data
      store.addBlock(new Vector3(0, 0, 0), BlockType.STONE, 'human');
      const simulant: AISimulant = {
        id: 'clear-test',
        name: 'ClearBot',
        position: { x: 0, y: 0, z: 0 },
        status: 'active',
        lastAction: 'testing',
        conversationHistory: [],
        geminiSessionId: 'session-clear'
      };
      store.addSimulant(simulant);

      // Get fresh state
      store = useWorldStore.getState();
      expect(store.blockCount).toBe(1);
      expect(store.simulants.size).toBe(1);

      // Clear world
      store.clearWorld();

      // Get fresh state
      store = useWorldStore.getState();
      expect(store.blockCount).toBe(0);
      expect(store.simulants.size).toBe(0);
    });
  });

  describe('Performance Characteristics', () => {
    it('should handle large numbers of blocks efficiently', () => {
      let store = useWorldStore.getState();

      const startTime = performance.now();

      // Add 100 blocks
      for (let i = 0; i < 100; i++) {
        store.addBlock(new Vector3(i % 10, Math.floor(i / 10), 0), BlockType.STONE, 'human');
      }

      const addTime = performance.now() - startTime;

      // Get fresh state for lookups
      store = useWorldStore.getState();

      // Lookup operations should be fast
      const lookupStart = performance.now();
      for (let i = 0; i < 100; i++) {
        store.getBlock(new Vector3(i % 10, Math.floor(i / 10), 0));
      }
      const lookupTime = performance.now() - lookupStart;

      // These should be very fast operations
      expect(addTime).toBeLessThan(100); // 100ms for 100 blocks
      expect(lookupTime).toBeLessThan(10); // 10ms for 100 lookups

      // Block count should be O(1)
      const countStart = performance.now();
      const count = store.blockCount;
      const countTime = performance.now() - countStart;

      expect(count).toBe(100);
      expect(countTime).toBeLessThan(1); // Should be essentially instant
    });
  });
});