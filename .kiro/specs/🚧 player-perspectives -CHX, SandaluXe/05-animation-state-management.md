# Animation State Management System - Implementation Prompt

## Feature Overview

The Animation State Management System provides seamless integration between player physics, character actions, and 3D model animations. This system extends the existing RPM Animation System to handle player-controlled characters with dynamic state transitions, layered animation blending, and contextual animation selection based on movement, environment, and player intent. It ensures that character animations always reflect the current gameplay state while maintaining performance and visual quality.

## Current State Analysis

### Existing Components
- **RPM Animation System**: Handles 3D character animations for AI simulants
- **IsolatedAnimationManager**: Performance-optimized animation processing
- **Character Physics Controller**: Provides movement state and physics data
- **Player Avatar Integration**: Character model loading and management
- **Camera Systems**: First/third-person perspectives requiring different animation sets

### Integration Points
- `components/animations/IsolatedAnimationManager.tsx` - Extend for player character support
- `components/modules/PlayerControlModule.tsx` - Animation state integration with input
- `utils/animationController.ts` - Player-specific animation logic
- `store/worldStore.ts` - Animation state persistence and synchronization
- Integration with Character Physics Controller for state-driven animations

## Technical Requirements

### Core Functionality
1. **State-Driven Animation**: Animations automatically triggered based on character physics and input state
2. **Smooth Transitions**: Seamless blending between different animation states without pops or jerks
3. **Layered Animation**: Support for additive animations (breathing, idle movements) over base locomotion
4. **Contextual Animation**: Different animation sets for different environments and situations
5. **Performance Optimization**: Efficient animation processing that doesn't impact gameplay responsiveness

### Performance Targets
- **Animation Update Time**: ≤ 2ms per frame for animation state management
- **Transition Smoothness**: Blend time under 300ms for most transitions
- **Memory Usage**: ≤ 30MB additional for player animation system
- **Frame Rate Impact**: No more than 5% performance reduction from animations
- **State Response Time**: ≤ 50ms from physics state change to animation trigger

### Technical Constraints
- **Visual Quality**: Animations must look natural and responsive to player actions
- **Performance Isolation**: Use existing ModuleManager architecture for consistency
- **Asset Compatibility**: Work with standard RPM character models and animation clips
- **Cross-Platform**: Consistent animation behavior across different performance levels
- **Memory Management**: Efficient loading and unloading of animation assets

## Design Specifications

### Animation State Model

```typescript
interface PlayerAnimationState {
  // Primary Animation State
  currentState: AnimationStateType;
  previousState: AnimationStateType;
  stateTransition: AnimationTransition | null;
  
  // Animation Layers
  locomotionLayer: AnimationLayer;
  additiveLayer: AnimationLayer;
  overrideLayer: AnimationLayer;
  facialLayer: AnimationLayer;
  
  // State Machine
  stateMachine: AnimationStateMachine;
  stateHistory: AnimationStateHistory[];
  
  // Blend Parameters
  blendTree: AnimationBlendTree;
  blendWeights: Map<string, number>;
  
  // Context Information
  movementSpeed: number;
  direction: Vector3;
  groundState: GroundState;
  actionContext: ActionContext;
  environmentContext: EnvironmentContext;
  
  // Performance Data
  activeAnimations: Set<string>;
  animationMemoryUsage: number;
  lastUpdateTime: number;
  frameSkipCount: number;
}

type AnimationStateType = 
  | 'idle' | 'walking' | 'running' | 'sprinting'
  | 'jumping' | 'falling' | 'landing'
  | 'crouching' | 'crawling' | 'climbing'
  | 'swimming' | 'diving' | 'floating'
  | 'interacting' | 'emoting' | 'dancing'
  | 'combat' | 'aiming' | 'reloading';

interface AnimationTransition {
  fromState: AnimationStateType;
  toState: AnimationStateType;
  duration: number;
  startTime: number;
  easing: EasingFunction;
  crossfade: boolean;
  priority: number;
}

interface AnimationLayer {
  name: string;
  weight: number;
  maskBones: string[];
  currentAnimation: AnimationAction | null;
  blendMode: 'override' | 'additive' | 'multiply';
  priority: number;
}

interface AnimationBlendTree {
  locomotionBlend: LocomotionBlendSpace;
  directionalBlend: DirectionalBlendSpace;
  speedBlend: SpeedBlendSpace;
  actionBlend: ActionBlendSpace;
}
```

### Component Architecture

```typescript
interface PlayerAnimationManager {
  // Core Management
  initialize(character: Object3D, animationClips: AnimationClip[]): void;
  update(deltaTime: number, physicsState: CharacterPhysicsState): void;
  dispose(): void;
  
  // State Management
  transitionToState(newState: AnimationStateType, forced?: boolean): void;
  getCurrentState(): AnimationStateType;
  canTransitionTo(targetState: AnimationStateType): boolean;
  
  // Animation Control
  playAnimation(animationName: string, layer?: string, loop?: boolean): void;
  stopAnimation(animationName: string, fadeOut?: number): void;
  blendAnimations(primary: string, secondary: string, weight: number): void;
  
  // Blend Tree Management
  updateBlendTree(movementVector: Vector2, speed: number): void;
  setBlendParameter(parameter: string, value: number): void;
  getBlendParameter(parameter: string): number;
  
  // Layer Management
  setLayerWeight(layerName: string, weight: number): void;
  addAnimationLayer(layer: AnimationLayer): void;
  removeAnimationLayer(layerName: string): void;
  
  // Context Management
  updateMovementContext(physicsState: CharacterPhysicsState): void;
  updateEnvironmentContext(environment: EnvironmentContext): void;
  updateActionContext(action: ActionContext): void;
  
  // Performance
  optimizeForPerformance(level: number): void;
  getAnimationMetrics(): AnimationPerformanceMetrics;
}

interface AnimationStateMachine {
  states: Map<AnimationStateType, AnimationStateDefinition>;
  transitions: Map<string, AnimationTransitionRule>;
  currentState: AnimationStateType;
  
  canTransition(from: AnimationStateType, to: AnimationStateType): boolean;
  getTransitionRule(from: AnimationStateType, to: AnimationStateType): AnimationTransitionRule | null;
  updateStateMachine(context: AnimationContext): AnimationStateType | null;
}

interface AnimationStateDefinition {
  name: AnimationStateType;
  animationClip: string;
  loop: boolean;
  speed: number;
  blendInTime: number;
  blendOutTime: number;
  allowedTransitions: AnimationStateType[];
  entryConditions: AnimationCondition[];
  exitConditions: AnimationCondition[];
}
```

## Implementation Tasks

### Phase 1: Core Animation State Machine (Priority: Critical)

#### Task 1.1: Animation State Machine Foundation
**Success Criteria**: Robust state machine that handles animation transitions based on character state
```typescript
class PlayerAnimationStateMachine {
  private currentState: AnimationStateType = 'idle';
  private stateDefinitions: Map<AnimationStateType, AnimationStateDefinition> = new Map();
  private transitionRules: Map<string, AnimationTransitionRule> = new Map();
  
  constructor() {
    this.initializeStates();
    this.initializeTransitions();
  }
  
  initializeStates(): void {
    // Define base locomotion states
    this.addState({
      name: 'idle',
      animationClip: 'idle_breathing',
      loop: true,
      speed: 1.0,
      blendInTime: 0.2,
      blendOutTime: 0.2,
      allowedTransitions: ['walking', 'running', 'jumping', 'crouching'],
      entryConditions: [
        { type: 'velocity', operator: 'lessThan', value: 0.1 },
        { type: 'grounded', operator: 'equals', value: true }
      ],
      exitConditions: [
        { type: 'velocity', operator: 'greaterThan', value: 0.1 },
        { type: 'jump_input', operator: 'equals', value: true }
      ]
    });
    
    this.addState({
      name: 'walking',
      animationClip: 'walk_forward',
      loop: true,
      speed: 1.0,
      blendInTime: 0.15,
      blendOutTime: 0.15,
      allowedTransitions: ['idle', 'running', 'jumping'],
      entryConditions: [
        { type: 'velocity', operator: 'between', value: [0.1, 3.0] },
        { type: 'grounded', operator: 'equals', value: true }
      ],
      exitConditions: [
        { type: 'velocity', operator: 'lessThan', value: 0.1 },
        { type: 'velocity', operator: 'greaterThan', value: 3.0 }
      ]
    });
    
    // Continue with other states...
  }
  
  updateStateMachine(context: AnimationContext): AnimationStateType | null {
    const potentialStates = this.evaluatePotentialStates(context);
    
    // Sort by priority and feasibility
    potentialStates.sort((a, b) => {
      return b.priority - a.priority || b.confidence - a.confidence;
    });
    
    const bestState = potentialStates[0];
    if (bestState && bestState.state !== this.currentState) {
      if (this.canTransition(this.currentState, bestState.state)) {
        return bestState.state;
      }
    }
    
    return null;
  }
  
  evaluatePotentialStates(context: AnimationContext): StateEvaluation[] {
    const evaluations: StateEvaluation[] = [];
    
    for (const [stateName, stateDefinition] of this.stateDefinitions) {
      const confidence = this.evaluateStateConfidence(stateDefinition, context);
      const priority = this.calculateStatePriority(stateDefinition, context);
      
      if (confidence > 0.5) { // Threshold for viable state
        evaluations.push({
          state: stateName,
          confidence,
          priority,
          transitionCost: this.calculateTransitionCost(this.currentState, stateName)
        });
      }
    }
    
    return evaluations;
  }
  
  evaluateStateConfidence(
    stateDefinition: AnimationStateDefinition,
    context: AnimationContext
  ): number {
    let confidence = 0;
    let totalConditions = stateDefinition.entryConditions.length;
    
    for (const condition of stateDefinition.entryConditions) {
      if (this.evaluateCondition(condition, context)) {
        confidence += 1.0 / totalConditions;
      }
    }
    
    return confidence;
  }
}
```

**Implementation Steps**:
1. Create animation state definitions for all character states
2. Implement state evaluation and transition logic
3. Add condition evaluation system for state changes
4. Create priority-based state selection
5. Integrate with physics state for automatic transitions

**Visual Feedback**: Character animations change appropriately based on movement state
**Success Metrics**: State transitions complete within 300ms, 95% accuracy in state detection

#### Task 1.2: Animation Blending System
**Success Criteria**: Smooth animation blending that eliminates visual pops between state changes
```typescript
class AnimationBlendController {
  private blendQueue: AnimationBlend[] = [];
  private activeBlends: Map<string, BlendInstance> = new Map();
  private mixer: AnimationMixer;
  
  queueBlend(
    fromAnimation: string,
    toAnimation: string,
    duration: number,
    easing: EasingFunction = 'easeInOutCubic'
  ): void {
    const blendId = `${fromAnimation}->${toAnimation}`;
    
    // Cancel conflicting blends
    this.cancelConflictingBlends(fromAnimation, toAnimation);
    
    const blend: AnimationBlend = {
      id: blendId,
      fromAction: this.mixer.clipAction(this.getClip(fromAnimation)),
      toAction: this.mixer.clipAction(this.getClip(toAnimation)),
      duration,
      startTime: Date.now(),
      easing,
      isActive: true
    };
    
    this.blendQueue.push(blend);
    this.startBlend(blend);
  }
  
  updateBlends(deltaTime: number): void {
    for (const [blendId, blendInstance] of this.activeBlends) {
      this.updateBlendInstance(blendInstance, deltaTime);
      
      if (blendInstance.isComplete) {
        this.completeBlend(blendInstance);
        this.activeBlends.delete(blendId);
      }
    }
  }
  
  updateBlendInstance(blend: BlendInstance, deltaTime: number): void {
    const elapsed = Date.now() - blend.startTime;
    const progress = Math.min(elapsed / blend.duration, 1.0);
    const easedProgress = this.applyEasing(progress, blend.easing);
    
    // Update blend weights
    blend.fromWeight = 1.0 - easedProgress;
    blend.toWeight = easedProgress;
    
    // Apply weights to animation actions
    if (blend.fromAction) {
      blend.fromAction.weight = blend.fromWeight;
    }
    
    if (blend.toAction) {
      blend.toAction.weight = blend.toWeight;
      
      // Ensure target animation is playing
      if (!blend.toAction.isRunning()) {
        blend.toAction.reset().play();
      }
    }
    
    blend.isComplete = progress >= 1.0;
  }
  
  createCrossfadeBlend(
    fromAnimation: string,
    toAnimation: string,
    duration: number
  ): void {
    const fromAction = this.mixer.clipAction(this.getClip(fromAnimation));
    const toAction = this.mixer.clipAction(this.getClip(toAnimation));
    
    // Set up initial states
    fromAction.weight = 1.0;
    toAction.weight = 0.0;
    
    // Start target animation
    toAction.reset().play();
    
    // Queue the blend
    this.queueBlend(fromAnimation, toAnimation, duration);
  }
  
  blendToIdleVariation(): void {
    // Randomly select idle variation to prevent monotony
    const idleVariations = ['idle_breathing', 'idle_looking', 'idle_shifting'];
    const randomIdle = idleVariations[Math.floor(Math.random() * idleVariations.length)];
    
    this.createCrossfadeBlend('idle_breathing', randomIdle, 0.5);
    
    // Schedule return to base idle
    setTimeout(() => {
      this.createCrossfadeBlend(randomIdle, 'idle_breathing', 0.5);
    }, 3000 + Math.random() * 2000); // 3-5 seconds
  }
}

interface BlendInstance {
  id: string;
  fromAction: AnimationAction | null;
  toAction: AnimationAction;
  duration: number;
  startTime: number;
  fromWeight: number;
  toWeight: number;
  easing: EasingFunction;
  isComplete: boolean;
  priority: number;
}
```

**Implementation Steps**:
1. Create animation blending queue system
2. Implement crossfade blending with configurable easing
3. Add conflict resolution for overlapping blends
4. Create smooth weight interpolation system
5. Integrate with animation mixer for seamless playback

**Visual Feedback**: No visible pops or jerks during animation transitions
**Success Metrics**: Blend calculations under 1ms per frame, smooth visual transitions

#### Task 1.3: Movement-Based Animation Selection
**Success Criteria**: Animations automatically selected based on movement speed, direction, and context
```typescript
class MovementAnimationController {
  private locomotionBlendSpace: LocomotionBlendSpace;
  private directionBlendSpace: DirectionalBlendSpace;
  private lastMovementState: MovementAnimationState;
  
  updateMovementAnimations(
    physicsState: CharacterPhysicsState,
    inputState: MovementInput
  ): void {
    const movementState = this.analyzeMovementState(physicsState, inputState);
    
    if (this.hasMovementStateChanged(movementState)) {
      this.transitionToMovementAnimation(movementState);
      this.lastMovementState = movementState;
    }
    
    this.updateBlendSpaceParameters(movementState);
  }
  
  analyzeMovementState(
    physicsState: CharacterPhysicsState,
    inputState: MovementInput
  ): MovementAnimationState {
    const velocity = physicsState.velocity;
    const speed = new Vector3(velocity.x, 0, velocity.z).length();
    const direction = this.calculateMovementDirection(velocity, physicsState.rotation);
    
    return {
      speed,
      direction,
      isGrounded: physicsState.isGrounded,
      isRunning: inputState.isRunPressed && speed > 2.0,
      isCrouching: inputState.isCrouchPressed,
      isJumping: physicsState.isJumping,
      isFalling: physicsState.isFalling,
      groundAngle: this.calculateGroundAngle(physicsState.groundNormal),
      environmentType: this.detectEnvironmentType(physicsState.position)
    };
  }
  
  transitionToMovementAnimation(movementState: MovementAnimationState): void {
    const targetAnimation = this.selectOptimalAnimation(movementState);
    const currentAnimation = this.getCurrentAnimation();
    
    if (targetAnimation !== currentAnimation) {
      const transitionTime = this.calculateTransitionTime(
        currentAnimation,
        targetAnimation,
        movementState
      );
      
      this.blendController.createCrossfadeBlend(
        currentAnimation,
        targetAnimation,
        transitionTime
      );
    }
  }
  
  selectOptimalAnimation(movementState: MovementAnimationState): string {
    // Handle special states first
    if (movementState.isJumping) {
      return this.selectJumpAnimation(movementState);
    }
    
    if (movementState.isFalling) {
      return this.selectFallAnimation(movementState);
    }
    
    if (!movementState.isGrounded) {
      return 'air_idle';
    }
    
    // Ground-based movement selection
    if (movementState.speed < 0.1) {
      return this.selectIdleAnimation(movementState);
    }
    
    return this.selectLocomotionAnimation(movementState);
  }
  
  selectLocomotionAnimation(movementState: MovementAnimationState): string {
    const speed = movementState.speed;
    const direction = movementState.direction;
    
    // Speed-based selection
    let baseAnimation: string;
    if (speed > 5.0 && movementState.isRunning) {
      baseAnimation = 'run';
    } else if (speed > 1.5) {
      baseAnimation = 'walk';
    } else {
      baseAnimation = 'walk_slow';
    }
    
    // Direction-based modification
    if (Math.abs(direction.forward) < 0.3) {
      // Mostly side movement
      if (direction.right > 0.5) {
        return `${baseAnimation}_right`;
      } else if (direction.right < -0.5) {
        return `${baseAnimation}_left`;
      }
    }
    
    if (direction.forward < -0.5) {
      return `${baseAnimation}_backward`;
    }
    
    return `${baseAnimation}_forward`;
  }
  
  updateBlendSpaceParameters(movementState: MovementAnimationState): void {
    // Update 2D blend space for smooth directional movement
    this.locomotionBlendSpace.setParameter('speed', movementState.speed);
    this.locomotionBlendSpace.setParameter('direction', movementState.direction.forward);
    this.locomotionBlendSpace.setParameter('strafe', movementState.direction.right);
    
    // Update blend weights based on movement state
    const blendWeights = this.locomotionBlendSpace.calculateBlendWeights();
    this.applyBlendWeights(blendWeights);
  }
}

interface MovementAnimationState {
  speed: number;
  direction: MovementDirection;
  isGrounded: boolean;
  isRunning: boolean;
  isCrouching: boolean;
  isJumping: boolean;
  isFalling: boolean;
  groundAngle: number;
  environmentType: EnvironmentType;
}

interface MovementDirection {
  forward: number; // -1 to 1
  right: number;   // -1 to 1
  angle: number;   // radians
}
```

**Implementation Steps**:
1. Create movement state analysis system
2. Implement animation selection logic based on movement parameters
3. Add directional blend space for smooth movement animations
4. Create contextual animation selection (slopes, environments)
5. Integrate with physics state for real-time updates

**Visual Feedback**: Character animations match movement speed and direction accurately
**Success Metrics**: Animation selection accuracy 90%, smooth transitions between movement types

### Phase 2: Advanced Animation Features (Priority: High)

#### Task 2.1: Layered Animation System
**Success Criteria**: Support for multiple animation layers with proper blending and masking
```typescript
class LayeredAnimationSystem {
  private layers: Map<string, AnimationLayer> = new Map();
  private layerOrder: string[] = [];
  private boneHierarchy: BoneHierarchy;
  
  initializeLayers(): void {
    // Base locomotion layer
    this.addLayer({
      name: 'locomotion',
      weight: 1.0,
      blendMode: 'override',
      priority: 0,
      maskBones: [], // Full body
      currentAnimation: null
    });
    
    // Upper body additive layer
    this.addLayer({
      name: 'upper_body',
      weight: 0.0,
      blendMode: 'additive',
      priority: 1,
      maskBones: ['spine', 'neck', 'head', 'shoulder_L', 'shoulder_R'], 
      currentAnimation: null
    });
    
    // Facial animation layer
    this.addLayer({
      name: 'facial',
      weight: 1.0,
      blendMode: 'override',
      priority: 2,
      maskBones: ['head', 'jaw', 'eye_L', 'eye_R'],
      currentAnimation: null
    });
    
    // Override layer for special actions
    this.addLayer({
      name: 'override',
      weight: 0.0,
      blendMode: 'override',
      priority: 3,
      maskBones: [],
      currentAnimation: null
    });
  }
  
  playAnimationOnLayer(
    layerName: string,
    animationName: string,
    weight: number = 1.0,
    fadeInTime: number = 0.2
  ): void {
    const layer = this.layers.get(layerName);
    if (!layer) {
      console.warn(`Animation layer '${layerName}' not found`);
      return;
    }
    
    const animationAction = this.mixer.clipAction(this.getClip(animationName));
    
    // Configure animation for layer
    this.configureAnimationForLayer(animationAction, layer);
    
    // Fade in new animation
    if (layer.currentAnimation) {
      layer.currentAnimation.fadeOut(fadeInTime);
    }
    
    animationAction.reset().fadeIn(fadeInTime).play();
    layer.currentAnimation = animationAction;
    
    // Update layer weight
    this.setLayerWeight(layerName, weight);
  }
  
  configureAnimationForLayer(action: AnimationAction, layer: AnimationLayer): void {
    // Apply bone masking
    if (layer.maskBones.length > 0) {
      const boneMask = this.createBoneMask(layer.maskBones);
      this.applyBoneMask(action, boneMask);
    }
    
    // Set blend mode
    switch (layer.blendMode) {
      case 'additive':
        action.blendMode = THREE.AdditiveAnimationBlendMode;
        break;
      case 'multiply':
        action.blendMode = THREE.MultiplyAnimationBlendMode;
        break;
      default:
        action.blendMode = THREE.NormalAnimationBlendMode;
        break;
    }
    
    // Set initial weight
    action.weight = layer.weight;
  }
  
  updateLayerWeights(context: AnimationContext): void {
    // Update upper body layer for interactions
    if (context.isInteracting) {
      this.fadeLayerWeight('upper_body', 1.0, 0.3);
    } else {
      this.fadeLayerWeight('upper_body', 0.0, 0.5);
    }
    
    // Update override layer for special actions
    if (context.hasOverrideAction) {
      this.fadeLayerWeight('override', 1.0, 0.1);
    } else {
      this.fadeLayerWeight('override', 0.0, 0.2);
    }
    
    // Facial expressions based on context
    if (context.emotionalState !== 'neutral') {
      this.playFacialExpression(context.emotionalState);
    }
  }
  
  blendLayers(): void {
    // Sort layers by priority
    const sortedLayers = Array.from(this.layers.values())
      .sort((a, b) => a.priority - b.priority);
    
    // Apply layer blending from lowest to highest priority
    for (const layer of sortedLayers) {
      if (layer.currentAnimation && layer.weight > 0) {
        this.applyLayerToFinalPose(layer);
      }
    }
  }
  
  createBoneMask(boneNames: string[]): BoneMask {
    const mask = new Map<string, number>();
    
    // Initialize all bones to 0 (masked out)
    for (const bone of this.boneHierarchy.getAllBones()) {
      mask.set(bone.name, 0.0);
    }
    
    // Set specified bones to 1 (included)
    for (const boneName of boneNames) {
      this.setBoneMaskRecursive(mask, boneName, 1.0);
    }
    
    return mask;
  }
  
  setBoneMaskRecursive(mask: BoneMask, boneName: string, weight: number): void {
    mask.set(boneName, weight);
    
    // Apply to all child bones
    const children = this.boneHierarchy.getChildBones(boneName);
    for (const child of children) {
      this.setBoneMaskRecursive(mask, child.name, weight);
    }
  }
}
```

**Implementation Steps**:
1. Create animation layer system with priority and masking
2. Implement bone-based animation masking
3. Add blend mode support (additive, override, multiply)
4. Create layer weight management and fading
5. Integrate with main animation system

**Visual Feedback**: Multiple animations playing simultaneously on different body parts
**Success Metrics**: Layer blending calculation under 1ms, visual quality maintained

#### Task 2.2: Contextual Animation Selection
**Success Criteria**: Animations change based on environment, interaction context, and gameplay state
```typescript
class ContextualAnimationController {
  private contextStack: AnimationContext[] = [];
  private environmentalAnimations: Map<EnvironmentType, AnimationSet> = new Map();
  private interactionAnimations: Map<InteractionType, AnimationSet> = new Map();
  
  updateAnimationContext(
    physicsState: CharacterPhysicsState,
    environmentContext: EnvironmentContext,
    interactionContext: InteractionContext
  ): void {
    const newContext = this.buildAnimationContext(
      physicsState,
      environmentContext,
      interactionContext
    );
    
    this.pushContext(newContext);
    this.updateAnimationsForContext();
  }
  
  buildAnimationContext(
    physicsState: CharacterPhysicsState,
    environmentContext: EnvironmentContext,
    interactionContext: InteractionContext
  ): AnimationContext {
    return {
      // Environmental factors
      environmentType: this.detectEnvironmentType(physicsState.position),
      surfaceType: this.detectSurfaceType(physicsState.groundNormal),
      weatherConditions: environmentContext.weather,
      timeOfDay: environmentContext.timeOfDay,
      
      // Interaction context
      nearbyInteractables: interactionContext.nearbyObjects,
      currentInteraction: interactionContext.activeInteraction,
      isInteracting: interactionContext.isActive,
      
      // Character state
      healthLevel: this.getCharacterHealth(),
      fatigueLevel: this.getCharacterFatigue(),
      emotionalState: this.getEmotionalState(),
      equipmentState: this.getEquipmentState(),
      
      // Gameplay context
      gameMode: this.getCurrentGameMode(),
      difficulty: this.getDifficultySetting(),
      playerPreferences: this.getPlayerPreferences()
    };
  }
  
  selectContextualAnimation(baseAnimation: string, context: AnimationContext): string {
    // Environmental modifications
    let contextualAnimation = this.applyEnvironmentalContext(baseAnimation, context);
    
    // Surface-specific animations
    contextualAnimation = this.applySurfaceContext(contextualAnimation, context);
    
    // Emotional state modifications
    contextualAnimation = this.applyEmotionalContext(contextualAnimation, context);
    
    // Equipment modifications
    contextualAnimation = this.applyEquipmentContext(contextualAnimation, context);
    
    return contextualAnimation;
  }
  
  applyEnvironmentalContext(animation: string, context: AnimationContext): string {
    switch (context.environmentType) {
      case 'water':
        return this.convertToWaterAnimation(animation);
      case 'snow':
        return this.convertToSnowAnimation(animation);
      case 'mud':
        return this.convertToMudAnimation(animation);
      case 'sand':
        return this.convertToSandAnimation(animation);
      case 'rocky':
        return this.convertToRockyAnimation(animation);
      default:
        return animation;
    }
  }
  
  convertToWaterAnimation(baseAnimation: string): string {
    const waterAnimations = {
      'walk_forward': 'wade_forward',
      'run_forward': 'swim_stroke',
      'idle': 'treading_water',
      'jump': 'dive'
    };
    
    return waterAnimations[baseAnimation] || baseAnimation;
  }
  
  applyEmotionalContext(animation: string, context: AnimationContext): string {
    switch (context.emotionalState) {
      case 'tired':
        return this.addFatigueModifier(animation);
      case 'excited':
        return this.addEnergyModifier(animation);
      case 'cautious':
        return this.addCautiousModifier(animation);
      case 'confident':
        return this.addConfidentModifier(animation);
      default:
        return animation;
    }
  }
  
  addFatigueModifier(animation: string): string {
    // Modify animation playback speed and add tired variants
    const fatigueVariants = {
      'walk_forward': 'walk_tired',
      'run_forward': 'jog_tired',
      'idle': 'idle_tired'
    };
    
    return fatigueVariants[animation] || animation;
  }
  
  handleInteractionAnimations(interaction: InteractionType, target: Object3D): void {
    const interactionAnimation = this.getInteractionAnimation(interaction, target);
    
    if (interactionAnimation) {
      // Play interaction animation on override layer
      this.layeredAnimationSystem.playAnimationOnLayer(
        'override',
        interactionAnimation.name,
        1.0,
        interactionAnimation.fadeInTime
      );
      
      // Schedule return to normal animations
      setTimeout(() => {
        this.layeredAnimationSystem.fadeLayerWeight('override', 0.0, 0.3);
      }, interactionAnimation.duration);
    }
  }
  
  getInteractionAnimation(interaction: InteractionType, target: Object3D): InteractionAnimation | null {
    const interactionAnimations = {
      'pickup': { name: 'pickup_item', duration: 1200, fadeInTime: 0.1 },
      'open_door': { name: 'open_door', duration: 800, fadeInTime: 0.15 },
      'press_button': { name: 'press_button', duration: 500, fadeInTime: 0.1 },
      'wave': { name: 'wave_gesture', duration: 2000, fadeInTime: 0.2 }
    };
    
    return interactionAnimations[interaction] || null;
  }
}

interface AnimationContext {
  environmentType: EnvironmentType;
  surfaceType: SurfaceType;
  weatherConditions: WeatherType;
  timeOfDay: TimeOfDay;
  nearbyInteractables: InteractableObject[];
  currentInteraction: InteractionType | null;
  isInteracting: boolean;
  healthLevel: number;
  fatigueLevel: number;
  emotionalState: EmotionalState;
  equipmentState: EquipmentState;
  gameMode: GameMode;
  difficulty: DifficultyLevel;
  playerPreferences: PlayerPreferences;
}
```

**Implementation Steps**:
1. Create context detection system for environment and interactions
2. Implement animation variant selection based on context
3. Add emotional state and character condition modifiers
4. Create interaction-specific animation handling
5. Integrate with existing animation systems

**Visual Feedback**: Animations change appropriately based on context and environment
**Success Metrics**: Context detection accuracy 85%, appropriate animation selection 90%

### Phase 3: Performance and Polish (Priority: Medium)

#### Task 3.1: Animation Performance Optimization
**Success Criteria**: Animation system maintains performance targets while providing high-quality visuals
```typescript
class AnimationPerformanceOptimizer {
  private readonly PERFORMANCE_THRESHOLDS = {
    excellent: { fps: 60, updateTime: 1.5 },
    good: { fps: 45, updateTime: 2.5 },
    poor: { fps: 30, updateTime: 4.0 }
  };
  
  private currentOptimizationLevel: OptimizationLevel = 'medium';
  private performanceHistory: PerformanceMetric[] = [];
  
  updateOptimizationLevel(performanceMetrics: AnimationPerformanceMetrics): void {
    this.performanceHistory.push({
      fps: performanceMetrics.frameRate,
      updateTime: performanceMetrics.animationUpdateTime,
      timestamp: Date.now()
    });
    
    // Keep only recent history
    this.performanceHistory = this.performanceHistory.slice(-60); // Last 1 second at 60fps
    
    const averagePerformance = this.calculateAveragePerformance();
    const newOptimizationLevel = this.determineOptimizationLevel(averagePerformance);
    
    if (newOptimizationLevel !== this.currentOptimizationLevel) {
      this.applyOptimizationLevel(newOptimizationLevel);
      this.currentOptimizationLevel = newOptimizationLevel;
    }
  }
  
  applyOptimizationLevel(level: OptimizationLevel): void {
    switch (level) {
      case 'high':
        this.applyHighOptimization();
        break;
      case 'medium':
        this.applyMediumOptimization();
        break;
      case 'low':
        this.applyLowOptimization();
        break;
    }
  }
  
  applyHighOptimization(): void {
    // Aggressive optimization for low-performance scenarios
    this.setAnimationUpdateRate(30); // 30fps animation updates
    this.enableAnimationLOD(true);
    this.setMaxActiveAnimations(3);
    this.enableAnimationCulling(true);
    this.setBlendPrecision('low');
    this.disableNonEssentialAnimations();
  }
  
  applyMediumOptimization(): void {
    // Balanced optimization
    this.setAnimationUpdateRate(45); // 45fps animation updates
    this.enableAnimationLOD(true);
    this.setMaxActiveAnimations(5);
    this.enableAnimationCulling(false);
    this.setBlendPrecision('medium');
    this.enableEssentialAnimationsOnly();
  }
  
  applyLowOptimization(): void {
    // Minimal optimization for high-performance scenarios
    this.setAnimationUpdateRate(60); // Full 60fps animation updates
    this.enableAnimationLOD(false);
    this.setMaxActiveAnimations(8);
    this.enableAnimationCulling(false);
    this.setBlendPrecision('high');
    this.enableAllAnimations();
  }
  
  enableAnimationLOD(enabled: boolean): void {
    if (enabled) {
      // Reduce animation quality based on distance from camera
      this.animationLODController.setEnabled(true);
      this.animationLODController.setLODDistances({
        high: 10,   // Full quality within 10 units
        medium: 25, // Reduced quality 10-25 units
        low: 50     // Minimal quality 25-50 units
      });
    } else {
      this.animationLODController.setEnabled(false);
    }
  }
  
  optimizeAnimationMemory(): void {
    // Remove unused animation clips from memory
    this.cleanupUnusedAnimations();
    
    // Compress animation data where possible
    this.compressAnimationClips();
    
    // Use shared animation instances for similar characters
    this.enableAnimationInstancing();
  }
  
  cleanupUnusedAnimations(): void {
    const cutoffTime = Date.now() - 300000; // 5 minutes
    
    for (const [animationName, lastUsed] of this.animationUsageTracker) {
      if (lastUsed < cutoffTime) {
        this.unloadAnimation(animationName);
        this.animationUsageTracker.delete(animationName);
      }
    }
  }
  
  profileAnimationPerformance(): AnimationPerformanceReport {
    return {
      totalAnimations: this.getActiveAnimationCount(),
      averageUpdateTime: this.calculateAverageUpdateTime(),
      memoryUsage: this.calculateAnimationMemoryUsage(),
      frameRate: this.getCurrentFrameRate(),
      optimizationLevel: this.currentOptimizationLevel,
      performanceBottlenecks: this.identifyBottlenecks(),
      recommendations: this.generateOptimizationRecommendations()
    };
  }
}

type OptimizationLevel = 'high' | 'medium' | 'low';

interface AnimationPerformanceReport {
  totalAnimations: number;
  averageUpdateTime: number;
  memoryUsage: number;
  frameRate: number;
  optimizationLevel: OptimizationLevel;
  performanceBottlenecks: string[];
  recommendations: string[];
}
```

**Implementation Steps**:
1. Create performance monitoring system for animations
2. Implement adaptive optimization based on performance metrics
3. Add animation LOD system for distance-based quality
4. Create memory optimization and cleanup systems
5. Integrate with existing performance monitoring

**Visual Feedback**: Animation quality adjusts based on performance, smooth frame rate maintained
**Success Metrics**: Animation update time under target thresholds, memory usage optimized

## Testing Procedures

### Unit Tests
```typescript
describe('PlayerAnimationManager', () => {
  test('should transition between animation states correctly', () => {
    const animationManager = new PlayerAnimationManager();
    const character = createMockCharacter();
    const clips = createMockAnimationClips();
    
    animationManager.initialize(character, clips);
    animationManager.transitionToState('walking');
    
    expect(animationManager.getCurrentState()).toBe('walking');
  });
  
  test('should blend animations smoothly', (done) => {
    const blendController = new AnimationBlendController();
    
    blendController.queueBlend('idle', 'walking', 0.3);
    
    setTimeout(() => {
      const blendProgress = blendController.getBlendProgress('idle->walking');
      expect(blendProgress).toBeGreaterThan(0.8);
      done();
    }, 250);
  });
  
  test('should select appropriate contextual animations', () => {
    const contextController = new ContextualAnimationController();
    const context = createWaterContext();
    
    const animation = contextController.selectContextualAnimation('walk_forward', context);
    
    expect(animation).toBe('wade_forward');
  });
  
  test('should manage animation layers correctly', () => {
    const layeredSystem = new LayeredAnimationSystem();
    
    layeredSystem.playAnimationOnLayer('upper_body', 'wave_gesture', 1.0);
    
    const layer = layeredSystem.getLayer('upper_body');
    expect(layer.currentAnimation).toBeTruthy();
    expect(layer.weight).toBe(1.0);
  });
});
```

### Integration Tests
```typescript
describe('Animation State Integration', () => {
  test('animations respond to physics state changes', async () => {
    const { getByTestId } = render(<TestWorldWithPlayerAnimation />);
    const canvas = getByTestId('3d-canvas');
    
    // Start walking
    fireEvent.keyDown(canvas, { key: 'w', code: 'KeyW' });
    
    await waitFor(() => {
      const animationState = getPlayerAnimationState();
      expect(animationState.currentState).toBe('walking');
    });
    
    // Start running
    fireEvent.keyDown(canvas, { key: 'Shift', code: 'ShiftLeft' });
    
    await waitFor(() => {
      const animationState = getPlayerAnimationState();
      expect(animationState.currentState).toBe('running');
    });
  });
  
  test('animations blend smoothly during transitions', async () => {
    const animationManager = new PlayerAnimationManager();
    
    animationManager.transitionToState('walking');
    const initialState = animationManager.getCurrentState();
    
    animationManager.transitionToState('running');
    
    // During transition, should have blend active
    const blendActive = animationManager.hasActiveBlends();
    expect(blendActive).toBe(true);
    
    await waitFor(() => {
      const finalState = animationManager.getCurrentState();
      expect(finalState).toBe('running');
    });
  });
});
```

### Performance Tests
```typescript
describe('Animation Performance', () => {
  test('animation updates stay within performance budget', async () => {
    const performanceMonitor = new PerformanceMonitor();
    const animationManager = new PlayerAnimationManager();
    
    const metrics = await performanceMonitor.measureFor(3000, () => {
      animationManager.update(0.016, createMockPhysicsState());
    });
    
    expect(metrics.averageUpdateTime).toBeLessThan(2);
    expect(metrics.frameRate).toBeGreaterThanOrEqual(58);
  });
  
  test('memory usage stays within limits', () => {
    const memoryTracker = new MemoryTracker();
    const animationManager = new PlayerAnimationManager();
    
    // Load all animations
    animationManager.loadAllAnimations();
    
    const memoryUsage = memoryTracker.getAnimationMemoryUsage();
    expect(memoryUsage).toBeLessThan(30 * 1024 * 1024); // 30MB limit
  });
});
```

## Performance Metrics

### Target Benchmarks
- **Animation Update Time**: ≤ 2ms per frame
- **State Transition Time**: ≤ 300ms for smooth transitions
- **Memory Usage**: ≤ 30MB for animation system
- **Frame Rate Impact**: ≤ 5% reduction from animations
- **Blend Calculation**: ≤ 1ms per active blend

### Performance Monitoring
```typescript
interface AnimationPerformanceMetrics {
  // Update Performance
  animationUpdateTime: number;
  stateMachineUpdateTime: number;
  blendCalculationTime: number;
  
  // Transition Performance
  averageTransitionTime: number;
  transitionSmoothness: number;
  
  // Memory Performance
  animationMemoryUsage: number;
  activeAnimationCount: number;
  cachedAnimationCount: number;
  
  // Quality Metrics
  frameRate: number;
  animationQuality: number;
  visualSmoothness: number;
}
```

## Potential Edge Cases

### Rapid State Changes
**Scenario**: Player rapidly changes movement direction causing frequent animation transitions
**Handling**: Transition dampening and minimum state duration
**Recovery**: Queue management with transition prioritization

### Animation Asset Loading Failures
**Scenario**: Animation clips fail to load due to network or file issues
**Handling**: Fallback animations and graceful degradation
**Recovery**: Retry mechanism with user notification

### Performance Degradation
**Scenario**: Animation system causes frame rate drops on low-end devices
**Handling**: Automatic optimization level adjustment
**Recovery**: Progressive quality reduction with user options

### Memory Pressure
**Scenario**: Animation assets consume excessive memory
**Handling**: Automatic cleanup and compression
**Recovery**: Memory pressure relief through asset management

### State Machine Conflicts
**Scenario**: Multiple systems try to control animation state simultaneously
**Handling**: Priority-based state management with override rules
**Recovery**: State validation and conflict resolution

## Integration Points with Other Systems

### Character Physics Integration
- **Connection Point**: Character Physics Controller
- **Interface**: Physics state input for animation selection
- **Data Flow**: Physics state → Animation state evaluation → Animation playback

### Camera System Integration
- **Connection Point**: First/Third-person camera systems
- **Interface**: Camera mode affects animation visibility and LOD
- **Data Flow**: Camera state → Animation optimization → Rendering adjustments

### Player Controller Integration
- **Connection Point**: `components/modules/PlayerControlModule.tsx`
- **Interface**: Input state for animation triggers
- **Data Flow**: Player input → Movement analysis → Animation selection

### World Interaction Integration
- **Connection Point**: World interaction systems
- **Interface**: Interaction events trigger contextual animations
- **Data Flow**: Interaction detected → Animation context update → Contextual animation

### Performance System Integration
- **Connection Point**: `components/modules/ModuleManager.tsx`
- **Interface**: Performance metrics for optimization decisions
- **Data Flow**: Performance data → Optimization adjustment → Animation quality scaling

---

**Implementation Priority**: Critical
**Estimated Complexity**: High
**Dependencies**: Character Physics Controller, Player Avatar Integration, RPM Animation System
**Success Metrics**: Smooth animation transitions with 2ms update time and contextually appropriate animation selection