"use client";

import React, { useMemo } from "react";
import { useGameStore } from "@/store/gameStore";
import { AgentTaskRegistry, type AgentTask } from "../Systems/AgentTaskQueue";
import { InteractableRegistry } from "../Systems/InteractableRegistry";
import * as THREE from "three";

// ============================================================================
// Action definitions
// ============================================================================

const ACTIONS = [
  { id: "PICK_NEARBY", label: "📦 Fetch Item", icon: "📦" },
  { id: "PLACE_INVENTORY", label: "📥 Place Carried Item", icon: "📥" },
  { id: "FOLLOW_PLAYER", label: "🏃 Follow Player", icon: "🏃" },
] as const;

// ============================================================================
// Styles
// ============================================================================

const panelStyle: React.CSSProperties = {
  position: "fixed",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "480px",
  maxHeight: "80vh",
  background: "rgba(10, 10, 20, 0.92)",
  backdropFilter: "blur(20px)",
  border: "1px solid rgba(100, 140, 255, 0.25)",
  borderRadius: "16px",
  padding: "24px",
  color: "#e0e8ff",
  fontFamily: "'Inter', 'Segoe UI', sans-serif",
  fontSize: "14px",
  zIndex: 2000,
  boxShadow:
    "0 12px 48px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
  overflowY: "auto",
};

const headerStyle: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: 700,
  margin: "0 0 4px 0",
  color: "#a0c0ff",
  letterSpacing: "-0.3px",
};

const stepIndicatorStyle: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  marginBottom: "16px",
};

const stepDotStyle = (
  active: boolean,
  completed: boolean,
): React.CSSProperties => ({
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  background: completed
    ? "#5080ff"
    : active
      ? "#80b0ff"
      : "rgba(255,255,255,0.15)",
  transition: "background 0.3s ease",
});

const itemStyle = (selected: boolean): React.CSSProperties => ({
  padding: "10px 14px",
  margin: "4px 0",
  borderRadius: "10px",
  cursor: "pointer",
  background: selected
    ? "rgba(80, 128, 255, 0.25)"
    : "rgba(255, 255, 255, 0.04)",
  border: selected
    ? "1px solid rgba(80, 128, 255, 0.6)"
    : "1px solid rgba(255, 255, 255, 0.06)",
  transition: "all 0.15s ease",
  display: "flex",
  alignItems: "center",
  gap: "10px",
});

const btnStyle = (primary: boolean): React.CSSProperties => ({
  padding: "8px 20px",
  borderRadius: "8px",
  border: "none",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "13px",
  background: primary
    ? "linear-gradient(135deg, #3060d0, #5080ff)"
    : "rgba(255, 255, 255, 0.08)",
  color: primary ? "#fff" : "#8098cc",
  transition: "all 0.15s ease",
});

const taskItemStyle: React.CSSProperties = {
  padding: "8px 12px",
  margin: "4px 0",
  borderRadius: "8px",
  background: "rgba(255, 255, 255, 0.04)",
  border: "1px solid rgba(255, 255, 255, 0.06)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: "13px",
};

const statusBadgeStyle = (phase: string): React.CSSProperties => ({
  padding: "2px 8px",
  borderRadius: "10px",
  fontSize: "11px",
  fontWeight: 600,
  background:
    phase === "IDLE" ? "rgba(80, 200, 120, 0.2)" : "rgba(255, 180, 50, 0.2)",
  color: phase === "IDLE" ? "#60d080" : "#ffb040",
});

function formatAgentLabel(agentId: string): string {
  const match = /^agent-0*(\d+)$/.exec(agentId);
  if (match) {
    return `Assistance ${match[1]}`;
  }
  return agentId;
}

// ============================================================================
// Component
// ============================================================================

export function TaskAssignmentPanel() {
  const isOpen = useGameStore((s) => s.isTaskPanelOpen);
  const step = useGameStore((s) => s.taskPanelStep);
  const selectedAgent = useGameStore((s) => s.taskPanelSelectedAgent);
  const selectedAction = useGameStore((s) => s.taskPanelSelectedAction);
  const pendingTasks = useGameStore((s) => s.taskPanelPendingTasks);
  const setStep = useGameStore((s) => s.setTaskPanelStep);
  const setAgent = useGameStore((s) => s.setTaskPanelSelectedAgent);
  const setAction = useGameStore((s) => s.setTaskPanelSelectedAction);
  const addTask = useGameStore((s) => s.addPendingTask);
  const removeTask = useGameStore((s) => s.removePendingTask);
  const clearTasks = useGameStore((s) => s.clearPendingTasks);
  const close = useGameStore((s) => s.setTaskPanelOpen);

  // Get available agents
  const agentIds = useMemo(() => {
    const registry = AgentTaskRegistry.getInstance();
    return registry.getAllAgentIds();
  }, [isOpen]); // Re-compute when panel opens

  // Get pickable items — Fix #1: filter on step AND on dispatch
  // Fix #2: also filter out items that are already claimed by another agent
  const pickableItems = useMemo(() => {
    const reg = InteractableRegistry.getInstance();
    return reg
      .getAll()
      .filter((o) => o.pickable && !o.carriedBy && !reg.isItemClaimed(o.id));
  }, [step]);

  // Get placing areas with room
  const placingAreas = useMemo(() => {
    const reg = InteractableRegistry.getInstance();
    return reg.getAllPlacingAreas().filter((a) => !a.currentItem);
  }, [step]);

  if (!isOpen) return null;

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleClose = () => {
    clearTasks();
    close(false);
  };

  const handleDispatch = () => {
    if (!selectedAgent || pendingTasks.length === 0) return;
    const queue = AgentTaskRegistry.getInstance().getOrCreate(selectedAgent);
    pendingTasks.forEach((task) => queue.enqueue(task));
    clearTasks();
    close(false);
  };

  const formatTask = (task: AgentTask): string => {
    switch (task.type) {
      case "PICK_NEARBY": {
        const item = task.itemId
          ? InteractableRegistry.getInstance().getById(task.itemId)
          : null;
        return `📦 Pick → ${item?.name || task.itemId}`;
      }
      case "PLACE_INVENTORY": {
        const area = task.destAreaId
          ? InteractableRegistry.getInstance().getPlacingAreaById(
              task.destAreaId,
            )
          : null;
        return `📥 Place → ${area?.name || task.destAreaId}`;
      }
      case "FETCH_AND_PLACE":
        return `🔄 Fetch & Place`;
      case "FOLLOW_PLAYER":
        return `🏃 Follow Player`;
      default:
        return `${task.type}`;
    }
  };

  // ==========================================================================
  // STEP 0: Select Agent
  // ==========================================================================
  const renderAgentStep = () => (
    <div>
      <p style={{ color: "#6080aa", margin: "0 0 12px 0", fontSize: "13px" }}>
        Select an agent to assign tasks to:
      </p>
      {agentIds.length === 0 ? (
        <p style={{ color: "#e06060", fontStyle: "italic" }}>
          No agents registered yet. Agents register when they spawn in the
          scene.
        </p>
      ) : (
        agentIds.map((id) => {
          const status = AgentTaskRegistry.getInstance().getQueueStatus(id);
          return (
            <div
              key={id}
              style={itemStyle(selectedAgent === id)}
              onClick={() => {
                setAgent(id);
                setStep(1);
              }}
              onMouseEnter={(e) => {
                if (selectedAgent !== id)
                  e.currentTarget.style.background = "rgba(255,255,255,0.08)";
              }}
              onMouseLeave={(e) => {
                if (selectedAgent !== id)
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              }}
            >
              <span style={{ fontSize: "20px" }}>🤖</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>
                  {formatAgentLabel(id)}
                </div>
                <div style={{ fontSize: "11px", color: "#6080aa" }}>
                  AI Research Lab Assistant
                </div>
              </div>
              <span style={statusBadgeStyle(status.phase)}>{status.phase}</span>
            </div>
          );
        })
      )}
    </div>
  );

  // ==========================================================================
  // STEP 1: Select Action
  // ==========================================================================
  const renderActionStep = () => (
    <div>
      <p style={{ color: "#6080aa", margin: "0 0 12px 0", fontSize: "13px" }}>
        Select action for{" "}
        <strong style={{ color: "#80b0ff" }}>
          {selectedAgent ? formatAgentLabel(selectedAgent) : ""}
        </strong>
        :
      </p>
      {ACTIONS.map((action) => {
        // Capacity check: Can't fetch if already carrying or if queue has a fetch without a place
        let disabled = false;
        let reason = "";

        if (action.id === "PICK_NEARBY" && selectedAgent) {
          const carriedItems =
            InteractableRegistry.getInstance().getAllCarriedBy(selectedAgent);
          const hasPendingFetch = pendingTasks.some(
            (t) => t.type === "PICK_NEARBY" || t.type === "FETCH_AND_PLACE",
          );
          const hasPendingPlace = pendingTasks.some(
            (t) => t.type === "PLACE_INVENTORY",
          );

          if (carriedItems.length > 0 && !hasPendingPlace) {
            disabled = true;
            reason = "(Inventory Full)";
          } else if (hasPendingFetch && !hasPendingPlace) {
            // Simplified check for 1 slot
            disabled = true;
            reason = "(Queue Full)";
          }
        }

        if (action.id === "PLACE_INVENTORY" && selectedAgent) {
          const carriedItems =
            InteractableRegistry.getInstance().getAllCarriedBy(selectedAgent);
          const hasPendingFetch = pendingTasks.some(
            (t) => t.type === "PICK_NEARBY" || t.type === "FETCH_AND_PLACE",
          );

          if (carriedItems.length === 0 && !hasPendingFetch) {
            disabled = true;
            reason = "(Inventory Empty)";
          }
        }

        return (
          <div
            key={action.id}
            style={{
              ...itemStyle(selectedAction === action.id),
              opacity: disabled ? 0.4 : 1,
              pointerEvents: disabled ? "none" : "auto",
            }}
            onClick={() => {
              if (disabled) return;
              setAction(action.id);
              setStep(2);
            }}
            onMouseEnter={(e) => {
              if (selectedAction !== action.id && !disabled)
                e.currentTarget.style.background = "rgba(255,255,255,0.08)";
            }}
            onMouseLeave={(e) => {
              if (selectedAction !== action.id && !disabled)
                e.currentTarget.style.background = "rgba(255,255,255,0.04)";
            }}
          >
            <span style={{ fontSize: "18px" }}>{action.icon}</span>
            <span>
              {action.label}{" "}
              <span style={{ fontSize: "11px", color: "#cc8800" }}>
                {reason}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );

  // ==========================================================================
  // STEP 2: Select Target
  // ==========================================================================
  const renderTargetStep = () => {
    if (selectedAction === "PICK_NEARBY") {
      return (
        <div>
          <p
            style={{ color: "#6080aa", margin: "0 0 12px 0", fontSize: "13px" }}
          >
            Select item to pick up:
          </p>
          {pickableItems.length === 0 ? (
            <p style={{ color: "#cc8800", fontStyle: "italic" }}>
              No pickable items available in the scene.
            </p>
          ) : (
            pickableItems.map((item) => (
              <div
                key={item.id}
                style={itemStyle(false)}
                onClick={() => {
                  // Claim the item immediately to prevent other agents from targeting it (Fix #2)
                  if (selectedAgent) {
                    InteractableRegistry.getInstance().claimItem(
                      item.id,
                      selectedAgent,
                    );
                  }
                  addTask({
                    type: "PICK_NEARBY",
                    priority: 20,
                    itemId: item.id,
                  });
                  setStep(3);
                  setAction(null);
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(255,255,255,0.08)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "rgba(255,255,255,0.04)")
                }
              >
                <span style={{ fontSize: "16px" }}>📦</span>
                <div>
                  <div>{item.name}</div>
                  <div style={{ fontSize: "11px", color: "#6080aa" }}>
                    {item.type} • ({item.position.x.toFixed(0)},{" "}
                    {item.position.z.toFixed(0)})
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      );
    }

    if (selectedAction === "FOLLOW_PLAYER") {
      return (
        <div>
          <p
            style={{ color: "#6080aa", margin: "0 0 12px 0", fontSize: "13px" }}
          >
            Confirm task:
          </p>
          <div
            style={itemStyle(false)}
            onClick={() => {
              addTask({
                type: "FOLLOW_PLAYER",
                priority: 20,
              });
              setStep(3);
              setAction(null);
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.08)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.04)")
            }
          >
            <span style={{ fontSize: "16px" }}>🏃</span>
            <span>Follow Player</span>
          </div>
        </div>
      );
    }

    if (selectedAction === "PLACE_INVENTORY") {
      return (
        <div>
          <p
            style={{ color: "#6080aa", margin: "0 0 12px 0", fontSize: "13px" }}
          >
            Select placing area:
          </p>
          {placingAreas.length === 0 ? (
            <p style={{ color: "#cc8800", fontStyle: "italic" }}>
              No placing areas with available slots.
            </p>
          ) : (
            placingAreas.map((area) => {
              const usedSlots = area.currentItem ? 1 : 0;
              return (
                <div
                  key={area.id}
                  style={itemStyle(false)}
                  onClick={() => {
                    // Fix #3/#22: Don't capture itemId at queue time.
                    // AgentTaskQueue.startNextTask() resolves it at execution time.
                    addTask({
                      type: "PLACE_INVENTORY",
                      priority: 20,
                      destAreaId: area.id,
                    });
                    setStep(3);
                    setAction(null);
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      "rgba(255,255,255,0.08)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background =
                      "rgba(255,255,255,0.04)")
                  }
                >
                  <span style={{ fontSize: "16px" }}>📥</span>
                  <div>
                    <div>{area.name}</div>
                    <div style={{ fontSize: "11px", color: "#6080aa" }}>
                      {usedSlots}/1 slots used
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      );
    }

    return <p>Unknown action type.</p>;
  };

  // ==========================================================================
  // STEP 3: Review & Dispatch
  // ==========================================================================
  const renderReviewStep = () => (
    <div>
      <p style={{ color: "#6080aa", margin: "0 0 8px 0", fontSize: "13px" }}>
        Task queue for{" "}
        <strong style={{ color: "#80b0ff" }}>
          {selectedAgent ? formatAgentLabel(selectedAgent) : ""}
        </strong>
        :
      </p>

      {pendingTasks.length === 0 ? (
        <p style={{ color: "#cc8800", fontStyle: "italic" }}>
          No tasks added yet. Go back to add tasks.
        </p>
      ) : (
        <div style={{ marginBottom: "16px" }}>
          {pendingTasks.map((task, i) => (
            <div key={i} style={taskItemStyle}>
              <span>
                <span style={{ color: "#6080aa", marginRight: "8px" }}>
                  {i + 1}.
                </span>
                {formatTask(task)}
              </span>
              <button
                style={{
                  background: "none",
                  border: "none",
                  color: "#e06060",
                  cursor: "pointer",
                  fontSize: "16px",
                  padding: "2px 6px",
                }}
                onClick={() => removeTask(i)}
                title="Remove task"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button style={btnStyle(false)} onClick={() => setStep(1)}>
          + Add Another Step
        </button>
        <button
          style={{
            ...btnStyle(true),
            opacity: pendingTasks.length === 0 ? 0.4 : 1,
            pointerEvents: pendingTasks.length === 0 ? "none" : "auto",
          }}
          onClick={handleDispatch}
        >
          🚀 Dispatch ({pendingTasks.length})
        </button>
      </div>
    </div>
  );

  // ==========================================================================
  // Render
  // ==========================================================================
  const stepLabels = ["Agent", "Action", "Target", "Review"];

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <div>
          <h2 style={headerStyle}>⚡ Task Assignment</h2>
          <p style={{ color: "#6080aa", margin: 0, fontSize: "12px" }}>
            {stepLabels[step]} — Step {step + 1} of {stepLabels.length}
          </p>
        </div>
        <button
          onClick={handleClose}
          style={{
            background: "rgba(255, 80, 80, 0.15)",
            border: "1px solid rgba(255, 80, 80, 0.3)",
            color: "#ff6060",
            borderRadius: "8px",
            padding: "6px 12px",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          ✕ Close
        </button>
      </div>

      {/* Step Indicator */}
      <div style={stepIndicatorStyle}>
        {stepLabels.map((label, i) => (
          <div
            key={label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <div style={stepDotStyle(i === step, i < step)} />
            <span
              style={{
                fontSize: "11px",
                color:
                  i === step ? "#80b0ff" : i < step ? "#5080ff" : "#405070",
                fontWeight: i === step ? 600 : 400,
              }}
            >
              {label}
            </span>
            {i < stepLabels.length - 1 && (
              <span style={{ color: "#303050", margin: "0 2px" }}>›</span>
            )}
          </div>
        ))}
      </div>

      {/* Content */}
      {step === 0 && renderAgentStep()}
      {step === 1 && renderActionStep()}
      {step === 2 && renderTargetStep()}
      {step === 3 && renderReviewStep()}

      {/* Back Button (steps 1-2) */}
      {step > 0 && step < 3 && (
        <div style={{ marginTop: "16px" }}>
          <button style={btnStyle(false)} onClick={handleBack}>
            ← Back
          </button>
        </div>
      )}

      {/* Footer hint */}
      <div
        style={{
          marginTop: "16px",
          paddingTop: "12px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          fontSize: "11px",
          color: "#405070",
          textAlign: "center",
        }}
      >
        Press <span style={{ color: "#6080aa" }}>M</span> to close • Click to
        select
      </div>
    </div>
  );
}
