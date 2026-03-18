"use client";

import React, { useState, useRef, useEffect } from "react";
import { useGameStore } from "@/store/gameStore";
import {
  buildWorldContext,
  buildParserPrompt,
  validateAndResolve,
} from "@/lib/nlp-parser";
import { parseNaturalCommand } from "@/app/actions";
import { AgentTaskRegistry } from "@/components/Systems/AgentTaskQueue";
import { InteractableRegistry } from "@/components/Systems/InteractableRegistry";

// ============================================================================
// Styles
// ============================================================================

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.4)",
  backdropFilter: "blur(4px)",
  zIndex: 2500,
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  paddingTop: "20vh",
};

const barStyle: React.CSSProperties = {
  width: "560px",
  background: "rgba(10, 10, 22, 0.95)",
  backdropFilter: "blur(24px)",
  border: "1px solid rgba(100, 140, 255, 0.25)",
  borderRadius: "16px",
  padding: "20px 24px",
  boxShadow:
    "0 16px 64px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255,255,255,0.05)",
  fontFamily: "'Inter', 'Segoe UI', sans-serif",
  color: "#e0e8ff",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  background: "rgba(255, 255, 255, 0.06)",
  border: "1px solid rgba(100, 140, 255, 0.2)",
  borderRadius: "10px",
  color: "#e0e8ff",
  fontSize: "15px",
  fontFamily: "'Inter', 'Segoe UI', sans-serif",
  outline: "none",
  transition: "border-color 0.2s ease",
};

// ============================================================================
// Component
// ============================================================================

type CommandState = "idle" | "loading" | "success" | "error";

export function CommandBar() {
  const isOpen = useGameStore((s) => s.isCommandBarOpen);
  const close = useGameStore((s) => s.setCommandBarOpen);
  const inputRef = useRef<HTMLInputElement>(null);

  const [command, setCommand] = useState("");
  const [state, setState] = useState<CommandState>("idle");
  const [message, setMessage] = useState("");

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setCommand("");
      setState("idle");
      setMessage("");
      // Small delay to ensure DOM is ready
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close(false);
      }
    };
    window.addEventListener("keydown", handleKey, true);
    return () => window.removeEventListener("keydown", handleKey, true);
  }, [isOpen, close]);

  // We no longer auto-close after success to allow the user to review the result
  /*
  useEffect(() => {
    if (state === "success") {
      const timer = setTimeout(() => close(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [state, close]);
  */

  if (!isOpen) return null;

  const handleSubmit = async () => {
    const trimmed = command.trim();
    if (!trimmed || state === "loading") return;

    setState("loading");
    setMessage("Parsing command...");

    const tStart = performance.now();

    try {
      // 1. Build world context on the client (filter to 40m radius around player)
      const t0 = performance.now();
      const playerPos = useGameStore.getState().playerPosition;
      const ctx = buildWorldContext(playerPos, 40);
      const prompt = buildParserPrompt(trimmed, ctx);
      const t1 = performance.now();

      console.log(
        `[Timeline] 1. World Context Built in ${(t1 - t0).toFixed(2)}ms`,
        {
          itemCount: ctx.items.split("\n").length - 2,
          areaCount: ctx.areas.split("\n").length - 2,
          agentCount: ctx.agents.split("\n").length - 2,
        },
      );

      // 2. Send to server action for LLM processing
      console.log("[Timeline] 2. Sending to LLM...");
      const t2_start = performance.now();
      const { rawResponse, serverLatency } = await parseNaturalCommand(
        trimmed,
        prompt,
      );
      const t2_end = performance.now();

      const rtt = t2_end - t2_start;
      const networkLatency = rtt - serverLatency;
      console.log(
        `[Timeline] 3. LLM Response Received (RTT: ${rtt.toFixed(2)}ms, Server: ${serverLatency.toFixed(2)}ms, Network: ${networkLatency.toFixed(2)}ms)`,
      );
      console.log("[CommandBar] LLM raw response:", rawResponse);

      // 3. Validate response against live registry
      const t3_start = performance.now();
      const result = validateAndResolve(rawResponse);
      const t3_end = performance.now();

      console.log(
        `[Timeline] 4. Response Validated in ${(t3_end - t3_start).toFixed(2)}ms`,
      );
      console.log("[CommandBar] Validation result:", result);

      if ("error" in result) {
        setState("error");
        setMessage(result.error);
        return;
      }

      // 4. Pre-claim items (matching manual TaskAssignmentPanel flow exactly)
      const t4_start = performance.now();
      for (const task of result.tasks) {
        if (task.type === "PICK_NEARBY" && task.itemId) {
          InteractableRegistry.getInstance().claimItem(
            task.itemId,
            result.agentId,
          );
          console.log(
            `[CommandBar] Pre-claimed item ${task.itemId} for ${result.agentId}`,
          );
        }
      }

      // 5. Dispatch tasks to agent queue
      const queue = AgentTaskRegistry.getInstance().getOrCreate(result.agentId);
      console.log(
        `[CommandBar] Dispatching ${result.tasks.length} task(s) to agent ${result.agentId}`,
      );

      result.tasks.forEach((task, i) => {
        console.log(`[CommandBar]   Task ${i + 1}:`, JSON.stringify(task));
        queue.enqueue(task);
      });

      console.log(
        `[CommandBar] Agent ${result.agentId} queue active: ${queue.isActive()}, phase: ${queue.getCurrentPhase()}`,
      );
      const t4_end = performance.now();
      console.log(
        `[Timeline] 5. Tasks Dispatched in ${(t4_end - t4_start).toFixed(2)}ms`,
      );

      const tTotal = t4_end - tStart;
      console.log(`\n========================================`);
      console.log(`🕒 NLP PARSING - FULL DURATION REPORT`);
      console.log(`========================================`);
      console.table([
        {
          Phase: "1. Context Building (Client)",
          "Duration (ms)": parseFloat((t1 - t0).toFixed(2)),
        },
        {
          Phase: "2. Network Latency up/down (Client)",
          "Duration (ms)": parseFloat(networkLatency.toFixed(2)),
        },
        {
          Phase: "3. LLM API Processing (Server)",
          "Duration (ms)": parseFloat(serverLatency.toFixed(2)),
        },
        {
          Phase: "4. Result Validation (Client)",
          "Duration (ms)": parseFloat((t3_end - t3_start).toFixed(2)),
        },
        {
          Phase: "5. Task Dispatching (Client)",
          "Duration (ms)": parseFloat((t4_end - t4_start).toFixed(2)),
        },
        {
          Phase: "TOTAL DURATION",
          "Duration (ms)": parseFloat(tTotal.toFixed(2)),
        },
      ]);
      console.log(`========================================\n`);

      setState("success");
      setMessage(`✅ ${result.explanation}`);
    } catch (err: any) {
      console.error("[CommandBar] Error:", err);
      setState("error");
      setMessage(err.message || "Unexpected error.");
    }
  };

  const stateColor =
    state === "loading"
      ? "#80b0ff"
      : state === "success"
        ? "#60d080"
        : state === "error"
          ? "#ff6060"
          : "#6080aa";

  return (
    <div
      style={overlayStyle}
      onClick={() => state !== "loading" && close(false)}
    >
      <div style={barStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "14px",
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: "16px",
                fontWeight: 700,
                color: "#a0c0ff",
                letterSpacing: "-0.3px",
              }}
            >
              ⚡ Command
            </h3>
            <p
              style={{
                margin: "2px 0 0 0",
                fontSize: "11px",
                color: "#405070",
              }}
            >
              Type a natural language command for your agents
            </p>
          </div>
          <button
            onClick={() => close(false)}
            style={{
              background: "rgba(255, 80, 80, 0.12)",
              border: "1px solid rgba(255, 80, 80, 0.25)",
              color: "#ff6060",
              borderRadius: "8px",
              padding: "4px 10px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            ESC
          </button>
        </div>

        {/* Input */}
        <div style={{ position: "relative" }}>
          <input
            ref={inputRef}
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder='e.g. "move blue supervisor file to lab desk A"'
            disabled={state === "loading"}
            style={{
              ...inputStyle,
              borderColor:
                state === "loading"
                  ? "rgba(100, 140, 255, 0.5)"
                  : "rgba(100, 140, 255, 0.2)",
              opacity: state === "loading" ? 0.6 : 1,
            }}
          />
          {state === "loading" && (
            <div
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                width: "18px",
                height: "18px",
                border: "2px solid rgba(100, 140, 255, 0.3)",
                borderTopColor: "#80b0ff",
                borderRadius: "50%",
                animation: "nlp-spin 0.8s linear infinite",
              }}
            />
          )}
        </div>

        {/* Status Message */}
        {message && (
          <div
            style={{
              marginTop: "12px",
              padding: "10px 14px",
              borderRadius: "8px",
              background:
                state === "error"
                  ? "rgba(255, 60, 60, 0.1)"
                  : state === "success"
                    ? "rgba(60, 200, 100, 0.1)"
                    : "rgba(80, 140, 255, 0.08)",
              border: `1px solid ${state === "error" ? "rgba(255, 60, 60, 0.2)" : state === "success" ? "rgba(60, 200, 100, 0.2)" : "rgba(80, 140, 255, 0.15)"}`,
              fontSize: "13px",
              color: stateColor,
              lineHeight: 1.4,
            }}
          >
            {message}
          </div>
        )}

        {/* Hints */}
        <div
          style={{
            marginTop: "12px",
            fontSize: "11px",
            color: "#405070",
            display: "flex",
            gap: "16px",
          }}
        >
          <span>
            <span style={{ color: "#6080aa" }}>Enter</span> to submit
          </span>
          <span>
            <span style={{ color: "#6080aa" }}>Esc</span> to close
          </span>
          <span>
            <span style={{ color: "#6080aa" }}>/</span> to open
          </span>
        </div>
      </div>

      {/* Spinner keyframe */}
      <style>{`
        @keyframes nlp-spin {
          to { transform: translateY(-50%) rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
