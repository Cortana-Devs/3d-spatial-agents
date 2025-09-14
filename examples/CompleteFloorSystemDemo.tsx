import React, { useState, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  Stats,
  Sky,
  ContactShadows,
} from "@react-three/drei";
import { useFloorSystem } from "@systems/integration/FloorSystemIntegrator";
import { FloorControlPanel } from "@components/ui/FloorControlPanel";
import { FloorFactory } from "../utils/floorFactory";
import * as THREE from "three";

export const CompleteFloorSystemDemo: React.FC = () => {
  const [demoMode, setDemoMode] = useState<
    "showcase" | "debug" | "benchmark" | "test"
  >("showcase");
  const [cameraMode, setCameraMode] = useState<
    "orbit" | "fly" | "first-person"
  >("orbit");
  const [showUI, setShowUI] = useState(true);
  const [autoDemo, setAutoDemo] = useState(false);

  const floorSystem = useFloorSystem({
    maxFloors: 150,
    enableLOD: true,
    enableBatching: true,
    enableAINavigation: true,
    enableAdvancedEffects: true,
    enablePerformanceMonitoring: true,
    qualityPreset: "auto",
    debugMode: demoMode === "debug",
  });

  // Create demo floors
  const demoFloors = useRef<any[]>([]);

  useEffect(() => {
    if (!floorSystem.addFloor) return;

    // Clear existing floors
    demoFloors.current.forEach((floor) => {
      floorSystem.removeFloor?.(floor.id);
    });
    demoFloors.current = [];

    // Create showcase floors
    if (demoMode === "showcase") {
      createShowcaseFloors();
    } else if (demoMode === "debug") {
      createDebugFloors();
    } else if (demoMode === "benchmark") {
      createBenchmarkFloors();
    }
  }, [demoMode, floorSystem]);

  const createShowcaseFloors = () => {
    // Central showcase area
    const centerFloors = [
      { pos: [0, 0, 0], type: "medium_frosted", preset: "showroom_glass" },
      { pos: [3, 0, 0], type: "clear_frosted", preset: "bathroom_frosted" },
      { pos: [6, 0, 0], type: "heavy_frosted", preset: "colored_tinted" },
      { pos: [0, 0, 3], type: "light_frosted", preset: "smart_reactive" },
      { pos: [3, 0, 3], type: "medium_frosted", preset: "showroom_glass" },
      { pos: [6, 0, 3], type: "clear_frosted", preset: "bathroom_frosted" },
    ];

    centerFloors.forEach((config) => {
      const floor = FloorFactory.createFrostedGlassFloor(
        new THREE.Vector3(config.pos[0], config.pos[1], config.pos[2]),
        config.type as any,
      );
      floor.materialPreset = config.preset;
      demoFloors.current.push(floor);
      floorSystem.addFloor?.(floor);
    });

    // Surrounding pattern floors
    createPatternFloors("spiral", new THREE.Vector3(12, 0, 0), 8);
    createPatternFloors("grid", new THREE.Vector3(-12, 0, 0), 16);
    createPatternFloors("random", new THREE.Vector3(0, 0, 12), 12);
  };

  const createDebugFloors = () => {
    // Create floors with different properties for debugging
    const debugConfigs = [
      { pos: [-3, 0, -3], type: "clear_frosted", safety: "dangerous" },
      { pos: [0, 0, -3], type: "light_frosted", safety: "risky" },
      { pos: [3, 0, -3], type: "medium_frosted", safety: "caution" },
      { pos: [6, 0, -3], type: "heavy_frosted", safety: "safe" },
    ];

    debugConfigs.forEach((config) => {
      const floor = FloorFactory.createFrostedGlassFloor(
        new THREE.Vector3(config.pos[0], config.pos[1], config.pos[2]),
        config.type as any,
      );

      // Modify properties for debugging
      if (config.safety === "dangerous") {
        floor.transparency = 0.95;
        floor.metadata.durability = 20;
      } else if (config.safety === "risky") {
        floor.transparency = 0.8;
        floor.metadata.durability = 40;
      }

      demoFloors.current.push(floor);
      floorSystem.addFloor?.(floor);
    });
  };

  const createBenchmarkFloors = () => {
    // Create many floors for performance testing
    for (let x = -10; x <= 10; x += 2) {
      for (let z = -10; z <= 10; z += 2) {
        const types = [
          "clear_frosted",
          "light_frosted",
          "medium_frosted",
          "heavy_frosted",
        ];
        const randomType = types[Math.floor(Math.random() * types.length)];

        const floor = FloorFactory.createFrostedGlassFloor(
          new THREE.Vector3(x, 0, z),
          randomType as any,
        );

        demoFloors.current.push(floor);
        floorSystem.addFloor?.(floor);
      }
    }
  };

  const createPatternFloors = (
    pattern: "spiral" | "grid" | "random",
    center: THREE.Vector3,
    count: number,
  ) => {
    for (let i = 0; i < count; i++) {
      let position: THREE.Vector3;

      if (pattern === "spiral") {
        const angle = (i / count) * Math.PI * 4;
        const radius = (i / count) * 8;
        position = new THREE.Vector3(
          center.x + Math.cos(angle) * radius,
          center.y,
          center.z + Math.sin(angle) * radius,
        );
      } else if (pattern === "grid") {
        const gridSize = Math.ceil(Math.sqrt(count));
        const x = (i % gridSize) - gridSize / 2;
        const z = Math.floor(i / gridSize) - gridSize / 2;
        position = new THREE.Vector3(
          center.x + x * 2,
          center.y,
          center.z + z * 2,
        );
      } else {
        // random
        position = new THREE.Vector3(
          center.x + (Math.random() - 0.5) * 16,
          center.y,
          center.z + (Math.random() - 0.5) * 16,
        );
      }

      const types = [
        "clear_frosted",
        "light_frosted",
        "medium_frosted",
        "heavy_frosted",
      ];
      const randomType = types[i % types.length];

      const floor = FloorFactory.createFrostedGlassFloor(
        position,
        randomType as any,
      );
      demoFloors.current.push(floor);
      floorSystem.addFloor?.(floor);
    }
  };

  const handleAutoDemo = () => {
    setAutoDemo(!autoDemo);
  };

  // Auto demo rotation
  useEffect(() => {
    if (!autoDemo) return;

    const modes = ["showcase", "debug", "benchmark", "test"];
    let currentIndex = 0;

    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % modes.length;
      setDemoMode(modes[currentIndex] as any);
    }, 15000); // Change mode every 15 seconds

    return () => clearInterval(interval);
  }, [autoDemo]);

  return (
    <div
      style={{ width: "100vw", height: "100vh", backgroundColor: "#0a0a0a" }}
    >
      {/* Mode Selection UI */}
      {showUI && (
        <div
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            zIndex: 1000,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            color: "white",
            padding: "20px",
            borderRadius: "12px",
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          <h3 style={{ margin: "0 0 15px 0", fontSize: "16px" }}>
            🏗️ Complete Floor System Demo
          </h3>

          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "12px",
                fontWeight: "500",
              }}
            >
              Demo Mode:
            </label>
            {[
              {
                id: "showcase",
                label: "🎭 Showcase",
                desc: "Visual demonstration",
              },
              { id: "debug", label: "🔧 Debug", desc: "Development tools" },
              {
                id: "benchmark",
                label: "📊 Benchmark",
                desc: "Performance testing",
              },
              { id: "test", label: "🧪 Test", desc: "Visual testing" },
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setDemoMode(mode.id as any)}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "8px 12px",
                  margin: "4px 0",
                  backgroundColor:
                    demoMode === mode.id
                      ? "#667eea"
                      : "rgba(255, 255, 255, 0.1)",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "12px",
                  textAlign: "left",
                }}
                title={mode.desc}
              >
                {mode.label}
              </button>
            ))}
          </div>

          <div style={{ marginBottom: "15px" }}>
            <button
              onClick={handleAutoDemo}
              style={{
                width: "100%",
                padding: "10px",
                backgroundColor: autoDemo
                  ? "#4CAF50"
                  : "rgba(255, 255, 255, 0.1)",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "500",
              }}
            >
              {autoDemo ? "⏸️ Stop Auto Demo" : "▶️ Start Auto Demo"}
            </button>
          </div>

          <div style={{ fontSize: "11px", color: "#999" }}>
            <div>Floors: {demoFloors.current.length}</div>
            <div>System: {floorSystem.state?.systemHealth?.toUpperCase()}</div>
            {floorSystem.state?.performanceMetrics && (
              <div>
                FPS: {floorSystem.state.performanceMetrics.fps.toFixed(1)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      {demoMode === "showcase" && (
        <>
          {showUI && <FloorControlPanel floorSystem={floorSystem.system} />}
          <Canvas camera={{ position: [15, 12, 15] }}>
            <ambientLight intensity={0.3} />
            <pointLight position={[10, 10, 10]} intensity={1.5} />
            <pointLight
              position={[-10, 8, -10]}
              intensity={1.2}
              color="#4ecdc4"
            />
            <pointLight
              position={[10, 6, -10]}
              intensity={1.0}
              color="#ff6b6b"
            />

            <Environment preset="city" />
            <Sky sunPosition={[100, 20, 100]} />

            {/* Demo objects for transparency effects */}
            <ShowcaseObjects />

            <ContactShadows
              position={[0, -0.01, 0]}
              opacity={0.4}
              scale={50}
              blur={2}
            />

            <Stats />
            <OrbitControls />
          </Canvas>
        </>
      )}

      {demoMode === "debug" && (
        <Canvas camera={{ position: [15, 12, 15] }}>
          <ambientLight intensity={0.4} />
          <pointLight position={[5, 8, 5]} intensity={1.2} />

          {/* Debug visualization */}
          <DebugVisualization />

          <Stats />
          <OrbitControls />
        </Canvas>
      )}

      {demoMode === "benchmark" && (
        <Canvas camera={{ position: [20, 15, 20] }}>
          <ambientLight intensity={0.3} />
          <directionalLight position={[10, 10, 5]} intensity={1} />

          {/* Performance test objects */}
          <BenchmarkObjects />

          <Stats />
          <OrbitControls />
        </Canvas>
      )}

      {demoMode === "test" && (
        <Canvas camera={{ position: [10, 8, 10] }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[5, 5, 5]} intensity={1} />

          {/* Visual testing components */}
          <TestingObjects />

          <Stats />
          <OrbitControls />
        </Canvas>
      )}

      {/* Toggle UI button */}
      <button
        onClick={() => setShowUI(!showUI)}
        style={{
          position: "absolute",
          bottom: "20px",
          right: "20px",
          zIndex: 1001,
          width: "50px",
          height: "50px",
          borderRadius: "50%",
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          color: "white",
          border: "2px solid rgba(255, 255, 255, 0.2)",
          cursor: "pointer",
          fontSize: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {showUI ? "👁️" : "🔧"}
      </button>
    </div>
  );
};

// Helper component for showcase objects
const ShowcaseObjects: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.005;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Rotating objects to show transparency effects */}
      <mesh position={[3, 2, 3]}>
        <torusGeometry args={[1.5, 0.5, 16, 100]} />
        <meshStandardMaterial color="#e74c3c" metalness={0.8} roughness={0.2} />
      </mesh>

      <mesh position={[-3, 1.5, 3]}>
        <octahedronGeometry args={[1.2]} />
        <meshStandardMaterial color="#3498db" metalness={0.6} roughness={0.3} />
      </mesh>

      <mesh position={[6, 2.5, -3]}>
        <dodecahedronGeometry args={[1]} />
        <meshStandardMaterial color="#2ecc71" metalness={0.4} roughness={0.4} />
      </mesh>

      <mesh position={[-6, 1.8, -3]}>
        <icosahedronGeometry args={[1.1]} />
        <meshStandardMaterial color="#f39c12" metalness={0.7} roughness={0.2} />
      </mesh>

      {/* Floating particles */}
      {Array.from({ length: 20 }).map((_, i) => (
        <mesh
          key={i}
          position={[
            (Math.random() - 0.5) * 30,
            Math.random() * 8 + 2,
            (Math.random() - 0.5) * 30,
          ]}
        >
          <sphereGeometry args={[0.1]} />
          <meshBasicMaterial
            color={new THREE.Color().setHSL(Math.random(), 0.8, 0.6)}
            transparent
            opacity={0.6}
          />
        </mesh>
      ))}
    </group>
  );
};

// Debug visualization component
const DebugVisualization: React.FC = () => {
  return (
    <group>
      {/* Debug wireframes */}
      <mesh position={[0, 0.1, 0]}>
        <planeGeometry args={[50, 50, 10, 10]} />
        <meshBasicMaterial color="#333333" wireframe />
      </mesh>

      {/* Navigation mesh visualization */}
      <mesh position={[0, 0.05, 0]}>
        <planeGeometry args={[50, 50]} />
        <meshBasicMaterial color="#00ff00" transparent opacity={0.1} />
      </mesh>
    </group>
  );
};

// Benchmark performance objects
const BenchmarkObjects: React.FC = () => {
  const objects = Array.from({ length: 100 }).map((_, i) => ({
    position: [
      (Math.random() - 0.5) * 40,
      Math.random() * 5 + 1,
      (Math.random() - 0.5) * 40,
    ],
    color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5),
  }));

  return (
    <group>
      {objects.map((obj, i) => (
        <mesh key={i} position={obj.position as [number, number, number]}>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshStandardMaterial color={obj.color} />
        </mesh>
      ))}
    </group>
  );
};

// Visual testing objects
const TestingObjects: React.FC = () => {
  return (
    <group>
      {/* Test patterns */}
      <mesh position={[0, 1, 0]}>
        <sphereGeometry args={[1, 32, 16]} />
        <meshStandardMaterial
          color="#ffffff"
          transparent
          opacity={0.8}
          roughness={0.1}
          metalness={0.9}
        />
      </mesh>

      <mesh position={[3, 1, 0]}>
        <cylinderGeometry args={[1, 1, 2, 16]} />
        <meshStandardMaterial color="#ff6b6b" />
      </mesh>

      <mesh position={[-3, 1, 0]}>
        <coneGeometry args={[1, 2, 8]} />
        <meshStandardMaterial color="#4ecdc4" />
      </mesh>
    </group>
  );
};
