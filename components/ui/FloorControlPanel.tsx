import React, { useState, useEffect } from 'react'
import { MATERIAL_PRESETS } from '../../presets/MaterialPresets'
import * as THREE from 'three'

interface FloorControlPanelProps {
  floorSystem: any
  onSettingsChange?: (settings: any) => void
  className?: string
}

export const FloorControlPanel: React.FC<FloorControlPanelProps> = ({
  floorSystem,
  onSettingsChange,
  className = ''
}) => {
  const [selectedTool, setSelectedTool] = useState<'place' | 'select' | 'delete'>('place')
  const [selectedMaterial, setSelectedMaterial] = useState('medium_frosted')
  const [selectedPreset, setSelectedPreset] = useState('showroom_glass')
  const [qualitySettings, setQualitySettings] = useState({
    enableLOD: true,
    enableBatching: true,
    enableEffects: true,
    autoQuality: true
  })
  const [systemStats, setSystemStats] = useState<any>(null)

  useEffect(() => {
    if (!floorSystem) return

    const unsubscribe = floorSystem.subscribe((state: any) => {
      setSystemStats({
        floorCount: state.floors.size,
        systemHealth: state.systemHealth,
        performanceMetrics: state.performanceMetrics
      })
    })

    return unsubscribe
  }, [floorSystem])

  const handleQualityChange = (key: string, value: any) => {
    const newSettings = { ...qualitySettings, [key]: value }
    setQualitySettings(newSettings)
    onSettingsChange?.(newSettings)
  }

  return (
    <div className={`floor-control-panel ${className}`} style={{
      position: 'fixed',
      top: '20px',
      left: '20px',
      width: '320px',
      backgroundColor: 'rgba(26, 26, 26, 0.95)',
      color: 'white',
      borderRadius: '12px',
      padding: '20px',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '14px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      zIndex: 1000
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '18px',
          fontWeight: '600',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          Floor Control Panel
        </h3>
        {systemStats && (
          <div style={{
            marginTop: '8px',
            fontSize: '12px',
            color: '#999',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <span>Floors: {systemStats.floorCount}</span>
            <span style={{
              color: systemStats.systemHealth === 'excellent' ? '#4CAF50' :
                    systemStats.systemHealth === 'good' ? '#8BC34A' :
                    systemStats.systemHealth === 'degraded' ? '#FF9800' : '#f44336'
            }}>
              {systemStats.systemHealth?.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Tool Selection */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{
          display: 'block',
          marginBottom: '8px',
          fontSize: '12px',
          fontWeight: '500',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          color: '#ccc'
        }}>
          Tool
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'place', label: '🏗️ Place', desc: 'Place new floors' },
            { id: 'select', label: '👆 Select', desc: 'Select and edit floors' },
            { id: 'delete', label: '🗑️ Delete', desc: 'Remove floors' }
          ].map(tool => (
            <button
              key={tool.id}
              onClick={() => setSelectedTool(tool.id as any)}
              title={tool.desc}
              style={{
                flex: 1,
                padding: '12px 8px',
                backgroundColor: selectedTool === tool.id ? '#667eea' : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                boxShadow: selectedTool === tool.id ? '0 4px 12px rgba(102, 126, 234, 0.3)' : 'none'
              }}
            >
              {tool.label}
            </button>
          ))}
        </div>
      </div>

      {/* Material Selection */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{
          display: 'block',
          marginBottom: '8px',
          fontSize: '12px',
          fontWeight: '500',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          color: '#ccc'
        }}>
          Glass Type
        </label>
        <select
          value={selectedMaterial}
          onChange={(e) => setSelectedMaterial(e.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            fontSize: '14px',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="clear_frosted">Clear Frosted</option>
          <option value="light_frosted">Light Frosted</option>
          <option value="medium_frosted">Medium Frosted</option>
          <option value="heavy_frosted">Heavy Frosted</option>
        </select>
      </div>

      {/* Material Preset */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{
          display: 'block',
          marginBottom: '8px',
          fontSize: '12px',
          fontWeight: '500',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          color: '#ccc'
        }}>
          Material Preset
        </label>
        <select
          value={selectedPreset}
          onChange={(e) => setSelectedPreset(e.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            fontSize: '14px',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          {Object.entries(MATERIAL_PRESETS).map(([key, preset]) => (
            <option key={key} value={key}>
              {preset.name}
            </option>
          ))}
        </select>
        <div style={{
          marginTop: '4px',
          fontSize: '11px',
          color: '#999',
          fontStyle: 'italic'
        }}>
          {MATERIAL_PRESETS[selectedPreset]?.description}
        </div>
      </div>

      {/* Quality Settings */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{
          display: 'block',
          marginBottom: '12px',
          fontSize: '12px',
          fontWeight: '500',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          color: '#ccc'
        }}>
          Quality Settings
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { key: 'enableLOD', label: 'Level of Detail', desc: 'Optimize rendering based on distance' },
            { key: 'enableBatching', label: 'Transparency Batching', desc: 'Group similar materials for performance' },
            { key: 'enableEffects', label: 'Advanced Effects', desc: 'Caustics, reflections, and lighting' },
            { key: 'autoQuality', label: 'Auto Quality', desc: 'Automatically adjust quality for performance' }
          ].map(setting => (
            <label key={setting.key} style={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              transition: 'background-color 0.2s ease'
            }}>
              <input
                type="checkbox"
                checked={qualitySettings[setting.key as keyof typeof qualitySettings]}
                onChange={(e) => handleQualityChange(setting.key, e.target.checked)}
                style={{
                  marginRight: '12px',
                  width: '16px',
                  height: '16px',
                  accentColor: '#667eea',
                  cursor: 'pointer'
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '500' }}>
                  {setting.label}
                </div>
                <div style={{ fontSize: '11px', color: '#999' }}>
                  {setting.desc}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Performance Stats */}
      {systemStats?.performanceMetrics && (
        <div style={{
          padding: '16px',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          borderLeft: `4px solid ${
            systemStats.performanceMetrics.fps > 50 ? '#4CAF50' :
            systemStats.performanceMetrics.fps > 30 ? '#FF9800' : '#f44336'
          }`
        }}>
          <div style={{
            fontSize: '12px',
            fontWeight: '500',
            marginBottom: '8px',
            color: '#ccc'
          }}>
            Performance
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
            <div>
              <span style={{ color: '#999' }}>FPS:</span>{' '}
              <span style={{ fontWeight: '600' }}>
                {systemStats.performanceMetrics.fps.toFixed(1)}
              </span>
            </div>
            <div>
              <span style={{ color: '#999' }}>Memory:</span>{' '}
              <span style={{ fontWeight: '600' }}>
                {systemStats.performanceMetrics.memoryUsed.toFixed(0)}MB
              </span>
            </div>
            <div>
              <span style={{ color: '#999' }}>Draw Calls:</span>{' '}
              <span style={{ fontWeight: '600' }}>
                {systemStats.performanceMetrics.drawCalls}
              </span>
            </div>
            <div>
              <span style={{ color: '#999' }}>Triangles:</span>{' '}
              <span style={{ fontWeight: '600' }}>
                {(systemStats.performanceMetrics.triangles / 1000).toFixed(1)}K
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
