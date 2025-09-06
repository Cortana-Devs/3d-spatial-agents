import * as THREE from 'three'
import { FrostedGlassFloor } from '../../../types/floorTypes'
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
