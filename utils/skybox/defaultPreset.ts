import { Color, Vector3 } from 'three'
import { SkyboxPreset, DEFAULT_ATMOSPHERIC_SETTINGS } from '../../types/skybox'

/**
 * Default skybox preset for initial setup
 * Uses numbered format (1.jpg - 6.jpg) in public/skyboxes/default/
 */
export const DEFAULT_SKYBOX_PRESET: SkyboxPreset = {
  id: 'default-skybox',
  name: 'Default Sky',
  description: 'Simple default skybox for initial setup',
  assetPath: '/skyboxes/default/',
  intensity: 1.0,
  tint: new Color(1, 1, 1),
  rotationSpeed: 0,
  atmosphericSettings: {
    ...DEFAULT_ATMOSPHERIC_SETTINGS,
    fogEnabled: false,
    timeOfDay: 0.5,
    windSpeed: 0,
    windDirection: new Vector3(0, 0, 0),
    cloudCoverage: 0
  },
  performance: {
    quality: 'medium',
    memoryUsage: 32,
    loadPriority: 10
  },
  tags: ['default', 'simple', 'startup'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}

export default DEFAULT_SKYBOX_PRESET
