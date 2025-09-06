import * as THREE from 'three'
import { FrostedGlassFloor } from '../../../types/floorTypes'
import { AINavigationProperties, FloorNavigationAnalyzer } from './FloorNavigationProperties'

export interface NavMeshNode {
  id: string
  position: THREE.Vector3
  walkable: boolean
  cost: number
  safetyLevel: string
  connectedNodes: string[]
  floorId?: string
  specialProperties: string[]
}

export interface NavMeshEdge {
  from: string
  to: string
  cost: number
  bidirectional: boolean
  restrictions: string[]
  safetyRequirement: string
}

export class TransparentNavMeshGenerator {
  private nodeCounter = 0
  private generatedMeshes = new Map<string, NavMesh>()
  private gridResolution = 0.5 // Meters per grid cell

  generateNavMesh(
    floors: FrostedGlassFloor[],
    worldBounds: THREE.Box3,
    obstacles: THREE.Object3D[] = []
  ): NavMesh {
    const navMesh: NavMesh = {
      nodes: new Map(),
      edges: [],
      floorAssociations: new Map(),
      lastUpdate: Date.now(),
      version: 1
    }

    // Generate nodes for each floor
    floors.forEach(floor => {
      const floorNodes = this.generateNodesForFloor(floor)
      floorNodes.forEach(node => {
        navMesh.nodes.set(node.id, node)
        navMesh.floorAssociations.set(node.id, floor.id)
      })
    })

    // Generate edges between nodes
    const edges = this.generateEdges(Array.from(navMesh.nodes.values()))
    navMesh.edges = edges

    // Add alternative path nodes for risky areas
    this.addAlternativePathNodes(navMesh, floors)

    // Optimize mesh for performance
    this.optimizeNavMesh(navMesh)

    return navMesh
  }

  private generateNodesForFloor(floor: FrostedGlassFloor): NavMeshNode[] {
    const nodes: NavMeshNode[] = []
    const aiProps = FloorNavigationAnalyzer.analyzeFloorForAI(floor)

    // Generate a grid of nodes across the floor surface
    const floorSize = 1.0 // Assuming 1x1 meter floors
    const nodeCount = Math.ceil(floorSize / this.gridResolution)

    for (let x = 0; x < nodeCount; x++) {
      for (let z = 0; z < nodeCount; z++) {
        const localX = (x - (nodeCount - 1) / 2) * this.gridResolution
        const localZ = (z - (nodeCount - 1) / 2) * this.gridResolution

        const nodePosition = new THREE.Vector3(
          floor.position.x + localX,
          floor.position.y + 0.05, // Slightly above the floor
          floor.position.z + localZ
        )

        const node: NavMeshNode = {
          id: `floor_${floor.id}_node_${this.nodeCounter++}`,
          position: nodePosition,
          walkable: aiProps.walkable,
          cost: aiProps.navigationCost,
          safetyLevel: aiProps.safetyLevel,
          connectedNodes: [],
          floorId: floor.id,
          specialProperties: this.determineSpecialProperties(floor, aiProps)
        }

        nodes.push(node)
      }
    }

    // Add edge nodes for entering/exiting the floor
    const edgeNodes = this.generateFloorEdgeNodes(floor, aiProps)
    nodes.push(...edgeNodes)

    return nodes
  }

  private determineSpecialProperties(floor: FrostedGlassFloor, aiProps: AINavigationProperties): string[] {
    const properties: string[] = []

    if (aiProps.slippery) properties.push('slippery')
    if (aiProps.requiresSpecialBehavior) properties.push('requires_caution')
    if (floor.transparency > 0.8) properties.push('high_transparency')
    if (aiProps.structuralConfidence < 0.5) properties.push('structural_concern')
    if (aiProps.visibilityFactor > 0.6) properties.push('see_through')
    if (aiProps.safetyLevel === 'dangerous' || aiProps.safetyLevel === 'avoid') {
      properties.push('hazardous')
    }

    return properties
  }

  private generateFloorEdgeNodes(floor: FrostedGlassFloor, aiProps: AINavigationProperties): NavMeshNode[] {
    const edgeNodes: NavMeshNode[] = []
    const floorPos = floor.position

    // Create nodes at the edges of the floor for entry/exit points
    const edgePositions = [
      new THREE.Vector3(floorPos.x - 0.6, floorPos.y + 0.05, floorPos.z), // Left edge
      new THREE.Vector3(floorPos.x + 0.6, floorPos.y + 0.05, floorPos.z), // Right edge
      new THREE.Vector3(floorPos.x, floorPos.y + 0.05, floorPos.z - 0.6), // Front edge
      new THREE.Vector3(floorPos.x, floorPos.y + 0.05, floorPos.z + 0.6)  // Back edge
    ]

    edgePositions.forEach((pos, index) => {
      const edgeNode: NavMeshNode = {
        id: `floor_${floor.id}_edge_${index}_${this.nodeCounter++}`,
        position: pos,
        walkable: aiProps.walkable,
        cost: aiProps.navigationCost * 1.2, // Slightly higher cost for edge nodes
        safetyLevel: aiProps.safetyLevel,
        connectedNodes: [],
        floorId: floor.id,
        specialProperties: [...this.determineSpecialProperties(floor, aiProps), 'edge_node']
      }

      edgeNodes.push(edgeNode)
    })

    return edgeNodes
  }

  private generateEdges(nodes: NavMeshNode[]): NavMeshEdge[] {
    const edges: NavMeshEdge[] = []
    const maxConnectionDistance = this.gridResolution * 1.5 // Allow diagonal connections

    for (let i = 0; i < nodes.length; i++) {
      const nodeA = nodes[i]

      for (let j = i + 1; j < nodes.length; j++) {
        const nodeB = nodes[j]
        const distance = nodeA.position.distanceTo(nodeB.position)

        if (distance <= maxConnectionDistance && this.canConnect(nodeA, nodeB)) {
          const edge = this.createEdge(nodeA, nodeB, distance)
          if (edge) {
            edges.push(edge)
            nodeA.connectedNodes.push(nodeB.id)
            nodeB.connectedNodes.push(nodeA.id)
          }
        }
      }
    }

    return edges
  }

  private canConnect(nodeA: NavMeshNode, nodeB: NavMeshNode): boolean {
    // Basic connectivity rules
    if (!nodeA.walkable || !nodeB.walkable) return false

    // Don't connect nodes with vastly different safety levels
    const safetyLevels = ['safe', 'caution', 'risky', 'dangerous', 'avoid']
    const levelA = safetyLevels.indexOf(nodeA.safetyLevel)
    const levelB = safetyLevels.indexOf(nodeB.safetyLevel)

    if (Math.abs(levelA - levelB) > 2) return false

    // Don't connect if either node is hazardous
    if (nodeA.specialProperties.includes('hazardous') ||
        nodeB.specialProperties.includes('hazardous')) {
      return false
    }

    return true
  }

  private createEdge(nodeA: NavMeshNode, nodeB: NavMeshNode, distance: number): NavMeshEdge | null {
    const baseCost = distance
    const avgNodeCost = (nodeA.cost + nodeB.cost) / 2
    const totalCost = baseCost * avgNodeCost

    const restrictions: string[] = []
    const specialProps = [...nodeA.specialProperties, ...nodeB.specialProperties]

    if (specialProps.includes('slippery')) restrictions.push('careful_movement')
    if (specialProps.includes('requires_caution')) restrictions.push('slow_movement')
    if (specialProps.includes('high_transparency')) restrictions.push('visual_confirmation')

    // Determine safety requirement for this edge
    const safetyLevels = [nodeA.safetyLevel, nodeB.safetyLevel]
    const highestRiskLevel = safetyLevels.includes('dangerous') ? 'dangerous' :
                           safetyLevels.includes('risky') ? 'risky' :
                           safetyLevels.includes('caution') ? 'caution' : 'safe'

    return {
      from: nodeA.id,
      to: nodeB.id,
      cost: totalCost,
      bidirectional: true,
      restrictions,
      safetyRequirement: highestRiskLevel
    }
  }

  private addAlternativePathNodes(navMesh: NavMesh, floors: FrostedGlassFloor[]): void {
    floors.forEach(floor => {
      const aiProps = FloorNavigationAnalyzer.analyzeFloorForAI(floor)

      if (aiProps.alternativePathWeight > 0.5) {
        // Create alternative path nodes around risky floors
        const altNodes = this.generateAlternativePathNodes(floor, aiProps)
        altNodes.forEach(node => {
          navMesh.nodes.set(node.id, node)
        })

        // Connect alternative nodes to the main mesh
        this.connectAlternativeNodes(navMesh, altNodes)
      }
    })
  }

  private generateAlternativePathNodes(floor: FrostedGlassFloor, aiProps: AINavigationProperties): NavMeshNode[] {
    const altNodes: NavMeshNode[] = []
    const floorPos = floor.position
    const safeDistance = 2.0 // Distance to maintain from risky floor

    // Create nodes in a circle around the risky floor
    const nodeCount = 8
    for (let i = 0; i < nodeCount; i++) {
      const angle = (i / nodeCount) * Math.PI * 2
      const x = floorPos.x + Math.cos(angle) * safeDistance
      const z = floorPos.z + Math.sin(angle) * safeDistance

      const altNode: NavMeshNode = {
        id: `alt_path_${floor.id}_${i}_${this.nodeCounter++}`,
        position: new THREE.Vector3(x, floorPos.y, z),
        walkable: true,
        cost: 1.0, // Standard cost for alternative paths
        safetyLevel: 'safe',
        connectedNodes: [],
        specialProperties: ['alternative_path', 'avoids_risk']
      }

      altNodes.push(altNode)
    }

    return altNodes
  }

  private connectAlternativeNodes(navMesh: NavMesh, altNodes: NavMeshNode[]): void {
    // Connect alternative nodes to each other
    for (let i = 0; i < altNodes.length; i++) {
      const nodeA = altNodes[i]
      const nodeB = altNodes[(i + 1) % altNodes.length] // Connect in a ring

      const edge: NavMeshEdge = {
        from: nodeA.id,
        to: nodeB.id,
        cost: nodeA.position.distanceTo(nodeB.position),
        bidirectional: true,
        restrictions: [],
        safetyRequirement: 'safe'
      }

      navMesh.edges.push(edge)
      nodeA.connectedNodes.push(nodeB.id)
      nodeB.connectedNodes.push(nodeA.id)
    }

    // Connect alternative nodes to safe main mesh nodes
    const safeMainNodes = Array.from(navMesh.nodes.values()).filter(
      node => !altNodes.includes(node) &&
               node.safetyLevel === 'safe' &&
               node.walkable
    )

    altNodes.forEach(altNode => {
      // Find nearby safe main nodes
      const nearbyNodes = safeMainNodes.filter(mainNode =>
        altNode.position.distanceTo(mainNode.position) <= 3.0
      )

      nearbyNodes.slice(0, 2).forEach(mainNode => { // Connect to up to 2 nearby nodes
        const edge: NavMeshEdge = {
          from: altNode.id,
          to: mainNode.id,
          cost: altNode.position.distanceTo(mainNode.position) * 1.1, // Slight penalty
          bidirectional: true,
          restrictions: [],
          safetyRequirement: 'safe'
        }

        navMesh.edges.push(edge)
        altNode.connectedNodes.push(mainNode.id)
        mainNode.connectedNodes.push(altNode.id)
      })
    })
  }

  private optimizeNavMesh(navMesh: NavMesh): void {
    // Remove redundant nodes
    this.removeRedundantNodes(navMesh)

    // Optimize edge connections
    this.optimizeEdgeConnections(navMesh)

    // Create spatial index for faster pathfinding
    this.createSpatialIndex(navMesh)
  }

  private removeRedundantNodes(navMesh: NavMesh): void {
    const nodesToRemove: string[] = []
    const nodes = Array.from(navMesh.nodes.values())
    const proximityThreshold = this.gridResolution * 0.3

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i]
        const nodeB = nodes[j]

        if (nodeA.position.distanceTo(nodeB.position) < proximityThreshold &&
            nodeA.safetyLevel === nodeB.safetyLevel &&
            nodeA.cost === nodeB.cost) {

          // Merge nodes - keep the one with more connections
          const nodeToKeep = nodeA.connectedNodes.length >= nodeB.connectedNodes.length ? nodeA : nodeB
          const nodeToRemove = nodeToKeep === nodeA ? nodeB : nodeA

          // Transfer connections
          nodeToRemove.connectedNodes.forEach(connectedId => {
            if (!nodeToKeep.connectedNodes.includes(connectedId)) {
              nodeToKeep.connectedNodes.push(connectedId)
            }
          })

          nodesToRemove.push(nodeToRemove.id)
        }
      }
    }

    // Remove redundant nodes
    nodesToRemove.forEach(nodeId => {
      navMesh.nodes.delete(nodeId)
      navMesh.floorAssociations.delete(nodeId)

      // Update edges
      navMesh.edges = navMesh.edges.filter(edge =>
        edge.from !== nodeId && edge.to !== nodeId
      )
    })
  }

  private optimizeEdgeConnections(navMesh: NavMesh): void {
    // Remove duplicate edges
    const uniqueEdges = new Map<string, NavMeshEdge>()

    navMesh.edges.forEach(edge => {
      const key1 = `${edge.from}_${edge.to}`
      const key2 = `${edge.to}_${edge.from}`

      if (!uniqueEdges.has(key1) && !uniqueEdges.has(key2)) {
        uniqueEdges.set(key1, edge)
      }
    })

    navMesh.edges = Array.from(uniqueEdges.values())
  }

  private createSpatialIndex(navMesh: NavMesh): void {
    // This would create a spatial partitioning structure for fast node lookup
    // Implementation would depend on the specific spatial indexing approach chosen
    // (Quadtree, Octree, Grid-based, etc.)
  }

  updateNavMeshForFloor(navMesh: NavMesh, floor: FrostedGlassFloor): void {
    // Remove existing nodes for this floor
    const existingNodes = Array.from(navMesh.nodes.entries())
      .filter(([nodeId, node]) => node.floorId === floor.id)
      .map(([nodeId, node]) => nodeId)

    existingNodes.forEach(nodeId => {
      navMesh.nodes.delete(nodeId)
      navMesh.floorAssociations.delete(nodeId)
    })

    // Remove edges involving these nodes
    navMesh.edges = navMesh.edges.filter(edge =>
      !existingNodes.includes(edge.from) && !existingNodes.includes(edge.to)
    )

    // Generate new nodes for the updated floor
    const newNodes = this.generateNodesForFloor(floor)
    newNodes.forEach(node => {
      navMesh.nodes.set(node.id, node)
      navMesh.floorAssociations.set(node.id, floor.id)
    })

    // Reconnect to the existing mesh
    const allNodes = Array.from(navMesh.nodes.values())
    const newEdges = this.generateEdges(allNodes)

    // Add new edges
    navMesh.edges.push(...newEdges.filter(edge =>
      newNodes.some(node => node.id === edge.from || node.id === edge.to)
    ))

    navMesh.lastUpdate = Date.now()
    navMesh.version++
  }
}

interface NavMesh {
  nodes: Map<string, NavMeshNode>
  edges: NavMeshEdge[]
  floorAssociations: Map<string, string> // nodeId -> floorId
  lastUpdate: number
  version: number
}
