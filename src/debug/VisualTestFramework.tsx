import React, { useState, useEffect, useRef } from 'react'

interface VisualTestFrameworkProps {
  className?: string
}

interface TestCase {
  id: string
  name: string
  description: string
  status: 'pending' | 'running' | 'passed' | 'failed'
  screenshot?: string
  expectedResult: string
  actualResult?: string
}

export const VisualTestFramework: React.FC<VisualTestFrameworkProps> = ({
  className = ''
}) => {
  const [selectedTest, setSelectedTest] = useState<string>('')
  const [testResults, setTestResults] = useState<TestCase[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [currentTestIndex, setCurrentTestIndex] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const visualTests: TestCase[] = [
    {
      id: 'transparency-test',
      name: 'Transparency Rendering',
      description: 'Test correct alpha blending and transparency sorting',
      status: 'pending',
      expectedResult: 'Objects behind glass should be visible with correct blending'
    },
    {
      id: 'frosting-test',
      name: 'Frosting Effect',
      description: 'Test frosting texture and distortion effects',
      status: 'pending',
      expectedResult: 'Glass should show appropriate frosting pattern'
    },
    {
      id: 'caustic-test',
      name: 'Caustic Patterns',
      description: 'Test light caustic effects on floors',
      status: 'pending',
      expectedResult: 'Animated caustic patterns should be visible'
    },
    {
      id: 'reflection-test',
      name: 'Reflection Quality',
      description: 'Test reflection accuracy and performance',
      status: 'pending',
      expectedResult: 'Reflections should accurately mirror scene objects'
    },
    {
      id: 'lod-test',
      name: 'LOD Transition',
      description: 'Test level of detail transitions',
      status: 'pending',
      expectedResult: 'Smooth transitions between LOD levels'
    },
    {
      id: 'batch-test',
      name: 'Batching Efficiency',
      description: 'Test material batching and draw call optimization',
      status: 'pending',
      expectedResult: 'Similar materials should be batched together'
    }
  ]

  const runAllTests = async () => {
    setIsRunning(true)
    setTestResults([...visualTests])
    setCurrentTestIndex(0)

    for (let i = 0; i < visualTests.length; i++) {
      setCurrentTestIndex(i)
      await runSingleTest(visualTests[i])
      await new Promise(resolve => setTimeout(resolve, 1500)) // 1.5s per test
    }

    setIsRunning(false)
    setCurrentTestIndex(-1)
  }

  const runSingleTest = async (test: TestCase): Promise<void> => {
    return new Promise((resolve) => {
      setTestResults(prev =>
        prev.map(t =>
          t.id === test.id
            ? { ...t, status: 'running' as const }
            : t
        )
      )

      setTimeout(() => {
        // Simulate test execution with random results
        const passed = Math.random() > 0.2 // 80% pass rate
        const status = passed ? 'passed' : 'failed'
        const actualResult = passed
          ? test.expectedResult
          : 'Test failed - visual artifacts detected'

        setTestResults(prev =>
          prev.map(t =>
            t.id === test.id
              ? { ...t, status, actualResult }
              : t
          )
        )
        resolve()
      }, 1000)
    })
  }

  const runIndividualTest = (testId: string) => {
    const test = visualTests.find(t => t.id === testId)
    if (test && !isRunning) {
      runSingleTest(test)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#666'
      case 'running': return '#ff9800'
      case 'passed': return '#4caf50'
      case 'failed': return '#f44336'
      default: return '#999'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳'
      case 'running': return '🔄'
      case 'passed': return '✅'
      case 'failed': return '❌'
      default: return '❓'
    }
  }

  useEffect(() => {
    setTestResults([...visualTests])
  }, [])

  return (
    <div className={`visual-test-framework ${className}`} style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '1000px',
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
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
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
          🧪 Visual Test Framework
        </h2>

        <button
          onClick={runAllTests}
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
          {isRunning ? '⏸️ Running Tests...' : '🧪 Run All Tests'}
        </button>
      </div>

      {/* Test Progress */}
      {isRunning && (
        <div style={{
          marginBottom: '20px',
          padding: '15px',
          backgroundColor: '#1a1a1a',
          borderRadius: '8px',
          border: '1px solid #333'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px'
          }}>
            <span style={{ fontSize: '12px', color: '#ccc' }}>
              Running Test: {currentTestIndex >= 0 ? visualTests[currentTestIndex]?.name : 'Completed'}
            </span>
            <span style={{ fontSize: '12px', color: '#ccc' }}>
              {currentTestIndex + 1} / {visualTests.length}
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
              width: `${((currentTestIndex + 1) / visualTests.length) * 100}%`,
              height: '100%',
              backgroundColor: '#4caf50',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '20px', flex: 1 }}>
        {/* Test List */}
        <div style={{
          width: '400px',
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
              Test Cases
            </h3>
          </div>

          <div style={{
            maxHeight: '500px',
            overflowY: 'auto'
          }}>
            {testResults.map((test, index) => (
              <div
                key={test.id}
                onClick={() => setSelectedTest(test.id)}
                style={{
                  padding: '15px',
                  borderBottom: '1px solid #222',
                  cursor: 'pointer',
                  backgroundColor: selectedTest === test.id ? '#333' : 'transparent',
                  transition: 'background-color 0.2s ease'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '5px'
                }}>
                  <span style={{ fontWeight: '500' }}>{test.name}</span>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{ fontSize: '16px' }}>
                      {getStatusIcon(test.status)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        runIndividualTest(test.id)
                      }}
                      disabled={isRunning}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#555',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: isRunning ? 'not-allowed' : 'pointer',
                        fontSize: '10px'
                      }}
                    >
                      Run
                    </button>
                  </div>
                </div>
                <div style={{
                  fontSize: '11px',
                  color: '#999',
                  marginBottom: '5px'
                }}>
                  {test.description}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: getStatusColor(test.status),
                  textTransform: 'capitalize',
                  fontWeight: '500'
                }}>
                  {test.status}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Test Details */}
        <div style={{ flex: 1 }}>
          {selectedTest ? (
            <div style={{
              backgroundColor: '#111',
              borderRadius: '8px',
              border: '1px solid #333',
              height: '100%'
            }}>
              {(() => {
                const test = testResults.find(t => t.id === selectedTest)
                if (!test) return null

                return (
                  <>
                    <div style={{
                      padding: '15px',
                      borderBottom: '1px solid #333',
                      backgroundColor: '#1a1a1a'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <h3 style={{ margin: 0, fontSize: '16px' }}>
                          {test.name}
                        </h3>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          color: getStatusColor(test.status)
                        }}>
                          <span style={{ fontSize: '18px' }}>
                            {getStatusIcon(test.status)}
                          </span>
                          <span style={{
                            fontSize: '12px',
                            textTransform: 'capitalize',
                            fontWeight: '600'
                          }}>
                            {test.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ padding: '20px' }}>
                      <div style={{ marginBottom: '20px' }}>
                        <h4 style={{
                          margin: '0 0 8px 0',
                          fontSize: '12px',
                          color: '#ccc',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Description
                        </h4>
                        <p style={{
                          margin: 0,
                          color: '#ddd',
                          lineHeight: '1.5'
                        }}>
                          {test.description}
                        </p>
                      </div>

                      <div style={{ marginBottom: '20px' }}>
                        <h4 style={{
                          margin: '0 0 8px 0',
                          fontSize: '12px',
                          color: '#ccc',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Expected Result
                        </h4>
                        <p style={{
                          margin: 0,
                          color: '#ddd',
                          lineHeight: '1.5',
                          padding: '10px',
                          backgroundColor: '#1a1a1a',
                          borderRadius: '4px'
                        }}>
                          {test.expectedResult}
                        </p>
                      </div>

                      {test.actualResult && (
                        <div style={{ marginBottom: '20px' }}>
                          <h4 style={{
                            margin: '0 0 8px 0',
                            fontSize: '12px',
                            color: '#ccc',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            Actual Result
                          </h4>
                          <p style={{
                            margin: 0,
                            color: test.status === 'passed' ? '#4caf50' : '#f44336',
                            lineHeight: '1.5',
                            padding: '10px',
                            backgroundColor: '#1a1a1a',
                            borderRadius: '4px'
                          }}>
                            {test.actualResult}
                          </p>
                        </div>
                      )}

                      {/* Mock Visual Preview */}
                      <div>
                        <h4 style={{
                          margin: '0 0 8px 0',
                          fontSize: '12px',
                          color: '#ccc',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Visual Preview
                        </h4>
                        <div style={{
                          width: '100%',
                          height: '200px',
                          backgroundColor: '#222',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#666',
                          fontSize: '12px',
                          textAlign: 'center'
                        }}>
                          {test.status === 'running' ? (
                            <div>
                              <div style={{ fontSize: '24px', marginBottom: '10px' }}>🔄</div>
                              Running visual test...
                            </div>
                          ) : test.status === 'passed' || test.status === 'failed' ? (
                            <div>
                              <div style={{ fontSize: '24px', marginBottom: '10px' }}>
                                {test.status === 'passed' ? '📸' : '🚫'}
                              </div>
                              {test.status === 'passed' ? 'Test completed successfully' : 'Visual test failed'}
                            </div>
                          ) : (
                            <div>
                              <div style={{ fontSize: '24px', marginBottom: '10px' }}>📋</div>
                              Click "Run" to execute this test
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>
          ) : (
            <div style={{
              backgroundColor: '#111',
              borderRadius: '8px',
              border: '1px solid #333',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#666',
              textAlign: 'center'
            }}>
              <div>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>🧪</div>
                <div style={{ fontSize: '16px', marginBottom: '10px' }}>Visual Test Framework</div>
                <div style={{ fontSize: '12px' }}>
                  Select a test from the list to view details and results
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default VisualTestFramework
