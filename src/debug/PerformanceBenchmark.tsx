import React, { useState, useEffect, useRef } from 'react'

interface PerformanceBenchmarkProps {
  className?: string
}

interface BenchmarkResult {
  test: string
  fps: number
  frameTime: number
  memoryUsage: number
  drawCalls: number
  status: 'running' | 'completed' | 'failed'
}

export const PerformanceBenchmark: React.FC<PerformanceBenchmarkProps> = ({
  className = ''
}) => {
  const [isRunning, setIsRunning] = useState(false)
  const [currentTest, setCurrentTest] = useState<string>('')
  const [results, setResults] = useState<BenchmarkResult[]>([])
  const [progress, setProgress] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout>()

  const benchmarkTests = [
    { name: 'Basic Floor Rendering', description: 'Test basic floor rendering performance' },
    { name: 'Multiple Floors', description: 'Test performance with many floors' },
    { name: 'Transparency Effects', description: 'Test transparency rendering overhead' },
    { name: 'LOD System', description: 'Test level of detail performance impact' },
    { name: 'AI Navigation', description: 'Test AI navigation system performance' },
    { name: 'Advanced Effects', description: 'Test caustics and reflection performance' }
  ]

  const runBenchmark = () => {
    setIsRunning(true)
    setResults([])
    setProgress(0)
    setCurrentTest('Initializing...')

    let testIndex = 0
    intervalRef.current = setInterval(() => {
      if (testIndex >= benchmarkTests.length) {
        setIsRunning(false)
        setCurrentTest('Completed')
        setProgress(100)
        if (intervalRef.current) clearInterval(intervalRef.current)
        return
      }

      const test = benchmarkTests[testIndex]
      setCurrentTest(test.name)

      // Simulate benchmark results
      const mockResult: BenchmarkResult = {
        test: test.name,
        fps: Math.random() * 40 + 30, // 30-70 FPS
        frameTime: Math.random() * 10 + 10, // 10-20ms
        memoryUsage: Math.random() * 200 + 100, // 100-300 MB
        drawCalls: Math.random() * 50 + 10, // 10-60 draw calls
        status: 'completed'
      }

      setResults(prev => [...prev, mockResult])
      setProgress(((testIndex + 1) / benchmarkTests.length) * 100)
      testIndex++
    }, 2000) // 2 seconds per test
  }

  const stopBenchmark = () => {
    setIsRunning(false)
    setCurrentTest('')
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return '#ff9800'
      case 'completed': return '#4caf50'
      case 'failed': return '#f44336'
      default: return '#999'
    }
  }

  const getFPSColor = (fps: number) => {
    if (fps >= 50) return '#4caf50'
    if (fps >= 30) return '#ff9800'
    return '#f44336'
  }

  return (
    <div className={`performance-benchmark ${className}`} style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '900px',
      height: '700px',
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      borderRadius: '12px',
      padding: '20px',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '14px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      zIndex: 2000,
      overflow: 'auto'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        borderBottom: '1px solid #333',
        paddingBottom: '15px'
      }}>
        <h2 style={{
          margin: 0,
          fontSize: '18px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          📊 Performance Benchmark Suite
        </h2>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={runBenchmark}
            disabled={isRunning}
            style={{
              padding: '10px 20px',
              backgroundColor: isRunning ? '#666' : '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              fontWeight: '500'
            }}
          >
            {isRunning ? '⏸️ Running...' : '▶️ Start Benchmark'}
          </button>

          {isRunning && (
            <button
              onClick={stopBenchmark}
              style={{
                padding: '10px 20px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              ⏹️ Stop
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {isRunning && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <span style={{ fontSize: '12px', color: '#ccc' }}>
              Current Test: {currentTest}
            </span>
            <span style={{ fontSize: '12px', color: '#ccc' }}>
              {progress.toFixed(0)}%
            </span>
          </div>
          <div style={{
            width: '100%',
            height: '6px',
            backgroundColor: '#333',
            borderRadius: '3px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              backgroundColor: '#4caf50',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
      )}

      {/* Test Queue */}
      <div style={{
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: '#111',
        borderRadius: '8px',
        border: '1px solid #333'
      }}>
        <h3 style={{
          margin: '0 0 15px 0',
          fontSize: '14px',
          color: '#ccc',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Benchmark Tests
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '10px'
        }}>
          {benchmarkTests.map((test, index) => (
            <div
              key={test.name}
              style={{
                padding: '10px',
                backgroundColor: currentTest === test.name ? '#333' : '#1a1a1a',
                borderRadius: '6px',
                border: `1px solid ${currentTest === test.name ? '#4caf50' : '#333'}`,
                opacity: results.some(r => r.test === test.name) ? 1 : 0.6
              }}
            >
              <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                {test.name}
              </div>
              <div style={{ fontSize: '11px', color: '#999' }}>
                {test.description}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Results Table */}
      {results.length > 0 && (
        <div style={{
          backgroundColor: '#111',
          borderRadius: '8px',
          border: '1px solid #333',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '15px',
            borderBottom: '1px solid #333',
            backgroundColor: '#1a1a1a'
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '14px',
              color: '#ccc',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Benchmark Results
            </h3>
          </div>

          <div style={{ padding: '15px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr',
              gap: '15px',
              padding: '10px',
              backgroundColor: '#222',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '600',
              color: '#ccc',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '10px'
            }}>
              <div>Test</div>
              <div>FPS</div>
              <div>Frame Time</div>
              <div>Memory</div>
              <div>Draw Calls</div>
              <div>Status</div>
            </div>

            {results.map((result, index) => (
              <div
                key={index}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr',
                  gap: '15px',
                  padding: '12px',
                  backgroundColor: index % 2 === 0 ? '#1a1a1a' : '#111',
                  borderRadius: '4px',
                  fontSize: '13px',
                  alignItems: 'center'
                }}
              >
                <div style={{ fontWeight: '500' }}>{result.test}</div>
                <div style={{ color: getFPSColor(result.fps), fontWeight: '600' }}>
                  {result.fps.toFixed(1)}
                </div>
                <div>{result.frameTime.toFixed(1)}ms</div>
                <div>{result.memoryUsage.toFixed(0)}MB</div>
                <div>{result.drawCalls.toFixed(0)}</div>
                <div style={{
                  color: getStatusColor(result.status),
                  fontWeight: '500',
                  textTransform: 'capitalize'
                }}>
                  {result.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {results.length === benchmarkTests.length && !isRunning && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#1a1a1a',
          borderRadius: '8px',
          border: '1px solid #333'
        }}>
          <h3 style={{
            margin: '0 0 10px 0',
            fontSize: '14px',
            color: '#4caf50'
          }}>
            📈 Benchmark Summary
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '15px',
            fontSize: '12px'
          }}>
            <div>
              <div style={{ color: '#999', marginBottom: '4px' }}>Average FPS</div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#4caf50' }}>
                {(results.reduce((sum, r) => sum + r.fps, 0) / results.length).toFixed(1)}
              </div>
            </div>
            <div>
              <div style={{ color: '#999', marginBottom: '4px' }}>Avg Frame Time</div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#ff9800' }}>
                {(results.reduce((sum, r) => sum + r.frameTime, 0) / results.length).toFixed(1)}ms
              </div>
            </div>
            <div>
              <div style={{ color: '#999', marginBottom: '4px' }}>Peak Memory</div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#2196f3' }}>
                {Math.max(...results.map(r => r.memoryUsage)).toFixed(0)}MB
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PerformanceBenchmark
