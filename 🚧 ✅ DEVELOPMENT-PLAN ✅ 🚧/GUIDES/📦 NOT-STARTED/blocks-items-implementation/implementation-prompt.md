# Blocks & Items Implementation - Comprehensive Development Prompt

## CONTEXT
You are implementing an advanced blocks and items system for the Descendants metaverse that extends beyond basic voxel blocks to include interactive 3D items, tools, furniture, and decorative objects. This system must support both AI simulants and human players with sophisticated interaction mechanics, inventory management, and procedural placement systems.

Current Architecture:
- Existing basic block system (stone, wood, leaf)
- React Three Fiber with Three.js for 3D rendering
- Zustand store for world state management
- RPM character system with animation capabilities
- Player controller system for interaction handling
- Voxel world with 1000-block limit and spatial optimization

## OBJECTIVE
Create a comprehensive blocks and items system that provides rich interactive content, sophisticated 3D models, inventory management, and contextual interactions while maintaining performance and integrating seamlessly with existing world mechanics.

## REQUIREMENTS
- Extended block system with specialized block types and properties
- 3D item system with interactive objects, tools, and furniture
- Advanced placement and interaction mechanics
- Inventory management for both humans and AI simulants
- Procedural generation support for world population
- Performance optimization for complex 3D models
- Contextual interaction system with animation integration

## BLOCK & ITEM CATEGORIES
```typescript
// Extended block system
const BLOCK_CATEGORIES = {
  structural: [
    'stone', 'wood', 'leaf',           // Existing
    'brick', 'metal', 'glass',        // New structural
    'concrete', 'marble', 'granite'    // Premium materials
  ],
  
  functional: [
    'door', 'window', 'stairs',       // Architectural
    'chest', 'workbench', 'furnace',  // Crafting/storage
    'lever', 'button', 'pressure_plate' // Redstone-like
  ],
  
  decorative: [
    'flower', 'torch', 'painting',    // Aesthetic
    'sculpture', 'fountain', 'tree',   // Landscape
    'banner', 'carpet', 'chandelier'   // Interior
  ]
}

// 3D item system
const ITEM_CATEGORIES = {
  tools: [
    'pickaxe', 'shovel', 'axe',       // Mining/building
    'hammer', 'wrench', 'brush',       // Crafting/art
    'measuring_tape', 'level', 'compass' // Precision tools
  ],
  
  furniture: [
    'chair', 'table', 'bed',          // Basic furniture
    'bookshelf', 'desk', 'sofa',      // Office/living
    'cabinet', 'dresser', 'mirror'     // Storage/decor
  ],
  
  interactive: [
    'computer', 'phone', 'tablet',     // Technology
    'book', 'map', 'blueprint',        // Information
    'radio', 'camera', 'telescope'     // Entertainment/utility
  ]
}
```

## IMPLEMENTATION TASKS

### 1. Enhanced Block System
Create `components/blocks/BlockManager.tsx` with:
```typescript
interface EnhancedBlock extends Block {
  category: BlockCategory
  properties: BlockProperties
  interactions: InteractionType[]
  modelPath?: string
  animationStates?: AnimationState[]
  placementRules: PlacementRules
  degradation?: DegradationSettings
}

interface BlockProperties {
  hardness: number
  transparency: number
  lightEmission: number
  conductivity: boolean
  flammable: boolean
  waterlogged: boolean
  rotatable: boolean
  stackable: boolean
}

interface PlacementRules {
  requiresSupport: boolean
  supportDirections: Direction[]
  maxHeight: number
  biomeRestrictions: string[]
  adjacencyRules: AdacencyRule[]
}
```

### 2. 3D Item System
Create `components/items/ItemManager.tsx` with:
```typescript
interface Item3D {
  id: string
  name: string
  category: ItemCategory
  modelPath: string
  icon: string
  description: string
  
  // Physical properties
  size: Vector3
  weight: number
  stackable: boolean
  maxStack: number
  
  // Interaction properties
  interactions: InteractionType[]
  useAnimations: AnimationClip[]
  durability?: number
  
  // Placement properties
  placementMode: 'ground' | 'wall' | 'ceiling' | 'free'
  snapToGrid: boolean
  rotationStep: number
  
  // Behavior properties
  physics: PhysicsProperties
  collision: CollisionProperties
  lighting: LightingProperties
}

interface InteractionType {
  type: 'use' | 'pickup' | 'sit' | 'open' | 'activate'
  requirements: InteractionRequirement[]
  animation: string
  duration: number
  cooldown: number
  effects: InteractionEffect[]
}
```

### 3. Advanced Placement System
Create `utils/placement/PlacementManager.ts` with:
- Intelligent placement validation and suggestions
- Snap-to-grid and free-form placement modes
- Rotation and orientation management
- Collision detection with existing objects
- Preview system with ghosting and validation feedback
- Undo/redo support for complex placements

### 4. Inventory Management System
Create `store/inventoryStore.ts` with:
```typescript
interface InventorySystem {
  // Player inventory
  playerInventory: Map<string, InventorySlot>
  hotbar: InventorySlot[]
  selectedSlot: number
  
  // World storage
  containers: Map<string, Container>
  chests: Map<string, ChestInventory>
  
  // Management functions
  addItem: (item: Item3D, quantity: number) => boolean
  removeItem: (itemId: string, quantity: number) => boolean
  moveItem: (from: InventoryLocation, to: InventoryLocation) => boolean
  
  // AI simulant inventory
  simulantInventories: Map<string, SimulantInventory>
  
  // Interaction functions
  pickupItem: (itemId: string, entityId: string) => boolean
  dropItem: (itemId: string, position: Vector3) => boolean
  transferItem: (from: string, to: string, itemId: string) => boolean
}

interface InventorySlot {
  item: Item3D | null
  quantity: number
  condition: number // 0-1 for durability
  metadata: ItemMetadata
}
```

### 5. Interaction System Integration
Create `components/interaction/InteractionManager.tsx` with:
- Context-sensitive interaction detection
- Animation-driven interaction sequences
- Multi-step interaction workflows
- Permission and ownership systems
- Collaborative interaction for multiple entities

### 6. 3D Model Management
Create `utils/models/ModelManager.ts` with:
- Efficient 3D model loading and caching
- LOD (Level of Detail) system for performance
- Model optimization and compression
- Texture management and sharing
- Memory management for large model collections

## SUCCESS CRITERIA
- [ ] Extended block system supports all new block types with properties
- [ ] 3D items render correctly with interactive behaviors
- [ ] Placement system provides intuitive and precise object positioning
- [ ] Inventory management works for both humans and AI simulants
- [ ] Interaction system integrates seamlessly with existing animation
- [ ] Performance maintains 60 FPS with complex scenes
- [ ] Memory usage optimized with efficient model management
- [ ] Error handling provides graceful degradation and recovery

## PERFORMANCE SPECIFICATIONS
```typescript
const PERFORMANCE_TARGETS = {
  modelLoading: {
    maxLoadTime: 1500,    // ms per model
    maxModelSize: 10,     // MB per model
    concurrentLoads: 5,   // Simultaneous loading
    cacheSize: 200        // MB total cache
  },
  
  rendering: {
    maxDrawCalls: 100,    // Per frame
    lodDistances: {       // LOD switching distances
      high: 20,
      medium: 50,
      low: 100,
      culling: 200
    },
    instanceThreshold: 10 // Use instancing above this count
  },
  
  interaction: {
    detectionRange: 5,    // Units for interaction detection
    responseTime: 50,     // ms for interaction feedback
    animationBlend: 200   // ms for animation transitions
  },
  
  inventory: {
    maxItems: 1000,       // Per inventory
    searchTime: 10,       // ms for inventory search
    updateFrequency: 30   // Hz for inventory updates
  }
}
```

## ERROR HANDLING STRATEGY
```typescript
const ERROR_HANDLING = {
  modelLoadFailure: {
    fallback: 'primitive-shapes',
    retry: true,
    maxRetries: 3,
    cacheFallback: true,
    userNotification: 'silent'
  },
  
  placementValidation: {
    showConstraints: true,
    suggestAlternatives: true,
    preventInvalidPlacement: true,
    audioFeedback: true
  },
  
  inventoryDesync: {
    serverAuthority: true,
    clientPrediction: true,
    conflictResolution: 'merge',
    rollbackOnError: true
  },
  
  interactionFailure: {
    resetEntityState: true,
    cancelAnimation: true,
    provideFeedback: true,
    logForDebugging: true
  }
}
```

## DEBUG SYSTEM IMPLEMENTATION
Create `debug/blocks-items/BlocksItemsDebugger.ts` with:
```typescript
interface BlocksItemsDebugger {
  // Visual debugging
  showBoundingBoxes: (enable: boolean) => void
  showPlacementGrid: (enable: boolean) => void
  showInteractionZones: (enable: boolean) => void
  highlightPlaceableAreas: (enable: boolean) => void
  
  // Performance monitoring
  getModelMemoryUsage: () => number
  getRenderStatistics: () => RenderStats
  getInventoryPerformance: () => InventoryStats
  
  // Interaction debugging
  logInteractionEvents: (enable: boolean) => void
  showInteractionPaths: (enable: boolean) => void
  debugAnimationStates: (enable: boolean) => void
  
  // Testing utilities
  spawnTestItems: (category: ItemCategory, count: number) => void
  stressTestPlacement: (duration: number) => void
  benchmarkModelLoading: (modelPaths: string[]) => void
  simulateInventoryOperations: (operations: number) => void
  
  // Data export
  exportWorldInventory: () => InventorySnapshot
  exportPlacementData: () => PlacementSnapshot
  generatePerformanceReport: () => PerformanceReport
}
```

## TESTING VALIDATION

### Unit Tests
- [ ] Block property validation and behavior
- [ ] Item creation and property assignment
- [ ] Placement rule validation and enforcement
- [ ] Inventory operations (add, remove, transfer)
- [ ] Interaction detection and execution
- [ ] Model loading and caching systems

### Integration Tests
- [ ] Block and item integration with existing world system
- [ ] Interaction system with player controller and animations
- [ ] Inventory synchronization across clients
- [ ] Performance impact on existing rendering pipeline
- [ ] AI simulant interaction with items and blocks

### Performance Tests
- [ ] Model loading time with various file sizes
- [ ] Rendering performance with complex scenes
- [ ] Memory usage with large item collections
- [ ] Inventory operations performance benchmarking
- [ ] Interaction system response time measurement

## FILES TO CREATE
```
components/blocks/
├── BlockManager.tsx              # Enhanced block system
├── BlockRenderer.tsx             # Optimized block rendering
├── BlockPlacer.tsx              # Block placement interface
├── BlockProperties.tsx          # Block property editor
└── __tests__/
    ├── BlockManager.test.tsx
    ├── BlockRenderer.test.tsx
    └── BlockPlacer.test.tsx

components/items/
├── ItemManager.tsx              # 3D item system manager
├── ItemRenderer.tsx             # Item rendering and LOD
├── ItemInteraction.tsx          # Interaction handlers
├── ItemPreview.tsx              # Placement preview system
└── __tests__/
    ├── ItemManager.test.tsx
    ├── ItemRenderer.test.tsx
    └── ItemInteraction.test.tsx

components/inventory/
├── InventoryManager.tsx         # Inventory UI and management
├── InventorySlot.tsx           # Individual slot component
├── ContainerInterface.tsx       # Chest/storage interfaces
├── HotbarManager.tsx           # Quick access toolbar
└── __tests__/
    ├── InventoryManager.test.tsx
    ├── InventorySlot.test.tsx
    └── ContainerInterface.test.tsx

utils/placement/
├── PlacementManager.ts          # Placement logic and validation
├── PlacementPreview.ts          # Preview and ghosting system
├── PlacementRules.ts           # Rule validation engine
├── PlacementOptimizer.ts       # Performance optimization
└── __tests__/
    ├── PlacementManager.test.ts
    ├── PlacementPreview.test.ts
    └── PlacementRules.test.ts

utils/models/
├── ModelManager.ts              # 3D model loading and caching
├── LODManager.ts               # Level of detail management
├── ModelOptimizer.ts           # Model optimization utilities
├── TextureManager.ts           # Texture sharing and management
└── __tests__/
    ├── ModelManager.test.ts
    ├── LODManager.test.ts
    └── ModelOptimizer.test.ts

store/
├── blocksStore.ts              # Enhanced block state management
├── inventoryStore.ts           # Inventory state management
├── itemsStore.ts               # Item definitions and management
└── __tests__/
    ├── blocksStore.test.ts
    ├── inventoryStore.test.ts
    └── itemsStore.test.ts

types/
├── blocks.ts                   # Enhanced block type definitions
├── items.ts                    # Item system type definitions
├── inventory.ts                # Inventory system types
└── interactions.ts             # Interaction system types

debug/blocks-items/
├── BlocksItemsDebugger.ts      # Debug tools and monitoring
├── PerformanceProfiler.ts      # Performance analysis
├── ModelAnalyzer.ts            # 3D model analysis tools
└── DebugPanel.tsx              # React debug interface

examples/
├── blocksExample.tsx           # Block system usage examples
├── itemsExample.tsx            # Item system usage examples
├── inventoryExample.tsx        # Inventory system examples
└── interactionExample.tsx      # Interaction system examples

data/
├── blockDefinitions.ts         # Comprehensive block definitions
├── itemDefinitions.ts          # Comprehensive item definitions
├── interactionDefinitions.ts   # Interaction type definitions
└── placementRules.ts          # Placement rule configurations
```

## INTEGRATION REQUIREMENTS
- Extend existing block system without breaking compatibility
- Integrate with current player controller for interactions
- Use existing animation system for interaction animations
- Maintain compatibility with existing world save/load system
- Support existing performance monitoring and optimization
- Follow established component patterns and architecture
- Integrate with existing AI simulant behavior systems

## EXPECTED OUTPUT
A comprehensive blocks and items system that:
1. **Extends the existing block system** with rich properties and behaviors
2. **Provides sophisticated 3D items** with interactive capabilities
3. **Enables intuitive placement and interaction** mechanics
4. **Manages inventory efficiently** for both humans and AI simulants
5. **Maintains high performance** with complex 3D content
6. **Integrates seamlessly** with existing world systems
7. **Supports AI simulant interactions** with contextual behaviors
8. **Provides comprehensive debugging** and development tools
9. **Enables procedural content** generation and world population
10. **Maintains backward compatibility** with existing worlds

The implementation should demonstrate professional-grade architecture with modular design, comprehensive testing, error resilience, and extensibility for future content additions.
