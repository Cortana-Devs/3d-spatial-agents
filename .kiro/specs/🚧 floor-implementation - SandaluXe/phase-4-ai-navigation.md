# Phase 4: AI Navigation Integration

## OBJECTIVE
Integrate the frosted glass floor system with AI simulant navigation, pathfinding, and behavior systems. Ensure AI agents can properly perceive, evaluate, and navigate transparent surfaces while maintaining realistic behavior patterns and safety considerations.

## DELIVERABLES
- AI-aware floor navigation properties
- Transparent surface pathfinding algorithms
- AI perception system for glass floors
- Safety assessment and risk evaluation
- Dynamic navigation mesh generation
- AI behavior adaptation for transparent surfaces

## IMPLEMENTATION TASKS

### Task 4.1: AI Navigation Properties System
**File**: `ai/FloorNavigationProperties.tsx`

```typescript
import * as THREE from 'three'
import { FrostedGlassFloor } from '../types/floorTypes'

export interface AINavigationProperties {
  walkable: boolean
  slippery: boolean
  safetyLevel: SafetyLevel
  visibilityFactor: number // 0-1, how well AI can see through
  soundTransmission: number // 0-1, how much sound passes through
  structuralConfidence: number // 0-1, AI's confidence in structural integrity
  navigationCost: number // pathfinding cost multiplier
  requiresSpecialBehavior: boolean
  alternativePathWeight: number
}

export type SafetyLevel = 'safe' | 'caution' | 'risky' | 'dangerous' | 'avoid'

export interface AIPerceptionData {
  canSeeThrough: boolean
  canWalkOn: boolean
  understandsTransparency: boolean
  distancePerceptionAccuracy: number
  depthPerceptionReliability: number
  surfaceRecognitionConfidence: number
}

export class FloorNavigationAnalyzer {
  static analyzeFloorForAI(floor: FrostedGlassFloor): AINavigationProperties {
    const transparency = floor.transparency
    const roughness = floor.roughness
    const thickness = floor.renderQuality?.thickness || 0.1
    const glassTy pe = floor.glassType

    return {
      walkable: this.determineWalkability(floor),
      slippery: this.assessSlipperiness(roughness, transparency),
      safetyLevel: this.calculateSafetyLevel(floor),
      visibilityFactor: this.calculateVisibilityFactor(transparency, roughness),
      soundTransmission: this.calculateSoundTransmission(thickness, transparency),
      structuralConfidence: this.assessStructuralConfidence(floor),
      navigationCost: this.calculateNavigationCost(floor),
      requiresSpecialBehavior: this.requiresSpecialBehavior(floor),
      alternativePathWeight: this.calculateAlternativePathWeight(floor)
    }
  }

  private static determineWalkability(floor: FrostedGlassFloor): boolean {
    // Check structural integrity, thickness, and material properties
    const thickness = floor.renderQuality?.thickness || 0.1
    const durability = floor.metadata.durability
    
    return thickness >= 0.08 && durability > 50 && floor.metadata.walkable
  }

  private static assessSlipperiness(roughness: number, transparency: number): boolean {
    // Smooth, transparent surfaces are more slippery
    const slipperinessFactor = (1 - roughness) * (transparency * 0.7)
    return slipperinessFactor > 0.4
  }

  private static calculateSafetyLevel(floor: FrostedGlassFloor): SafetyLevel {
    const thickness = floor.renderQuality?.thickness || 0.1
    const durability = floor.metadata.durability
    const transparency = floor.transparency
    
    let safetyScore = 1.0
    
    // Penalize thin glass
    if (thickness < 0.1) safetyScore -= 0.3
    if (thickness < 0.05) safetyScore -= 0.4
    
    // Penalize damaged glass
    if (durability < 80) safetyScore -= 0.2
    if (durability < 50) safetyScore -= 0.4
    
    // Penalize highly transparent glass (harder to see)
    if (transparency > 0.8) safetyScore -= 0.2
    if (transparency > 0.9) safetyScore -= 0.3
    
    if (safetyScore >= 0.8) return 'safe'
    if (safetyScore >= 0.6) return 'caution'
    if (safetyScore >= 0.4) return 'risky'
    if (safetyScore >= 0.2) return 'dangerous'
    return 'avoid'
  }

  private static calculateVisibilityFactor(transparency: number, roughness: number): number {
    // High transparency + low roughness = high visibility through
    // High roughness reduces visibility due to frosting
    const frostingEffect = Math.min(roughness * 1.5, 1.0)
    return transparency * (1 - frostingEffect * 0.7)
  }

  private static calculateSoundTransmission(thickness: number, transparency: number): number {
    // Thinner and more transparent glass transmits more sound
    const thicknessFactor = Math.max(0.1, 1 - thickness * 8) // Inverse relationship
    const transparencyFactor = transparency * 0.8
    return Math.min(1.0, thicknessFactor + transparencyFactor)
  }

  private static assessStructuralConfidence(floor: FrostedGlassFloor): number {
    const thickness = floor.renderQuality?.thickness || 0.1
    const durability = floor.metadata.durability
    const glassType = floor.glassType
    
    let confidence = durability / 100
    
    // Adjust based on thickness
    if (thickness >= 0.15) confidence += 0.2
    else if (thickness < 0.08) confidence -= 0.3
    
    // Adjust based on glass type (some types perceived as stronger)
    const typeModifiers = {
      'clear_frosted': 0.1,
      'light_frosted': 0.05,
      'medium_frosted': 0.0,
      'heavy_frosted': -0.05
    }
    
    confidence += typeModifiers[glassType] || 0
    
    return Math.max(0, Math.min(1, confidence))
  }

  private static calculateNavigationCost(floor: FrostedGlassFloor): number {
    const props = this.analyzeFloorForAI(floor)
    let cost = 1.0 // Base cost
    
    // Increase cost for unsafe surfaces
    const safetyMultipliers = {
      'safe': 1.0,
      'caution': 1.2,
      'risky': 1.8,
      'dangerous': 3.0,
      'avoid': 10.0
    }
    
    cost *= safetyMultipliers[props.safetyLevel]
    
    // Add cost for slippery surfaces
    if (props.slippery) cost *= 1.3
    
    // Add cost for low structural confidence
    cost *= (1 + (1 - props.structuralConfidence) * 0.5)
    
    return cost
  }

  private static requiresSpecialBehavior(floor: FrostedGlassFloor): boolean {
    const transparency = floor.transparency
    const safetyLevel = this.calculateSafetyLevel(floor)
    
    return (
      transparency > 0.7 || // High transparency needs careful movement
      safetyLevel === 'risky' || 
      safetyLevel === 'dangerous' ||
      floor.glassType === 'clear_frosted' // Clear glass needs extra attention
    )
  }

  private static calculateAlternativePathWeight(floor: FrostedGlassFloor): number {
    const safetyLevel = this.calculateSafetyLevel(floor)
    const transparency = floor.transparency
    
    // Higher weight means AI will prefer alternative paths
    let weight = 0.1 // Base preference for alternatives
    
    if (safetyLevel === 'risky') weight += 0.3
    if (safetyLevel === 'dangerous') weight += 0.6
    if (safetyLevel === 'avoid') weight += 1.0
    
    if (transparency > 0.8) weight += 0.2
    
    return Math.min(1.0, weight)
  }
}
```

### Task 4.2: AI Perception System for Transparent Surfaces
**File**: `ai/TransparentSurfacePerception.tsx`

```typescript
import * as THREE from 'three'
import { FrostedGlassFloor } from '../types/floorTypes'
import { AINavigationProperties, FloorNavigationAnalyzer } from './FloorNavigationProperties'

export interface AIVisualCue {
  type: 'reflection' | 'refraction' | 'edge_detection' | 'shadow' | 'lighting'
  strength: number // 0-1
  position: THREE.Vector3
  reliability: number // 0-1, how reliable this cue is
  description: string
}

export interface PerceptionContext {
  lightingConditions: 'bright' | 'medium' | 'dim' | 'dark'
  viewingAngle: number // degrees from perpendicular
  observerDistance: number
  environmentalFactors: string[]
  previousExperience: boolean // Has AI encountered this floor before
}

export class TransparentSurfacePerception {
  private knownSurfaces: Map<string, AINavigationProperties> = new Map()
  private experienceMemory: Map<string, PerceptionExperience> = new Map()

  analyzeVisualCues(
    floor: FrostedGlassFloor, 
    observer: THREE.Vector3,
    context: PerceptionContext
  ): AIVisualCue[] {
    const cues: AIVisualCue[] = []
    const floorPosition = floor.position
    const distance = observer.distanceTo(floorPosition)
    
    // Edge detection cues
    const edgeCue = this.detectFloorEdges(floor, observer, context)
    if (edgeCue) cues.push(edgeCue)
    
    // Reflection cues
    const reflectionCue = this.analyzeReflections(floor, observer, context)
    if (reflectionCue) cues.push(reflectionCue)
    
    // Refraction cues (objects behind/below the glass)
    const refractionCues = this.analyzeRefraction(floor, observer, context)
    cues.push(...refractionCues)
    
    // Shadow cues
    const shadowCue = this.analyzeShadows(floor, observer, context)
    if (shadowCue) cues.push(shadowCue)
    
    // Lighting interaction cues
    const lightingCues = this.analyzeLightingInteraction(floor, observer, context)
    cues.push(...lightingCues)
    
    return this.filterAndRankCues(cues, context)
  }

  private detectFloorEdges(
    floor: FrostedGlassFloor,
    observer: THREE.Vector3,
    context: PerceptionContext
  ): AIVisualCue | null {
    const distance = observer.distanceTo(floor.position)
    const viewingAngle = context.viewingAngle
    
    // Edge detection is more reliable at shallow angles and closer distances
    let strength = 0.8
    let reliability = 0.9
    
    // Adjust based on distance
    if (distance > 10) {
      strength *= Math.max(0.2, 1 - (distance - 10) / 20)
      reliability *= Math.max(0.3, 1 - (distance - 10) / 30)
    }
    
    // Adjust based on viewing angle
    if (viewingAngle > 45) {
      strength *= Math.max(0.4, 1 - (viewingAngle - 45) / 45)
    }
    
    // Lighting affects edge visibility
    const lightingMultipliers = {
      'bright': 1.0,
      'medium': 0.8,
      'dim': 0.5,
      'dark': 0.2
    }
    strength *= lightingMultipliers[context.lightingConditions]
    reliability *= lightingMultipliers[context.lightingConditions]
    
    if (strength < 0.1) return null
    
    return {
      type: 'edge_detection',
      strength,
      position: floor.position.clone(),
      reliability,
      description: `Floor edges ${reliability > 0.7 ? 'clearly' : 'faintly'} visible from current position`
    }
  }

  private analyzeReflections(
    floor: FrostedGlassFloor,
    observer: THREE.Vector3,
    context: PerceptionContext
  ): AIVisualCue | null {
    const roughness = floor.roughness
    const transparency = floor.transparency
    
    // Smooth, less transparent surfaces create stronger reflections
    let strength = (1 - roughness) * (1 - transparency * 0.5)
    let reliability = 0.6
    
    // Reflections are more visible in good lighting
    if (context.lightingConditions === 'bright') {
      strength *= 1.2
      reliability *= 1.1
    } else if (context.lightingConditions === 'dim' || context.lightingConditions === 'dark') {
      strength *= 0.4
      reliability *= 0.5
    }
    
    // Viewing angle affects reflection visibility
    if (context.viewingAngle < 30) {
      strength *= 1.3 // Better reflection at shallow angles
    } else if (context.viewingAngle > 60) {
      strength *= 0.6
    }
    
    if (strength < 0.2) return null
    
    return {
      type: 'reflection',
      strength: Math.min(1, strength),
      position: floor.position.clone(),
      reliability: Math.min(1, reliability),
      description: `${strength > 0.6 ? 'Strong' : 'Weak'} reflections visible on surface`
    }
  }

  private analyzeRefraction(
    floor: FrostedGlassFloor,
    observer: THREE.Vector3,
    context: PerceptionContext
  ): AIVisualCue[] {
    const cues: AIVisualCue[] = []
    const transparency = floor.transparency
    const roughness = floor.roughness
    
    // Can only see refraction if surface is somewhat transparent
    if (transparency < 0.3) return cues
    
    // Simulate seeing objects below/behind the glass
    const refractionStrength = transparency * (1 - roughness * 0.6)
    
    if (refractionStrength > 0.2) {
      cues.push({
        type: 'refraction',
        strength: refractionStrength,
        position: new THREE.Vector3(floor.position.x, floor.position.y - 0.5, floor.position.z),
        reliability: 0.7 * refractionStrength,
        description: `Objects visible through transparent surface with ${Math.round(refractionStrength * 100)}% clarity`
      })
    }
    
    return cues
  }

  private analyzeShadows(
    floor: FrostedGlassFloor,
    observer: THREE.Vector3,
    context: PerceptionContext
  ): AIVisualCue | null {
    // Transparent surfaces cast subtle shadows
    const transparency = floor.transparency
    const shadowStrength = (1 - transparency) * 0.6
    
    if (shadowStrength < 0.1) return null
    
    return {
      type: 'shadow',
      strength: shadowStrength,
      position: new THREE.Vector3(floor.position.x, floor.position.y - 0.05, floor.position.z + 0.5),
      reliability: 0.8,
      description: `Subtle shadow cast by transparent surface`
    }
  }

  private analyzeLightingInteraction(
    floor: FrostedGlassFloor,
    observer: THREE.Vector3,
    context: PerceptionContext
  ): AIVisualCue[] {
    const cues: AIVisualCue[] = []
    const transparency = floor.transparency
    
    // Caustic patterns from light interaction
    if (transparency > 0.5 && context.lightingConditions === 'bright') {
      cues.push({
        type: 'lighting',
        strength: transparency * 0.8,
        position: new THREE.Vector3(floor.position.x, floor.position.y - 0.1, floor.position.z),
        reliability: 0.6,
        description: 'Caustic light patterns indicate transparent surface above'
      })
    }
    
    // Light refraction creating visual distortions
    if (transparency > 0.4) {
      cues.push({
        type: 'lighting',
        strength: transparency * 0.5,
        position: floor.position.clone(),
        reliability: 0.4,
        description: 'Light refraction creating visual distortions'
      })
    }
    
    return cues
  }

  private filterAndRankCues(cues: AIVisualCue[], context: PerceptionContext): AIVisualCue[] {
    // Filter out weak or unreliable cues
    let filtered = cues.filter(cue => 
      cue.strength > 0.1 && 
      cue.reliability > 0.2
    )
    
    // Boost cue reliability based on experience
    if (context.previousExperience) {
      filtered = filtered.map(cue => ({
        ...cue,
        reliability: Math.min(1, cue.reliability * 1.3)
      }))
    }
    
    // Sort by combined strength and reliability score
    filtered.sort((a, b) => {
      const scoreA = a.strength * a.reliability
      const scoreB = b.strength * b.reliability
      return scoreB - scoreA
    })
    
    // Return top 5 most significant cues
    return filtered.slice(0, 5)
  }

  assessSurfaceRecognition(floor: FrostedGlassFloor, cues: AIVisualCue[]): number {
    if (cues.length === 0) return 0.1
    
    // Calculate overall recognition confidence
    const totalScore = cues.reduce((sum, cue) => sum + (cue.strength * cue.reliability), 0)
    const averageScore = totalScore / cues.length
    
    // Bonus for multiple types of cues
    const cueTypes = new Set(cues.map(cue => cue.type))
    const diversityBonus = Math.min(0.2, cueTypes.size * 0.05)
    
    return Math.min(1, averageScore + diversityBonus)
  }

  updateExperience(floorId: string, navigationResult: 'success' | 'failure' | 'avoided'): void {
    const existing = this.experienceMemory.get(floorId)
    
    if (existing) {
      existing.encounters++
      if (navigationResult === 'success') existing.successes++
      if (navigationResult === 'failure') existing.failures++
      existing.lastEncounter = Date.now()
    } else {
      this.experienceMemory.set(floorId, {
        encounters: 1,
        successes: navigationResult === 'success' ? 1 : 0,
        failures: navigationResult === 'failure' ? 1 : 0,
        avoided: navigationResult === 'avoided' ? 1 : 0,
        lastEncounter: Date.now(),
        reliabilityAdjustment: 0
      })
    }
    
    // Update reliability adjustment based on experience
    const experience = this.experienceMemory.get(floorId)!
    if (experience.encounters >= 3) {
      const successRate = experience.successes / experience.encounters
      experience.reliabilityAdjustment = (successRate - 0.5) * 0.4 // -0.2 to +0.2
    }
  }
}

interface PerceptionExperience {
  encounters: number
  successes: number
  failures: number
  avoided: number
  lastEncounter: number
  reliabilityAdjustment: number
}
```

### Task 4.3: Dynamic Navigation Mesh Generation
**File**: `ai/TransparentNavMeshGenerator.tsx`

```typescript
import * as THREE from 'three'
import { FrostedGlassFloor } from '../types/floorTypes'
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
```

### Task 4.4: AI Pathfinding for Transparent Surfaces
**File**: `ai/TransparentPathfinder.tsx`

```typescript
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
```

## TESTING REQUIREMENTS

### Task 4.5: AI Navigation Testing Suite
**File**: `__tests__/AINavigationIntegration.test.ts`

```typescript
import { FloorNavigationAnalyzer } from '../ai/FloorNavigationProperties'
import { TransparentSurfacePerception } from '../ai/TransparentSurfacePerception'
import { TransparentNavMeshGenerator } from '../ai/TransparentNavMeshGenerator'
import { TransparentPathfinder } from '../ai/TransparentPathfinder'
import { FloorFactory } from '../utils/floorFactory'
import * as THREE from 'three'

describe('AI Navigation Integration', () => {
  describe('Floor Navigation Properties', () => {
    test('analyzes floor safety correctly', () => {
      const safeFloor = FloorFactory.createFrostedGlassFloor(
        new THREE.Vector3(0, 0, 0),
        'medium_frosted'
      )
      safeFloor.transparency = 0.4
      safeFloor.roughness = 0.6

      const analysis = FloorNavigationAnalyzer.analyzeFloorForAI(safeFloor)
      
      expect(analysis.walkable).toBe(true)
      expect(analysis.safetyLevel).toBe('safe')
      expect(analysis.navigationCost).toBeGreaterThan(0)
    })

    test('identifies dangerous floors', () => {
      const dangerousFloor = FloorFactory.createFrostedGlassFloor(
        new THREE.Vector3(0, 0, 0),
        'clear_frosted'
      )
      dangerousFloor.transparency = 0.95 // Very transparent
      dangerousFloor.metadata.durability = 20 // Low durability

      const analysis = FloorNavigationAnalyzer.analyzeFloorForAI(dangerousFloor)
      
      expect(analysis.safetyLevel).toMatch(/risky|dangerous|avoid/)
      expect(analysis.navigationCost).toBeGreaterThan(2.0)
    })
  })

  describe('Transparent Surface Perception', () => {
    test('generates visual cues based on floor properties', () => {
      const perception = new TransparentSurfacePerception()
      
      const floor = FloorFactory.createFrostedGlassFloor(
        new THREE.Vector3(0, 0, 0),
        'clear_frosted'
      )
      
      const observer = new THREE.Vector3(3, 1, 3)
      const context = {
        lightingConditions: 'bright' as const,
        viewingAngle: 30,
        observerDistance: 4.24,
        environmentalFactors: [],
        previousExperience: false
      }

      const cues = perception.analyzeVisualCues(floor, observer, context)
      
      expect(cues.length).toBeGreaterThan(0)
      expect(cues.every(cue => cue.strength >= 0 && cue.strength <= 1)).toBe(true)
      expect(cues.every(cue => cue.reliability >= 0 && cue.reliability <= 1)).toBe(true)
    })

    test('adjusts perception based on experience', () => {
      const perception = new TransparentSurfacePerception()
      const floorId = 'test-floor-123'

      // Simulate successful navigation
      perception.updateExperience(floorId, 'success')
      perception.updateExperience(floorId, 'success')
      perception.updateExperience(floorId, 'success')

      // Experience should improve perception reliability
      const floor = FloorFactory.createFrostedGlassFloor(
        new THREE.Vector3(0, 0, 0),
        'medium_frosted'
      )
      
      const contextWithExperience = {
        lightingConditions: 'medium' as const,
        viewingAngle: 45,
        observerDistance: 2,
        environmentalFactors: [],
        previousExperience: true
      }

      const cues = perception.analyzeVisualCues(floor, new THREE.Vector3(2, 1, 0), contextWithExperience)
      const avgReliability = cues.reduce((sum, cue) => sum + cue.reliability, 0) / cues.length
      
      expect(avgReliability).toBeGreaterThan(0.5)
    })
  })

  describe('Navigation Mesh Generation', () => {
    test('generates navigation mesh for floors', () => {
      const generator = new TransparentNavMeshGenerator()
      
      const floors = [
        FloorFactory.createFrostedGlassFloor(new THREE.Vector3(0, 0, 0), 'medium_frosted'),
        FloorFactory.createFrostedGlassFloor(new THREE.Vector3(2, 0, 0), 'light_frosted'),
        FloorFactory.createFrostedGlassFloor(new THREE.Vector3(4, 0, 0), 'heavy_frosted')
      ]

      const worldBounds = new THREE.Box3(
        new THREE.Vector3(-10, -1, -10),
        new THREE.Vector3(10, 1, 10)
      )

      const navMesh = generator.generateNavMesh(floors, worldBounds)
      
      expect(navMesh.nodes.size).toBeGreaterThan(0)
      expect(navMesh.edges.length).toBeGreaterThan(0)
      expect(navMesh.floorAssociations.size).toBeGreaterThan(0)
    })

    test('creates alternative paths for risky floors', () => {
      const generator = new TransparentNavMeshGenerator()
      
      const riskyFloor = FloorFactory.createFrostedGlassFloor(
        new THREE.Vector3(0, 0, 0),
        'clear_frosted'
      )
      riskyFloor.transparency = 0.9
      riskyFloor.metadata.durability = 30

      const navMesh = generator.generateNavMesh([riskyFloor], new THREE.Box3(
        new THREE.Vector3(-5, -1, -5),
        new THREE.Vector3(5, 1, 5)
      ))

      const alternativeNodes = Array.from(navMesh.nodes.values())
        .filter(node => node.specialProperties.includes('alternative_path'))
      
      expect(alternativeNodes.length).toBeGreaterThan(0)
    })
  })

  describe('Pathfinding', () => {
    test('finds safe paths when available', () => {
      // Create a simple test scenario
      const navNodes = new Map()
      const safeNode1 = {
        id: 'safe1',
        position: new THREE.Vector3(0, 0, 0),
        walkable: true,
        cost: 1.0,
        safetyLevel: 'safe',
        connectedNodes: ['safe2'],
        specialProperties: []
      }
      const safeNode2 = {
        id: 'safe2', 
        position