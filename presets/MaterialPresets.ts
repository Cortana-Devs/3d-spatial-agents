import * as THREE from 'three'
import { MaterialPreset } from '../types/materialTypes'

export const MATERIAL_PRESETS: Record<string, MaterialPreset> = {
  showroom_glass: {
    name: 'Showroom Glass',
    description: 'High-end clear glass with perfect reflections',
    properties: {
      transparency: 0.9,
      roughness: 0.1,
      metalness: 0.0,
      ior: 1.52,
      transmission: 0.95,
      thickness: 0.15,
      tint: new THREE.Color(0xffffff),
      reflectivity: 1.0,
      frostingIntensity: 0.0,
      causticStrength: 0.8
    },
    frosting: {
      intensity: 0.0,
      scale: 1.0,
      seed: 0,
      pattern: 'perlin',
      normalStrength: 0.0
    },
    caustics: {
      enabled: true,
      intensity: 0.8,
      scale: 4.0,
      speed: 1.0,
      color: new THREE.Color(0.9, 0.95, 1.0),
      pattern: null
    }
  },

  bathroom_frosted: {
    name: 'Bathroom Frosted',
    description: 'Privacy glass with medium frosting',
    properties: {
      transparency: 0.3,
      roughness: 0.7,
      metalness: 0.0,
      ior: 1.52,
      transmission: 0.8,
      thickness: 0.12,
      tint: new THREE.Color(0xf8f8ff),
      reflectivity: 0.6,
      frostingIntensity: 0.8,
      causticStrength: 0.3
    },
    frosting: {
      intensity: 0.8,
      scale: 2.0,
      seed: 12345,
      pattern: 'perlin',
      normalStrength: 1.5
    },
    caustics: {
      enabled: true,
      intensity: 0.3,
      scale: 6.0,
      speed: 0.5,
      color: new THREE.Color(0.95, 0.95, 1.0),
      pattern: null
    }
  },

  colored_tinted: {
    name: 'Ocean Tinted',
    description: 'Beautiful blue-green tinted glass',
    properties: {
      transparency: 0.7,
      roughness: 0.3,
      metalness: 0.0,
      ior: 1.52,
      transmission: 0.85,
      thickness: 0.1,
      tint: new THREE.Color(0.7, 0.9, 1.0),
      reflectivity: 0.8,
      frostingIntensity: 0.2,
      causticStrength: 0.6
    },
    frosting: {
      intensity: 0.2,
      scale: 3.0,
      seed: 54321,
      pattern: 'perlin',
      normalStrength: 0.5
    },
    caustics: {
      enabled: true,
      intensity: 0.6,
      scale: 5.0,
      speed: 1.2,
      color: new THREE.Color(0.6, 0.8, 1.0),
      pattern: null
    }
  },

  smart_reactive: {
    name: 'Smart Reactive',
    description: 'Interactive glass that responds to proximity',
    properties: {
      transparency: 0.5,
      roughness: 0.4,
      metalness: 0.0,
      ior: 1.52,
      transmission: 0.9,
      thickness: 0.08,
      tint: new THREE.Color(1.0, 1.0, 1.0),
      reflectivity: 0.9,
      frostingIntensity: 0.4,
      causticStrength: 0.7
    },
    frosting: {
      intensity: 0.4,
      scale: 1.5,
      seed: 98765,
      pattern: 'cellular',
      normalStrength: 1.0
    },
    caustics: {
      enabled: true,
      intensity: 0.7,
      scale: 3.0,
      speed: 2.0,
      color: new THREE.Color(1.0, 0.9, 0.8),
      pattern: null
    }
  }
}

export class MaterialPresetManager {
  static applyPreset(preset: MaterialPreset): any {
    return {
      ...preset.properties,
      frostingEffect: preset.frosting,
      causticProperties: preset.caustics
    }
  }

  static interpolatePresets(
    presetA: MaterialPreset,
    presetB: MaterialPreset,
    factor: number
  ): MaterialPreset {
    const interpolateColor = (colorA: THREE.Color, colorB: THREE.Color, t: number) => {
      return new THREE.Color().lerpColors(colorA, colorB, t)
    }

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t

    return {
      name: `${presetA.name} → ${presetB.name}`,
      description: `Interpolated between ${presetA.name} and ${presetB.name}`,
      properties: {
        transparency: lerp(presetA.properties.transparency, presetB.properties.transparency, factor),
        roughness: lerp(presetA.properties.roughness, presetB.properties.roughness, factor),
        metalness: lerp(presetA.properties.metalness, presetB.properties.metalness, factor),
        ior: lerp(presetA.properties.ior, presetB.properties.ior, factor),
        transmission: lerp(presetA.properties.transmission, presetB.properties.transmission, factor),
        thickness: lerp(presetA.properties.thickness, presetB.properties.thickness, factor),
        tint: interpolateColor(presetA.properties.tint, presetB.properties.tint, factor),
        reflectivity: lerp(presetA.properties.reflectivity, presetB.properties.reflectivity, factor),
        frostingIntensity: lerp(presetA.properties.frostingIntensity, presetB.properties.frostingIntensity, factor),
        causticStrength: lerp(presetA.properties.causticStrength, presetB.properties.causticStrength, factor)
      },
      frosting: {
        intensity: lerp(presetA.frosting.intensity, presetB.frosting.intensity, factor),
        scale: lerp(presetA.frosting.scale, presetB.frosting.scale, factor),
        seed: Math.round(lerp(presetA.frosting.seed, presetB.frosting.seed, factor)),
        pattern: factor < 0.5 ? presetA.frosting.pattern : presetB.frosting.pattern,
        normalStrength: lerp(presetA.frosting.normalStrength, presetB.frosting.normalStrength, factor)
      },
      caustics: {
        enabled: presetA.caustics.enabled || presetB.caustics.enabled,
        intensity: lerp(presetA.caustics.intensity, presetB.caustics.intensity, factor),
        scale: lerp(presetA.caustics.scale, presetB.caustics.scale, factor),
        speed: lerp(presetA.caustics.speed, presetB.caustics.speed, factor),
        color: interpolateColor(presetA.caustics.color, presetB.caustics.color, factor),
        pattern: factor < 0.5 ? presetA.caustics.pattern : presetB.caustics.pattern
      }
    }
  }
}
