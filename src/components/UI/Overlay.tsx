"use client";

import React, { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import GameMenu from "./GameMenu";
import { InspectorPanel } from "./InspectorPanel";
import { TaskAssignmentPanel } from "./TaskAssignmentPanel";
import { CommandBar } from "./CommandBar";
import { AgentChatPanel } from "./AgentChatPanel";
import { AgentCommunicationPanel } from "./AgentCommunicationPanel";
import { memoryStream } from "@/lib/memory/MemoryStream";
import { FileEditorModal } from "./FileEditorModal";

function formatAgentLabel(agentId: string): string {
  const match = /^agent-0*(\d+)$/.exec(agentId);
  if (match) {
    return `Assistance ${match[1]}`;
  }
  return agentId;
}

export default function Overlay() {
  const debugText = useGameStore((state) => state.debugText);
  const debugTarget = useGameStore((state) => state.debugTarget);
  const isTeleporting = useGameStore((state) => state.isTeleporting);
  const isMenuOpen = useGameStore((state) => state.isMenuOpen);
  const setMenuOpen = useGameStore((state) => state.setMenuOpen);
  const isMenuPanelOpen = useGameStore((state) => state.isMenuPanelOpen!); // ! because we know it exists now
  const setMenuPanelOpen = useGameStore((state) => state.setMenuPanelOpen!);
  const keyBindings = useGameStore((state) => state.keyBindings);
  const interactionNotification = useGameStore(
    (state) => state.interactionNotification,
  );
  const playerInventory = useGameStore((state) => state.playerInventory);
  const selectedInventoryIndex = useGameStore(
    (state) => state.selectedInventoryIndex,
  );
  const isPickupMenuOpen = useGameStore((state) => state.isPickupMenuOpen);
  const nearbyItems = useGameStore((state) => state.nearbyItems);
  const selectedPickupIndex = useGameStore(
    (state) => state.selectedPickupIndex,
  );
  const nearbyPlacingAreas = useGameStore((state) => state.nearbyPlacingAreas);
  const activePlacingAreaId = useGameStore(
    (state) => state.activePlacingAreaId,
  );
  const interactionGrid = useGameStore((state) => state.interactionGrid);
  const gridSelection = useGameStore((state) => state.gridSelection);

  // Memory-reset toast
  const [resetToast, setResetToast] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Agent task failure listener
  useEffect(() => {
    const handleTaskFailed = (e: any) => {
      const { agentId, message } = e.detail;
      const gameStore = useGameStore.getState();

      gameStore.setInteractionNotification(
        `[${formatAgentLabel(agentId)}] ⚠️ ${message}`,
      );

      setTimeout(() => {
        if (
          useGameStore.getState().interactionNotification?.includes(agentId)
        ) {
          useGameStore.getState().setInteractionNotification(null);
        }
      }, 4000);

      // Also add to chat log and common agent communication
      gameStore.addChatMessage(agentId, { role: "agent", text: message });
      gameStore.addCommonAgentMessage(agentId, {
        role: "agent",
        text: `⚠️ ${message}`,
      });
    };

    const handleTaskSuccess = (e: any) => {
      const { agentId, message } = e.detail;
      const gameStore = useGameStore.getState();

      gameStore.addCommonAgentMessage(agentId, {
        role: "agent",
        text: message,
      });
      gameStore.setInteractionNotification(
        `[${formatAgentLabel(agentId)}] ✅ ${message}`,
      );

      setTimeout(() => {
        if (
          useGameStore.getState().interactionNotification?.includes(agentId)
        ) {
          useGameStore.getState().setInteractionNotification(null);
        }
      }, 4000);
    };

    window.addEventListener("agent-task-failed", handleTaskFailed);
    window.addEventListener("agent-task-success", handleTaskSuccess);
    return () => {
      window.removeEventListener("agent-task-failed", handleTaskFailed);
      window.removeEventListener("agent-task-success", handleTaskSuccess);
    };
  }, []);

  // Morning check report: show notification (all ok vs missing items)
  useEffect(() => {
    const handleMorningCheckReport = (e: CustomEvent<{
      agentId: string;
      tableId: string;
      missing: string[];
      present: string[];
      allOk: boolean;
    }>) => {
      const { agentId, tableId, missing, allOk } = e.detail;
      const gameStore = useGameStore.getState();
      const label = formatAgentLabel(agentId);
      const msg = allOk
        ? `[${label}] Morning check: all items present on ${tableId}.`
        : `[${label}] Morning check: missing on ${tableId}: ${missing.join(", ")}`;
      gameStore.setInteractionNotification(msg);
      setTimeout(() => {
        if (
          useGameStore.getState().interactionNotification?.includes(agentId)
        ) {
          useGameStore.getState().setInteractionNotification(null);
        }
      }, 5000);
    };

    window.addEventListener(
      "agent-morning-check-report",
      handleMorningCheckReport as EventListener,
    );
    return () => {
      window.removeEventListener(
        "agent-morning-check-report",
        handleMorningCheckReport as EventListener,
      );
    };
  }, []);

  // Bench readiness report: show notification after agents check workbench
  useEffect(() => {
    const handleBenchCheckReport = (e: CustomEvent<{
      agentId: string;
      benchOk: boolean;
      benchStray: string[];
    }>) => {
      const { agentId, benchOk, benchStray } = e.detail;
      const gameStore = useGameStore.getState();
      const label = formatAgentLabel(agentId);
      const msg = benchOk
        ? `[${label}] Bench readiness: main lab workbench clear.`
        : `[${label}] Bench readiness: workbench has stray items: ${benchStray.join(", ")}.`;
      gameStore.setInteractionNotification(msg);
      setTimeout(() => {
        if (
          useGameStore.getState().interactionNotification?.includes(agentId)
        ) {
          useGameStore.getState().setInteractionNotification(null);
        }
      }, 5000);
    };

    window.addEventListener(
      "agent-bench-check-report",
      handleBenchCheckReport as EventListener,
    );
    return () => {
      window.removeEventListener(
        "agent-bench-check-report",
        handleBenchCheckReport as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === keyBindings.menu) {
        // If Task Panel is open, close it first
        if (useGameStore.getState().isTaskPanelOpen) {
          useGameStore.getState().setTaskPanelOpen(false);
          return;
        }
        // If Pickup Menu is open, Close it first
        if (useGameStore.getState().isPickupMenuOpen) {
          useGameStore.getState().setPickupMenuOpen(false);
          useGameStore.getState().setNearbyItems([]);
          return;
        }

        setMenuOpen(!isMenuOpen);
        if (!isMenuOpen) {
          document.exitPointerLock();
        }
      }

      // M key: Toggle Task Assignment Panel
      if (e.code === keyBindings.taskPanel && !isMenuOpen) {
        const isOpen = useGameStore.getState().isTaskPanelOpen;
        useGameStore.getState().setTaskPanelOpen(!isOpen);
        if (!isOpen) {
          document.exitPointerLock();
        }
      }

      // J key: Toggle common agent communication panel
      if (e.code === keyBindings.agentComms && !isMenuOpen) {
        e.preventDefault();
        const isOpen = useGameStore.getState().isCommonChatOpen;
        useGameStore.getState().setCommonChatOpen(!isOpen);
        if (!isOpen) {
          document.exitPointerLock();
        }
      }

      // Slash key: Open NLP Command Bar
      if (
        e.code === keyBindings.commandBar &&
        !isMenuOpen &&
        !useGameStore.getState().isTaskPanelOpen &&
        !useGameStore.getState().isCommandBarOpen
      ) {
        e.preventDefault();
        useGameStore.getState().setCommandBarOpen(true);
        document.exitPointerLock();
      }

      // Ctrl+Shift+M: Flush all agent memories (dev tool)
      if (e.code === "KeyM" && e.ctrlKey && e.shiftKey) {
        e.preventDefault();
        memoryStream.reset().then(() => {
          setResetToast(true);
          if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
          toastTimerRef.current = setTimeout(() => setResetToast(false), 3000);
        });
      }

      // Y/N keys: Agent Chat Prompt Response
      const chatPromptVisible = useGameStore.getState().chatPromptVisible;
      const isChatOpen = useGameStore.getState().isChatOpen;

      if (chatPromptVisible && !isChatOpen) {
        if (e.code === "KeyY") {
          e.preventDefault();
          const agentId = useGameStore.getState().nearbyAgentId;
          if (agentId) {
            useGameStore.getState().setChatPromptVisible(false);
            useGameStore.getState().setChatAgentId(agentId);
            const history = useGameStore.getState().chatMessages[agentId] || [];
            if (history.length === 0) {
              // Add initial greeting from agent
              useGameStore.getState().addChatMessage(agentId, {
                role: "agent",
                  text: `Hello! I'm ${formatAgentLabel(agentId)}, your research lab assistant. How can I help you today?`,
              });
            }
            useGameStore.getState().setChatOpen(true);
            document.exitPointerLock();
          }
        }
        if (e.code === "KeyN") {
          e.preventDefault();
          useGameStore.getState().setChatPromptVisible(false);
          // nearbyAgentId is left set — useYukaAI will see this and set cooldown
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMenuOpen, setMenuOpen, keyBindings]);

  return (
    <>
      {/* Memory Reset Toast */}
      {resetToast && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(76, 175, 80, 0.92)",
            backdropFilter: "blur(12px)",
            color: "white",
            padding: "10px 22px",
            borderRadius: "10px",
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: "14px",
            fontWeight: 600,
            zIndex: 9999,
            pointerEvents: "none",
            boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>🧹</span>
          <span>Agent memories cleared — fresh session started</span>
        </div>
      )}

      {/* Teleport Fade Overlay */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "black",
          opacity: isTeleporting ? 1 : 0,
          transition: "opacity 0.5s ease-in-out",
          pointerEvents: "none",
          zIndex: 100,
        }}
      />

      {/* Debug Text */}
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          color: "white",
          background: "rgba(0,0,0,0.5)",
          padding: "10px 20px",
          borderRadius: "20px",
          fontFamily: "sans-serif",
          pointerEvents: "none",
          userSelect: "none",
          textAlign: "center",
          width: "80%",
          zIndex: 10,
        }}
      >
        {debugText}
      </div>

      {/* Debug Target Info (Bottom Right) */}
      {debugTarget && (
        <div
          style={{
            position: "absolute",
            bottom: "20px",
            right: "20px",
            background: "rgba(0, 0, 0, 0.85)",
            color: "#00ff00",
            padding: "12px",
            borderRadius: "8px",
            fontSize: "14px",
            fontFamily: "monospace",
            whiteSpace: "pre-wrap",
            border: "1px solid #00ff00",
            boxShadow: "0 4px 6px rgba(0,0,0,0.5)",
            minWidth: "250px",
            pointerEvents: "none",
            zIndex: 100,
          }}
        >
          <div
            style={{
              fontWeight: "bold",
              marginBottom: "8px",
              borderBottom: "1px solid #333",
              paddingBottom: "4px",
            }}
          >
            {debugTarget.name}
          </div>
          {debugTarget.type && (
            <div style={{ color: "#aaa" }}>Type: {debugTarget.type}</div>
          )}
          {debugTarget.id && (
            <div style={{ color: "#aaa" }}>ID: {debugTarget.id}</div>
          )}
          {debugTarget.desc && (
            <div
              style={{
                marginTop: "8px",
                fontStyle: "italic",
                color: "#ddd",
                fontSize: "0.9em",
              }}
            >
              {debugTarget.desc}
            </div>
          )}
          <div
            style={{
              marginTop: "8px",
              borderTop: "1px solid #333",
              paddingTop: "4px",
              color: "#888",
            }}
          >
            <div>Pos: {debugTarget.pos}</div>
            <div>Dims: {debugTarget.dims}</div>
          </div>
        </div>
      )}

      {/* Bottom Center Control Bar — visible when ESC is pressed (isMenuOpen) */}
      {isMenuOpen && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1001,
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <button
            onClick={() =>
              setMenuPanelOpen && setMenuPanelOpen(!isMenuPanelOpen)
            }
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px 28px",
              background: isMenuPanelOpen
                ? "rgba(76, 175, 80, 0.25)"
                : "rgba(15, 15, 25, 0.7)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: isMenuPanelOpen
                ? "1px solid rgba(76, 175, 80, 0.6)"
                : "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "14px",
              color: "white",
              fontSize: "15px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: isMenuPanelOpen
                ? "0 0 20px rgba(76, 175, 80, 0.3), 0 8px 32px rgba(0,0,0,0.4)"
                : "0 8px 32px rgba(0,0,0,0.4)",
              transition: "all 0.25s ease",
              letterSpacing: "0.5px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isMenuPanelOpen
                ? "rgba(76, 175, 80, 0.35)"
                : "rgba(25, 25, 40, 0.85)";
              e.currentTarget.style.borderColor = isMenuPanelOpen
                ? "rgba(76, 175, 80, 0.8)"
                : "rgba(255, 255, 255, 0.25)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isMenuPanelOpen
                ? "rgba(76, 175, 80, 0.25)"
                : "rgba(15, 15, 25, 0.7)";
              e.currentTarget.style.borderColor = isMenuPanelOpen
                ? "rgba(76, 175, 80, 0.6)"
                : "rgba(255, 255, 255, 0.12)";
            }}
          >
            <span style={{ fontSize: "18px" }}>☰</span>
            <span>Menu</span>
            <span
              style={{
                fontSize: "11px",
                padding: "2px 8px",
                borderRadius: "6px",
                background: "rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.5)",
                fontWeight: 400,
              }}
            >
              ESC
            </span>
          </button>

          {/* Resume button - closes menu entirely */}
          <button
            onClick={() => setMenuOpen(false)}
            style={{
              padding: "12px 24px",
              background: "rgba(76, 175, 80, 0.2)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(76, 175, 80, 0.4)",
              borderRadius: "14px",
              color: "#4CAF50",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
              transition: "all 0.25s ease",
              letterSpacing: "0.5px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(76, 175, 80, 0.35)";
              e.currentTarget.style.color = "white";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(76, 175, 80, 0.2)";
              e.currentTarget.style.color = "#4CAF50";
            }}
          >
            ▶ Resume
          </button>
        </div>
      )}

      {/* Game Menu Panel — only when menu icon is clicked (Stage 2) */}
      {isMenuPanelOpen && <GameMenu />}

      {/* Interaction Notification Toast */}
      {interactionNotification && (
        <div
          style={{
            position: "absolute",
            top: "100px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "rgba(0, 50, 200, 0.8)",
            color: "white",
            padding: "10px 20px",
            borderRadius: "8px",
            fontWeight: "bold",
            zIndex: 200,
            pointerEvents: "none",
            animation: "fadeInOut 3s forwards",
          }}
        >
          {interactionNotification}
        </div>
      )}

      {/* Inventory Panel */}
      {playerInventory.length > 0 && (
        <div
          style={{
            position: "absolute",
            bottom: "70px",
            left: "20px",
            backgroundColor: "rgba(20, 20, 30, 0.9)",
            color: "white",
            padding: "12px 16px",
            borderRadius: "10px",
            border: "1px solid rgba(100, 100, 255, 0.4)",
            minWidth: "200px",
            maxWidth: "280px",
            zIndex: 150,
            pointerEvents: "auto",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "#aaa",
              marginBottom: "8px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>🎒 INVENTORY ({playerInventory.length})</span>
            <span style={{ fontSize: "10px", color: "#666" }}>Scroll ↕</span>
          </div>
          {playerInventory.map((item, idx) => {
            const isSelected =
              idx ===
              Math.min(selectedInventoryIndex, playerInventory.length - 1);
            const emoji =
              item.type === "file"
                ? "📄"
                : item.type === "laptop"
                  ? "💻"
                  : item.type === "pendrive"
                    ? "💾"
                    : item.type === "coffeecup"
                      ? "☕"
                      : "📦";
            return (
              <div
                key={item.id}
                onClick={() => {
                  if (item.type === "file") {
                    useGameStore.getState().setActiveFileId(item.id);
                    useGameStore.getState().setFileEditorOpen(true);
                    if (document.pointerLockElement) {
                      document.exitPointerLock();
                    }
                  }
                }}
                style={{
                  padding: "4px 8px",
                  marginBottom: "2px",
                  borderRadius: "4px",
                  backgroundColor: isSelected
                    ? "rgba(80, 80, 255, 0.3)"
                    : "transparent",
                  border: isSelected
                    ? "1px solid rgba(100, 100, 255, 0.5)"
                    : "1px solid transparent",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: item.type === "file" ? "pointer" : "default",
                }}
              >
                <span>{isSelected ? "▶" : " "}</span>
                <span>{emoji}</span>
                <span style={{ fontWeight: isSelected ? "bold" : "normal" }}>
                  {item.name}
                </span>
              </div>
            );
          })}
          <div
            style={{
              fontSize: "10px",
              color: "#666",
              marginTop: "6px",
              borderTop: "1px solid #333",
              paddingTop: "4px",
            }}
          >
            T: Place selected | Scroll: Change selection
          </div>
        </div>
      )}

      {/* Unified Nearby Interaction Grid */}
      {interactionGrid.length > 0 && (
        <div
          style={{
            position: "absolute",
            bottom: "200px",
            right: "20px",
            backgroundColor: "rgba(20, 25, 30, 0.95)",
            color: "white",
            padding: "0",
            borderRadius: "12px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            width: "320px",
            zIndex: 151,
            pointerEvents: "none",
            backdropFilter: "blur(12px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            overflow: "hidden",
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "12px 16px",
              background: "rgba(255, 255, 255, 0.03)",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#fff",
                letterSpacing: "0.5px",
              }}
            >
              NEARBY GRID
            </span>
            <span
              style={{
                fontSize: "10px",
                color: "rgba(255, 255, 255, 0.4)",
                background: "rgba(255,255,255,0.05)",
                padding: "2px 6px",
                borderRadius: "4px",
              }}
            >
              Arrows: Move | P: Pick | T: Place
            </span>
          </div>

          {/* Grid Body */}
          <div
            style={{
              maxHeight: "350px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              padding: "12px",
            }}
          >
            {interactionGrid.map((row, rIdx) => (
              <div key={row.id}>
                <div
                  style={{
                    fontSize: "11px",
                    color: "rgba(255,255,255,0.5)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    marginBottom: "6px",
                    paddingLeft: "4px",
                  }}
                >
                  {row.label}
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {row.cells.map((cell, cIdx) => {
                    const isSelected =
                      gridSelection.row === rIdx && gridSelection.col === cIdx;
                    return (
                      <div
                        key={cell.id}
                        style={{
                          border: isSelected
                            ? "1px solid #4CAF50"
                            : "1px solid rgba(255,255,255,0.1)",
                          background: isSelected
                            ? "rgba(76, 175, 80, 0.2)"
                            : "rgba(255,255,255,0.05)",
                          padding: "8px 10px",
                          borderRadius: "8px",
                          minWidth: "50px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "4px",
                          position: "relative",
                          transition: "all 0.15s ease-out",
                          transform: isSelected ? "translateY(-2px)" : "none",
                          boxShadow: isSelected
                            ? "0 4px 12px rgba(76, 175, 80, 0.3)"
                            : "none",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "18px",
                            filter:
                              cell.type === "slot"
                                ? "opacity(0.4) grayscale(100%)"
                                : "none",
                          }}
                        >
                          {cell.icon}
                        </div>
                        <div
                          style={{
                            fontSize: "10px",
                            color: isSelected
                              ? "#fff"
                              : "rgba(255,255,255,0.6)",
                            whiteSpace: "nowrap",
                            maxWidth: "70px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {cell.label}
                        </div>
                        {isSelected && (
                          <div
                            style={{
                              position: "absolute",
                              top: 4,
                              right: 4,
                              width: 6,
                              height: 6,
                              background: "#4CAF50",
                              borderRadius: "50%",
                              boxShadow: "0 0 4px #4CAF50",
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <InspectorPanel />
      <TaskAssignmentPanel />
      <CommandBar />
      <AgentChatPanel />
      <AgentCommunicationPanel />
      <FileEditorModal />
    </>
  );
}
