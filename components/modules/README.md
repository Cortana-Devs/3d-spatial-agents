# Modular Performance System

## Overview

This modular system solves the critical performance issue where different systems (Animation, Block Placement, Skybox, Player Controls) were interfering with each other, causing lag and performance degradation. Each module now runs in an isolated performance context with independent frame scheduling.

## 🚨 Problem Solved

**Before**: Animation playback caused lag in block placement, and block placement operations slowed down animations because everything ran in the same render loop.

**After**: Each module has its own performance budget, update frequency, and can skip frames independently without affecting other systems.

## Architecture

### Core Components

```
ModuleManager (Core)
├── AnimationModule (Priority: 7, Target: 30fps)
├── BlockPlacementModule (Priority: 6, Target: 30fps)
├── PlayerControlModule (Priority: 9, Target: 60fps)
└── SkyboxModule (Priority: 2, Target: 1fps)
```

### Module Isolation Features

- **Independent Frame Budgets**: Each module gets a maximum frame time (e.g., 8ms for animations)
- **Priority-Based Scheduling**: Higher priority modules get processed first
- **Frame Rate Targeting**: Modules can run at different target FPS
- **Smart Frame Skipping**: Modules can skip frames when system is under load
- **Performance Monitoring**: Real-time stats for each module

## Usage

### Basic Setup

```tsx
import { ModuleManager, AnimationModule, BlockPlacementModule } from '../modules';

function MyWorld() {
  return (
    <Canvas frameloop="demand"> {/* Important: Use demand-based rendering */}
      <ModuleManager>
        <AnimationModule maxSimulants={20} animationQuality="medium" />
        <BlockPlacementModule debounceMs={16} enableBatching={true} />
        <PlayerControlModule enableMouseLook={true} />
        <SkyboxModule enableDynamicSkybox={false} />
      </ModuleManager>
    </Canvas>
  );
}
```

### Modular Canvas (Recommended)

```tsx
import ModularVoxelCanvas from '../world/ModularVoxelCanvas';

function App() {
  return (
    <ModularVoxelCanvas
      performancePreset="AUTO" // AUTO | HIGH_PERFORMANCE | BALANCED | LOW_END
      enablePerformanceStats={true}
      moduleConfig={{
        enableAnimations: true,
        enableBlockPlacement: true,
        enablePlayerControls: true,
        enableSkybox: true,
      }}
    />
  );
}
```

## Module Details

### AnimationModule

**Purpose**: Handles all simulant animations with LOD (Level of Detail) system

**Performance Features**:
- Distance-based LOD (high/medium/low/culled)
- Adaptive animation quality
- Frame rate limiting (can run at 30fps while maintaining smooth appearance)
- Bone animation toggle for distant simulants

**Configuration**:
```tsx
<AnimationModule
  maxSimulants={20}              // Limit total simulants
  enableLOD={true}               // Distance-based optimization
  animationQuality="medium"      // high | medium | low
  maxAnimationsPerFrame={5}      // Max simulants to update per frame
/>
```

### BlockPlacementModule

**Purpose**: Handles block placement/removal with debounced operations

**Performance Features**:
- Debounced raycasting (prevents excessive calculations)
- Batched operations (groups multiple operations together)
- Limited raycasts per frame
- Intelligent ghost preview

**Configuration**:
```tsx
<BlockPlacementModule
  enableGhostPreview={true}      // Show placement preview
  maxRaycastsPerFrame={2}        // Limit expensive raycasting
  debounceMs={16}                // Debounce mouse movements
  enableBatching={true}          // Batch multiple operations
/>
```

### PlayerControlModule

**Purpose**: First-person/fly camera controls with collision

**Performance Features**:
- Highest priority (never skips frames)
- Smooth movement with configurable damping
- Efficient collision detection
- Pointer lock management

**Configuration**:
```tsx
<PlayerControlModule
  enableKeyboardControls={true}  // WASD movement
  enableMouseLook={true}         // Mouse camera control
  movementSpeed={8.0}            // Units per second
  lookSensitivity={0.002}        // Mouse sensitivity
  smoothing={0.1}                // Movement smoothing
  enableCollision={true}         // Ground collision
/>
```

### SkyboxModule

**Purpose**: Background skybox with minimal performance impact

**Performance Features**:
- Lowest priority and update frequency
- One-time loading with efficient caching
- Optional time-of-day transitions
- Minimal frame time usage

**Configuration**:
```tsx
<SkyboxModule
  skyboxPath="/skyboxes/default/"  // Path to skybox images
  enableDynamicSkybox={false}     // Dynamic switching
  enableTimeOfDay={false}         // Time-based changes
  updateFrequency={0.1}           // Very low update rate
/>
```

## Performance Presets

### AUTO (Recommended)
Automatically detects device capabilities and chooses appropriate settings.

### HIGH_PERFORMANCE
```tsx
{
  animations: { maxSimulants: 30, quality: 'high', maxPerFrame: 8 },
  blockPlacement: { debounce: 8, maxRaycasts: 3, batching: true },
  playerControls: { targetFPS: 60, smoothing: 0.05 }
}
```

### BALANCED
```tsx
{
  animations: { maxSimulants: 20, quality: 'medium', maxPerFrame: 5 },
  blockPlacement: { debounce: 16, maxRaycasts: 2, batching: true },
  playerControls: { targetFPS: 60, smoothing: 0.1 }
}
```

### LOW_END
```tsx
{
  animations: { maxSimulants: 10, quality: 'low', maxPerFrame: 3 },
  blockPlacement: { debounce: 33, maxRaycasts: 1, batching: true },
  playerControls: { targetFPS: 30, smoothing: 0.2 }
}
```

## Module System API

### useModuleSystem Hook

Create custom modules using the module system:

```tsx
function MyCustomModule() {
  const { requestFrame, setEnabled, getStats } = useModuleSystem({
    id: 'my-module',
    priority: 5,
    maxFrameTime: 10,
    targetFPS: 30,
    canSkipFrames: true,
  });

  const updateLoop = useCallback((deltaTime: number) => {
    // Your module logic here
    console.log('Update with delta:', deltaTime);
  }, []);

  React.useEffect(() => {
    requestFrame(updateLoop);
  }, [requestFrame, updateLoop]);

  return <group name="my-custom-module" />;
}
```

### Performance Monitoring

```tsx
import { ModulePerformanceMonitor } from '../modules';

// Shows real-time performance stats for each module
<ModulePerformanceMonitor />
```

## Best Practices

### 1. Module Independence
- ❌ Don't share state directly between modules
- ✅ Use events or stores for communication
- ❌ Don't make one module wait for another
- ✅ Design modules to work independently

### 2. Performance Budgets
- ❌ Don't exceed your module's maxFrameTime
- ✅ Monitor stats and adjust settings accordingly
- ❌ Don't perform expensive operations every frame
- ✅ Use debouncing and batching for heavy operations

### 3. Frame Loop Management
- ❌ Don't use frameloop="always" (causes constant re-renders)
- ✅ Use frameloop="demand" and let modules invalidate when needed
- ❌ Don't put heavy logic in useFrame hooks
- ✅ Use module system for isolated updates

### 4. LOD (Level of Detail)
- ❌ Don't render high-quality animations for distant objects
- ✅ Use distance-based quality reduction
- ❌ Don't update all objects every frame
- ✅ Prioritize visible/important objects

## Debugging

### Performance Issues
1. Check ModulePerformanceMonitor for slow modules
2. Look for modules with high average frame times
3. Check for excessive skipped frames
4. Monitor total frame time in browser dev tools

### Module Conflicts
1. Ensure modules don't share direct state
2. Check for competing event listeners
3. Verify priority settings are appropriate
4. Look for circular dependencies

### Common Problems

**Animations still laggy?**
- Reduce maxSimulants or animationQuality
- Increase maxFrameTime for animation module
- Enable LOD system
- Check if other modules are using too much frame budget

**Block placement feels unresponsive?**
- Reduce debounceMs
- Increase maxRaycastsPerFrame
- Disable batching for immediate feedback
- Check if animation module is consuming too much time

**Controls feel sluggish?**
- Increase player control module priority
- Reduce smoothing value
- Ensure player module can't skip frames
- Check for competing mouse/keyboard handlers

## Migration Guide

### From Old VoxelCanvas

1. Replace `VoxelCanvas` with `ModularVoxelCanvas`
2. Remove custom useFrame hooks for animations/interactions
3. Configure modules instead of managing systems manually
4. Use performance presets instead of manual settings

### Before:
```tsx
<Canvas frameloop="always">
  <SceneContent />
  <ClickHandler />
  <SimulantManager />
</Canvas>
```

### After:
```tsx
<ModularVoxelCanvas
  performancePreset="AUTO"
  moduleConfig={{
    enableAnimations: true,
    enableBlockPlacement: true,
    enablePlayerControls: true,
  }}
/>
```

## Testing

Use the test page to verify module isolation:

```
/modular-test
```

**Test scenarios:**
1. Place many blocks while animations play - no lag
2. Move camera while placing blocks - smooth interaction
3. Toggle modules on/off - no interference
4. Change performance presets - appropriate adjustments

## Future Enhancements

- **Web Workers**: Move heavy computations off main thread
- **Streaming**: Load/unload distant content dynamically
- **Adaptive Quality**: Automatically adjust settings based on performance
- **Module Dependencies**: Allow modules to depend on others gracefully
- **Custom Schedulers**: Different scheduling algorithms for different scenarios