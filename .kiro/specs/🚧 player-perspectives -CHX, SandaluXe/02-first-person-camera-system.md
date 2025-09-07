# First-Person Camera System - Implementation Prompt

## Feature Overview

The First-Person Camera System provides an immersive first-person perspective experience by positioning the camera at the player character's eye level while managing model visibility, head movement, and weapon/hand interactions. This system integrates seamlessly with the existing CameraController and PlayerControlModule to deliver responsive, comfortable first-person gameplay with minimal motion sickness.

## Current State Analysis

### Existing Components
- **CameraController**: Supports orbit, fly, cinematic, and follow-simulant modes
- **PlayerControlModule**: Handles movement with fly-mode camera controls
- **Player Avatar Integration**: Character models with animation systems
- **ModuleManager**: Performance-isolated rendering with 60fps targeting
- **WorldStore**: Camera mode state management (`activeCamera` property)

### Integration Points
- `components/world/CameraController.tsx` - Add first-person camera mode
- `components/modules/PlayerControlModule.tsx` - Integrate head movement controls
- `store/worldStore.ts` - Add first-person specific state
- `types/index.ts` - Define first-person camera interfaces

## Technical Requirements

### Core Functionality
1. **Eye-Level Camera Positioning**: Camera positioned at character's eye height with proper offset
2. **Head Movement Integration**: Mouse look controls character head rotation and camera orientation
3. **Model Visibility Management**: Hide player body/head while maintaining hands/weapons visibility
4. **Smooth Movement Tracking**: Camera follows character movement with minimal lag
5. **Collision-Aware Positioning**: Prevent camera clipping through walls and objects

### Performance Targets
- **Input Responsiveness**: Sub-16ms latency from mouse input to camera rotation
- **Frame Rate Stability**: Maintain 60fps during rapid head movements
- **Motion Comfort**: Head bob amplitude under 2 units, frequency under 2Hz
- **Transition Speed**: Mode switching completed within 300ms
- **Culling Efficiency**: Proper frustum culling with first-person FOV adjustments

### Technical Constraints
- **Comfort Requirements**: Minimal motion sickness through smooth movement and appropriate FOV
- **Visual Consistency**: Seamless integration with existing third-person and other camera modes
- **Performance Isolation**: Use existing ModuleManager for frame time management
- **Input Handling**: Integrate with current mouse lock and keyboard systems
- **Cross-Platform**: Support desktop and mobile input methods

## Design Specifications

### First-Person Camera State Model

```typescript
interface FirstPersonCameraState {
  // Camera Configuration
  eyeHeight: number; // Offset from character position to eye level
  fov: number; // Field of view (typically 75-90 degrees)
  nearClip: number; // Near clipping plane (0.01-0.1)
  farClip: number; // Far clipping plane
  
  // Head Movement
  headRotation: Euler; // Relative to character body
  neckConstraints: {
    maxPitch: number; // Up/down rotation limits
    maxYaw: number; // Left/right rotation limits
    maxRoll: number; // Head tilt limits
  };
  
  // Movement Integration
  headBob: {
    enabled: boolean;
    amplitude: Vector2; // X: horizontal, Y: vertical
    frequency: number; // Steps per second
    phase: number; // Current animation phase
  };
  
  // Visibility Settings
  playerModelVisibility: {
    head: boolean; // Usually false in first-person
    body: boolean; // Usually false in first-person
    arms: boolean; // Usually true for hands/weapons
    legs: boolean; // Usually false, sometimes visible looking down
  };
  
  // Comfort Settings
  motionSickness: {
    smoothTurning: boolean;
    turnSpeed: number;
    headBobIntensity: number; // 0-1 scale
    cameraShake: boolean;
  };
}

interface FirstPersonController {
  // Core State
  isActive: boolean;
  cameraState: FirstPersonCameraState;
  lastUpdateTime: number;
  
  // Input State
  mouseSensitivity: Vector2; // X: horizontal, Y: vertical
  invertY: boolean;
  smoothing: number; // Input smoothing factor
  
  // Integration State
  characterPosition: Vector3;
  characterRotation: Euler;
  isGrounded: boolean;
  movementVelocity: Vector3;
}
```

### Component Architecture

```typescript
interface FirstPersonCameraManager {
  // Core Management
  initialize(character: Object3D, camera: Camera): void;
  activate(): void;
  deactivate(): void;
  update(deltaTime: number): void;
  
  // Camera Control
  updateCameraPosition(characterPosition: Vector3): void;
  updateCameraRotation(mouseInput: Vector2): void;
  applyCameraConstraints(): void;
  
  // Head Movement
  rotateHead(deltaYaw: number, deltaPitch: number): void;
  resetHeadRotation(duration?: number): void;
  getHeadWorldRotation(): Euler;
  
  // Model Visibility
  setModelVisibility(visibility: Partial<PlayerModelVisibility>): void;
  hidePlayerModel(): void;
  showPlayerHands(): void;
  
  // Comfort Features
  enableHeadBob(settings: HeadBobSettings): void;
  disableHeadBob(): void;
  setSmoothTurning(enabled: boolean): void;
  
  // State Management
  getState(): FirstPersonCameraState;
  setState(state: Partial<FirstPersonCameraState>): void;
  
  // Performance
  getPerformanceMetrics(): FirstPersonPerformanceMetrics;
  optimizeForPerformance(): void;
}

interface HeadBobSettings {
  amplitude: Vector2;
  frequency: number;
  smoothness: number;
  onlyWhileMoving: boolean;
}
```

## Implementation Tasks

### Phase 1: Core Camera System (Priority: Critical)

#### Task 1.1: First-Person Camera Mode Integration
**Success Criteria**: First-person mode available and activatable through camera system
```typescript
// Extend CameraController with first-person mode
interface EnhancedCameraController extends CameraController {
  firstPersonController: FirstPersonCameraManager;
  
  switchToFirstPerson(): void {
    this.deactivateCurrentMode();
    this.firstPersonController.activate();
    this.updateCameraMode('first-person');
  }
  
  handleFirstPersonUpdate(deltaTime: number): void {
    if (this.activeMode === 'first-person') {
      this.firstPersonController.update(deltaTime);
    }
  }
}
```

**Implementation Steps**:
1. Add 'first-person' to `CameraMode` type in `types/index.ts`
2. Extend `CameraController` with first-person mode handling
3. Create mode switching logic with proper cleanup
4. Integrate with existing camera preset system
5. Add first-person configuration to camera presets

**Visual Feedback**: First-person option appears in camera mode selector
**Success Metrics**: Mode switch completes within 300ms

#### Task 1.2: Eye-Level Camera Positioning
**Success Criteria**: Camera positioned at correct eye height with smooth character following
```typescript
class FirstPersonCameraPositioning {
  private readonly EYE_HEIGHT_OFFSET = 1.6; // meters from ground
  private readonly SMOOTHING_FACTOR = 0.15;
  
  updateCameraPosition(
    camera: Camera, 
    characterPosition: Vector3, 
    characterRotation: Euler,
    deltaTime: number
  ): void {
    // Calculate target eye position
    const eyePosition = characterPosition.clone();
    eyePosition.y += this.EYE_HEIGHT_OFFSET;
    
    // Apply smooth following
    const currentPos = camera.position;
    const targetPos = eyePosition;
    
    currentPos.lerp(targetPos, this.SMOOTHING_FACTOR);
    
    // Apply head rotation to camera
    const headRotation = this.calculateHeadRotation();
    camera.setRotationFromEuler(headRotation);
  }
  
  calculateHeadRotation(): Euler {
    // Combine character body rotation with head movement
    const bodyRotation = this.getCharacterRotation();
    const headOffset = this.getHeadRotation();
    
    return new Euler(
      bodyRotation.x + headOffset.x,
      bodyRotation.y + headOffset.y, 
      bodyRotation.z + headOffset.z,
      'YXZ'
    );
  }
}
```

**Implementation Steps**:
1. Create camera positioning calculations for eye-level placement
2. Implement smooth camera following with configurable lag
3. Add character height adjustment for different avatar sizes
4. Create collision detection for camera position validation
5. Implement ground-relative positioning for uneven terrain

**Visual Feedback**: Camera view appears at realistic head height
**Success Metrics**: Camera position updates with <5ms lag from character movement

#### Task 1.3: Mouse Look Integration
**Success Criteria**: Responsive mouse movement controls camera orientation with proper constraints
```typescript
class FirstPersonMouseLook {
  private mouseInput: Vector2 = new Vector2();
  private headRotation: Euler = new Euler();
  private readonly PITCH_LIMIT = Math.PI / 2.2; // ~82 degrees
  
  handleMouseMovement(movementX: number, movementY: number): void {
    // Apply sensitivity scaling
    const sensitivity = this.getMouseSensitivity();
    this.mouseInput.set(
      movementX * sensitivity.x,
      movementY * sensitivity.y * (this.invertY ? -1 : 1)
    );
    
    // Update head rotation
    this.headRotation.y -= this.mouseInput.x;
    this.headRotation.x -= this.mouseInput.y;
    
    // Apply pitch constraints
    this.headRotation.x = Math.max(
      -this.PITCH_LIMIT,
      Math.min(this.PITCH_LIMIT, this.headRotation.x)
    );
    
    // Normalize yaw rotation
    this.headRotation.y = this.normalizeAngle(this.headRotation.y);
  }
  
  applyToCamera(camera: Camera): void {
    camera.setRotationFromEuler(this.headRotation);
  }
}
```

**Implementation Steps**:
1. Extend mouse input handling from PlayerControlModule
2. Implement head rotation constraints to prevent gimbal lock
3. Add configurable mouse sensitivity settings
4. Create smooth rotation interpolation for comfort
5. Implement mouse inversion and acceleration options

**Visual Feedback**: Camera rotates smoothly with mouse movement
**Success Metrics**: Input latency under 16ms, rotation feels natural

### Phase 2: Model Visibility Management (Priority: High)

#### Task 2.1: Player Model Visibility Controller
**Success Criteria**: Player model parts properly hidden/shown based on first-person mode
```typescript
class FirstPersonVisibilityManager {
  private playerModel: Object3D;
  private visibilityState: PlayerModelVisibility;
  
  setFirstPersonVisibility(): void {
    this.setModelVisibility({
      head: false,      // Hide head to prevent seeing inside
      body: false,      // Hide body for clean view
      arms: true,       // Show arms/hands for presence
      legs: false,      // Hide legs (unless looking down)
      accessories: true // Show watches, gloves, etc.
    });
  }
  
  setModelVisibility(visibility: Partial<PlayerModelVisibility>): void {
    this.visibilityState = { ...this.visibilityState, ...visibility };
    
    // Apply visibility to model parts
    this.traverseModelParts((part, type) => {
      if (type in visibility) {
        part.visible = visibility[type as keyof PlayerModelVisibility];
        
        // Handle special cases for seamless transitions
        if (type === 'arms' && part.visible) {
          this.optimizeArmsForFirstPerson(part);
        }
      }
    });
  }
  
  optimizeArmsForFirstPerson(armsPart: Object3D): void {
    // Position arms correctly for first-person view
    // Adjust materials for better first-person rendering
    // Set up LOD for close-up viewing
  }
}
```

**Implementation Steps**:
1. Create model part identification system for RPM avatars
2. Implement visibility toggling for different model components
3. Add special handling for arms/hands positioning in first-person
4. Create smooth visibility transitions to prevent popping
5. Implement LOD adjustments for first-person model parts

**Visual Feedback**: Player body invisible in first-person, hands visible
**Success Metrics**: No visual artifacts, smooth visibility transitions

#### Task 2.2: Hand and Weapon Positioning
**Success Criteria**: Arms and hands properly positioned and animated for first-person view
```typescript
class FirstPersonHandController {
  private handsModel: Object3D;
  private weaponAttachPoint: Object3D;
  
  positionHandsForFirstPerson(): void {
    // Position hands relative to camera
    const cameraMatrix = this.camera.matrixWorld;
    const handsOffset = new Vector3(0.3, -0.4, -0.6); // Right, down, forward
    
    const worldHandsPosition = handsOffset.clone();
    worldHandsPosition.applyMatrix4(cameraMatrix);
    
    this.handsModel.position.copy(worldHandsPosition);
    this.handsModel.lookAt(this.camera.position);
  }
  
  updateHandsAnimation(movementState: MovementState): void {
    // Apply appropriate hand animations based on movement
    if (movementState.forward || movementState.backward) {
      this.playHandAnimation('walking_hands');
    } else {
      this.playHandAnimation('idle_hands');
    }
  }
  
  attachWeapon(weaponModel: Object3D): void {
    // Attach weapon to proper hand bone
    const rightHandBone = this.findBone('RightHand');
    if (rightHandBone) {
      rightHandBone.add(weaponModel);
      this.adjustWeaponForFirstPerson(weaponModel);
    }
  }
}
```

**Implementation Steps**:
1. Create specialized hand model positioning for first-person
2. Implement weapon attachment system for first-person view
3. Add hand animation integration with movement states
4. Create proper depth sorting for hand/weapon rendering
5. Implement hand IK for natural positioning

**Visual Feedback**: Hands appear in natural first-person position
**Success Metrics**: Hands don't clip through camera, animations smooth

### Phase 3: Comfort and Polish Features (Priority: Medium)

#### Task 3.1: Head Bob System
**Success Criteria**: Natural head bob animation that enhances immersion without causing discomfort
```typescript
class HeadBobController {
  private bobState: {
    phase: number;
    amplitude: Vector2;
    frequency: number;
    enabled: boolean;
  };
  
  updateHeadBob(deltaTime: number, isMoving: boolean, movementSpeed: number): Vector3 {
    if (!this.bobState.enabled || !isMoving) {
      return new Vector3();
    }
    
    // Update bob phase based on movement speed
    this.bobState.phase += deltaTime * this.bobState.frequency * movementSpeed;
    
    // Calculate bob offset
    const horizontalBob = Math.sin(this.bobState.phase) * this.bobState.amplitude.x;
    const verticalBob = Math.abs(Math.sin(this.bobState.phase * 2)) * this.bobState.amplitude.y;
    
    return new Vector3(horizontalBob, verticalBob, 0);
  }
  
  configureComfortSettings(intensityLevel: number): void {
    // Adjust bob parameters based on user comfort preferences
    const intensity = Math.max(0, Math.min(1, intensityLevel));
    
    this.bobState.amplitude.set(
      0.02 * intensity, // Horizontal bob
      0.01 * intensity  // Vertical bob
    );
    
    this.bobState.frequency = 2.0 * (0.5 + intensity * 0.5);
  }
}
```

**Implementation Steps**:
1. Create head bob calculation system based on movement
2. Implement configurable amplitude and frequency settings
3. Add user comfort controls for motion sensitivity
4. Create smooth bob transitions when starting/stopping movement
5. Integrate with user accessibility preferences

**Visual Feedback**: Subtle head movement during walking/running
**Success Metrics**: Bob amplitude under 2 units, no motion sickness reports

#### Task 3.2: Smooth Turning and Motion Comfort
**Success Criteria**: Optional smooth turning for motion-sensitive users
```typescript
class ComfortController {
  private smoothTurning: {
    enabled: boolean;
    speed: number;
    snapAngle: number;
  };
  
  applySmoothTurning(targetRotation: Euler, deltaTime: number): Euler {
    if (!this.smoothTurning.enabled) {
      return targetRotation;
    }
    
    const currentRotation = this.getCurrentRotation();
    const rotationDiff = this.calculateRotationDifference(currentRotation, targetRotation);
    
    // Apply smooth interpolation
    if (Math.abs(rotationDiff.y) > this.smoothTurning.snapAngle) {
      // Large rotation - use snap turning
      const snapDirection = Math.sign(rotationDiff.y);
      currentRotation.y += snapDirection * this.smoothTurning.snapAngle;
    } else {
      // Small rotation - use smooth interpolation
      currentRotation.y += rotationDiff.y * this.smoothTurning.speed * deltaTime;
    }
    
    return currentRotation;
  }
  
  configureComfortLevel(level: 'none' | 'low' | 'medium' | 'high'): void {
    const configs = {
      none: { enabled: false, speed: 0, snapAngle: 0 },
      low: { enabled: true, speed: 3, snapAngle: Math.PI / 8 },
      medium: { enabled: true, speed: 2, snapAngle: Math.PI / 6 },
      high: { enabled: true, speed: 1, snapAngle: Math.PI / 4 }
    };
    
    this.smoothTurning = configs[level];
  }
}
```

**Implementation Steps**:
1. Create smooth turning option for comfort
2. Implement snap turning for large rotations
3. Add configurable comfort levels
4. Create motion sickness reduction features
5. Integrate with accessibility settings

**Visual Feedback**: Optional smooth rotation instead of instant turns
**Success Metrics**: Reduced motion sickness, configurable comfort levels

## Testing Procedures

### Unit Tests
```typescript
describe('FirstPersonCameraManager', () => {
  test('should position camera at correct eye height', () => {
    const cameraManager = new FirstPersonCameraManager();
    const character = createMockCharacter();
    const camera = new PerspectiveCamera();
    
    cameraManager.initialize(character, camera);
    cameraManager.updateCameraPosition(new Vector3(0, 0, 0));
    
    expect(camera.position.y).toBeCloseTo(1.6, 1);
  });
  
  test('should apply mouse look with constraints', () => {
    const cameraManager = new FirstPersonCameraManager();
    const mouseLook = cameraManager.mouseLookController;
    
    // Test extreme upward look
    mouseLook.handleMouseMovement(0, -1000);
    
    const rotation = mouseLook.getHeadRotation();
    expect(rotation.x).toBeLessThanOrEqual(Math.PI / 2.2);
  });
  
  test('should hide player model in first-person', () => {
    const visibilityManager = new FirstPersonVisibilityManager();
    const playerModel = createMockPlayerModel();
    
    visibilityManager.setFirstPersonVisibility();
    
    expect(playerModel.getObjectByName('head').visible).toBe(false);
    expect(playerModel.getObjectByName('body').visible).toBe(false);
    expect(playerModel.getObjectByName('arms').visible).toBe(true);
  });
});
```

### Integration Tests  
```typescript
describe('First-Person Integration', () => {
  test('camera follows character movement smoothly', async () => {
    const { getByTestId } = render(<TestWorldWithFirstPerson />);
    const canvas = getByTestId('3d-canvas');
    
    // Switch to first-person mode
    await switchCameraMode('first-person');
    
    // Simulate character movement
    fireEvent.keyDown(canvas, { key: 'w', code: 'KeyW' });
    
    await waitFor(() => {
      const cameraPos = getCameraPosition();
      const characterPos = getCharacterPosition();
      expect(cameraPos.y).toBeCloseTo(characterPos.y + 1.6, 1);
    });
  });
  
  test('mouse movement updates camera rotation', async () => {
    const { container } = render(<TestWorldWithFirstPerson />);
    
    await switchCameraMode('first-person');
    await enablePointerLock();
    
    const initialRotation = getCameraRotation();
    fireEvent.mouseMove(container, { movementX: 100, movementY: 50 });
    
    await waitFor(() => {
      const newRotation = getCameraRotation();
      expect(newRotation.y).not.toEqual(initialRotation.y);
    });
  });
  
  test('model visibility changes with mode switch', async () => {
    const { container } = render(<TestWorldWithFirstPerson />);
    
    // Start in third-person
    await switchCameraMode('orbit');
    expect(getPlayerModel().visible).toBe(true);
    
    // Switch to first-person
    await switchCameraMode('first-person');
    expect(getPlayerBodyVisibility()).toBe(false);
    expect(getPlayerHandsVisibility()).toBe(true);
  });
});
```

### Performance Tests
```typescript
describe('First-Person Performance', () => {
  test('maintains responsive mouse look at 60fps', async () => {
    const performanceMonitor = new PerformanceMonitor();
    const fpCamera = new FirstPersonCameraManager();
    
    const metrics = await performanceMonitor.measureFor(3000, () => {
      // Simulate rapid mouse movement
      fpCamera.handleMouseMovement(
        Math.random() * 10 - 5,
        Math.random() * 10 - 5
      );
      fpCamera.update(0.016);
    });
    
    expect(metrics.averageFPS).toBeGreaterThanOrEqual(58);
    expect(metrics.inputLatency).toBeLessThan(16);
  });
  
  test('head bob calculations stay under 2ms', () => {
    const headBob = new HeadBobController();
    const startTime = performance.now();
    
    for (let i = 0; i < 1000; i++) {
      headBob.updateHeadBob(0.016, true, 1.0);
    }
    
    const duration = performance.now() - startTime;
    expect(duration / 1000).toBeLessThan(2); // 2ms per calculation
  });
});
```

## Performance Metrics

### Target Benchmarks
- **Mouse Responsiveness**: ≤ 16ms input latency
- **Frame Rate**: ≥ 58 FPS during active head movement
- **Mode Switching**: ≤ 300ms transition time
- **Head Bob Performance**: ≤ 2ms per frame calculation
- **Memory Overhead**: ≤ 10MB additional for first-person features

### Performance Monitoring
```typescript
interface FirstPersonPerformanceMetrics {
  // Input Performance
  mouseInputLatency: number;
  rotationUpdateTime: number;
  positionUpdateTime: number;
  
  // Rendering Performance
  visibilityToggleTime: number;
  modelCullingTime: number;
  frustumCalculationTime: number;
  
  // Animation Performance
  headBobCalculationTime: number;
  handAnimationTime: number;
  
  // System Integration
  modeTransitionTime: number;
  cameraUpdateTime: number;
  stateManagementTime: number;
}
```

## Potential Edge Cases

### Camera Clipping Issues
**Scenario**: Camera clips through walls or objects in tight spaces
**Handling**: Collision detection with automatic position adjustment
**Recovery**: Smooth camera pullback to valid position

### Model Visibility Glitches
**Scenario**: Player body parts visible in first-person view
**Handling**: Multiple visibility check layers, bone-level hiding
**Recovery**: Automatic visibility reset on detection

### Motion Sickness
**Scenario**: Users experience discomfort from head movement
**Handling**: Configurable comfort settings, reduced motion options
**Recovery**: Automatic comfort mode activation on rapid movement

### Input Lag Accumulation
**Scenario**: Mouse input lag increases over time
**Handling**: Input buffer management, periodic lag detection
**Recovery**: Input system reset, sensitivity recalibration

### Mode Transition Artifacts
**Scenario**: Visual glitches during camera mode switching
**Handling**: Staged transition with intermediate states
**Recovery**: Fallback to direct mode switch without interpolation

## Integration Points with Other Systems

### Camera Controller Integration
- **Connection Point**: `components/world/CameraController.tsx`
- **Interface**: Add first-person mode to camera mode enum and switching logic
- **Data Flow**: Camera mode state → First-person activation → Camera position updates

### Player Control Integration
- **Connection Point**: `components/modules/PlayerControlModule.tsx`  
- **Interface**: Mouse input sharing, movement state integration
- **Data Flow**: Player input → Movement state → First-person camera updates

### Avatar System Integration
- **Connection Point**: Player Avatar Integration system
- **Interface**: Model visibility control, bone access for positioning
- **Data Flow**: First-person activation → Model visibility changes → Hand positioning

### Animation System Integration
- **Connection Point**: `components/animations/IsolatedAnimationManager.tsx`
- **Interface**: Hand animation triggers, head movement integration
- **Data Flow**: Movement state → Animation selection → Hand/head animations

### UI System Integration
- **Connection Point**: Camera mode selector UI
- **Interface**: First-person mode selection, comfort settings UI
- **Data Flow**: UI interaction → Camera mode change → First-person activation

---

**Implementation Priority**: Critical
**Estimated Complexity**: High
**Dependencies**: Player Avatar Integration, Camera Controller, Player Control Module
**Success Metrics**: Comfortable first-person experience with sub-16ms input latency and 58+ FPS