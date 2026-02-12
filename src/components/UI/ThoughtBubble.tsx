import React, { useRef, useState, useEffect } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { ClientBrain } from "../Systems/ClientBrain";
import * as THREE from "three";
import { Maximize2, Minimize2, Cpu, Activity, Clock } from "lucide-react";
import styles from "./ThoughtBubble.module.css";

interface ThoughtBubbleProps {
  brain: ClientBrain;
  isInspected?: boolean;
}

interface ThoughtLog {
  id: string;
  text: string;
  timestamp: number;
  type: "THOUGHT" | "ACTION";
}

export const ThoughtBubble: React.FC<ThoughtBubbleProps> = ({ brain, isInspected }) => {
  const [currentThought, setCurrentThought] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Local History State
  const [history, setHistory] = useState<ThoughtLog[]>([]);

  // Optimization Refs
  const frameCount = useRef(0);
  const lastThoughtTime = useRef(0);
  const clearTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Polling Logic
  useFrame(() => {
    frameCount.current++;
    if (frameCount.current % 10 === 0) {
      // Update Thinking Status
      if (brain.state.isThinking !== isThinking) {
        setIsThinking(brain.state.isThinking);
      }

      // Update Thought Content
      if (brain.state.lastThoughtTime > lastThoughtTime.current) {
        const newText = brain.state.thought;

        // Only update if it's a new thought string (dedupe)
        if (newText !== currentThought) {
          setCurrentThought(newText);
          lastThoughtTime.current = brain.state.lastThoughtTime;

          // Add to history
          setHistory((prev) => [
            {
              id: crypto.randomUUID(),
              text: newText,
              timestamp: Date.now(),
              type: "THOUGHT",
            },
            ...prev.slice(0, 19), // Keep last 20
          ]);

          // Reset Auto-Clear Timer
          if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
          clearTimerRef.current = setTimeout(() => {
            setCurrentThought("");
          }, 5000);
        }
      }
    }
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    };
  }, []);

  return (
    <Html
      position={isInspected ? [0, 8.5, 0] : [0, 8.2, 0]}
      center
      distanceFactor={isInspected ? undefined : 24}
      zIndexRange={isInspected ? [100, 0] : undefined}
      occlude
      style={{
        pointerEvents: "auto",
        userSelect: "none",
        opacity: 1,
        transform: isInspected ? "scale(0.85)" : "none",
        transformOrigin: "bottom center",
      }}
    >
      <div className={`${styles.container} ${expanded ? styles.expanded : ""}`}>
        {/* --- MAIN WINDOW --- */}
        <div className={styles.window}>
          {/* Header / Status Bar */}
          <div className={styles.header} onClick={() => setExpanded(!expanded)}>
            <div className={styles.status}>
              {isThinking ? (
                <Activity className={`${styles.pulse}`} size={14} />
              ) : (
                <Cpu size={14} color="#10b981" />
              )}
              <span className={styles.statusText}>
                {isThinking ? "PROCESSING" : "NEURAL LINK"}
              </span>
            </div>

            <div style={{ opacity: 0.5 }}>
              {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </div>
          </div>

          {/* Content Area */}
          <div className={styles.content}>
            {/* Current Thought (Always Visible) */}
            <div style={{ minHeight: "20px" }}>
              {isThinking ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div
                    style={{
                      height: "6px",
                      width: "80%",
                      background: "rgba(255,255,255,0.1)",
                      borderRadius: "4px",
                      animation: "pulse 1s infinite",
                    }}
                  />
                  <div
                    style={{
                      height: "6px",
                      width: "50%",
                      background: "rgba(255,255,255,0.1)",
                      borderRadius: "4px",
                      animation: "pulse 1s infinite",
                      animationDelay: "0.1s",
                    }}
                  />
                </div>
              ) : (
                <p className={styles.thoughtText}>
                  {currentThought || (
                    <span style={{ opacity: 0.3, fontStyle: "italic" }}>
                      System Idle
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Expanded History */}
            {expanded && (
              <div className={styles.history}>
                <div
                  style={{
                    fontSize: "9px",
                    fontFamily: "monospace",
                    color: "rgba(255,255,255,0.3)",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    marginBottom: "8px",
                  }}
                >
                  Recent Logs
                </div>
                {history.map((log) => (
                  <div key={log.id} className={styles.historyItem}>
                    <div className={styles.historyDot} />
                    <div style={{ flex: 1 }}>
                      <p className={styles.historyText}>{log.text}</p>
                      <div className={styles.timestamp}>
                        <Clock size={10} />
                        <span>
                          {new Date(log.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Connecting Line */}
        <div className={styles.connector} />
      </div>
    </Html>
  );
};
