# Project Structure & Organization

## Directory Structure

```
├── app/                    # Next.js App Router
│   ├── globals.css        # Global styles with Tailwind
│   ├── layout.tsx         # Root layout component
│   └── page.tsx           # Main application page
├── components/            # React components
│   ├── ui/               # ShadCN/UI base components
│   ├── world/            # 3D world-specific components
│   │   ├── VoxelCanvas.tsx      # Main 3D canvas with optimizations
│   │   ├── BlockSelector.tsx    # Block palette with 3D previews
│   │   ├── WorldInfo.tsx        # World statistics display
│   │   └── __tests__/           # Component tests
│   └── simulants/        # AI simulant components
├── store/                # Zustand state management
│   ├── worldStore.ts     # Main world state with spatial optimization
│   └── __tests__/        # Store tests
├── types/                # TypeScript definitions
│   ├── blocks.ts         # Block system types and definitions
│   └── index.ts          # Consolidated type exports
├── utils/                # Utility functions
│   ├── blockFactory.ts   # Block creation utilities
│   ├── blockValidation.ts # Block validation logic
│   ├── blockIntegration.ts # Integration helpers
│   └── __tests__/        # Utility tests
├── services/             # External service integrations
│   └── supabase.ts       # Supabase client configuration
├── examples/             # Usage examples and documentation
│   └── blockSystemExample.ts # Comprehensive block system demo
├── lib/                  # Shared library code
│   └── utils.ts          # General utilities (cn, etc.)
└── .kiro/               # Kiro IDE configuration
    ├── specs/           # Feature specifications
    └── steering/        # AI assistant guidance
```

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