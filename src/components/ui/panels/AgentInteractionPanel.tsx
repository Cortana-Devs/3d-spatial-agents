/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/preserve-manual-memoization */
import React, { useRef, useState, useEffect } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { ClientBrain } from "@/systems/ClientBrain";
import { MessageSquare, Cpu, Activity, Clock, Terminal, Edit3 } from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import styles from "./AgentInteractionPanel.module.css";

interface AgentInteractionPanelProps {
  agentId: string;
  brain: ClientBrain;
}

interface ThoughtLog {
  id: string;
  text: string;
  timestamp: number;
}

type TabType = "interaction" | "intelligence" | "protocol";

export const AgentInteractionPanel: React.FC<AgentInteractionPanelProps> = ({
  agentId,
  brain,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("intelligence");
  const [currentThought, setCurrentThought] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [history, setHistory] = useState<ThoughtLog[]>([]);

  const nearbyAgentId = useGameStore((state) => state.nearbyAgentId);
  const chatPromptVisible = useGameStore((state) => state.chatPromptVisible);
  const inspectedAgentId = useGameStore((state) => state.inspectedAgentId);
  
  const isNearby = chatPromptVisible && nearbyAgentId === agentId;
  const isInspected = inspectedAgentId === agentId;

  const agentOverrides = useGameStore((state) => state.agentPromptOverrides);
  const setAgentOverride = useGameStore((state) => state.setAgentPromptOverride);
  const [draftPrompt, setDraftPrompt] = useState("");

  useEffect(() => {
    if (activeTab === "protocol") {
      setDraftPrompt(agentOverrides[agentId] || "");
    }
  }, [agentOverrides, agentId, activeTab]);

  // Sync tab with proximity
  useEffect(() => {
    if (isNearby) {
      setActiveTab("interaction");
    }
  }, [isNearby]);

  // Internal Logic (Ported from ThoughtBubble)
  const frameCount = useRef(0);
  const lastThoughtTime = useRef(0);
  const clearTimerRef = useRef<NodeJS.Timeout | null>(null);

  useFrame(() => {
    frameCount.current++;
    if (frameCount.current % 10 === 0) {
      if (brain.state.isThinking !== isThinking) {
        setIsThinking(brain.state.isThinking);
      }

      if (brain.state.lastThoughtTime > lastThoughtTime.current) {
        const newText = brain.state.thought;
        if (newText !== currentThought) {
          setCurrentThought(newText);
          lastThoughtTime.current = brain.state.lastThoughtTime;

          setHistory((prev) => [
            { id: crypto.randomUUID(), text: newText, timestamp: Date.now() },
            ...prev.slice(0, 19),
          ]);

          if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
          clearTimerRef.current = setTimeout(() => {
            setCurrentThought("");
          }, 8000);
        }
      }
    }
  });

  useEffect(() => {
      return () => { if (clearTimerRef.current) clearTimeout(clearTimerRef.current); };
  }, []);

  // Don't show anything if not inspected and not nearby (or adjust as desired)
  // For now, let's show it if inspected or nearby, or always show Intelligence at a distance.
  const visible = isInspected || isNearby || currentThought !== "" || isThinking;
  if (!visible) return null;

  return (
    <Html
      position={isInspected ? [0, 9.2, 0] : [0, 8.8, 0]}
      center
      distanceFactor={isInspected ? undefined : 20}
      zIndexRange={isInspected ? [100, 0] : [50, 0]}
      occlude
      style={{
        pointerEvents: "auto",
        userSelect: "none",
        transform: isInspected ? "scale(0.85)" : "none",
        transformOrigin: "bottom center",
      }}
    >
      <div className={`${styles.container} ${isInspected ? styles.expanded : ""}`}>
        <div className={`${styles.window} ${isNearby ? styles.activePrompt : ""}`}>
          {/* Tab Bar */}
          <div className={styles.tabBar}>
            <div 
              className={`${styles.tab} ${activeTab === 'interaction' ? styles.activeTab : ""}`}
              onClick={() => setActiveTab("interaction")}
            >
              <MessageSquare size={12} />
              <span>Connect</span>
            </div>
            <div 
              className={`${styles.tab} ${activeTab === 'intelligence' ? styles.activeTab : ""}`}
              onClick={() => setActiveTab("intelligence")}
            >
              <Cpu size={12} />
              <span>Intelligence</span>
            </div>
            <div 
              className={`${styles.tab} ${activeTab === 'protocol' ? styles.activeTab : ""}`}
              onClick={() => setActiveTab("protocol")}
            >
              <Edit3 size={12} />
              <span>Protocol</span>
            </div>
          </div>

          <div className={styles.content}>
            {activeTab === "protocol" ? (
               <div className={styles.intelContent} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '10px', opacity: 0.7, marginBottom: '4px' }}>System Prompt Override</div>
                  <textarea 
                    value={draftPrompt}
                    onChange={(e) => setDraftPrompt(e.target.value)}
                    onPointerDownCapture={(e) => e.stopPropagation()} // Let user drag inside text area
                    placeholder="Enter custom instructions to override default personality..."
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', padding: '8px', fontSize: '11px', borderRadius: '4px', resize: 'none', minHeight: '80px', pointerEvents: 'auto' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                     <button 
                       onClick={() => setDraftPrompt("")} 
                       style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', cursor: 'pointer', padding: '4px 8px', fontSize: '10px', borderRadius: '4px', pointerEvents: 'auto' }}>
                       Clear
                     </button>
                     <button 
                       onClick={() => {
                          setAgentOverride(agentId, draftPrompt);
                          setActiveTab("intelligence"); 
                       }} 
                       style={{ background: '#00f2ff', color: 'black', border: 'none', cursor: 'pointer', padding: '4px 12px', fontSize: '10px', fontWeight: 'bold', borderRadius: '4px', pointerEvents: 'auto' }}>
                       Save Protocol
                     </button>
                  </div>
               </div>
            ) : activeTab === "interaction" ? (
              <div className={styles.interactionContent}>
                <div className={styles.greeting}>👋 Hello! Need any help?</div>
                <div className={styles.keys}>
                    <div className={`${styles.key} ${styles.keyYes}`}>
                        <kbd>Y</kbd>
                        <span>Yes, chat</span>
                    </div>
                    <div className={`${styles.key} ${styles.keyNo}`}>
                        <kbd>N</kbd>
                        <span>No thanks</span>
                    </div>
                </div>
              </div>
            ) : (
              <div className={styles.intelContent}>
                <div style={{ minHeight: "24px" }}>
                  {isThinking ? (
                    <div className={styles.pulse} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Activity size={14} />
                        <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '1px' }}>PROCESSING...</span>
                    </div>
                  ) : (
                    <p className={styles.thoughtText}>
                      {currentThought || <span style={{ opacity: 0.3, fontStyle: "italic" }}>System Idle</span>}
                    </p>
                  )}
                </div>
                
                {history.length > 0 && (
                    <div className={styles.history}>
                      <div style={{ fontSize: '9px', opacity: 0.4, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Terminal size={10} /> RECENT LOGS
                      </div>
                      {history.slice(0, 3).map((log) => (
                        <div key={log.id} className={styles.historyItem}>
                          <div className={styles.historyDot} />
                          <div style={{ flex: 1 }}>
                            <p className={styles.historyText}>{log.text}</p>
                            <div className={styles.timestamp}>
                              <Clock size={10} />
                              <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className={styles.connector} />
      </div>
    </Html>
  );
};
