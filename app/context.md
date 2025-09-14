# App Context

## Overview
Next.js 15 application structure using App Router with server-side rendering optimizations for 3D content.

## Core Files

### `page.tsx` - Main Application Entry
**Primary UI layout and component orchestration:**
- **VoxelCanvas**: Main 3D viewport (dynamically imported for SSR safety)
- **FloatingSidebar**: Modular UI panels (Animation, Simulants, Camera)
- **BlockSelector**: Minecraft-style block selection interface
- **WorldInfo**: Real-time world statistics display
- **ArchipelagoTest**: Development testing interface

### `layout.tsx` - Application Shell
- Global metadata and SEO configuration
- Font loading and CSS integration
- Dark mode and responsive design setup

### `globals.css` - Design System Implementation
- Axiom Design System variables and utilities
- Tailwind CSS v4 integration
- Glassmorphism and glow effect definitions
- Mobile-first responsive design patterns

## Specialized Pages

### `/modular-test/page.tsx`
- Isolated component testing environment
- Development-only testing interface
- Module integration verification

### `/skybox-test/page.tsx`
- Skybox system testing and preview
- Environment transition testing
- Performance benchmarking for skybox rendering

## Key Patterns

### SSR Safety for 3D Content
- Dynamic imports with `ssr: false` for Three.js components
- Loading states with branded loading animations
- Graceful fallbacks for non-WebGL environments

### Responsive Design
- Mobile-first approach with touch-optimized controls
- Adaptive UI scaling for different screen sizes
- Performance optimization for mobile devices

### Accessibility
- Keyboard shortcuts for power users (0-9 for blocks, Cmd+C for camera)
- Screen reader compatible UI elements
- High contrast mode support

## Integration Points
- **State Management**: Direct integration with Zustand stores
- **3D Rendering**: React Three Fiber canvas management
- **Real-time Data**: Supabase integration for multiplayer features
- **AI Integration**: Gemini AI for simulant interactions

## Development Features
- Hot reload with Turbopack for fast development
- Debug panels accessible via keyboard shortcuts
- Performance monitoring integrated into main UI
- Development-only testing components with environment detection
