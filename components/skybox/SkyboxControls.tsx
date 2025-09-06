'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { Color } from 'three'
import {
  useSkyboxStore,
  useSkyboxCurrentPreset,
  useSkyboxIsTransitioning,
  useSkyboxPresets,
  useSkyboxError,
  useSkyboxConfig
} from '../../store/skyboxStore'
import { SkyboxPreset, PerformanceMode } from '../../types/skybox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Button } from '../ui/button'
import { Slider } from '../ui/slider'
import { Switch } from '../ui/switch'
import { Label } from '../ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Separator } from '../ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'

interface SkyboxControlsProps {
  className?: string
  compact?: boolean
  showAdvanced?: boolean
  onPresetChange?: (presetId: string) => void
  onError?: (error: string) => void
}

/**
 * UI controls for skybox management
 * Provides user interface for selecting presets, adjusting settings, and monitoring performance
 */
export function SkyboxControls({
  className = '',
  compact = false,
  showAdvanced = true,
  onPresetChange,
  onError
}: SkyboxControlsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('presets')

  // Store subscriptions
  const currentPreset = useSkyboxCurrentPreset()
  const isTransitioning = useSkyboxIsTransitioning()
  const presets = useSkyboxPresets()
  const error = useSkyboxError()
  const config = useSkyboxConfig()

  const {
    setCurrentPreset,
    updateConfig,
    setPerformanceMode,
    clearError,
    addPreset,
    removePreset,
    duplicatePreset,
    clearCache,
    optimizeCache,
    performance
  } = useSkyboxStore()

  // Memoized preset list
  const presetList = useMemo(() => {
    return Object.values(presets).sort((a, b) => {
      // Sort by load priority, then by name
      if (a.performance.loadPriority !== b.performance.loadPriority) {
        return b.performance.loadPriority - a.performance.loadPriority
      }
      return a.name.localeCompare(b.name)
    })
  }, [presets])

  // Handle preset selection
  const handlePresetSelect = useCallback(async (presetId: string) => {
    try {
      clearError()
      await setCurrentPreset(presetId)
      onPresetChange?.(presetId)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to change skybox'
      onError?.(errorMessage)
    }
  }, [setCurrentPreset, clearError, onPresetChange, onError])

  // Handle configuration changes
  const handleConfigChange = useCallback((key: keyof typeof config, value: any) => {
    updateConfig({ [key]: value })
  }, [updateConfig])

  // Handle performance mode change
  const handlePerformanceModeChange = useCallback((mode: PerformanceMode) => {
    setPerformanceMode(mode)
  }, [setPerformanceMode])

  // Preset grid component
  const PresetGrid = useMemo(() => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {presetList.map((preset) => (
        <div
          key={preset.id}
          className={`
            relative p-3 rounded-lg border-2 cursor-pointer transition-all duration-200
            ${currentPreset === preset.id
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }
            ${isTransitioning ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          onClick={() => !isTransitioning && handlePresetSelect(preset.id)}
        >
          {/* Preset preview - simplified color representation */}
          <div
            className="w-full h-20 rounded mb-2"
            style={{
              background: `linear-gradient(135deg,
                rgb(${Math.round(preset.tint.r * 255)}, ${Math.round(preset.tint.g * 255)}, ${Math.round(preset.tint.b * 255)}),
                rgba(${Math.round(preset.tint.r * 255)}, ${Math.round(preset.tint.g * 255)}, ${Math.round(preset.tint.b * 255)}, 0.5)
              )`
            }}
          />

          <div className="text-sm font-medium truncate">{preset.name}</div>
          <div className="text-xs text-gray-500 truncate">{preset.description || preset.id}</div>

          {/* Quality indicator */}
          <div className="absolute top-2 right-2">
            <span className={`
              px-1.5 py-0.5 text-xs rounded font-medium
              ${preset.performance.quality === 'high' ? 'bg-green-100 text-green-800' :
                preset.performance.quality === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }
            `}>
              {preset.performance.quality}
            </span>
          </div>

          {/* Loading indicator */}
          {isTransitioning && currentPreset === preset.id && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 rounded-lg">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
            </div>
          )}
        </div>
      ))}
    </div>
  ), [presetList, currentPreset, isTransitioning, handlePresetSelect])

  // Settings panel component
  const SettingsPanel = useMemo(() => (
    <div className="space-y-6">
      {/* Transition Settings */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Transition Duration</Label>
        <div className="flex items-center space-x-3">
          <Slider
            value={[config.transitionDuration]}
            onValueChange={(value) => handleConfigChange('transitionDuration', value[0])}
            max={3000}
            min={100}
            step={100}
            className="flex-1"
          />
          <span className="text-sm text-gray-500 min-w-[60px]">
            {config.transitionDuration}ms
          </span>
        </div>
      </div>

      {/* Performance Mode */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Performance Mode</Label>
        <div className="flex space-x-2">
          {(['performance', 'balanced', 'quality'] as const).map((mode) => (
            <Button
              key={mode}
              variant={config.performanceMode === mode ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePerformanceModeChange(mode)}
              className="capitalize"
            >
              {mode}
            </Button>
          ))}
        </div>
      </div>

      {/* Atmospheric Effects */}
      <div className="flex items-center justify-between">
        <Label htmlFor="atmospheric-effects" className="text-sm font-medium">
          Atmospheric Effects
        </Label>
        <Switch
          id="atmospheric-effects"
          checked={config.enableAtmosphericEffects}
          onCheckedChange={(checked) => handleConfigChange('enableAtmosphericEffects', checked)}
        />
      </div>

      {/* Auto-load Next Skybox */}
      <div className="flex items-center justify-between">
        <Label htmlFor="auto-load" className="text-sm font-medium">
          Auto-load Next Skybox
        </Label>
        <Switch
          id="auto-load"
          checked={config.autoLoadNextSkybox}
          onCheckedChange={(checked) => handleConfigChange('autoLoadNextSkybox', checked)}
        />
      </div>

      {/* Cache Settings */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Cache Size Limit</Label>
        <div className="flex items-center space-x-3">
          <Slider
            value={[config.maxCacheSize]}
            onValueChange={(value) => handleConfigChange('maxCacheSize', value[0])}
            max={512}
            min={64}
            step={32}
            className="flex-1"
          />
          <span className="text-sm text-gray-500 min-w-[60px]">
            {config.maxCacheSize}MB
          </span>
        </div>
      </div>
    </div>
  ), [config, handleConfigChange, handlePerformanceModeChange])

  // Performance panel component
  const PerformancePanel = useMemo(() => (
    <div className="space-y-4">
      {/* Performance Metrics */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="space-y-1">
          <div className="text-gray-500">Memory Usage</div>
          <div className="font-medium">{performance.memoryUsage.toFixed(1)} MB</div>
        </div>
        <div className="space-y-1">
          <div className="text-gray-500">Load Time</div>
          <div className="font-medium">{performance.loadTime.toFixed(0)} ms</div>
        </div>
        <div className="space-y-1">
          <div className="text-gray-500">Frame Impact</div>
          <div className={`font-medium ${performance.frameImpact < -5 ? 'text-red-500' : 'text-green-500'}`}>
            {performance.frameImpact.toFixed(1)} fps
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-gray-500">Cache Hit Rate</div>
          <div className="font-medium">{(performance.cacheHitRate * 100).toFixed(0)}%</div>
        </div>
      </div>

      <Separator />

      {/* Cache Management */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Cache Management</Label>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={optimizeCache}
            disabled={isTransitioning}
          >
            Optimize Cache
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={clearCache}
            disabled={isTransitioning}
          >
            Clear Cache
          </Button>
        </div>
      </div>

      {/* Current Texture Info */}
      {currentPreset && presets[currentPreset] && (
        <>
          <Separator />
          <div className="space-y-2 text-sm">
            <Label className="font-medium">Current Skybox</Label>
            <div className="space-y-1 text-gray-600 dark:text-gray-400">
              <div>Name: {presets[currentPreset].name}</div>
              <div>Quality: {presets[currentPreset].performance.quality}</div>
              <div>Resolution: {performance.textureResolution}</div>
              <div>Intensity: {presets[currentPreset].intensity}</div>
            </div>
          </div>
        </>
      )}
    </div>
  ), [performance, currentPreset, presets, optimizeCache, clearCache, isTransitioning])

  // Compact view for smaller UI spaces
  if (compact) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <select
          value={currentPreset || ''}
          onChange={(e) => e.target.value && handlePresetSelect(e.target.value)}
          disabled={isTransitioning}
          className="px-3 py-1 border rounded text-sm bg-background"
        >
          <option value="">Select Skybox</option>
          {presetList.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>

        {isTransitioning && (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
        )}
      </div>
    )
  }

  // Full controls interface
  return (
    <div className={className}>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="relative">
            Skybox Controls
            {isTransitioning && (
              <div className="absolute -top-1 -right-1 h-3 w-3">
                <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <div className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
              </div>
            )}
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Skybox Controls</DialogTitle>
          </DialogHeader>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md mb-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearError}
                  className="h-6 w-6 p-0"
                >
                  ×
                </Button>
              </div>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="presets">Presets</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
            </TabsList>

            <TabsContent value="presets" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Available Skyboxes</h3>
                <div className="text-sm text-gray-500">
                  {presetList.length} presets
                </div>
              </div>
              {PresetGrid}
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <h3 className="text-lg font-medium">Skybox Settings</h3>
              {SettingsPanel}
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              <h3 className="text-lg font-medium">Performance Monitor</h3>
              {PerformancePanel}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SkyboxControls
