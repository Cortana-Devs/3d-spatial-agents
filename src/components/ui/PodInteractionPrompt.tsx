"use client";

import React, { useEffect } from "react";
import { useGameStore } from "@/store/gameStore";

export default function PodInteractionPrompt() {
  const focusedPodId = useGameStore((s) => s.focusedPodId);
  const setFocusedPodId = useGameStore((s) => s.setFocusedPodId);
  const pods = useGameStore((s) => s.pods);
  const deployAgent = useGameStore((s) => s.deployAgent);
  const recallAgent = useGameStore((s) => s.recallAgent);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape" && useGameStore.getState().focusedPodId) {
        useGameStore.getState().setFocusedPodId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!focusedPodId) return null;

  const pod = pods[focusedPodId];
  const agentId = pod?.assignedAgentId ?? null;
  const isDeployed = pod?.isDeployed ?? false;
  const empty = !agentId;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(6, 8, 14, 0.72)",
        backdropFilter: "blur(8px)",
      }}
      onClick={() => setFocusedPodId(null)}
      onKeyDown={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-label="Agent pod"
    >
      <div
        style={{
          minWidth: 320,
          maxWidth: 420,
          padding: "28px 32px",
          borderRadius: 16,
          border: "1px solid rgba(61, 139, 253, 0.35)",
          background: "var(--ui-bg)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.55)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.12em",
            color: "rgba(255,255,255,0.45)",
            marginBottom: 8,
          }}
        >
          DEPLOYMENT POD
        </div>
        <h2
          style={{
            margin: "0 0 8px 0",
            fontSize: 22,
            fontWeight: 700,
            color: "#fff",
          }}
        >
          {focusedPodId.toUpperCase()}
        </h2>
        {empty ? (
          <p style={{ color: "rgba(255,255,255,0.65)", marginBottom: 20 }}>
            Empty slot — no agent assigned to this pod.
          </p>
        ) : (
          <p style={{ color: "rgba(255,255,255,0.65)", marginBottom: 20 }}>
            Assigned: <strong>{agentId}</strong>
            <br />
            Status:{" "}
            {isDeployed ? (
              <span style={{ color: "#2ee85a" }}>Active in world (brain online)</span>
            ) : (
              <span style={{ color: "#3d8bfd" }}>Docked (brain in low-power)</span>
            )}
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {!empty && (
            <>
              <button
                type="button"
                disabled={isDeployed}
                onClick={() => {
                  deployAgent(focusedPodId);
                  setFocusedPodId(null);
                }}
                style={{
                  padding: "12px 18px",
                  borderRadius: 10,
                  border: "1px solid rgba(46, 232, 90, 0.5)",
                  background: isDeployed
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(46, 232, 90, 0.15)",
                  color: isDeployed ? "#666" : "#2ee85a",
                  fontWeight: 600,
                  cursor: isDeployed ? "not-allowed" : "pointer",
                }}
              >
                Deploy — full neural activation
              </button>
              <button
                type="button"
                disabled={!isDeployed}
                onClick={() => {
                  recallAgent(focusedPodId);
                  setFocusedPodId(null);
                }}
                style={{
                  padding: "12px 18px",
                  borderRadius: 10,
                  border: "1px solid rgba(61, 139, 253, 0.5)",
                  background: !isDeployed
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(61, 139, 253, 0.15)",
                  color: !isDeployed ? "#666" : "#3d8bfd",
                  fontWeight: 600,
                  cursor: !isDeployed ? "not-allowed" : "pointer",
                }}
              >
                Recall — return to pod &amp; rest
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setFocusedPodId(null)}
            style={{
              marginTop: 8,
              padding: "10px 16px",
              borderRadius: 10,
              border: "1px solid var(--ui-border)",
              background: "transparent",
              color: "rgba(255,255,255,0.75)",
              cursor: "pointer",
            }}
          >
            Close (Esc)
          </button>
        </div>
      </div>
    </div>
  );
}
