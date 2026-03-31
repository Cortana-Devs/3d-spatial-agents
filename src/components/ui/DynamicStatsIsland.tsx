import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { StatsGl } from "@react-three/drei";
import { useGameStore } from "@/store/gameStore";
import { SCENARIO_A_ROUTINE, SCENARIO_B_PROPAGATION, SCENARIO_C_COLLABORATION } from "@/config/ResearchEvaluationScenarios";

function ResearchHUD() {
  const activeScenarioId = useGameStore((state) => state.activeScenarioId);
  const setActiveScenarioId = useGameStore((state) => state.setActiveScenarioId);
  const agentMetrics = useGameStore((state) => state.agentMetrics);
  const currentFps = useGameStore((state) => state.currentFps);
  
  // Extract metrics for the primary agent
  const primaryMetrics = agentMetrics["agent-01"] || { latency: 0, spatialRatio: 0 };

  return (
    <div style={{
      color: "#00f2ff",
      fontFamily: "monospace",
      fontSize: "10px",
      marginTop: "8px",
      padding: "8px",
      borderTop: "1px solid rgba(0, 242, 255, 0.2)",
      pointerEvents: "auto",
      display: "flex",
      flexDirection: "column",
      gap: "4px",
      textShadow: "0 0 5px rgba(0, 242, 255, 0.5)"
    }}>
      <div style={{ fontWeight: "bold", borderBottom: "1px solid rgba(0, 242, 255, 0.1)", paddingBottom: "2px", marginBottom: "2px" }}>
        RESEARCH CONTROL [SO3/SO5]
      </div>
      
      <div style={{ opacity: 0.8 }}>
        SCENARIO: <span style={{ color: "#fff" }}>{activeScenarioId.split("-").slice(1, 2).join(" ").toUpperCase()}</span>
      </div>
      <div style={{ opacity: 0.8 }}>
        COGNITION: <span style={{ color: "#fff" }}>LLAMA-3.1-8B-INSTANT</span>
      </div>
      <div style={{ opacity: 0.8 }}>
        LATENCY: <span style={{ color: "#fff" }}>{primaryMetrics.latency}ms</span>
      </div>
      <div style={{ opacity: 0.8 }}>
        SPATIAL RATIO: <span style={{ color: "#fff" }}>{(primaryMetrics.spatialRatio * 100).toFixed(1)}%</span>
      </div>
      <div style={{ opacity: 0.8 }}>
        WORLD FPS: <span style={{ color: "#fff" }}>{currentFps}</span>
      </div>

      <div style={{
        display: "flex",
        gap: "4px",
        marginTop: "6px"
      }}>
        {[SCENARIO_A_ROUTINE, SCENARIO_B_PROPAGATION, SCENARIO_C_COLLABORATION].map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveScenarioId(s.id)}
            style={{
              background: activeScenarioId === s.id ? "rgba(0, 242, 255, 0.3)" : "rgba(255, 255, 255, 0.05)",
              border: `1px solid ${activeScenarioId === s.id ? "#00f2ff" : "rgba(255, 255, 255, 0.2)"}`,
              color: activeScenarioId === s.id ? "#fff" : "#00f2ff",
              fontSize: "8px",
              padding: "2px 4px",
              cursor: "pointer",
              borderRadius: "3px",
              textTransform: "uppercase"
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

  const [elements] = useState(() => {
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

    sticker.style.padding = "6px";
    sticker.style.background = "rgba(10, 12, 20, 0.85)";
    sticker.style.backdropFilter = "blur(10px)";
    sticker.style.borderRadius = "12px";
    sticker.style.border = "1px solid rgba(0, 242, 255, 0.2)";
    sticker.style.boxShadow = "0 0 15px rgba(0, 242, 255, 0.1)";
    sticker.style.display = "flex";
    sticker.style.flexDirection = "column";

    const inner = document.createElement("div");
    inner.style.pointerEvents = "auto";
    // StatsGL will append itself here
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
      clearStatsGlStyle={false} // Keeping default styles for visibility, but parent handles glassmorphism
    />
  );
}
