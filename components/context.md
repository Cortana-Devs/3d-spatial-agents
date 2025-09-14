# Components Context

## Overview
React components for the Descendants metaverse editor, organized by functional domains.

## Key Directories

### `/world/` - Core 3D World Components
- **VoxelCanvas.tsx** - Main 3D scene with Three.js/R3F integration
- **BlockSelector.tsx** - UI for block type selection  
- **CameraController.tsx** - 3D camera management and presets
- **GridSystem.tsx** - 3D grid overlay and snapping system
- **BlockRenderer.tsx** - Optimized block rendering with instancing

### `/simulants/` - AI Avatar System
- **SimulantManager.tsx** - Manages AI simulants lifecycle
- **ReadyPlayerMeSimulant.tsx** - 3D avatar integration
- **AnimationTestControls.tsx** - Animation testing interface

### `/ui/` - Design System Components
- ShadCN/UI based components with Axiom Design System
- **FloatingPanel.tsx** - Core floating UI pattern
- Uses glassmorphism, ethereal colors, smooth animations

### `/skybox/` - Environment System
- **SkyboxManager.tsx** - Dynamic skybox switching
- **EnhancedSkybox.tsx** - Advanced skybox rendering

### `/debug/` - Development Tools
- **UnifiedDebugPanel.tsx** - Comprehensive debug interface
- **ArchipelagoTest.tsx** - Island generation testing

## Key Patterns
- Dynamic imports for Three.js components (SSR safety)
- Zustand store integration for state management
- Mobile-first responsive design
- Performance monitoring integration
- Error boundaries for 3D content stability

## Entry Points
- Main UI: `app/page.tsx` → `VoxelCanvas.tsx`
- State: `store/worldStore.ts`
- Types: `types/index.ts`
