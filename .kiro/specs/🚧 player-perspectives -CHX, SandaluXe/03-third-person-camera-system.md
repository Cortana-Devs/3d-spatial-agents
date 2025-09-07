# Third-Person Camera System - Implementation Prompt

## Feature Overview

The Third-Person Camera System provides a dynamic, intelligent camera that follows the player character from behind and above, offering optimal viewing angles for navigation, combat, and interaction. This system builds upon the existing CameraController architecture while introducing advanced features like smart collision avoidance, dynamic distance adjustment, and contextual framing to deliver a polished third-person gaming experience similar to modern AAA titles.

## Current State Analysis

### Existing Components
- **CameraController**: Supports orbit, fly, cinematic, and follow-simulant modes
- **PlayerControlModule**: Handles character movement and rotation
- **Player Avatar Integration**: Character models with full animation systems
- **First-Person Camera System**: Complementary perspective system
- **ModuleManager**: Performance-isolated rendering with optimized frame times

### Integration Points
- `components/world/CameraController.tsx` - Add third-person camera mode
- `components/modules/PlayerControlModule.tsx` - Character rotation integration
- `store/worldStore.ts` - Add third-person camera state
- `types/index.ts` - Define third-person camera interfaces

## Technical Requirements

### Core Functionality
1. **Dynamic Camera Following**: Smooth camera tracking with configurable distance and height
2. **Collision Avoidance**: Intelligent camera positioning to avoid walls and obstacles
3. **Look-At Targeting**: Camera automatically frames the character optimally
4. **Contextual Distance**: Automatic distance adjustment based on environment and actions
5. **Rotation Integration**: Camera rotation influences character facing direction

### Performance Targets
- **Frame Rate Stability**: Maintain 60fps during rapid character movement
- **Collision Detection**: Sub-5ms collision queries per frame
- **Camera Smoothing**: Smooth following with 8-16ms lag for natural feel
- **Transition Speed**: Camera position adjustments within 500ms
- **Memory Usage**: Under 15MB additional memory for third-person features

### Technical Constraints
- **Comfort Requirements**: Smooth camera movement to prevent disorientation
- **Visual Clarity**: Always maintain clear view of character and surroundings
- **Input Responsiveness**: Camera responds to player intent within 100ms
- **Integration Harmony**: Seamless transitions between first and third-person modes
- **Performance Isolation**: Use ModuleManager for consistent frame timing

## Design Specifications

### Third-Person Camera State Model

```typescript
interface ThirdPersonCameraState {
  // Camera Positioning
  followDistance: number; // Distance behind character (3-10 units)
  followHeight: number; // Height above character (1-5 units)
  followOffset: Vector3; // Additional offset from default position
  
  // Camera Behavior
  followSpeed: number; // How quickly camera follows (0.1-1.0)
  lookAheadDistance: number; // How far ahead to look when moving
  rotationSpeed: number; // Camera rotation responsiveness
  
  // Collision Avoidance
  collisionRadius: number; // Sphere radius for collision detection
  wallAvoidanceStrength: number; // How aggressively to avoid walls
  minDistance: number; // Minimum distance when pushed by obstacles
  maxDistance: number; // Maximum distance when pulled by obstacles
  
  // Dynamic Adjustments
  contextualDistance: {
    combat: number; // Distance during combat actions
    exploration: number; // Distance during normal movement
    interaction: number; // Distance during object interaction
    cinematic: number; // Distance during cutscenes
  };
  
  // Visual Framing
  targetFraming: {
    characterScreenPosition: Vector2; // Where character appears on screen
    lookaheadStrength: number; // How much to lead character movement
    verticalOffset: number; // Additional vertical framing adjustment
  };
  
  // Input Integration
  mouseInfluence: {
    enabled: boolean; // Whether mouse affects camera rotation
    sensitivity: number; // Mouse sensitivity for camera control
    returnSpeed: number; // Speed to return to default position
    maxAngleOffset: number; // Maximum angle offset from character
  };
}

interface ThirdPersonController {
  // Core State
  isActive: boolean;
  cameraState: ThirdPersonCameraState;
  targetPosition: Vector3;
  targetLookAt: Vector3;
  
  // Character Integration
  characterPosition: Vector3;
  characterRotation: Euler;
  characterVelocity: Vector3;
  characterAnimationState: string;
  
  // Environmental Context
  nearbyObstacles: CollisionObject[];
  groundHeight: number;
  enclosureLevel: number; // How enclosed the current space is
  
  // Performance State
  lastCollisionCheck: number;
  frameSkipCounter: number;
  optimizationLevel: number;
}
```

### Component Architecture

```typescript
interface ThirdPersonCameraManager {
  // Core Management
  initialize(character: Object3D, camera: Camera): void;
  activate(): void;
  deactivate(): void;
  update(deltaTime: number): void;
  
  // Camera Positioning
  updateCameraPosition(characterPosition: Vector3, characterRotation: Euler): void;
  calculateOptimalDistance(context: CameraContext): number;
  adjustForEnvironment(targetPosition: Vector3): Vector3;
  
  // Collision Avoidance
  performCollisionCheck(proposedPosition: Vector3): CollisionResult;
  findBestCameraPosition(idealPosition: Vector3): Vector3;
  avoidWallClipping(cameraPosition: Vector3, lookAtPosition: Vector3): Vector3;
  
  // Dynamic Behavior
  updateContextualDistance(context: CameraContext): void;
  applyLookAhead(characterVelocity: Vector3): Vector3;
  handleMouseInput(mouseInput: Vector2): void;
  
  // Visual Framing
  frameShotOptimally(character: Object3D, environment: Object3D[]): void;
  adjustForScreenComposition(): void;
  maintainVisualClarity(): void;
  
  // State Management
  getState(): ThirdPersonCameraState;
  setState(state: Partial<ThirdPersonCameraState>): void;
  transitionFromFirstPerson(duration?: number): void;
  
  // Performance
  getPerformanceMetrics(): ThirdPersonPerformanceMetrics;
  optimizeForPerformance(level: number): void;
}

interface CameraContext {
  activity: 'exploration' | 'combat' | 'interaction' | 'cinematic';
  environment: 'open' | 'indoor' | 'tight' | 'vertical';
  characterState: 'idle' | 'walking' | 'running' | 'jumping' | 'climbing';
  interactionTarget?: Object3D;
}

interface CollisionResult {
  hasCollision: boolean;
  collisionPoint: Vector3;
  collisionNormal: Vector3;
  suggestedPosition: Vector3;
  obstacleType: 'wall' | 'ceiling' | 'floor' | 'object';
}
```

## Implementation Tasks

### Phase 1: Core Camera Following (Priority: Critical)

#### Task 1.1: Third-Person Camera Mode Integration
**Success Criteria**: Third-person mode available and provides smooth character following
```typescript
// Extend CameraController with third-person mode
interface EnhancedCameraController extends CameraController {
  thirdPersonController: ThirdPersonCameraManager;
  
  switchToThirdPerson(): void {
    this.deactivateCurrentMode();
    this.thirdPersonController.activate();
    this.updateCameraMode('third-person');
  }
  
  handleThirdPersonUpdate(deltaTime: number): void {
    if (this.activeMode === 'third-person') {
      this.thirdPersonController.update(deltaTime);
    }
  }
}
```

**Implementation Steps**:
1. Add 'third-person' to `CameraMode` type in `types/index.ts`
2. Extend `CameraController` with third-person mode handling
3. Create smooth mode transitions from first-person and orbit modes
4. Integrate with existing camera preset system
5. Add third-person configuration to camera presets

**Visual Feedback**: Third-person option appears in camera mode selector
**Success Metrics**: Mode activation within 200ms, smooth following established

#### Task 1.2: Character Following Logic
**Success Criteria**: Camera smoothly follows character with configurable distance and smoothing
```typescript
class ThirdPersonFollowing {
  private readonly DEFAULT_DISTANCE = 6.0;
  private readonly DEFAULT_HEIGHT = 2.5;
  private readonly FOLLOW_SPEED = 0.12;
  
  calculateCameraPosition(
    characterPosition: Vector3,
    characterRotation: Euler,
    deltaTime: number
  ): Vector3 {
    // Calculate ideal position behind and above character
    const characterForward = new Vector3(0, 0, -1);
    characterForward.applyEuler(characterRotation);
    
    const idealPosition = characterPosition.clone();
    idealPosition.add(characterForward.multiplyScalar(-this.followDistance));
    idealPosition.y += this.followHeight;
    
    // Apply look-ahead based on character velocity
    const lookAhead = this.calculateLookAhead();
    idealPosition.add(lookAhead);
    
    // Smooth interpolation to target position
    const currentPosition = this.camera.position.clone();
    return currentPosition.lerp(idealPosition, this.FOLLOW_SPEED);
  }
  
  calculateLookAhead(): Vector3 {
    const velocity = this.getCharacterVelocity();
    const lookAheadStrength = this.cameraState.targetFraming.lookaheadStrength;
    
    return velocity.multiplyScalar(lookAheadStrength);
  }
}
```

**Implementation Steps**:
1. Create basic camera following mathematics
2. Implement smooth interpolation for natural camera movement
3. Add configurable distance and height parameters
4. Create look-ahead system for dynamic character movement
5. Integrate with character rotation for proper positioning

**Visual Feedback**: Camera follows character smoothly at appropriate distance
**Success Metrics**: Following lag under 100ms, smooth interpolation visible

#### Task 1.3: Look-At and Framing System
**Success Criteria**: Camera automatically frames character optimally in all situations
```typescript
class ThirdPersonFraming {
  private readonly CHARACTER_SCREEN_POSITION = new Vector2(0, -0.2); // Slightly below center
  
  calculateLookAtPosition(characterPosition: Vector3): Vector3 {
    // Base look-at position at character center
    const lookAtPosition = characterPosition.clone();
    
    // Apply vertical offset for better framing
    const verticalOffset = this.cameraState.targetFraming.verticalOffset;
    lookAtPosition.y += verticalOffset;
    
    // Adjust for character animation state
    const animationOffset = this.getAnimationFramingOffset();
    lookAtPosition.add(animationOffset);
    
    // Apply look-ahead for moving characters
    const movementOffset = this.getMovementFramingOffset();
    lookAtPosition.add(movementOffset);
    
    return lookAtPosition;
  }
  
  maintainOptimalFraming(): void {
    // Ensure character is positioned correctly in screen space
    const screenPosition = this.worldToScreen(this.characterPosition);
    const targetPosition = this.CHARACTER_SCREEN_POSITION;
    
    if (screenPosition.distanceTo(targetPosition) > 0.1) {
      // Adjust camera to improve framing
      this.adjustCameraForFraming(screenPosition, targetPosition);
    }
  }
  
  adjustCameraForFraming(current: Vector2, target: Vector2): void {
    const offset = target.clone().sub(current);
    const worldOffset = this.screenToWorldOffset(offset);
    
    this.targetPosition.add(worldOffset);
  }
}
```

**Implementation Steps**:
1. Create look-at calculation system
2. Implement optimal character framing logic
3. Add dynamic framing adjustments for different activities
4. Create screen-space position monitoring
5. Implement automatic framing correction

**Visual Feedback**: Character consistently well-framed in camera view
**Success Metrics**: Character within optimal screen region 95% of time

### Phase 2: Collision Avoidance and Intelligence (Priority: High)

#### Task 2.1: Collision Detection System
**Success Criteria**: Camera intelligently avoids walls and obstacles without losing character visibility
```typescript
class ThirdPersonCollision {
  private readonly COLLISION_RADIUS = 0.3;
  private readonly RAY_COUNT = 8; // Rays in multiple directions
  private readonly MAX_COLLISION_CHECKS = 16; // Performance limit
  
  performCollisionCheck(proposedPosition: Vector3): CollisionResult {
    const raycaster = new Raycaster();
    const characterPosition = this.getCharacterPosition();
    
    // Primary ray from character to camera position
    const direction = proposedPosition.clone().sub(characterPosition).normalize();
    const distance = proposedPosition.distanceTo(characterPosition);
    
    raycaster.set(characterPosition, direction);
    raycaster.far = distance;
    
    const intersections = raycaster.intersectObjects(this.getCollisionObjects());
    
    if (intersections.length > 0) {
      const collision = intersections[0];
      return {
        hasCollision: true,
        collisionPoint: collision.point,
        collisionNormal: collision.face.normal,
        suggestedPosition: this.calculateAvoidancePosition(collision),
        obstacleType: this.classifyObstacle(collision.object)
      };
    }
    
    return { hasCollision: false };
  }
  
  calculateAvoidancePosition(collision: Intersection): Vector3 {
    // Push camera away from collision point
    const avoidanceDirection = collision.face.normal.clone();
    const pushDistance = this.COLLISION_RADIUS * 2;
    
    return collision.point.clone().add(
      avoidanceDirection.multiplyScalar(pushDistance)
    );
  }
  
  findBestCameraPosition(idealPosition: Vector3): Vector3 {
    // Try multiple alternative positions if ideal position has collision
    const alternatives = this.generateAlternativePositions(idealPosition);
    
    for (const alternative of alternatives) {
      const collisionResult = this.performCollisionCheck(alternative);
      if (!collisionResult.hasCollision) {
        return alternative;
      }
    }
    
    // Fallback to closest safe position
    return this.findClosestSafePosition(idealPosition);
  }
}
```

**Implementation Steps**:
1. Create raycasting system for camera collision detection
2. Implement multi-directional collision checking
3. Add intelligent collision avoidance positioning
4. Create performance-optimized collision queries
5. Implement fallback systems for complex collision scenarios

**Visual Feedback**: Camera never clips through walls, maintains character visibility
**Success Metrics**: Collision detection under 5ms per frame, 99% obstacle avoidance

#### Task 2.2: Smart Camera Positioning
**Success Criteria**: Camera finds optimal positions when constrained by environment
```typescript
class SmartCameraPositioning {
  private positionHistory: Vector3[] = [];
  private readonly HISTORY_LENGTH = 30; // 0.5 seconds at 60fps
  
  calculateSmartPosition(
    idealPosition: Vector3,
    environmentConstraints: EnvironmentConstraint[]
  ): Vector3 {
    // Evaluate multiple candidate positions
    const candidates = this.generateCandidatePositions(idealPosition);
    
    // Score each candidate based on multiple criteria
    const scoredCandidates = candidates.map(position => ({
      position,
      score: this.scoreCameraPosition(position, environmentConstraints)
    }));
    
    // Sort by score and select best
    scoredCandidates.sort((a, b) => b.score - a.score);
    const bestPosition = scoredCandidates[0].position;
    
    // Apply smoothing to prevent jittery movement
    return this.applySmoothingToPosition(bestPosition);
  }
  
  scoreCameraPosition(position: Vector3, constraints: EnvironmentConstraint[]): number {
    let score = 100; // Base score
    
    // Distance from ideal position (closer = better)
    const idealDistance = position.distanceTo(this.idealPosition);
    score -= idealDistance * 10;
    
    // Character visibility (more visible = better)
    const visibilityScore = this.calculateCharacterVisibility(position);
    score += visibilityScore * 30;
    
    // Collision avoidance (no collisions = better)
    const collisionPenalty = this.calculateCollisionPenalty(position);
    score -= collisionPenalty * 50;
    
    // Environmental context (appropriate for activity = better)
    const contextScore = this.calculateContextScore(position);
    score += contextScore * 20;
    
    // Stability (consistent with recent positions = better)
    const stabilityScore = this.calculateStabilityScore(position);
    score += stabilityScore * 15;
    
    return score;
  }
  
  applySmoothingToPosition(targetPosition: Vector3): Vector3 {
    // Add to position history
    this.positionHistory.push(targetPosition.clone());
    if (this.positionHistory.length > this.HISTORY_LENGTH) {
      this.positionHistory.shift();
    }
    
    // Calculate weighted average with recent positions
    const currentPosition = this.camera.position.clone();
    const smoothingFactor = this.calculateSmoothingFactor();
    
    return currentPosition.lerp(targetPosition, smoothingFactor);
  }
}
```

**Implementation Steps**:
1. Create candidate position generation system
2. Implement multi-criteria position scoring
3. Add environmental awareness to positioning
4. Create position smoothing for stability
5. Implement adaptive positioning based on context

**Visual Feedback**: Camera intelligently positions itself in complex environments
**Success Metrics**: Optimal positioning achieved 90% of the time, smooth transitions

### Phase 3: Dynamic Behavior and Polish (Priority: Medium)

#### Task 3.1: Contextual Distance Adjustment
**Success Criteria**: Camera distance adjusts based on player activity and environment
```typescript
class ContextualDistanceController {
  private readonly DISTANCE_CONFIGS = {
    exploration: { distance: 6.0, height: 2.5, transition: 1.0 },
    combat: { distance: 4.5, height: 2.0, transition: 0.5 },
    interaction: { distance: 3.0, height: 1.5, transition: 0.8 },
    cinematic: { distance: 8.0, height: 3.0, transition: 2.0 }
  };
  
  updateContextualDistance(context: CameraContext): void {
    const config = this.DISTANCE_CONFIGS[context.activity];
    const currentDistance = this.cameraState.followDistance;
    
    if (Math.abs(currentDistance - config.distance) > 0.5) {
      this.transitionToDistance(
        config.distance,
        config.height,
        config.transition
      );
    }
  }
  
  transitionToDistance(
    targetDistance: number,
    targetHeight: number,
    duration: number
  ): void {
    const startDistance = this.cameraState.followDistance;
    const startHeight = this.cameraState.followHeight;
    const startTime = Date.now();
    
    const transition = {
      startTime,
      duration: duration * 1000,
      startDistance,
      targetDistance,
      startHeight,
      targetHeight
    };
    
    this.activeTransition = transition;
  }
  
  detectActivity(): CameraContext {
    // Analyze character state to determine current activity
    const velocity = this.getCharacterVelocity();
    const animationState = this.getCharacterAnimationState();
    const nearbyInteractables = this.getNearbyInteractables();
    
    if (nearbyInteractables.length > 0 && velocity.length() < 0.5) {
      return { activity: 'interaction', environment: this.detectEnvironment() };
    }
    
    if (velocity.length() > 3.0) {
      return { activity: 'exploration', environment: this.detectEnvironment() };
    }
    
    return { activity: 'exploration', environment: this.detectEnvironment() };
  }
}
```

**Implementation Steps**:
1. Create activity detection system
2. Implement distance transition animations
3. Add environment-aware distance calculation
4. Create smooth transitions between distance modes
5. Integrate with character animation state

**Visual Feedback**: Camera distance changes appropriately for different activities
**Success Metrics**: Context detection 85% accurate, smooth distance transitions

#### Task 3.2: Mouse Input Integration
**Success Criteria**: Optional mouse input allows players to adjust camera angle while maintaining automatic following
```typescript
class ThirdPersonMouseControl {
  private mouseOffset: Euler = new Euler();
  private readonly MAX_ANGLE_OFFSET = Math.PI / 3; // 60 degrees
  private readonly RETURN_SPEED = 2.0;
  
  handleMouseInput(movementX: number, movementY: number): void {
    if (!this.cameraState.mouseInfluence.enabled) return;
    
    const sensitivity = this.cameraState.mouseInfluence.sensitivity;
    
    // Apply mouse input to offset angles
    this.mouseOffset.y -= movementX * sensitivity;
    this.mouseOffset.x -= movementY * sensitivity;
    
    // Clamp angles to prevent extreme positions
    this.mouseOffset.x = Math.max(
      -this.MAX_ANGLE_OFFSET,
      Math.min(this.MAX_ANGLE_OFFSET, this.mouseOffset.x)
    );
    
    this.mouseOffset.y = Math.max(
      -this.MAX_ANGLE_OFFSET,
      Math.min(this.MAX_ANGLE_OFFSET, this.mouseOffset.y)
    );
  }
  
  updateCameraWithMouseOffset(basePosition: Vector3, baseLookAt: Vector3): void {
    // Apply mouse offset to camera position
    const offsetPosition = this.applyOffsetToPosition(basePosition);
    const offsetLookAt = this.applyOffsetToLookAt(baseLookAt);
    
    this.camera.position.copy(offsetPosition);
    this.camera.lookAt(offsetLookAt);
  }
  
  updateMouseOffsetDecay(deltaTime: number): void {
    // Gradually return mouse offset to center when not actively moving
    if (this.mouseInputActivity < 0.1) {
      const returnSpeed = this.cameraState.mouseInfluence.returnSpeed;
      const decay = returnSpeed * deltaTime;
      
      this.mouseOffset.x = this.moveTowards(this.mouseOffset.x, 0, decay);
      this.mouseOffset.y = this.moveTowards(this.mouseOffset.y, 0, decay);
    }
  }
  
  influenceCharacterRotation(): void {
    // Optionally influence character facing direction based on camera
    if (Math.abs(this.mouseOffset.y) > Math.PI / 6) {
      const targetRotation = this.getCharacterRotation();
      targetRotation.y += this.mouseOffset.y * 0.3; // Partial influence
      this.setCharacterRotation(targetRotation);
    }
  }
}
```

**Implementation Steps**:
1. Create mouse input handling for camera offset
2. Implement angle constraints to prevent extreme positions
3. Add automatic return-to-center behavior
4. Create optional character rotation influence
5. Integrate with existing pointer lock system

**Visual Feedback**: Mouse movement provides camera control while maintaining following
**Success Metrics**: Responsive mouse control with smooth return behavior

## Testing Procedures

### Unit Tests
```typescript
describe('ThirdPersonCameraManager', () => {
  test('should follow character at correct distance', () => {
    const cameraManager = new ThirdPersonCameraManager();
    const character = createMockCharacter();
    const camera = new PerspectiveCamera();
    
    cameraManager.initialize(character, camera);
    cameraManager.updateCameraPosition(new Vector3(0, 0, 0), new Euler());
    
    const distance = camera.position.distanceTo(character.position);
    expect(distance).toBeCloseTo(6.0, 1);
  });
  
  test('should avoid wall collisions', () => {
    const cameraManager = new ThirdPersonCameraManager();
    const wall = createMockWall();
    
    const idealPosition = new Vector3(0, 2, -3); // Behind wall
    const safePosition = cameraManager.findBestCameraPosition(idealPosition);
    
    const collision = cameraManager.performCollisionCheck(safePosition);
    expect(collision.hasCollision).toBe(false);
  });
  
  test('should adjust distance based on context', () => {
    const distanceController = new ContextualDistanceController();
    
    distanceController.updateContextualDistance({
      activity: 'combat',
      environment: 'indoor',
      characterState: 'running'
    });
    
    expect(distanceController.getTargetDistance()).toBeCloseTo(4.5, 1);
  });
});
```

### Integration Tests
```typescript
describe('Third-Person Integration', () => {
  test('camera follows character movement smoothly', async () => {
    const { getByTestId } = render(<TestWorldWithThirdPerson />);
    const canvas = getByTestId('3d-canvas');
    
    await switchCameraMode('third-person');
    
    const initialCameraPos = getCameraPosition();
    
    // Move character forward
    fireEvent.keyDown(canvas, { key: 'w', code: 'KeyW' });
    await waitFor(() => {
      const newCameraPos = getCameraPosition();
      expect(newCameraPos.z).toBeGreaterThan(initialCameraPos.z);
    });
  });
  
  test('camera avoids obstacles in environment', async () => {
    const { container } = render(<TestWorldWithObstacles />);
    
    await switchCameraMode('third-person');
    
    // Move character behind wall
    await moveCharacterToPosition(new Vector3(0, 0, 5));
    
    const cameraPos = getCameraPosition();
    const hasLineOfSight = checkLineOfSight(cameraPos, getCharacterPosition());
    expect(hasLineOfSight).toBe(true);
  });
  
  test('contextual distance adjustment works', async () => {
    const { container } = render(<TestWorldWithThirdPerson />);
    
    await switchCameraMode('third-person');
    
    // Trigger combat context
    await triggerCombatMode();
    
    await waitFor(() => {
      const distance = getCameraDistance();
      expect(distance).toBeCloseTo(4.5, 1);
    });
  });
});
```

### Performance Tests
```typescript
describe('Third-Person Performance', () => {
  test('maintains 60fps with active collision detection', async () => {
    const performanceMonitor = new PerformanceMonitor();
    const tpCamera = new ThirdPersonCameraManager();
    
    const metrics = await performanceMonitor.measureFor(5000, () => {
      tpCamera.performCollisionCheck(getRandomPosition());
      tpCamera.update(0.016);
    });
    
    expect(metrics.averageFPS).toBeGreaterThanOrEqual(58);
    expect(metrics.collisionCheckTime).toBeLessThan(5);
  });
  
  test('collision system scales with obstacle count', () => {
    const collision = new ThirdPersonCollision();
    const obstacles = createObstacles(100);
    
    const startTime = performance.now();
    collision.performCollisionCheck(new Vector3(0, 0, 0));
    const duration = performance.now() - startTime;
    
    expect(duration).toBeLessThan(10); // 10ms max
  });
});
```

## Performance Metrics

### Target Benchmarks
- **Frame Rate**: ≥ 58 FPS during active camera movement
- **Collision Detection**: ≤ 5ms per collision check
- **Following Response**: ≤ 100ms lag from character movement
- **Mode Transition**: ≤ 500ms complete transition
- **Memory Usage**: ≤ 15MB additional for third-person features

### Performance Monitoring
```typescript
interface ThirdPersonPerformanceMetrics {
  // Camera Performance
  followingLatency: number;
  positionUpdateTime: number;
  lookAtUpdateTime: number;
  
  // Collision Performance
  collisionCheckTime: number;
  raycastCount: number;
  obstacleEvaluationTime: number;
  
  // Positioning Performance
  positionScoringTime: number;
  candidateGenerationTime: number;
  smoothingCalculationTime: number;
  
  // System Integration
  modeTransitionTime: number;
  contextDetectionTime: number;
  mouseIntegrationTime: number;
}
```

## Potential Edge Cases

### Character Occlusion
**Scenario**: Character becomes hidden behind obstacles
**Handling**: Intelligent camera repositioning with visibility scoring
**Recovery**: Automatic camera adjustment to maintain character visibility

### Rapid Environment Changes
**Scenario**: Character moves quickly between open and enclosed spaces
**Handling**: Adaptive distance adjustment with transition smoothing
**Recovery**: Context detection reset and recalibration

### Complex Geometry Collision
**Scenario**: Camera gets stuck in complex geometry intersections
**Handling**: Multi-ray collision detection with fallback positioning
**Recovery**: Emergency camera reset to safe position

### Performance Degradation
**Scenario**: Collision detection causes frame rate drops
**Handling**: Adaptive collision quality reduction and batch processing
**Recovery**: Gradual quality restoration as performance improves

### Mouse Input Conflicts
**Scenario**: Mouse input interferes with automatic camera following
**Handling**: Weighted input blending with automatic return behavior
**Recovery**: Input priority system with user preference options

## Integration Points with Other Systems

### Camera Controller Integration
- **Connection Point**: `components/world/CameraController.tsx`
- **Interface**: Add third-person mode to camera system architecture
- **Data Flow**: Camera mode selection → Third-person activation → Following behavior

### Character Controller Integration
- **Connection Point**: `components/modules/PlayerControlModule.tsx`
- **Interface**: Character position/rotation updates, movement state sharing
- **Data Flow**: Character movement → Position updates → Camera following

### Collision System Integration
- **Connection Point**: World collision detection systems
- **Interface**: Obstacle detection, raycasting for collision avoidance
- **Data Flow**: World geometry → Collision queries → Camera position adjustment

### Animation System Integration
- **Connection Point**: `components/animations/IsolatedAnimationManager.tsx`
- **Interface**: Character animation state for contextual distance adjustment
- **Data Flow**: Animation state → Context detection → Distance adjustment

### UI System Integration
- **Connection Point**: Camera controls and settings UI
- **Interface**: Distance settings, mouse sensitivity, comfort options
- **Data Flow**: UI controls → Camera settings → Behavior modification

---

**Implementation Priority**: High
**Estimated Complexity**: High
**Dependencies**: Player Avatar Integration, Character Controller, Collision System
**Success Metrics**: Smooth third-person experience with intelligent obstacle avoidance and 58+ FPS