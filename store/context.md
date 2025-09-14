# Store Context

## Overview
Zustand-based state management for the Descendants metaverse, optimized for real-time 3D interactions.

## Core Stores

### `worldStore.ts` - Primary World State
**Main state management for the entire 3D world:**
- **Block Management**: Voxel block placement, removal, and updates
- **Camera System**: 3D camera modes and positioning
- **AI Simulants**: Simulant lifecycle, positioning, and interactions
- **Performance Monitoring**: Real-time metrics and optimization
- **Grid System**: 3D grid configuration and visual settings

**Key Features:**
- Immer middleware for immutable updates
- Performance-optimized Map/Set collections
- Real-time synchronization with subscriptions
- Memory management for large block collections
- Type-safe actions with comprehensive validation

### `skyboxStore.ts` - Environment State
**Manages dynamic environment systems:**
- Skybox selection and transitions
- Performance monitoring for environment rendering
- Texture loading and caching states

## Store Architecture

### Middleware Stack
- **Immer**: Immutable state updates with MapSet support
- **subscribeWithSelector**: Selective subscription for performance
- **DevTools**: Development debugging integration

### Performance Optimizations
- Spatial indexing for block queries
- Frustum culling integration
- Memory-efficient simulant management
- Debounced state updates for smooth interactions

### Real-time Integration
- Supabase real-time subscriptions
- Conflict resolution for simultaneous edits
- Optimistic updates for responsive UX
- State synchronization between multiple users

## Usage Patterns
- Actions return success/error states for UI feedback
- Performance metrics tracked automatically
- Type-safe selectors for component integration
- Subscription cleanup for memory management

## Dependencies
- **Zustand**: Core state management
- **Immer**: Immutable updates
- **Three.js**: 3D math integration (Vector3, etc.)
- **UUID**: Unique identifier generation
