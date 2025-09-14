'use client'

import React, { useState, useEffect } from 'react'
import { useWorldStore } from '../../store/worldStore'
import { useSafeCameraMode } from '../../hooks/useSafeCameraMode'
import { CameraMode } from '../../types'

interface CameraModeDebugProps {
  enabled?: boolean
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  compact?: boolean
}

export function CameraModeDebug({
  enabled = true,
  position = 'bottom-right',
  compact = false
}: CameraModeDebugProps) {
  const { activeCamera } = useWorldStore()
  const safeCameraMode = useSafeCameraMode({
    enableKeyboardShortcuts: false,
    enableDoubleClickFocus: false
  })

  const [modeHistory, setModeHistory] = useState<Array<{
    mode: CameraMode
    timestamp: number
    reason?: string
  }>>([])

  const [lastDoubleClick, setLastDoubleClick] = useState<number>(0)
  const [lastKeyPress, setLastKeyPress] = useState<string>('')

  // Track mode changes
  useEffect(() => {
    setModeHistory(prev => [
      ...prev.slice(-9), // Keep last 10 entries
      {
        mode: activeCamera as CameraMode,
        timestamp: Date.now(),
        reason: 'state_change'
      }
    ])
  }, [activeCamera])

  // Track double-clicks globally
  useEffect(() => {
    const handleDoubleClick = () => {
      setLastDoubleClick(Date.now())
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'c') {
        setLastKeyPress(`Ctrl+C (${Date.now()})`)
      }
    }

    document.addEventListener('dblclick', handleDoubleClick)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('dblclick', handleDoubleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  if (!enabled) return null

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  }

  const debugInfo = safeCameraMode.getDebugInfo()
  const now = Date.now()

  return (
    <div className={`fixed ${positionClasses[position]} z-[999] bg-black/90 text-white p-3 rounded-lg text-xs font-mono border border-white/20 backdrop-blur-sm`}>
      <div className="text-green-400 font-bold mb-2">
        🎥 Camera Mode Debug {compact && '(Compact)'}
      </div>

      {/* Current State */}
      <div className="space-y-1 mb-3">
        <div>
          <span className="text-blue-300">Current:</span>
          <span className={`ml-1 px-1 rounded ${
            activeCamera === 'cinematic' ? 'bg-red-500/30' :
            activeCamera === 'orbit' ? 'bg-green-500/30' :
            activeCamera === 'fly' ? 'bg-blue-500/30' : 'bg-yellow-500/30'
          }`}>
            {activeCamera}
          </span>
        </div>
        <div>
          <span className="text-blue-300">Transitioning:</span>
          <span className={`ml-1 ${debugInfo.isTransitioning ? 'text-red-400' : 'text-green-400'}`}>
            {debugInfo.isTransitioning ? 'YES' : 'NO'}
          </span>
        </div>
        <div>
          <span className="text-blue-300">Can Change:</span>
          <span className={`ml-1 ${debugInfo.canChangeMode ? 'text-green-400' : 'text-red-400'}`}>
            {debugInfo.canChangeMode ? 'YES' : 'NO'}
          </span>
        </div>
      </div>

      {!compact && (
        <>
          {/* Timing Info */}
          <div className="space-y-1 mb-3 text-xs">
            <div className="text-yellow-300">Timing:</div>
            <div>Last Change: {debugInfo.timeSinceLastChange}ms ago</div>
            <div>Min Delay: {debugInfo.config.minModeChangeDelay}ms</div>
            <div>Last DblClick: {now - lastDoubleClick}ms ago</div>
            {lastKeyPress && <div>Last Key: {lastKeyPress}</div>}
          </div>

          {/* Recent Mode History */}
          <div className="space-y-1 mb-3">
            <div className="text-yellow-300">Recent Changes:</div>
            <div className="max-h-20 overflow-y-auto space-y-1">
              {modeHistory.slice(-5).reverse().map((entry, idx) => (
                <div key={idx} className="text-xs">
                  <span className={`px-1 rounded text-[10px] ${
                    entry.mode === 'cinematic' ? 'bg-red-500/30' :
                    entry.mode === 'orbit' ? 'bg-green-500/30' :
                    entry.mode === 'fly' ? 'bg-blue-500/30' : 'bg-yellow-500/30'
                  }`}>
                    {entry.mode}
                  </span>
                  <span className="text-gray-400 ml-1">
                    {now - entry.timestamp < 1000 ? 'just now' : `${Math.round((now - entry.timestamp)/1000)}s ago`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Configuration */}
          <div className="space-y-1 mb-3 text-xs">
            <div className="text-yellow-300">Protection:</div>
            <div>DblClick Focus: {debugInfo.config.enableDoubleClickFocus ? '✅' : '❌'}</div>
            <div>Keyboard: {debugInfo.config.enableKeyboardShortcuts ? '✅' : '❌'}</div>
            <div>Anti-Switch: {debugInfo.config.preventUnintentionalSwitches ? '✅' : '❌'}</div>
          </div>
        </>
      )}

      {/* Quick Actions */}
      <div className="space-y-1">
        <div className="text-yellow-300 text-xs">Quick Switch:</div>
        <div className="flex gap-1">
          {(['orbit', 'fly', 'cinematic'] as CameraMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => safeCameraMode.changeCameraMode(mode, false, 'user')}
              disabled={!debugInfo.canChangeMode}
              className={`px-1 py-0.5 text-[10px] rounded border transition-colors ${
                activeCamera === mode
                  ? 'bg-white/20 border-white/40'
                  : debugInfo.canChangeMode
                    ? 'border-white/20 hover:bg-white/10 hover:border-white/40'
                    : 'border-gray-600 text-gray-500 cursor-not-allowed'
              }`}
            >
              {mode.slice(0,3).toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Warnings */}
      {activeCamera === 'cinematic' && (
        <div className="mt-2 p-1 bg-red-500/20 border border-red-500/40 rounded text-xs">
          ⚠️ Cinematic mode active
        </div>
      )}

      {debugInfo.isTransitioning && (
        <div className="mt-2 p-1 bg-yellow-500/20 border border-yellow-500/40 rounded text-xs">
          🔄 Camera transitioning...
        </div>
      )}
    </div>
  )
}

export default CameraModeDebug
