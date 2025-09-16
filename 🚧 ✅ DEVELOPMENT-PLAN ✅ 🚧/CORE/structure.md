# Project Structure & Organization

## Modular Monolith Architecture

**Descendants** implements a **Modular Monolith** architecture that combines the organizational benefits of microservices with the operational simplicity of a single deployable unit. Each module maintains clear boundaries while sharing resources efficiently.

## Directory Structure

```
├── app/                    # 🎯 APPLICATION ORCHESTRATION LAYER
│   ├── globals.css        # Global styles with Tailwind (cross-module)
│   ├── layout.tsx         # Root layout component (module coordination)
│   └── page.tsx           # Main application page (module integration)
├── components/            # 🧩 PRESENTATION MODULES
│   ├── ui/               # 🎨 Design System Module
│   │   └── ShadCN/UI base components with Axiom Design System
│   ├── world/            # 🌍 3D World Rendering Module
│   │   ├── VoxelCanvas.tsx      # Main 3D canvas with optimizations
│   │   ├── BlockSelector.tsx    # Block palette with 3D previews
│   │   ├── WorldInfo.tsx        # World statistics display
│   │   ├── context.md           # Module documentation
│   │   └── __tests__/           # Module-specific tests
│   ├── simulants/        # 🤖 AI Avatar System Module
│   │   ├── SimulantManager.tsx  # AI lifecycle management
│   │   ├── context.md           # Module documentation
│   │   └── __tests__/           # Module-specific tests
│   ├── skybox/           # 🌅 Environment System Module
│   │   ├── SkyboxManager.tsx    # Dynamic environment management
│   │   └── context.md           # Module documentation
│   └── debug/            # 🔧 Development Tools Module
│       ├── UnifiedDebugPanel.tsx # Comprehensive debugging
│       └── context.md           # Module documentation
├── systems/              # ⚡ SYSTEM ORCHESTRATION LAYER
│   ├── performance/      # 📊 Performance Management Module
│   │   ├── PerformanceMonitor.tsx
│   │   ├── AdaptiveQuality.tsx
│   │   └── TransparencyBatcher.tsx
│   ├── integration/      # 🔗 Cross-Module Integration Services
│   │   └── FloorSystemIntegrator.tsx
│   └── context.md        # System-level documentation
├── store/                # 💾 STATE MANAGEMENT LAYER
│   ├── worldStore.ts     # World module state with spatial optimization
│   ├── skyboxStore.ts    # Skybox module state
│   ├── context.md        # State management documentation
│   └── __tests__/        # Store integration tests
├── types/                # 🏷️ SHARED TYPE DEFINITIONS
│   ├── blocks.ts         # Block system types and definitions
│   ├── simulants.ts      # AI simulant type definitions
│   ├── integration.ts    # Cross-module interface contracts
│   └── index.ts          # Consolidated type exports
├── utils/                # 🛠️ SHARED UTILITY MODULES
│   ├── generation/       # 🏝️ Procedural Generation Module
│   │   ├── islands/      # Island generation systems
│   │   ├── context.md    # Module documentation
│   │   └── __tests__/    # Generation module tests
│   ├── performance/      # ⚡ GPU Optimization Module
│   │   └── optimization utilities
│   ├── logging/          # 📋 Advanced Analytics Module
│   │   └── logging and telemetry
│   ├── blockIntegration.ts # Block system integration helpers
│   ├── context.md        # Utility module documentation
│   └── __tests__/        # Cross-module utility tests
├── services/             # 🌐 EXTERNAL SERVICE INTEGRATIONS
│   ├── supabase.ts       # Supabase client configuration
│   └── context.md        # Service integration documentation
├── examples/             # 📚 MODULE INTEGRATION EXAMPLES
│   ├── blockSystemExample.ts    # World module usage
│   ├── simulantExample.ts       # Simulant module usage
│   └── integrationExample.ts    # Cross-module integration
├── docs/                 # 📖 ARCHITECTURE DOCUMENTATION
│   ├── MODULAR_MONOLITH_ARCHITECTURE.md # Complete architecture guide
│   └── module-specific documentation
├── lib/                  # 📚 SHARED LIBRARY CODE
│   └── utils.ts          # General utilities (cn, etc.)
└── .kiro/               # 🤖 KIRO IDE CONFIGURATION
    ├── specs/           # Feature specifications
    └── steering/        # AI assistant guidance
```

## Module Organization Principles

### 🧩 Component Modules (`/components/`)
Each component module follows consistent patterns:
- **Clear Domain Boundaries**: Each directory represents a distinct functional domain
- **Self-Contained Logic**: Module-specific business logic stays within module boundaries
- **Interface Contracts**: Well-defined TypeScript interfaces for external communication
- **Independent Testing**: Module-specific test suites in `__tests__/` directories
- **Documentation**: Each module includes `context.md` with domain knowledge

### ⚙️ System Orchestration (`/systems/`)
Cross-cutting concern management:
- **Performance Coordination**: Unified optimization across all modules
- **Integration Services**: Handles complex inter-module dependencies
- **Resource Management**: Shared GPU, memory, and rendering resources
- **Quality Coordination**: System-wide quality and performance management

### 💾 State Management (`/store/`)
Module-specific state with coordination:
- **Independent Stores**: Each module manages its own state slice
- **Integration Patterns**: Shared state coordination through well-defined interfaces
- **Performance Optimization**: Spatial hash maps, circular buffers, batch operations
- **Real-time Synchronization**: Supabase integration for multiplayer features

## Naming Conventions

### Files & Directories
- **PascalCase** for React components (`VoxelCanvas.tsx`)
- **camelCase** for utilities and services (`blockFactory.ts`)
- **kebab-case** for configuration files (`next.config.ts`)
- **lowercase** for directories (`components/`, `utils/`)

### Code Conventions
- **PascalCase** for types, interfaces, enums (`BlockType`, `WorldState`)
- **camelCase** for variables, functions (`selectedBlockType`, `addBlock`)
- **SCREAMING_SNAKE_CASE** for constants (`BLOCK_DEFINITIONS`, `LOD_CONFIG`)
- **kebab-case** for CSS classes (following Tailwind conventions)

## Component Organization

### World Components (`components/world/`)
- **VoxelCanvas.tsx** - Main 3D scene with performance optimizations
  - Instanced rendering for >50 blocks
  - LOD system and frustum culling
  - Particle effects and animations
- **BlockSelector.tsx** - Interactive block palette with 3D previews
- **WorldInfo.tsx** - Statistics and world state display

### UI Components (`components/ui/`)
- ShadCN/UI base components
- Axiom Design System implementations
- Reusable interactive elements

### Simulant Components (`components/simulants/`)
- AI agent visualization
- Chat interface components
- Simulant behavior displays

## State Management Patterns

### World Store (`store/worldStore.ts`)
- **Spatial Hash Maps** - O(1) block lookups using "x,y,z" keys
- **Immer Integration** - Immutable state updates
- **Circular Buffer** - Efficient undo/redo (max 50 states)
- **Performance Optimizations** - Block counting, batch operations

### Store Structure
```typescript
interface WorldState {
  blockMap: Map<string, Block>     // Spatial hash map
  blockCount: number               // O(1) counting
  selectionMode: SelectionMode     // UI interaction mode
  simulants: Map<string, AISimulant>
  history: CircularBuffer          // Undo/redo system
}
```

## Type System Organization

### Core Types (`types/`)
- **blocks.ts** - Complete block system definitions
  - Block types, materials, validation
  - Factory patterns and utilities
  - Performance-optimized interfaces
- **index.ts** - Consolidated exports and shared types

### Type Patterns
- **Enums** for fixed sets (`BlockType`, `SelectionMode`)
- **Interfaces** for object shapes (`Block`, `WorldState`)
- **Utility types** for transformations and queries
- **Generic constraints** for reusable logic

## Testing Strategy

### Test Organization
- **Component tests** in `__tests__/` subdirectories
- **Unit tests** for utilities and stores
- **Integration tests** for complex interactions
- **Performance tests** for 3D rendering

### Test Patterns
- **Vitest** with jsdom for React components
- **Testing Library** for user interactions
- **Mock implementations** for external services
- **Snapshot testing** for stable UI components

## Performance Architecture

### 3D Rendering Optimization
- **Instanced Meshes** - Single draw call for multiple blocks
- **LOD System** - Distance-based detail reduction
- **Frustum Culling** - Skip off-screen objects
- **Spatial Partitioning** - Efficient collision detection

### Memory Management
- **Object Pooling** - Reuse Three.js objects
- **Lazy Loading** - Load assets on demand
- **Cleanup Patterns** - Dispose of unused resources
- **Efficient Data Structures** - Maps over arrays for lookups

## Integration Patterns

### Supabase Integration
- **Real-time subscriptions** for collaborative features
- **Optimistic updates** for better UX
- **Type generation** from database schema
- **Error handling** for network issues

### AI Integration
- **Gemini API** for simulant intelligence
- **Command parsing** for natural language
- **State synchronization** between AI and world
- **Rate limiting** and error recovery