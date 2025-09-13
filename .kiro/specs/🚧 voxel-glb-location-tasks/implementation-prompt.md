# Voxel GLB Location Tasks - Comprehensive Development Prompt

## CONTEXT
You are implementing a modular, reusable, robust 3D model display system for the Descendants metaverse that enables dynamic loading, positioning, and management of GLB models in the voxel world. This system provides pre-configurable location-based model placement with seamless worldStore integration, optimized for models under 2MB (preferably <1MB) while maintaining high performance and memory efficiency.

Current Architecture:
- Existing GLB model loading system with ReadyPlayerMe avatars and animations
- World store with spatial optimization and block management
- Performance-optimized voxel rendering with modular canvas system
- Three.js/React Three Fiber integration with GLTFLoader
- Memory management and LOD systems for large models
- Player controller and camera systems for interaction

## OBJECTIVE
Create a comprehensive GLB model location system that enables:
- Dynamic model loading and positioning at pre-configured world locations
- Memory-efficient model management with size optimization
- Seamless integration with existing worldStore and spatial systems
- Modular, reusable components for different model types and use cases
- Performance optimization for multiple concurrent models
- Real-time model state management and interaction capabilities

## REQUIREMENTS
- Modular GLB model loading and display system
- Pre-configurable location-based model placement
- Memory optimization for models under 2MB (target <1MB)
- WorldStore integration for persistent model positioning
- Performance optimization for multiple concurrent models
- LOD (Level of Detail) system for distant models
- Model caching and reuse mechanisms
- Interactive model selection and manipulation
- Error handling and fallback systems
- Debug tools and performance monitoring

## VOXEL GLB LOCATION SYSTEM ARCHITECTURE
```typescript
// Core GLB location system
interface VoxelGLBLocationSystem {
  modelManager: GLBModelManager
  locationManager: ModelLocationManager
  performanceOptimizer: GLBPerformanceOptimizer
  worldIntegration: WorldStoreIntegration
  
  // Model lifecycle
  modelLoader: GLBModelLoader
  modelRenderer: GLBModelRenderer
  modelCache: GLBModelCache
  
  // Location management
  locationConfig: LocationConfiguration
  spatialIndex: ModelSpatialIndex
  placementValidator: ModelPlacementValidator
  
  // Integration systems
  worldStore: WorldStoreConnection
  interactionSystem: ModelInteractionSystem
  debugSystem: GLBDebugSystem
}

interface GLBModelManager {
  // Model lifecycle management
  loadModel: (config: ModelConfig) => Promise<GLBModelInstance>
  unloadModel: (instanceId: string) => void
  updateModel: (instanceId: string, updates: ModelUpdate) => void
  
  // Batch operations
  loadMultipleModels: (configs: ModelConfig[]) => Promise<GLBModelInstance[]>
  unloadModelsByLocation: (location: Vector3, radius: number) => void
  optimizeMemoryUsage: () => MemoryOptimizationResult
  
  // Model validation
  validateModelSize: (modelPath: string) => ModelValidationResult
  checkModelCompatibility: (modelPath: string) => CompatibilityCheck
  estimateMemoryUsage: (modelPath: string) => MemoryEstimate
}

interface ModelLocationManager {
  // Location-based operations
  placeModelAtLocation: (model: GLBModelInstance, location: Vector3) => PlacementResult
  moveModelToLocation: (instanceId: string, newLocation: Vector3) => MoveResult
  removeModelFromLocation: (location: Vector3) => RemovalResult
  
  // Spatial queries
  getModelsInRadius: (center: Vector3, radius: number) => GLBModelInstance[]
  getModelsInBounds: (bounds: BoundingBox) => GLBModelInstance[]
  findNearestModel: (position: Vector3, maxDistance?: number) => GLBModelInstance | null
  
  // Location validation
  validateLocation: (location: Vector3, model: GLBModelInstance) => LocationValidation
  checkCollisions: (location: Vector3, model: GLBModelInstance) => CollisionCheck
  suggestAlternativeLocation: (location: Vector3, model: GLBModelInstance) => Vector3[]
}

interface GLBPerformanceOptimizer {
  // Memory management
  implementModelPooling: () => ModelPool
  optimizeTextureCompression: (model: GLBModelInstance) => TextureOptimization
  manageLODSystem: (models: GLBModelInstance[]) => LODManagement
  
  // Rendering optimization
  implementFrustumCulling: (models: GLBModelInstance[], camera: Camera) => CullingResult
  batchSimilarModels: (models: GLBModelInstance[]) => BatchedModels
  optimizeDrawCalls: (models: GLBModelInstance[]) => DrawCallOptimization
  
  // Loading optimization
  implementProgressiveLoading: (modelPath: string) => ProgressiveLoadResult
  preloadNearbyModels: (position: Vector3, radius: number) => PreloadResult
  implementStreaming: (models: GLBModelInstance[]) => StreamingResult
}
```

## IMPLEMENTATION TASKS

### 1. Core GLB Model Manager
Create `components/glb/GLBModelManager.tsx` with:
```typescript
interface GLBModelManagerProps {
  maxModels: number
  maxModelSize: number // in MB
  enableLOD: boolean
  enableCaching: boolean
  performanceMode: 'high' | 'balanced' | 'low'
  onModelLoaded?: (model: GLBModelInstance) => void
  onModelUnloaded?: (instanceId: string) => void
  onError?: (error: GLBError) => void
}

interface GLBModelInstance {
  id: string
  modelPath: string
  position: Vector3
  rotation: Vector3
  scale: Vector3
  
  // Model data
  gltf: GLTF
  scene: Group
  animations: AnimationClip[]
  materials: Material[]
  textures: Texture[]
  
  // Performance data
  memoryUsage: number
  polygonCount: number
  textureSize: number
  loadTime: number
  
  // State management
  isLoaded: boolean
  isVisible: boolean
  isInteractable: boolean
  lodLevel: number
  
  // Metadata
  metadata: ModelMetadata
  createdAt: number
  lastAccessed: number
}

interface ModelConfig {
  // Model identification
  id?: string
  modelPath: string
  name: string
  category: ModelCategory
  
  // Positioning
  position: Vector3
  rotation?: Vector3
  scale?: Vector3
  
  // Performance settings
  enableLOD?: boolean
  maxLODDistance?: number
  enableCulling?: boolean
  enableShadows?: boolean
  
  // Interaction settings
  isInteractable?: boolean
  clickable?: boolean
  draggable?: boolean
  selectable?: boolean
  
  // Customization
  materialOverrides?: MaterialOverride[]
  animationSettings?: AnimationSettings
  customProperties?: Record<string, any>
}

interface ModelMetadata {
  // File information
  fileSize: number
  format: string
  version: string
  generator: string
  
  // Model statistics
  meshCount: number
  materialCount: number
  textureCount: number
  animationCount: number
  vertexCount: number
  
  // Performance metrics
  estimatedMemoryUsage: number
  complexityScore: number
  optimizationLevel: number
  
  // Custom data
  tags: string[]
  description: string
  author: string
  license: string
}
```

### 2. Location-Based Model Placement System
Create `systems/glb/ModelLocationManager.ts` with:
```typescript
interface ModelLocationManager {
  // Location configuration
  configureLocation: (location: Vector3, config: LocationConfig) => void
  getLocationConfig: (location: Vector3) => LocationConfig | null
  removeLocationConfig: (location: Vector3) => void
  
  // Model placement
  placeModelAtLocation: (model: GLBModelInstance, location: Vector3) => PlacementResult
  moveModelToLocation: (instanceId: string, newLocation: Vector3) => MoveResult
  removeModelFromLocation: (location: Vector3) => RemovalResult
  
  // Spatial management
  updateSpatialIndex: (model: GLBModelInstance) => void
  querySpatialIndex: (query: SpatialQuery) => GLBModelInstance[]
  optimizeSpatialIndex: () => void
  
  // Location validation
  validateLocation: (location: Vector3, model: GLBModelInstance) => LocationValidation
  checkCollisions: (location: Vector3, model: GLBModelInstance) => CollisionCheck
  suggestAlternativeLocation: (location: Vector3, model: GLBModelInstance) => Vector3[]
}

interface LocationConfig {
  // Location identification
  id: string
  name: string
  position: Vector3
  
  // Model configuration
  allowedModels: string[] // Model IDs or categories
  defaultModel?: string
  modelRotation?: Vector3
  modelScale?: Vector3
  
  // Placement rules
  placementRules: PlacementRule[]
  collisionRules: CollisionRule[]
  visibilityRules: VisibilityRule[]
  
  // Interaction settings
  interactionMode: InteractionMode
  clickActions: ClickAction[]
  hoverEffects: HoverEffect[]
  
  // Performance settings
  lodSettings: LODSettings
  cullingSettings: CullingSettings
  optimizationSettings: OptimizationSettings
}

interface PlacementRule {
  type: 'height' | 'surface' | 'grid' | 'custom'
  parameters: Record<string, any>
  validation: (position: Vector3, model: GLBModelInstance) => boolean
}

interface SpatialQuery {
  type: 'radius' | 'bounds' | 'frustum' | 'raycast'
  parameters: Record<string, any>
  filters?: ModelFilter[]
}

interface ModelFilter {
  property: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains'
  value: any
}
```

### 3. WorldStore Integration System
Create `store/glbModelStore.ts` with:
```typescript
interface GLBModelStore {
  // Model instances
  models: Map<string, GLBModelInstance>
  modelCount: number
  
  // Location management
  locationConfigs: Map<string, LocationConfig>
  spatialIndex: ModelSpatialIndex
  
  // Performance tracking
  memoryUsage: number
  loadTimes: Map<string, number>
  errorCounts: Map<string, number>
  
  // State management
  isLoading: boolean
  lastUpdate: number
  syncStatus: 'connected' | 'disconnected' | 'syncing'
  
  // Actions
  addModel: (config: ModelConfig) => Promise<GLBModelInstance>
  removeModel: (instanceId: string) => void
  updateModel: (instanceId: string, updates: Partial<GLBModelInstance>) => void
  moveModel: (instanceId: string, newPosition: Vector3) => void
  
  // Location actions
  configureLocation: (location: Vector3, config: LocationConfig) => void
  getLocationConfig: (location: Vector3) => LocationConfig | null
  removeLocationConfig: (location: Vector3) => void
  
  // Query actions
  getModelsInRadius: (center: Vector3, radius: number) => GLBModelInstance[]
  getModelsInBounds: (bounds: BoundingBox) => GLBModelInstance[]
  findModelByPosition: (position: Vector3) => GLBModelInstance | null
  
  // Performance actions
  optimizeMemory: () => void
  getPerformanceStats: () => PerformanceStats
  clearCache: () => void
  
  // Persistence
  saveToWorldStore: () => void
  loadFromWorldStore: () => void
  exportModelData: () => ModelDataExport
  importModelData: (data: ModelDataExport) => void
}

interface ModelSpatialIndex {
  // Spatial partitioning
  octree: ModelOctree
  gridIndex: ModelGridIndex
  hashIndex: ModelHashIndex
  
  // Query optimization
  queryCache: Map<string, GLBModelInstance[]>
  lastQueryTime: number
  
  // Performance metrics
  indexSize: number
  queryCount: number
  averageQueryTime: number
}

interface PerformanceStats {
  // Memory usage
  totalMemoryUsage: number
  modelMemoryUsage: Map<string, number>
  textureMemoryUsage: number
  geometryMemoryUsage: number
  
  // Performance metrics
  averageLoadTime: number
  totalLoadTime: number
  cacheHitRate: number
  errorRate: number
  
  // Model statistics
  totalModels: number
  loadedModels: number
  visibleModels: number
  culledModels: number
}
```

### 4. Performance Optimization System
Create `optimization/glb/GLBPerformanceOptimizer.ts` with:
```typescript
interface GLBPerformanceOptimizer {
  // Memory optimization
  optimizeModelMemory: (model: GLBModelInstance) => MemoryOptimizationResult
  implementModelPooling: () => ModelPool
  compressTextures: (model: GLBModelInstance) => TextureCompressionResult
  optimizeGeometry: (model: GLBModelInstance) => GeometryOptimizationResult
  
  // Loading optimization
  implementProgressiveLoading: (modelPath: string) => ProgressiveLoadResult
  preloadCriticalModels: (models: string[]) => PreloadResult
  implementStreaming: (models: GLBModelInstance[]) => StreamingResult
  
  // Rendering optimization
  implementLODSystem: (models: GLBModelInstance[]) => LODSystem
  optimizeDrawCalls: (models: GLBModelInstance[]) => DrawCallOptimization
  implementFrustumCulling: (models: GLBModelInstance[], camera: Camera) => CullingResult
  
  // Caching optimization
  implementSmartCaching: () => SmartCache
  optimizeCacheStrategy: (models: GLBModelInstance[]) => CacheStrategy
  manageCacheEviction: () => CacheEvictionResult
}

interface ModelPool {
  // Pool management
  availableModels: Map<string, GLBModelInstance[]>
  usedModels: Map<string, GLBModelInstance>
  poolSize: number
  
  // Pool operations
  getModel: (modelPath: string) => GLBModelInstance | null
  returnModel: (instance: GLBModelInstance) => void
  expandPool: (modelPath: string, count: number) => void
  shrinkPool: (modelPath: string, count: number) => void
  
  // Pool statistics
  getPoolStats: () => PoolStats
  optimizePoolSize: () => void
}

interface LODSystem {
  // LOD levels
  lodLevels: LODLevel[]
  currentLODLevel: Map<string, number>
  
  // LOD management
  updateLODLevels: (models: GLBModelInstance[], camera: Camera) => void
  getLODLevel: (model: GLBModelInstance, distance: number) => number
  switchLODLevel: (model: GLBModelInstance, newLevel: number) => void
  
  // LOD optimization
  optimizeLODDistances: (models: GLBModelInstance[]) => void
  precomputeLODModels: (model: GLBModelInstance) => void
  manageLODMemory: () => void
}

interface LODLevel {
  level: number
  distance: number
  polygonReduction: number
  textureReduction: number
  materialSimplification: number
  animationReduction: number
}
```

### 5. Model Interaction System
Create `components/glb/ModelInteractionSystem.tsx` with:
```typescript
interface ModelInteractionSystemProps {
  enableSelection: boolean
  enableDragging: boolean
  enableRotation: boolean
  enableScaling: boolean
  selectionMode: 'single' | 'multiple'
  onModelSelected?: (model: GLBModelInstance) => void
  onModelMoved?: (model: GLBModelInstance, newPosition: Vector3) => void
  onModelRotated?: (model: GLBModelInstance, newRotation: Vector3) => void
  onModelScaled?: (model: GLBModelInstance, newScale: Vector3) => void
}

interface ModelInteractionSystem {
  // Selection management
  selectModel: (model: GLBModelInstance) => void
  deselectModel: (model: GLBModelInstance) => void
  clearSelection: () => void
  getSelectedModels: () => GLBModelInstance[]
  
  // Transformation operations
  moveModel: (model: GLBModelInstance, newPosition: Vector3) => void
  rotateModel: (model: GLBModelInstance, newRotation: Vector3) => void
  scaleModel: (model: GLBModelInstance, newScale: Vector3) => void
  
  // Interaction modes
  setInteractionMode: (mode: InteractionMode) => void
  enableInteraction: (model: GLBModelInstance) => void
  disableInteraction: (model: GLBModelInstance) => void
  
  // Visual feedback
  showSelectionOutline: (model: GLBModelInstance) => void
  hideSelectionOutline: (model: GLBModelInstance) => void
  showTransformGizmo: (model: GLBModelInstance) => void
  hideTransformGizmo: (model: GLBModelInstance) => void
}

interface InteractionMode {
  type: 'select' | 'move' | 'rotate' | 'scale' | 'custom'
  parameters: Record<string, any>
  constraints: InteractionConstraint[]
  visualFeedback: VisualFeedback[]
}

interface InteractionConstraint {
  type: 'position' | 'rotation' | 'scale' | 'custom'
  min?: number
  max?: number
  step?: number
  snap?: number
  axis?: 'x' | 'y' | 'z' | 'all'
}
```

### 6. Debug and Monitoring System
Create `debug/glb/GLBDebugSystem.tsx` with:
```typescript
interface GLBDebugSystemProps {
  enablePerformanceStats: boolean
  enableMemoryMonitoring: boolean
  enableSpatialVisualization: boolean
  enableModelInspector: boolean
  logLevel: 'debug' | 'info' | 'warn' | 'error'
}

interface GLBDebugSystem {
  // Performance monitoring
  showPerformanceStats: () => void
  hidePerformanceStats: () => void
  getPerformanceMetrics: () => PerformanceMetrics
  exportPerformanceData: () => PerformanceDataExport
  
  // Memory monitoring
  showMemoryUsage: () => void
  hideMemoryUsage: () => void
  getMemoryBreakdown: () => MemoryBreakdown
  analyzeMemoryLeaks: () => MemoryLeakAnalysis
  
  // Spatial visualization
  showSpatialIndex: () => void
  hideSpatialIndex: () => void
  highlightModelsInRadius: (center: Vector3, radius: number) => void
  showModelBounds: (model: GLBModelInstance) => void
  
  // Model inspector
  inspectModel: (model: GLBModelInstance) => void
  showModelDetails: (model: GLBModelInstance) => void
  analyzeModelComplexity: (model: GLBModelInstance) => ComplexityAnalysis
  
  // Testing utilities
  stressTestLoading: (modelCount: number) => void
  benchmarkPerformance: () => BenchmarkResult
  validateModelIntegrity: (model: GLBModelInstance) => IntegrityReport
}

interface PerformanceMetrics {
  // Loading metrics
  averageLoadTime: number
  totalLoadTime: number
  loadSuccessRate: number
  loadErrorRate: number
  
  // Memory metrics
  totalMemoryUsage: number
  peakMemoryUsage: number
  memoryEfficiency: number
  garbageCollectionCount: number
  
  // Rendering metrics
  frameRate: number
  drawCalls: number
  triangles: number
  culledObjects: number
  
  // Model metrics
  totalModels: number
  visibleModels: number
  loadedModels: number
  cachedModels: number
}
```

## SUCCESS CRITERIA
- [ ] GLB models load and display correctly at pre-configured locations
- [ ] Memory usage remains under 2MB per model (target <1MB)
- [ ] WorldStore integration maintains model positions persistently
- [ ] Performance remains optimal with multiple concurrent models
- [ ] LOD system reduces rendering load for distant models
- [ ] Model interaction system enables selection and manipulation
- [ ] Debug tools provide comprehensive monitoring and analysis
- [ ] Error handling gracefully manages loading failures
- [ ] Modular architecture supports easy extension and customization
- [ ] Integration with existing systems enhances rather than disrupts functionality

## PERFORMANCE SPECIFICATIONS
```typescript
const PERFORMANCE_TARGETS = {
  loading: {
    maxModelSize: 2,              // MB maximum per model
    targetModelSize: 1,           // MB target per model
    maxLoadTime: 3000,            // ms maximum load time
    maxConcurrentLoads: 5,        // Simultaneous model loads
    cacheHitRate: 0.8             // 80% cache hit rate
  },
  
  memory: {
    maxMemoryPerModel: 10,        // MB maximum memory per model
    targetMemoryPerModel: 5,      // MB target memory per model
    maxTotalMemory: 100,          // MB maximum total memory
    memoryEfficiency: 0.9,        // 90% memory efficiency
    garbageCollectionImpact: 5    // Max ms pause time
  },
  
  rendering: {
    maxModelsPerFrame: 50,        // Maximum models rendered per frame
    targetFrameRate: 60,          // Target FPS
    maxDrawCalls: 100,            // Maximum draw calls per frame
    lodSwitchDistance: 100,       // Distance for LOD switching
    cullingEfficiency: 0.8        // 80% culling efficiency
  },
  
  interaction: {
    selectionResponseTime: 16,    // ms for selection response
    dragSmoothness: 60,           // FPS during dragging
    transformUpdateRate: 30,      // FPS for transform updates
    interactionLatency: 50        // ms maximum interaction latency
  }
}
```

## ERROR HANDLING STRATEGY
```typescript
const ERROR_HANDLING = {
  loadingFailure: {
    retryAttempts: 3,
    fallbackModel: true,
    gracefulDegradation: true,
    userNotification: true,
    errorLogging: true
  },
  
  memoryPressure: {
    unloadDistantModels: true,
    reduceLODAggressively: true,
    compressTextures: true,
    clearModelCache: true,
    alertPerformanceMonitor: true
  },
  
  positioningConflict: {
    findAlternativeLocation: true,
    notifyUser: true,
    logConflict: true,
    suggestResolution: true,
    preserveModelState: true
  },
  
  performanceDegradation: {
    enableAggressiveLOD: true,
    reduceModelQuality: true,
    pauseNonCriticalLoading: true,
    optimizeRendering: true,
    alertDebugSystem: true
  }
}
```

## DEBUG SYSTEM IMPLEMENTATION
Create `debug/glb/GLBDebugPanel.tsx` with:
```typescript
interface GLBDebugPanelProps {
  modelManager: GLBModelManager
  locationManager: ModelLocationManager
  performanceOptimizer: GLBPerformanceOptimizer
  onClose?: () => void
}

interface GLBDebugPanel {
  // Performance monitoring
  showPerformanceMetrics: () => void
  showMemoryUsage: () => void
  showLoadingStats: () => void
  showRenderingStats: () => void
  
  // Model management
  showModelList: () => void
  showModelDetails: (model: GLBModelInstance) => void
  showLocationConfigs: () => void
  showSpatialIndex: () => void
  
  // Testing tools
  loadTestModel: () => void
  stressTestLoading: (count: number) => void
  benchmarkPerformance: () => void
  validateSystem: () => void
  
  // Export tools
  exportModelData: () => void
  exportPerformanceData: () => void
  exportDebugReport: () => void
  generateSystemReport: () => void
}
```

## TESTING VALIDATION

### Unit Tests
- [ ] Model loading and unloading functionality
- [ ] Location-based placement and validation
- [ ] Memory optimization and pooling systems
- [ ] Performance optimization algorithms
- [ ] WorldStore integration and persistence
- [ ] Interaction system and event handling
- [ ] Error handling and recovery mechanisms
- [ ] Debug system and monitoring tools

### Integration Tests
- [ ] GLB system integration with existing world systems
- [ ] Model placement with block system collision detection
- [ ] Performance impact on overall world rendering
- [ ] Memory management during intensive model operations
- [ ] Real-time model updates and synchronization
- [ ] Multi-user model placement and interaction
- [ ] Model persistence across world sessions

### Performance Tests
- [ ] Loading performance with various model sizes
- [ ] Memory usage during intensive model operations
- [ ] Rendering performance with multiple concurrent models
- [ ] LOD system effectiveness and performance impact
- [ ] Caching system efficiency and hit rates
- [ ] Overall system performance under load

## FILES TO CREATE
```
components/glb/
├── GLBModelManager.tsx          # Core model management
├── GLBModelRenderer.tsx         # Model rendering component
├── GLBModelLoader.tsx           # Model loading utilities
├── GLBModelCache.tsx            # Model caching system
├── ModelInteractionSystem.tsx   # Model interaction handling
└── __tests__/
    ├── GLBModelManager.test.tsx
    ├── GLBModelRenderer.test.tsx
    └── ModelInteractionSystem.test.tsx

systems/glb/
├── ModelLocationManager.ts      # Location-based management
├── ModelSpatialIndex.ts         # Spatial indexing system
├── ModelPlacementValidator.ts   # Placement validation
├── ModelPerformanceMonitor.ts   # Performance monitoring
└── __tests__/
    ├── ModelLocationManager.test.ts
    ├── ModelSpatialIndex.test.ts
    └── ModelPlacementValidator.test.ts

store/
├── glbModelStore.ts            # GLB model state management
├── modelLocationStore.ts       # Location configuration store
└── __tests__/
    ├── glbModelStore.test.ts
    └── modelLocationStore.test.ts

optimization/glb/
├── GLBPerformanceOptimizer.ts  # Performance optimization
├── ModelMemoryManager.ts       # Memory management
├── ModelLODSystem.ts           # LOD system implementation
├── ModelCachingSystem.ts       # Caching optimization
└── __tests__/
    ├── GLBPerformanceOptimizer.test.ts
    ├── ModelMemoryManager.test.ts
    └── ModelLODSystem.test.ts

debug/glb/
├── GLBDebugSystem.tsx          # Debug system
├── GLBDebugPanel.tsx           # Debug UI panel
├── ModelInspector.tsx          # Model inspection tools
├── PerformanceMonitor.tsx      # Performance monitoring UI
└── __tests__/
    ├── GLBDebugSystem.test.tsx
    ├── GLBDebugPanel.test.tsx
    └── ModelInspector.test.tsx

types/
├── glbModels.ts                # GLB model types
├── modelLocation.ts            # Location management types
├── modelPerformance.ts         # Performance types
└── modelInteraction.ts         # Interaction types

utils/glb/
├── ModelValidator.ts           # Model validation utilities
├── ModelOptimizer.ts           # Model optimization utilities
├── ModelLoader.ts              # Model loading utilities
└── ModelUtils.ts               # General model utilities

examples/
├── GLBModelExample.tsx         # Basic GLB model example
├── LocationBasedModels.tsx     # Location-based model example
├── PerformanceOptimizationExample.tsx # Performance example
└── InteractionExample.tsx      # Model interaction example
```

## INTEGRATION REQUIREMENTS
- Complete integration with existing worldStore and spatial systems
- Compatibility with current block system and collision detection
- Support for existing camera and player controller systems
- Integration with performance monitoring and optimization systems
- Compatibility with existing GLB model loading infrastructure
- Support for existing animation and material systems
- Integration with debug and development tools
- Compatibility with existing multiplayer and networking systems

## EXPECTED OUTPUT
A complete GLB model location system that:
1. **Enables dynamic model loading** at pre-configured world locations
2. **Optimizes memory usage** for models under 2MB (target <1MB)
3. **Integrates seamlessly** with existing worldStore and spatial systems
4. **Provides modular, reusable components** for different model types
5. **Maintains optimal performance** with multiple concurrent models
6. **Implements comprehensive LOD system** for distant model optimization
7. **Supports interactive model manipulation** and selection
8. **Provides robust error handling** and fallback mechanisms
9. **Includes comprehensive debug tools** for monitoring and analysis
10. **Enables easy extension** and customization for future requirements

The implementation should represent a production-ready GLB model management system that enhances the Descendants metaverse with dynamic, performant, and interactive 3D model placement capabilities while maintaining the existing system's stability and performance standards.
