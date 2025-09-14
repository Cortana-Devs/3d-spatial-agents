# Utils Context

## Overview
Core utility functions and business logic for the Descendants metaverse system.

## Key Directories

### `/generation/` - Procedural World Generation
- **IslandGenerator.ts** - Creates voxel islands with noise algorithms
- **ArchipelagoGenerator.ts** - Manages multiple island systems
- **NoiseGenerator.ts** - Perlin/Simplex noise for terrain
- **DeterministicRNG.ts** - Seeded random generation

### `/performance/` - Optimization Systems
- **GPUMemoryManager.ts** - Graphics memory optimization
- **PerformanceManager.ts** - Frame rate and resource monitoring
- **TransparencyOptimizer.ts** - Handles glass block sorting/rendering
- **BenchmarkResourceManager.ts** - Performance testing utilities

### `/logging/` - Debug and Development
- **logger.ts** - Centralized logging system with filtering
- **debugLogger.ts** - Development-specific debug utilities

### `/skybox/` - Environment Utilities
- **TextureLoader.ts** - Optimized texture loading for skyboxes
- **TransitionManager.ts** - Smooth skybox transitions
- **PerformanceMonitor.ts** - Skybox-specific performance tracking

## Core Files
- **blockFactory.ts** - Creates and validates voxel blocks
- **floorManager.ts** - Manages floor systems and glass rendering
- **animationController.ts** - Handles 3D character animations
- **MaterialPresetManager.ts** - Manages 3D material presets

## Key Patterns
- Performance-first design with monitoring
- Modular utility functions for easy testing
- Type-safe interfaces with comprehensive validation
- Memory management for 3D graphics
- Deterministic systems for multiplayer consistency

## Dependencies
- Three.js for 3D math and rendering utilities
- React Three Fiber integration helpers
- Zustand store utilities
- UUID generation for unique identifiers
