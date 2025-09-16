# Components Context

## Overview
React components for the Descendants metaverse editor, organized as **independent modules** within the modular monolith architecture. Each module maintains clear boundaries and well-defined interfaces.

## Modular Organization

### Module Principles
- **Domain Separation**: Each directory represents a distinct functional domain
- **Interface Contracts**: Modules communicate through well-defined TypeScript interfaces
- **State Isolation**: Each module manages its own state with minimal cross-dependencies
- **Performance Boundaries**: Modules can be optimized independently

## Module Directories

### `/world/` - 3D World Rendering Module
**Primary Responsibility**: Core 3D scene management and rendering
**Module Interface**: Exposes world state through `worldStore.ts`
**Dependencies**: Three.js, React Three Fiber, performance systems

- **VoxelCanvas.tsx** - Main 3D scene with Three.js/R3F integration
- **BlockSelector.tsx** - UI for block type selection  
- **CameraController.tsx** - 3D camera management and presets
- **GridSystem.tsx** - 3D grid overlay and snapping system
- **BlockRenderer.tsx** - Optimized block rendering with instancing

### `/simulants/` - AI Avatar System Module
**Primary Responsibility**: AI simulant lifecycle and avatar management
**Module Interface**: Communicates with world module for positioning
**Dependencies**: Ready Player Me, Gemini AI, animation systems

- **SimulantManager.tsx** - Manages AI simulants lifecycle
- **ReadyPlayerMeSimulant.tsx** - 3D avatar integration
- **AnimationTestControls.tsx** - Animation testing interface

### `/ui/` - Design System Module
**Primary Responsibility**: Reusable UI components and design patterns
**Module Interface**: Provides standardized UI components
**Dependencies**: ShadCN/UI, Axiom Design System, Tailwind CSS

- ShadCN/UI based components with Axiom Design System
- **FloatingPanel.tsx** - Core floating UI pattern
- Uses glassmorphism, ethereal colors, smooth animations

### `/skybox/` - Environment System Module
**Primary Responsibility**: Dynamic environment and skybox management
**Module Interface**: Manages environment state through `skyboxStore.ts`
**Dependencies**: Three.js skybox systems, performance optimization

- **SkyboxManager.tsx** - Dynamic skybox switching
- **EnhancedSkybox.tsx** - Advanced skybox rendering

### `/debug/` - Development Tools Module
**Primary Responsibility**: Development and debugging interfaces
**Module Interface**: Monitors and provides insights into all other modules
**Dependencies**: All system modules for monitoring

- **UnifiedDebugPanel.tsx** - Comprehensive debug interface
- **ArchipelagoTest.tsx** - Island generation testing

## Module Integration Patterns

### Inter-Module Communication
- **Type Contracts**: Shared interfaces in `/types/` ensure module compatibility
- **State Coordination**: Zustand stores with module-specific slices
- **Event System**: Custom hooks and context for cross-module events
- **Performance Integration**: All modules report to performance monitoring system

### Development Guidelines
- **Module Independence**: Each module can be developed and tested independently
- **Clear Boundaries**: No direct imports between module directories
- **Shared Resources**: Common utilities accessed through `/utils/` and `/hooks/`
- **Integration Layer**: Complex interactions managed through `/systems/integration/`

## Key Patterns
- **Dynamic imports** for Three.js components (SSR safety)
- **Zustand store integration** for state management
- **Mobile-first responsive design** across all modules
- **Performance monitoring integration** with module-specific metrics
- **Error boundaries** for 3D content stability and module isolation

## Entry Points
- **Main UI**: `app/page.tsx` → `VoxelCanvas.tsx`
- **State**: `store/worldStore.ts`
- **Types**: `types/index.ts`
- **Module Coordination**: `/systems/integration/`
