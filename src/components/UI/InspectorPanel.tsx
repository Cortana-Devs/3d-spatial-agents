
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
        <div style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            width: "300px",
            maxHeight: "80vh",
            backgroundColor: "rgba(10, 10, 15, 0.8)",
            backdropFilter: "blur(10px)",
            borderRadius: "12px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            padding: "16px",
            color: "white",
            zIndex: 200,
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.5)"
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "8px" }}>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "bold", color: "#4ade80" }}>AI Inspector</h3>
                <button
                    onClick={() => {
                        setInspectedAgentId(null);
                        setInspectedAgentData(null);
                    }}
                    style={{
                        background: "rgba(255, 255, 255, 0.1)",
                        border: "none",
                        color: "white",
                        cursor: "pointer",
                        fontSize: "14px",
                        width: "24px",
                        height: "24px",
                        borderRadius: "12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                    }}
                >
                    ✕
                </button>
            </div>

            <div style={{ fontSize: "12px", color: "#aaa", display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px" }}>
                <span>Agent ID:</span>
                <span style={{ color: "#fff", fontFamily: "monospace" }}>{inspectedAgentData.id}</span>
                <span>Status:</span>
                <span style={{ color: "#4ade80", fontWeight: "bold" }}>{inspectedAgentData.state.toUpperCase()}</span>
            </div>

            <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px"
            }}>
                <span style={{ fontSize: "11px", color: "#666", textTransform: "uppercase", letterSpacing: "1px" }}>Neural Stream</span>
                <div style={{
                    backgroundColor: "rgba(0,0,0,0.3)",
                    borderRadius: "8px",
                    padding: "10px",
                    fontSize: "13px",
                    lineHeight: "1.5",
                    overflowY: "auto",
                    maxHeight: "300px",
                    fontFamily: "monospace",
                    color: "#e2e8f0",
                    border: "1px solid rgba(255,255,255,0.05)"
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
