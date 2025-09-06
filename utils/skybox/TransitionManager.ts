import { CubeTexture } from 'three'
import {
  TransitionConfig,
  SkyboxError,
  SkyboxErrorType,
  DEFAULT_TRANSITION_CONFIG
} from '../../types/skybox'

export class SkyboxTransitionManager {
  private isTransitioning = false
  private transitionProgress = 0
  private currentTransition: {
    from: CubeTexture | null
    to: CubeTexture
    config: TransitionConfig
    startTime: number
    onProgress?: (progress: number) => void
    onComplete?: () => void
    onError?: (error: Error) => void
    animationId?: number
  } | null = null

  private abortController: AbortController | null = null

  /**
   * Transition from current skybox to new skybox with smooth animation
   */
  async transitionTo(
    fromTexture: CubeTexture | null,
    toTexture: CubeTexture,
    config: Partial<TransitionConfig> = {},
    callbacks: {
      onProgress?: (progress: number, fromTexture: CubeTexture | null, toTexture: CubeTexture, blendFactor: number) => void
      onComplete?: () => void
      onError?: (error: Error) => void
    } = {}
  ): Promise<void> {
    if (this.isTransitioning) {
      this.cancelTransition()
    }

    const fullConfig: TransitionConfig = {
      ...DEFAULT_TRANSITION_CONFIG,
      ...config
    }

    this.abortController = new AbortController()
    this.isTransitioning = true
    this.transitionProgress = 0

    this.currentTransition = {
      from: fromTexture,
      to: toTexture,
      config: fullConfig,
      startTime: performance.now(),
      onProgress: callbacks.onProgress,
      onComplete: callbacks.onComplete,
      onError: callbacks.onError
    }

    return new Promise((resolve, reject) => {
      const animate = (currentTime: number) => {
        if (!this.currentTransition || this.abortController?.signal.aborted) {
          reject(new SkyboxError(
            SkyboxErrorType.TRANSITION_FAILED,
            'Transition was cancelled'
          ))
          return
        }

        const elapsed = currentTime - this.currentTransition.startTime
        const rawProgress = Math.min(elapsed / this.currentTransition.config.duration, 1)

        // Apply easing function
        this.transitionProgress = this.applyEasing(rawProgress, this.currentTransition.config.easing)

        // Calculate blend factor based on transition type
        const blendFactor = this.calculateBlendFactor(
          this.transitionProgress,
          this.currentTransition.config.type
        )

        try {
          // Call progress callback with blend information
          this.currentTransition.onProgress?.(
            this.transitionProgress,
            this.currentTransition.from,
            this.currentTransition.to,
            blendFactor
          )

          callbacks.onProgress?.(
            this.transitionProgress,
            this.currentTransition.from,
            this.currentTransition.to,
            blendFactor
          )

          if (this.transitionProgress >= 1) {
            // Transition complete
            this.completeTransition()
            callbacks.onComplete?.()
            resolve()
          } else {
            // Continue animation
            this.currentTransition.animationId = requestAnimationFrame(animate)
          }
        } catch (error) {
          const transitionError = new SkyboxError(
            SkyboxErrorType.TRANSITION_FAILED,
            `Transition animation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            undefined,
            error instanceof Error ? error : undefined
          )

          this.currentTransition.onError?.(transitionError)
          callbacks.onError?.(transitionError)
          reject(transitionError)
        }
      }

      // Start the animation
      this.currentTransition.animationId = requestAnimationFrame(animate)
    })
  }

  /**
   * Apply easing function to raw progress value
   */
  private applyEasing(progress: number, easing: TransitionConfig['easing']): number {
    switch (easing) {
      case 'linear':
        return progress

      case 'ease-in':
        return progress * progress

      case 'ease-out':
        return 1 - Math.pow(1 - progress, 2)

      case 'ease-in-out':
        return progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2

      default:
        return progress
    }
  }

  /**
   * Calculate blend factor based on transition type
   */
  private calculateBlendFactor(progress: number, type: TransitionConfig['type']): number {
    switch (type) {
      case 'fade':
        return progress

      case 'cross-fade':
        // Smooth cross-fade where both textures are visible during transition
        return 0.5 + (progress - 0.5) * 0.8 // Gentle S-curve

      case 'slide':
        // For slide transitions, might need different handling
        // For now, treat as fade
        return progress

      default:
        return progress
    }
  }

  /**
   * Cancel current transition
   */
  cancelTransition(): void {
    if (this.currentTransition?.animationId) {
      cancelAnimationFrame(this.currentTransition.animationId)
    }

    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }

    this.isTransitioning = false
    this.transitionProgress = 0
    this.currentTransition = null
  }

  /**
   * Complete the current transition
   */
  private completeTransition(): void {
    if (this.currentTransition?.animationId) {
      cancelAnimationFrame(this.currentTransition.animationId)
    }

    this.isTransitioning = false
    this.transitionProgress = 1

    // Clean up
    const wasTransitioning = this.currentTransition !== null
    this.currentTransition = null
    this.abortController = null

    if (wasTransitioning) {
      // Transition completed successfully
      console.debug('Skybox transition completed successfully')
    }
  }

  /**
   * Get current transition progress (0-1)
   */
  get progress(): number {
    return this.transitionProgress
  }

  /**
   * Check if currently transitioning
   */
  get isActive(): boolean {
    return this.isTransitioning
  }

  /**
   * Get current transition information
   */
  getCurrentTransition(): {
    from: CubeTexture | null
    to: CubeTexture
    config: TransitionConfig
    progress: number
    elapsed: number
  } | null {
    if (!this.currentTransition) return null

    return {
      from: this.currentTransition.from,
      to: this.currentTransition.to,
      config: this.currentTransition.config,
      progress: this.transitionProgress,
      elapsed: performance.now() - this.currentTransition.startTime
    }
  }

  /**
   * Set transition progress manually (for external control)
   */
  setProgress(progress: number): void {
    if (!this.isTransitioning || !this.currentTransition) return

    this.transitionProgress = Math.max(0, Math.min(1, progress))

    const blendFactor = this.calculateBlendFactor(
      this.transitionProgress,
      this.currentTransition.config.type
    )

    this.currentTransition.onProgress?.(
      this.transitionProgress,
      this.currentTransition.from,
      this.currentTransition.to,
      blendFactor
    )

    if (this.transitionProgress >= 1) {
      this.completeTransition()
      this.currentTransition?.onComplete?.()
    }
  }

  /**
   * Quick transition without animation
   */
  async immediateTransition(
    fromTexture: CubeTexture | null,
    toTexture: CubeTexture,
    onComplete?: () => void
  ): Promise<void> {
    this.cancelTransition()

    // Set up immediate transition
    this.isTransitioning = true
    this.transitionProgress = 1

    try {
      // Immediately call with full blend
      onComplete?.()

      // Clean up
      this.isTransitioning = false
      this.transitionProgress = 0
    } catch (error) {
      this.isTransitioning = false
      this.transitionProgress = 0

      throw new SkyboxError(
        SkyboxErrorType.TRANSITION_FAILED,
        `Immediate transition failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Create a timed transition sequence for multiple skyboxes
   */
  async createTransitionSequence(
    transitions: Array<{
      texture: CubeTexture
      duration?: number
      delay?: number
      config?: Partial<TransitionConfig>
    }>,
    onStepComplete?: (index: number, texture: CubeTexture) => void,
    onSequenceComplete?: () => void
  ): Promise<void> {
    let currentTexture: CubeTexture | null = null

    for (let i = 0; i < transitions.length; i++) {
      const transition = transitions[i]

      // Wait for delay if specified
      if (transition.delay && transition.delay > 0) {
        await this.delay(transition.delay)
      }

      // Perform transition
      await this.transitionTo(
        currentTexture,
        transition.texture,
        {
          duration: transition.duration || DEFAULT_TRANSITION_CONFIG.duration,
          ...transition.config
        }
      )

      currentTexture = transition.texture
      onStepComplete?.(i, transition.texture)
    }

    onSequenceComplete?.()
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get transition performance metrics
   */
  getPerformanceMetrics(): {
    averageTransitionTime: number
    totalTransitions: number
    failureRate: number
  } {
    // This would be implemented with actual performance tracking
    // For now, return placeholder values
    return {
      averageTransitionTime: 0,
      totalTransitions: 0,
      failureRate: 0
    }
  }

  /**
   * Cleanup method for component unmount
   */
  destroy(): void {
    this.cancelTransition()
  }
}

// Export singleton instance
export const skyboxTransitionManager = new SkyboxTransitionManager()

// Export class for custom instances
export { SkyboxTransitionManager as SkyboxTransitionManagerClass }
