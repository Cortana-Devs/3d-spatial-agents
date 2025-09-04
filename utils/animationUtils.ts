/**
 * Animation utility functions for Ready Player Me animation system
 */

/**
 * Extract meaningful animation name from file path
 * Maps Mixamo file names to semantic animation names
 */
export function extractClipName(path: string): string {
  const filename = path.split('/').pop()?.replace('.glb', '') || 'unknown'
  
  // Map file names to semantic animation names
  const nameMapping: Record<string, string> = {
    'F_Standing_Idle_Variations_001': 'idle_female_1',
    'F_Standing_Idle_Variations_002': 'idle_female_2',
    'F_Standing_Idle_Variations_006': 'idle_female_3',
    'M_Walk_001': 'walk_male',
    'M_Run_001': 'run_male',
    'M_Walk_Jump_002': 'jump_male',
    'M_Crouch_Walk_003': 'crouch_walk_male',
    'M_Standing_Expressions_013': 'expression_male',
    'M_Talking_Variations_005': 'talk_male',
    'M_Walk_Backwards_001': 'walk_backward_male',
    'F_Dances_007': 'dance_female',
    'Masculine_TPose': 'tpose_male'
  }
  
  return nameMapping[filename] || filename.toLowerCase()
}

/**
 * Categorize animation based on name and content
 */
export function categorizeAnimation(name: string): 'locomotion' | 'idle' | 'action' | 'expression' {
  const lowerName = name.toLowerCase()
  
  // Check for action animations first (more specific patterns)
  if (lowerName.includes('dance') || lowerName.includes('crouch') || lowerName.includes('backward')) {
    return 'action'
  }
  
  // Check for expression animations
  if (lowerName.includes('expression') || lowerName.includes('talk')) {
    return 'expression'
  }
  
  // Check for idle animations
  if (lowerName.includes('idle') || lowerName.includes('standing') || lowerName.includes('tpose')) {
    return 'idle'
  }
  
  // Check for locomotion animations (less specific, so check last)
  if (lowerName.includes('walk') || lowerName.includes('run') || lowerName.includes('jump')) {
    return 'locomotion'
  }
  
  return 'action' // default category
}

/**
 * Generate tags for animation based on name and category
 */
export function generateAnimationTags(name: string, category: string): string[] {
  const tags: string[] = [category]
  const lowerName = name.toLowerCase()
  
  // Gender tags
  if (lowerName.includes('male') || lowerName.startsWith('m_')) {
    tags.push('male')
  }
  if (lowerName.includes('female') || lowerName.startsWith('f_')) {
    tags.push('female')
  }
  
  // Movement tags
  if (lowerName.includes('walk')) tags.push('walk')
  if (lowerName.includes('run')) tags.push('run')
  if (lowerName.includes('jump')) tags.push('jump')
  if (lowerName.includes('crouch')) tags.push('crouch')
  if (lowerName.includes('backward')) tags.push('backward')
  
  // State tags
  if (lowerName.includes('idle')) tags.push('idle')
  if (lowerName.includes('standing')) tags.push('standing')
  if (lowerName.includes('dance')) tags.push('dance')
  if (lowerName.includes('talk')) tags.push('talk')
  if (lowerName.includes('expression')) tags.push('expression')
  
  // Variation tags
  if (lowerName.includes('variation')) tags.push('variation')
  if (lowerName.includes('001') || lowerName.includes('1')) tags.push('variant-1')
  if (lowerName.includes('002') || lowerName.includes('2')) tags.push('variant-2')
  if (lowerName.includes('003') || lowerName.includes('3')) tags.push('variant-3')
  
  return [...new Set(tags)] // Remove duplicates
}

/**
 * Check if animation should loop by default
 */
export function shouldAnimationLoop(name: string, category: string): boolean {
  const lowerName = name.toLowerCase()
  
  // Locomotion animations typically loop
  if (category === 'locomotion') {
    return !lowerName.includes('jump') // Jump is usually a one-shot
  }
  
  // Idle animations always loop
  if (category === 'idle') {
    return true
  }
  
  // Expression animations like talking loop
  if (category === 'expression' && lowerName.includes('talk')) {
    return true
  }
  
  // Most actions are one-shot
  return false
}

/**
 * Get default animation paths for loading
 */
// Constant array to prevent recreation on every call
const DEFAULT_ANIMATION_PATHS = [
  '/animation_GLB/F_Standing_Idle_Variations_001.glb',
  '/animation_GLB/F_Standing_Idle_Variations_002.glb',
  '/animation_GLB/F_Standing_Idle_Variations_006.glb',
  '/animation_GLB/M_Walk_001.glb',
  '/animation_GLB/M_Run_001.glb',
  '/animation_GLB/M_Walk_Jump_002.glb',
  '/animation_GLB/M_Crouch_Walk_003.glb',
  '/animation_GLB/M_Standing_Expressions_013.glb',
  '/animation_GLB/M_Talking_Variations_005.glb',
  '/animation_GLB/M_Walk_Backwards_001.glb',
  '/animation_GLB/F_Dances_007.glb',
  '/animation_GLB/Masculine_TPose.glb'
] as const;

export function getDefaultAnimationPaths(): readonly string[] {
  return DEFAULT_ANIMATION_PATHS;
}

/**
 * Calculate memory usage estimate for GLTF asset
 */
export function estimateAssetSize(gltf: any): number {
  let size = 0
  
  // Estimate based on geometry and texture data
  if (gltf.scene) {
    gltf.scene.traverse((child: any) => {
      if (child.geometry) {
        // Rough estimate: vertices * attributes * 4 bytes per float
        const vertices = child.geometry.attributes.position?.count || 0
        const attributes = Object.keys(child.geometry.attributes).length
        size += vertices * attributes * 4
      }
      
      if (child.material && child.material.map) {
        // Rough estimate for texture: width * height * 4 bytes per pixel
        const texture = child.material.map
        if (texture.image) {
          size += (texture.image.width || 512) * (texture.image.height || 512) * 4
        }
      }
    })
  }
  
  // Add animation data size
  if (gltf.animations) {
    gltf.animations.forEach((animation: any) => {
      animation.tracks.forEach((track: any) => {
        // Estimate: keyframes * 4 bytes per float * components
        size += (track.times?.length || 0) * 4
        size += (track.values?.length || 0) * 4
      })
    })
  }
  
  return size
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Create cache key from path
 */
export function createCacheKey(path: string): string {
  return path.replace(/[^a-zA-Z0-9]/g, '_')
}