# Character Physics Controller System - Implementation Prompt

## Feature Overview

The Character Physics Controller System provides realistic ground-based character movement with proper physics simulation, including gravity, ground detection, jumping mechanics, collision response, and environmental interaction. This system replaces the current fly-mode movement with character-based physics that feels natural and responsive while maintaining the performance standards of the existing ModuleManager architecture.

## Current State Analysis

### Existing Components
- **PlayerControlModule**: Currently handles fly-mode with basic movement and collision
- **Physics Integration**: Basic gravity simulation and ground collision in fly mode
- **Player Avatar Integration**: 3D character models with animation systems
- **Camera Systems**: First-person and third-person camera implementations
- **ModuleManager**: Performance-isolated system with 60fps targeting

### Integration Points
- `components/modules/PlayerControlModule.tsx` - Replace fly-mode with character physics
- `utils/physics/` - Create dedicated physics utilities for character control
- `store/worldStore.ts` - Add character physics state management
- `types/index.ts` - Define character physics interfaces
- Integration with first/third-person camera systems

## Technical Requirements

### Core Functionality
1. **Ground-Based Movement**: Character walks/runs on surfaces with proper foot placement
2. **Gravity and Jumping**: Realistic gravity simulation with responsive jump mechanics
3. **Collision Response**: Smooth collision handling with world geometry and objects
4. **Slope Handling**: Natural movement on inclined surfaces with traction control
5. **Environmental Interaction**: Step climbing, edge detection, and surface adaptation

### Performance Targets
- **Frame Rate**: Maintain 60fps with full physics simulation
- **Physics Update**: ≤ 3ms per frame for character physics calculations
- **Collision Detection**: ≤ 2ms per frame for character collision queries
- **Input Response**: ≤ 16ms latency from input to character response
- **Memory Usage**: ≤ 20MB additional for physics simulation

### Technical Constraints
- **Realistic Movement**: Natural feeling character control without floaty behavior
- **Responsive Input**: Immediate response to player input for tight control
- **Stable Physics**: Consistent physics behavior across different frame rates
- **Scalable Performance**: Physics complexity scales with environment complexity
- **Cross-Platform**: Consistent behavior across different hardware capabilities

## Design Specifications

### Character Physics State Model

```typescript
interface CharacterPhysicsState {
  // Position and Movement
  position: Vector3;
  velocity: Vector3;
  acceleration: Vector3;
  rotation: Euler;
  angularVelocity: Vector3;
  
  // Ground Interaction
  isGrounded: boolean;
  groundNormal: Vector3;
  groundDistance: number;
  groundMaterial: SurfaceMaterial;
  lastGroundContact: number;
  
  // Movement Properties
  walkSpeed: number;
  runSpeed: number;
  jumpForce: number;
  friction: number;
  airResistance: number;
  
  // Physics Configuration
  mass: number;
  gravityScale: number;
  maxSlopeAngle: number;
  stepHeight: number;
  characterRadius: number;
  characterHeight: number;
  
  // State Flags
  isJumping: boolean;
  isFalling: boolean;
  isRunning: boolean;
  isCrouching: boolean;
  isClimbing: boolean;
  
  // Environmental Context
  waterLevel: number;
  windForce: Vector3;
  surfaceTraction: number;
  environmentalForces: Vector3[];
}

interface CharacterCollisionInfo {
  // Collision Geometry
  capsuleCollider: CapsuleCollider;
  groundSensor: SphereCastSensor;
  wallSensors: RaycastSensor[];
  
  // Collision Results
  groundHit: CollisionHit | null;
  wallHits: CollisionHit[];
  ceilingHit: CollisionHit | null;
  
  // Collision Response
  correctionVector: Vector3;
  slidingVector: Vector3;
  penetrationDepth: number;
}

interface MovementInput {
  // Input Vectors
  moveDirection: Vector2; // Forward/backward, left/right
  lookDirection: Vector2; // Yaw, pitch
  
  // Input Flags
  isWalkPressed: boolean;
  isRunPressed: boolean;
  isJumpPressed: boolean;
  isCrouchPressed: boolean;
  
  // Input Timing
  jumpPressTime: number;
  jumpHoldTime: number;
  lastInputTime: number;
}
```

### Component Architecture

```typescript
interface CharacterPhysicsController {
  // Core Physics
  initialize(character: Object3D, world: PhysicsWorld): void;
  update(deltaTime: number, input: MovementInput): void;
  fixedUpdate(fixedDeltaTime: number): void;
  
  // Movement Control
  applyMovementInput(input: MovementInput): void;
  calculateMovementForces(input: MovementInput): Vector3;
  applyMovementForces(forces: Vector3): void;
  
  // Ground Interaction
  checkGroundContact(): GroundContactInfo;
  handleGroundMovement(input: MovementInput): void;
  handleAirMovement(input: MovementInput): void;
  
  // Collision Processing
  performCollisionDetection(): CharacterCollisionInfo;
  resolveCollisions(collisionInfo: CharacterCollisionInfo): void;
  handleSlopeMovement(slopeAngle: number, slopeNormal: Vector3): void;
  
  // Jump and Air Control
  initiateJump(jumpForce?: number): void;
  handleJumpInput(input: MovementInput): void;
  applyGravity(deltaTime: number): void;
  
  // Environmental Forces
  applyEnvironmentalForces(forces: Vector3[]): void;
  handleWaterInteraction(waterLevel: number): void;
  handleWindEffects(windForce: Vector3): void;
  
  // State Management
  updatePhysicsState(deltaTime: number): void;
  getPhysicsState(): CharacterPhysicsState;
  setPhysicsState(state: Partial<CharacterPhysicsState>): void;
  
  // Performance and Debugging
  getPerformanceMetrics(): PhysicsPerformanceMetrics;
  getDebugInfo(): PhysicsDebugInfo;
}

interface GroundContactInfo {
  hasContact: boolean;
  contactPoint: Vector3;
  contactNormal: Vector3;
  contactDistance: number;
  surfaceAngle: number;
  surfaceMaterial: SurfaceMaterial;
  isWalkable: boolean;
}

interface CapsuleCollider {
  center: Vector3;
  radius: number;
  height: number;
  topSphere: Vector3;
  bottomSphere: Vector3;
}
```

## Implementation Tasks

### Phase 1: Core Physics Foundation (Priority: Critical)

#### Task 1.1: Character Collider System
**Success Criteria**: Character represented by accurate capsule collider with proper collision detection
```typescript
class CharacterCapsuleCollider {
  private readonly DEFAULT_RADIUS = 0.3;
  private readonly DEFAULT_HEIGHT = 1.8;
  
  constructor(radius: number = this.DEFAULT_RADIUS, height: number = this.DEFAULT_HEIGHT) {
    this.radius = radius;
    this.height = height;
    this.updateColliderGeometry();
  }
  
  updateColliderGeometry(): void {
    // Calculate capsule parameters
    const halfHeight = this.height / 2;
    const capsuleHeight = this.height - (this.radius * 2);
    
    this.topSphere = new Vector3(0, halfHeight - this.radius, 0);
    this.bottomSphere = new Vector3(0, -halfHeight + this.radius, 0);
    this.cylinderHeight = capsuleHeight;
  }
  
  checkCollisionWithWorld(worldGeometry: Object3D[]): CollisionResult[] {
    const collisions: CollisionResult[] = [];
    
    // Check sphere collisions at top and bottom
    collisions.push(...this.checkSphereCollisions(this.topSphere));
    collisions.push(...this.checkSphereCollisions(this.bottomSphere));
    
    // Check cylinder collision for middle section
    collisions.push(...this.checkCylinderCollisions());
    
    return collisions;
  }
  
  resolveCollisionPenetration(collisions: CollisionResult[]): Vector3 {
    let totalCorrection = new Vector3();
    
    for (const collision of collisions) {
      if (collision.penetrationDepth > 0) {
        const correction = collision.normal.clone();
        correction.multiplyScalar(collision.penetrationDepth);
        totalCorrection.add(correction);
      }
    }
    
    return totalCorrection;
  }
}
```

**Implementation Steps**:
1. Create capsule collider geometry representation
2. Implement sphere-world and cylinder-world collision detection
3. Add collision response and penetration resolution
4. Create efficient broad-phase collision culling
5. Integrate with existing world geometry systems

**Visual Feedback**: Character collider visible in debug mode, no clipping through geometry
**Success Metrics**: Collision detection under 2ms, 99% penetration resolution accuracy

#### Task 1.2: Ground Detection System
**Success Criteria**: Accurate ground detection with surface normal calculation and slope analysis
```typescript
class GroundDetectionSystem {
  private readonly GROUND_CHECK_DISTANCE = 0.1;
  private readonly MAX_GROUND_ANGLE = Math.PI / 4; // 45 degrees
  private readonly SPHERE_CAST_RADIUS = 0.25;
  
  performGroundCheck(characterPosition: Vector3): GroundContactInfo {
    const groundRay = new Raycaster();
    const rayOrigin = characterPosition.clone();
    rayOrigin.y += this.SPHERE_CAST_RADIUS;
    
    const rayDirection = new Vector3(0, -1, 0);
    const rayDistance = this.SPHERE_CAST_RADIUS + this.GROUND_CHECK_DISTANCE;
    
    groundRay.set(rayOrigin, rayDirection);
    groundRay.far = rayDistance;
    
    const groundHits = groundRay.intersectObjects(this.getGroundObjects(), true);
    
    if (groundHits.length > 0) {
      const hit = groundHits[0];
      const surfaceAngle = this.calculateSurfaceAngle(hit.face.normal);
      
      return {
        hasContact: true,
        contactPoint: hit.point,
        contactNormal: hit.face.normal,
        contactDistance: hit.distance - this.SPHERE_CAST_RADIUS,
        surfaceAngle,
        surfaceMaterial: this.identifySurfaceMaterial(hit.object),
        isWalkable: surfaceAngle <= this.MAX_GROUND_ANGLE
      };
    }
    
    return { hasContact: false };
  }
  
  calculateSurfaceAngle(normal: Vector3): number {
    const upVector = new Vector3(0, 1, 0);
    return Math.acos(normal.dot(upVector));
  }
  
  predictGroundContact(
    currentPosition: Vector3,
    velocity: Vector3,
    deltaTime: number
  ): GroundContactInfo {
    // Predict where the character will be next frame
    const predictedPosition = currentPosition.clone();
    predictedPosition.add(velocity.clone().multiplyScalar(deltaTime));
    
    return this.performGroundCheck(predictedPosition);
  }
}
```

**Implementation Steps**:
1. Create sphere-cast ground detection system
2. Implement surface normal calculation and slope analysis
3. Add predictive ground detection for smooth movement
4. Create surface material identification system
5. Optimize ground checking for performance

**Visual Feedback**: Ground contact indicators in debug mode, smooth movement on slopes
**Success Metrics**: Ground detection accuracy 95%, slope calculation within 1 degree

#### Task 1.3: Gravity and Vertical Movement
**Success Criteria**: Realistic gravity simulation with responsive jumping mechanics
```typescript
class GravityAndJumpController {
  private readonly GRAVITY_ACCELERATION = 9.81;
  private readonly DEFAULT_JUMP_FORCE = 8.0;
  private readonly COYOTE_TIME = 0.1; // Grace period after leaving ground
  private readonly JUMP_BUFFER_TIME = 0.1; // Grace period for early jump input
  
  private coyoteTimeRemaining: number = 0;
  private jumpBufferTimeRemaining: number = 0;
  private isJumpReleased: boolean = true;
  
  updateGravity(physicsState: CharacterPhysicsState, deltaTime: number): void {
    if (!physicsState.isGrounded) {
      // Apply gravity acceleration
      const gravityForce = this.GRAVITY_ACCELERATION * physicsState.gravityScale;
      physicsState.velocity.y -= gravityForce * deltaTime;
      
      // Apply air resistance
      const airResistance = physicsState.airResistance;
      physicsState.velocity.multiplyScalar(1 - (airResistance * deltaTime));
      
      // Update falling state
      physicsState.isFalling = physicsState.velocity.y < -0.1;
    } else {
      // Ground contact - reset vertical velocity if moving into ground
      if (physicsState.velocity.y < 0) {
        physicsState.velocity.y = 0;
      }
      physicsState.isFalling = false;
    }
  }
  
  handleJumpInput(
    input: MovementInput,
    physicsState: CharacterPhysicsState,
    deltaTime: number
  ): void {
    // Update timing states
    this.updateJumpTiming(input, physicsState, deltaTime);
    
    // Check for jump initiation
    if (this.canInitiateJump(input, physicsState)) {
      this.performJump(physicsState, input);
    }
  }
  
  canInitiateJump(input: MovementInput, physicsState: CharacterPhysicsState): boolean {
    // Can jump if grounded or within coyote time
    const canJumpFromGround = physicsState.isGrounded || this.coyoteTimeRemaining > 0;
    
    // Jump button pressed or within jump buffer time
    const hasJumpInput = input.isJumpPressed || this.jumpBufferTimeRemaining > 0;
    
    // Jump button was released since last jump (prevents holding)
    const jumpInputValid = this.isJumpReleased && hasJumpInput;
    
    return canJumpFromGround && jumpInputValid && !physicsState.isJumping;
  }
  
  performJump(physicsState: CharacterPhysicsState, input: MovementInput): void {
    // Calculate jump force (could be variable based on input timing)
    const jumpForce = this.calculateJumpForce(input);
    
    // Apply upward velocity
    physicsState.velocity.y = jumpForce;
    
    // Update state flags
    physicsState.isJumping = true;
    physicsState.isGrounded = false;
    physicsState.isFalling = false;
    
    // Reset timing states
    this.coyoteTimeRemaining = 0;
    this.jumpBufferTimeRemaining = 0;
    this.isJumpReleased = false;
  }
  
  calculateJumpForce(input: MovementInput): number {
    // Variable jump height based on input timing
    const baseJumpForce = this.DEFAULT_JUMP_FORCE;
    const holdTimeMultiplier = Math.min(input.jumpHoldTime / 0.2, 1.0);
    
    return baseJumpForce * (0.8 + 0.4 * holdTimeMultiplier);
  }
}
```

**Implementation Steps**:
1. Create gravity simulation with configurable parameters
2. Implement jump mechanics with coyote time and jump buffering
3. Add variable jump height based on input timing
4. Create air control system for mid-air movement adjustment
5. Integrate with ground detection for proper landing

**Visual Feedback**: Natural falling and jumping behavior, responsive jump timing
**Success Metrics**: Jump responsiveness under 50ms, realistic gravity feel

### Phase 2: Movement and Collision Resolution (Priority: High)

#### Task 2.1: Ground Movement System
**Success Criteria**: Smooth character movement on ground with proper acceleration and friction
```typescript
class GroundMovementController {
  private readonly WALK_SPEED = 3.5;
  private readonly RUN_SPEED = 7.0;
  private readonly ACCELERATION = 15.0;
  private readonly FRICTION = 12.0;
  private readonly AIR_ACCELERATION = 2.0;
  
  calculateGroundMovement(
    input: MovementInput,
    physicsState: CharacterPhysicsState,
    deltaTime: number
  ): Vector3 {
    // Get movement input direction
    const inputVector = new Vector3(input.moveDirection.x, 0, input.moveDirection.y);
    inputVector.normalize();
    
    // Calculate target velocity
    const targetSpeed = input.isRunPressed ? this.RUN_SPEED : this.WALK_SPEED;
    const targetVelocity = inputVector.multiplyScalar(targetSpeed);
    
    // Current horizontal velocity
    const currentVelocity = new Vector3(
      physicsState.velocity.x,
      0,
      physicsState.velocity.z
    );
    
    // Calculate acceleration needed
    const velocityDifference = targetVelocity.clone().sub(currentVelocity);
    const acceleration = this.ACCELERATION * deltaTime;
    
    // Limit acceleration to prevent overshooting
    if (velocityDifference.length() > acceleration) {
      velocityDifference.normalize().multiplyScalar(acceleration);
    }
    
    return currentVelocity.add(velocityDifference);
  }
  
  applySlopeMovement(
    velocity: Vector3,
    groundNormal: Vector3,
    slopeAngle: number
  ): Vector3 {
    if (slopeAngle < 0.1) return velocity; // Flat ground
    
    // Project velocity onto slope
    const slopeDirection = this.calculateSlopeDirection(groundNormal, velocity);
    const slopeVelocity = slopeDirection.multiplyScalar(velocity.length());
    
    // Apply slope factor (slower going uphill, faster downhill)
    const slopeFactor = this.calculateSlopeFactor(slopeAngle, velocity, groundNormal);
    slopeVelocity.multiplyScalar(slopeFactor);
    
    return slopeVelocity;
  }
  
  applyFriction(
    velocity: Vector3,
    physicsState: CharacterPhysicsState,
    deltaTime: number
  ): Vector3 {
    const frictionForce = physicsState.isGrounded ? this.FRICTION : 0.5;
    const surfaceFriction = physicsState.surfaceTraction;
    
    const totalFriction = frictionForce * surfaceFriction * deltaTime;
    
    // Apply friction opposite to movement direction
    const horizontalVelocity = new Vector3(velocity.x, 0, velocity.z);
    const frictionDirection = horizontalVelocity.clone().normalize().multiplyScalar(-1);
    
    const frictionVector = frictionDirection.multiplyScalar(
      Math.min(totalFriction, horizontalVelocity.length())
    );
    
    return velocity.add(frictionVector);
  }
}
```

**Implementation Steps**:
1. Create ground movement calculation with acceleration/deceleration
2. Implement slope-aware movement with proper physics
3. Add surface-dependent friction and traction systems
4. Create smooth acceleration curves for natural feel
5. Integrate with input system for responsive control

**Visual Feedback**: Smooth acceleration and deceleration, realistic slope movement
**Success Metrics**: Movement feels responsive, slope movement feels natural

#### Task 2.2: Collision Response System
**Success Criteria**: Smooth collision resolution that prevents clipping while maintaining movement flow
```typescript
class CollisionResponseSystem {
  private readonly MAX_COLLISION_ITERATIONS = 4;
  private readonly COLLISION_TOLERANCE = 0.001;
  private readonly SLIDE_FACTOR = 0.9;
  
  resolveCollisions(
    physicsState: CharacterPhysicsState,
    collisionInfo: CharacterCollisionInfo,
    deltaTime: number
  ): Vector3 {
    let resolvedPosition = physicsState.position.clone();
    let resolvedVelocity = physicsState.velocity.clone();
    
    // Iterative collision resolution
    for (let i = 0; i < this.MAX_COLLISION_ITERATIONS; i++) {
      const remainingCollisions = this.detectCollisionsAtPosition(
        resolvedPosition,
        physicsState
      );
      
      if (remainingCollisions.length === 0) break;
      
      const resolution = this.resolveCollisionIteration(
        remainingCollisions,
        resolvedVelocity,
        deltaTime
      );
      
      resolvedPosition.add(resolution.positionCorrection);
      resolvedVelocity = resolution.adjustedVelocity;
      
      if (resolution.positionCorrection.length() < this.COLLISION_TOLERANCE) {
        break;
      }
    }
    
    // Update physics state with resolved values
    physicsState.position.copy(resolvedPosition);
    physicsState.velocity.copy(resolvedVelocity);
    
    return resolvedPosition;
  }
  
  resolveCollisionIteration(
    collisions: CollisionResult[],
    velocity: Vector3,
    deltaTime: number
  ): CollisionResolution {
    let totalCorrection = new Vector3();
    let adjustedVelocity = velocity.clone();
    
    // Sort collisions by penetration depth
    collisions.sort((a, b) => b.penetrationDepth - a.penetrationDepth);
    
    for (const collision of collisions) {
      // Position correction to resolve penetration
      const correction = collision.normal.clone();
      correction.multiplyScalar(collision.penetrationDepth + this.COLLISION_TOLERANCE);
      totalCorrection.add(correction);
      
      // Velocity adjustment for sliding
      const velocityAlongNormal = adjustedVelocity.dot(collision.normal);
      if (velocityAlongNormal < 0) {
        // Remove velocity component into the surface
        const normalVelocity = collision.normal.clone();
        normalVelocity.multiplyScalar(velocityAlongNormal);
        adjustedVelocity.sub(normalVelocity);
        
        // Apply sliding along surface
        const slideVelocity = this.calculateSlideVelocity(
          velocity,
          collision.normal
        );
        adjustedVelocity.add(slideVelocity.multiplyScalar(this.SLIDE_FACTOR));
      }
    }
    
    return {
      positionCorrection: totalCorrection,
      adjustedVelocity: adjustedVelocity
    };
  }
  
  calculateSlideVelocity(originalVelocity: Vector3, normal: Vector3): Vector3 {
    // Project velocity onto surface plane for sliding
    const normalComponent = normal.clone();
    normalComponent.multiplyScalar(originalVelocity.dot(normal));
    
    return originalVelocity.clone().sub(normalComponent);
  }
  
  handleStepClimbing(
    physicsState: CharacterPhysicsState,
    wallHit: CollisionResult
  ): boolean {
    const stepHeight = physicsState.stepHeight;
    const characterRadius = physicsState.characterRadius;
    
    // Check if obstacle is step-climbable
    if (wallHit.hitPoint.y - physicsState.position.y > stepHeight) {
      return false; // Too high to step over
    }
    
    // Check if there's space above the step
    const stepCheckPosition = wallHit.hitPoint.clone();
    stepCheckPosition.y += stepHeight + 0.1;
    
    const hasSpaceAbove = !this.checkCollisionAtPosition(
      stepCheckPosition,
      characterRadius
    );
    
    if (hasSpaceAbove) {
      // Move character up to step level
      physicsState.position.y = wallHit.hitPoint.y + stepHeight;
      return true;
    }
    
    return false;
  }
}
```

**Implementation Steps**:
1. Create iterative collision resolution system
2. Implement sliding response for smooth wall interaction
3. Add step climbing mechanics for navigating small obstacles
4. Create collision response optimization for performance
5. Integrate with character movement for seamless experience

**Visual Feedback**: Character slides along walls smoothly, can step over small obstacles
**Success Metrics**: No clipping through geometry, smooth collision response

### Phase 3: Advanced Physics Features (Priority: Medium)

#### Task 3.1: Environmental Physics
**Success Criteria**: Character responds appropriately to environmental forces like wind and water
```typescript
class EnvironmentalPhysicsController {
  private readonly WATER_DRAG = 3.0;
  private readonly WATER_BUOYANCY = 5.0;
  private readonly WIND_INFLUENCE = 0.3;
  
  applyEnvironmentalForces(
    physicsState: CharacterPhysicsState,
    environmentalForces: EnvironmentalForce[]
  ): void {
    for (const force of environmentalForces) {
      switch (force.type) {
        case 'wind':
          this.applyWindForce(physicsState, force);
          break;
        case 'water':
          this.applyWaterForces(physicsState, force);
          break;
        case 'current':
          this.applyCurrentForce(physicsState, force);
          break;
        case 'magnetic':
          this.applyMagneticForce(physicsState, force);
          break;
      }
    }
  }
  
  applyWaterForces(physicsState: CharacterPhysicsState, waterForce: WaterForce): void {
    const waterLevel = waterForce.level;
    const characterBottom = physicsState.position.y - (physicsState.characterHeight / 2);
    const characterTop = physicsState.position.y + (physicsState.characterHeight / 2);
    
    if (characterTop > waterLevel) {
      return; // Character not in water
    }
    
    // Calculate submersion percentage
    const submersionDepth = Math.min(waterLevel - characterBottom, physicsState.characterHeight);
    const submersionRatio = submersionDepth / physicsState.characterHeight;
    
    // Apply drag force
    const dragForce = physicsState.velocity.clone();
    dragForce.multiplyScalar(-this.WATER_DRAG * submersionRatio);
    physicsState.acceleration.add(dragForce);
    
    // Apply buoyancy
    if (submersionRatio > 0.1) {
      const buoyancyForce = new Vector3(0, this.WATER_BUOYANCY * submersionRatio, 0);
      physicsState.acceleration.add(buoyancyForce);
    }
    
    // Modify movement parameters
    physicsState.walkSpeed *= (1 - submersionRatio * 0.5);
    physicsState.jumpForce *= (1 - submersionRatio * 0.7);
  }
  
  applyWindForce(physicsState: CharacterPhysicsState, windForce: WindForce): void {
    const windStrength = windForce.strength;
    const windDirection = windForce.direction.clone();
    
    // Apply wind influence (stronger when not grounded)
    const influence = physicsState.isGrounded ? 
      this.WIND_INFLUENCE * 0.3 : 
      this.WIND_INFLUENCE;
    
    const windAcceleration = windDirection.multiplyScalar(windStrength * influence);
    physicsState.acceleration.add(windAcceleration);
  }
}

interface EnvironmentalForce {
  type: 'wind' | 'water' | 'current' | 'magnetic';
  strength: number;
  direction: Vector3;
  position: Vector3;
  radius: number;
}
```

**Implementation Steps**:
1. Create environmental force detection system
2. Implement water physics with buoyancy and drag
3. Add wind effects for atmospheric interaction
4. Create area-of-effect environmental forces
5. Integrate with world environment system

**Visual Feedback**: Character movement affected by environmental forces, water interaction visible
**Success Metrics**: Realistic environmental interaction, performance impact under 1ms

#### Task 3.2: Advanced Movement Mechanics
**Success Criteria**: Enhanced movement features like wall climbing and advanced air control
```typescript
class AdvancedMovementController {
  private readonly WALL_CLIMB_SPEED = 2.0;
  private readonly AIR_CONTROL_STRENGTH = 0.4;
  private readonly LEDGE_GRAB_RANGE = 0.5;
  
  handleWallClimbing(
    physicsState: CharacterPhysicsState,
    wallHit: CollisionResult,
    input: MovementInput
  ): boolean {
    if (!this.canClimbWall(wallHit)) return false;
    
    // Check for climb input
    if (input.moveDirection.y > 0.5) { // Forward input against wall
      physicsState.isClimbing = true;
      physicsState.velocity.y = this.WALL_CLIMB_SPEED;
      
      // Stick to wall
      const wallDirection = wallHit.normal.clone().multiplyScalar(-0.1);
      physicsState.position.add(wallDirection);
      
      return true;
    }
    
    return false;
  }
  
  applyAirControl(
    physicsState: CharacterPhysicsState,
    input: MovementInput,
    deltaTime: number
  ): void {
    if (physicsState.isGrounded) return;
    
    // Calculate desired air movement
    const airInput = new Vector3(input.moveDirection.x, 0, input.moveDirection.y);
    airInput.normalize();
    
    // Apply limited air control
    const airControlForce = airInput.multiplyScalar(
      this.AIR_CONTROL_STRENGTH * deltaTime
    );
    
    // Only apply if it doesn't exceed maximum air speed
    const currentHorizontalSpeed = new Vector3(
      physicsState.velocity.x,
      0,
      physicsState.velocity.z
    ).length();
    
    if (currentHorizontalSpeed < physicsState.walkSpeed) {
      physicsState.velocity.add(airControlForce);
    }
  }
  
  handleLedgeGrabbing(physicsState: CharacterPhysicsState): boolean {
    if (physicsState.isGrounded || physicsState.velocity.y > 0) return false;
    
    // Check for ledge above character
    const ledgeCheckPosition = physicsState.position.clone();
    ledgeCheckPosition.y += physicsState.characterHeight * 0.8;
    
    const ledgeHit = this.checkForLedge(ledgeCheckPosition);
    
    if (ledgeHit && this.canGrabLedge(ledgeHit)) {
      // Stop falling and attach to ledge
      physicsState.velocity.y = 0;
      physicsState.isClimbing = true;
      physicsState.position.copy(ledgeHit.grabPosition);
      
      return true;
    }
    
    return false;
  }
}
```

**Implementation Steps**:
1. Create wall climbing detection and movement
2. Implement enhanced air control for better feel
3. Add ledge grabbing and climbing mechanics
4. Create advanced movement state management
5. Integrate with animation system for advanced movements

**Visual Feedback**: Advanced movement options available, smooth transitions between movement types
**Success Metrics**: Advanced movements feel natural, responsive input handling

## Testing Procedures

### Unit Tests
```typescript
describe('CharacterPhysicsController', () => {
  test('should apply gravity correctly', () => {
    const physicsController = new CharacterPhysicsController();
    const physicsState = createMockPhysicsState();
    physicsState.isGrounded = false;
    physicsState.velocity.y = 0;
    
    physicsController.updateGravity(physicsState, 0.016);
    
    expect(physicsState.velocity.y).toBeLessThan(0);
    expect(physicsState.velocity.y).toBeCloseTo(-0.157, 2);
  });
  
  test('should detect ground contact accurately', () => {
    const groundDetection = new GroundDetectionSystem();
    const characterPos = new Vector3(0, 1, 0);
    const ground = createMockGround();
    
    const groundInfo = groundDetection.performGroundCheck(characterPos);
    
    expect(groundInfo.hasContact).toBe(true);
    expect(groundInfo.contactDistance).toBeCloseTo(0.5, 1);
  });
  
  test('should handle jump input with proper timing', () => {
    const jumpController = new GravityAndJumpController();
    const physicsState = createMockPhysicsState();
    const input = createMockInput({ isJumpPressed: true });
    
    physicsState.isGrounded = true;
    jumpController.handleJumpInput(input, physicsState, 0.016);
    
    expect(physicsState.velocity.y).toBeGreaterThan(0);
    expect(physicsState.isJumping).toBe(true);
  });
  
  test('should resolve collisions without clipping', () => {
    const collisionSystem = new CollisionResponseSystem();
    const physicsState = createMockPhysicsState();
    const collision = createMockCollision();
    
    const resolvedPosition = collisionSystem.resolveCollisions(
      physicsState,
      { groundHit: null, wallHits: [collision], ceilingHit: null },
      0.016
    );
    
    expect(resolvedPosition.distanceTo(collision.collisionPoint)).toBeGreaterThan(0.3);
  });
});
```

### Integration Tests
```typescript
describe('Character Physics Integration', () => {
  test('character walks smoothly on ground', async () => {
    const { getByTestId } = render(<TestWorldWithCharacterPhysics />);
    const canvas = getByTestId('3d-canvas');
    
    // Start character movement
    fireEvent.keyDown(canvas, { key: 'w', code: 'KeyW' });
    
    await waitFor(() => {
      const physicsState = getCharacterPhysicsState();
      expect(physicsState.isGrounded).toBe(true);
      expect(physicsState.velocity.length()).toBeGreaterThan(0);
    });
  });
  
  test('character jumps and lands correctly', async () => {
    const { container } = render(<TestWorldWithCharacterPhysics />);
    
    // Simulate jump input
    fireEvent.keyDown(container, { key: ' ', code: 'Space' });
    
    await waitFor(() => {
      const physicsState = getCharacterPhysicsState();
      expect(physicsState.isJumping).toBe(true);
      expect(physicsState.velocity.y).toBeGreaterThan(0);
    });
    
    // Wait for landing
    await waitFor(() => {
      const physicsState = getCharacterPhysicsState();
      expect(physicsState.isGrounded).toBe(true);
    }, { timeout: 2000 });
  });
  
  test('character slides along walls smoothly', async () => {
    const { container } = render(<TestWorldWithWalls />);
    
    // Move character into wall at angle
    await moveCharacterTowardsWall(45); // 45 degree angle
    
    const initialPosition = getCharacterPosition();
    await waitFor(() => {
      const newPosition = getCharacterPosition();
      // Character should slide along wall, not stop
      expect(newPosition.distanceTo(initialPosition)).toBeGreaterThan(0.1);
    });
  });
});
```

### Performance Tests
```typescript
describe('Character Physics Performance', () => {
  test('maintains 60fps with full physics simulation', async () => {
    const performanceMonitor = new PerformanceMonitor();
    const physicsController = new CharacterPhysicsController();
    
    const metrics = await performanceMonitor.measureFor(3000, () => {
      physicsController.update(0.016, createRandomInput());
    });
    
    expect(metrics.averageFPS).toBeGreaterThanOrEqual(58);
    expect(metrics.physicsUpdateTime).toBeLessThan(3);
  });
  
  test('collision detection scales properly', () => {
    const collisionSystem = new CollisionResponseSystem();
    const obstacles = createObstacles(50);
    
    const startTime = performance.now();
    for (let i = 0; i < 100; i++) {
      collisionSystem.detectCollisionsAtPosition(getRandomPosition());
    }
    const duration = performance.now() - startTime;
    
    expect(duration / 100).toBeLessThan(2); // 2ms per collision check
  });
});
```

## Performance Metrics

### Target Benchmarks
- **Frame Rate**: ≥ 58 FPS with full physics simulation
- **Physics Update Time**: ≤ 3ms per frame
- **Collision Detection**: ≤ 2ms per frame
- **Ground Detection**: ≤ 0.5ms per frame
- **Memory Usage**: ≤ 20MB additional for physics system

### Performance Monitoring
```typescript
interface PhysicsPerformanceMetrics {
  // Core Physics Performance
  physicsUpdateTime: number;
  gravityCalculationTime: number;
  movementCalculationTime: number;
  
  // Collision Performance
  collisionDetectionTime: number;
  collisionResolutionTime: number;
  groundCheckTime: number;
  
  // Environmental Performance
  environmentalForcesTime: number;
  waterPhysicsTime: number;
  windCalculationTime: number;
  
  // System Performance
  memoryUsage: number;
  frameRate: number;
  inputLatency: number;
}
```

## Potential Edge Cases

### High-Speed Collision Tunneling
**Scenario**: Character moves so fast it passes through thin walls
**Handling**: Continuous collision detection with swept collision tests
**Recovery**: Position interpolation and velocity clamping

### Unstable Ground Contact
**Scenario**: Character jitters on uneven terrain
**Handling**: Ground contact smoothing and stability checks
**Recovery**: Automatic ground snapping within tolerance

### Physics Divergence
**Scenario**: Physics simulation becomes unstable at low frame rates
**Handling**: Fixed timestep physics updates with interpolation
**Recovery**: Physics state validation and correction

### Extreme Environmental Forces
**Scenario**: Environmental forces cause unrealistic character behavior
**Handling**: Force magnitude limits and gradual application
**Recovery**: Force smoothing and maximum velocity limits

### Memory Accumulation
**Scenario**: Physics calculations cause memory leaks over time
**Handling**: Proper object pooling and cleanup systems
**Recovery**: Periodic garbage collection and state reset

## Integration Points with Other Systems

### Player Controller Integration
- **Connection Point**: `components/modules/PlayerControlModule.tsx`
- **Interface**: Replace fly-mode with character physics
- **Data Flow**: Input → Physics calculation → Character movement

### Camera System Integration
- **Connection Point**: First/Third-person camera systems
- **Interface**: Character position and rotation updates
- **Data Flow**: Physics state → Camera positioning → View updates

### Animation System Integration
- **Connection Point**: `components/animations/IsolatedAnimationManager.tsx`
- **Interface**: Movement state for animation triggers
- **Data Flow**: Physics state → Animation selection → Character animations

### World Collision Integration
- **Connection Point**: World geometry and collision systems
- **Interface**: Collision queries and response handling
- **Data Flow**: Physics queries → World geometry → Collision results

### Performance System Integration
- **Connection Point**: `components/modules/ModuleManager.tsx`
- **Interface**: Physics update scheduling and performance monitoring
- **Data Flow**: Performance metrics → Quality adjustment → Physics optimization

---

**Implementation Priority**: Critical
**Estimated Complexity**: High
**Dependencies**: Player Controller, Camera Systems, World Collision
**Success Metrics**: Realistic character physics with responsive control and 58+ FPS performance