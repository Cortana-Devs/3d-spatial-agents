"use client";

import React, { useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { FlyControls, Grid, Environment, SoftShadows } from "@react-three/drei";
import * as THREE from "three";
import { useGameStore } from "@/store/gameStore";
import AIRobot from "@/components/Entities/AIRobot";
import { useAudioController } from "@/lib/audio/useAudioController";
import { Settings2, Play, Volume2, Activity, Info, Mic2, Zap, LayoutTemplate } from "lucide-react";

// Simple WASD movement hook so we don't need FlyControls acting weirdly on Y axis
function FreeCamera() {
  const { camera } = useThree();
  const keys = useRef<{ [key: string]: boolean }>({});
  
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { keys.current[e.code] = true; };
    const onKeyUp = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useFrame((_, delta) => {
    const speed = 15 * delta;
    const dir = new THREE.Vector3();
    const right = new THREE.Vector3();
    
    camera.getWorldDirection(dir);
    // Ignore Y for pure FPS style movement, or keep it for flying
    dir.y = 0;
    dir.normalize();
    right.crossVectors(camera.up, dir).normalize();

    if (keys.current["KeyW"] || keys.current["ArrowUp"]) camera.position.addScaledVector(dir, speed);
    if (keys.current["KeyS"] || keys.current["ArrowDown"]) camera.position.addScaledVector(dir, -speed);
    if (keys.current["KeyA"] || keys.current["ArrowLeft"]) camera.position.addScaledVector(right, speed);
    if (keys.current["KeyD"] || keys.current["ArrowRight"]) camera.position.addScaledVector(right, -speed);
    
    // Vertical movement
    if (keys.current["Space"]) camera.position.y += speed;
    if (keys.current["ShiftLeft"]) camera.position.y -= speed;
  });

  return null;
}


export default function AudioTestPage() {
  const { ensureAudioContext, audioState } = useAudioController();
  
  const audioDistanceModel = useGameStore((state) => state.audioDistanceModel);
  const setAudioDistanceModel = useGameStore((state) => state.setAudioDistanceModel);
  const audioRefDistance = useGameStore((state) => state.audioRefDistance);
  const setAudioRefDistance = useGameStore((state) => state.setAudioRefDistance);
  const audioMaxDistance = useGameStore((state) => state.audioMaxDistance);
  const setAudioMaxDistance = useGameStore((state) => state.setAudioMaxDistance);
  const audioRolloffFactor = useGameStore((state) => state.audioRolloffFactor);
  const setAudioRolloffFactor = useGameStore((state) => state.setAudioRolloffFactor);
  const audioVoice = useGameStore((state) => state.audioVoice || "nova");
  const setAudioVoice = useGameStore((state) => state.setAudioVoice);

  const defaultText = "Hi, I'm Nova. I'm a generative agent. Use WASD to walk around me while I speak to test the spatial audio falloff and panning in this 3D space.";
  const [testText, setTestText] = useState(defaultText);
  const [isPlaying, setIsPlaying] = useState(false);

  // Stop playback when voice is switched
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("agent-stop", { detail: { agentId: "test-agent-audio" } }));
  }, [audioVoice]);

  useEffect(() => {
    setIsPlaying(audioState === "speaking" || audioState === "fetching_primary" || audioState === "fetching_fallback");
  }, [audioState]);

  const playerRef = useRef<THREE.Group>(null);

  const handlePlayAudio = async () => {
    await ensureAudioContext();
    window.dispatchEvent(
      new CustomEvent("agent-speak", {
        detail: {
          agentId: "test-agent-audio",
          text: testText,
        },
      })
    );
  };

  const applyPreset = async (presetName: string) => {
    await ensureAudioContext();
    switch (presetName) {
      case "whisper":
        setAudioDistanceModel("exponential");
        setAudioRefDistance(1);
        setAudioMaxDistance(10);
        setAudioRolloffFactor(5);
        setTestText("I'm whispering for close-range testing. If you step back just a bit, I'll fade away.");
        break;
      case "room":
        setAudioDistanceModel("exponential");
        setAudioRefDistance(5);
        setAudioMaxDistance(50);
        setAudioRolloffFactor(1);
        setTestText("This is a standard room volume. It's balanced for casual interactions at a medium distance.");
        break;
      case "pa_system":
        setAudioDistanceModel("linear");
        setAudioRefDistance(15);
        setAudioMaxDistance(150);
        setAudioRolloffFactor(0.5);
        setTestText("Attention. This is a loud PA broadcast designed to carry across large distances in the facility.");
        break;
    }
  };

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", fontFamily: "Inter, -apple-system, sans-serif", background: "#050505", color: "#f5f5f7", overflow: "hidden" }}>
      
      {/* 3D Viewport */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0, background: "radial-gradient(circle at center, #1a1a2e 0%, #050505 100%)" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at center, transparent 0%, rgba(0,0,0,1) 120%)", pointerEvents: "none", zIndex: 1 }} />
        
        <Canvas camera={{ position: [0, 10.5, 15], fov: 45 }}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[15, 20, 5]} intensity={1.5} castShadow shadow-bias={-0.0001} />
          <pointLight position={[-10, 10, -10]} intensity={0.5} color="#007aff" />
          <Environment preset="night" />
          
          <SoftShadows size={20} samples={10} focus={0.5} />
          <Grid position={[0, 5.5, 0]} infiniteGrid fadeDistance={80} cellColor="rgba(255,255,255,0.05)" sectionColor="rgba(255,255,255,0.02)" cellThickness={1} sectionThickness={1.5} />
          
          {/* FlyControls gives us mouse drag to look around. We wrote FreeCamera for solid WASD without physics quirks */}
          <FlyControls movementSpeed={0} rollSpeed={0.5} dragToLook />
          <FreeCamera />

          <group ref={playerRef} position={[5, 5.5, 5]}>
            <mesh position={[0, 1, 0]} castShadow>
              <boxGeometry args={[1, 2, 1]} />
              <meshStandardMaterial color="#007aff" emissive="#007aff" emissiveIntensity={0.3} roughness={0.2} metalness={0.8} />
            </mesh>
            <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.8, 1, 32]} />
              <meshBasicMaterial color="#007aff" transparent opacity={0.5} />
            </mesh>
            {/* Visual halo for broadcast range context visualization */}
            <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[audioRefDistance, 64]} />
              <meshBasicMaterial color="#34c759" transparent opacity={0.05} />
            </mesh>
          </group>
          
          <AIRobot playerRef={playerRef} initialPosition={[0, 0, 0]} id="test-agent-audio" />
        </Canvas>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }

        .floating-widget {
          background: rgba(18, 18, 22, 0.6);
          backdrop-filter: blur(40px) saturate(180%);
          -webkit-backdrop-filter: blur(40px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 20px 40px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.05);
          border-radius: 20px;
          z-index: 10;
        }

        .premium-slider {
          -webkit-appearance: none;
          width: 100%;
          height: 6px;
          background: rgba(255,255,255,0.08);
          border-radius: 6px;
          outline: none;
          transition: background 0.3s;
        }
        .premium-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          box-shadow: 0 0 10px rgba(0,0,0,0.3), 0 2px 5px rgba(0,0,0,0.4);
          transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .premium-slider::-webkit-slider-thumb:hover { transform: scale(1.2); }

        .premium-select, .premium-textarea {
          background: rgba(20, 20, 24, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff;
          border-radius: 12px;
          padding: 12px 14px;
          font-family: inherit;
          font-size: 13px;
          transition: all 0.3s ease;
          outline: none;
          width: 100%;
        }
        .premium-select:focus, .premium-textarea:focus {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.3);
          box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.05);
        }

        .play-button {
          background: linear-gradient(135deg, #007aff, #005bb5);
          color: white;
          border: none;
          border-radius: 14px;
          padding: 0 20px;
          height: 100%;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
          box-shadow: 0 8px 20px rgba(0, 122, 255, 0.3), inset 0 1px 1px rgba(255,255,255,0.2);
        }
        .play-button:hover:not(:disabled) {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 12px 24px rgba(0, 122, 255, 0.4), inset 0 1px 1px rgba(255,255,255,0.3);
        }
        .play-button:active:not(:disabled) { transform: translateY(1px) scale(0.98); }
        .play-button:disabled {
          background: linear-gradient(135deg, #333, #222);
          color: rgba(255,255,255,0.5);
          box-shadow: none;
        }

        .preset-btn {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.8);
          border-radius: 10px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .preset-btn:hover {
          background: rgba(255,255,255,0.15);
          color: #fff;
        }

        .waveform { display: flex; gap: 4px; align-items: flex-end; height: 18px; }
        .wave-bar { width: 4px; background: currentColor; border-radius: 4px; animation: wave 1s ease-in-out infinite alternate; }
        .wave-bar:nth-child(2) { animation-delay: 0.15s; }
        .wave-bar:nth-child(3) { animation-delay: 0.3s; }
        .wave-bar:nth-child(4) { animation-delay: 0.45s; }

        @keyframes wave { 0% { height: 4px; } 100% { height: 18px; } }

        .anim-slide-in { animation: slideIn 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; opacity: 0; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(20px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}} />

      {/* Constraints & Layout - Refined for zero overlaps */}

      {/* TOP LEFT: Header */}
      <div 
        className="floating-widget anim-slide-in" 
        style={{ position: "absolute", top: "32px", left: "32px", padding: "16px 24px", display: "flex", alignItems: "center", gap: "16px", animationDelay: "0.1s" }}
      >
        <div style={{ background: "linear-gradient(135deg, #fff, #bbb)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          <Volume2 size={32} strokeWidth={1.5} />
        </div>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: "600", letterSpacing: "-0.02em", margin: "0 0 2px 0", color: "#fff" }}>
            Audio Studio
          </h1>
          <p style={{ margin: 0, fontSize: "12px", color: "rgba(255,255,255,0.4)", fontWeight: 400 }}>
            Precision spatial tuning
          </p>
        </div>
      </div>

      {/* TOP CENTER: Quick Presets */}
      <div 
        className="floating-widget anim-slide-in" 
        style={{ position: "absolute", top: "32px", left: "50%", transform: "translateX(-50%)", padding: "12px 16px", display: "flex", gap: "12px", animationDelay: "0.15s" }}
      >
        <button className="preset-btn" onClick={() => applyPreset("whisper")}>
          <Zap size={14} /> Whisper
        </button>
        <button className="preset-btn" onClick={() => applyPreset("room")}>
          <LayoutTemplate size={14} /> Normal Room
        </button>
        <button className="preset-btn" onClick={() => applyPreset("pa_system")}>
          <Volume2 size={14} /> PA System
        </button>
      </div>

      {/* TOP RIGHT: Info Box */}
      <div 
        className="floating-widget anim-slide-in" 
        style={{ position: "absolute", top: "32px", right: "32px", padding: "12px 20px", display: "flex", alignItems: "center", gap: "12px", animationDelay: "0.4s" }}
      >
        <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Info size={14} style={{ color: "#fff" }} />
        </div>
        <p style={{ margin: 0, fontSize: "13px", color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>
          <strong style={{ color: "#fff" }}>WASD</strong> to move &middot; <strong style={{ color: "#fff" }}>Click+Drag</strong> to look
        </p>
      </div>

      {/* MIDDLE LEFT: Spatial Parameters (Moved to Left Side to balance UI) */}
      <div 
        className="floating-widget anim-slide-in" 
        style={{ position: "absolute", left: "32px", top: "120px", width: "300px", padding: "24px", display: "flex", flexDirection: "column", gap: "28px", animationDelay: "0.2s" }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <Settings2 size={16} strokeWidth={2} style={{ color: "#007aff" }} />
            <label style={{ fontSize: "12px", fontWeight: "600", letterSpacing: "1px", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>Environment Curve</label>
          </div>
          <select className="premium-select" value={audioDistanceModel} onChange={(e) => setAudioDistanceModel(e.target.value as any)}>
            <option value="linear">Linear (Hard drop)</option>
            <option value="inverse">Inverse (Acoustic naturally)</option>
            <option value="exponential">Exponential (Studio damped)</option>
          </select>
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <Mic2 size={16} strokeWidth={2} style={{ color: "#ff2d55" }} />
            <label style={{ fontSize: "12px", fontWeight: "600", letterSpacing: "1px", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>Speech Persona</label>
          </div>
          <select className="premium-select" value={audioVoice} onChange={(e) => setAudioVoice(e.target.value)}>
            <option value="alloy">Alloy (Neutral, versatile)</option>
            <option value="echo">Echo (Warm, masculine)</option>
            <option value="fable">Fable (Expressive, British/European)</option>
            <option value="onyx">Onyx (Deep, authoritative)</option>
            <option value="nova">Nova (Bright, feminine)</option>
            <option value="shimmer">Shimmer (Clear, articulate)</option>
          </select>
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
            <Activity size={16} strokeWidth={2} style={{ color: "#34c759" }} />
            <label style={{ fontSize: "12px", fontWeight: "600", letterSpacing: "1px", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>Spatial Bounds</label>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <label style={{ fontSize: "13px", color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>Ref Distance</label>
                <span style={{ fontSize: "12px", fontFamily: "monospace", color: "#34c759", background: "rgba(52,199,89,0.1)", padding: "2px 6px", borderRadius: "4px" }}>{audioRefDistance.toFixed(1)}m</span>
              </div>
              <input 
                className="premium-slider" type="range" min="0.1" max="20" step="0.1"
                value={audioRefDistance} onChange={(e) => setAudioRefDistance(parseFloat(e.target.value))}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <label style={{ fontSize: "13px", color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>Max Bounds</label>
                <span style={{ fontSize: "12px", fontFamily: "monospace", color: "#34c759", background: "rgba(52,199,89,0.1)", padding: "2px 6px", borderRadius: "4px" }}>{audioMaxDistance.toFixed(1)}m</span>
              </div>
              <input 
                className="premium-slider" type="range" min="10" max="200" step="1"
                value={audioMaxDistance} onChange={(e) => setAudioMaxDistance(parseFloat(e.target.value))}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <label style={{ fontSize: "13px", color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>Rolloff Curve</label>
                <span style={{ fontSize: "12px", fontFamily: "monospace", color: "#34c759", background: "rgba(52,199,89,0.1)", padding: "2px 6px", borderRadius: "4px" }}>{audioRolloffFactor.toFixed(1)}x</span>
              </div>
              <input 
                className="premium-slider" type="range" min="0" max="10" step="0.1"
                value={audioRolloffFactor} onChange={(e) => setAudioRolloffFactor(parseFloat(e.target.value))}
              />
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM CENTER: Broadcast Payload Panel */}
      <div 
        className="floating-widget anim-slide-in" 
        style={{ position: "absolute", bottom: "32px", left: "50%", transform: "translateX(-50%)", width: "600px", padding: "12px 14px", display: "flex", gap: "14px", alignItems: "center", animationDelay: "0.3s" }}
      >
        <div style={{ padding: "0 8px", color: "rgba(255,255,255,0.5)" }}>
          <Mic2 size={24} strokeWidth={1.5} style={{ color: isPlaying ? "#007aff" : "inherit", transition: "color 0.3s" }} />
        </div>
        
        <input
          className="premium-textarea"
          value={testText}
          onChange={(e) => setTestText(e.target.value)}
          placeholder="Type a message to cast into the 3D space..."
          style={{ flex: 1, height: "46px", padding: "0 16px", borderRadius: "10px", border: "1px solid transparent", background: "transparent", fontSize: "15px" }}
        />

        <div style={{ height: "46px" }}>
          <button className="play-button" onClick={handlePlayAudio} disabled={isPlaying}>
            {isPlaying ? (
              <div className="waveform">
                <div className="wave-bar"></div>
                <div className="wave-bar"></div>
                <div className="wave-bar"></div>
                <div className="wave-bar"></div>
              </div>
            ) : (
              <>
                <Play size={18} fill="currentColor" />
                <span>Cast Audio</span>
              </>
            )}
          </button>
        </div>
      </div>

    </div>
  );
}
