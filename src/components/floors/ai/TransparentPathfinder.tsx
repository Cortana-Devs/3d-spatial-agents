import * as THREE from 'three'
import { NavMeshNode, NavMeshEdge } from './TransparentNavMeshGenerator'
import { AINavigationProperties } from './FloorNavigationProperties'

export interface PathfindingOptions {
  maxCost: number
  safetyPreference: 'safety_first' | 'balanced' | 'efficiency_first'
  avoidTransparent: boolean
  allowRiskyPaths: boolean
  preferAlternatives: boolean
  maxPathLength: number
}

export interface PathNode {
  nodeId: string
  position: THREE.Vector3
  gCost: number // Distance from start
  hCost: number // Heuristic distance to goal
  fCost: number // Total cost (gCost + hCost)
  parent: PathNode | null
  safetyLevel: string
  specialInstructions: string[]
}

export interface PathResult {
  path: PathNode[]
  totalCost: number
  estimatedTravelTime: number
  safetyAssessment: string
  warnings: string[]
  alternativePaths: PathNode[][]
}

export class TransparentPathfinder {
  private navMesh: Map<string, NavMeshNode>
  private edges: NavMeshEdge[]
  private heuristicCache: Map<string, number> = new Map()

  constructor(navMesh: Map<string, NavMeshNode>, edges: NavMeshEdge[]) {
    this.navMesh = navMesh
    this.edges = edges
  }

  findPath(
    startPosition: THREE.Vector3,
    goalPosition: THREE.Vector3,
    options: PathfindingOptions = this.getDefaultOptions()
  ): PathResult {
    // Find nearest nodes to start and goal positions
    const startNode = this.findNearestWalkableNode(startPosition, options)
    const goalNode = this.findNearestWalkableNode(goalPosition, options)

    if (!startNode || !goalNode) {
      return this.createEmptyPathResult('No walkable nodes found near start or goal')
    }

    // Run A* pathfinding with transparency considerations
    const mainPath = this.aStar(startNode, goalNode, options)

    if (!mainPath) {
      return this.createEmptyPathResult('No path found')
    }

    // Generate alternative paths for risky sections
    const alternativePaths = this.generateAlternativePaths(startNode, goalNode, mainPath, options)

    // Assess path safety and generate warnings
    const safetyAssessment = this.assessPathSafety(mainPath)
    const warnings = this.generatePathWarnings(mainPath, options)

    return {
      path: mainPath,
      totalCost: mainPath[mainPath.length - 1].fCost,
      estimatedTravelTime: this.estimateTravelTime(mainPath),
      safetyAssessment,
      warnings,
      alternativePaths
    }
  }

  private getDefaultOptions(): PathfindingOptions {
    return {
      maxCost: 1000,
      safetyPreference: 'balanced',
      avoidTransparent: false,
      allowRiskyPaths: true,
      preferAlternatives: false,
      maxPathLength: 100
    }
  }

  private findNearestWalkableNode(position: THREE.Vector3, options: PathfindingOptions): NavMeshNode | null {
    let nearestNode: NavMeshNode | null = null
    let nearestDistance = Infinity

    for (const node of this.navMesh.values()) {
      if (!node.walkable) continue

      // Apply safety filtering based on options
      if (options.safetyPreference === 'safety_first' &&
          (node.safetyLevel === 'risky' || node.safetyLevel === 'dangerous')) {
        continue
      }

      // Apply transparency filtering
      if (options.avoidTransparent && node.specialProperties.includes('high_transparency')) {
        continue
      }

      const distance = position.distanceTo(node.position)
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestNode = node
      }
    }

    return nearestNode
  }

  private aStar(startNode: NavMeshNode, goalNode: NavMeshNode, options: PathfindingOptions): PathNode[] | null {
    const openSet = new Map<string, PathNode>()
    const closedSet = new Set<string>()

    const startPathNode: PathNode = {
      nodeId: startNode.id,
      position: startNode.position.clone(),
      gCost: 0,
      hCost: this.calculateHeuristic(startNode, goalNode),
      fCost: 0,
      parent: null,
      safetyLevel: startNode.safetyLevel,
      specialInstructions: []
    }
    startPathNode.fCost = startPathNode.gCost + startPathNode.hCost

    openSet.set(startNode.id, startPathNode)

    while (openSet.size > 0) {
      // Find node with lowest fCost
      const current = this.getLowestFCostNode(openSet)
      const currentNode = this.navMesh.get(current.nodeId)!

      openSet.delete(current.nodeId)
      closedSet.add(current.nodeId)

      // Check if we reached the goal
      if (current.nodeId === goalNode.id) {
        return this.reconstructPath(current)
      }

      // Check neighbors
      for (const neighborId of currentNode.connectedNodes) {
        if (closedSet.has(neighborId)) continue

        const neighborNode = this.navMesh.get(neighborId)
        if (!neighborNode || !neighborNode.walkable) continue

        // Apply pathfinding filters
        if (!this.isNodeAllowed(neighborNode, options)) continue

        const tentativeGCost = current.gCost + this.calculateMoveCost(current, neighborNode, options)

        const existingNeighbor = openSet.get(neighborId)
        if (existingNeighbor && tentativeGCost >= existingNeighbor.gCost) continue

        const neighborPathNode: PathNode = {
          nodeId: neighborId,
          position: neighborNode.position.clone(),
          gCost: tentativeGCost,
          hCost: this.calculateHeuristic(neighborNode, goalNode),
          fCost: 0,
          parent: current,
          safetyLevel: neighborNode.safetyLevel,
          specialInstructions: this.generateSpecialInstructions(neighborNode, current)
        }
        neighborPathNode.fCost = neighborPathNode.gCost + neighborPathNode.hCost

        openSet.set(neighborId, neighborPathNode)
      }

      // Prevent infinite loops
      if (closedSet.size > options.maxPathLength) {
        break
      }
    }

    return null // No path found
  }

  private isNodeAllowed(node: NavMeshNode, options: PathfindingOptions): boolean {
    // Safety preference filtering
    if (options.safetyPreference === 'safety_first') {
      if (node.safetyLevel === 'dangerous' || node.safetyLevel === 'avoid') return false
    }

    if (!options.allowRiskyPaths) {
      if (node.safetyLevel === 'risky' || node.safetyLevel === 'dangerous' || node.safetyLevel === 'avoid') {
        return false
      }
    }

    // Transparency filtering
    if (options.avoidTransparent && node.specialProperties.includes('high_transparency')) {
      return false
    }

    // Hazard filtering
    if (node.specialProperties.includes('hazardous') && options.safetyPreference === 'safety_first') {
      return false
    }

    return true
  }

  private calculateMoveCost(from: PathNode, toNode: NavMeshNode, options: PathfindingOptions): number {
    const distance = from.position.distanceTo(toNode.position)
    let cost = distance * toNode.cost

    // Apply safety preference modifiers
    const safetyMultipliers = {
      'safe': 1.0,
      'caution': options.safetyPreference === 'safety_first' ? 1.1 : 1.2,
      'risky': options.safetyPreference === 'safety_first' ? 2.0 : 1.5,
      'dangerous': options.safetyPreference === 'safety_first' ? 5.0 : 3.0,
      'avoid': 10.0
    }

    cost *= safetyMultipliers[toNode.safetyLevel as keyof typeof safetyMultipliers] || 1.0

    // Special property modifiers
    if (toNode.specialProperties.includes('slippery')) cost *= 1.2
    if (toNode.specialProperties.includes('requires_caution')) cost *= 1.3
    if (toNode.specialProperties.includes('high_transparency') && options.avoidTransparent) cost *= 2.0
    if (toNode.specialProperties.includes('structural_concern')) cost *= 1.4

    // Alternative path preference
    if (options.preferAlternatives && toNode.specialProperties.includes('alternative_path')) {
      cost *= 0.8 // Prefer alternative paths
    }

    return cost
  }

  private calculateHeuristic(fromNode: NavMeshNode, goalNode: NavMeshNode): number {
    const cacheKey = `${fromNode.id}_${goalNode.id}`

    if (this.heuristicCache.has(cacheKey)) {
      return this.heuristicCache.get(cacheKey)!
    }

    // Use Manhattan distance as base heuristic
    const distance = fromNode.position.distanceTo(goalNode.position)

    // Adjust heuristic based on safety considerations
    let heuristic = distance

    if (fromNode.safetyLevel === 'dangerous' || fromNode.safetyLevel === 'avoid') {
      heuristic *= 1.5
    }

    this.heuristicCache.set(cacheKey, heuristic)
    return heuristic
  }

  private getLowestFCostNode(openSet: Map<string, PathNode>): PathNode {
    let lowest: PathNode | null = null

    for (const node of openSet.values()) {
      if (!lowest || node.fCost < lowest.fCost ||
          (node.fCost === lowest.fCost && node.hCost < lowest.hCost)) {
        lowest = node
      }
    }

    return lowest!
  }

  private reconstructPath(goalNode: PathNode): PathNode[] {
    const path: PathNode[] = []
    let current: PathNode | null = goalNode

    while (current !== null) {
      path.unshift(current)
      current = current.parent
    }

    return path
  }

  private generateSpecialInstructions(node: NavMeshNode, fromNode: PathNode): string[] {
    const instructions: string[] = []

    if (node.specialProperties.includes('slippery')) {
      instructions.push('Move carefully - slippery surface')
    }

    if (node.specialProperties.includes('requires_caution')) {
      instructions.push('Exercise caution when crossing')
    }

    if (node.specialProperties.includes('high_transparency')) {
      instructions.push('Verify surface visibility before proceeding')
    }

    if (node.specialProperties.includes('structural_concern')) {
      instructions.push('Test surface stability before full weight')
    }

    if (node.safetyLevel === 'risky' || node.safetyLevel === 'dangerous') {
      instructions.push('High risk area - consider alternative route')
    }

    // Add movement instructions based on transition
    if (fromNode.safetyLevel === 'safe' &&
        (node.safetyLevel === 'risky' || node.safetyLevel === 'dangerous')) {
      instructions.push('Transitioning to higher risk area')
    }

    return instructions
  }

  private generateAlternativePaths(
    startNode: NavMeshNode,
    goalNode: NavMeshNode,
    mainPath: PathNode[],
    options: PathfindingOptions
  ): PathNode[][] {
    const alternatives: PathNode[][] = []

    // Find risky sections in main path
    const riskySections = this.identifyRiskySections(mainPath)

    if (riskySections.length === 0) return alternatives

    // Generate alternative paths that avoid risky sections
    const altOptions: PathfindingOptions = {
      ...options,
      safetyPreference: 'safety_first',
      preferAlternatives: true,
      avoidTransparent: true
    }

    const altPath = this.aStar(startNode, goalNode, altOptions)
    if (altPath && this.isPathDifferent(mainPath, altPath)) {
      alternatives.push(altPath)
    }

    return alternatives
  }

  private identifyRiskySections(path: PathNode[]): PathNode[] {
    return path.filter(node =>
      node.safetyLevel === 'risky' ||
      node.safetyLevel === 'dangerous' ||
      node.specialInstructions.length > 0
    )
  }

  private isPathDifferent(pathA: PathNode[], pathB: PathNode[]): boolean {
    if (pathA.length !== pathB.length) return true

    for (let i = 0; i < pathA.length; i++) {
      if (pathA[i].nodeId !== pathB[i].nodeId) return true
    }

    return false
  }

  private assessPathSafety(path: PathNode[]): string {
    const safetyLevels = path.map(node => node.safetyLevel)

    if (safetyLevels.includes('avoid') || safetyLevels.includes('dangerous')) {
      return 'HIGH RISK'
    }

    if (safetyLevels.includes('risky')) {
      return 'MODERATE RISK'
    }

    if (safetyLevels.includes('caution')) {
      return 'LOW RISK'
    }

    return 'SAFE'
  }

  private generatePathWarnings(path: PathNode[], options: PathfindingOptions): string[] {
    const warnings: string[] = []

    // Collect all special instructions
    const allInstructions = path.flatMap(node => node.specialInstructions)
    const uniqueInstructions = [...new Set(allInstructions)]
    warnings.push(...uniqueInstructions)

    // Add path-specific warnings
    const transparentNodes = path.filter(node =>
      this.navMesh.get(node.nodeId)?.specialProperties.includes('high_transparency')
    )

    if (transparentNodes.length > 0) {
      warnings.push(`Path crosses ${transparentNodes.length} highly transparent surface(s)`)
    }

    const riskyNodes = path.filter(node =>
      node.safetyLevel === 'risky' || node.safetyLevel === 'dangerous'
    )

    if (riskyNodes.length > 0) {
      warnings.push(`Path includes ${riskyNodes.length} high-risk area(s)`)
    }

    return warnings
  }

  private estimateTravelTime(path: PathNode[]): number {
    let totalTime = 0
    const baseSpeed = 1.5 // meters per second

    for (let i = 1; i < path.length; i++) {
      const distance = path[i - 1].position.distanceTo(path[i].position)
      let speed = baseSpeed

      // Adjust speed based on safety level
      const node = this.navMesh.get(path[i].nodeId)!
      if (node.specialProperties.includes('slippery')) speed *= 0.7
      if (node.specialProperties.includes('requires_caution')) speed *= 0.6
      if (node.safetyLevel === 'risky') speed *= 0.8
      if (node.safetyLevel === 'dangerous') speed *= 0.5

      totalTime += distance / speed
    }

    return totalTime
  }

  private createEmptyPathResult(reason: string): PathResult {
    return {
      path: [],
      totalCost: Infinity,
      estimatedTravelTime: 0,
      safetyAssessment: 'NO PATH',
      warnings: [reason],
      alternativePaths: []
    }
  }
}
