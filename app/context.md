# App Context

## Overview
Next.js 15 application structure using App Router with server-side rendering optimizations for 3D content. The app layer serves as the **orchestration point** for the modular monolith architecture, coordinating between independent modules while maintaining a unified user experience.

## Modular Architecture Role
The `/app/` directory serves as:
- **Application Orchestration**: Coordinates module initialization and integration
- **Entry Point Management**: Provides controlled access to individual modules
- **Global Configuration**: Manages cross-module settings and environment
- **Performance Coordination**: Optimizes loading and rendering across modules

## Core Files

### `page.tsx` - Module Orchestration Hub
**Primary Role**: Coordinates and integrates all component modules
**Module Coordination**:
- **VoxelCanvas**: Main 3D viewport (dynamically imported for SSR safety)
- **FloatingSidebar**: Modular UI panels (Animation, Simulants, Camera)
- **BlockSelector**: Block selection interface (World module integration)
- **WorldInfo**: Real-time world statistics display
- **ArchipelagoTest**: Development testing interface (Debug module)

**Integration Patterns**:
- Module loading with error boundaries for isolation
- Performance monitoring across all modules
- State coordination through shared stores
- Event handling for inter-module communication

### `layout.tsx` - Application-Wide Configuration
**Primary Role**: Global setup for modular monolith environment
- Global metadata and SEO configuration
- Font loading and CSS integration
- Dark mode and responsive design setup
- Module-agnostic styling and theming

### `globals.css` - Design System Integration
**Primary Role**: Unified styling across all modules
- Axiom Design System variables and utilities
- Tailwind CSS v4 integration
- Glassmorphism and glow effect definitions
- Mobile-first responsive design patterns
- Module-consistent visual language

## Specialized Pages

### `/modular-test/page.tsx` - Module Integration Testing
**Purpose**: Isolated testing environment for module integration
- Individual module testing and validation
- Integration boundary verification
- Development-only module testing interface
- Module performance benchmarking

### `/skybox-test/page.tsx` - Skybox Module Testing
**Purpose**: Dedicated testing for skybox system module
- Skybox module testing and preview
- Environment transition testing
- Performance benchmarking for skybox rendering
- Module isolation testing

## Modular Integration Patterns

### Module Loading Strategy
```typescript
// Dynamic module imports with SSR safety
const VoxelCanvas = dynamic(() => import('@/components/world/VoxelCanvas'), {
  ssr: false,
  loading: () => <ModuleLoadingState module="world" />
})

const SimulantManager = dynamic(() => import('@/components/simulants/SimulantManager'), {
  ssr: false,
  loading: () => <ModuleLoadingState module="simulants" />
})
```

### Module Coordination
- **Error Boundaries**: Each module wrapped in isolated error boundaries
- **Performance Monitoring**: Module-specific performance tracking
- **State Integration**: Coordinated store initialization
- **Event Coordination**: Cross-module event handling setup

## Key Patterns

### SSR Safety for Modular 3D Content
- **Dynamic imports** with `ssr: false` for Three.js components
- **Module-specific loading states** with branded loading animations
- **Graceful fallbacks** for non-WebGL environments
- **Progressive module loading** based on device capabilities

### Responsive Module Integration
- **Mobile-first approach** with touch-optimized controls across modules
- **Adaptive UI scaling** for different screen sizes per module
- **Performance optimization** for mobile devices per module
- **Module-aware responsive breakpoints**

### Accessibility Across Modules
- **Keyboard shortcuts** for power users (0-9 for blocks, Cmd+C for camera)
- **Screen reader compatible** UI elements across all modules
- **High contrast mode** support for all modules
- **Module-consistent accessibility patterns**

## Integration Points

### Cross-Module State Management
- **State Management**: Direct integration with Zustand stores per module
- **Module Coordination**: Shared state slices for inter-module communication
- **Performance Stores**: Unified performance tracking across modules

### External Service Integration
- **3D Rendering**: React Three Fiber canvas management for world module
- **Real-time Data**: Supabase integration for multiplayer features
- **AI Integration**: Gemini AI for simulant module interactions
- **Module Service Coordination**: Unified external service management

## Development Features

### Module Development Support
- **Hot reload** with Turbopack for fast module development
- **Debug panels** accessible via keyboard shortcuts for all modules
- **Performance monitoring** integrated into main UI for all modules
- **Development-only testing** components with environment detection
- **Module isolation** testing and validation tools

### Module Deployment Coordination
- **Unified build process** for all modules
- **Module dependency validation** during build
- **Performance optimization** across module boundaries
- **Module integration testing** in CI/CD pipeline
