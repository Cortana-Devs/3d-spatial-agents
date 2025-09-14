import React from 'react'
import { usePerformanceMonitor } from '@systems/PerformanceMonitor'
import { FloorDebugData } from '../types/debug'

export const FloorInspectorPanel: React.FC<{
  floors: any[]
  selectedFloor: string | null
  floorDebugData: Map<string, FloorDebugData>
}> = ({ floors, selectedFloor, floorDebugData }) => {
  const selectedFloorData = selectedFloor ? floorDebugData.get(selectedFloor) : null

  return (
    <div>
      <h4>Floor Inspector</h4>
      
      {!selectedFloor ? (
        <div style={{ color: '#999', fontStyle: 'italic' }}>
          Select a floor in the scene to inspect its properties
        </div>
      ) : (
        <div>
          <h5>Floor ID: {selectedFloor}</h5>
          
          {selectedFloorData && (
            <div style={{ fontSize: '12px' }}>
              <div style={{ marginBottom: '15px' }}>
                <h6>Material Properties:</h6>
                <div style={{ backgroundColor: '#333', padding: '10px', borderRadius: '4px' }}>
                  <div>Type: {selectedFloorData.materialProperties.glassType}</div>
                  <div>Transparency: {selectedFloorData.materialProperties.transparency.toFixed(3)}</div>
                  <div>Roughness: {selectedFloorData.materialProperties.roughness.toFixed(3)}</div>
                  <div>Color: #{selectedFloorData.materialProperties.colorTint}</div>
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <h6>Navigation Properties:</h6>
                <div style={{ backgroundColor: '#333', padding: '10px', borderRadius: '4px' }}>
                  <div>Walkable: {selectedFloorData.navigationProperties.walkable ? 'Yes' : 'No'}</div>
                  <div>Safety Level: {selectedFloorData.navigationProperties.safetyLevel}</div>
                  <div>Slippery: {selectedFloorData.navigationProperties.slippery ? 'Yes' : 'No'}</div>
                  <div>Navigation Cost: {selectedFloorData.navigationProperties.navigationCost.toFixed(2)}</div>
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <h6>Performance Data:</h6>
                <div style={{ backgroundColor: '#333', padding: '10px', borderRadius: '4px' }}>
                  <div>LOD Level: {selectedFloorData.performanceData.lodLevel}</div>
                  <div>Render Cost: {selectedFloorData.performanceData.renderCost}</div>
                  <div>Memory Usage: {selectedFloorData.performanceData.memoryUsage}KB</div>
                </div>
              </div>

              <div>
                <h6>Rendering Info:</h6>
                <div style={{ backgroundColor: '#333', padding: '10px', borderRadius: '4px' }}>
                  <div>Vertices: {selectedFloorData.renderingInfo.vertexCount}</div>
                  <div>Triangles: {selectedFloorData.renderingInfo.triangleCount}</div>
                  <div>Texture Res: {selectedFloorData.renderingInfo.textureResolution}px</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export const PerformanceMonitorPanel: React.FC<{
  floors: any[]
  debugMode: string
}> = ({ floors, debugMode }) => {
  const { monitor, metrics, grade } = usePerformanceMonitor()

  return (
    <div>
      <h4>Performance Monitor</h4>
      
      {metrics ? (
        <div style={{ fontSize: '12px' }}>
          <div style={{ 
            padding: '10px', 
            backgroundColor: '#333', 
            borderRadius: '4px',
            marginBottom: '15px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>FPS:</span>
              <span style={{ color: metrics.fps > 50 ? '#4CAF50' : metrics.fps > 30 ? '#FF9800' : '#f44336' }}>
                {metrics.fps.toFixed(1)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Frame Time:</span>
              <span>{metrics.frameTime.toFixed(1)}ms</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Memory:</span>
              <span>{metrics.memoryUsed.toFixed(1)}MB</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Draw Calls:</span>
              <span>{metrics.drawCalls}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Triangles:</span>
              <span>{metrics.triangles.toLocaleString()}</span>
            </div>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <div style={{ marginBottom: '5px' }}>Performance Grade:</div>
            <div style={{
              padding: '8px',
              backgroundColor: grade === 'excellent' ? '#4CAF50' :
                            grade === 'good' ? '#8BC34A' :
                            grade === 'fair' ? '#FF9800' : '#f44336',
              borderRadius: '4px',
              textAlign: 'center',
              fontWeight: 'bold',
              textTransform: 'uppercase'
            }}>
              {grade}
            </div>
          </div>

          <div>
            <div style={{ marginBottom: '5px' }}>Active Floors: {floors.length}</div>
            <div>Transparent Objects: {metrics.transparentObjects}</div>
          </div>
        </div>
      ) : (
        <div style={{ color: '#999', fontStyle: 'italic' }}>
          Loading performance data...
        </div>
      )}
    </div>
  )
}

export const AIAnalyzerPanel: React.FC<{
  floors: any[]
  selectedFloor: string | null
  floorDebugData: Map<string, FloorDebugData>
}> = ({ floors, selectedFloor, floorDebugData }) => {
  const aiAnalyses = floors.map(floor => ({
    floorId: floor.id,
    analysis: floorDebugData.get(floor.id)?.aiAnalysis
  }))

  return (
    <div>
      <h4>AI Analysis</h4>
      
      <div style={{ marginBottom: '15px', fontSize: '12px' }}>
        <h6>Floor Safety Overview:</h6>
        {aiAnalyses.map(({ floorId, analysis }) => (
          <div key={floorId} style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '5px',
            backgroundColor: selectedFloor === floorId ? '#333' : 'transparent',
            borderRadius: '3px',
            margin: '2px 0'
          }}>
            <span>Floor {floorId.slice(-4)}</span>
            <span style={{
              color: analysis?.safetyLevel === 'safe' ? '#4CAF50' :
                    analysis?.safetyLevel === 'caution' ? '#FF9800' :
                    analysis?.safetyLevel === 'risky' ? '#FF5722' : '#f44336'
            }}>
              {analysis?.safetyLevel?.toUpperCase() || 'N/A'}
            </span>
          </div>
        ))}
      </div>

      {selectedFloor && floorDebugData.get(selectedFloor) && (
        <div style={{ fontSize: '12px' }}>
          <h6>Detailed AI Analysis:</h6>
          <div style={{ backgroundColor: '#333', padding: '10px', borderRadius: '4px' }}>
            {Object.entries(floorDebugData.get(selectedFloor)!.aiAnalysis).map(([key, value]) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                <span style={{ textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1')}:</span>
                <span>
                  {typeof value === 'boolean' ? (value ? 'Yes' : 'No') :
                   typeof value === 'number' ? value.toFixed(2) :
                   String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export const MaterialEditorPanel: React.FC<{
  floors: any[]
  selectedFloor: string | null
  onFloorUpdate: (floor: any) => void
}> = ({ floors, selectedFloor, onFloorUpdate }) => {
  const selectedFloorObj = floors.find(floor => floor.id === selectedFloor)

  const handlePropertyChange = (property: string, value: any) => {
    if (!selectedFloorObj) return

    selectedFloorObj[property] = value
    onFloorUpdate(selectedFloorObj)
  }

  if (!selectedFloor || !selectedFloorObj) {
    return (
      <div>
        <h4>Material Editor</h4>
        <div style={{ color: '#999', fontStyle: 'italic' }}>
          Select a floor to edit its material properties
        </div>
      </div>
    )
  }

  return (
    <div>
      <h4>Material Editor</h4>
      <div style={{ fontSize: '12px' }}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Transparency:</label>
          <input
            type="range"
            min="0.1"
            max="0.9"
            step="0.01"
            value={selectedFloorObj.transparency}
            onChange={(e) => handlePropertyChange('transparency', parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
          <div style={{ textAlign: 'center', color: '#999' }}>
            {selectedFloorObj.transparency.toFixed(2)}
          </div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Roughness:</label>
          <input
            type="range"
            min="0.1"
            max="0.9"
            step="0.01"
            value={selectedFloorObj.roughness}
            onChange={(e) => handlePropertyChange('roughness', parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
          <div style={{ textAlign: 'center', color: '#999' }}>
            {selectedFloorObj.roughness.toFixed(2)}
          </div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Glass Type:</label>
          <select
            value={selectedFloorObj.glassType}
            onChange={(e) => handlePropertyChange('glassType', e.target.value)}
            style={{
              width: '100%',
              padding: '5px',
              backgroundColor: '#333',
              color: 'white',
              border: '1px solid #555',
              borderRadius: '3px'
            }}
          >
            <option value="clear_frosted">Clear Frosted</option>
            <option value="light_frosted">Light Frosted</option>
            <option value="medium_frosted">Medium Frosted</option>
            <option value="heavy_frosted">Heavy Frosted</option>
          </select>
        </div>
      </div>
    </div>
  )
}

export const RenderDebuggerPanel: React.FC<{
  floors: any[]
  debugMode: string
}> = ({ floors, debugMode }) => {
  return (
    <div style={{ display: 'flex', gap: '20px', height: '100%' }}>
      <div style={{ flex: 1 }}>
        <h4>Render Statistics</h4>
        <div style={{ fontSize: '12px' }}>
          <div>Total Floors: {floors.length}</div>
          <div>Unique Materials: {new Set(floors.map(f => f.glassType)).size}</div>
          <div>Transparency Range: {Math.min(...floors.map(f => f.transparency)).toFixed(2)} - {Math.max(...floors.map(f => f.transparency)).toFixed(2)}</div>
        </div>
      </div>
      
      <div style={{ flex: 1 }}>
        <h4>Debug Visualizations</h4>
        <div style={{ fontSize: '12px' }}>
          <div>Mode: {debugMode}</div>
          <div>Wireframe: Off</div>
          <div>Bounding Boxes: Off</div>
          <div>Normal Vectors: Off</div>
        </div>
      </div>
    </div>
  )
}
