import React, { useState } from 'react'

interface AdvancedDebugInterfaceProps {
  className?: string
}

export const AdvancedDebugInterface: React.FC<AdvancedDebugInterfaceProps> = ({
  className = ''
}) => {
  const [debugMode, setDebugMode] = useState('overview')

  return (
    <div className={`debug-interface ${className}`} style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '800px',
      height: '600px',
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      borderRadius: '12px',
      padding: '20px',
      fontFamily: 'monospace',
      fontSize: '14px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      zIndex: 2000,
      overflow: 'auto'
    }}>
      <h2 style={{
        margin: '0 0 20px 0',
        fontSize: '18px',
        color: '#00ff00',
        borderBottom: '1px solid #333',
        paddingBottom: '10px'
      }}>
        🔧 Advanced Debug Interface
      </h2>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        {['overview', 'floors', 'performance', 'ai', 'materials'].map(mode => (
          <button
            key={mode}
            onClick={() => setDebugMode(mode)}
            style={{
              padding: '8px 16px',
              backgroundColor: debugMode === mode ? '#333' : '#111',
              color: debugMode === mode ? '#00ff00' : '#ccc',
              border: '1px solid #444',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              textTransform: 'capitalize'
            }}
          >
            {mode}
          </button>
        ))}
      </div>

      <div style={{
        height: '400px',
        overflowY: 'auto',
        border: '1px solid #333',
        padding: '15px',
        borderRadius: '6px',
        backgroundColor: '#111'
      }}>
        {debugMode === 'overview' && (
          <div>
            <h3 style={{ color: '#00ff00', marginTop: 0 }}>System Overview</h3>
            <div>
              <div>Status: <span style={{ color: '#00ff00' }}>Active</span></div>
              <div>Version: 1.0.0</div>
              <div>Build: Production</div>
              <div>Memory Usage: 124 MB</div>
              <div>Active Floors: 0</div>
            </div>
          </div>
        )}

        {debugMode === 'floors' && (
          <div>
            <h3 style={{ color: '#00ff00', marginTop: 0 }}>Floor Debug</h3>
            <div>
              <div>Total Floors: 0</div>
              <div>Visible Floors: 0</div>
              <div>LOD Levels Active: 0</div>
              <div>Batched Materials: 0</div>
            </div>
          </div>
        )}

        {debugMode === 'performance' && (
          <div>
            <h3 style={{ color: '#00ff00', marginTop: 0 }}>Performance</h3>
            <div>
              <div>FPS: 60</div>
              <div>Frame Time: 16.7ms</div>
              <div>Draw Calls: 5</div>
              <div>Triangles: 1.2K</div>
            </div>
          </div>
        )}

        {debugMode === 'ai' && (
          <div>
            <h3 style={{ color: '#00ff00', marginTop: 0 }}>AI Navigation</h3>
            <div>
              <div>NavMesh Nodes: 0</div>
              <div>PathFinding: Inactive</div>
              <div>Safety Analysis: Ready</div>
            </div>
          </div>
        )}

        {debugMode === 'materials' && (
          <div>
            <h3 style={{ color: '#00ff00', marginTop: 0 }}>Material System</h3>
            <div>
              <div>Active Materials: 0</div>
              <div>Shader Programs: 2</div>
              <div>Texture Memory: 0 MB</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdvancedDebugInterface
