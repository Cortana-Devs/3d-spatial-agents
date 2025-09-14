# Hooks Context

## Overview
Custom React hooks for the Descendants metaverse, providing reusable logic for 3D interactions and system management.

## Core Hooks

### `useFloorPlacement.ts` - Floor System Integration
- **Floor Positioning**: Calculates optimal Y-levels for floor placement
- **Collision Detection**: Prevents overlapping floor systems
- **Material Management**: Handles floor material transitions and properties
- **Performance Optimization**: Efficient floor rendering and updates

### `useIslandGeneration.ts` - Procedural World Generation
- **Island Creation**: Manages procedural island generation algorithms
- **Resource Management**: Handles memory and performance for large islands
- **Noise Integration**: Connects with noise generators for terrain
- **Real-time Updates**: Progressive island generation without blocking UI

### `useSafeCameraMode.tsx` - Camera System Management
- **Mode Switching**: Safe transitions between camera modes
- **State Persistence**: Maintains camera state across mode changes
- **Performance Monitoring**: Tracks camera-related performance metrics
- **Error Handling**: Graceful fallbacks for camera system failures

### `use-mobile.ts` - Mobile Device Optimization
- **Device Detection**: Identifies mobile/tablet devices and capabilities
- **Performance Scaling**: Adjusts rendering quality for mobile hardware
- **Touch Integration**: Optimizes controls for touch interfaces
- **Battery Optimization**: Reduces resource usage on mobile devices

## Specialized Hook Directories

### `/optimization/` - Performance Hooks
- Advanced performance monitoring and optimization hooks
- GPU memory management integration
- Frame rate optimization and quality adjustment

### `/performance/` - System Performance
- Real-time performance tracking hooks
- Resource usage monitoring
- Automatic quality scaling based on device capabilities

### `/skybox/` - Environment System Hooks
- Skybox loading and transition management
- Environment performance optimization
- Dynamic skybox switching with smooth transitions

## Hook Patterns

### State Management Integration
- Direct integration with Zustand stores
- Optimized selectors for performance
- Automatic cleanup and memory management

### 3D System Integration
- React Three Fiber lifecycle integration
- Three.js object management and cleanup
- Performance-optimized rendering updates

### Error Handling
- Comprehensive error boundaries integration
- Graceful degradation for system failures
- Development-friendly error reporting

## Usage Examples
```typescript
// Floor placement with automatic Y-level calculation
const { placeFloor, validatePlacement } = useFloorPlacement();

// Safe camera mode switching with state persistence
const { setCameraMode, currentMode } = useSafeCameraMode();

// Mobile-optimized rendering with automatic quality scaling
const { isMobile, performanceLevel } = useMobile();
```

## Dependencies
- **React**: Core hook functionality
- **Zustand**: State management integration
- **Three.js**: 3D system integration
- **React Three Fiber**: Canvas and component lifecycle
