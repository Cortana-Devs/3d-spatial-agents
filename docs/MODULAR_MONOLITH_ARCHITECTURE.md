# Modular Monolith Architecture Guide

## Overview

**Descendants** implements a **Modular Monolith** architecture pattern that combines the organizational benefits of microservices with the operational simplicity of a monolithic deployment. This approach enables:

- **Independent module development** within a single codebase
- **Clear separation of concerns** with well-defined boundaries
- **Simplified deployment** as a single unit
- **Optimized performance** through shared resources
- **Team scalability** with focused ownership

## Core Principles

### 🧩 Module Independence
Each module operates independently with:
- **Self-contained logic** within module boundaries
- **Clear interfaces** for external communication
- **Isolated state management** with minimal coupling
- **Independent testing** and optimization strategies

### 🔗 Integration Through Contracts
Modules communicate via:
- **Type-safe interfaces** defined in `/types/`
- **Shared state stores** with module-specific slices
- **Event-driven patterns** through custom hooks
- **Integration services** in `/systems/integration/`

### ⚡ Performance Coordination
System-wide optimization through:
- **Centralized monitoring** with distributed metrics
- **Resource sharing** (GPU, memory, rendering pipeline)
- **Quality coordination** across visual modules
- **Performance isolation** for critical paths

## Module Structure

### 📁 Component Modules (`/components/`)

#### **World Module** (`/components/world/`)
**Domain**: 3D scene rendering and world state management
**Responsibilities**:
- Voxel canvas rendering and Three.js integration
- Block placement and manipulation systems
- Camera control and viewport management
- Grid system and spatial positioning
- World state persistence and synchronization

**Interfaces**:
```typescript
// Primary state interface
interface WorldState {
  blocks: BlockData[]
  camera: CameraState
  grid: GridSettings
  performance: WorldPerformanceMetrics
}

// External API
interface WorldModule {
  addBlock(position: Vector3, type: BlockType): void
  removeBlock(position: Vector3): void
  updateCamera(mode: CameraMode): void
  getWorldState(): WorldState
}
```

#### **Simulants Module** (`/components/simulants/`)
**Domain**: AI avatar management and interaction
**Responsibilities**:
- AI simulant lifecycle management
- Ready Player Me avatar integration
- Animation and movement systems
- Gemini AI interaction processing
- Avatar positioning and spatial awareness

**Interfaces**:
```typescript
// Simulant management interface
interface SimulantModule {
  createSimulant(config: SimulantConfig): SimulantId
  moveSimulant(id: SimulantId, position: Vector3): void
  processCommand(id: SimulantId, command: string): Promise<Action[]>
  getSimulantState(id: SimulantId): SimulantState
}
```

#### **Skybox Module** (`/components/skybox/`)
**Domain**: Environment and atmospheric rendering
**Responsibilities**:
- Dynamic skybox switching and management
- Environment state persistence
- Atmospheric effects and lighting integration
- Performance optimization for skybox rendering

#### **UI Module** (`/components/ui/`)
**Domain**: User interface and design system
**Responsibilities**:
- Axiom Design System implementation
- Reusable UI components and patterns
- Responsive design and accessibility
- User interaction and input handling

#### **Debug Module** (`/components/debug/`)
**Domain**: Development tools and monitoring
**Responsibilities**:
- Comprehensive debugging interface
- Module performance monitoring
- Development tools and testing interfaces
- System diagnostics and troubleshooting

### ⚙️ System Orchestration (`/systems/`)

#### **Performance System** (`/systems/performance/`)
**Role**: Cross-module performance coordination
**Services**:
- Real-time performance monitoring
- Adaptive quality management
- GPU memory optimization
- Mobile performance scaling

#### **Integration System** (`/systems/integration/`)
**Role**: Module coordination and communication
**Services**:
- Inter-module event handling
- State synchronization coordination
- Complex interaction management
- Module lifecycle coordination

### 🛠️ Shared Services

#### **Utilities** (`/utils/`)
- **Generation**: Procedural content creation services
- **Performance**: GPU and memory optimization utilities
- **Logging**: Advanced debugging and analytics

#### **State Management** (`/store/`)
- **Module Stores**: Independent state management per module
- **Shared State**: Cross-module state coordination
- **Real-time Sync**: Supabase integration for multiplayer

#### **Type Definitions** (`/types/`)
- **Module Interfaces**: Contract definitions between modules
- **Shared Types**: Common data structures and enums
- **Integration Contracts**: Interface specifications for system communication

## Development Workflow

### Module Development Process

1. **Define Module Scope**
   - Identify domain boundaries and responsibilities
   - Define external interfaces and contracts
   - Establish state management requirements

2. **Create Module Structure**
   ```
   /components/[module-name]/
   ├── index.ts              # Public API exports
   ├── context.md           # Module documentation
   ├── types.ts             # Module-specific types
   ├── store.ts             # Module state management
   ├── hooks/               # Module-specific hooks
   ├── components/          # Internal components
   └── utils/               # Module utilities
   ```

3. **Implement Module Interface**
   - Create type definitions in `/types/`
   - Implement public API in module index
   - Establish state management patterns
   - Add error handling and validation

4. **Integration Testing**
   - Test module in isolation
   - Verify interface contracts
   - Test integration with other modules
   - Performance testing and optimization

### Adding New Features

#### **Within Existing Module**
1. Update module interface if needed
2. Implement feature within module boundaries
3. Update module documentation
4. Test feature integration

#### **Cross-Module Features**
1. Define integration requirements
2. Update shared types and interfaces
3. Implement coordination in `/systems/integration/`
4. Test full integration flow

#### **New Module Creation**
1. Define module domain and responsibilities
2. Create module structure and documentation
3. Implement module interface and contracts
4. Add integration with existing systems
5. Update architecture documentation

## Integration Patterns

### State Coordination
```typescript
// Module-specific store slice
interface WorldStoreSlice {
  worldState: WorldState
  updateWorld: (state: Partial<WorldState>) => void
  // ... module-specific actions
}

// Integration through shared store
const useModuleIntegration = () => {
  const worldState = useWorldStore(state => state.worldState)
  const simulants = useSimulantStore(state => state.simulants)
  
  // Cross-module coordination logic
  return { worldState, simulants }
}
```

### Event-Driven Communication
```typescript
// Module event system
interface ModuleEvents {
  'world:block-placed': { position: Vector3, type: BlockType }
  'simulant:moved': { id: SimulantId, position: Vector3 }
  'performance:quality-changed': { level: QualityLevel }
}

// Event coordination through integration system
const useModuleEvents = () => {
  const emit = useEventEmitter<ModuleEvents>()
  const subscribe = useEventSubscriber<ModuleEvents>()
  
  return { emit, subscribe }
}
```

### Performance Coordination
```typescript
// Performance metrics interface
interface ModulePerformanceMetrics {
  frameTime: number
  memoryUsage: number
  renderCalls: number
  quality: QualityLevel
}

// System-wide performance coordination
const usePerformanceCoordination = () => {
  const metrics = usePerformanceStore(state => state.moduleMetrics)
  const adjustQuality = usePerformanceStore(state => state.adjustQuality)
  
  // Coordinate quality across modules
  return { metrics, adjustQuality }
}
```

## Benefits of This Architecture

### 🚀 Development Benefits
- **Team Independence**: Teams can work on modules without conflicts
- **Clear Ownership**: Each module has defined responsibility boundaries
- **Incremental Development**: Features can be developed and deployed incrementally
- **Technology Evolution**: Modules can evolve independently

### 📈 Performance Benefits
- **Resource Optimization**: Shared GPU, memory, and rendering resources
- **Coordinated Quality**: System-wide quality management
- **Performance Isolation**: Critical modules can be optimized independently
- **Efficient Communication**: Minimal overhead between modules

### 🔧 Maintenance Benefits
- **Focused Debugging**: Issues can be isolated to specific modules
- **Selective Updates**: Deploy changes to individual modules
- **Clear Dependencies**: Well-defined interfaces prevent breaking changes
- **Documentation Alignment**: Module boundaries match documentation structure

### 🎯 Operational Benefits
- **Single Deployment**: Deploy entire application as one unit
- **Simplified Infrastructure**: No need for service mesh or container orchestration
- **Easier Monitoring**: Centralized logging and monitoring
- **Reduced Complexity**: Avoid distributed system challenges

## Best Practices

### Module Design
- **Single Responsibility**: Each module should have one primary domain
- **Clear Interfaces**: Well-defined public APIs with TypeScript contracts
- **Minimal Coupling**: Reduce dependencies between modules
- **Performance Awareness**: Include performance monitoring in each module

### Integration Approach
- **Event-Driven**: Use events for loose coupling between modules
- **State Coordination**: Shared state only for necessary coordination
- **Error Boundaries**: Isolate failures to prevent cascade effects
- **Testing Strategy**: Test modules in isolation and integration

### Development Process
- **Documentation First**: Update module documentation before implementation
- **Interface Stability**: Maintain backward compatibility in module interfaces
- **Performance Testing**: Include performance validation in development workflow
- **Code Review**: Focus on module boundaries and interface contracts

This modular monolith architecture enables **Descendants** to maintain the benefits of a well-organized, scalable codebase while avoiding the operational complexity of a distributed system.