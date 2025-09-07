# POV Switching System - Implementation Prompt

## Feature Overview

The POV (Point of View) Switching System provides seamless transitions between first-person and third-person perspectives while maintaining visual continuity, performance stability, and user comfort. This system orchestrates the coordination between camera systems, model visibility, animation states, and user interface elements to deliver a polished perspective-switching experience that feels natural and responsive.

## Current State Analysis

### Existing Components
- **First-Person Camera System**: Eye-level camera with model visibility management
- **Third-Person Camera System**: Following camera with collision avoidance
- **Character Physics Controller**: Ground-based movement with realistic physics
- **Animation State Management**: Context-aware animation selection and blending
- **Player Avatar Integration**: 3D character models with full animation support

### Integration Points
- `components/world/CameraController.tsx` - Central camera mode management
- `components/modules/PlayerControlModule.tsx` - Input handling during transitions
- `store/worldStore.ts` - POV state persistence and synchronization
- `types/index.ts` - POV switching interfaces and state models
- Integration with all existing camera and animation systems

## Technical Requirements

### Core Functionality
1. **Instant POV Switching**: Seamless transitions between perspectives within 200ms
2. **State Synchronization**: Perfect alignment of camera, model, and animation states
3. **Input Continuity**: Uninterrupted input handling during perspective changes
4. **Visual Continuity**: Smooth position and rotation transitions without jarring movements
5. **Performance Maintenance**: No frame rate drops during perspective switching

### Performance Targets
- **Switching Speed**: Complete POV transition within 200ms
- **Frame Rate Stability**: No frame drops during switching process
- **Memory Overhead**: ≤ 5MB additional memory for switching system
- **Input Latency**: ≤ 10ms additional latency during transitions
- **Visual Smoothness**: No visible pops, jerks, or discontinuities

### Technical Constraints
- **User Comfort**: Transitions must not cause motion sickness or disorientation
- **State Consistency**: All systems must remain synchronized during transitions
- **Input Responsiveness**: Player input must remain responsive throughout switching
- **Cross-System Integration**: Must work seamlessly with existing camera and animation systems
- **Performance Isolation**: Use ModuleManager architecture for consistent performance

## Design Specifications

### POV Switching State Model

```typescript
interface POVSwitchingState {
  // Current State
  currentPOV: POVMode;
  previousPOV: POVMode;
  isTransitioning: boolean;
  
  // Transition Configuration
  transitionMode: TransitionMode;
  transitionDuration: number;
  transitionEasing: EasingFunction;
  
  // Synchronization State
  cameraSync: CameraSyncState;
  modelSync: ModelSyncState;
  animationSync: AnimationSyncState;
  inputSync: InputSyncState;
  
  // Transition Timeline
  transitionStartTime: number;
  transitionProgress: number;
  transitionPhases: TransitionPhase[];
  currentPhase: TransitionPhase;
  
  // User Preferences
  switchingMethod: SwitchingMethod;
  transitionSpeed: TransitionSpeed;
  comfortMode: boolean;
  disableTransitions: boolean;
  
  // Performance Monitoring
  lastSwitchTime: number;
  switchCount: number;
  averageSwitchTime: number;
  performanceMetrics: SwitchingPerformanceMetrics;
}

type POVMode = 'first-person' | 'third-person';

type TransitionMode = 
  | 'smooth' | 'instant' | 'fade' | 'blend' | 'cinematic';

type SwitchingMethod = 
  | 'toggle' | 'hold' | 'contextual' | 'automatic';

type TransitionSpeed = 
  | 'instant' | 'fast' | 'normal' | 'slow' | 'cinematic';

interface TransitionPhase {
  name: string;
  startTime: number;
  duration: number;
  operations: TransitionOperation[];
  isComplete: boolean;
}

interface CameraSyncState {
  position: Vector3;
  rotation: Euler;
  fov: number;
  targetPosition: Vector3;
  targetRotation: Euler;
  targetFov: number;
  isPositionSynced: boolean;
  isRotationSynced: boolean;
}

interface ModelSyncState {
  visibility: PlayerModelVisibility;
  targetVisibility: PlayerModelVisibility;
  lodLevel: LODLevel;
  animationLayer: string;
  isSynced: boolean;
}

interface AnimationSyncState {
  currentState: AnimationStateType;
  targetState: AnimationStateType;
  blendWeights: Map<string, number>;
  transitionActive: boolean;
  isSynced: boolean;
}
```

### Component Architecture

```typescript
interface POVSwitchingManager {
  // Core Management
  initialize(cameraController: CameraController, animationManager: PlayerAnimationManager): void;
  update(deltaTime: number): void;
  dispose(): void;
  
  // POV Switching
  switchToPOV(targetPOV: POVMode, method?: TransitionMode): Promise<void>;
  togglePOV(): Promise<void>;
  canSwitchPOV(): boolean;
  
  // Transition Control
  startTransition(from: POVMode, to: POVMode, config: TransitionConfig): void;
  updateTransition(deltaTime: number): void;
  completeTransition(): void;
  cancelTransition(): void;
  
  // State Synchronization
  synchronizeCameraState(from: POVMode, to: POVMode): void;
  synchronizeModelVisibility(targetPOV: POVMode): void;
  synchronizeAnimationState(targetPOV: POVMode): void;
  synchronizeInputHandling(targetPOV: POVMode): void;
  
  // Configuration
  setTransitionMode(mode: TransitionMode): void;
  setTransitionSpeed(speed: TransitionSpeed): void;
  enableComfortMode(enabled: boolean): void;
  
  // State Management
  getCurrentPOV(): POVMode;
  getPreviousPOV(): POVMode;
  isTransitioning(): boolean;
  getTransitionProgress(): number;
  
  // Performance
  getPerformanceMetrics(): SwitchingPerformanceMetrics;
  optimizeForPerformance(): void;
}

interface TransitionConfig {
  mode: TransitionMode;
  duration: number;
  easing: EasingFunction;
  phases: TransitionPhase[];
  comfort: boolean;
  preserveInput: boolean;
}

interface TransitionOperation {
  type: 'camera' | 'model' | 'animation' | 'input' | 'ui';
  action: string;
  parameters: Record<string, any>;
  delay: number;
  duration: number;
}
```

## Implementation Tasks

### Phase 1: Core POV Switching Infrastructure (Priority: Critical)

#### Task 1.1: POV Switching State Management
**Success Criteria**: Robust state management that tracks POV transitions and synchronization
```typescript
class POVSwitchingStateManager {
  private state: POVSwitchingState;
  private stateHistory: POVSwitchingState[] = [];
  private readonly MAX_HISTORY = 10;
  
  constructor() {
    this.state = this.initializeDefaultState();
  }
  
  initializeDefaultState(): POVSwitchingState {
    return {
      currentPOV: 'third-person',
      previousPOV: 'third-person',
      isTransitioning: false,
      transitionMode: 'smooth',
      transitionDuration: 200,
      transitionEasing: 'easeInOutCubic',
      cameraSync: this.createDefaultCameraSync(),
      modelSync: this.createDefaultModelSync(),
      animationSync: this.createDefaultAnimationSync(),
      inputSync: this.createDefaultInputSync(),
      transitionStartTime: 0,
      transitionProgress: 0,
      transitionPhases: [],
      currentPhase: null,
      switchingMethod: 'toggle',
      transitionSpeed: 'normal',
      comfortMode: false,
      disableTransitions: false,
      lastSwitchTime: 0,
      switchCount: 0,
      averageSwitchTime: 0,
      performanceMetrics: this.createDefaultMetrics()
    };
  }
  
  startTransition(from: POVMode, to: POVMode, config: TransitionConfig): void {
    if (this.state.isTransitioning) {
      this.cancelCurrentTransition();
    }
    
    // Save current state to history
    this.saveStateToHistory();
    
    // Update state for new transition
    this.state.previousPOV = from;
    this.state.currentPOV = to;
    this.state.isTransitioning = true;
    this.state.transitionStartTime = Date.now();
    this.state.transitionProgress = 0;
    this.state.transitionMode = config.mode;
    this.state.transitionDuration = config.duration;
    this.state.transitionEasing = config.easing;
    
    // Initialize transition phases
    this.state.transitionPhases = this.createTransitionPhases(from, to, config);
    this.state.currentPhase = this.state.transitionPhases[0];
    
    // Update sync states
    this.updateSyncStatesForTransition(from, to);
  }
  
  updateTransition(deltaTime: number): void {
    if (!this.state.isTransitioning) return;
    
    const elapsed = Date.now() - this.state.transitionStartTime;
    this.state.transitionProgress = Math.min(elapsed / this.state.transitionDuration, 1.0);
    
    // Update current phase
    this.updateCurrentPhase(elapsed);
    
    // Check for transition completion
    if (this.state.transitionProgress >= 1.0) {
      this.completeTransition();
    }
  }
  
  completeTransition(): void {
    this.state.isTransitioning = false;
    this.state.transitionProgress = 1.0;
    this.state.currentPhase = null;
    
    // Update performance metrics
    const switchTime = Date.now() - this.state.transitionStartTime;
    this.updatePerformanceMetrics(switchTime);
    
    // Verify synchronization
    this.verifySynchronization();
  }
  
  createTransitionPhases(from: POVMode, to: POVMode, config: TransitionConfig): TransitionPhase[] {
    const phases: TransitionPhase[] = [];
    
    // Phase 1: Pre-transition (0-20%)
    phases.push({
      name: 'pre-transition',
      startTime: 0,
      duration: config.duration * 0.2,
      operations: [
        { type: 'input', action: 'preserve_state', parameters: {}, delay: 0, duration: 0 },
        { type: 'animation', action: 'prepare_transition', parameters: { to }, delay: 0, duration: 50 }
      ],
      isComplete: false
    });
    
    // Phase 2: Camera transition (20-70%)
    phases.push({
      name: 'camera-transition',
      startTime: config.duration * 0.2,
      duration: config.duration * 0.5,
      operations: [
        { type: 'camera', action: 'transition_position', parameters: { from, to }, delay: 0, duration: config.duration * 0.5 },
        { type: 'camera', action: 'transition_rotation', parameters: { from, to }, delay: 0, duration: config.duration * 0.5 }
      ],
      isComplete: false
    });
    
    // Phase 3: Model visibility (40-80%)
    phases.push({
      name: 'model-visibility',
      startTime: config.duration * 0.4,
      duration: config.duration * 0.4,
      operations: [
        { type: 'model', action: 'update_visibility', parameters: { pov: to }, delay: 0, duration: 100 }
      ],
      isComplete: false
    });
    
    // Phase 4: Post-transition (80-100%)
    phases.push({
      name: 'post-transition',
      startTime: config.duration * 0.8,
      duration: config.duration * 0.2,
      operations: [
        { type: 'input', action: 'restore_state', parameters: {}, delay: 0, duration: 0 },
        { type: 'animation', action: 'finalize_transition', parameters: { to }, delay: 0, duration: 50 }
      ],
      isComplete: false
    });
    
    return phases;
  }
  
  updateSyncStatesForTransition(from: POVMode, to: POVMode): void {
    // Calculate target camera state for destination POV
    this.state.cameraSync.targetPosition = this.calculateTargetCameraPosition(to);
    this.state.cameraSync.targetRotation = this.calculateTargetCameraRotation(to);
    this.state.cameraSync.targetFov = this.calculateTargetFOV(to);
    
    // Calculate target model visibility
    this.state.modelSync.targetVisibility = this.calculateTargetModelVisibility(to);
    
    // Calculate target animation state
    this.state.animationSync.targetState = this.calculateTargetAnimationState(to);
  }
}
```

**Implementation Steps**:
1. Create POV switching state model and management
2. Implement transition phase system with operation scheduling
3. Add synchronization state tracking for all systems
4. Create performance metrics collection and monitoring
5. Implement state history and rollback capabilities

**Visual Feedback**: Smooth POV transitions with proper state synchronization
**Success Metrics**: Transition completion within 200ms, no state desynchronization

#### Task 1.2: Camera Position and Rotation Synchronization
**Success Criteria**: Perfect camera position and rotation synchronization between POV modes
```typescript
class CameraTransitionController {
  private readonly POSITION_TOLERANCE = 0.01;
  private readonly ROTATION_TOLERANCE = 0.001;
  
  synchronizeCameraStates(
    fromPOV: POVMode,
    toPOV: POVMode,
    physicsState: CharacterPhysicsState
  ): CameraTransitionPlan {
    const currentCameraState = this.getCurrentCameraState();
    const targetCameraState = this.calculateTargetCameraState(toPOV, physicsState);
    
    return {
      startPosition: currentCameraState.position,
      endPosition: targetCameraState.position,
      startRotation: currentCameraState.rotation,
      endRotation: targetCameraState.rotation,
      startFOV: currentCameraState.fov,
      endFOV: targetCameraState.fov,
      positionCurve: this.createPositionCurve(currentCameraState, targetCameraState),
      rotationCurve: this.createRotationCurve(currentCameraState, targetCameraState),
      fovCurve: this.createFOVCurve(currentCameraState, targetCameraState)
    };
  }
  
  calculateTargetCameraState(pov: POVMode, physicsState: CharacterPhysicsState): CameraState {
    switch (pov) {
      case 'first-person':
        return this.calculateFirstPersonCameraState(physicsState);
      case 'third-person':
        return this.calculateThirdPersonCameraState(physicsState);
      default:
        throw new Error(`Unsupported POV mode: ${pov}`);
    }
  }
  
  calculateFirstPersonCameraState(physicsState: CharacterPhysicsState): CameraState {
    const characterPosition = physicsState.position;
    const characterRotation = physicsState.rotation;
    
    // Position camera at eye level
    const eyePosition = characterPosition.clone();
    eyePosition.y += 1.6; // Eye height offset
    
    // Use character rotation for camera rotation
    const cameraRotation = characterRotation.clone();
    
    return {
      position: eyePosition,
      rotation: cameraRotation,
      fov: 75, // Standard first-person FOV
      target: null // First-person doesn't use look-at target
    };
  }
  
  calculateThirdPersonCameraState(physicsState: CharacterPhysicsState): CameraState {
    const characterPosition = physicsState.position;
    const characterRotation = physicsState.rotation;
    
    // Position camera behind and above character
    const cameraOffset = new Vector3(0, 2.5, 6); // Height and distance
    const rotatedOffset = cameraOffset.clone();
    rotatedOffset.applyEuler(characterRotation);
    
    const cameraPosition = characterPosition.clone().add(rotatedOffset);
    const lookAtTarget = characterPosition.clone();
    lookAtTarget.y += 1.0; // Look at character center
    
    // Calculate camera rotation to look at character
    const cameraRotation = this.calculateLookAtRotation(cameraPosition, lookAtTarget);
    
    return {
      position: cameraPosition,
      rotation: cameraRotation,
      fov: 60, // Standard third-person FOV
      target: lookAtTarget
    };
  }
  
  executeTransition(
    transitionPlan: CameraTransitionPlan,
    progress: number,
    easing: EasingFunction
  ): void {
    const easedProgress = this.applyEasing(progress, easing);
    
    // Interpolate position
    const currentPosition = this.interpolateVector3(
      transitionPlan.startPosition,
      transitionPlan.endPosition,
      easedProgress
    );
    
    // Interpolate rotation (using quaternion SLERP for smoothness)
    const currentRotation = this.interpolateRotation(
      transitionPlan.startRotation,
      transitionPlan.endRotation,
      easedProgress
    );
    
    // Interpolate FOV
    const currentFOV = MathUtils.lerp(
      transitionPlan.startFOV,
      transitionPlan.endFOV,
      easedProgress
    );
    
    // Apply to camera
    this.applyToCameraController(currentPosition, currentRotation, currentFOV);
    
    // Update transition progress tracking
    this.updateTransitionProgress({
      positionProgress: this.calculatePositionProgress(transitionPlan, currentPosition),
      rotationProgress: this.calculateRotationProgress(transitionPlan, currentRotation),
      fovProgress: progress
    });
  }
  
  createPositionCurve(start: CameraState, end: CameraState): PositionCurve {
    // Create smooth position curve that avoids obstacles
    const midPoint = start.position.clone().lerp(end.position, 0.5);
    
    // Add slight arc for more natural movement
    midPoint.y += Math.max(0.5, start.position.distanceTo(end.position) * 0.1);
    
    return {
      startPoint: start.position,
      controlPoint: midPoint,
      endPoint: end.position,
      curveType: 'quadratic'
    };
  }
  
  createRotationCurve(start: CameraState, end: CameraState): RotationCurve {
    // Ensure rotation takes shortest path
    const startQuat = new Quaternion().setFromEuler(start.rotation);
    const endQuat = new Quaternion().setFromEuler(end.rotation);
    
    // Check for shortest path
    if (startQuat.dot(endQuat) < 0) {
      endQuat.multiplyScalar(-1);
    }
    
    return {
      startRotation: startQuat,
      endRotation: endQuat,
      interpolationType: 'slerp'
    };
  }
  
  interpolateRotation(start: Euler, end: Euler, progress: number): Euler {
    const startQuat = new Quaternion().setFromEuler(start);
    const endQuat = new Quaternion().setFromEuler(end);
    
    const result = new Quaternion();
    result.slerpQuaternions(startQuat, endQuat, progress);
    
    return new Euler().setFromQuaternion(result);
  }
  
  validateTransitionCompletion(transitionPlan: CameraTransitionPlan): boolean {
    const currentState = this.getCurrentCameraState();
    
    const positionError = currentState.position.distanceTo(transitionPlan.endPosition);
    const rotationError = this.calculateRotationError(
      currentState.rotation,
      transitionPlan.endRotation
    );
    const fovError = Math.abs(currentState.fov - transitionPlan.endFOV);
    
    return (
      positionError < this.POSITION_TOLERANCE &&
      rotationError < this.ROTATION_TOLERANCE &&
      fovError < 1.0
    );
  }
}

interface CameraTransitionPlan {
  startPosition: Vector3;
  endPosition: Vector3;
  startRotation: Euler;
  endRotation: Euler;
  startFOV: number;
  endFOV: number;
  positionCurve: PositionCurve;
  rotationCurve: RotationCurve;
  fovCurve: FOVCurve;
}
```

**Implementation Steps**:
1. Create camera state synchronization calculations
2. Implement smooth position and rotation interpolation
3. Add collision-aware camera transition paths
4. Create validation system for transition completion
5. Integrate with existing camera controller systems

**Visual Feedback**: Smooth camera transitions with no jarring movements
**Success Metrics**: Position accuracy within 1cm, rotation accuracy within 0.1 degrees

#### Task 1.3: Model Visibility Coordination
**Success Criteria**: Seamless model visibility changes synchronized with camera transitions
```typescript
class ModelVisibilityController {
  private visibilityTransitions: Map<string, VisibilityTransition> = new Map();
  private fadeEffects: Map<string, FadeEffect> = new Map();
  
  coordinateVisibilityTransition(
    fromPOV: POVMode,
    toPOV: POVMode,
    transitionProgress: number
  ): void {
    const visibilityPlan = this.createVisibilityPlan(fromPOV, toPOV);
    
    // Update visibility based on transition progress
    this.updateVisibilityForProgress(visibilityPlan, transitionProgress);
    
    // Handle fade effects for smooth transitions
    this.updateFadeEffects(transitionProgress);
  }
  
  createVisibilityPlan(fromPOV: POVMode, toPOV: POVMode): VisibilityTransitionPlan {
    const currentVisibility = this.getCurrentVisibility();
    const targetVisibility = this.getTargetVisibility(toPOV);
    
    return {
      from: fromPOV,
      to: toPOV,
      currentState: currentVisibility,
      targetState: targetVisibility,
      transitions: this.calculateVisibilityTransitions(currentVisibility, targetVisibility),
      fadePoints: this.calculateFadePoints(fromPOV, toPOV)
    };
  }
  
  getTargetVisibility(pov: POVMode): PlayerModelVisibility {
    switch (pov) {
      case 'first-person':
        return {
          head: false,     // Hide head to prevent seeing inside
          body: false,     // Hide body for clean view
          arms: true,      // Show arms/hands for presence
          legs: false,     // Hide legs (unless looking down)
          accessories: true, // Show watches, gloves, etc.
          weapons: true    // Show weapons/tools
        };
        
      case 'third-person':
        return {
          head: true,      // Show full character
          body: true,      // Show full character
          arms: true,      // Show full character
          legs: true,      // Show full character
          accessories: true, // Show all accessories
          weapons: true    // Show all equipment
        };
        
      default:
        throw new Error(`Unsupported POV mode: ${pov}`);
    }
  }
  
  updateVisibilityForProgress(plan: VisibilityTransitionPlan, progress: number): void {
    for (const transition of plan.transitions) {
      if (progress >= transition.startProgress && progress <= transition.endProgress) {
        const localProgress = (progress - transition.startProgress) / 
                            (transition.endProgress - transition.startProgress);
        
        this.applyVisibilityTransition(transition, localProgress);
      }
    }
  }
  
  applyVisibilityTransition(transition: VisibilityTransition, progress: number): void {
    const modelPart = this.getModelPart(transition.partName);
    
    if (!modelPart) return;
    
    switch (transition.type) {
      case 'instant':
        modelPart.visible = transition.targetVisible;
        break;
        
      case 'fade':
        const opacity = transition.targetVisible ? progress : (1 - progress);
        this.setPartOpacity(modelPart, opacity);
        
        if (progress >= 1.0) {
          modelPart.visible = transition.targetVisible;
          this.setPartOpacity(modelPart, 1.0);
        }
        break;
        
      case 'scale':
        const scale = transition.targetVisible ? progress : (1 - progress);
        this.setPartScale(modelPart, scale);
        
        if (progress >= 1.0) {
          modelPart.visible = transition.targetVisible;
          this.setPartScale(modelPart, 1.0);
        }
        break;
    }
  }
  
  calculateVisibilityTransitions(
    current: PlayerModelVisibility,
    target: PlayerModelVisibility
  ): VisibilityTransition[] {
    const transitions: VisibilityTransition[] = [];
    
    for (const [partName, currentVisible] of Object.entries(current)) {
      const targetVisible = target[partName as keyof PlayerModelVisibility];
      
      if (currentVisible !== targetVisible) {
        transitions.push({
          partName,
          currentVisible,
          targetVisible,
          type: this.getTransitionType(partName),
          startProgress: this.getTransitionStart(partName),
          endProgress: this.getTransitionEnd(partName),
          priority: this.getTransitionPriority(partName)
        });
      }
    }
    
    // Sort by priority (higher priority transitions happen first)
    transitions.sort((a, b) => b.priority - a.priority);
    
    return transitions;
  }
  
  getTransitionType(partName: string): VisibilityTransitionType {
    // Different parts use different transition types
    const transitionTypes: Record<string, VisibilityTransitionType> = {
      head: 'instant',      // Head visibility changes instantly
      body: 'fade',         // Body fades for smooth transition
      arms: 'fade',         // Arms fade smoothly
      legs: 'instant',      // Legs change instantly (usually not visible in transitions)
      accessories: 'fade',  // Accessories fade
      weapons: 'scale'      // Weapons scale for dramatic effect
    };
    
    return transitionTypes[partName] || 'instant';
  }
  
  getTransitionStart(partName: string): number {
    // Define when each part's transition starts (0-1 progress)
    const startTimes: Record<string, number> = {
      head: 0.3,        // Head changes after camera starts moving
      body: 0.4,        // Body changes mid-transition
      arms: 0.2,        // Arms change early for first-person presence
      legs: 0.5,        // Legs change later
      accessories: 0.4, // Accessories change with body
      weapons: 0.1      // Weapons change early for impact
    };
    
    return startTimes[partName] || 0.0;
  }
  
  getTransitionEnd(partName: string): number {
    // Define when each part's transition ends
    const endTimes: Record<string, number> = {
      head: 0.4,        // Quick head transition
      body: 0.7,        // Body transition takes time
      arms: 0.5,        // Arms transition moderately quick
      legs: 0.6,        // Legs transition moderate time
      accessories: 0.7, // Accessories transition with body
      weapons: 0.3      // Weapons transition quickly
    };
    
    return endTimes[partName] || 1.0;
  }
  
  handleSpecialCases(pov: POVMode, progress: number): void {
    // Handle special visibility cases during transition
    
    if (pov === 'first-person' && progress > 0.8) {
      // Near end of transition to first-person
      this.optimizeForFirstPerson();
    }
    
    if (pov === 'third-person' && progress < 0.2) {
      // Early in transition to third-person
      this.prepareForThirdPerson();
    }
  }
  
  optimizeForFirstPerson(): void {
    // Optimize model for first-person viewing
    this.adjustArmPositioning();
    this.optimizeHandRendering();
    this.adjustWeaponPositioning();
  }
  
  adjustArmPositioning(): void {
    // Position arms optimally for first-person view
    const arms = this.getModelPart('arms');
    if (arms) {
      // Adjust arm position for first-person perspective
      const fpOffset = new Vector3(0.1, -0.2, -0.3);
      arms.position.add(fpOffset);
    }
  }
  
  validateVisibilityState(expectedPOV: POVMode): boolean {
    const currentVisibility = this.getCurrentVisibility();
    const expectedVisibility = this.getTargetVisibility(expectedPOV);
    
    return this.compareVisibilityStates(currentVisibility, expectedVisibility);
  }
}

interface VisibilityTransitionPlan {
  from: POVMode;
  to: POVMode;
  currentState: PlayerModelVisibility;
  targetState: PlayerModelVisibility;
  transitions: VisibilityTransition[];
  fadePoints: FadePoint[];
}

interface VisibilityTransition {
  partName: string;
  currentVisible: boolean;
  targetVisible: boolean;
  type: VisibilityTransitionType;
  startProgress: number;
  endProgress: number;
  priority: number;
}

type VisibilityTransitionType = 'instant' | 'fade' | 'scale';
```

**Implementation Steps**:
1. Create model visibility state management
2. Implement progressive visibility transitions with timing
3. Add fade and scale effects for smooth transitions
4. Create special case handling for first-person optimization
5. Integrate with existing model visibility systems

**Visual Feedback**: Smooth model visibility changes without pops or glitches
**Success Metrics**: No visible artifacts during visibility changes, transitions complete within timing windows

### Phase 2: Advanced Transition Features (Priority: High)

#### Task 2.1: Input Continuity During Transitions
**Success Criteria**: Player input remains responsive and consistent during POV transitions
```typescript
class InputContinuityController {
  private inputBuffer: InputBuffer = new InputBuffer();
  private inputTranslator: InputTranslator = new InputTranslator();
  private transitionInputFilter: TransitionInputFilter = new TransitionInputFilter();
  
  preserveInputDuringTransition(
    transitionState: POVSwitchingState,
    currentInput: MovementInput
  ): ProcessedInput {
    // Buffer input for consistency
    this.inputBuffer.addInput(currentInput);
    
    // Filter input based on transition phase
    const filteredInput = this.transitionInputFilter.filterInput(
      currentInput,
      transitionState
    );
    
    // Translate input between POV contexts
    const translatedInput = this.inputTranslator.translateInput(
      filteredInput,
      transitionState.previousPOV,
      transitionState.currentPOV,
      transitionState.transitionProgress
    );
    
    return translatedInput;
  }
  
  class InputBuffer {
    private buffer: TimestampedInput[] = [];
    private readonly MAX_BUFFER_SIZE = 60; // 1 second at 60fps
    
    addInput(input: MovementInput): void {
      this.buffer.push({
        input: { ...input },
        timestamp: Date.now()
      });
      
      // Maintain buffer size
      if (this.buffer.length > this.MAX_BUFFER_SIZE) {
        this.buffer.shift();
      }
    }
    
    getInputAtTime(timestamp: number): MovementInput | null {
      // Find input closest to requested timestamp
      let closest: TimestampedInput | null = null;
      let smallestDiff = Infinity;
      
      for (const bufferedInput of this.buffer) {
        const diff = Math.abs(bufferedInput.timestamp - timestamp);
        if (diff < smallestDiff) {
          smallestDiff = diff;
          closest = bufferedInput;
        }
      }
      
      return closest ? closest.input : null;
    }
    
    interpolateInput(time1: number, time2: number, progress: number): MovementInput | null {
      const input1 = this.getInputAtTime(time1);
      const input2 = this.getInputAtTime(time2);
      
      if (!input1 || !input2) return null;
      
      return {
        moveDirection: {
          x: MathUtils.lerp(input1.moveDirection.x, input2.moveDirection.x, progress),
          y: MathUtils.lerp(input1.moveDirection.y, input2.moveDirection.y, progress)
        },
        lookDirection: {
          x: MathUtils.lerp(input1.lookDirection.x, input2.lookDirection.x, progress),
          y: MathUtils.lerp(input1.lookDirection.y, input2.lookDirection.y, progress)
        },
        isWalkPressed: progress < 0.5 ? input1.isWalkPressed : input2.isWalkPressed,
        isRunPressed: progress < 0.5 ? input1.isRunPressed : input2.isRunPressed,
        isJumpPressed: input1.isJumpPressed || input2.isJumpPressed, // Preserve jump input
        isCrouchPressed: progress < 0.5 ? input1.isCrouchPressed : input2.isCrouchPressed,
        jumpPressTime: Math.max(input1.jumpPressTime, input2.jumpPressTime),
        jumpHoldTime: Math.max(input1.jumpHoldTime, input2.jumpHoldTime),
        lastInputTime: Math.max(input1.lastInputTime, input2.lastInputTime)
      };
    }
  }
  
  class InputTranslator {
    translateInput(
      input: MovementInput,
      fromPOV: POVMode,
      toPOV: POVMode,
      progress: number
    ): ProcessedInput {
      // Handle mouse look translation between POVs
      const translatedLook = this.translateMouseLook(input.lookDirection, fromPOV, toPOV, progress);
      
      // Handle movement translation (usually consistent between POVs)
      const translatedMovement = this.translateMovement(input.moveDirection, fromPOV, toPOV, progress);
      
      return {
        ...input,
        lookDirection: translatedLook,
        moveDirection: translatedMovement,
        translationApplied: true,
        translationProgress: progress
      };
    }
    
    translateMouseLook(
      lookDirection: Vector2,
      fromPOV: POVMode,
      toPOV: POVMode,
      progress: number
    ): Vector2 {
      // First-person to third-person: mouse look affects camera orbit
      if (fromPOV === 'first-person' && toPOV === 'third-person') {
        return this.translateFPtoTPLook(lookDirection, progress);
      }
      
      // Third-person to first-person: camera orbit becomes head look
      if (fromPOV === 'third-person' && toPOV === 'first-person') {
        return this.translateTPtoFPLook(lookDirection, progress);
      }
      
      return lookDirection;
    }
    
    translateFPtoTPLook(lookDirection: Vector2, progress: number): Vector2 {
      // Gradually transition from direct head control to camera orbit control
      const sensitivity = MathUtils.lerp(1.0, 0.7, progress); // Third-person is less sensitive
      
      return {
        x: lookDirection.x * sensitivity,
        y: lookDirection.y * sensitivity
      };
    }
    
    translateTPtoFPLook(lookDirection: Vector2, progress: number): Vector2 {
      // Gradually transition from camera orbit to direct head control
      const sensitivity = MathUtils.lerp(0.7, 1.0, progress); // First-person is more sensitive
      
      return {
        x: lookDirection.x * sensitivity,
        y: lookDirection.y * sensitivity
      };
    }
  }
  
  class TransitionInputFilter {
    filterInput(input: MovementInput, transitionState: POVSwitchingState): MovementInput {
      const filteredInput = { ...input };
      
      // Apply phase-specific filtering
      if (transitionState.currentPhase) {
        switch (transitionState.currentPhase.name) {
          case 'pre-transition':
            // Allow all input during pre-transition
            break;
            
          case 'camera-transition':
            // Reduce look sensitivity during camera transition for comfort
            filteredInput.lookDirection = this.reduceLookSensitivity(input.lookDirection, 0.3);
            break;
            
          case 'model-visibility':
            // Allow normal input during model visibility changes
            break;
            
          case 'post-transition':
            // Gradually restore full input sensitivity
            const restoreProgress = this.calculatePhaseProgress(transitionState.currentPhase);
            const sensitivity = MathUtils.lerp(0.7, 1.0, restoreProgress);
            filteredInput.lookDirection = this.scaleLookInput(input.lookDirection, sensitivity);
            break;
        }
      }
      
      // Apply comfort mode filtering if enabled
      if (transitionState.comfortMode) {
        filteredInput.lookDirection = this.applyComfortFiltering(filteredInput.lookDirection);
      }
      
      return filteredInput;
    }
    
    reduceLookSensitivity(lookDirection: Vector2, factor: number): Vector2 {
      return {
        x: lookDirection.x * factor,
        y: lookDirection.y * factor
      };
    }
    
    applyComfortFiltering(lookDirection: Vector2): Vector2 {
      // Apply additional smoothing for comfort
      const maxMovement = 0.05; // Limit rapid movements
      
      return {
        x: Math.max(-maxMovement, Math.min(maxMovement, lookDirection.x)),
        y: Math.max(-maxMovement, Math.min(maxMovement, lookDirection.y))
      };
    }
  }
  
  handleInputLatencyCompensation(
    processedInput: ProcessedInput,
    transitionLatency: number
  ): ProcessedInput {
    // Compensate for transition-induced input latency
    const compensationFactor = 1.0 + (transitionLatency / 16.67); // Base on 60fps frame time
    
    return {
      ...processedInput,
      lookDirection: {
        x: processedInput.lookDirection.x * compensationFactor,
        y: processedInput.lookDirection.y * compensationFactor
      },
      latencyCompensation: compensationFactor
    };
  }
  
  validateInputConsistency(
    originalInput: MovementInput,
    processedInput: ProcessedInput
  ): boolean {
    // Validate that processed input maintains essential characteristics
    const movementConsistent = this.isMovementConsistent(
      originalInput.moveDirection,
      processedInput.moveDirection
    );
    
    const actionsPreserved = (
      originalInput.isJumpPressed === processedInput.isJumpPressed &&
      originalInput.isRunPressed === processedInput.isRunPressed
    );
    
    return movementConsistent && actionsPreserved;
  }
}

interface ProcessedInput extends MovementInput {
  translationApplied: boolean;
  translationProgress: number;
  latencyCompensation?: number;
}

interface TimestampedInput {
  input: MovementInput;
  timestamp: number;
}
```

**Implementation Steps**:
1. Create input buffering system for continuity
2. Implement input translation between POV contexts
3. Add transition-aware input filtering
4. Create latency compensation for smooth feel
5. Integrate with existing input handling systems

**Visual Feedback**: Input remains responsive during transitions, no input lag or inconsistency
**Success Metrics**: Input latency increase under 10ms, no lost input events

#### Task 2.2: Performance-Optimized Transitions
**Success Criteria**: POV transitions maintain 60fps with minimal performance impact
```typescript
class TransitionPerformanceOptimizer {
  private readonly PERFORMANCE_BUDGET = 3.0; // 3ms per frame for transitions
  private performanceMonitor: TransitionPerformanceMonitor;
  private resourceManager: TransitionResourceManager;
  
  constructor() {
    this.performanceMonitor = new TransitionPerformanceMonitor();
    this.resourceManager = new TransitionResourceManager();
  }
  
  optimizeTransitionForPerformance(
    transitionConfig: TransitionConfig,
    systemCapabilities: SystemCapabilities
  ): OptimizedTransitionConfig {
    // Analyze system performance capabilities
    const performanceLevel = this.assessPerformanceLevel(systemCapabilities);
    
    // Create optimized config based on performance level
    const optimizedConfig = this.createOptimizedConfig(transitionConfig, performanceLevel);
    
    // Pre-warm resources needed for transition
    this.resourceManager.preWarmResources(optimizedConfig);
    
    return optimizedConfig;
  }
  
  assessPerformanceLevel(capabilities: SystemCapabilities): PerformanceLevel {
    const cpuScore = this.calculateCPUScore(capabilities);
    const gpuScore = this.calculateGPUScore(capabilities);
    const memoryScore = this.calculateMemoryScore(capabilities);
    
    const overallScore = (cpuScore + gpuScore + memoryScore) / 3;
    
    if (overallScore >= 0.8) return 'high';
    if (overallScore >= 0.5) return 'medium';
    return 'low';
  }
  
  createOptimizedConfig(
    baseConfig: TransitionConfig,
    performanceLevel: PerformanceLevel
  ): OptimizedTransitionConfig {
    const config = { ...baseConfig } as OptimizedTransitionConfig;
    
    switch (performanceLevel) {
      case 'high':
        // Full quality transitions
        config.updateFrequency = 60; // 60fps updates
        config.interpolationQuality = 'high';
        config.effectsEnabled = true;
        config.antiAliasing = true;
        break;
        
      case 'medium':
        // Balanced quality and performance
        config.updateFrequency = 45; // 45fps updates
        config.interpolationQuality = 'medium';
        config.effectsEnabled = true;
        config.antiAliasing = false;
        break;
        
      case 'low':
        // Performance-optimized transitions
        config.updateFrequency = 30; // 30fps updates
        config.interpolationQuality = 'low';
        config.effectsEnabled = false;
        config.antiAliasing = false;
        config.duration = Math.min(config.duration, 100); // Faster transitions
        break;
    }
    
    return config;
  }
  
  executeOptimizedTransition(
    config: OptimizedTransitionConfig,
    updateCallback: (progress: number) => void
  ): Promise<void> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const targetUpdateInterval = 1000 / config.updateFrequency;
      let lastUpdateTime = startTime;
      
      const updateTransition = () => {
        const currentTime = Date.now();
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / config.duration, 1.0);
        
        // Check if enough time has passed for next update
        if (currentTime - lastUpdateTime >= targetUpdateInterval) {
          this.performanceMonitor.startMeasurement('transition-update');
          
          updateCallback(progress);
          
          const updateTime = this.performanceMonitor.endMeasurement('transition-update');
          
          // Adaptive quality adjustment
          if (updateTime > this.PERFORMANCE_BUDGET) {
            this.adaptQualityForPerformance(config, updateTime);
          }
          
          lastUpdateTime = currentTime;
        }
        
        if (progress < 1.0) {
          requestAnimationFrame(updateTransition);
        } else {
          resolve();
        }
      };
      
      requestAnimationFrame(updateTransition);
    });
  }
  
  adaptQualityForPerformance(
    config: OptimizedTransitionConfig,
    actualUpdateTime: number
  ): void {
    const overBudget = actualUpdateTime - this.PERFORMANCE_BUDGET;
    const overBudgetPercent = overBudget / this.PERFORMANCE_BUDGET;
    
    if (overBudgetPercent > 0.5) {
      // Significant performance issue - aggressive optimization
      config.updateFrequency = Math.max(15, config.updateFrequency * 0.7);
      config.interpolationQuality = 'low';
      config.effectsEnabled = false;
    } else if (overBudgetPercent > 0.2) {
      // Moderate performance issue - moderate optimization
      config.updateFrequency = Math.max(30, config.updateFrequency * 0.85);
    }
  }
  
  class TransitionResourceManager {
    private preloadedAssets: Map<string, any> = new Map();
    private resourcePool: ResourcePool = new ResourcePool();
    
    preWarmResources(config: OptimizedTransitionConfig): void {
      // Pre-create objects that will be needed during transition
      this.resourcePool.prewarmVectors(10);
      this.resourcePool.prewarmEulers(5);
      this.resourcePool.prewarmQuaternions(5);
      
      // Pre-load any assets that might be needed
      if (config.effectsEnabled) {
        this.preloadTransitionEffects();
      }
    }
    
    preloadTransitionEffects(): void {
      // Pre-load fade shaders, particles, etc.
      const fadeShader = this.createFadeShader();
      this.preloadedAssets.set('fade-shader', fadeShader);
    }
    
    getPooledVector3(): Vector3 {
      return this.resourcePool.getVector3() || new Vector3();
    }
    
    returnPooledVector3(vector: Vector3): void {
      vector.set(0, 0, 0);
      this.resourcePool.returnVector3(vector);
    }
    
    cleanup(): void {
      this.resourcePool.cleanup();
      this.preloadedAssets.clear();
    }
  }
  
  class TransitionPerformanceMonitor {
    private measurements: Map<string, number> = new Map();
    private startTimes: Map<string, number> = new Map();
    
    startMeasurement(name: string): void {
      this.startTimes.set(name, performance.now());
    }
    
    endMeasurement(name: string): number {
      const startTime = this.startTimes.get(name);
      if (!startTime) return 0;
      
      const duration = performance.now() - startTime;
      this.measurements.set(name, duration);
      this.startTimes.delete(name);
      
      return duration;
    }
    
    getMeasurement(name: string): number {
      return this.measurements.get(name) || 0;
    }
    
    generatePerformanceReport(): TransitionPerformanceReport {
      return {
        averageUpdateTime: this.getMeasurement('transition-update'),
        totalTransitionTime: this.getMeasurement('total-transition'),
        resourceUsage: this.calculateResourceUsage(),
        frameRateImpact: this.calculateFrameRateImpact(),
        optimizationLevel: this.getOptimizationLevel()
      };
    }
  }
  
  monitorTransitionPerformance(
    transitionCallback: () => void
  ): TransitionPerformanceReport {
    this.performanceMonitor.startMeasurement('total-transition');
    
    const frameRateBefore = this.getCurrentFrameRate();
    
    transitionCallback();
    
    const frameRateAfter = this.getCurrentFrameRate();
    
    this.performanceMonitor.endMeasurement('total-transition');
    
    return {
      ...this.performanceMonitor.generatePerformanceReport(),
      frameRateBefore,
      frameRateAfter,
      frameRateImpact: frameRateBefore - frameRateAfter
    };
  }
}

interface OptimizedTransitionConfig extends TransitionConfig {
  updateFrequency: number;
  interpolationQuality: 'high' | 'medium' | 'low';
  effectsEnabled: boolean;
  antiAliasing: boolean;
}

interface TransitionPerformanceReport {
  averageUpdateTime: number;
  totalTransitionTime: number;
  resourceUsage: number;
  frameRateImpact: number;
  frameRateBefore: number;
  frameRateAfter: number;
  optimizationLevel: PerformanceLevel;
}

type PerformanceLevel = 'high' | 'medium' | 'low';
```

**Implementation Steps**:
1. Create performance monitoring system for transitions
2. Implement adaptive quality adjustment based on performance
3. Add resource pre-warming and pooling
4. Create performance-optimized transition execution
5. Integrate with existing performance management systems

**Visual Feedback**: Smooth 60fps maintained during transitions, adaptive quality visible
**Success Metrics**: Transition performance within 3ms budget, no frame rate drops

## Testing Procedures

### Unit Tests
```typescript
describe('POVSwitchingManager', () => {
  test('should complete POV transition within time limit', async () => {
    const povManager = new POVSwitchingManager();
    const startTime = Date.now();
    
    await povManager.switchToPOV('first-person');
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(200);
    expect(povManager.getCurrentPOV()).toBe('first-person');
  });
  
  test('should synchronize camera position correctly', () => {
    const cameraSync = new CameraTransitionController();
    const physicsState = createMockPhysicsState();
    
    const transitionPlan = cameraSync.synchronizeCameraStates(
      'third-person',
      'first-person',
      physicsState
    );
    
    expect(transitionPlan.endPosition.y).toBeCloseTo(physicsState.position.y + 1.6, 1);
  });
  
  test('should maintain input continuity during transition', () => {
    const inputController = new InputContinuityController();
    const transitionState = createMockTransitionState();
    const input = createMockInput();
    
    const processedInput = inputController.preserveInputDuringTransition(
      transitionState,
      input
    );
    
    expect(processedInput.translationApplied).toBe(true);
    expect(processedInput.isJumpPressed).toBe(input.isJumpPressed);
  });
});
```

### Integration Tests
```typescript
describe('POV Switching Integration', () => {
  test('complete POV switching workflow', async () => {
    const { getByTestId } = render(<TestWorldWithPOVSwitching />);
    const canvas = getByTestId('3d-canvas');
    
    // Start in third-person
    expect(getCurrentPOV()).toBe('third-person');
    
    // Switch to first-person
    fireEvent.keyDown(canvas, { key: 'v', code: 'KeyV' });
    
    await waitFor(() => {
      expect(getCurrentPOV()).toBe('first-person');
      expect(getPlayerBodyVisibility()).toBe(false);
    });
    
    // Switch back to third-person
    fireEvent.keyDown(canvas, { key: 'v', code: 'KeyV' });
    
    await waitFor(() => {
      expect(getCurrentPOV()).toBe('third-person');
      expect(getPlayerBodyVisibility()).toBe(true);
    });
  });
  
  test('POV switching during movement', async () => {
    const { container } = render(<TestWorldWithPOVSwitching />);
    
    // Start moving
    fireEvent.keyDown(container, { key: 'w', code: 'KeyW' });
    
    // Switch POV while moving
    fireEvent.keyDown(container, { key: 'v', code: 'KeyV' });
    
    await waitFor(() => {
      expect(getCurrentPOV()).toBe('first-person');
      expect(getCharacterVelocity().length()).toBeGreaterThan(0);
    });
  });
});
```

### Performance Tests
```typescript
describe('POV Switching Performance', () => {
  test('POV switching maintains frame rate', async () => {
    const performanceMonitor = new PerformanceMonitor();
    const povManager = new POVSwitchingManager();
    
    const metrics = await performanceMonitor.measureTransition(async () => {
      await povManager.switchToPOV('first-person');
      await povManager.switchToPOV('third-person');
    });
    
    expect(metrics.frameRateImpact).toBeLessThan(5); // Less than 5fps drop
    expect(metrics.averageTransitionTime).toBeLessThan(200);
  });
  
  test('rapid POV switching performance', async () => {
    const povManager = new POVSwitchingManager();
    
    for (let i = 0; i < 10; i++) {
      const startTime = performance.now();
      await povManager.togglePOV();
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(250);
    }
  });
});
```

## Performance Metrics

### Target Benchmarks
- **Switching Speed**: ≤ 200ms for complete POV transition
- **Frame Rate Stability**: ≤ 5fps drop during transitions
- **Input Latency**: ≤ 10ms additional latency during switching
- **Memory Overhead**: ≤ 5MB additional for switching system
- **Synchronization Accuracy**: Perfect state alignment within 1 frame

### Performance Monitoring
```typescript
interface SwitchingPerformanceMetrics {
  // Timing Metrics
  averageTransitionTime: number;
  fastestTransitionTime: number;
  slowestTransitionTime: number;
  
  // Frame Rate Metrics
  frameRateImpact: number;
  frameDrops: number;
  frameRateStability: number;
  
  // System Performance
  memoryUsage: number;
  cpuUsage: number;
  gpuUsage: number;
  
  // Quality Metrics
  synchronizationAccuracy: number;
  visualContinuity: number;
  inputResponsiveness: number;
}
```

## Potential Edge Cases

### Rapid POV Switching
**Scenario**: Player rapidly toggles between POV modes
**Handling**: Transition queuing with interruption handling
**Recovery**: Cancel previous transition and start new one smoothly

### Mid-Transition Interruption
**Scenario**: System needs to handle other events during POV transition
**Handling**: Pause transition, handle event, resume transition
**Recovery**: State validation and correction if needed

### Performance Degradation During Transition
**Scenario**: Frame rate drops significantly during switching
**Handling**: Automatic quality reduction and faster transition mode
**Recovery**: Performance monitoring with adaptive optimization

### State Synchronization Failure
**Scenario**: Camera, model, or animation states become desynchronized
**Handling**: State validation and automatic correction
**Recovery**: Emergency synchronization with user notification

### Memory Pressure During Switching
**Scenario**: System runs low on memory during complex transitions
**Handling**: Resource cleanup and simplified transition mode
**Recovery**: Memory optimization with graceful degradation

## Integration Points with Other Systems

### Camera Controller Integration
- **Connection Point**: `components/world/CameraController.tsx`
- **Interface**: POV mode management and camera state coordination
- **Data Flow**: POV switch request → Camera mode transition → State synchronization

### Animation System Integration
- **Connection Point**: Animation State Management System
- **Interface**: Animation state updates during POV transitions
- **Data Flow**: POV change → Animation context update → Animation blending

### Physics Controller Integration
- **Connection Point**: Character Physics Controller
- **Interface**: Physics state synchronization during transitions
- **Data Flow**: Physics state → Camera positioning → Model visibility

### Player Controller Integration
- **Connection Point**: `components/modules/PlayerControlModule.tsx`
- **Interface**: Input handling and POV switching triggers
- **Data Flow**: Input event → POV switch trigger → Transition execution

### UI System Integration
- **Connection Point**: Game UI and settings systems
- **Interface**: POV switching controls and comfort settings
- **Data Flow**: UI interaction → Settings update → POV behavior modification

---

**Implementation Priority**: Critical
**Estimated Complexity**: High
**Dependencies**: First-Person Camera System, Third-Person Camera System, Animation State Management
**Success Metrics**: Sub-200ms transitions with perfect state synchronization and maintained 60fps performance