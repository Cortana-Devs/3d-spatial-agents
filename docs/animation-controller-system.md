# Animation Controller System

The Animation Controller System provides a sophisticated state machine for managing Ready Player Me avatar animations with smooth transitions, priority-based selection, and advanced blending capabilities.

## Overview

The system consists of three main components:

1. **AnimationController** - Core state machine and animation management
2. **useAnimationController** - React hook for integration with simulant state
3. **Enhanced Animation Mapping** - Priority-based animation selection system

## Features

- 🎯 **Smart Action Mapping** - Automatically maps simulant actions to appropriate animation states
- 🔄 **Smooth Transitions** - Configurable cross-fade transitions between animation states
- 📊 **Priority System** - Primary and fallback animations with priority-based selection
- 🎭 **State Machine** - Robust state transition rules with interrupt handling
- 🎨 **Animation Blending** - Support for layered animations with weight management
- ⚡ **Performance Optimized** - LOD system and efficient update loops
- 🐛 **Debug Support** - Comprehensive debugging and monitoring tools

## Quick Start

### Basic Usage

```typescript
import { useAnimationController } from '../utils/useAnimationController'
import { useRPMAnimations } from '../utils/useRPMAnimations'
import { useExternalAnimations } from '../utils/useExternalAnimations'

function AnimatedSimulant({ simulant }: { simulant: AISimulant }) {
  // Load avatar and animations
  const avatarGLTF = useGLTF('/models/player_ReadyPlayerMe.glb')
  const externalClips = useExternalAnimations([
    '/animation_GLB/F_Standing_Idle_Variations_001.glb',
    '/animation_GLB/M_Walk_001.glb',
    '/animation_GLB/M_Run_001.glb'
  ])

  // Initialize animation manager
  const animationManager = useRPMAnimations(avatarGLTF, externalClips, {
    autoPlay: 'idle',
    crossFadeDuration: 0.3
  })

  // Initialize animation controller
  const animationController = useAnimationController(animationManager, simulant, {
    autoTransition: true,
    enableBlending: true
  })

  return (
    <primitive object={avatarGLTF.scene} />
  )
}
```

### Manual State Control

```typescript
// Manually transition to specific states
animationController.transitionTo('walking')
animationController.transitionTo('jumping', { force: true, customDuration: 0.1 })

// Check if transitions are allowed
if (animationController.state.canTransition('running')) {
  animationController.transitionTo('running')
}

// Map actions to states
const state = animationController.mapActionToState('building a house')
console.log(state) // 'building'
```

### Animation Blending

```typescript
// Add blend animations for complex behaviors
animationController.addBlendAnimation('M_Walk_001', 0.3, {
  timeScale: 0.8,
  fadeIn: 0.5
})

// Adjust blend weights
animationController.setBlendWeight('M_Walk_001', 0.7)

// Remove blend animations
animationController.removeBlendAnimation('M_Walk_001', 0.3)
```

## Animation States

The system supports the following animation states:

| State | Priority | Description | Looping |
|-------|----------|-------------|---------|
| `idle` | 1 | Default resting state | ✅ |
| `thinking` | 1 | Contemplative poses | ✅ |
| `building` | 2 | Construction actions | ✅ |
| `communicating` | 2 | Talking and gesturing | ✅ |
| `celebrating` | 2 | Victory and joy expressions | ✅ |
| `walking` | 3 | Basic locomotion | ✅ |
| `running` | 4 | Fast locomotion | ✅ |
| `jumping` | 5 | One-shot jump action | ❌ |

## Animation Mapping

The system uses a priority-based mapping system with primary and fallback animations:

```typescript
export const ENHANCED_ANIMATION_MAPPING = {
  idle: {
    primary: ['idle_female_1', 'idle_female_2', 'idle_female_3'],
    fallback: ['tpose_male'],
    priority: 1,
    looping: true,
    timeScale: 1.0,
    blendWeight: 1.0
  },
  walking: {
    primary: ['walk_male'],
    fallback: ['crouch_walk_male'],
    priority: 3,
    looping: true,
    timeScale: 1.0,
    blendWeight: 1.0
  }
  // ... more mappings
}
```

## Action to State Mapping

The controller automatically maps simulant actions to animation states:

| Action Keywords | Animation State |
|----------------|----------------|
| jump, leap | `jumping` |
| run, sprint, rush | `running` |
| walk, move, go | `walking` |
| build, place, construct, create | `building` |
| talk, say, communicate, speak | `communicating` |
| think, consider, analyze, ponder | `thinking` |
| celebrate, dance, cheer, victory | `celebrating` |
| *default* | `idle` |

## State Transitions

The system includes a comprehensive state machine with transition rules:

```typescript
// High priority transitions (can interrupt anything)
{ from: 'walking', to: 'jumping', priority: 5, duration: 0.1 }

// Movement transitions
{ from: 'idle', to: 'walking', priority: 3, duration: 0.3 }
{ from: 'walking', to: 'running', priority: 4, duration: 0.3 }

// Return to idle transitions
{ from: 'building', to: 'idle', priority: 1, duration: 0.5 }
```

## Idle Animation Cycling

The system now supports automatic cycling between idle animation variations to create more natural and varied idle behavior:

```typescript
// Enable idle cycling in the animation controller
const animationController = useAnimationController(animationManager, simulant, {
  enableIdleCycling: true,    // Enable automatic idle cycling
  idleCycleInterval: 8000,    // Cycle every 8 seconds
  enableLogging: true         // See cycling in console
})

// Manual control of idle cycling
animationController.startIdleCycling(6000)  // Start with 6s interval
animationController.stopIdleCycling()       // Stop cycling
animationController.getCurrentIdleIndex()   // Get current idle variation index
```

### How Idle Cycling Works

1. **Automatic Detection**: When a simulant enters the `idle` state, cycling automatically starts
2. **Variation Selection**: The system cycles through available idle animations (`idle_female_1`, `idle_female_2`, `idle_female_3`)
3. **Smooth Transitions**: Each cycle uses a smooth cross-fade transition (0.5s duration)
4. **State Awareness**: Cycling stops when the simulant transitions to any other state
5. **Configurable Timing**: Default 8-second intervals, customizable per simulant

## Configuration Options

### AnimationController Options

```typescript
interface AnimationControllerOptions {
  enableLogging?: boolean      // Enable debug logging
  initialState?: AnimationState // Starting animation state
}
```

### useAnimationController Options

```typescript
interface UseAnimationControllerOptions {
  enableLogging?: boolean      // Enable debug logging
  autoTransition?: boolean     // Auto-transition on action changes
  transitionDelay?: number     // Debounce delay in milliseconds
  enableBlending?: boolean     // Enable animation blending
  enableIdleCycling?: boolean  // Enable automatic idle animation cycling
  idleCycleInterval?: number   // Idle cycling interval in milliseconds
}
```

## Performance Optimization

### LOD System

The animation system supports Level of Detail (LOD) optimization:

```typescript
// Adjust quality based on distance
if (distance > 50) {
  animationManager.setLODLevel('low')    // Reduced update frequency
} else if (distance > 20) {
  animationManager.setLODLevel('medium') // Balanced performance
} else {
  animationManager.setLODLevel('high')   // Full quality
}
```

### Memory Management

```typescript
// Pause animations when not needed
animationManager.pauseAllAnimations()

// Resume when needed
animationManager.resumeAllAnimations()

// Clean up resources
animationController.dispose()
```

## Debugging

### Debug Information

```typescript
const debugInfo = animationController.getDebugInfo()
console.log({
  currentState: debugInfo.currentState,
  previousState: debugInfo.previousState,
  isTransitioning: debugInfo.isTransitioning,
  transitionProgress: debugInfo.transitionProgress,
  availableAnimations: debugInfo.availableAnimations,
  activeBlends: debugInfo.activeBlends
})
```

### State Monitoring

```typescript
// Monitor state changes
console.log('Current state:', animationController.state.currentState)
console.log('Is transitioning:', animationController.state.isTransitioning)
console.log('Transition progress:', animationController.state.transitionProgress)

// Check transition capabilities
const canJump = animationController.state.canTransition('jumping')
console.log('Can jump:', canJump)
```

## Advanced Usage

### Custom State Machine

```typescript
// Create custom transition rules
const customTransitions = [
  {
    from: 'idle',
    to: 'custom_state',
    condition: (simulant) => simulant.status === 'special',
    config: { duration: 0.5, priority: 3 }
  }
]
```

### Complex Behaviors

```typescript
// Create multi-step animation sequences
const createBuildingSequence = async () => {
  await animationController.transitionTo('thinking')
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  await animationController.transitionTo('building')
  animationController.addBlendAnimation('M_Standing_Expressions_013', 0.2)
  await new Promise(resolve => setTimeout(resolve, 5000))
  
  await animationController.transitionTo('celebrating')
}
```

### Performance Monitoring

```typescript
const performanceMonitor = {
  transitionCount: 0,
  startTime: Date.now(),
  
  trackTransition: () => {
    performanceMonitor.transitionCount++
  },
  
  getStats: () => ({
    uptime: Date.now() - performanceMonitor.startTime,
    transitionsPerMinute: performanceMonitor.transitionCount / 
      ((Date.now() - performanceMonitor.startTime) / 60000),
    memoryUsage: (performance as any).memory?.usedJSHeapSize || 0
  })
}
```

## Error Handling

The system includes comprehensive error handling:

- **Missing Animations**: Falls back to available animations or T-pose
- **Invalid Transitions**: Logs warnings and maintains current state
- **Performance Issues**: Automatically reduces quality when needed
- **Memory Pressure**: Cleans up unused resources

## Testing

The system includes comprehensive test suites:

```bash
# Run animation controller tests
pnpm test utils/__tests__/animationController.test.ts

# Run hook tests
pnpm test utils/__tests__/useAnimationController.test.ts
```

## Examples

See `examples/animationControllerExample.ts` for comprehensive usage examples including:

- Basic animation controller setup
- Advanced behaviors with blending
- Custom animation mappings
- Performance optimization strategies

## API Reference

### AnimationController Class

#### Methods

- `getCurrentState(): AnimationState` - Get current animation state
- `getPreviousState(): AnimationState` - Get previous animation state
- `isInTransition(): boolean` - Check if currently transitioning
- `getTransitionProgress(): number` - Get transition progress (0-1)
- `mapActionToAnimationState(action: string): AnimationState` - Map action to state
- `getAnimationForState(state: AnimationState): string | null` - Get animation name for state
- `canTransitionTo(newState: AnimationState): boolean` - Check if transition is allowed
- `transitionTo(newState: AnimationState, options?): boolean` - Transition to new state
- `setBlendAnimation(name: string, config: BlendAnimation): void` - Add blend animation
- `removeBlendAnimation(name: string): void` - Remove blend animation
- `setBlendWeight(animationName: string, weight: number): void` - Set blend weight
- `update(deltaTime: number): void` - Update controller (call in animation loop)
- `getDebugInfo(): object` - Get debug information
- `dispose(): void` - Clean up resources

### useAnimationController Hook

#### Returns

- `state: AnimationControllerState` - Current controller state
- `transitionTo(state, options?): boolean` - Transition to new state
- `mapActionToState(action): AnimationState` - Map action to state
- `setBlendWeight(name, weight): void` - Set blend weight
- `addBlendAnimation(name, weight, options?): void` - Add blend animation
- `removeBlendAnimation(name, fadeOut?): void` - Remove blend animation
- `getDebugInfo(): object` - Get debug information
- `getAvailableStates(): AnimationState[]` - Get available states

## Requirements Satisfied

This implementation satisfies the following requirements from the spec:

- **3.1-3.5**: Smooth animation playback with seamless transitions ✅
- **8.1-8.5**: Mixamo-compatible system with proper bone mapping ✅
- **Priority system**: Primary and fallback animation options ✅
- **State machine**: Smooth transitions between animation states ✅
- **Animation blending**: Weight management and layered animations ✅

The system provides a robust, performant, and extensible foundation for managing complex animation behaviors in the Ready Player Me simulant system.