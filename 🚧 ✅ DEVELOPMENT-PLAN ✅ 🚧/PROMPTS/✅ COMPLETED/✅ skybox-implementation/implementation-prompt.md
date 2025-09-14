# Skybox Implementation - Comprehensive Development Prompt

## CONTEXT
You are implementing a dynamic skybox system for the Descendants metaverse, a 3D voxel world built with Next.js, React Three Fiber, and Zustand. The system must provide immersive environment visuals using 6-sided cube map textures while maintaining 60 FPS performance and supporting dynamic lighting effects.

Current Architecture:
- React Three Fiber for 3D rendering with Three.js
- Zustand store for state management
- Existing VoxelCanvas with scene management
- Performance-optimized rendering pipeline
- Modular component architecture

## OBJECTIVE
Create a robust, modular skybox system that renders high-quality environment backgrounds using cube map textures, supports dynamic transitions, and integrates seamlessly with the existing 3D scene architecture.

## REQUIREMENTS
- SkyboxManager with cube map texture loading and management
- Dynamic skybox switching with smooth transitions
- Performance-optimized rendering with LOD support
- Atmospheric effects and lighting integration
- Configuration system for different skybox presets
- Error handling for texture loading failures
- Debug visualization and performance monitoring

## SKYBOX ASSET SPECIFICATIONS
```typescript
// Expected asset structure
const SKYBOX_ASSETS = {
  structure: 'skybox_implementation/',
  naming: ['side-1', 'side-2', 'side-3', 'side-4', 'side-5', 'side-6'],
  format: '.jpg, .png, .webp',
  resolution: '1024x1024 or 2048x2048',
  mapping: {
    'side-1': 'positive-x', // Right
    'side-2': 'negative-x', // Left  
    'side-3': 'positive-y', // Top
    'side-4': 'negative-y', // Bottom
    'side-5': 'positive-z', // Front
    'side-6': 'negative-z'  // Back
  }
}
```

## IMPLEMENTATION TASKS

### 1. Core Skybox Infrastructure
Create `components/skybox/SkyboxManager.tsx` with:
```typescript
interface SkyboxManagerProps {
  currentSkybox: SkyboxPreset
  transitionDuration?: number
  enableAtmosphericEffects?: boolean
  performanceMode?: 'quality' | 'balanced' | 'performance'
  onLoadComplete?: () => void
  onLoadError?: (error: Error) => void
}

interface SkyboxPreset {
  id: string
  name: string
  assetPath: string
  intensity: number
  tint: Color
  rotationSpeed: number
  atmosphericSettings: AtmosphericSettings
}
```

### 2. Texture Loading System
Create `utils/skybox/TextureLoader.ts` with:
- Cube map texture loading from 6-sided images
- Texture caching and memory management
- Progressive loading with fallback textures
- Texture format optimization and compression
- Error handling for missing or corrupted textures

### 3. Skybox Rendering Component
Create `components/skybox/SkyboxRenderer.tsx` with:
- Three.js skybox geometry and material setup
- Shader-based rendering for performance
- Dynamic texture swapping and transitions
- Atmospheric scattering effects
- Integration with scene lighting

### 4. Transition System
Create `utils/skybox/TransitionManager.ts` with:
- Smooth skybox transitions using alpha blending
- Configurable transition curves and timing
- Transition state management and callbacks
- Performance optimization during transitions
- Interruption handling for rapid skybox changes

### 5. Configuration Management
Create `store/skyboxStore.ts` with:
- Skybox preset management and persistence
- User preference storage and loading
- Real-time configuration updates
- Integration with main world store
- Settings validation and defaults

## SUCCESS CRITERIA
- [ ] Skybox renders correctly with 6-sided cube map textures
- [ ] Smooth transitions between different skybox presets
- [ ] Performance maintains 60 FPS with skybox active
- [ ] Texture loading handles errors gracefully with fallbacks
- [ ] Memory usage optimized with proper texture disposal
- [ ] Integration with existing scene lighting works correctly
- [ ] Debug tools provide useful visualization and metrics
- [ ] Configuration system allows real-time skybox switching

## PERFORMANCE SPECIFICATIONS
```typescript
const PERFORMANCE_TARGETS = {
  textureLoading: {
    maxLoadTime: 2000, // ms
    maxMemoryUsage: 50, // MB per skybox
    concurrentLoads: 3
  },
  rendering: {
    frameImpact: 2, // Max FPS reduction
    drawCalls: 1,   // Single draw call per skybox
    shaderComplexity: 'medium'
  },
  transitions: {
    duration: 1000, // Default transition time (ms)
    frameRate: 60,  // Maintain during transitions
    memorySpike: 20 // Max additional MB during transition
  }
}
```

## ERROR HANDLING STRATEGY
```typescript
const ERROR_HANDLING = {
  textureLoadFailure: {
    fallback: 'default-skybox',
    retry: true,
    maxRetries: 3,
    userNotification: false
  },
  
  memoryPressure: {
    purgeUnusedTextures: true,
    reduceToCubemap: true,
    disableTransitions: true,
    notifyUser: true
  },
  
  shaderCompilation: {
    fallbackToBasic: true,
    logError: true,
    disableEffects: true
  }
}
```

## DEBUG SYSTEM IMPLEMENTATION
Create `debug/skybox/SkyboxDebugger.ts` with:
```typescript
interface SkyboxDebugger {
  // Visual debugging
  showWireframe: (enable: boolean) => void
  showTextureInfo: (enable: boolean) => void
  visualizeTransitions: (enable: boolean) => void
  
  // Performance monitoring
  getTextureMemoryUsage: () => number
  getRenderTime: () => number
  getTransitionProgress: () => number
  
  // Debug logging
  enableTextureLogging: (enable: boolean) => void
  logTransitionEvents: (enable: boolean) => void
  exportPerformanceData: () => SkyboxPerformanceData
  
  // Testing utilities
  forceSkyboxSwitch: (presetId: string) => void
  simulateTextureError: () => void
  benchmarkTransition: (preset1: string, preset2: string) => void
}
```

## TESTING VALIDATION

### Unit Tests
- [ ] Texture loading with valid and invalid paths
- [ ] Cube map creation from 6-sided images
- [ ] Transition state management and timing
- [ ] Configuration validation and defaults
- [ ] Error handling for all failure scenarios

### Integration Tests
- [ ] Skybox integration with VoxelCanvas
- [ ] Lighting system interaction
- [ ] Performance impact on existing systems
- [ ] Memory management during extended use
- [ ] Real-time configuration updates

### Performance Tests
- [ ] Texture loading time with various sizes
- [ ] Frame rate impact measurement
- [ ] Memory usage monitoring
- [ ] Transition performance benchmarking
- [ ] Concurrent skybox loading stress test

## FILES TO CREATE
```
components/skybox/
├── SkyboxManager.tsx           # Main skybox coordination
├── SkyboxRenderer.tsx          # Three.js rendering component
├── SkyboxControls.tsx          # UI controls for skybox management
├── SkyboxPreview.tsx           # Preview component for settings
└── __tests__/
    ├── SkyboxManager.test.tsx
    ├── SkyboxRenderer.test.tsx
    └── SkyboxControls.test.tsx

utils/skybox/
├── TextureLoader.ts            # Cube map texture loading
├── TransitionManager.ts        # Skybox transition system
├── SkyboxUtils.ts             # Utility functions
├── SkyboxOptimizer.ts         # Performance optimization
└── __tests__/
    ├── TextureLoader.test.ts
    ├── TransitionManager.test.ts
    └── SkyboxUtils.test.ts

store/
├── skyboxStore.ts             # Zustand store for skybox state
└── __tests__/
    └── skyboxStore.test.ts

debug/skybox/
├── SkyboxDebugger.ts          # Debug tools and monitoring
├── SkyboxProfiler.ts          # Performance profiling
└── SkyboxDebugPanel.tsx       # React debug UI component

types/
└── skybox.ts                  # TypeScript definitions

examples/
├── skyboxExample.tsx          # Usage examples
└── skyboxPresets.ts           # Example preset configurations
```

## INTEGRATION REQUIREMENTS
- Use existing VoxelCanvas scene structure
- Integrate with current camera controller
- Follow existing component patterns and naming conventions
- Use established error handling patterns
- Maintain compatibility with existing performance monitoring
- Support existing development and debugging tools

## EXPECTED OUTPUT
A complete skybox system that:
1. **Loads and renders** 6-sided cube map textures seamlessly
2. **Provides smooth transitions** between different skybox environments
3. **Maintains performance** with optimized texture management
4. **Handles errors gracefully** with fallback systems
5. **Includes comprehensive debugging** tools and monitoring
6. **Integrates seamlessly** with existing Descendants architecture
7. **Supports real-time configuration** and user customization
8. **Provides extensible architecture** for future skybox features

The implementation should demonstrate production-ready code quality with comprehensive testing, error handling, and documentation suitable for a professional 3D application.
