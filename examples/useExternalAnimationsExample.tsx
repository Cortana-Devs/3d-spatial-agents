/**
 * Example usage of useExternalAnimations hook
 * Demonstrates loading external animation GLB files for Ready Player Me avatars
 */

import React from 'react'
import { useExternalAnimations } from '../utils/useExternalAnimations'
import { getDefaultAnimationPaths } from '../utils/animationUtils'

/**
 * Example component showing basic usage of useExternalAnimations
 */
export function BasicAnimationExample() {
    // Load default animation paths
    const {
        clips,
        loading,
        error,
        loadedCount,
        totalCount,
        progress
    } = useExternalAnimations()

    if (loading) {
        return (
            <div>
            <p>Loading animations... { progress.toFixed(1) }% </p>
                < p > { loadedCount } of { totalCount } loaded </p>
                    </div>
    )
    }

    if (error) {
        return <div>Error loading animations: { error.message } </div>
    }

    return (
        <div>
        <h3>Loaded Animations({ clips.size }) </h3>
            <ul>
    {
        Array.from(clips.entries()).map(([name, clip]) => (
            <li key= { name } >
            { name } - Duration: { clip.duration.toFixed(2) }s
        </li>
        ))
    }
    </ul>
        </div>
  )
}

/**
 * Example component showing custom animation paths
 */
export function CustomAnimationExample() {
    // Load specific animation files
    const customPaths = [
        '/animation_GLB/M_Walk_001.glb',
        '/animation_GLB/M_Run_001.glb',
        '/animation_GLB/F_Standing_Idle_Variations_001.glb'
    ]

    const {
        clips,
        loading,
        error,
        progress
    } = useExternalAnimations(customPaths, {
        enableLogging: true,
        enableCaching: true,
        enableConcurrentLoading: true,
        maxConcurrentLoads: 2
    })

    return (
        <div>
        <h3>Custom Animation Loading </h3>
    { loading && <p>Loading: { progress.toFixed(1) }% </p> }
    { error && <p>Error: { error.message } </p> }
    {
        !loading && !error && (
            <div>
            <p>Successfully loaded { clips.size } animations </p>
                <div>
        {
            Array.from(clips.keys()).map(name => (
                <button key= { name } onClick = {() => console.log(`Play ${name}`)}>
                    { name }
                    </button>
            ))
    }
    </div>
        </div>
      )
}
</div>
  )
}

/**
 * Example component showing performance-optimized loading
 */
export function PerformanceOptimizedExample() {
    const {
        clips,
        loading,
        error,
        loadedCount,
        totalCount
    } = useExternalAnimations(getDefaultAnimationPaths(), {
        enableCaching: true,
        enableConcurrentLoading: true,
        maxConcurrentLoads: 4,
        enableRetry: true,
        retryAttempts: 2,
        retryDelay: 500,
        enableLogging: false // Disable for production
    })

    return (
        <div>
        <h3>Performance Optimized Loading </h3>
            <div>
    Status: { loading ? 'Loading' : error ? 'Error' : 'Complete' }
    </div>
        <div>
    Progress: { loadedCount }/{totalCount}
        </div>
    {
        clips.size > 0 && (
            <div>
            <h4>Available Animations: </h4>
        {
            Array.from(clips.entries()).map(([name, clip]) => (
                <div key= { name } >
                <strong>{ name } </strong>: {clip.duration.toFixed(2)}s
              { clip.tracks && ` (${clip.tracks.length} tracks)` }
                </div>
            ))
        }
        </div>
      )
    }
    </div>
  )
}

/**
 * Example showing integration with React Three Fiber
 */
export function R3FIntegrationExample() {
    const { clips, loading, error } = useExternalAnimations()

    // This would typically be used in a Three.js component
    React.useEffect(() => {
        if (!loading && !error && clips.size > 0) {
            console.log('Animations ready for Three.js integration:')
            clips.forEach((clip, name) => {
                console.log(`- ${name}: ${clip.duration}s, ${clip.tracks.length} tracks`)
            })
        }
    }, [clips, loading, error])

    return (
        <div>
        <h3>React Three Fiber Integration </h3>
    { loading && <p>Preparing animations for 3D scene...</p> }
    { error && <p>Failed to load animations: { error.message } </p> }
    {
        !loading && !error && (
            <div>
            <p>✅ { clips.size } animations ready for Three.js </p>
                < p > Check console for animation details </p>
                    </div>
      )}
    </div>
  )
}

/**
 * Example showing error handling and fallbacks
 */
export function ErrorHandlingExample() {
    // Include some invalid paths to demonstrate error handling
    const pathsWithErrors = [
        '/animation_GLB/M_Walk_001.glb', // Valid
        '/animation_GLB/NonExistent.glb', // Invalid
        '/animation_GLB/M_Run_001.glb', // Valid
        '/invalid/path.glb' // Invalid
    ]

    const {
        clips,
        loading,
        error,
        loadedCount,
        totalCount
    } = useExternalAnimations(pathsWithErrors, {
        enableLogging: true,
        enableRetry: true,
        retryAttempts: 1,
        retryDelay: 100
    })

    return (
        <div>
        <h3>Error Handling Example </h3>
            <div>
        Attempted to load: { totalCount } files
        </div>
        <div>
        Successfully loaded: { clips.size } animations
        </div>
        <div>
        Failed loads: { loadedCount - clips.size }
    </div>

    { loading && <p>Loading with error recovery...</p> }

    {
        !loading && (
            <div>
            <h4>Successfully Loaded: </h4>
        {
            clips.size > 0 ? (
                <ul>
                {
                    Array.from(clips.keys()).map(name => (
                        <li key= { name } >✅ { name } </li>
                    ))
                }
                </ul>
            ) : (
            <p>No animations loaded successfully </p>
          )
        }

        {
            loadedCount > clips.size && (
                <div>
                <h4>Failed to Load: </h4>
                    <p>⚠️ { loadedCount - clips.size } files failed to load(check console for details)</p>
                        </div>
          )
        }
        </div>
      )
    }
    </div>
  )
}

/**
 * Example showing cache management
 */
export function CacheManagementExample() {
    const { clips, loading } = useExternalAnimations()
    const [cacheStats, setCacheStats] = React.useState<any>(null)

    // Import cache utilities dynamically to avoid issues
    React.useEffect(() => {
        import('../utils/useExternalAnimations').then(({ getAnimationCacheStats }) => {
            setCacheStats(getAnimationCacheStats())
        })
    }, [clips])

    const handleClearCache = async () => {
        const { clearAnimationCache, getAnimationCacheStats } = await import('../utils/useExternalAnimations')
        clearAnimationCache()
        setCacheStats(getAnimationCacheStats())
    }

    return (
        <div>
        <h3>Cache Management </h3>
    { loading && <p>Loading animations...</p> }

    {
        cacheStats && (
            <div>
            <h4>Cache Statistics: </h4>
                < ul >
                <li>Cached clips: { cacheStats.cachedClips } </li>
                    < li > Active loads: { cacheStats.activeLoads } </li>
                        < li > Cache keys: { cacheStats.cacheKeys.join(', ') } </li>
                            </ul>

                            < button onClick = { handleClearCache } >
                                Clear Cache
                                    </button>
                                    </div>
      )
    }

    <div>
        <h4>Loaded Animations: </h4>
            < p > { clips.size } animations in memory </p>
                </div>
                </div>
  )
}

// Export all examples for easy importing
export const examples = {
    BasicAnimationExample,
    CustomAnimationExample,
    PerformanceOptimizedExample,
    R3FIntegrationExample,
    ErrorHandlingExample,
    CacheManagementExample
}

// Usage instructions
export const USAGE_INSTRUCTIONS = `
# useExternalAnimations Hook Usage

## Basic Usage
\`\`\`tsx
import { useExternalAnimations } from '../utils/useExternalAnimations'

function MyComponent() {
  const { clips, loading, error } = useExternalAnimations()
  
  if (loading) return <div>Loading animations...</div>
  if (error) return <div>Error: {error.message}</div>
  
  return <div>{clips.size} animations loaded</div>
}
\`\`\`

## Custom Paths
\`\`\`tsx
const customPaths = ['/path/to/animation1.glb', '/path/to/animation2.glb']
const { clips, loading, progress } = useExternalAnimations(customPaths)
\`\`\`

## Configuration Options
\`\`\`tsx
const { clips } = useExternalAnimations(paths, {
  enableCaching: true,
  enableConcurrentLoading: true,
  maxConcurrentLoads: 4,
  enableRetry: true,
  retryAttempts: 2,
  retryDelay: 1000,
  enableLogging: false
})
\`\`\`

## Cache Management
\`\`\`tsx
import { clearAnimationCache, getAnimationCacheStats } from '../utils/useExternalAnimations'

// Clear all cached animations
clearAnimationCache()

// Get cache statistics
const stats = getAnimationCacheStats()
console.log(\`Cached: \${stats.cachedClips} clips\`)
\`\`\`
`