'use client'

import { SkyboxPreset } from '../../types/skybox'

/**
 * Utility functions for skybox management
 * Provides easy-to-use helpers for path building, validation, and preset management
 */

export interface SkyboxPathOptions {
  /**
   * Base path to skybox directory (default: "/skyboxes/")
   */
  basePath?: string
  /**
   * Skybox name/folder (default: "default")
   */
  name?: string
  /**
   * File extension (default: ".jpg")
   */
  extension?: string
  /**
   * Use numbered format (1.jpg - 6.jpg) vs named format (px.jpg, nx.jpg, etc.)
   */
  numbered?: boolean
}

/**
 * Build skybox file URLs for CubeTextureLoader
 * @param options Path configuration options
 * @returns Array of 6 URLs in Three.js cube map order [+X, -X, +Y, -Y, +Z, -Z]
 */
export function buildSkyboxUrls({
  basePath = '/skyboxes/',
  name = 'default',
  extension = '.jpg',
  numbered = true
}: SkyboxPathOptions = {}): [string, string, string, string, string, string] {
  // Ensure basePath ends with /
  const normalizedBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`
  // Ensure name ends with /
  const normalizedName = name.endsWith('/') ? name : `${name}/`

  const fullPath = `${normalizedBasePath}${normalizedName}`

  if (numbered) {
    // Numbered format: 1.jpg - 6.jpg
    return [
      `${fullPath}1${extension}`, // right (+X)
      `${fullPath}2${extension}`, // left (-X)
      `${fullPath}3${extension}`, // top (+Y)
      `${fullPath}4${extension}`, // bottom (-Y)
      `${fullPath}5${extension}`, // front (+Z)
      `${fullPath}6${extension}`  // back (-Z)
    ]
  } else {
    // Named format: px, nx, py, ny, pz, nz
    return [
      `${fullPath}px${extension}`, // right (+X)
      `${fullPath}nx${extension}`, // left (-X)
      `${fullPath}py${extension}`, // top (+Y)
      `${fullPath}ny${extension}`, // bottom (-Y)
      `${fullPath}pz${extension}`, // front (+Z)
      `${fullPath}nz${extension}`  // back (-Z)
    ]
  }
}

/**
 * Get skybox path from preset
 */
export function getPresetPath(preset: SkyboxPreset): string {
  return preset.assetPath
}

/**
 * Validate skybox path format
 */
export function validateSkyboxPath(path: string): {
  isValid: boolean
  errors: string[]
  suggestions: string[]
} {
  const errors: string[] = []
  const suggestions: string[] = []

  if (!path) {
    errors.push('Path is required')
    suggestions.push('Use format: /skyboxes/name/')
  }

  if (!path.startsWith('/')) {
    errors.push('Path must start with /')
    suggestions.push('Use absolute path from public directory')
  }

  if (!path.endsWith('/')) {
    errors.push('Path should end with /')
    suggestions.push('Add trailing slash for directory path')
  }

  if (path.includes('..')) {
    errors.push('Path traversal not allowed')
  }

  return {
    isValid: errors.length === 0,
    errors,
    suggestions
  }
}

/**
 * Check if skybox URLs are accessible (client-side only)
 */
export async function validateSkyboxUrls(urls: string[]): Promise<{
  valid: string[]
  invalid: string[]
  accessible: boolean
}> {
  if (typeof window === 'undefined') {
    return { valid: [], invalid: urls, accessible: false }
  }

  const valid: string[] = []
  const invalid: string[] = []

  for (const url of urls) {
    try {
      const response = await fetch(url, { method: 'HEAD' })
      if (response.ok) {
        valid.push(url)
      } else {
        invalid.push(url)
      }
    } catch {
      invalid.push(url)
    }
  }

  return {
    valid,
    invalid,
    accessible: valid.length === urls.length
  }
}

/**
 * Generate quick test skybox URLs for development
 */
export function getTestSkyboxUrls(): [string, string, string, string, string, string] {
  // Uses placeholder.com for testing
  const size = '512x512'
  const colors = ['FF0000', '00FF00', '0000FF', 'FFFF00', 'FF00FF', 'FFA500']
  const labels = ['RIGHT', 'LEFT', 'TOP', 'BOTTOM', 'FRONT', 'BACK']

  return colors.map((color, i) =>
    `https://via.placeholder.com/${size}/${color}/FFFFFF?text=${labels[i]}`
  ) as [string, string, string, string, string, string]
}

/**
 * Common skybox paths for quick access
 */
export const COMMON_SKYBOX_PATHS = {
  default: '/skyboxes/default/',
  sunset: '/skyboxes/sunset/',
  space: '/skyboxes/space/',
  ocean: '/skyboxes/ocean/',
  forest: '/skyboxes/forest/',
  city: '/skyboxes/city/',
  mountain: '/skyboxes/mountain/'
} as const

/**
 * Get skybox info from path
 */
export function parseSkyboxPath(path: string): {
  basePath: string
  name: string
  isValid: boolean
} {
  const match = path.match(/^(.+\/skyboxes\/)([^/]+)\/?$/)

  if (match) {
    return {
      basePath: match[1],
      name: match[2],
      isValid: true
    }
  }

  return {
    basePath: '/skyboxes/',
    name: 'unknown',
    isValid: false
  }
}

/**
 * Create quick preset from path
 */
export function createPresetFromPath(
  path: string,
  name?: string,
  options: Partial<SkyboxPreset> = {}
): SkyboxPreset {
  const { name: parsedName } = parseSkyboxPath(path)
  const presetName = name || parsedName.charAt(0).toUpperCase() + parsedName.slice(1)

  return {
    id: `preset-${parsedName}-${Date.now()}`,
    name: presetName,
    description: `Auto-generated preset for ${presetName}`,
    assetPath: path,
    intensity: 1.0,
    tint: { r: 1, g: 1, b: 1 } as any, // Will be converted to Three.Color
    rotationSpeed: 0,
    atmosphericSettings: {
      fogEnabled: false,
      fogColor: { r: 0.5, g: 0.5, b: 0.5 } as any,
      fogNear: 100,
      fogFar: 1000,
      windSpeed: 0,
      windDirection: { x: 0, y: 0, z: 0 } as any,
      cloudCoverage: 0,
      timeOfDay: 0.5
    },
    performance: {
      quality: 'medium',
      memoryUsage: 50,
      loadPriority: 5
    },
    tags: ['auto-generated'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...options
  }
}

/**
 * File extension helpers
 */
export const SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png', '.webp', '.avif'] as const
export type SupportedFormat = typeof SUPPORTED_FORMATS[number]

export function getSupportedFormat(filename: string): SupportedFormat | null {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'))
  return SUPPORTED_FORMATS.find(format => format === ext) || null
}

/**
 * Quick skybox setup helper
 */
export function createQuickSkybox(name: string, options?: SkyboxPathOptions) {
  const urls = buildSkyboxUrls({ name, ...options })
  const preset = createPresetFromPath(`/skyboxes/${name}/`, name)

  return {
    urls,
    preset,
    path: `/skyboxes/${name}/`
  }
}

const skyboxUtils = {
  buildSkyboxUrls,
  validateSkyboxPath,
  validateSkyboxUrls,
  getTestSkyboxUrls,
  parseSkyboxPath,
  createPresetFromPath,
  createQuickSkybox,
  COMMON_SKYBOX_PATHS,
  SUPPORTED_FORMATS
}

export default skyboxUtils
