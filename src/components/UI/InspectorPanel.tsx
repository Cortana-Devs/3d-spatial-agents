
import React, { useEffect, useRef } from "react";
import { useGameStore } from "@/store/gameStore";

export function InspectorPanel() {
    const inspectedAgentData = useGameStore((state) => state.inspectedAgentData);
    const setInspectedAgentId = useGameStore((state) => state.setInspectedAgentId);
    const setInspectedAgentData = useGameStore((state) => state.setInspectedAgentData);

    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [inspectedAgentData?.thought]);

    if (!inspectedAgentData) return null;

    return (
        /* The Inspector uses the standard --ui-bg and --ui-blur tokens to maintain the 
           glassmorphism aesthetic consistently across the 2D overlay. */
        <div style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            width: "300px",
            maxHeight: "80vh",
            backgroundColor: "var(--ui-bg)",
            backdropFilter: "blur(var(--ui-blur))",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--ui-border)",
            padding: "16px",
            color: "var(--foreground)",
            zIndex: 200,
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.5)"
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--ui-border)", paddingBottom: "8px" }}>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "bold", color: "var(--color-success)" }}>AI Inspector</h3>
                <button
                    onClick={() => {
                        setInspectedAgentId(null);
                        setInspectedAgentData(null);
                    }}
                    style={{
                        background: "var(--color-agent-bg)",
                        border: "none",
                        color: "white",
                        cursor: "pointer",
                        fontSize: "14px",
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                    }}
                >
                    ✕
                </button>
            </div>

            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px" }}>
                <span>Agent ID:</span>
                <span style={{ color: "var(--foreground)", fontFamily: "monospace" }}>{inspectedAgentData.id}</span>
                <span>Status:</span>
                <span style={{ color: "var(--color-success)", fontWeight: "bold" }}>{inspectedAgentData.state.toUpperCase()}</span>
            </div>

            <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px"
            }}>
                <span style={{ fontSize: "11px", color: "#666", textTransform: "uppercase", letterSpacing: "1px" }}>Neural Stream</span>
                <div style={{
                    backgroundColor: "var(--color-agent-bg)",
                    borderRadius: "var(--radius-sm)",
                    padding: "10px",
                    fontSize: "13px",
                    lineHeight: "1.5",
                    overflowY: "auto",
                    maxHeight: "300px",
                    fontFamily: "monospace",
                    color: "var(--color-agent-text)",
                    border: "1px solid var(--ui-border)"
                }} ref={scrollRef}>
                    {inspectedAgentData.thought || "Waiting for signal..."}
                </div>
            </div>

            <div style={{ fontSize: "10px", color: "#555", textAlign: "center", marginTop: "4px" }}>
                Live Feed • Secure Connection
            </div>
        </div>
    );
}
