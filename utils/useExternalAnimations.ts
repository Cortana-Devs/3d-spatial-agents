/**
 * React hook for loading external animation GLB files
 * Provides concurrent loading, caching, and error handling for RPM animations
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { AnimationClip } from 'three'
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { extractClipName, getDefaultAnimationPaths } from './animationUtils'

/**
 * Hook state interface
 */
interface UseExternalAnimationsState {
  clips: Map<string, AnimationClip>
  loading: boolean
  error: Error | null
  loadedCount: number
  totalCount: number
  progress: number
}

/**
 * Hook options interface
 */
interface UseExternalAnimationsOptions {
  /** Enable caching of loaded animations (default: true) */
  enableCaching?: boolean
  /** Enable concurrent loading (default: true) */
  enableConcurrentLoading?: boolean
  /** Maximum number of concurrent loads (default: 4) */
  maxConcurrentLoads?: number
  /** Enable detailed logging (default: false) */
  enableLogging?: boolean
  /** Retry failed loads (default: true) */
  enableRetry?: boolean
  /** Number of retry attempts (default: 2) */
  retryAttempts?: number
  /** Delay between retries in ms (default: 1000) */
  retryDelay?: number
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: Required<UseExternalAnimationsOptions> = {
  enableCaching: true,
  enableConcurrentLoading: true,
  maxConcurrentLoads: 4,
  enableLogging: false,
  enableRetry: true,
  retryAttempts: 2,
  retryDelay: 1000
}

/**
 * Global cache for animation clips to avoid redundant loading
 */
const globalAnimationCache = new Map<string, AnimationClip>()
const globalLoadingPromises = new Map<string, Promise<AnimationClip | null>>()

/**
 * React hook for loading external animation GLB files
 * 
 * @param animationPaths - Array of paths to animation GLB files
 * @param options - Configuration options for loading behavior
 * @returns Hook state with clips, loading status, and error information
 */
export function useExternalAnimations(
  animationPaths: string[] = getDefaultAnimationPaths(),
  options: UseExternalAnimationsOptions = {}
): UseExternalAnimationsState {
  const config = { ...DEFAULT_OPTIONS, ...options }
  const [state, setState] = useState<UseExternalAnimationsState>({
    clips: new Map(),
    loading: true,
    error: null,
    loadedCount: 0,
    totalCount: animationPaths.length,
    progress: 0
  })

  // Refs to track component lifecycle
  const isMountedRef = useRef(true)
  const loaderRef = useRef<GLTFLoader | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Initialize GLTF loader
  useEffect(() => {
    loaderRef.current = new GLTFLoader()
    return () => {
      loaderRef.current = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  /**
   * Load a single animation clip with retry logic
   */
  const loadSingleClip = useCallback(async (
    path: string,
    attempt: number = 0
  ): Promise<AnimationClip | null> => {
    const clipName = extractClipName(path)
    
    // Check cache first if caching is enabled
    if (config.enableCaching && globalAnimationCache.has(clipName)) {
      if (config.enableLogging) {
        console.log(`📦 Using cached animation: ${clipName}`)
      }
      return globalAnimationCache.get(clipName)!
    }

    // Check if already loading
    if (globalLoadingPromises.has(path)) {
      return globalLoadingPromises.get(path)!
    }

    const loadPromise = new Promise<AnimationClip | null>(async (resolve) => {
      try {
        if (!loaderRef.current) {
          throw new Error('GLTF loader not initialized')
        }

        const gltf = await new Promise<GLTF>((resolveLoad, rejectLoad) => {
          loaderRef.current!.load(
            path,
            resolveLoad,
            undefined, // onProgress
            rejectLoad
          )
        })

        // Check if component is still mounted
        if (!isMountedRef.current) {
          resolve(null)
          return
        }

        // Extract animation clip
        if (!gltf.animations || gltf.animations.length === 0) {
          if (config.enableLogging) {
            console.warn(`⚠️ No animations found in ${path}`)
          }
          resolve(null)
          return
        }

        const clip = gltf.animations[0] // Use first animation
        
        // Cache the clip if caching is enabled
        if (config.enableCaching) {
          globalAnimationCache.set(clipName, clip)
        }

        if (config.enableLogging) {
          console.log(`✅ Loaded animation: ${clipName} (${clip.duration.toFixed(2)}s)`)
        }

        resolve(clip)
      } catch (error) {
        if (config.enableLogging) {
          console.warn(`❌ Failed to load animation from ${path}:`, error)
        }

        // Retry logic
        if (config.enableRetry && attempt < config.retryAttempts) {
          if (config.enableLogging) {
            console.log(`🔄 Retrying load for ${path} (attempt ${attempt + 1}/${config.retryAttempts})`)
          }
          
          setTimeout(() => {
            loadSingleClip(path, attempt + 1).then(resolve)
          }, config.retryDelay)
        } else {
          resolve(null)
        }
      }
    })

    // Cache the loading promise
    globalLoadingPromises.set(path, loadPromise)
    
    // Clean up loading promise when done
    loadPromise.finally(() => {
      globalLoadingPromises.delete(path)
    })

    return loadPromise
  }, [config])

  /**
   * Load animations with concurrent loading support
   */
  const loadAnimations = useCallback(async () => {
    if (!isMountedRef.current || animationPaths.length === 0) {
      return
    }

    // Create abort controller for this load operation
    abortControllerRef.current = new AbortController()

    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      loadedCount: 0,
      totalCount: animationPaths.length,
      progress: 0
    }))

    try {
      const clipMap = new Map<string, AnimationClip>()
      let loadedCount = 0

      if (config.enableConcurrentLoading) {
        // Concurrent loading with semaphore
        const semaphore = new Array(config.maxConcurrentLoads).fill(null)
        let pathIndex = 0

        const loadNext = async (): Promise<void> => {
          while (pathIndex < animationPaths.length && isMountedRef.current) {
            const currentIndex = pathIndex++
            const path = animationPaths[currentIndex]
            
            try {
              const clip = await loadSingleClip(path)
              
              if (!isMountedRef.current) return
              
              if (clip) {
                const clipName = extractClipName(path)
                clipMap.set(clipName, clip)
              }
              
              loadedCount++
              
              // Update progress
              setState(prev => ({
                ...prev,
                clips: new Map(clipMap),
                loadedCount,
                progress: (loadedCount / animationPaths.length) * 100
              }))
            } catch (error) {
              if (config.enableLogging) {
                console.warn(`Failed to load ${path}:`, error)
              }
              loadedCount++
            }
          }
        }

        // Start concurrent workers
        await Promise.all(semaphore.map(() => loadNext()))
      } else {
        // Sequential loading
        for (let i = 0; i < animationPaths.length && isMountedRef.current; i++) {
          const path = animationPaths[i]
          
          try {
            const clip = await loadSingleClip(path)
            
            if (clip) {
              const clipName = extractClipName(path)
              clipMap.set(clipName, clip)
            }
          } catch (error) {
            if (config.enableLogging) {
              console.warn(`Failed to load ${path}:`, error)
            }
          }
          
          loadedCount++
          
          // Update progress
          setState(prev => ({
            ...prev,
            clips: new Map(clipMap),
            loadedCount,
            progress: (loadedCount / animationPaths.length) * 100
          }))
        }
      }

      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          loading: false,
          clips: clipMap,
          loadedCount,
          progress: 100
        }))

        if (config.enableLogging) {
          console.log(`🎬 Animation loading complete: ${clipMap.size}/${animationPaths.length} clips loaded`)
        }
      }
    } catch (error) {
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error as Error
        }))
      }
    }
  }, [animationPaths, loadSingleClip, config])

  // Load animations when paths change
  useEffect(() => {
    loadAnimations()
  }, [loadAnimations])

  return state
}

/**
 * Clear the global animation cache
 * Useful for testing or memory management
 */
export function clearAnimationCache(): void {
  globalAnimationCache.clear()
  globalLoadingPromises.clear()
}

/**
 * Get cache statistics
 */
export function getAnimationCacheStats() {
  return {
    cachedClips: globalAnimationCache.size,
    activeLoads: globalLoadingPromises.size,
    cacheKeys: Array.from(globalAnimationCache.keys())
  }
}