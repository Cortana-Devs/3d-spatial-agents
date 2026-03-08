import React from "react";
import { Html } from "@react-three/drei";
import { useGameStore } from "@/store/gameStore";
import styles from "./AgentChatPanel.module.css";

interface AgentChatPromptProps {
  agentId: string;
}

export const AgentChatPrompt: React.FC<AgentChatPromptProps> = ({
  agentId,
}) => {
  const nearbyAgentId = useGameStore((state) => state.nearbyAgentId);
  const chatPromptVisible = useGameStore((state) => state.chatPromptVisible);

  // Only show for the agent that's greeting the player
  if (!chatPromptVisible || nearbyAgentId !== agentId) return null;

  return (
    <Html
      position={[0, 9.5, 0]}
      center
      zIndexRange={[200, 0]}
      style={{
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      <div className={styles.promptContainer}>
        <div className={styles.promptBubble}>
          <div className={styles.promptGreeting}>👋 Hello! Need any help?</div>
          <div className={styles.promptKeys}>
            <div className={`${styles.promptKey} ${styles.keyYes}`}>
              <kbd>Y</kbd>
              <span>Yes, let&apos;s chat</span>
            </div>
            <div className={`${styles.promptKey} ${styles.keyNo}`}>
              <kbd>N</kbd>
              <span>No thanks</span>
            </div>
          </div>
        </div>
        <div className={styles.promptConnector} />
      </div>
    </Html>
  );
};
