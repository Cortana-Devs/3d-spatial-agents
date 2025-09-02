# Technology Stack & Development Guide

## Core Technologies

### Frontend Framework
- **Next.js 15** with App Router and Turbopack for fast development
- **React 19** with concurrent features
- **TypeScript 5** for type safety

### 3D Rendering & Performance
- **React Three Fiber** + **Three.js** for 3D scene management
- **@react-three/drei** for 3D utilities and helpers
- **Instanced rendering** for 1000+ blocks at 60 FPS
- **LOD system** with frustum culling for performance optimization
- **WebAssembly** support enabled for future optimizations

### State Management & Data
- **Zustand** with Immer for immutable state updates
- **Supabase** for real-time database and authentication
- **UUID** for unique block identification
- Spatial hash maps for O(1) block lookups

### UI & Styling
- **Tailwind CSS v4** with PostCSS
- **ShadCN/UI** components with class-variance-authority
- **Axiom Design System** - ethereal blues, purples, glassmorphism
- **Lucide React** for consistent iconography

### AI Integration
- **Google Gemini AI** for simulant intelligence
- Chat-based command system for AI-world interaction
- Autonomous agent behavior patterns

### Testing & Quality
- **Vitest** with jsdom environment for unit testing
- **Testing Library** for component testing
- **ESLint** with Next.js configuration
- TypeScript strict mode enabled

## Common Commands

### Development
```bash
pnpm dev          # Start development server with Turbopack
pnpm build        # Production build with Turbopack
pnpm start        # Start production server
pnpm clean        # Clean build artifacts
```

### Testing & Quality
```bash
pnpm test         # Run tests in watch mode
pnpm test:run     # Run tests once
pnpm test:ui      # Run tests with UI
pnpm lint         # Run ESLint
pnpm lint:fix     # Fix ESLint issues
pnpm type-check   # TypeScript type checking
```

### Database & Types
```bash
pnpm supabase:types  # Generate TypeScript types from Supabase schema
```

## Performance Considerations

### 3D Rendering Optimizations
- Use instanced meshes for block counts > 50
- Implement LOD system (high: 0-30u, medium: 30-60u, low: 60u+)
- Enable frustum culling for off-screen blocks
- Reduce geometry complexity at distance
- Use circular buffer for undo/redo (max 50 states)

### Memory Management
- Spatial hash maps instead of arrays for block storage
- Lazy loading of 3D assets
- Particle system cleanup after animations
- Efficient simulant state updates

### Network Optimization
- Real-time sync through Supabase channels
- Batch block operations when possible
- Compress large world state transfers

## Architecture Patterns

### Component Structure
- Separate 3D logic from UI components
- Use custom hooks for complex state logic
- Implement error boundaries for 3D scenes
- Memoize expensive calculations with useMemo

### State Management
- Single world store with Zustand
- Immer for immutable updates
- Subscriptions for real-time features
- Optimistic updates for better UX

### Type Safety
- Strict TypeScript configuration
- Comprehensive type definitions in `/types`
- Runtime validation for external data
- Generic utilities for reusable logic