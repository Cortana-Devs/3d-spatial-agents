"use client";

import React, { useRef, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Environment } from "@react-three/drei";
import * as THREE from "three";
import { useGameStore } from "@/store/gameStore";
import AIRobot from "@/components/Entities/AIRobot";
import { useAudioController } from "@/lib/audio/useAudioController";

export default function AudioTestPage() {
  const { ensureAudioContext } = useAudioController();
  
  const audioDistanceModel = useGameStore((state) => state.audioDistanceModel);
  const setAudioDistanceModel = useGameStore((state) => state.setAudioDistanceModel);
  
  const audioRefDistance = useGameStore((state) => state.audioRefDistance);
  const setAudioRefDistance = useGameStore((state) => state.setAudioRefDistance);
  
  const audioMaxDistance = useGameStore((state) => state.audioMaxDistance);
  const setAudioMaxDistance = useGameStore((state) => state.setAudioMaxDistance);
  
  const audioRolloffFactor = useGameStore((state) => state.audioRolloffFactor);
  const setAudioRolloffFactor = useGameStore((state) => state.setAudioRolloffFactor);

  const [testText, setTestText] = useState("Hello! This is a test of the 3D spatial audio system. Move the camera around to hear how distance and pan are affected.");

  const playerRef = useRef<THREE.Group>(null);

  const handlePlayAudio = () => {
    ensureAudioContext();
    window.dispatchEvent(
      new CustomEvent("agent-speak", {
        detail: {
          agentId: "test-agent-audio",
          text: testText,
        },
      })
    );
  };

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex", fontFamily: "sans-serif", background: "#111", color: "#eee" }}>
      {/* Controls Panel */}
      <div style={{ width: "350px", padding: "20px", background: "#1a1a1a", borderRight: "1px solid #333", overflowY: "auto" }}>
        <h1 style={{ fontSize: "24px", marginBottom: "20px", color: "#fff" }}>Audio Sandbox</h1>
        
        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Distance Model</label>
          <select 
            value={audioDistanceModel}
            onChange={(e) => setAudioDistanceModel(e.target.value as any)}
            style={{ width: "100%", padding: "8px", background: "#333", color: "#fff", border: "1px solid #555", borderRadius: "4px" }}
          >
            <option value="linear">Linear</option>
            <option value="inverse">Inverse</option>
            <option value="exponential">Exponential</option>
          </select>
          <p style={{ fontSize: "12px", color: "#aaa", marginTop: "4px" }}>
            The algorithm used to reduce volume as the camera moves away.
          </p>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
            Ref Distance: {audioRefDistance.toFixed(1)}
          </label>
          <input 
            type="range" 
            min="0.1" 
            max="20" 
            step="0.1"
            value={audioRefDistance}
            onChange={(e) => setAudioRefDistance(parseFloat(e.target.value))}
            style={{ width: "100%" }}
          />
          <p style={{ fontSize: "12px", color: "#aaa", marginTop: "4px" }}>
            The distance at which volume starts to decrease.
          </p>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
            Max Distance: {audioMaxDistance.toFixed(1)}
          </label>
          <input 
            type="range" 
            min="10" 
            max="200" 
            step="1"
            value={audioMaxDistance}
            onChange={(e) => setAudioMaxDistance(parseFloat(e.target.value))}
            style={{ width: "100%" }}
          />
          <p style={{ fontSize: "12px", color: "#aaa", marginTop: "4px" }}>
            The distance at which the volume becomes 0 (only for linear model).
          </p>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
            Rolloff Factor: {audioRolloffFactor.toFixed(1)}
          </label>
          <input 
            type="range" 
            min="0" 
            max="10" 
            step="0.1"
            value={audioRolloffFactor}
            onChange={(e) => setAudioRolloffFactor(parseFloat(e.target.value))}
            style={{ width: "100%" }}
          />
          <p style={{ fontSize: "12px", color: "#aaa", marginTop: "4px" }}>
            How quickly the volume drops off. Lower is louder at distance.
          </p>
        </div>

        <hr style={{ borderColor: "#333", margin: "24px 0" }} />

        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Test Text</label>
          <textarea
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            style={{ width: "100%", height: "100px", background: "#333", color: "#fff", border: "1px solid #555", borderRadius: "4px", padding: "8px" }}
          />
        </div>

        <button 
          onClick={handlePlayAudio}
          style={{ width: "100%", padding: "12px", background: "#007acc", color: "#fff", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}
        >
          Play Spatial Audio
        </button>

        <p style={{ fontSize: "12px", color: "#888", marginTop: "24px" }}>
          Hint: Start playing, then click and drag the 3D view to rotate. Scroll to zoom in/out. 
          The distance between your camera and the agent dictates the volume!
        </p>
      </div>

      {/* 3D Viewport */}
      <div style={{ flex: 1, position: "relative" }}>
        <Canvas camera={{ position: [0, 5, 10], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
          <Environment preset="city" />
          
          <Grid infiniteGrid fadeDistance={50} cellColor="#444" sectionColor="#888" />
          
          <OrbitControls makeDefault />

          {/* Dummy Player needed by AIRobot */}
          <group ref={playerRef} position={[5, 0, 5]}>
            <mesh position={[0, 1, 0]}>
              <boxGeometry args={[1, 2, 1]} />
              <meshStandardMaterial color="#333" />
            </mesh>
          </group>
          
          <AIRobot playerRef={playerRef} initialPosition={[0, 0, 0]} id="test-agent-audio" />
        </Canvas>

        {/* HUD overlay for crosshair just in case */}
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", color: "white", opacity: 0.5, pointerEvents: "none" }}>
          +
        </div>
      </div>
    </div>
  );
}
