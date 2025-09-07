/**
 * useIslandGeneration Hook
 *
 * Provides a React hook interface for island generation functionality,
 * managing state, controls, and integration with the world store.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Vector3 } from 'three';
import { useWorldStore } from '../store/worldStore';
import { BlockType } from '../types/blocks';
import {
  generateAndPlaceIsland,
  clearIslandRegion,
  getIslandPresets,
  validateIslandPlacement,
  createIslandDevControls,
  type IslandGenerationProgressCallback,
  type IslandIntegrationResult,
  type IslandDevControls,
} from '../utils/generation/islands/integration';
import {
  createDefaultIslandConfig,
  type IslandGenConfig,
} from '../utils/generation/islands/IslandGenerator';

interface UseIslandGenerationOptions {
  enableDevControls?: boolean;
  getPlayerPosition?: () => { x: number; z: number };
  defaultPreset?: string;
}

interface IslandGenerationState {
  isGenerating: boolean;
  isClearing: boolean;
  progress: {
    value: number;
    stage: string;
    details?: string;
  };
  lastResult: IslandIntegrationResult | null;
  validation: {
    valid: boolean;
    warnings: string[];
    blockCount: number;
  } | null;
}

interface IslandGenerationConfig {
  seed: string;
  preset: string;
  size: { width: number; height: number };
  position: { x: number; z: number };
}

export interface UseIslandGenerationReturn {
  // State
  state: IslandGenerationState;
  config: IslandGenerationConfig;
  presets: Record<string, Partial<IslandGenConfig>>;

  // Actions
  generateIsland: (customConfig?: Partial<IslandGenerationConfig>) => Promise<void>;
  clearIsland: (customPosition?: { x: number; z: number }, customSize?: { width: number; height: number }) => Promise<void>;
  setConfig: (updates: Partial<IslandGenerationConfig>) => void;
  generateNewSeed: () => void;
  validatePlacement: (position?: { x: number; z: number }, size?: { width: number; height: number }) => void;

  // Utilities
  getEstimatedBlocks: () => number;
  canGenerate: () => boolean;
  canClear: () => boolean;
}

/**
 * Main island generation hook
 */
export function useIslandGeneration(options: UseIslandGenerationOptions = {}): UseIslandGenerationReturn {
  const {
    enableDevControls = false,
    getPlayerPosition = () => ({ x: 0, z: 0 }),
    defaultPreset = 'medium'
  } = options;

  // World store
  const worldStore = useWorldStore();

  // State
  const [state, setState] = useState<IslandGenerationState>({
    isGenerating: false,
    isClearing: false,
    progress: { value: 0, stage: 'Ready' },
    lastResult: null,
    validation: null,
  });

  const [config, setConfigState] = useState<IslandGenerationConfig>({
    seed: `island-${Date.now()}`,
    preset: defaultPreset,
    size: { width: 128, height: 128 },
    position: getPlayerPosition(),
  });

  // Dev controls reference
  const devControlsRef = useRef<IslandDevControls | null>(null);

  // Presets
  const presets = getIslandPresets();

  // World store interface
  const worldStoreInterface = useRef({
    addBlock: (pos: Vector3, type: BlockType, userId: string) => worldStore.addBlock(pos, type, userId),
    removeBlock: (pos: Vector3, userId: string) => worldStore.removeBlock(pos, userId),
    clearWorld: () => worldStore.clearWorld(),
    getBlock: (pos: Vector3) => worldStore.getBlock(pos),
    getAllBlocks: () => worldStore.getAllBlocks(),
  });

  // Update world store interface when store changes
  useEffect(() => {
    worldStoreInterface.current = {
      addBlock: (pos: Vector3, type: BlockType, userId: string) => worldStore.addBlock(pos, type, userId),
      removeBlock: (pos: Vector3, userId: string) => worldStore.removeBlock(pos, userId),
      clearWorld: () => worldStore.clearWorld(),
      getBlock: (pos: Vector3) => worldStore.getBlock(pos),
      getAllBlocks: () => worldStore.getAllBlocks(),
    };
  }, [worldStore]);

  // Initialize dev controls if enabled
  useEffect(() => {
    if (enableDevControls && !devControlsRef.current) {
      devControlsRef.current = createIslandDevControls(
        worldStoreInterface.current,
        getPlayerPosition
      );
    }

    return () => {
      if (devControlsRef.current) {
        devControlsRef.current.dispose();
        devControlsRef.current = null;
      }
    };
  }, [enableDevControls, getPlayerPosition]);

  // Update position when player position changes
  useEffect(() => {
    const interval = setInterval(() => {
      const newPosition = getPlayerPosition();
      setConfigState(prev => ({
        ...prev,
        position: newPosition
      }));
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [getPlayerPosition]);

  // Validate placement when config changes
  useEffect(() => {
    validatePlacement();
  }, [config.position, config.size]);

  // Progress callback
  const onProgress: IslandGenerationProgressCallback = useCallback((progress, stage, details) => {
    setState(prev => ({
      ...prev,
      progress: { value: progress, stage, details }
    }));
  }, []);

  // Generate island
  const generateIsland = useCallback(async (customConfig?: Partial<IslandGenerationConfig>) => {
    if (state.isGenerating || state.isClearing) return;

    const finalConfig = { ...config, ...customConfig };

    setState(prev => ({
      ...prev,
      isGenerating: true,
      progress: { value: 0, stage: 'Starting' }
    }));

    try {
      const result = await generateAndPlaceIsland(
        {
          worldSeed: finalConfig.seed,
          islandId: `${finalConfig.preset}-${Date.now()}`,
          playerPosition: finalConfig.position,
          size: finalConfig.size,
          onProgress,
          debug: true,
        },
        worldStoreInterface.current
      );

      setState(prev => ({
        ...prev,
        lastResult: result,
        progress: result.success
          ? { value: 1, stage: 'Complete', details: `Generated ${result.placedBlocks} blocks` }
          : { value: 0, stage: 'Error', details: result.error }
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        progress: {
          value: 0,
          stage: 'Error',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      }));
    } finally {
      setState(prev => ({
        ...prev,
        isGenerating: false
      }));
    }
  }, [config, state.isGenerating, state.isClearing, onProgress]);

  // Clear island
  const clearIsland = useCallback(async (
    customPosition?: { x: number; z: number },
    customSize?: { width: number; height: number }
  ) => {
    if (state.isGenerating || state.isClearing) return;

    const position = customPosition || config.position;
    const size = customSize || config.size;

    setState(prev => ({
      ...prev,
      isClearing: true,
      progress: { value: 0, stage: 'Clearing' }
    }));

    try {
      const clearedBlocks = await clearIslandRegion(
        position,
        size,
        worldStoreInterface.current,
        (progress) => setState(prev => ({
          ...prev,
          progress: { value: progress, stage: 'Clearing', details: `${Math.round(progress * 100)}%` }
        }))
      );

      setState(prev => ({
        ...prev,
        progress: { value: 1, stage: 'Cleared', details: `Removed ${clearedBlocks} blocks` }
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        progress: {
          value: 0,
          stage: 'Error',
          details: error instanceof Error ? error.message : 'Clear failed'
        }
      }));
    } finally {
      setState(prev => ({
        ...prev,
        isClearing: false
      }));
    }
  }, [config, state.isGenerating, state.isClearing]);

  // Set configuration
  const setConfig = useCallback((updates: Partial<IslandGenerationConfig>) => {
    setConfigState(prev => ({ ...prev, ...updates }));
  }, []);

  // Generate new seed
  const generateNewSeed = useCallback(() => {
    const newSeed = `island-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    setConfig({ seed: newSeed });
  }, [setConfig]);

  // Validate placement
  const validatePlacement = useCallback((
    position?: { x: number; z: number },
    size?: { width: number; height: number }
  ) => {
    const pos = position || config.position;
    const sz = size || config.size;

    const result = validateIslandPlacement(pos, sz, worldStoreInterface.current);
    setState(prev => ({
      ...prev,
      validation: result
    }));
  }, [config.position, config.size]);

  // Get estimated blocks
  const getEstimatedBlocks = useCallback(() => {
    const { width, height } = config.size;
    const area = width * height;

    // Rough estimate: circular island fills ~78% of square area
    const estimatedIslandArea = area * 0.78;
    return Math.round(estimatedIslandArea);
  }, [config.size]);

  // Check if generation is possible
  const canGenerate = useCallback(() => {
    return !state.isGenerating && !state.isClearing && config.seed.length > 0;
  }, [state.isGenerating, state.isClearing, config.seed]);

  // Check if clearing is possible
  const canClear = useCallback(() => {
    return !state.isGenerating && !state.isClearing;
  }, [state.isGenerating, state.isClearing]);

  return {
    state,
    config,
    presets,
    generateIsland,
    clearIsland,
    setConfig,
    generateNewSeed,
    validatePlacement,
    getEstimatedBlocks,
    canGenerate,
    canClear,
  };
}

/**
 * Simplified hook for basic island generation
 */
export function useSimpleIslandGeneration() {
  const {
    state,
    generateIsland,
    clearIsland,
    canGenerate,
    canClear,
  } = useIslandGeneration();

  return {
    isGenerating: state.isGenerating,
    isClearing: state.isClearing,
    progress: state.progress,
    lastResult: state.lastResult,
    generateIsland: () => generateIsland(),
    clearIsland: () => clearIsland(),
    canGenerate: canGenerate(),
    canClear: canClear(),
  };
}

/**
 * Hook for island generation with dev controls
 */
export function useIslandGenerationDev(getPlayerPosition: () => { x: number; z: number }) {
  return useIslandGeneration({
    enableDevControls: true,
    getPlayerPosition,
    defaultPreset: 'medium',
  });
}

export default useIslandGeneration;
