import * as THREE from 'three'
import { FrostedGlassFloor } from '../../../types/floorTypes'

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
    const thickness = 0.1 // Default thickness since renderQuality isn't in the type
    const glassType = floor.glassType

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
    const thickness = 0.1 // Default value
    const durability = floor.metadata.durability

    return thickness >= 0.08 && durability > 50 && floor.metadata.walkable
  }

  private static assessSlipperiness(roughness: number, transparency: number): boolean {
    // Smooth, transparent surfaces are more slippery
    const slipperinessFactor = (1 - roughness) * (transparency * 0.7)
    return slipperinessFactor > 0.4
  }

  private static calculateSafetyLevel(floor: FrostedGlassFloor): SafetyLevel {
    const thickness = 0.1 // Default value
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
    const thickness = 0.1 // Default value
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
    const safetyLevel = this.calculateSafetyLevel(floor)
    const slippery = this.assessSlipperiness(floor.roughness, floor.transparency)
    const structuralConfidence = this.assessStructuralConfidence(floor)

    let cost = 1.0 // Base cost

    // Increase cost for unsafe surfaces
    const safetyMultipliers = {
      'safe': 1.0,
      'caution': 1.2,
      'risky': 1.8,
      'dangerous': 3.0,
      'avoid': 10.0
    }

    cost *= safetyMultipliers[safetyLevel]

    // Add cost for slippery surfaces
    if (slippery) cost *= 1.3

    // Add cost for low structural confidence
    cost *= (1 + (1 - structuralConfidence) * 0.5)

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
