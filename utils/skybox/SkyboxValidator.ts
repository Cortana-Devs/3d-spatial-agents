import { SkyboxPreset, SkyboxError, SkyboxErrorType, SKYBOX_ASSETS } from '../../types/skybox'
import { Color, Vector3 } from 'three'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  recommendations: string[]
}

export interface AssetValidationResult extends ValidationResult {
  foundAssets: string[]
  missingAssets: string[]
  assetSizes: Record<string, number>
  totalSize: number
}

export class SkyboxValidator {
  private readonly VALID_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.ktx2']
  private readonly MAX_TEXTURE_SIZE = 2048 // pixels
  private readonly MIN_TEXTURE_SIZE = 512  // pixels
  private readonly MAX_PRESET_MEMORY = 128 // MB
  private readonly MIN_INTENSITY = 0
  private readonly MAX_INTENSITY = 10
  private readonly MAX_ROTATION_SPEED = 10

  /**
   * Validate a complete skybox preset
   */
  validatePreset(preset: SkyboxPreset): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const recommendations: string[] = []

    // Validate required fields
    if (!preset.id || typeof preset.id !== 'string') {
      errors.push('Preset ID is required and must be a string')
    } else if (preset.id.length < 3) {
      errors.push('Preset ID must be at least 3 characters long')
    } else if (!/^[a-zA-Z0-9_-]+$/.test(preset.id)) {
      errors.push('Preset ID must contain only alphanumeric characters, underscores, and hyphens')
    }

    if (!preset.name || typeof preset.name !== 'string') {
      errors.push('Preset name is required and must be a string')
    } else if (preset.name.length < 3) {
      warnings.push('Preset name should be at least 3 characters long for better UX')
    }

    if (!preset.assetPath || typeof preset.assetPath !== 'string') {
      errors.push('Asset path is required and must be a string')
    } else if (!this.validateAssetPath(preset.assetPath)) {
      errors.push('Asset path format is invalid')
    }

    // Validate intensity
    if (typeof preset.intensity !== 'number') {
      errors.push('Intensity must be a number')
    } else if (preset.intensity < this.MIN_INTENSITY || preset.intensity > this.MAX_INTENSITY) {
      warnings.push(`Intensity should be between ${this.MIN_INTENSITY} and ${this.MAX_INTENSITY}`)
    }

    // Validate tint
    if (!(preset.tint instanceof Color)) {
      errors.push('Tint must be a Three.js Color object')
    }

    // Validate rotation speed
    if (typeof preset.rotationSpeed !== 'number') {
      errors.push('Rotation speed must be a number')
    } else if (Math.abs(preset.rotationSpeed) > this.MAX_ROTATION_SPEED) {
      warnings.push(`Rotation speed should be between -${this.MAX_ROTATION_SPEED} and ${this.MAX_ROTATION_SPEED}`)
    }

    // Validate atmospheric settings
    const atmosphericValidation = this.validateAtmosphericSettings(preset.atmosphericSettings)
    errors.push(...atmosphericValidation.errors)
    warnings.push(...atmosphericValidation.warnings)

    // Validate performance settings
    const performanceValidation = this.validatePerformanceSettings(preset.performance)
    errors.push(...performanceValidation.errors)
    warnings.push(...performanceValidation.warnings)
    recommendations.push(...performanceValidation.recommendations)

    // Validate tags
    if (!Array.isArray(preset.tags)) {
      errors.push('Tags must be an array')
    } else {
      preset.tags.forEach((tag, index) => {
        if (typeof tag !== 'string') {
          errors.push(`Tag at index ${index} must be a string`)
        } else if (tag.length < 2) {
          warnings.push(`Tag "${tag}" is too short, consider using more descriptive tags`)
        }
      })
    }

    // Validate timestamps
    if (!this.isValidISODate(preset.createdAt)) {
      errors.push('Created date must be a valid ISO string')
    }

    if (!this.isValidISODate(preset.updatedAt)) {
      errors.push('Updated date must be a valid ISO string')
    } else if (new Date(preset.updatedAt) < new Date(preset.createdAt)) {
      warnings.push('Updated date is before created date')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations
    }
  }

  /**
   * Validate atmospheric settings
   */
  private validateAtmosphericSettings(settings: SkyboxPreset['atmosphericSettings']): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const recommendations: string[] = []

    if (!settings || typeof settings !== 'object') {
      errors.push('Atmospheric settings are required and must be an object')
      return { isValid: false, errors, warnings, recommendations }
    }

    // Validate fog settings
    if (typeof settings.fogEnabled !== 'boolean') {
      errors.push('fogEnabled must be a boolean')
    }

    if (!(settings.fogColor instanceof Color)) {
      errors.push('fogColor must be a Three.js Color object')
    }

    if (typeof settings.fogNear !== 'number' || settings.fogNear < 0) {
      errors.push('fogNear must be a non-negative number')
    }

    if (typeof settings.fogFar !== 'number' || settings.fogFar < 0) {
      errors.push('fogFar must be a non-negative number')
    }

    if (typeof settings.fogNear === 'number' && typeof settings.fogFar === 'number' && settings.fogNear >= settings.fogFar) {
      errors.push('fogNear must be less than fogFar')
    }

    // Validate wind settings
    if (typeof settings.windSpeed !== 'number' || settings.windSpeed < 0) {
      errors.push('windSpeed must be a non-negative number')
    } else if (settings.windSpeed > 100) {
      warnings.push('Wind speed is very high, this might affect performance')
    }

    if (!(settings.windDirection instanceof Vector3)) {
      errors.push('windDirection must be a Three.js Vector3 object')
    } else if (settings.windDirection.length() === 0) {
      warnings.push('Wind direction vector has zero length, consider normalizing it')
    }

    // Validate cloud coverage
    if (typeof settings.cloudCoverage !== 'number' || settings.cloudCoverage < 0 || settings.cloudCoverage > 1) {
      errors.push('cloudCoverage must be a number between 0 and 1')
    }

    // Validate time of day
    if (typeof settings.timeOfDay !== 'number' || settings.timeOfDay < 0 || settings.timeOfDay > 1) {
      errors.push('timeOfDay must be a number between 0 and 1')
    }

    // Recommendations based on settings
    if (settings.fogEnabled && settings.fogNear > 50) {
      recommendations.push('Consider reducing fogNear for more atmospheric depth')
    }

    if (settings.cloudCoverage > 0.8) {
      recommendations.push('High cloud coverage might reduce skybox visibility')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations
    }
  }

  /**
   * Validate performance settings
   */
  private validatePerformanceSettings(performance: SkyboxPreset['performance']): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const recommendations: string[] = []

    if (!performance || typeof performance !== 'object') {
      errors.push('Performance settings are required and must be an object')
      return { isValid: false, errors, warnings, recommendations }
    }

    // Validate quality level
    const validQualities = ['low', 'medium', 'high']
    if (!validQualities.includes(performance.quality)) {
      errors.push(`Quality must be one of: ${validQualities.join(', ')}`)
    }

    // Validate memory usage
    if (typeof performance.memoryUsage !== 'number' || performance.memoryUsage <= 0) {
      errors.push('Memory usage must be a positive number')
    } else if (performance.memoryUsage > this.MAX_PRESET_MEMORY) {
      warnings.push(`Memory usage (${performance.memoryUsage}MB) exceeds recommended limit (${this.MAX_PRESET_MEMORY}MB)`)
    }

    // Validate load priority
    if (typeof performance.loadPriority !== 'number' || performance.loadPriority < 1 || performance.loadPriority > 10) {
      errors.push('Load priority must be a number between 1 and 10')
    }

    // Performance recommendations
    if (performance.quality === 'high' && performance.memoryUsage < 32) {
      recommendations.push('High quality setting with low memory usage might indicate undersized textures')
    }

    if (performance.quality === 'low' && performance.memoryUsage > 64) {
      recommendations.push('Low quality setting with high memory usage suggests potential optimization opportunities')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations
    }
  }

  /**
   * Validate asset path format
   */
  private validateAssetPath(assetPath: string): boolean {
    // Should end with / or contain cubemap name prefix
    return assetPath.length > 0 && (assetPath.endsWith('/') || assetPath.includes('/'))
  }

  /**
   * Validate ISO date string
   */
  private isValidISODate(dateString: string): boolean {
    if (typeof dateString !== 'string') return false
    const date = new Date(dateString)
    return !isNaN(date.getTime()) && date.toISOString() === dateString
  }

  /**
   * Validate asset files existence and properties
   */
  async validateAssets(assetPath: string): Promise<AssetValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []
    const recommendations: string[] = []
    const foundAssets: string[] = []
    const missingAssets: string[] = []
    const assetSizes: Record<string, number> = {}
    let totalSize = 0

    try {
      const faces = SKYBOX_ASSETS.naming

      for (const face of faces) {
        const assetUrl = `${assetPath}${face}.webp` // Default to WebP

        try {
          const response = await fetch(assetUrl, { method: 'HEAD' })

          if (response.ok) {
            foundAssets.push(assetUrl)

            // Get content length if available
            const contentLength = response.headers.get('content-length')
            if (contentLength) {
              const size = parseInt(contentLength, 10)
              assetSizes[face] = size
              totalSize += size
            }
          } else {
            missingAssets.push(assetUrl)
          }
        } catch (error) {
          missingAssets.push(assetUrl)
          errors.push(`Failed to check asset ${assetUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      // Validate completeness
      if (missingAssets.length > 0) {
        errors.push(`Missing ${missingAssets.length} out of ${faces.length} required cube map faces`)
      }

      if (foundAssets.length < faces.length) {
        warnings.push('Incomplete cube map detected, this may cause rendering issues')
      }

      // Size validation
      if (totalSize > this.MAX_PRESET_MEMORY * 1024 * 1024) {
        warnings.push(`Total asset size (${Math.round(totalSize / 1024 / 1024)}MB) exceeds recommended limit`)
      }

      // Check for size consistency
      const sizes = Object.values(assetSizes)
      if (sizes.length > 1) {
        const minSize = Math.min(...sizes)
        const maxSize = Math.max(...sizes)
        const sizeVariation = (maxSize - minSize) / minSize

        if (sizeVariation > 0.1) { // 10% variation
          warnings.push('Cube map faces have inconsistent file sizes, this might indicate quality differences')
        }
      }

      // Recommendations
      if (totalSize < 1024 * 1024) { // Less than 1MB
        recommendations.push('Very small texture size detected, consider higher resolution for better quality')
      }

      if (foundAssets.length === faces.length && missingAssets.length === 0) {
        recommendations.push('All cube map faces found - ready for loading')
      }

    } catch (error) {
      errors.push(`Asset validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return {
      isValid: errors.length === 0 && missingAssets.length === 0,
      errors,
      warnings,
      recommendations,
      foundAssets,
      missingAssets,
      assetSizes,
      totalSize
    }
  }

  /**
   * Validate multiple presets for consistency
   */
  validatePresetCollection(presets: SkyboxPreset[]): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const recommendations: string[] = []

    if (!Array.isArray(presets)) {
      errors.push('Presets must be an array')
      return { isValid: false, errors, warnings, recommendations }
    }

    if (presets.length === 0) {
      warnings.push('No presets provided')
      return { isValid: true, errors, warnings, recommendations }
    }

    // Check for duplicate IDs
    const ids = new Set<string>()
    const duplicateIds = new Set<string>()

    presets.forEach(preset => {
      if (ids.has(preset.id)) {
        duplicateIds.add(preset.id)
      } else {
        ids.add(preset.id)
      }
    })

    if (duplicateIds.size > 0) {
      errors.push(`Duplicate preset IDs found: ${Array.from(duplicateIds).join(', ')}`)
    }

    // Check for duplicate names
    const names = new Set<string>()
    const duplicateNames = new Set<string>()

    presets.forEach(preset => {
      if (names.has(preset.name)) {
        duplicateNames.add(preset.name)
      } else {
        names.add(preset.name)
      }
    })

    if (duplicateNames.size > 0) {
      warnings.push(`Duplicate preset names found: ${Array.from(duplicateNames).join(', ')}`)
    }

    // Calculate total memory usage
    const totalMemory = presets.reduce((sum, preset) => sum + preset.performance.memoryUsage, 0)
    if (totalMemory > 512) { // 512MB total
      warnings.push(`High total memory usage: ${totalMemory}MB across all presets`)
    }

    // Check for quality distribution
    const qualityDistribution = presets.reduce((acc, preset) => {
      acc[preset.performance.quality] = (acc[preset.performance.quality] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    if (!qualityDistribution.low) {
      recommendations.push('Consider adding low-quality presets for better performance on lower-end devices')
    }

    if (!qualityDistribution.high) {
      recommendations.push('Consider adding high-quality presets for better visual experience on capable devices')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations
    }
  }

  /**
   * Generate validation report
   */
  generateValidationReport(preset: SkyboxPreset): {
    preset: SkyboxPreset
    validation: ValidationResult
    assetValidation?: AssetValidationResult
    recommendations: string[]
  } {
    const validation = this.validatePreset(preset)
    const recommendations: string[] = []

    // Add general recommendations based on preset properties
    if (preset.intensity > 5) {
      recommendations.push('High intensity values may cause overexposure in bright scenes')
    }

    if (preset.rotationSpeed !== 0) {
      recommendations.push('Rotating skyboxes may cause motion sickness for some users')
    }

    if (preset.performance.quality === 'high' && preset.performance.memoryUsage < 50) {
      recommendations.push('High quality setting might benefit from larger texture sizes')
    }

    return {
      preset,
      validation,
      recommendations: [...validation.recommendations, ...recommendations]
    }
  }

  /**
   * Sanitize and fix common preset issues
   */
  sanitizePreset(preset: Partial<SkyboxPreset>): SkyboxPreset {
    const sanitized: any = { ...preset }

    // Generate ID if missing
    if (!sanitized.id) {
      sanitized.id = `skybox_${Date.now()}`
    }

    // Clean ID
    sanitized.id = sanitized.id.replace(/[^a-zA-Z0-9_-]/g, '_')

    // Default name
    if (!sanitized.name) {
      sanitized.name = `Skybox ${sanitized.id}`
    }

    // Default asset path
    if (!sanitized.assetPath) {
      sanitized.assetPath = `skyboxes/${sanitized.id}/`
    }

    // Clamp intensity
    sanitized.intensity = Math.max(0, Math.min(10, sanitized.intensity || 1))

    // Default tint
    if (!(sanitized.tint instanceof Color)) {
      sanitized.tint = new Color(1, 1, 1)
    }

    // Clamp rotation speed
    sanitized.rotationSpeed = Math.max(-10, Math.min(10, sanitized.rotationSpeed || 0))

    // Default timestamps
    const now = new Date().toISOString()
    if (!sanitized.createdAt) sanitized.createdAt = now
    if (!sanitized.updatedAt) sanitized.updatedAt = now

    // Default tags
    if (!Array.isArray(sanitized.tags)) {
      sanitized.tags = []
    }

    return sanitized as SkyboxPreset
  }
}

// Export singleton instance
export const skyboxValidator = new SkyboxValidator()

// Export class for custom instances
export { SkyboxValidator as SkyboxValidatorClass }
