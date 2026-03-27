"use client";

import React, { useEffect, useRef } from "react";
import { useGameStore } from "@/store/gameStore";
import styles from "./AgentCommunicationPanel.module.css";

function formatAgentLabel(agentId: string): string {
  const match = /^agent-0*(\d+)$/.exec(agentId);
  if (match) {
    return `Assistance ${match[1]}`;
  }
  return agentId;
}

export const AgentCommunicationPanel: React.FC = () => {
  const isOpen = useGameStore((state) => state.isCommonChatOpen);
  const setCommonChatOpen = useGameStore((state) => state.setCommonChatOpen);
  const messages = useGameStore((state) => state.commonAgentMessages);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleClose = () => setCommonChatOpen(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={styles.commOverlay}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className={styles.commHeader}>
        <div className={styles.commTitle}>
          <span className={styles.commIcon}>💬</span>
          <span>Agent communication</span>
        </div>
        <button
          type="button"
          className={styles.commCloseBtn}
          onClick={handleClose}
          aria-label="Close"
        >
          ESC <span style={{ opacity: 0.6 }}>Close</span>
        </button>
      </div>
      <div className={styles.commMessages}>
        {messages.length === 0 ? (
          <div className={styles.commEmpty}>No messages yet.</div>
        ) : (
          messages.map((m, idx) => {
            // Detect inter-agent negotiation messages by their emoji markers
            const isNegotiation =
              m.role === "agent" &&
              /^[🔍🙋✋✅👍👌]/.test(m.text);

            return (
              <div
                key={idx}
                className={`${styles.commBubble} ${
                  m.role === "user"
                    ? styles.commUser
                    : isNegotiation
                      ? styles.commNegotiation
                      : styles.commAgent
                }`}
              >
                <div className={styles.commAgentLabel}>
                  {m.role === "user" ? "Supervisor" : formatAgentLabel(m.agentId)}
                </div>
                <div className={styles.commText}>{m.text}</div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};
