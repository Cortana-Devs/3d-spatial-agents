# Avatar Animation System Documentation

## Overview

The Avatar Animation System provides a comprehensive, semantic-based animation framework for Ready Player Me avatars with intelligent gender-aware asset resolution, multi-layer blending, and liveliness features.

## Features

- **Semantic Animation Keys**: Human-readable animation identifiers (e.g., `locomotion.walk.forward`)
- **Gender-Aware Resolution**: Automatic fallback between masculine/feminine armature animations
- **Multi-Layer Blending**: Locomotion, expression, emote, and additive animation layers
- **Intelligent Caching**: Priority-based preloading with memory management
- **Liveliness System**: Automatic idle variations and micro-expressions
- **Performance Optimization**: LOD support and configurable quality settings
- **React Integration**: Hooks and components for seamless React/Three.js integration

## Quick Start

### Basic Usage

```tsx
import { AnimatedAvatar } from '@/components/AnimatedAvatar';
import { ActiveAvatarModelProvider } from '@/src/hooks/useActiveAvatarModel';

function App() {
  return (
    <ActiveAvatarModelProvider autoLoadFemaleRuntime={true}>
      <AnimatedAvatar 
        showControls={true}
        showStats={true}
        enableLogging={true}
      />
    </ActiveAvatarModelProvider>
  );
}
```

### Using the Hook Directly

```tsx
import useAvatarAnimator from '@/hooks/useAvatarAnimator';
import { useActiveAvatarModel } from '@/src/hooks/useActiveAvatarModel';

function MyAvatarComponent() {
  const { modelUrl, isFemale } = useActiveAvatarModel();
  const { scene } = useGLTF(modelUrl);
  const avatarRef = useRef();
  
  const animator = useAvatarAnimator(avatarRef.current, {
    autoPreload: true,
    enableIdleCycling: true,
    performanceMode: 'balanced'
  });

  // Control animations
  useEffect(() => {
    animator.setLocomotionState('walking');
    animator.startTalking(0.7); // 70% intensity
    animator.triggerEmote('dance-casual');
  }, []);

  return <primitive ref={avatarRef} object={scene} />;
}
```

## Architecture

### Animation Registry

The system uses a centralized registry that maps semantic keys to gender-aware file paths:

```typescript
const registry = {
  'locomotion.walk.forward': {
    feminine: '/animations/.../feminine/glb/locomotion/F_Walk_002.glb',
    masculine: '/animations/.../masculine/glb/locomotion/M_Walk_002.glb',
    meta: {
      category: 'locomotion',
      loop: true,
      priority: 10,
      blendHint: 'locomotion',
      captureGender: 'F',
      styleTags: ['natural', 'standard'],
      defaultCrossFade: 0.25
    }
  }
};
```

### Animation Layers

The system uses multiple animation layers for complex blending:

1. **Locomotion Layer** (Full body) - Walking, running, idle
2. **Expression Layer** (Upper body) - Talking, facial expressions
3. **Emote Layer** (Full body override) - Dances, gestures
4. **Additive Layer** (Subtle) - Breathing, micro-movements

### Gender Resolution

Animations are automatically resolved based on avatar gender with intelligent fallback:

```typescript
// For feminine avatar:
// 1. Try feminine variant first
// 2. Fallback to masculine if not available
// 3. Apply capture preference if specified

const clip = await animationLoader.loadAnimation(
  'locomotion.walk.forward',
  'feminine',
  { preferCapture: 'F', allowFallback: true }
);
```

## Semantic Animation Keys

### Locomotion

#### Idle States
- `locomotion.idle.primary` - Main idle animation
- `locomotion.idle.variant.1-9` - Idle variations for liveliness

#### Walking
- `locomotion.walk.forward.normal` - Standard walking
- `locomotion.walk.forward.alt` - Alternative walking style
- `locomotion.walk.backward` - Walking backward
- `locomotion.walk.strafe.left/right` - Side-stepping

#### Jogging
- `locomotion.jog.forward` - Forward jogging
- `locomotion.jog.backward` - Backward jogging
- `locomotion.jog.strafe.left/right` - Jogging strafing

#### Running
- `locomotion.run.forward` - Fast running
- `locomotion.run.backward` - Running backward
- `locomotion.run.strafe.left/right` - Running strafing

#### Crouching
- `locomotion.crouch.walk` - Crouched walking
- `locomotion.crouch.strafe.left/right` - Crouched strafing

#### Jumping & Falling
- `locomotion.jump.walk/jog/run` - Jump variations by speed
- `locomotion.fall.idle/loop` - Falling animations

### Expressions

#### Talking
- `expression.talk.variant.1-6` - Talking variations by intensity

#### Facial Expressions
- `expression.face.neutral` - Neutral expression
- `expression.face.happy` - Happy expression
- `expression.face.surprised` - Surprised expression
- `expression.face.thinking` - Thoughtful expression
- `expression.face.confused` - Confused expression
- `expression.face.excited` - Excited expression

### Emotes

#### Dances
- `emote.dance.casual.1-2` - Casual dance moves
- `emote.dance.energetic.1-2` - High-energy dances
- `emote.dance.rhythmic.1-2` - Rhythmic dance styles
- `emote.dance.freestyle.1-2` - Freestyle expressions

## API Reference

### useAvatarAnimator Hook

```typescript
const animator = useAvatarAnimator(avatarScene, options);
```

#### Options
```typescript
interface UseAvatarAnimatorOptions {
  autoPreload?: boolean;                    // Auto-preload animations
  maxPreloadPriority?: number;              // Max priority for preloading
  enableIdleCycling?: boolean;              // Enable automatic idle variations
  idleCycleInterval?: [number, number];     // Idle cycle timing range (ms)
  enableMicroExpressions?: boolean;         // Enable random expressions
  expressionInterval?: [number, number];    // Expression timing range (ms)
  enableLOD?: boolean;                      // Enable performance optimization
  performanceMode?: 'quality' | 'balanced' | 'performance';
  enableLogging?: boolean;                  // Enable debug logging
  customRegistry?: AnimationRegistry;       // Custom animation registry
}
```

#### Methods

**Animation Control**
```typescript
// Play animation by semantic key
await animator.playAnimation('locomotion.walk.forward', {
  loop: true,
  crossFade: 0.3,
  layer: 'locomotion',
  weight: 1.0
});

// Stop animation
animator.stopAnimation('locomotion.walk.forward', 0.5);
```

**State Control**
```typescript
// Set locomotion state (triggers appropriate animation)
animator.setLocomotionState('walking');

// Set expression state
animator.setExpressionState('happy');

// Set emote state
await animator.setEmoteState('dance-casual');
```

**Locomotion Control**
```typescript
// Set velocity (auto-transitions between walk/jog/run)
animator.setVelocity(new Vector3(0, 0, 2)); // Forward at 2 units/sec

// Toggle crouching
animator.setCrouch(true);
```

**Expression Control**
```typescript
// Start talking with intensity
animator.startTalking(0.7); // 70% intensity

// Stop talking
animator.stopTalking();

// Trigger temporary expression
animator.triggerExpression('surprised', 3000); // 3 seconds
```

**Emote Control**
```typescript
// Trigger dance emote
await animator.triggerEmote('dance-energetic');

// Stop current emote
animator.stopEmote();
```

**System Control**
```typescript
// Manually preload animations
await animator.preloadAnimations();

// Dispose resources
animator.dispose();
```

### Animation Loader Service

```typescript
import { getAnimationLoader } from '@/services/animationLoader';

const loader = getAnimationLoader();

// Load single animation
const clip = await loader.loadAnimation(
  'locomotion.walk.forward',
  'feminine',
  { preferCapture: 'F' }
);

// Preload by priority
await loader.preloadAnimations({
  maxPriority: 40,
  gender: 'feminine',
  concurrency: 4
});

// Get cache statistics
const stats = loader.getCacheStats();
console.log(`Cache: ${stats.totalItems} items, ${stats.memoryUsageMB}MB`);
```

## Configuration

### Performance Modes

**Quality Mode**
- 60 FPS update frequency
- Full blending enabled
- Maximum animation layers
- High idle variation chance

**Balanced Mode** (Default)
- 30 FPS update frequency
- Selective blending
- Moderate animation layers
- Medium idle variation chance

**Performance Mode**
- 15 FPS update frequency
- Minimal blending
- Essential animations only
- Low idle variation chance

### Preload Priorities

```typescript
export const PRIORITY_TIERS = {
  CRITICAL: 0,      // Core locomotion + primary idle
  HIGH: 20,         // All locomotion variants
  MEDIUM: 40,       // Expressions + talking
  LOW: 60,          // Dances + emotes
  OPTIONAL: 80      // Extended sets
};
```

### Animation Timings

```typescript
export const DEFAULT_TIMINGS = {
  LOCOMOTION_CROSSFADE: 0.25,    // Locomotion transitions
  IDLE_CROSSFADE: 0.8,           // Idle variations
  EXPRESSION_CROSSFADE: 0.4,     // Expression changes
  EMOTE_FADE_IN: 0.35,           // Emote start
  EMOTE_FADE_OUT: 0.5,           // Emote end
  JUMP_TRANSITION: 0.15,         // Jump start
  LAND_TRANSITION: 0.2           // Landing
};
```

## Advanced Usage

### Custom Animation Registry

```typescript
import { AnimationRegistry } from '@/types/animationRegistry';

const customRegistry: AnimationRegistry = {
  'custom.special.move': {
    feminine: '/custom/animations/special_move_f.glb',
    masculine: '/custom/animations/special_move_m.glb',
    meta: {
      category: 'emote',
      loop: false,
      oneShot: true,
      priority: 50,
      blendHint: 'fullbody',
      duration: 2.5
    }
  }
};

const animator = useAvatarAnimator(scene, {
  customRegistry
});
```

### Event-Driven Animation

```typescript
// Listen for avatar changes
import { onAvatarChanged } from '@/src/state/avatarSelectionStore';

onAvatarChanged(({ previous, next }) => {
  console.log(`Avatar changed from ${previous} to ${next}`);
  // Animations automatically switch based on new gender
});

// Custom animation triggers
function handleUserAction(action: string) {
  switch (action) {
    case 'celebrate':
      animator.triggerEmote('dance-energetic');
      break;
    case 'think':
      animator.triggerExpression('thinking', 5000);
      break;
    case 'greet':
      animator.startTalking(0.5);
      setTimeout(() => animator.stopTalking(), 3000);
      break;
  }
}
```

### Performance Monitoring

```typescript
// Monitor cache performance
const loader = getAnimationLoader();

loader.onLoadProgress((state) => {
  console.log(`Loading: ${state.loaded}/${state.total} (${state.failed} failed)`);
});

loader.onLoadError((error, path) => {
  console.error(`Failed to load ${path}: ${error}`);
});

// Get debug information
const debugInfo = animator.getDebugInfo();
console.log('Active layers:', debugInfo.activeLayers);
console.log('Cache stats:', debugInfo.cache);
```

### Integration with AI Systems

```typescript
// Connect to AI simulant behavior
function connectToSimulant(simulant: AISimulant) {
  // Map AI actions to animations
  const actionMap = {
    'idle': () => animator.setLocomotionState('idle'),
    'moving': () => animator.setVelocity(simulant.velocity),
    'speaking': () => animator.startTalking(simulant.speechIntensity),
    'thinking': () => animator.triggerExpression('thinking'),
    'celebrating': () => animator.triggerEmote('dance-casual')
  };

  // Listen for behavior changes
  simulant.onBehaviorChange((behavior) => {
    const action = actionMap[behavior.type];
    if (action) action();
  });
}
```

## Troubleshooting

### Common Issues

**Animation Not Loading**
```typescript
// Check if animation exists in registry
import { ANIMATION_REGISTRY } from '@/data/animationRegistry';
console.log(ANIMATION_REGISTRY['locomotion.walk.forward']);

// Check cache status
const loader = getAnimationLoader();
const isCached = loader.isCached('locomotion.walk.forward', 'feminine');
```

**Performance Issues**
```typescript
// Switch to performance mode
const animator = useAvatarAnimator(scene, {
  performanceMode: 'performance',
  enableLOD: true,
  maxPreloadPriority: 20 // Only load critical animations
});

// Monitor cache memory usage
const stats = loader.getCacheStats();
if (stats.memoryUtilizationPercent > 80) {
  loader.clearCache(); // Free memory
}
```

**Animation Conflicts**
```typescript
// Ensure proper layer separation
animator.playAnimation('locomotion.walk.forward', { layer: 'locomotion' });
animator.playAnimation('expression.talk.variant.1', { layer: 'expression' });

// Check debug info for conflicts
const debug = animator.getDebugInfo();
console.log('Active actions:', debug.activeActions);
```

### Debug Tools

**Enable Logging**
```typescript
const animator = useAvatarAnimator(scene, {
  enableLogging: true
});

// Logs will show:
// 🎬 Loading animation: locomotion.walk.forward from /path/to/file.glb
// ✅ Loaded animation: locomotion.walk.forward (45.23ms, ~12.3KB)
// 🎭 Switched to idle variant: locomotion.idle.variant.2
```

**Performance Stats**
```typescript
// Use the AnimatedAvatar component with stats
<AnimatedAvatar showStats={true} showDebugInfo={true} />

// Or access stats directly
const stats = loader.getCacheStats();
console.log(`Cache utilization: ${stats.utilizationPercent}%`);
```

## Migration Guide

### From Existing Animation System

1. **Replace hardcoded paths with semantic keys**:
```typescript
// Old
useGLTF('/animations/walking.glb');

// New
animator.playAnimation('locomotion.walk.forward');
```

2. **Update state management**:
```typescript
// Old
setAnimationState('walking');

// New
animator.setLocomotionState('walking');
```

3. **Migrate gender-specific logic**:
```typescript
// Old
const modelPath = isFemale ? '/models/female.glb' : '/models/male.glb';

// New - handled automatically
const { modelUrl } = useActiveAvatarModel();
```

## Best Practices

1. **Use semantic keys consistently** - Don't mix file paths and semantic keys
2. **Preload critical animations** - Set appropriate priority levels
3. **Layer animations properly** - Use correct layers for different animation types
4. **Monitor performance** - Watch cache usage and frame rates
5. **Handle gender transitions gracefully** - Let the system manage asset switching
6. **Use appropriate crossfade timings** - Different animation types need different timings
7. **Dispose resources** - Always call dispose() when components unmount

## Future Enhancements

- **Procedural Animation Blending** - Dynamic weight adjustment based on context
- **Facial Animation Integration** - Blend shape animation for detailed expressions  
- **Networked Animation Sync** - Replicate semantic keys across network
- **Custom Animation Authoring** - Tools for creating new semantic animations
- **AI-Driven Animation Selection** - Context-aware animation choices
- **Physics Integration** - Ground contact and procedural adjustments

## File Structure

```
types/
  ├── animationRegistry.ts      # Type definitions and utilities
data/
  ├── animationRegistry.ts      # Complete animation registry data
services/
  ├── animationLoader.ts        # Loading and caching service
hooks/
  ├── useAvatarAnimator.tsx     # Main animation hook
  └── useActiveAvatarModel.tsx  # Avatar model management
components/
  └── AnimatedAvatar.tsx        # Demo component with controls
```

## Contributing

When adding new animations:

1. Add assets to `/public/animations/animation-library-master/`
2. Create semantic key in `types/animationRegistry.ts`
3. Map assets in `data/animationRegistry.ts`
4. Test with both masculine and feminine avatars
5. Update documentation

For questions or contributions, see the main project documentation.