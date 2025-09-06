# Player Controller System - Development Prompt Sequence

## Overview

This document provides a comprehensive sequence of 27 development prompts following advanced prompt engineering techniques. Each prompt includes complete context, clear objectives, success criteria, and integration guidelines for building the GTA 6-style player controller system in the Descendants metaverse.

## Prompt Engineering Principles Used

- **Context Setting**: Full background and architectural context
- **Task Decomposition**: Clear, actionable sub-tasks
- **Success Criteria**: Measurable outcomes and validation steps
- **Constraint Specification**: Technical limitations and requirements
- **Integration Guidelines**: How to connect with existing systems
- **Error Handling**: Expected failure modes and recovery strategies
- **Testing Instructions**: Validation and quality assurance steps

---

## Phase 1: Core Foundation & Input System

### Prompt 1: Input Management Infrastructure
```
# CONTEXT
You are implementing a modular player controller system for the Descendants metaverse, a 3D voxel world built with Next.js, React Three Fiber, and Zustand. The system must support both human players (keyboard/mouse input) and AI simulants (programmatic commands) with shared controller components.

Current Architecture:
- React Three Fiber for 3D rendering
- Zustand store for state management  
- RPM animation system for character animation
- Existing camera controller with fly/orbit modes
- Voxel world with collision detection

# OBJECTIVE
Create the foundational input management infrastructure that unifies keyboard, mouse, gamepad, and AI command inputs into a standardized system.

# REQUIREMENTS
- InputManager class with unified input handling
- KeyboardHandler with configurable key bindings
- MouseHandler with sensitivity and pointer lock
- GamepadHandler with device detection
- InputState interface with normalized values (-1 to 1)
- Support for GTA 6-style controls (WASD movement, mouse look, Shift run, Space jump)

# IMPLEMENTATION TASKS
1. Create `utils/input/InputManager.ts` with core input coordination
2. Implement `utils/input/KeyboardHandler.ts` with event processing
3. Build `utils/input/MouseHandler.ts` with pointer lock support
4. Create `utils/input/GamepadHandler.ts` with device mapping
5. Define `types/input.ts` with comprehensive interfaces
6. Add input configuration and key binding management

# SUCCESS CRITERIA
- [ ] All input devices detected and mapped correctly
- [ ] Normalized input values (-1 to 1) for movement
- [ ] Configurable key bindings with real-time updates
- [ ] Pointer lock functionality working in browser
- [ ] Gamepad hot-plugging support
- [ ] Input state updates at 60+ FPS
- [ ] Memory efficient with proper cleanup

# INTEGRATION REQUIREMENTS
- Use existing project structure in `utils/` directory
- Follow TypeScript strict mode requirements
- Integrate with existing Zustand store patterns
- Support React 18+ concurrent features
- Follow existing code style and naming conventions

# TESTING VALIDATION
- Test keyboard input with WASD keys
- Verify mouse sensitivity and pointer lock
- Test gamepad detection and analog stick mapping
- Validate input normalization accuracy
- Check memory leaks with rapid input changes
- Test cross-browser compatibility

# FILES TO CREATE
- `utils/input/InputManager.ts`
- `utils/input/KeyboardHandler.ts`
- `utils/input/MouseHandler.ts`
- `utils/input/GamepadHandler.ts`
- `utils/input/index.ts`
- `types/input.ts`
- `utils/input/__tests__/InputManager.test.ts`

# EXPECTED OUTPUT
A complete input management system ready for integration with the player controller, with comprehensive TypeScript types and unit tests.
```

### Prompt 2: AI Command Interface for Simulants
```
# CONTEXT
Building on the input management foundation, create an AI command interface that allows AI simulants to control movement through programmatic commands rather than input events. This interface must integrate seamlessly with the InputManager while providing high-level movement commands suitable for AI decision making.

Current State:
- InputManager with unified input handling completed
- Existing AI simulant system with basic movement
- RPM animation system for character animation
- World store with simulant management

# OBJECTIVE
Create an AI command interface that translates high-level AI intentions into movement commands compatible with the input system.

# REQUIREMENTS
- AICommandInterface with high-level commands (moveTo, lookAt, followPath)
- Low-level movement control (setMoveDirection, setLookDirection)
- Pathfinding integration with navigation mesh support
- Behavior modes and movement styles for AI personality
- State queries and movement validation

# IMPLEMENTATION TASKS
1. Create `utils/ai/AICommandInterface.ts` with command processing
2. Implement `utils/ai/PathfindingManager.ts` for navigation
3. Build `utils/ai/BehaviorManager.ts` for AI personality modes
4. Create `utils/ai/MovementValidator.ts` for command validation
5. Define `types/ai-commands.ts` with command interfaces
6. Integrate with existing InputManager as input source

# SUCCESS CRITERIA
- [ ] AI can execute moveTo commands with pathfinding
- [ ] Smooth lookAt functionality with rotation limits
- [ ] Path following with obstacle avoidance
- [ ] Multiple behavior modes (precise, natural, erratic)
- [ ] Movement validation prevents invalid commands
- [ ] Integration with existing simulant system
- [ ] Performance optimized for multiple AI entities

# INTEGRATION REQUIREMENTS
- Extend InputManager to accept AI command input
- Integrate with existing AISimulant interface
- Use existing world collision detection
- Follow existing simulant management patterns
- Connect with RPM animation state mapping

# PATHFINDING SPECIFICATIONS
- A* algorithm for optimal path calculation
- Dynamic obstacle avoidance
- Configurable movement speed profiles
- Support for different traversal costs
- Real-time path recalculation

# TESTING VALIDATION
- Test AI navigation to distant targets
- Verify obstacle avoidance behavior
- Test multiple AI entities pathfinding simultaneously
- Validate movement style differences
- Check integration with existing simulant updates

# FILES TO CREATE
- `utils/ai/AICommandInterface.ts`
- `utils/ai/PathfindingManager.ts`
- `utils/ai/BehaviorManager.ts`
- `utils/ai/MovementValidator.ts`
- `utils/ai/NavigationMesh.ts`
- `types/ai-commands.ts`
- `utils/ai/__tests__/AICommandInterface.test.ts`

# EXPECTED OUTPUT
A complete AI command system that enables sophisticated AI movement control while maintaining compatibility with the unified input management system.
```

### Prompt 3: Core PlayerController Class
```
# CONTEXT
With input management and AI command interfaces complete, create the core PlayerController class that serves as the central coordinator for character control. This class must support both human players and AI simulants while maintaining consistent behavior and state management.

Architecture Context:
- InputManager handling all input sources
- AICommandInterface for simulant control
- Existing Zustand store for state management
- RPM animation system integration required
- Camera system integration needed

# OBJECTIVE
Build the foundational PlayerController class that coordinates input, physics, state, and animation systems for both human and AI entities.

# REQUIREMENTS
- PlayerController main class with entity type support (human/simulant)
- ControllerConfig interface with comprehensive options
- Controller lifecycle methods (initialize, update, dispose)
- Control mode switching (free, locked, cinematic, interaction)
- State management and event callback system
- Integration points for physics, animation, and camera systems

# IMPLEMENTATION TASKS
1. Create `controllers/PlayerController.ts` with core class
2. Implement `controllers/ControllerConfig.ts` for configuration
3. Build `controllers/ControllerState.ts` for state management
4. Create `controllers/ControllerEvents.ts` for event system
5. Define `types/controller.ts` with comprehensive interfaces
6. Add controller factory and management utilities

# SUCCESS CRITERIA
- [ ] Controller instances created for both humans and simulants
- [ ] Configuration system working with real-time updates
- [ ] Lifecycle management prevents memory leaks
- [ ] Control mode switching without state loss
- [ ] Event system enables loose coupling
- [ ] Performance optimized for multiple controllers
- [ ] Integration ready for physics and animation systems

# ARCHITECTURAL SPECIFICATIONS
```typescript
// Core controller structure
interface PlayerController {
  id: string
  entityType: 'human' | 'simulant'
  isActive: boolean
  
  // Core systems (integration points)
  inputManager: InputManager
  physicsManager?: PhysicsManager // Added in next phase
  stateManager: StateManager
  locomotionManager?: LocomotionManager // Added in next phase
  
  // Lifecycle
  initialize(config: ControllerConfig): void
  update(deltaTime: number): void
  dispose(): void
  
  // Control
  setControlMode(mode: ControlMode): void
  enableInput(enable: boolean): void
  resetToPosition(position: Vector3): void
}
```

# INTEGRATION REQUIREMENTS
- Use existing Vector3/Euler types from Three.js
- Integrate with Zustand store patterns
- Follow existing component architecture
- Support React Three Fiber integration
- Maintain compatibility with existing simulant system

# STATE MANAGEMENT SPECIFICATIONS
- Immutable state updates using Immer patterns
- State history for debugging and replay
- Event-driven state change notifications
- Conflict resolution for simultaneous updates
- Persistence support for save/load functionality

# TESTING VALIDATION
- Test controller creation and initialization
- Verify configuration updates work correctly
- Test control mode switching
- Validate event system functionality
- Check memory cleanup on disposal
- Test integration with InputManager

# FILES TO CREATE
- `controllers/PlayerController.ts`
- `controllers/ControllerConfig.ts`
- `controllers/ControllerState.ts`
- `controllers/ControllerEvents.ts`
- `controllers/ControllerFactory.ts`
- `types/controller.ts`
- `controllers/__tests__/PlayerController.test.ts`

# EXPECTED OUTPUT
A robust PlayerController foundation ready for physics, animation, and camera system integration, with comprehensive configuration and state management capabilities.
```

---

## Phase 2: Physics and Movement Systems

### Prompt 4: Physics Management System
```
# CONTEXT
With the core PlayerController established, implement the physics management system that handles collision detection, ground checking, and movement physics. This system must integrate with the existing voxel world and provide realistic character physics for both human players and AI simulants.

Current State:
- PlayerController core class completed
- InputManager providing movement input
- Existing voxel world with collision geometry
- Three.js physics integration points available

# OBJECTIVE
Create a comprehensive physics management system that provides realistic character movement, collision detection, and ground interaction within the voxel world environment.

# REQUIREMENTS
- PhysicsManager with rigid body integration
- GroundChecker with raycast/spherecast detection
- Collision handling with surface material detection
- Movement constraints and physics validation
- Advanced features (kinematic mode, correction systems)
- Integration with existing voxel collision system

# IMPLEMENTATION TASKS
1. Create `physics/PhysicsManager.ts` with core physics coordination
2. Implement `physics/GroundChecker.ts` for surface detection
3. Build `physics/CollisionHandler.ts` for collision response
4. Create `physics/MovementConstraints.ts` for movement validation
5. Implement `physics/PhysicsUtils.ts` for calculations
6. Integrate with existing voxel collision detection

# SUCCESS CRITERIA
- [ ] Character collision with voxel blocks working
- [ ] Ground detection accurate on various surfaces
- [ ] Slope walking with angle limitations
- [ ] Realistic gravity and physics responses
- [ ] Performance optimized for multiple characters
- [ ] Integration with existing world collision
- [ ] Proper physics cleanup and resource management

# PHYSICS SPECIFICATIONS
```typescript
// Core physics configuration
const PHYSICS_CONFIG = {
  gravity: 25.0,
  terminalVelocity: 50.0,
  groundStickiness: 2.0,
  slopeLimit: 45, // degrees
  stepHeight: 0.3,
  groundSnapDistance: 0.3,
  collisionMargin: 0.02
}

// Ground detection settings
const GROUND_CHECK_CONFIG = {
  raycastDistance: 1.0,
  sphereRadius: 0.3,
  groundLayers: ['blocks', 'terrain'],
  maxGroundAngle: 45
}
```

# INTEGRATION REQUIREMENTS
- Use existing voxel collision detection
- Integrate with Three.js raycasting
- Follow existing world coordinate system
- Connect with PlayerController update loop
- Support existing block material properties

# COLLISION DETECTION SPECIFICATIONS
- Capsule collision shape for characters
- Multi-step collision detection for fast movement
- Surface material detection (stone, wood, leaf)
- Collision response with bounce and friction
- Wall sliding and corner navigation

# TESTING VALIDATION
- Test character collision with all block types
- Verify ground detection on slopes and edges
- Test jumping and falling physics
- Validate collision response accuracy
- Check performance with multiple physics bodies
- Test integration with existing world systems

# FILES TO CREATE
- `physics/PhysicsManager.ts`
- `physics/GroundChecker.ts`
- `physics/CollisionHandler.ts`
- `physics/MovementConstraints.ts`
- `physics/PhysicsUtils.ts`
- `types/physics.ts`
- `physics/__tests__/PhysicsManager.test.ts`

# EXPECTED OUTPUT
A complete physics management system providing realistic character physics and collision detection, ready for integration with the locomotion state machine.
```

### Prompt 5: Locomotion State Machine
```
# CONTEXT
Building on the physics management system, create a sophisticated locomotion state machine that manages character movement states and transitions. This system should provide GTA 6-style movement with realistic acceleration curves, momentum, and state-based animation triggering.

Current State:
- PlayerController with physics integration
- PhysicsManager handling collision and ground detection
- InputManager providing movement commands
- Integration points for animation system ready

# OBJECTIVE
Implement a comprehensive locomotion system that manages movement states, calculates movement physics, and provides smooth transitions between different locomotion modes.

# REQUIREMENTS
- LocomotionManager with state machine (idle, walk, run, jump, etc.)
- Movement calculations (speed, direction, acceleration)
- State transition validation and timing controls
- GTA 6-style movement parameters with realistic curves
- Momentum and deceleration systems
- Integration with physics and animation systems

# IMPLEMENTATION TASKS
1. Create `locomotion/LocomotionManager.ts` with state machine
2. Implement `locomotion/MovementCalculator.ts` for physics calculations
3. Build `locomotion/StateTransitions.ts` for transition logic
4. Create `locomotion/MovementCurves.ts` for acceleration profiles
5. Implement `locomotion/MomentumSystem.ts` for realistic physics
6. Define movement parameters and configuration

# SUCCESS CRITERIA
- [ ] Smooth transitions between all movement states
- [ ] Realistic acceleration and deceleration curves
- [ ] Momentum-based movement feels natural
- [ ] State validation prevents invalid transitions
- [ ] Integration with physics system working
- [ ] Performance optimized for real-time updates
- [ ] Configuration allows tuning movement feel

# MOVEMENT PARAMETERS
```typescript
// GTA 6-inspired movement configuration
const MOVEMENT_PARAMETERS = {
  // Speed settings (units/second)
  walkSpeed: 3.5,
  runSpeed: 7.0,
  sprintSpeed: 10.5,
  crouchSpeed: 1.5,
  
  // Jump settings
  jumpHeight: 1.2,
  jumpForwardForce: 5.0,
  coyoteTime: 0.1, // Grace period for jumping after leaving ground
  
  // Acceleration curves
  walkAcceleration: 15.0,
  runAcceleration: 10.0,
  sprintAcceleration: 8.0,
  airAcceleration: 2.0,
  
  // Deceleration
  groundDeceleration: 20.0,
  airDeceleration: 0.5,
  slideDeceleration: 2.0,
  
  // State timing
  runToSprintDelay: 0.5,
  landingRecovery: 0.3,
  jumpCooldown: 0.1,
  
  // Thresholds
  runThreshold: 0.1,
  sprintThreshold: 0.8,
  stopThreshold: 0.05
}
```

# STATE MACHINE SPECIFICATION
```typescript
// Locomotion states and valid transitions
const STATE_TRANSITIONS = {
  idle: ['walking', 'running', 'jumping', 'crouching'],
  walking: ['idle', 'running', 'jumping', 'crouching'],
  running: ['idle', 'walking', 'sprinting', 'jumping'],
  sprinting: ['running', 'walking', 'jumping'],
  jumping: ['falling', 'landing'],
  falling: ['landing', 'idle'],
  landing: ['idle', 'walking', 'running'],
  crouching: ['idle', 'crawling']
}
```

# INTEGRATION REQUIREMENTS
- Connect with PhysicsManager for movement application
- Integrate with InputManager for movement input
- Prepare animation integration points
- Use existing PlayerController update cycle
- Support both human and AI movement patterns

# TESTING VALIDATION
- Test all state transitions work correctly
- Verify movement feels responsive and natural
- Test jump mechanics and landing detection
- Validate momentum and acceleration curves
- Check performance with multiple characters
- Test integration with physics collision

# FILES TO CREATE
- `locomotion/LocomotionManager.ts`
- `locomotion/MovementCalculator.ts`
- `locomotion/StateTransitions.ts`
- `locomotion/MovementCurves.ts`
- `locomotion/MomentumSystem.ts`
- `types/locomotion.ts`
- `locomotion/__tests__/LocomotionManager.test.ts`

# EXPECTED OUTPUT
A sophisticated locomotion system providing GTA 6-style character movement with realistic physics and smooth state transitions, ready for animation system integration.
```

---

## Continuation Instructions

This prompt sequence document will continue with the remaining 22 prompts covering:

**Phase 3: Animation and Camera Integration (Prompts 6-8)**
- Movement state tracking system
- RPM animation system integration  
- Camera controller integration

**Phase 4: World Integration and Collision (Prompts 9-11)**
- Voxel world collision detection
- Interaction system
- WorldStore integration

**Phase 5: Performance and Optimization (Prompts 12-13)**
- Performance optimization system
- Memory management and cleanup

**Phase 6: Network and Multiplayer (Prompts 14-15)**
- Network state synchronization
- Multiplayer controller management

**Phase 7: Accessibility and UX (Prompts 16-17)**
- Accessibility support
- Settings and configuration system

**Phase 8: Debugging and Dev Tools (Prompts 18-19)**
- Debug system implementation
- Development UI and testing interface

**Phase 9: Error Handling (Prompts 20-21)**
- Comprehensive error handling
- Recovery and failsafe systems

**Phase 10: Testing (Prompts 22-24)**
- Unit testing suite
- Integration testing framework
- Performance and stress testing

**Phase 11: Final Integration (Prompts 25-27)**
- Simulant system integration
- Human player interface
- Final polish and documentation

Each prompt follows the same comprehensive structure with context, objectives, requirements, implementation tasks, success criteria, and integration guidelines.
