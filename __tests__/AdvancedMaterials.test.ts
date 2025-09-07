import { FrostedGlassMaterial } from '../materials/FrostedGlassMaterial'
import { MATERIAL_PRESETS, MaterialPresetManager } from '../presets/MaterialPresets'
import * as THREE from 'three'

describe('Advanced Material System', () => {
  test('creates advanced material with all properties', () => {
    const properties = {
      transparency: 0.5,
      roughness: 0.6,
      metalness: 0.02,
      ior: 1.52,
      transmission: 0.9,
      thickness: 0.1,
      tint: new THREE.Color(0xffffff),
      reflectivity: 0.8,
      frostingIntensity: 0.7,
      causticStrength: 0.5
    }

    const material = FrostedGlassMaterial.createAdvancedMaterial(properties)
    
    expect(material).toBeInstanceOf(THREE.MeshPhysicalMaterial)
    expect(material.transparent).toBe(true)
    expect(material.transmission).toBe(0.9)
    expect(material.ior).toBe(1.52)
  })

  test('applies frosting effect correctly', () => {
    const material = new THREE.MeshPhysicalMaterial()
    FrostedGlassMaterial.applyFrostingEffect(material, 0.8)
    
    expect(material.map).not.toBeNull()
    expect(material.normalMap).not.toBeNull()
    expect(material.normalScale.x).toBeCloseTo(1.6)
  })

  test('material presets apply correctly', () => {
    const preset = MATERIAL_PRESETS.showroom_glass
    const appliedProperties = MaterialPresetManager.applyPreset(preset)
    
    expect(appliedProperties.transparency).toBe(0.9)
    expect(appliedProperties.roughness).toBe(0.1)
    expect(appliedProperties.reflectivity).toBe(1.0)
  })

  test('preset interpolation works', () => {
    const presetA = MATERIAL_PRESETS.showroom_glass
    const presetB = MATERIAL_PRESETS.bathroom_frosted
    const interpolated = MaterialPresetManager.interpolatePresets(presetA, presetB, 0.5)
    
    expect(interpolated.properties.transparency).toBeCloseTo(0.6) // (0.9 + 0.3) / 2
    expect(interpolated.properties.roughness).toBeCloseTo(0.4) // (0.1 + 0.7) / 2
  })
})
