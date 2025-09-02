/**
 * Simulant Culling System
 * Handles frustum culling and distance-based culling for off-screen simulants
 */

import { Vector3, Frustum, Matrix4, Camera, Box3, Sphere } from 'three'
import type { AISimulant } from '../types'

/**
 * Culling configuration
 */
export interface CullingConfig {
    enableFrustumCulling: boolean
    enableDistanceCulling: boolean
    enableOcclusionCulling: boolean
    maxRenderDistance: number
    cullingMargin: number // Extra margin for smooth transitions
    updateFrequency: number // Hz
    batchSize: number // Number of simulants to process per frame
}

/**
 * Culling result for a simulant
 */
export interface CullingResult {
    simulantId: string
    isVisible: boolean
    distance: number
    inFrustum: boolean
    withinDistance: boolean
    occluded: boolean
    lodLevel: 'high' | 'medium' | 'low' | 'culled'
    lastUpdate: number
}

/**
 * Culling statistics
 */
export interface CullingStats {
    totalSimulants: number
    visibleSimulants: number
    culledSimulants: number
    frustumCulled: number
    distanceCulled: number
    occlusionCulled: number
    averageDistance: number
    cullingEfficiency: number
}

/**
 * Default culling configuration
 */
export const DEFAULT_CULLING_CONFIG: CullingConfig = {
    enableFrustumCulling: true,
    enableDistanceCulling: true,
    enableOcclusionCulling: false, // Disabled by default for performance
    maxRenderDistance: 100,
    cullingMargin: 5,
    updateFrequency: 10, // 10 Hz
    batchSize: 5 // Process 5 simulants per frame
}

/**
 * Simulant culling system
 */
export class SimulantCullingSystem {
    private config: CullingConfig
    private cullingResults = new Map<string, CullingResult>()
    private frustum = new Frustum()
    private cameraMatrix = new Matrix4()
    private cameraPosition = new Vector3()
    private lastUpdateTime = 0
    private currentBatchIndex = 0
    private simulantIds: string[] = []
    private enableLogging: boolean

    constructor(
        config: Partial<CullingConfig> = {},
        options: { enableLogging?: boolean } = {}
    ) {
        this.config = { ...DEFAULT_CULLING_CONFIG, ...config }
        this.enableLogging = options.enableLogging || false

        if (this.enableLogging) {
            console.log('👁️ SimulantCullingSystem initialized')
            console.log('⚙️ Config:', this.config)
        }
    }

    /**
     * Update camera information for culling calculations
     */
    updateCamera(camera: Camera): void {
        this.cameraPosition.setFromMatrixPosition(camera.matrixWorld)

        if (this.config.enableFrustumCulling) {
            this.cameraMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
            this.frustum.setFromProjectionMatrix(this.cameraMatrix)
        }
    }

    /**
     * Update simulant list
     */
    updateSimulants(simulants: AISimulant[]): void {
        this.simulantIds = simulants.map(s => s.id)

        // Remove culling results for simulants that no longer exist
        for (const id of this.cullingResults.keys()) {
            if (!this.simulantIds.includes(id)) {
                this.cullingResults.delete(id)
            }
        }
    }

    /**
     * Perform culling update (call this every frame)
     */
    update(simulants: AISimulant[], deltaTime: number): void {
        const now = Date.now()

        // Check if it's time to update culling
        if (now - this.lastUpdateTime < 1000 / this.config.updateFrequency) {
            return
        }

        this.lastUpdateTime = now

        // Update simulant list if needed
        if (this.simulantIds.length !== simulants.length) {
            this.updateSimulants(simulants)
        }

        // Process simulants in batches to spread work across frames
        this.processBatch(simulants, now)
    }

    /**
     * Process a batch of simulants for culling
     */
    private processBatch(simulants: AISimulant[], now: number): void {
        const batchSize = Math.min(this.config.batchSize, this.simulantIds.length)
        const startIndex = this.currentBatchIndex
        const endIndex = Math.min(startIndex + batchSize, this.simulantIds.length)

        for (let i = startIndex; i < endIndex; i++) {
            const simulant = simulants.find(s => s.id === this.simulantIds[i])
            if (simulant) {
                this.updateSimulantCulling(simulant, now)
            }
        }

        // Move to next batch
        this.currentBatchIndex = endIndex
        if (this.currentBatchIndex >= this.simulantIds.length) {
            this.currentBatchIndex = 0
        }
    }

    /**
     * Update culling for a single simulant
     */
    private updateSimulantCulling(simulant: AISimulant, now: number): void {
        const position = new Vector3(
            simulant.position.x,
            simulant.position.y,
            simulant.position.z
        )

        const distance = this.cameraPosition.distanceTo(position)

        // Distance culling
        const withinDistance = !this.config.enableDistanceCulling ||
            distance <= this.config.maxRenderDistance + this.config.cullingMargin

        // Frustum culling
        let inFrustum = true
        if (this.config.enableFrustumCulling && withinDistance) {
            // Create a bounding sphere for the simulant
            const boundingSphere = new Sphere(position, 1.0) // 1 unit radius
            inFrustum = this.frustum.intersectsSphere(boundingSphere)
        }

        // Occlusion culling (simplified - would need more complex implementation)
        const occluded = false // TODO: Implement occlusion culling if needed

        // Determine visibility
        const isVisible = withinDistance && inFrustum && !occluded

        // Calculate LOD level
        const lodLevel = this.calculateLODLevel(distance, isVisible)

        // Store result
        const result: CullingResult = {
            simulantId: simulant.id,
            isVisible,
            distance,
            inFrustum,
            withinDistance,
            occluded,
            lodLevel,
            lastUpdate: now
        }

        this.cullingResults.set(simulant.id, result)
    }

    /**
     * Calculate LOD level based on distance and visibility
     */
    private calculateLODLevel(distance: number, isVisible: boolean): 'high' | 'medium' | 'low' | 'culled' {
        if (!isVisible) return 'culled'

        const maxDistance = this.config.maxRenderDistance
        const ratio = distance / maxDistance

        if (ratio <= 0.3) return 'high'
        if (ratio <= 0.6) return 'medium'
        if (ratio <= 1.0) return 'low'
        return 'culled'
    }

    /**
     * Get culling result for a simulant
     */
    getCullingResult(simulantId: string): CullingResult | null {
        return this.cullingResults.get(simulantId) || null
    }

    /**
     * Check if simulant is visible
     */
    isSimulantVisible(simulantId: string): boolean {
        const result = this.cullingResults.get(simulantId)
        return result ? result.isVisible : true // Default to visible if no result
    }

    /**
     * Get LOD level for a simulant
     */
    getSimulantLOD(simulantId: string): 'high' | 'medium' | 'low' | 'culled' {
        const result = this.cullingResults.get(simulantId)
        return result ? result.lodLevel : 'high' // Default to high if no result
    }

    /**
     * Get all visible simulants
     */
    getVisibleSimulants(): string[] {
        const visible: string[] = []

        for (const [id, result] of this.cullingResults.entries()) {
            if (result.isVisible) {
                visible.push(id)
            }
        }

        return visible
    }

    /**
     * Get simulants by LOD level
     */
    getSimulantsByLOD(lodLevel: 'high' | 'medium' | 'low' | 'culled'): string[] {
        const simulants: string[] = []

        for (const [id, result] of this.cullingResults.entries()) {
            if (result.lodLevel === lodLevel) {
                simulants.push(id)
            }
        }

        return simulants
    }

    /**
     * Get culling statistics
     */
    getCullingStats(): CullingStats {
        const results = Array.from(this.cullingResults.values())
        const totalSimulants = results.length
        const visibleSimulants = results.filter(r => r.isVisible).length
        const culledSimulants = totalSimulants - visibleSimulants
        const frustumCulled = results.filter(r => !r.inFrustum).length
        const distanceCulled = results.filter(r => !r.withinDistance).length
        const occlusionCulled = results.filter(r => r.occluded).length

        const totalDistance = results.reduce((sum, r) => sum + r.distance, 0)
        const averageDistance = totalSimulants > 0 ? totalDistance / totalSimulants : 0

        const cullingEfficiency = totalSimulants > 0 ? culledSimulants / totalSimulants : 0

        return {
            totalSimulants,
            visibleSimulants,
            culledSimulants,
            frustumCulled,
            distanceCulled,
            occlusionCulled,
            averageDistance,
            cullingEfficiency
        }
    }

    /**
     * Force update all simulants (useful for camera changes)
     */
    forceUpdate(simulants: AISimulant[]): void {
        const now = Date.now()

        for (const simulant of simulants) {
            this.updateSimulantCulling(simulant, now)
        }

        if (this.enableLogging) {
            const stats = this.getCullingStats()
            console.log('🔄 Forced culling update:', {
                visible: stats.visibleSimulants,
                culled: stats.culledSimulants,
                efficiency: `${(stats.cullingEfficiency * 100).toFixed(1)}%`
            })
        }
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<CullingConfig>): void {
        this.config = { ...this.config, ...newConfig }

        if (this.enableLogging) {
            console.log('⚙️ Culling config updated:', newConfig)
        }
    }

    /**
     * Get detailed culling report
     */
    getCullingReport(): {
        config: CullingConfig
        stats: CullingStats
        results: CullingResult[]
        performance: {
            updateFrequency: number
            batchSize: number
            averageProcessingTime: number
        }
    } {
        const stats = this.getCullingStats()
        const results = Array.from(this.cullingResults.values())

        return {
            config: this.config,
            stats,
            results,
            performance: {
                updateFrequency: this.config.updateFrequency,
                batchSize: this.config.batchSize,
                averageProcessingTime: 1000 / this.config.updateFrequency / this.config.batchSize
            }
        }
    }

    /**
     * Clear all culling results
     */
    clear(): void {
        this.cullingResults.clear()
        this.currentBatchIndex = 0
        this.simulantIds = []

        if (this.enableLogging) {
            console.log('🗑️ Culling results cleared')
        }
    }

    /**
     * Dispose of the culling system
     */
    dispose(): void {
        this.clear()

        if (this.enableLogging) {
            console.log('🗑️ SimulantCullingSystem disposed')
        }
    }
}

/**
 * Utility function to create a culling system with sensible defaults
 */
export function createCullingSystem(
    maxRenderDistance: number = 100,
    options: {
        enableLogging?: boolean
        updateFrequency?: number
        batchSize?: number
    } = {}
): SimulantCullingSystem {
    return new SimulantCullingSystem(
        {
            maxRenderDistance,
            updateFrequency: options.updateFrequency || 10,
            batchSize: options.batchSize || 5
        },
        { enableLogging: options.enableLogging }
    )
}