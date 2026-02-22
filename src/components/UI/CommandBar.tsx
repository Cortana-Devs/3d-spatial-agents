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

  // Auto-close after success
  useEffect(() => {
    if (state === "success") {
      const timer = setTimeout(() => close(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [state, close]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    const trimmed = command.trim();
    if (!trimmed || state === "loading") return;

    setState("loading");
    setMessage("Parsing command...");

    try {
      // 1. Build world context on the client
      const ctx = buildWorldContext();
      const prompt = buildParserPrompt(trimmed, ctx);
      console.log("[CommandBar] World context built:", {
        itemCount: ctx.items.split("\n").length - 2,
        areaCount: ctx.areas.split("\n").length - 2,
        agentCount: ctx.agents.split("\n").length - 2,
      });

      // 2. Send to server action for LLM processing
      console.log("[CommandBar] Sending to LLM...");
      const rawResponse = await parseNaturalCommand(trimmed, prompt);
      console.log("[CommandBar] LLM raw response:", rawResponse);

      // 3. Validate response against live registry
      const result = validateAndResolve(rawResponse);
      console.log("[CommandBar] Validation result:", result);

      if ("error" in result) {
        setState("error");
        setMessage(result.error);
        return;
      }

      // 4. Pre-claim items (matching manual TaskAssignmentPanel flow exactly)
      // Manual panel claims at selection time - we claim before dispatch
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
            placeholder='e.g. "move blue manager file to office desk A"'
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
