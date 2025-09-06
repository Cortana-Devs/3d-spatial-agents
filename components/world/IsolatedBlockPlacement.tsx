'use client'

import React, { useCallback, useState, useRef, useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { Vector2, Vector3, Plane, Raycaster } from 'three'
import { useWorldStore } from '../../store/worldStore'
import { SelectionMode, BlockType } from '../../types'
import { useBlockPlacementRender, useBatchedUpdates } from '../../hooks/performance/useIsolatedRender'

interface PlacementState {
  ghostPosition: [number, number, number] | null
  isPlacing: boolean
  lastPlacementTime: number
  placementCount: number
}

interface PlacementMetrics {
  totalPlacements: number
  averageTime: number
  lastPlacementDuration: number
  queuedOperations: number
}

/**
 * Isolated Block Placement Manager
 * Prevents interference with animation system and other modules
 * Uses dedicated render loop and batched updates for smooth performance
 */
export function IsolatedBlockPlacement() {
  const { camera, gl } = useThree()
  const {
    addBlock,
    removeBlock,
    selectedBlockType,
    selectionMode,
    blockMap,
    worldLimits
  } = useWorldStore()

  // Isolated state management
  const [placementState, setPlacementState] = useState<PlacementState>({
    ghostPosition: null,
    isPlacing: false,
    lastPlacementTime: 0,
    placementCount: 0
  })

  const [metrics, setMetrics] = useState<PlacementMetrics>({
    totalPlacements: 0,
    averageTime: 0,
    lastPlacementDuration: 0,
    queuedOperations: 0
  })

  // Refs for performance optimization
  const raycastRef = useRef(new Raycaster())
  const mouseRef = useRef(new Vector2())
  const groundPlaneRef = useRef(new Plane(new Vector3(0, 1, 0), 0))
  const intersectionPointRef = useRef(new Vector3())
  const placementTimesRef = useRef<number[]>([])
  const lastMouseMoveRef = useRef(0)
  const isActiveRef = useRef(false)

  // Batched updates for performance
  const { queueUpdate, deferHeavyOperation, canExecuteHeavy } = useBatchedUpdates('block-placement')

  // Isolated render loop for block placement
  const renderMetrics = useBlockPlacementRender((deltaTime) => {
    if (!isActiveRef.current || selectionMode !== SelectionMode.PLACE) return

    // Throttle mouse position updates to prevent excessive raycasting
    const now = performance.now()
    if (now - lastMouseMoveRef.current < 16) return // ~60fps throttle

    updateGhostPosition()
  })

  // Optimized ghost position calculation
  const updateGhostPosition = useCallback(() => {
    if (selectionMode !== SelectionMode.PLACE) {
      if (placementState.ghostPosition) {
        setPlacementState(prev => ({ ...prev, ghostPosition: null }))
      }
      return
    }

    const raycaster = raycastRef.current
    const mouse = mouseRef.current
    const groundPlane = groundPlaneRef.current
    const intersectionPoint = intersectionPointRef.current

    raycaster.setFromCamera(mouse, camera)

    if (raycaster.ray.intersectPlane(groundPlane, intersectionPoint)) {
      const snappedPosition: [number, number, number] = [
        Math.round(intersectionPoint.x),
        Math.max(0, Math.round(intersectionPoint.y)),
        Math.round(intersectionPoint.z)
      ]

      // Check if position is valid
      const positionKey = `${snappedPosition[0]},${snappedPosition[1]},${snappedPosition[2]}`
      const hasExistingBlock = blockMap.has(positionKey)

      if (!hasExistingBlock) {
        // Only update if position actually changed
        const currentGhost = placementState.ghostPosition
        if (!currentGhost ||
            currentGhost[0] !== snappedPosition[0] ||
            currentGhost[1] !== snappedPosition[1] ||
            currentGhost[2] !== snappedPosition[2]) {

          queueUpdate(() => {
            setPlacementState(prev => ({ ...prev, ghostPosition: snappedPosition }))
          })
        }
      } else if (placementState.ghostPosition) {
        queueUpdate(() => {
          setPlacementState(prev => ({ ...prev, ghostPosition: null }))
        })
      }
    }
  }, [camera, selectionMode, blockMap, placementState.ghostPosition, queueUpdate])

  // Optimized click handler
  const handleClick = useCallback((event: MouseEvent) => {
    if (selectionMode !== SelectionMode.PLACE || placementState.isPlacing) return

    const startTime = performance.now()

    // Prevent rapid clicking
    if (startTime - placementState.lastPlacementTime < 100) return

    // Update mouse position
    mouseRef.current.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    )

    const raycaster = raycastRef.current
    const groundPlane = groundPlaneRef.current
    const intersectionPoint = intersectionPointRef.current

    raycaster.setFromCamera(mouseRef.current, camera)

    if (raycaster.ray.intersectPlane(groundPlane, intersectionPoint)) {
      const snappedPosition = new Vector3(
        Math.round(intersectionPoint.x),
        Math.max(0, Math.round(intersectionPoint.y)),
        Math.round(intersectionPoint.z)
      )

      const positionKey = `${snappedPosition.x},${snappedPosition.y},${snappedPosition.z}`
      const hasExistingBlock = blockMap.has(positionKey)
      const atLimit = blockMap.size >= worldLimits.maxBlocks

      if (!hasExistingBlock && !atLimit) {
        // Set placing state to prevent double-clicks
        setPlacementState(prev => ({
          ...prev,
          isPlacing: true,
          placementCount: prev.placementCount + 1
        }))

        // Queue the actual placement operation
        const placementOperation = () => {
          const success = addBlock(snappedPosition, selectedBlockType, 'human')

          const endTime = performance.now()
          const placementDuration = endTime - startTime

          // Update metrics
          placementTimesRef.current.push(placementDuration)
          if (placementTimesRef.current.length > 100) {
            placementTimesRef.current.shift() // Keep last 100 measurements
          }

          const averageTime = placementTimesRef.current.reduce((sum, time) => sum + time, 0) / placementTimesRef.current.length

          setMetrics(prev => ({
            totalPlacements: prev.totalPlacements + (success ? 1 : 0),
            averageTime,
            lastPlacementDuration: placementDuration,
            queuedOperations: prev.queuedOperations
          }))

          setPlacementState(prev => ({
            ...prev,
            isPlacing: false,
            lastPlacementTime: endTime
          }))

          console.log(`🧱 Block placed in ${placementDuration.toFixed(2)}ms`)
        }

        // Use deferred execution for heavy operations
        if (canExecuteHeavy()) {
          placementOperation()
        } else {
          deferHeavyOperation(placementOperation)
          setMetrics(prev => ({ ...prev, queuedOperations: prev.queuedOperations + 1 }))
        }
      }
    }
  }, [
    camera,
    selectionMode,
    placementState.isPlacing,
    placementState.lastPlacementTime,
    addBlock,
    selectedBlockType,
    blockMap,
    worldLimits,
    canExecuteHeavy,
    deferHeavyOperation
  ])

  // Optimized mouse move handler
  const handleMouseMove = useCallback((event: MouseEvent) => {
    lastMouseMoveRef.current = performance.now()

    // Update mouse position reference
    mouseRef.current.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    )

    isActiveRef.current = true
  }, [])

  // Right-click for removal
  const handleRightClick = useCallback((event: MouseEvent) => {
    event.preventDefault()

    if (selectionMode !== SelectionMode.PLACE) return

    mouseRef.current.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    )

    const raycaster = raycastRef.current
    raycaster.setFromCamera(mouseRef.current, camera)

    // Raycast against existing blocks
    const blocks = Array.from(blockMap.values())
    const intersects = raycaster.intersectObjects(
      blocks.map(block => ({
        position: new Vector3(block.position.x, block.position.y, block.position.z),
        userData: { blockId: block.id }
      })) as any
    )

    if (intersects.length > 0) {
      const blockId = intersects[0].object.userData?.blockId
      if (blockId) {
        deferHeavyOperation(() => {
          removeBlock(new Vector3().copy(intersects[0].point), 'human')
          console.log('🗑️ Block removed')
        })
      }
    }
  }, [camera, selectionMode, blockMap, removeBlock, deferHeavyOperation])

  // Event listener setup with cleanup
  useEffect(() => {
    const canvas = gl.domElement
    if (!canvas) return

    // Passive event listeners for better performance
    const options = { passive: false }

    canvas.addEventListener('click', handleClick, options)
    canvas.addEventListener('contextmenu', handleRightClick, options)
    canvas.addEventListener('mousemove', handleMouseMove, { passive: true })
    canvas.addEventListener('mouseleave', () => { isActiveRef.current = false }, { passive: true })

    return () => {
      canvas.removeEventListener('click', handleClick)
      canvas.removeEventListener('contextmenu', handleRightClick)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mouseleave', () => { isActiveRef.current = false })
    }
  }, [handleClick, handleRightClick, handleMouseMove, gl.domElement])

  // Development metrics display
  const debugInfo = useMemo(() => {
    if (process.env.NODE_ENV !== 'development') return null

    return {
      renderMetrics,
      placementMetrics: metrics,
      state: placementState,
      isThrottled: renderMetrics.isThrottled
    }
  }, [renderMetrics, metrics, placementState])

  // Development console logging
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && debugInfo) {
      console.log('🧱 Block Placement Metrics:', debugInfo)
    }
  }, [debugInfo])

  // Ghost block preview component
  const GhostPreview = React.memo(() => {
    if (!placementState.ghostPosition || selectionMode !== SelectionMode.PLACE) return null

    return (
      <mesh
        position={placementState.ghostPosition}
        visible={true}
      >
        <boxGeometry args={[0.98, 0.98, 0.98]} />
        <meshBasicMaterial
          color={selectedBlockType === 'stone' ? '#888888' : selectedBlockType === 'wood' ? '#8B4513' : '#228B22'}
          transparent
          opacity={0.5}
          wireframe={false}
        />
      </mesh>
    )
  })

  return (
    <>
      <GhostPreview />
      {process.env.NODE_ENV === 'development' && debugInfo && (
        <div className="absolute bottom-4 left-4 bg-black/80 text-white p-2 rounded text-xs">
          <div>Block Placement Module</div>
          <div>FPS: {renderMetrics.fps}</div>
          <div>Frame Time: {renderMetrics.frameTime.toFixed(2)}ms</div>
          <div>Throttled: {renderMetrics.isThrottled ? 'Yes' : 'No'}</div>
          <div>Total Placements: {metrics.totalPlacements}</div>
          <div>Avg Time: {metrics.averageTime.toFixed(2)}ms</div>
          <div>Queued Ops: {metrics.queuedOperations}</div>
        </div>
      )}
    </>
  )
}

export default IsolatedBlockPlacement
