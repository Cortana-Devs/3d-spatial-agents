'use client'

import React, { useRef, useCallback, useMemo, useState, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { Vector3, Euler, Quaternion, MathUtils } from 'three'
import { useModuleSystem } from './ModuleManager'
import { useWorldStore } from '../../store/worldStore'
import {
  PlayerAvatarState,
  MovementAnimationState,
  MovementState,
  AvatarControllerIntegration
} from '../../types/playerAvatar'

interface EnhancedPlayerControlModuleProps {
  enableKeyboardControls?: boolean
  enableMouseLook?: boolean
  movementSpeed?: number
  lookSensitivity?: number
  smoothing?: number
  enableCollision?: boolean
  enableAvatarSync?: boolean
  avatarOffsetDistance?: number
  avatarHeightOffset?: number
}

interface PlayerMovementState {
  forward: boolean
  backward: boolean
  left: boolean
  right: boolean
  up: boolean
  down: boolean
  sprint: boolean
  crouch: boolean
}

interface CameraState {
  yaw: number
  pitch: number
  position: Vector3
  velocity: Vector3
  grounded: boolean
}

const MOVEMENT_KEYS = {
  forward: ['KeyW', 'ArrowUp'],
  backward: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  up: ['Space'],
  down: ['KeyC', 'ControlLeft'],
  sprint: ['ShiftLeft'],
  crouch: ['KeyZ'],
} as const

export function EnhancedPlayerControlModule({
  enableKeyboardControls = true,
  enableMouseLook = true,
  movementSpeed = 8.0,
  lookSensitivity = 0.002,
  smoothing = 0.1,
  enableCollision = true,
  enableAvatarSync = true,
  avatarOffsetDistance = 2.0,
  avatarHeightOffset = -0.5,
}: EnhancedPlayerControlModuleProps) {
  const { camera, gl } = useThree()
  const {
    activeCamera,
    setCameraMode,
    playerAvatar,
    updateAvatarPosition,
    updateAvatarAnimation,
    updateAvatarState
  } = useWorldStore()

  // Control state
  const [isControlsLocked, setIsControlsLocked] = useState(false)
  const [movementState, setMovementState] = useState<PlayerMovementState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
    sprint: false,
    crouch: false,
  })

  // Performance refs
  const cameraStateRef = useRef<CameraState>({
    yaw: 0,
    pitch: 0,
    position: new Vector3(10, 10, 10),
    velocity: new Vector3(),
    grounded: false,
  })

  const mouseMovementRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const lastUpdateTimeRef = useRef<number>(performance.now())
  const keysRef = useRef<Set<string>>(new Set())
  const smoothedVelocityRef = useRef<Vector3>(new Vector3())
  const lastMovementStateRef = useRef<MovementAnimationState>('idle')
  const avatarPositionRef = useRef<Vector3>(new Vector3())

  // Register with module system
  const { requestFrame, setEnabled, getStats } = useModuleSystem({
    id: 'enhanced-player-control',
    priority: 9,
    maxFrameTime: 4,
    targetFPS: 60,
    canSkipFrames: false,
  })

  // Avatar Controller Integration
  const avatarIntegration: AvatarControllerIntegration = useMemo(() => ({
    syncAvatarWithController(deltaTime: number): void {
      if (!enableAvatarSync || !playerAvatar?.isLoaded) return

      const controllerPosition = cameraStateRef.current.position
      const avatarPosition = this.calculateAvatarPosition(controllerPosition)
      const avatarRotation = this.getAvatarRotation()

      // Smooth avatar position updates
      avatarPositionRef.current.lerp(avatarPosition, smoothing * 2)

      // Update avatar transform
      updateAvatarPosition(avatarPositionRef.current)

      // Update avatar state with rotation
      updateAvatarState({
        position: avatarPositionRef.current.clone(),
        rotation: avatarRotation,
        lastUpdateTime: performance.now()
      })
    },

    updateMovementAnimations(): void {
      if (!enableAvatarSync || !playerAvatar?.isLoaded) return

      const velocity = smoothedVelocityRef.current
      const speed = velocity.length()

      let targetAnimationState: MovementAnimationState = 'idle'

      // Determine animation based on movement
      if (speed > 0.1) {
        if (movementState.sprint && speed > 4.0) {
          targetAnimationState = 'running'
        } else if (speed > 1.0) {
          targetAnimationState = 'walking'
        } else {
          targetAnimationState = 'idle'
        }
      }

      // Handle jumping/falling
      if (!cameraStateRef.current.grounded) {
        if (cameraStateRef.current.velocity.y > 0.5) {
          targetAnimationState = 'jumping'
        } else if (cameraStateRef.current.velocity.y < -1.0) {
          targetAnimationState = 'falling'
        }
      }

      // Update animation if changed
      if (targetAnimationState !== lastMovementStateRef.current) {
        updateAvatarAnimation(targetAnimationState)
        lastMovementStateRef.current = targetAnimationState
      }
    },

    calculateAvatarPosition(controllerPosition: Vector3): Vector3 {
      const avatarPos = new Vector3()

      if (activeCamera === 'fly') {
        // First-person: avatar behind camera
        const cameraDirection = new Vector3()
        camera.getWorldDirection(cameraDirection)

        // Position avatar behind the camera
        avatarPos.copy(controllerPosition)
          .add(cameraDirection.clone().multiplyScalar(-avatarOffsetDistance))

        avatarPos.y += avatarHeightOffset
      } else {
        // Third-person: avatar at camera target
        avatarPos.copy(controllerPosition)
        avatarPos.y += avatarHeightOffset
      }

      return avatarPos
    },

    getAvatarRotation(): Euler {
      const rotation = new Euler()

      // Avatar faces the same direction as camera (Y-axis rotation only)
      rotation.setFromQuaternion(camera.quaternion)
      rotation.x = 0 // Keep avatar upright
      rotation.z = 0 // Keep avatar upright

      return rotation
    },

    canSkipFrame(): boolean {
      const stats = getStats()
      return stats ? stats.averageFrameTime > 12 : false
    },

    shouldReduceLOD(): boolean {
      const stats = getStats()
      return stats ? stats.averageFPS < 45 : false
    },

    getFrameBudget(): number {
      return 4 // 4ms budget for avatar updates
    }
  }), [enableAvatarSync, playerAvatar, activeCamera, camera, movementState, smoothing, avatarOffsetDistance, avatarHeightOffset])

  // Movement speed with modifiers
  const getMovementSpeed = useCallback(() => {
    let speed = movementSpeed

    if (movementState.sprint) speed *= 2.0
    if (movementState.crouch) speed *= 0.5

    return speed
  }, [movementSpeed, movementState.sprint, movementState.crouch])

  // Collision detection
  const checkCollision = useCallback(
    (newPosition: Vector3): Vector3 => {
      if (!enableCollision) return newPosition

      const groundLevel = 0.5
      if (newPosition.y < groundLevel) {
        newPosition.y = groundLevel
        cameraStateRef.current.grounded = true
        cameraStateRef.current.velocity.y = 0
      } else {
        cameraStateRef.current.grounded = false
      }

      const bounds = 100
      newPosition.x = MathUtils.clamp(newPosition.x, -bounds, bounds)
      newPosition.z = MathUtils.clamp(newPosition.z, -bounds, bounds)
      newPosition.y = Math.max(newPosition.y, groundLevel)

      return newPosition
    },
    [enableCollision]
  )

  // Update movement state from keyboard
  const updateMovementFromKeys = useCallback(() => {
    const newState = { ...movementState }

    Object.entries(MOVEMENT_KEYS).forEach(([action, keys]) => {
      const isPressed = keys.some((key) => keysRef.current.has(key))
      ;(newState as any)[action] = isPressed
    })

    setMovementState(newState)
  }, [movementState])

  // Apply camera rotation
  const applyCameraRotation = useCallback(
    (deltaTime: number) => {
      if (!enableMouseLook || !isControlsLocked) return

      const cameraState = cameraStateRef.current

      cameraState.yaw -= mouseMovementRef.current.x * lookSensitivity
      cameraState.pitch -= mouseMovementRef.current.y * lookSensitivity

      cameraState.pitch = MathUtils.clamp(
        cameraState.pitch,
        -Math.PI / 2,
        Math.PI / 2
      )

      const euler = new Euler(cameraState.pitch, cameraState.yaw, 0, 'YXZ')
      camera.setRotationFromEuler(euler)

      mouseMovementRef.current.x = 0
      mouseMovementRef.current.y = 0
    },
    [enableMouseLook, isControlsLocked, lookSensitivity, camera]
  )

  // Apply movement
  const applyMovement = useCallback(
    (deltaTime: number) => {
      if (!enableKeyboardControls) return

      const cameraState = cameraStateRef.current
      const speed = getMovementSpeed()
      const movementVector = new Vector3()

      const forward = new Vector3()
      const right = new Vector3()

      camera.getWorldDirection(forward)
      right.crossVectors(forward, camera.up).normalize()

      if (cameraState.grounded && activeCamera !== 'fly') {
        forward.y = 0
        forward.normalize()
      }

      // Apply movement input
      if (movementState.forward) movementVector.add(forward)
      if (movementState.backward) movementVector.sub(forward)
      if (movementState.right) movementVector.add(right)
      if (movementState.left) movementVector.sub(right)
      if (movementState.up && (activeCamera === 'fly' || !cameraState.grounded)) {
        movementVector.add(camera.up)
      }
      if (movementState.down && activeCamera === 'fly') {
        movementVector.sub(camera.up)
      }

      if (movementVector.length() > 0) {
        movementVector.normalize().multiplyScalar(speed * deltaTime)
      }

      // Apply gravity
      if (activeCamera !== 'fly' && !cameraState.grounded) {
        cameraState.velocity.y -= 9.81 * deltaTime
      }

      cameraState.velocity.add(movementVector)
      smoothedVelocityRef.current.lerp(cameraState.velocity, smoothing)

      const newPosition = cameraState.position
        .clone()
        .add(smoothedVelocityRef.current.clone().multiplyScalar(deltaTime))

      const correctedPosition = checkCollision(newPosition)
      cameraState.position.copy(correctedPosition)
      camera.position.copy(cameraState.position)

      const drag = cameraState.grounded ? 0.9 : 0.98
      cameraState.velocity.multiplyScalar(drag)

      if (cameraState.velocity.length() < 0.01) {
        cameraState.velocity.set(0, 0, 0)
      }
    },
    [
      enableKeyboardControls,
      getMovementSpeed,
      camera,
      activeCamera,
      movementState,
      smoothing,
      checkCollision,
    ]
  )

  // Main update loop with avatar integration
  const enhancedUpdateLoop = useCallback(
    (deltaTime: number) => {
      const currentTime = performance.now()
      const frameTime = (currentTime - lastUpdateTimeRef.current) / 1000
      lastUpdateTimeRef.current = currentTime

      // Skip frame if performance is poor and avatar allows it
      if (avatarIntegration.canSkipFrame() && frameTime > 16) {
        return
      }

      // Update movement state
      updateMovementFromKeys()

      // Apply camera controls
      applyCameraRotation(frameTime)
      applyMovement(frameTime)

      // Sync avatar with controller
      if (enableAvatarSync) {
        avatarIntegration.syncAvatarWithController(frameTime)
        avatarIntegration.updateMovementAnimations()
      }

      // Auto-adjust avatar LOD if needed
      if (avatarIntegration.shouldReduceLOD() && playerAvatar) {
        const currentLOD = playerAvatar.renderLOD
        if (currentLOD === 'high') {
          updateAvatarState({ renderLOD: 'medium' })
        } else if (currentLOD === 'medium') {
          updateAvatarState({ renderLOD: 'low' })
        }
      }
    },
    [
      updateMovementFromKeys,
      applyCameraRotation,
      applyMovement,
      avatarIntegration,
      enableAvatarSync,
      playerAvatar
    ]
  )

  // Event handlers
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const isMovementKey = Object.values(MOVEMENT_KEYS)
      .flat()
      .includes(event.code as any)
    if (isMovementKey) {
      event.preventDefault()
    }

    keysRef.current.add(event.code)

    if (event.code === 'Escape') {
      setIsControlsLocked(false)
      document.exitPointerLock()
    }
  }, [])

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    keysRef.current.delete(event.code)
  }, [])

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!isControlsLocked) return

      mouseMovementRef.current.x += event.movementX
      mouseMovementRef.current.y += event.movementY
    },
    [isControlsLocked]
  )

  const handleClick = useCallback(() => {
    if (!isControlsLocked && enableMouseLook) {
      gl.domElement.requestPointerLock()
    }
  }, [isControlsLocked, enableMouseLook, gl])

  const handlePointerLockChange = useCallback(() => {
    setIsControlsLocked(document.pointerLockElement === gl.domElement)
  }, [gl])

  // Register update loop
  React.useEffect(() => {
    requestFrame(enhancedUpdateLoop)
  }, [requestFrame, enhancedUpdateLoop])

  // Event listeners
  React.useEffect(() => {
    if (!enableKeyboardControls && !enableMouseLook) return

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)
    document.addEventListener('pointerlockchange', handlePointerLockChange)

    if (enableMouseLook) {
      document.addEventListener('mousemove', handleMouseMove)
      gl.domElement.addEventListener('click', handleClick)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
      document.removeEventListener('pointerlockchange', handlePointerLockChange)

      if (enableMouseLook) {
        document.removeEventListener('mousemove', handleMouseMove)
        gl.domElement.removeEventListener('click', handleClick)
      }
    }
  }, [
    enableKeyboardControls,
    enableMouseLook,
    handleKeyDown,
    handleKeyUp,
    handleMouseMove,
    handleClick,
    handlePointerLockChange,
    gl,
  ])

  // Initialize camera state
  React.useEffect(() => {
    cameraStateRef.current.position.copy(camera.position)
    lastUpdateTimeRef.current = performance.now()
  }, [camera])

  // Enable/disable based on camera mode
  React.useEffect(() => {
    const shouldEnable = activeCamera === 'fly'
    setEnabled(shouldEnable)
  }, [activeCamera, setEnabled])

  // Reset avatar when entering fly mode
  React.useEffect(() => {
    if (activeCamera === 'fly') {
      cameraStateRef.current.velocity.set(0, 0, 0)
      cameraStateRef.current.grounded = false

      // Reset avatar position
      if (enableAvatarSync && playerAvatar) {
        const newAvatarPos = avatarIntegration.calculateAvatarPosition(
          cameraStateRef.current.position
        )
        avatarPositionRef.current.copy(newAvatarPos)
      }
    }
  }, [activeCamera, enableAvatarSync, playerAvatar, avatarIntegration])

  // Performance monitoring
  const stats = getStats()
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development' && stats) {
      if (stats.averageFrameTime > 6) {
        console.warn('[EnhancedPlayerControl] Performance warning - input lag detected')
      }
    }
  }, [stats])

  return (
    <group name="enhanced-player-control-module">
      {/* Debug visualization */}
      {process.env.NODE_ENV === 'development' && (
        <EnhancedControlDebugOverlay
          isControlsLocked={isControlsLocked}
          movementState={movementState}
          cameraState={cameraStateRef.current}
          avatarSyncEnabled={enableAvatarSync}
          avatarLoaded={playerAvatar?.isLoaded || false}
          currentAnimation={playerAvatar?.currentAnimation || 'none'}
          stats={stats}
        />
      )}

      {/* Controls instruction overlay */}
      {!isControlsLocked && enableMouseLook && <ControlsInstructionOverlay />}
    </group>
  )
}

// Enhanced debug overlay
function EnhancedControlDebugOverlay({
  isControlsLocked,
  movementState,
  cameraState,
  avatarSyncEnabled,
  avatarLoaded,
  currentAnimation,
  stats,
}: {
  isControlsLocked: boolean
  movementState: PlayerMovementState
  cameraState: CameraState
  avatarSyncEnabled: boolean
  avatarLoaded: boolean
  currentAnimation: string
  stats: any
}) {
  if (process.env.NODE_ENV !== 'development') return null

  return (
    <group name="enhanced-control-debug">
      {/* Control status indicators */}
      <mesh position={[0, 4, 0]}>
        <sphereGeometry args={[0.2]} />
        <meshBasicMaterial color={isControlsLocked ? '#00ff00' : '#ff8800'} />
      </mesh>

      {/* Avatar sync indicator */}
      <mesh position={[0.5, 4, 0]}>
        <sphereGeometry args={[0.1]} />
        <meshBasicMaterial
          color={avatarSyncEnabled && avatarLoaded ? '#00ff00' : '#ff0000'}
        />
      </mesh>

      {/* Movement indicators */}
      {movementState.forward && (
        <mesh position={[0, 3, -1]}>
          <sphereGeometry args={[0.1]} />
          <meshBasicMaterial color="#00ff00" />
        </mesh>
      )}
      {movementState.backward && (
        <mesh position={[0, 3, 1]}>
          <sphereGeometry args={[0.1]} />
          <meshBasicMaterial color="#00ff00" />
        </mesh>
      )}
      {movementState.left && (
        <mesh position={[-1, 3, 0]}>
          <sphereGeometry args={[0.1]} />
          <meshBasicMaterial color="#00ff00" />
        </mesh>
      )}
      {movementState.right && (
        <mesh position={[1, 3, 0]}>
          <sphereGeometry args={[0.1]} />
          <meshBasicMaterial color="#00ff00" />
        </mesh>
      )}

      {/* Ground status */}
      <mesh position={[0, cameraState.grounded ? 2.5 : 2.8, 0]}>
        <sphereGeometry args={[0.05]} />
        <meshBasicMaterial
          color={cameraState.grounded ? '#8B4513' : '#87CEEB'}
        />
      </mesh>
    </group>
  )
}

// Simple controls instruction component
function ControlsInstructionOverlay() {
  return null // Handled by UI components
}

export default EnhancedPlayerControlModule
