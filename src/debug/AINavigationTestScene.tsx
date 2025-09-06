import React, { useState, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, Text, Line } from "@react-three/drei";
import { FloorFactory } from "../../utils/floorFactory";
import { FloorNavigationAnalyzer } from "../components/floors/ai/FloorNavigationProperties";
import { TransparentSurfacePerception } from "../components/floors/ai/TransparentSurfacePerception";
import {
  TransparentNavMeshGenerator,
  NavMesh,
  NavMeshNode,
} from "../components/floors/ai/TransparentNavMeshGenerator";
import {
  TransparentPathfinder,
  PathNode,
} from "../components/floors/ai/TransparentPathfinder";
import { FrostedGlassFloor } from "../../types/floorTypes";
import * as THREE from "three";

interface AIAgent {
  id: string;
  position: THREE.Vector3;
  target: THREE.Vector3 | null;
  currentPath: PathNode[];
  pathIndex: number;
  speed: number;
  safetyPreference: "safety_first" | "balanced" | "efficiency_first";
  color: string;
  isMoving: boolean;
}

interface FloorVisualizationProps {
  floor: FrostedGlassFloor;
  showSafetyColors: boolean;
}

const FloorVisualization: React.FC<FloorVisualizationProps> = ({
  floor,
  showSafetyColors,
}) => {
  const analysis = FloorNavigationAnalyzer.analyzeFloorForAI(floor);

  const getSafetyColor = () => {
    const safetyColors = {
      safe: "#4CAF50",
      caution: "#FF9800",
      risky: "#FF5722",
      dangerous: "#F44336",
      avoid: "#9C27B0",
    };
    return safetyColors[analysis.safetyLevel] || "#808080";
  };

  const getTransparencyOpacity = () => {
    return Math.max(0.1, 1 - floor.transparency);
  };

  return (
    <group key={floor.id}>
      {/* Main floor surface */}
      <mesh position={[floor.position.x, floor.position.y, floor.position.z]}>
        <boxGeometry args={[1, 0.05, 1]} />
        <meshPhysicalMaterial
          color={floor.colorTint}
          transparent
          opacity={getTransparencyOpacity()}
          transmission={floor.transparency}
          roughness={floor.roughness}
          metalness={0.1}
        />
      </mesh>

      {/* Safety color indicator */}
      {showSafetyColors && (
        <mesh
          position={[
            floor.position.x,
            floor.position.y + 0.03,
            floor.position.z,
          ]}
        >
          <ringGeometry args={[0.4, 0.5, 16]} />
          <meshBasicMaterial
            color={getSafetyColor()}
            transparent
            opacity={0.7}
          />
        </mesh>
      )}

      {/* Floor ID label */}
      <Text
        position={[floor.position.x, floor.position.y + 0.1, floor.position.z]}
        fontSize={0.1}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {`${floor.glassType}\nT:${floor.transparency.toFixed(2)}\nD:${floor.metadata.durability}`}
      </Text>
    </group>
  );
};

interface NavigationMeshVisualizationProps {
  navMesh: NavMesh;
}

const NavigationMeshVisualization: React.FC<
  NavigationMeshVisualizationProps
> = ({ navMesh }) => {
  const nodes: NavMeshNode[] = Array.from(navMesh.nodes.values());

  return (
    <group>
      {/* Render navigation nodes */}
      {nodes.map((node: NavMeshNode) => (
        <mesh key={node.id} position={node.position}>
          <sphereGeometry args={[0.05]} />
          <meshBasicMaterial
            color={node.walkable ? "#00ff00" : "#ff0000"}
            transparent
            opacity={0.6}
          />
        </mesh>
      ))}

      {/* Render navigation edges */}
      {navMesh.edges.map((edge: any, index: number) => {
        const fromNode = navMesh.nodes.get(edge.from);
        const toNode = navMesh.nodes.get(edge.to);

        if (!fromNode || !toNode) return null;

        const points = [fromNode.position, toNode.position];

        return (
          <Line
            key={`edge-${index}`}
            points={points}
            color="#00ffff"
            lineWidth={1}
            transparent
            opacity={0.3}
          />
        );
      })}
    </group>
  );
};

interface AIAgentVisualizationProps {
  agent: AIAgent;
  showPath: boolean;
  selected: boolean;
  paused: boolean;
  navMesh: Map<string, any>;
}

const AIAgentVisualization: React.FC<AIAgentVisualizationProps> = ({
  agent,
  showPath,
  selected,
  paused,
  navMesh,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [localAgent, setLocalAgent] = useState(agent);

  useFrame((state, delta) => {
    if (
      paused ||
      !localAgent.currentPath.length ||
      localAgent.pathIndex >= localAgent.currentPath.length
    ) {
      return;
    }

    const targetNode = localAgent.currentPath[localAgent.pathIndex];
    if (!targetNode) return;

    const direction = new THREE.Vector3().subVectors(
      targetNode.position,
      localAgent.position,
    );
    const distance = direction.length();

    if (distance < 0.1) {
      // Reached current waypoint, move to next
      setLocalAgent((prev) => ({ ...prev, pathIndex: prev.pathIndex + 1 }));
    } else {
      // Move towards current waypoint
      direction.normalize().multiplyScalar(localAgent.speed * delta);
      const newPosition = localAgent.position.clone().add(direction);

      setLocalAgent((prev) => ({ ...prev, position: newPosition }));

      if (meshRef.current) {
        meshRef.current.position.copy(newPosition);
      }
    }
  });

  return (
    <group>
      {/* Agent representation */}
      <mesh
        ref={meshRef}
        position={localAgent.position}
        scale={selected ? [1.2, 1.2, 1.2] : [1, 1, 1]}
      >
        <capsuleGeometry args={[0.2, 0.5]} />
        <meshStandardMaterial
          color={localAgent.color}
          emissive={selected ? localAgent.color : "#000000"}
          emissiveIntensity={selected ? 0.3 : 0}
        />
      </mesh>

      {/* Agent label */}
      <Text
        position={[
          localAgent.position.x,
          localAgent.position.y + 0.8,
          localAgent.position.z,
        ]}
        fontSize={0.2}
        color={localAgent.color}
        anchorX="center"
        anchorY="middle"
      >
        {localAgent.id.replace("_agent", "")}
      </Text>

      {/* Path visualization */}
      {showPath &&
        localAgent.currentPath.map((pathNode: any, index: number) => (
          <mesh key={`path-${index}`} position={pathNode.position}>
            <sphereGeometry args={[0.03]} />
            <meshBasicMaterial
              color={localAgent.color}
              transparent
              opacity={index <= localAgent.pathIndex ? 0.8 : 0.4}
            />
          </mesh>
        ))}

      {/* Path lines */}
      {showPath && localAgent.currentPath.length > 1 && (
        <PathLineVisualization
          path={localAgent.currentPath}
          color={localAgent.color}
        />
      )}
    </group>
  );
};

interface PathLineVisualizationProps {
  path: any[];
  color: string;
}

const PathLineVisualization: React.FC<PathLineVisualizationProps> = ({
  path,
  color,
}) => {
  const points = path.map((node) => node.position);

  if (points.length < 2) return null;

  return (
    <Line
      points={points}
      color={color}
      lineWidth={2}
      transparent
      opacity={0.6}
    />
  );
};

export const AINavigationTestScene: React.FC = () => {
  const [showNavMesh, setShowNavMesh] = useState(true);
  const [showSafetyColors, setShowSafetyColors] = useState(true);
  const [showPaths, setShowPaths] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);

  const testFloors = useMemo((): FrostedGlassFloor[] => {
    const floors: FrostedGlassFloor[] = [];

    // Create a varied floor layout for testing
    const floorConfigs = [
      { pos: [0, 0, 0], type: "medium_frosted", safety: "safe" },
      { pos: [2, 0, 0], type: "clear_frosted", safety: "risky" },
      { pos: [4, 0, 0], type: "heavy_frosted", safety: "safe" },
      { pos: [0, 0, 2], type: "light_frosted", safety: "caution" },
      { pos: [2, 0, 2], type: "clear_frosted", safety: "dangerous" }, // Very risky
      { pos: [4, 0, 2], type: "medium_frosted", safety: "safe" },
      { pos: [0, 0, 4], type: "heavy_frosted", safety: "safe" },
      { pos: [2, 0, 4], type: "light_frosted", safety: "caution" },
      { pos: [4, 0, 4], type: "medium_frosted", safety: "safe" },
    ];

    floorConfigs.forEach((config, index) => {
      const floor = FloorFactory.createFrostedGlassFloor(
        new THREE.Vector3(config.pos[0], config.pos[1], config.pos[2]),
        config.type as
          | "medium_frosted"
          | "clear_frosted"
          | "heavy_frosted"
          | "light_frosted",
      );

      // Adjust properties based on intended safety level
      if (config.safety === "dangerous") {
        floor.transparency = 0.95;
        floor.metadata.durability = 20;
      } else if (config.safety === "risky") {
        floor.transparency = 0.85;
        floor.metadata.durability = 40;
      } else if (config.safety === "caution") {
        floor.transparency = 0.6;
        floor.metadata.durability = 70;
      }

      floors.push(floor);
    });

    return floors;
  }, []);

  // Generate navigation mesh
  const navMesh = useMemo(() => {
    const generator = new TransparentNavMeshGenerator();
    const worldBounds = new THREE.Box3(
      new THREE.Vector3(-5, -1, -5),
      new THREE.Vector3(10, 1, 10),
    );
    return generator.generateNavMesh(testFloors, worldBounds);
  }, [testFloors]);

  // Create AI agents with different preferences
  const [agents, setAgents] = useState<AIAgent[]>(() => [
    {
      id: "safety_agent",
      position: new THREE.Vector3(-1, 0.5, -1),
      target: new THREE.Vector3(5, 0.5, 5),
      currentPath: [],
      pathIndex: 0,
      speed: 1.0,
      safetyPreference: "safety_first",
      color: "#4CAF50",
      isMoving: false,
    },
    {
      id: "balanced_agent",
      position: new THREE.Vector3(-1, 0.5, 1),
      target: new THREE.Vector3(5, 0.5, 3),
      currentPath: [],
      pathIndex: 0,
      speed: 1.5,
      safetyPreference: "balanced",
      color: "#FF9800",
      isMoving: false,
    },
    {
      id: "efficient_agent",
      position: new THREE.Vector3(-1, 0.5, 3),
      target: new THREE.Vector3(5, 0.5, 1),
      currentPath: [],
      pathIndex: 0,
      speed: 2.0,
      safetyPreference: "efficiency_first",
      color: "#F44336",
      isMoving: false,
    },
  ]);

  // Generate paths for agents
  useEffect(() => {
    if (!navMesh || navMesh.nodes.size === 0) return;

    const pathfinder = new TransparentPathfinder(navMesh.nodes, navMesh.edges);

    const updatedAgents = agents.map((agent) => {
      if (!agent.target) return agent;

      const pathResult = pathfinder.findPath(agent.position, agent.target, {
        maxCost: 1000,
        safetyPreference: agent.safetyPreference,
        avoidTransparent: agent.safetyPreference === "safety_first",
        allowRiskyPaths: agent.safetyPreference !== "safety_first",
        preferAlternatives: agent.safetyPreference === "safety_first",
        maxPathLength: 100,
      });

      return {
        ...agent,
        currentPath: pathResult.path,
        pathIndex: 0,
        isMoving: pathResult.path.length > 0,
      };
    });

    setAgents(updatedAgents);
  }, [navMesh]);

  const resetAgents = () => {
    setAgents((prev) =>
      prev.map((agent) => ({
        ...agent,
        position: new THREE.Vector3(
          -1,
          0.5,
          agent.id === "safety_agent"
            ? -1
            : agent.id === "balanced_agent"
              ? 1
              : 3,
        ),
        pathIndex: 0,
        isMoving: false,
      })),
    );
  };

  const getFloorAnalysis = (floorId: string) => {
    const floor = testFloors.find((f) => f.id === floorId);
    if (!floor) return null;

    return FloorNavigationAnalyzer.analyzeFloorForAI(floor);
  };

  return (
    <>
      {/* Control Panel */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 100,
          backgroundColor: "rgba(0,0,0,0.9)",
          color: "white",
          padding: "20px",
          borderRadius: "8px",
          maxWidth: "400px",
          fontSize: "14px",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <h3 style={{ margin: "0 0 15px 0" }}>
          AI Navigation Testing - Phase 4
        </h3>

        <div style={{ marginBottom: "15px" }}>
          <h4 style={{ margin: "0 0 10px 0" }}>AI Agents:</h4>
          {agents.map((agent) => (
            <div
              key={agent.id}
              style={{
                display: "flex",
                alignItems: "center",
                margin: "5px 0",
                padding: "5px",
                backgroundColor:
                  selectedAgent === agent.id
                    ? "rgba(255,255,255,0.2)"
                    : "transparent",
                cursor: "pointer",
                borderRadius: "4px",
              }}
              onClick={() =>
                setSelectedAgent(selectedAgent === agent.id ? null : agent.id)
              }
            >
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  backgroundColor: agent.color,
                  marginRight: "8px",
                  borderRadius: "50%",
                }}
              ></div>
              <div style={{ flex: 1 }}>
                <div>{agent.id.replace("_", " ")}</div>
                <div style={{ fontSize: "12px", opacity: 0.7 }}>
                  Path: {agent.currentPath.length} nodes | Speed: {agent.speed}x
                </div>
              </div>
              <div style={{ fontSize: "12px", opacity: 0.8 }}>
                {agent.isMoving ? "🚶" : "⏸️"}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: "15px" }}>
          <h4 style={{ margin: "0 0 10px 0" }}>Visualization Options:</h4>
          <label
            style={{ display: "block", margin: "5px 0", cursor: "pointer" }}
          >
            <input
              type="checkbox"
              checked={showNavMesh}
              onChange={(e) => setShowNavMesh(e.target.checked)}
              style={{ marginRight: "8px" }}
            />
            Show Navigation Mesh
          </label>
          <label
            style={{ display: "block", margin: "5px 0", cursor: "pointer" }}
          >
            <input
              type="checkbox"
              checked={showSafetyColors}
              onChange={(e) => setShowSafetyColors(e.target.checked)}
              style={{ marginRight: "8px" }}
            />
            Show Safety Color Coding
          </label>
          <label
            style={{ display: "block", margin: "5px 0", cursor: "pointer" }}
          >
            <input
              type="checkbox"
              checked={showPaths}
              onChange={(e) => setShowPaths(e.target.checked)}
              style={{ marginRight: "8px" }}
            />
            Show AI Paths
          </label>
        </div>

        <div style={{ marginBottom: "15px" }}>
          <button
            onClick={() => setPaused(!paused)}
            style={{
              padding: "8px 16px",
              backgroundColor: paused ? "#4CAF50" : "#FF9800",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              marginRight: "10px",
            }}
          >
            {paused ? "Resume" : "Pause"}
          </button>

          <button
            onClick={resetAgents}
            style={{
              padding: "8px 16px",
              backgroundColor: "#2196F3",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Reset Positions
          </button>
        </div>

        {selectedAgent && (
          <div style={{ fontSize: "12px", opacity: 0.9, marginBottom: "15px" }}>
            <h4 style={{ margin: "0 0 8px 0" }}>Selected Agent Details:</h4>
            {(() => {
              const agent = agents.find((a) => a.id === selectedAgent);
              if (!agent) return null;

              return (
                <div>
                  <p style={{ margin: "4px 0" }}>
                    <strong>Safety Preference:</strong> {agent.safetyPreference}
                  </p>
                  <p style={{ margin: "4px 0" }}>
                    <strong>Current Path Length:</strong>{" "}
                    {agent.currentPath.length} nodes
                  </p>
                  <p style={{ margin: "4px 0" }}>
                    <strong>Speed:</strong> {agent.speed}x
                  </p>
                  <p style={{ margin: "4px 0" }}>
                    <strong>Progress:</strong> {agent.pathIndex}/
                    {agent.currentPath.length}
                  </p>
                  <p style={{ margin: "4px 0" }}>
                    <strong>Status:</strong>{" "}
                    {agent.isMoving ? "Moving" : "Idle"}
                  </p>
                </div>
              );
            })()}
          </div>
        )}

        <div style={{ fontSize: "11px", opacity: 0.7, marginBottom: "15px" }}>
          <p style={{ margin: "4px 0" }}>
            <strong>Safety Legend:</strong>
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "5px",
            }}
          >
            <span>🟢 Safe</span>
            <span>🟡 Caution</span>
            <span>🟠 Risky</span>
            <span>🔴 Dangerous</span>
          </div>
        </div>

        <div style={{ fontSize: "11px", opacity: 0.6 }}>
          <p style={{ margin: "4px 0" }}>
            <strong>Navigation Stats:</strong>
          </p>
          <p style={{ margin: "2px 0" }}>Floors: {testFloors.length}</p>
          <p style={{ margin: "2px 0" }}>
            Nav Nodes: {navMesh ? navMesh.nodes.size : 0}
          </p>
          <p style={{ margin: "2px 0" }}>
            Nav Edges: {navMesh ? navMesh.edges.length : 0}
          </p>
        </div>
      </div>

      <Canvas
        camera={{ position: [8, 8, 8] }}
        style={{ background: "#1a1a1a" }}
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[5, 8, 5]} intensity={1.2} />
        <pointLight position={[-2, 4, -2]} intensity={0.8} color="#4ecdc4" />

        <Environment preset="city" />

        {/* Render floors */}
        {testFloors.map((floor) => (
          <FloorVisualization
            key={floor.id}
            floor={floor}
            showSafetyColors={showSafetyColors}
          />
        ))}

        {/* Render navigation mesh */}
        {showNavMesh && navMesh && (
          <NavigationMeshVisualization navMesh={navMesh} />
        )}

        {/* Render AI agents */}
        {agents.map((agent) => (
          <AIAgentVisualization
            key={agent.id}
            agent={agent}
            showPath={showPaths}
            selected={selectedAgent === agent.id}
            paused={paused}
            navMesh={navMesh?.nodes || new Map()}
          />
        ))}

        {/* Ground reference */}
        <mesh position={[2, -1, 2]}>
          <boxGeometry args={[12, 0.1, 12]} />
          <meshStandardMaterial color="#2c3e50" />
        </mesh>

        {/* Grid helper */}
        <gridHelper
          args={[12, 12, "#444444", "#333333"]}
          position={[2, -0.95, 2]}
        />

        <OrbitControls />
      </Canvas>
    </>
  );
};
