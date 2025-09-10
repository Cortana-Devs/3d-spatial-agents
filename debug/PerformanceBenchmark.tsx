import React, { useState, useRef, useEffect, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { FrostedGlassFloor } from "../components/floors/FrostedGlassFloor";
import { FloorFactory } from "../utils/floorFactory";
import { usePerformanceMonitor } from "../systems/PerformanceMonitor";
import { FloorLODManager } from "../systems/FloorLODManager";
import { TransparencyBatcher } from "../systems/TransparencyBatcher";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import {
  setupBasicRenderingTest,
  setupTransparencyStressTest,
  setupLODEffectivenessTest,
  setupBatchingOptimizationTest,
  setupMemoryStressTest,
} from "./benchmarkHelpers";

interface BenchmarkTest {
  id: string;
  name: string;
  description: string;
  setup: (scene: THREE.Scene) => BenchmarkScenario;
  duration: number; // in seconds
  targetMetrics: {
    minFPS: number;
    maxMemoryMB: number;
    maxDrawCalls: number;
  };
}

interface BenchmarkScenario {
  floors: any[];
  objects: THREE.Object3D[];
  lights: THREE.Light[];
  cleanup: () => void;
}

interface BenchmarkResult {
  testId: string;
  startTime: number;
  endTime: number;
  samples: PerformanceSample[];
  summary: {
    averageFPS: number;
    minFPS: number;
    maxFPS: number;
    averageMemory: number;
    peakMemory: number;
    averageDrawCalls: number;
    maxDrawCalls: number;
    frameDrops: number;
    passed: boolean;
  };
}

interface PerformanceSample {
  timestamp: number;
  fps: number;
  frameTime: number;
  memoryUsage: number;
  drawCalls: number;
  triangles: number;
}

export const PerformanceBenchmark: React.FC = () => {
  const [currentTest, setCurrentTest] = useState<string | null>(null);
  const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkResult[]>(
    [],
  );
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const benchmarkTests: BenchmarkTest[] = [
    {
      id: "basic-rendering",
      name: "Basic Rendering Performance",
      description: "Test basic rendering performance with various floor counts",
      setup: (scene) => setupBasicRenderingTest(scene),
      duration: 30,
      targetMetrics: {
        minFPS: 45,
        maxMemoryMB: 300,
        maxDrawCalls: 100,
      },
    },
    {
      id: "transparency-stress",
      name: "Transparency Stress Test",
      description:
        "Test performance with many overlapping transparent surfaces",
      setup: (scene) => setupTransparencyStressTest(scene),
      duration: 30,
      targetMetrics: {
        minFPS: 30,
        maxMemoryMB: 500,
        maxDrawCalls: 200,
      },
    },
    {
      id: "lod-effectiveness",
      name: "LOD System Effectiveness",
      description: "Test LOD system performance across various distances",
      setup: (scene) => setupLODEffectivenessTest(scene),
      duration: 45,
      targetMetrics: {
        minFPS: 40,
        maxMemoryMB: 400,
        maxDrawCalls: 150,
      },
    },
    {
      id: "batching-optimization",
      name: "Batching Optimization",
      description: "Test batching system with similar and diverse materials",
      setup: (scene) => setupBatchingOptimizationTest(scene),
      duration: 30,
      targetMetrics: {
        minFPS: 35,
        maxMemoryMB: 350,
        maxDrawCalls: 80,
      },
    },
    {
      id: "memory-stress",
      name: "Memory Stress Test",
      description: "Test memory usage with texture generation and caching",
      setup: (scene) => setupMemoryStressTest(scene),
      duration: 60,
      targetMetrics: {
        minFPS: 25,
        maxMemoryMB: 800,
        maxDrawCalls: 250,
      },
    },
  ];

  const runBenchmark = async (testId: string) => {
    const test = benchmarkTests.find((t) => t.id === testId);
    if (!test) return;

    setCurrentTest(testId);
    setIsRunning(true);
    setProgress(0);

    // This would be implemented to actually run the benchmark
    // For now, we'll simulate the process
    const result = await simulateBenchmark(test);

    setBenchmarkResults((prev) => [
      ...prev.filter((r) => r.testId !== testId),
      result,
    ]);
    setCurrentTest(null);
    setIsRunning(false);
    setProgress(0);
  };

  const runAllBenchmarks = async (): Promise<BenchmarkResult[]> => {
    const concurrencyLimit = 1; // Run tests one at a time to prevent interference
    const queue = [...benchmarkTests];

    while (queue.length > 0) {
      const batch = queue.splice(0, concurrencyLimit);
      await Promise.all(batch.map((test) => runBenchmark(test.id)));
      if (queue.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Cool-down period
      }
    }
    return [...benchmarkResults];
  };

  const simulateBenchmark = async (
    test: BenchmarkTest,
  ): Promise<BenchmarkResult> => {
    const samples: PerformanceSample[] = [];
    const startTime = performance.now(); // More precise than Date.now()
    const sampleInterval = 100; // Sample every 100ms
    const totalSamples = Math.floor((test.duration * 1000) / sampleInterval);

    for (let i = 0; i < totalSamples; i++) {
      // Simulate performance degradation over time
      const degradation = Math.min(1, i / totalSamples) * 0.3;
      const baseFPS = 60 - degradation * 20;
      const fps = baseFPS + (Math.random() - 0.5) * 10;

      const currentTime = performance.now();
      const elapsedTime = currentTime - startTime;
      const targetTime = i * sampleInterval;

      // Ensure consistent timing by adjusting delays
      const delay = Math.max(0, targetTime - elapsedTime);
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      // Use RAF for more accurate timing and prevent event loop blocking
      await new Promise(requestAnimationFrame);

      const sample: PerformanceSample = {
        timestamp: performance.now(),
        fps: Math.max(10, fps),
        frameTime: 1000 / Math.max(10, fps),
        memoryUsage: 200 + degradation * 100 + Math.random() * 50,
        drawCalls:
          50 + Math.floor(degradation * 50) + Math.floor(Math.random() * 20),
        triangles:
          10000 +
          Math.floor(degradation * 5000) +
          Math.floor(Math.random() * 2000),
      };

      samples.push(sample);

      // Use a callback-based setState to prevent race conditions
      setProgress((prev) => {
        const newProgress = (i + 1) / totalSamples;
        return newProgress > prev ? newProgress : prev;
      });
    }

    const endTime = Date.now();

    // Calculate summary statistics
    const fpsValues = samples.map((s) => s.fps);
    const memoryValues = samples.map((s) => s.memoryUsage);
    const drawCallValues = samples.map((s) => s.drawCalls);

    const summary = {
      averageFPS: fpsValues.reduce((a, b) => a + b) / fpsValues.length,
      minFPS: Math.min(...fpsValues),
      maxFPS: Math.max(...fpsValues),
      averageMemory: memoryValues.reduce((a, b) => a + b) / memoryValues.length,
      peakMemory: Math.max(...memoryValues),
      averageDrawCalls:
        drawCallValues.reduce((a, b) => a + b) / drawCallValues.length,
      maxDrawCalls: Math.max(...drawCallValues),
      frameDrops: samples.filter((s) => s.fps < 30).length,
      passed: false,
    };

    // Check if test passed
    summary.passed =
      summary.minFPS >= test.targetMetrics.minFPS &&
      summary.peakMemory <= test.targetMetrics.maxMemoryMB &&
      summary.maxDrawCalls <= test.targetMetrics.maxDrawCalls;

    return {
      testId: test.id,
      startTime,
      endTime,
      samples,
      summary,
    };
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        backgroundColor: "#1a1a1a",
        color: "white",
      }}
    >
      {/* Control Panel */}
      <div style={{ width: "400px", padding: "20px", overflowY: "auto" }}>
        <h2>Performance Benchmark</h2>

        <div style={{ marginBottom: "20px" }}>
          <button
            onClick={runAllBenchmarks}
            disabled={isRunning}
            style={{
              width: "100%",
              padding: "15px",
              backgroundColor: isRunning ? "#666" : "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: isRunning ? "not-allowed" : "pointer",
              fontSize: "16px",
              fontWeight: "bold",
            }}
          >
            {isRunning ? "Running Benchmarks..." : "Run All Benchmarks"}
          </button>

          {isRunning && (
            <div style={{ marginTop: "10px" }}>
              <div
                style={{
                  width: "100%",
                  height: "20px",
                  backgroundColor: "#333",
                  borderRadius: "10px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${progress * 100}%`,
                    height: "100%",
                    backgroundColor: "#4CAF50",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
              <div
                style={{
                  textAlign: "center",
                  marginTop: "5px",
                  fontSize: "12px",
                }}
              >
                {currentTest &&
                  `Running: ${benchmarkTests.find((t) => t.id === currentTest)?.name}`}
              </div>
            </div>
          )}
        </div>

        {/* Individual Tests */}
        <div style={{ marginBottom: "30px" }}>
          <h3>Individual Tests</h3>
          {benchmarkTests.map((test) => {
            const result = benchmarkResults.find((r) => r.testId === test.id);
            return (
              <div
                key={test.id}
                style={{
                  backgroundColor: "#333",
                  padding: "15px",
                  marginBottom: "10px",
                  borderRadius: "4px",
                  borderLeft: result
                    ? result.summary.passed
                      ? "4px solid #4CAF50"
                      : "4px solid #f44336"
                    : "4px solid #666",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <h4 style={{ margin: 0 }}>{test.name}</h4>
                    <p
                      style={{
                        margin: "5px 0",
                        fontSize: "12px",
                        color: "#ccc",
                      }}
                    >
                      {test.description}
                    </p>
                    <div style={{ fontSize: "11px", color: "#999" }}>
                      Target: {test.targetMetrics.minFPS}+ FPS, ≤
                      {test.targetMetrics.maxMemoryMB}MB, ≤
                      {test.targetMetrics.maxDrawCalls} draws
                    </div>
                  </div>
                  <button
                    onClick={() => runBenchmark(test.id)}
                    disabled={isRunning}
                    style={{
                      padding: "8px 12px",
                      backgroundColor: isRunning ? "#666" : "#2196F3",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: isRunning ? "not-allowed" : "pointer",
                    }}
                  >
                    Run
                  </button>
                </div>

                {result && (
                  <div style={{ marginTop: "10px", fontSize: "12px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>Avg FPS:</span>
                      <span
                        style={{
                          color:
                            result.summary.averageFPS >=
                            test.targetMetrics.minFPS
                              ? "#4CAF50"
                              : "#f44336",
                        }}
                      >
                        {result.summary.averageFPS.toFixed(1)}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>Peak Memory:</span>
                      <span
                        style={{
                          color:
                            result.summary.peakMemory <=
                            test.targetMetrics.maxMemoryMB
                              ? "#4CAF50"
                              : "#f44336",
                        }}
                      >
                        {result.summary.peakMemory.toFixed(0)}MB
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>Max Draw Calls:</span>
                      <span
                        style={{
                          color:
                            result.summary.maxDrawCalls <=
                            test.targetMetrics.maxDrawCalls
                              ? "#4CAF50"
                              : "#f44336",
                        }}
                      >
                        {result.summary.maxDrawCalls}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>Frame Drops:</span>
                      <span
                        style={{
                          color:
                            result.summary.frameDrops === 0
                              ? "#4CAF50"
                              : "#FF9800",
                        }}
                      >
                        {result.summary.frameDrops}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Overall Results */}
        {benchmarkResults.length > 0 && (
          <div>
            <h3>Overall Results</h3>
            <div
              style={{
                backgroundColor: "#333",
                padding: "15px",
                borderRadius: "4px",
              }}
            >
              <div>
                <strong>Tests Completed:</strong> {benchmarkResults.length} /{" "}
                {benchmarkTests.length}
              </div>
              <div>
                <strong>Tests Passed:</strong>{" "}
                {benchmarkResults.filter((r) => r.summary.passed).length}
              </div>
              <div>
                <strong>Overall Success Rate:</strong>{" "}
                {(
                  (benchmarkResults.filter((r) => r.summary.passed).length /
                    benchmarkResults.length) *
                  100
                ).toFixed(1)}
                %
              </div>

              <div style={{ marginTop: "15px" }}>
                <h4>Performance Summary</h4>
                <div style={{ fontSize: "12px" }}>
                  <div>
                    Avg FPS:{" "}
                    {(
                      benchmarkResults.reduce(
                        (sum, r) => sum + r.summary.averageFPS,
                        0,
                      ) / benchmarkResults.length
                    ).toFixed(1)}
                  </div>
                  <div>
                    Avg Memory:{" "}
                    {(
                      benchmarkResults.reduce(
                        (sum, r) => sum + r.summary.averageMemory,
                        0,
                      ) / benchmarkResults.length
                    ).toFixed(0)}
                    MB
                  </div>
                  <div>
                    Total Frame Drops:{" "}
                    {benchmarkResults.reduce(
                      (sum, r) => sum + r.summary.frameDrops,
                      0,
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Visualization Panel */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Performance Charts */}
        <div
          style={{ height: "300px", backgroundColor: "#222", padding: "20px" }}
        >
          <h3>Real-time Performance Charts</h3>
          {benchmarkResults.length > 0 && (
            <PerformanceChart results={benchmarkResults} />
          )}
        </div>

        {/* 3D Scene for Visual Testing */}
        <div style={{ flex: 1 }}>
          <BenchmarkScene currentTest={currentTest} />
        </div>
      </div>
    </div>
  );
};

// Helper components
const PerformanceChart: React.FC<{ results: BenchmarkResult[] }> = ({
  results,
}) => {
  return (
    <div
      style={{
        width: "100%",
        height: "200px",
        backgroundColor: "#333",
        borderRadius: "4px",
        padding: "10px",
      }}
    >
      <div style={{ color: "#999", marginBottom: "10px" }}>
        Performance Over Time
      </div>
      {results.map((result) => (
        <div key={result.testId} style={{ marginBottom: "10px" }}>
          <div style={{ fontSize: "12px", color: "#ccc" }}>
            {(() => {
              const benchmarkTests = [
                { id: "basic-rendering", name: "Basic Rendering Performance" },
                { id: "transparency-stress", name: "Transparency Stress Test" },
                { id: "lod-effectiveness", name: "LOD System Effectiveness" },
                { id: "batching-optimization", name: "Batching Optimization" },
                { id: "memory-stress", name: "Memory Stress Test" },
              ];
              return (
                benchmarkTests.find((t) => t.id === result.testId)?.name ??
                result.testId
              );
            })()}
          </div>
          <div
            style={{
              height: "20px",
              backgroundColor: "#555",
              borderRadius: "10px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${Math.min(100, (result.summary.averageFPS / 60) * 100)}%`,
                backgroundColor:
                  result.summary.averageFPS >= 45
                    ? "#4CAF50"
                    : result.summary.averageFPS >= 30
                      ? "#FF9800"
                      : "#f44336",
                borderRadius: "10px",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "10px",
                transform: "translateY(-50%)",
                fontSize: "10px",
                color: "white",
                fontWeight: "bold",
              }}
            >
              {result.summary.averageFPS.toFixed(1)} FPS
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const BenchmarkScene: React.FC<{ currentTest: string | null }> = ({
  currentTest,
}) => {
  const [scenario, setScenario] = useState<BenchmarkScenario | null>(null);
  const { gl, scene } = useThree();

  useEffect(() => {
    if (!currentTest) return;

    const setups: Record<string, (scene: THREE.Scene) => BenchmarkScenario> = {
      "basic-rendering": setupBasicRenderingTest,
      "transparency-stress": setupTransparencyStressTest,
      "lod-effectiveness": setupLODEffectivenessTest,
      "batching-optimization": setupBatchingOptimizationTest,
      "memory-stress": setupMemoryStressTest,
    };
    const setup = setups[currentTest];
    if (setup) {
      const newScenario = setup(scene);
      setScenario(newScenario);
      return () => {
        newScenario.cleanup();
      };
    }
  }, [currentTest, scene]);

  return (
    <Canvas camera={{ position: [15, 10, 15] }}>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1.2} />
      <pointLight position={[-10, 8, -10]} intensity={0.8} color="#4ecdc4" />

      {scenario && (
        <group>
          {scenario.floors.map((floor) => (
            <FrostedGlassFloor key={floor.id} floor={floor} />
          ))}

          {scenario.objects.map((obj, index) => (
            <primitive key={index} object={obj} />
          ))}

          {scenario.lights.map((light, index) => (
            <primitive key={index} object={light} />
          ))}
        </group>
      )}

      <OrbitControls />
    </Canvas>
  );
};
