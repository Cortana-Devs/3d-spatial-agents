import React, { useState, useEffect } from "react";
import { Html } from "@react-three/drei";
import styles from "./AgentChatPanel.module.css";
import { useFrame } from "@react-three/fiber";

export function SpeechIndicator({ agentId }: { agentId: string }) {
  const [activeVoice, setActiveVoice] = useState<"NONE" | "LLM" | "LOCAL">("NONE");

  useEffect(() => {
    // Timers to fade out the indicator
    let fadeTimer: NodeJS.Timeout;

    const handleLlmSpeak = (e: any) => {
      if (e.detail?.agentId === agentId) {
        setActiveVoice("LLM");
        clearTimeout(fadeTimer);
        // Estimate TTS length roughly 100ms per char
        const dur = Math.max(2000, (e.detail.text?.length || 20) * 100);
        fadeTimer = setTimeout(() => setActiveVoice("NONE"), dur);
      }
    };

    const handleLocalSpeak = (e: any) => {
      if (e.detail?.agentId === agentId) {
        setActiveVoice("LOCAL");
        clearTimeout(fadeTimer);
        const dur = Math.max(1500, (e.detail.text?.length || 15) * 100);
        fadeTimer = setTimeout(() => setActiveVoice("NONE"), dur);
      }
    };

    window.addEventListener("agent-speak", handleLlmSpeak);
    window.addEventListener("subconscious-speak", handleLocalSpeak);

    return () => {
      window.removeEventListener("agent-speak", handleLlmSpeak);
      window.removeEventListener("subconscious-speak", handleLocalSpeak);
      clearTimeout(fadeTimer);
    };
  }, [agentId]);

  if (activeVoice === "NONE") return null;

  return (
    <Html position={[0, 0.7, 0]} center zIndexRange={[100, 0]}>
      <div
        className={styles.speechIndicator}
        style={{
          background: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(4px)",
          padding: "6px 12px",
          borderRadius: "20px",
          border: `1px solid ${activeVoice === "LLM" ? "rgba(64, 196, 255, 0.5)" : "rgba(180, 180, 180, 0.5)"}`,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          color: "white",
          fontSize: "14px",
          fontWeight: 600,
          animation: "pulsePulse 1.5s infinite ease-in-out",
          boxShadow: `0 0 10px ${activeVoice === "LLM" ? "rgba(64, 196, 255, 0.3)" : "rgba(180, 180, 180, 0.2)"}`
        }}
      >
        {activeVoice === "LLM" ? (
          <>
            <span style={{ fontSize: "16px" }}>☁️</span>
            <span style={{ color: "#40c4ff" }}>Thinking...</span>
          </>
        ) : (
          <>
            <span style={{ fontSize: "16px", display: "inline-block", animation: "spinSpin 2s infinite linear" }}>⚙️</span>
            <span style={{ color: "#dddddd" }}>Muttering...</span>
          </>
        )}
      </div>

      <style>{`
        @keyframes pulsePulse {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.8; }
        }
        @keyframes spinSpin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </Html>
  );
}
