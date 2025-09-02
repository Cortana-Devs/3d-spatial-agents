/**
 * Animation System Usage Example
 * 
 * This example demonstrates how to use the Ready Player Me animation loading
 * utilities and asset management system.
 */

import { AnimationLoader, animationLoader } from '../utils/animationLoader'
import {
  extractClipName,
  categorizeAnimation,
  generateAnimationTags,
  getDefaultAnimationPaths,
  formatFileSize
} from '../utils/animationUtils'

/**
 * Example 1: Basic Animation Loading
 */
export async function basicAnimationLoadingExample() {
  console.log('🎬 Basic Animation Loading Example')

  try {
    // Load a Ready Player Me avatar
    const avatarGLTF = await animationLoader.loadAvatarGLTF('/models/player_ReadyPlayerMe.glb')
    console.log('✅ Avatar loaded successfully:', avatarGLTF.scene)

    // Load external animation clips
    const animationPaths = [
      '/animation_GLB/M_Walk_001.glb',
      '/animation_GLB/M_Run_001.glb',
      '/animation_GLB/F_Standing_Idle_Variations_001.glb'
    ]

    const clips = await animationLoader.loadAnimationClips(animationPaths)
    console.log(`✅ Loaded ${clips.size} animation clips:`)

    for (const [name, clip] of clips) {
      console.log(`  - ${name}: ${clip.duration.toFixed(2)}s`)
    }

  } catch (error) {
    console.error('❌ Animation loading failed:', error)
  }
}

/**
 * Example 2: Animation Metadata and Categorization
 */
export async function animationMetadataExample() {
  console.log('🏷️ Animation Metadata Example')

  const animationPaths = getDefaultAnimationPaths()

  try {
    const clipData = await animationLoader.loadAnimationClipsWithMetadata(animationPaths)

    console.log(`📊 Loaded ${clipData.size} animations with metadata:`)

    for (const [name, data] of clipData) {
      console.log(`\n🎭 ${name}:`)
      console.log(`  Category: ${data.category}`)
      console.log(`  Duration: ${data.duration.toFixed(2)}s`)
      console.log(`  Looping: ${data.looping}`)
      console.log(`  Tags: ${data.tags.join(', ')}`)
    }

    // Group by category
    const byCategory = new Map<string, string[]>()
    for (const [name, data] of clipData) {
      if (!byCategory.has(data.category)) {
        byCategory.set(data.category, [])
      }
      byCategory.get(data.category)!.push(name)
    }

    console.log('\n📂 Animations by category:')
    for (const [category, animations] of byCategory) {
      console.log(`  ${category}: ${animations.length} animations`)
      animations.forEach(name => console.log(`    - ${name}`))
    }

  } catch (error) {
    console.error('❌ Metadata loading failed:', error)
  }
}

/**
 * Example 3: Cache Management and Performance
 */
export async function cacheManagementExample() {
  console.log('💾 Cache Management Example')

  // Create a custom loader with specific cache settings
  const customLoader = new AnimationLoader({
    cache: {
      maxCacheSize: 50 * 1024 * 1024, // 50MB
      maxAge: 2 * 60 * 1000, // 2 minutes
      cleanupInterval: 30 * 1000 // 30 seconds
    },
    enableLogging: true,
    retryAttempts: 2
  })

  try {
    // Load some assets
    await customLoader.loadAvatarGLTF('/models/player_ReadyPlayerMe.glb')

    const animationPaths = [
      '/animation_GLB/M_Walk_001.glb',
      '/animation_GLB/M_Run_001.glb',
      '/animation_GLB/F_Dances_007.glb'
    ]

    await customLoader.loadAnimationClips(animationPaths)

    // Check cache statistics
    const stats = customLoader.getCacheStats()
    console.log('📈 Cache Statistics:')
    console.log(`  Avatars cached: ${stats.avatarCount}`)
    console.log(`  Clips cached: ${stats.clipCount}`)
    console.log(`  Total size: ${stats.formattedSize}`)
    console.log(`  Max size: ${stats.formattedMaxSize}`)
    console.log(`  Utilization: ${stats.utilizationPercent.toFixed(1)}%`)

    // Test cache retrieval
    const cachedAvatar = customLoader.getCachedAvatar('/models/player_ReadyPlayerMe.glb')
    console.log(`✅ Avatar cached: ${cachedAvatar ? 'Yes' : 'No'}`)

    const cachedClip = customLoader.getCachedClip('walk_male')
    console.log(`✅ Walk clip cached: ${cachedClip ? 'Yes' : 'No'}`)

    // Clear cache
    customLoader.clearCache()
    console.log('🗑️ Cache cleared')

    const clearedStats = customLoader.getCacheStats()
    console.log(`📉 After clearing - Total size: ${clearedStats.formattedSize}`)

    // Cleanup
    customLoader.dispose()

  } catch (error) {
    console.error('❌ Cache management failed:', error)
  }
}

/**
 * Example 4: Animation Utility Functions
 */
export function animationUtilitiesExample() {
  console.log('🛠️ Animation Utilities Example')

  const filePaths = [
    '/animation_GLB/M_Walk_001.glb',
    '/animation_GLB/F_Standing_Idle_Variations_002.glb',
    '/animation_GLB/M_Run_001.glb',
    '/animation_GLB/F_Dances_007.glb',
    '/animation_GLB/M_Talking_Variations_005.glb'
  ]

  console.log('🎯 Processing animation files:')

  filePaths.forEach(path => {
    const clipName = extractClipName(path)
    const category = categorizeAnimation(clipName)
    const tags = generateAnimationTags(clipName, category)

    console.log(`\n📁 ${path}`)
    console.log(`  Clip name: ${clipName}`)
    console.log(`  Category: ${category}`)
    console.log(`  Tags: ${tags.join(', ')}`)
  })

  // File size formatting examples
  console.log('\n📏 File size formatting:')
  const sizes = [1024, 1024 * 1024, 1024 * 1024 * 1.5, 1024 * 1024 * 1024 * 2.3]
  sizes.forEach(size => {
    console.log(`  ${size} bytes = ${formatFileSize(size)}`)
  })
}

/**
 * Example 5: Error Handling and Validation
 */
export async function errorHandlingExample() {
  console.log('⚠️ Error Handling Example')

  const loader = new AnimationLoader({
    enableValidation: true,
    enableLogging: true,
    retryAttempts: 1
  })

  try {
    // Try to load a non-existent file
    console.log('🔍 Attempting to load non-existent avatar...')
    await loader.loadAvatarGLTF('/models/nonexistent.glb')
  } catch (error) {
    console.log('✅ Correctly caught error:', (error as Error).message)
  }

  try {
    // Try to load non-existent animation clips
    console.log('🔍 Attempting to load non-existent animations...')
    const clips = await loader.loadAnimationClips([
      '/animation_GLB/nonexistent1.glb',
      '/animation_GLB/nonexistent2.glb'
    ])
    console.log(`✅ Gracefully handled missing files, loaded ${clips.size} clips`)
  } catch (error) {
    console.log('❌ Unexpected error:', error)
  }

  // Test validation with mock data
  console.log('🔍 Testing GLTF validation...')

  // Mock valid GLTF
  const validGLTF = {
    scene: { traverse: () => { } },
    animations: [{ name: 'test', duration: 1.0, tracks: [] }]
  } as any

  const validResult = loader.validateGLTF(validGLTF)
  console.log('✅ Valid GLTF validation:', {
    isValid: validResult.isValid,
    hasAnimations: validResult.hasAnimations,
    errors: validResult.errors.length,
    warnings: validResult.warnings.length
  })

  // Mock invalid GLTF
  const invalidGLTF = { animations: [] } as any
  const invalidResult = loader.validateGLTF(invalidGLTF)
  console.log('❌ Invalid GLTF validation:', {
    isValid: invalidResult.isValid,
    errors: invalidResult.errors
  })

  loader.dispose()
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('🚀 Running Animation System Examples\n')

  // Note: These examples would work in a browser environment with actual GLB files
  // In a Node.js environment, they will demonstrate error handling

  animationUtilitiesExample()
  console.log('\n' + '='.repeat(50) + '\n')

  await errorHandlingExample()
  console.log('\n' + '='.repeat(50) + '\n')

  await cacheManagementExample()
  console.log('\n' + '='.repeat(50) + '\n')

  // These would require actual GLB files to work
  // await basicAnimationLoadingExample()
  // await animationMetadataExample()

  console.log('✅ All examples completed!')
}

// Export for use in other modules
export {
  AnimationLoader,
  animationLoader,
  extractClipName,
  categorizeAnimation,
  generateAnimationTags,
  getDefaultAnimationPaths,
  formatFileSize
}