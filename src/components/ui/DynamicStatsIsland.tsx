import React, { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { StatsGl } from "@react-three/drei";
import { useGameStore } from "@/store/gameStore";
import { useShallow } from "zustand/react/shallow";
import { 
  SCENARIO_A_ROUTINE, 
  SCENARIO_B_PROPAGATION, 
  SCENARIO_C_COLLABORATION 
} from "@/config/ResearchEvaluationScenarios";

function ResearchHUD() {
  const { 
    activeScenarioId, 
    setActiveScenarioId, 
    agentMetrics, 
    currentFps, 
    inspectedAgentId,
    activeResearchAgents
  } = useGameStore(useShallow((state) => ({
    activeScenarioId: state.activeScenarioId,
    setActiveScenarioId: state.setActiveScenarioId,
    agentMetrics: state.agentMetrics,
    currentFps: state.currentFps,
    inspectedAgentId: state.inspectedAgentId,
    activeResearchAgents: state.activeResearchAgents
  })));

  // Determine which metrics to display: Inspected Agent or Global Cluster Average
  const displayData = useMemo(() => {
    if (inspectedAgentId && agentMetrics[inspectedAgentId]) {
      const agent = activeResearchAgents.find(a => a.id === inspectedAgentId);
      return {
        label: agent?.name?.toUpperCase() || inspectedAgentId.toUpperCase(),
        latency: agentMetrics[inspectedAgentId].latency,
        spatial: agentMetrics[inspectedAgentId].spatialRatio,
        status: agentMetrics[inspectedAgentId].status || 'ACTIVE',
        isGlobal: false
      };
    }

    // Default to Cluster Average
    const metricValues = Object.values(agentMetrics);
    if (metricValues.length === 0) {
      return { label: "CLUSTER: STANDBY", latency: 0, spatial: 0, status: 'IDLE', isGlobal: true };
    }

    const avgLatency = metricValues.reduce((acc, m) => acc + m.latency, 0) / metricValues.length;
    const avgSpatial = metricValues.reduce((acc, m) => acc + (m.spatialRatio || 0), 0) / metricValues.length;
    
    return {
      label: "CLUSTER: AGGREGATE",
      latency: Math.round(avgLatency),
      spatial: avgSpatial,
      status: 'ACTIVE',
      isGlobal: true
    };
  }, [inspectedAgentId, agentMetrics, activeResearchAgents]);

  const scenarioName = activeScenarioId.split("-").slice(1, 2).join(" ").toUpperCase() || "A";

  return (
    <div style={{
      color: "#00f2ff",
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      fontSize: "10px",
      marginTop: "12px",
      padding: "10px",
      borderTop: "1px solid rgba(0, 242, 255, 0.3)",
      pointerEvents: "auto",
      display: "flex",
      flexDirection: "column",
      gap: "6px",
      background: "linear-gradient(to bottom, rgba(0, 242, 255, 0.05), transparent)",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Decorative Grid Line */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "1px",
        background: "linear-gradient(to right, transparent, #00f2ff, transparent)",
        opacity: 0.5
      }} />

      <div style={{ 
        fontWeight: "bold", 
        letterSpacing: "1px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        color: "#fff",
        textShadow: "0 0 8px rgba(0, 242, 255, 0.6)"
      }}>
        <span>RESEARCH CONTROL</span>
        <span style={{ fontSize: "8px", opacity: 0.5 }}>V3.0.0-PRO</span>
      </div>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "4px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <div style={{ fontSize: "8px", opacity: 0.5, color: "#00f2ff" }}>CONTEXT_SCOPE</div>
          <div style={{ color: displayData.isGlobal ? "#ff00ff" : "#fff", fontWeight: "600" }}>
            {displayData.label}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px", textAlign: "right" }}>
          <div style={{ fontSize: "8px", opacity: 0.5, color: "#00f2ff" }}>SCENARIO_ID</div>
          <div style={{ color: "#fff" }}>{scenarioName}</div>
        </div>
      </div>

      <div style={{ 
        display: "flex", 
        flexDirection: "column", 
        gap: "4px", 
        padding: "6px 0",
        borderTop: "1px dashed rgba(0, 242, 255, 0.1)",
        borderBottom: "1px dashed rgba(0, 242, 255, 0.1)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ opacity: 0.7 }}>COG_LATENCY</span>
          <span style={{ color: displayData.status === 'INITIALIZING' ? "#ffd700" : "#fff" }}>
            {displayData.status === 'INITIALIZING' ? "INIT..." : `${displayData.latency}ms`}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ opacity: 0.7 }}>SPATIAL_DENSITY</span>
          <span style={{ color: "#fff" }}>
            {(displayData.spatial * 100).toFixed(1)}%
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ opacity: 0.7 }}>SYSTEM_FPS</span>
          <span style={{ color: currentFps < 30 ? "#ff4d4d" : "#00ff00" }}>{currentFps}</span>
        </div>
      </div>

      <div style={{
        display: "flex",
        gap: "4px",
        marginTop: "4px"
      }}>
        {[SCENARIO_A_ROUTINE, SCENARIO_B_PROPAGATION, SCENARIO_C_COLLABORATION].map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveScenarioId(s.id)}
            style={{
              flex: 1,
              background: activeScenarioId === s.id ? "rgba(0, 242, 255, 0.2)" : "rgba(255, 255, 255, 0.03)",
              border: `1px solid ${activeScenarioId === s.id ? "#00f2ff" : "rgba(0, 242, 255, 0.1)"}`,
              color: activeScenarioId === s.id ? "#fff" : "#00f2ff",
              fontSize: "8px",
              padding: "3px 0",
              cursor: "pointer",
              borderRadius: "2px",
              textTransform: "uppercase",
              transition: "all 0.2s ease",
              boxShadow: activeScenarioId === s.id ? "0 0 10px rgba(0, 242, 255, 0.2)" : "none"
            }}
          >
            {s.name.split(" ")[1] || s.name.split(" ")[0]}
          </button>
        ))}
      </div>
    </div>
  );
}

export function DynamicStatsIslandUI() {
  const setStatsParent = useGameStore((state) => state.setStatsParent);
  const [mounted, setMounted] = React.useState(false);

  const [elements] = React.useState(() => {
    if (typeof window === "undefined") return null;

    const sticker = document.createElement("div");
    sticker.style.position = "fixed";
    sticker.style.top = "20px";
    sticker.style.left = "20px";
    sticker.style.zIndex = "999999";
    sticker.style.cursor = "grab";
    sticker.style.userSelect = "none";
    sticker.style.touchAction = "none";

    sticker.style.filter = "drop-shadow(0px 8px 16px rgba(0,0,0,0.6)) contrast(1.1)";
    sticker.style.transition = "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
    sticker.style.willChange = "transform, left, top";

    sticker.style.padding = "4px";
    sticker.style.background = "rgba(6, 8, 12, 0.9)";
    sticker.style.backdropFilter = "blur(12px)";
    sticker.style.borderRadius = "4px";
    sticker.style.border = "1px solid rgba(0, 242, 255, 0.3)";
    sticker.style.boxShadow = "inset 0 0 20px rgba(0, 242, 255, 0.05), 0 10px 30px rgba(0,0,0,0.5)";
    sticker.style.display = "flex";
    sticker.style.flexDirection = "column";
    sticker.style.minWidth = "180px";

    const inner = document.createElement("div");
    inner.style.pointerEvents = "auto";
    sticker.appendChild(inner);

    const hudContainer = document.createElement("div");
    hudContainer.id = "research-hud-container";
    sticker.appendChild(hudContainer);

    return { sticker, inner, hudContainer };
  });

  useEffect(() => {
    setMounted(true);
    if (!elements) return;
    const { sticker, inner } = elements;
    document.body.appendChild(sticker);
    setStatsParent(inner);

    let isDragging = false;
    let dragStart = { x: 0, y: 0 };

    const handlePointerDown = (e: PointerEvent) => {
      if (e.button !== 0 || (e.target as HTMLElement).tagName === "BUTTON") return;
      isDragging = true;
      dragStart = { x: e.clientX - sticker.offsetLeft, y: e.clientY - sticker.offsetTop };
      sticker.setPointerCapture(e.pointerId);
      sticker.style.transition = "none";
      sticker.style.cursor = "grabbing";
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      sticker.style.left = `${e.clientX - dragStart.x}px`;
      sticker.style.top = `${e.clientY - dragStart.y}px`;
    };

    const handlePointerUp = (e: PointerEvent) => {
      isDragging = false;
      sticker.style.transition = "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
      sticker.style.cursor = "grab";
    };

    sticker.addEventListener("pointerdown", handlePointerDown);
    sticker.addEventListener("pointermove", handlePointerMove);
    sticker.addEventListener("pointerup", handlePointerUp);

    return () => {
      sticker.removeEventListener("pointerdown", handlePointerDown);
      sticker.removeEventListener("pointermove", handlePointerMove);
      sticker.removeEventListener("pointerup", handlePointerUp);
      if (document.body.contains(sticker)) document.body.removeChild(sticker);
      setStatsParent(null);
    };
  }, [elements, setStatsParent]);

  if (!mounted || !elements) return null;

  return createPortal(<ResearchHUD />, elements.hudContainer);
}

export function DynamicStatsIslandStats() {
  const statsParent = useGameStore((state) => state.statsParent);
  if (!statsParent) return null;

  return (
    <StatsGl
      parent={statsParent as any}
      clearStatsGlStyle={false} 
    />
  );
}
