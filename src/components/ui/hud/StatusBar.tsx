"use client";

/**
 * StatusBar — full-width feathered dark strip anchored at the very bottom.
 *
 * Three independent zones, each accepting independent message streams:
 *   left   — dim contextual hints (pointer-lock controls, etc.)
 *   center — transient status messages pushed by any system (TTS, tasks…)
 *   right  — reserved (Piper ready indicator, FPS, etc.)
 *
 * The dark feather is purely a CSS gradient over the 3D canvas — no
 * background fill, no border, no pill. Text floats inside the feather.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import type { TtsStatusDetail, TtsStatusState } from "@/lib/audio/useAudioController";

// ─────────────────────────────────────────────────────────────────────────────
// Tier dot colours (matches SF Symbols / macOS system colours)
// ─────────────────────────────────────────────────────────────────────────────

const TIER_COLORS: Record<string, string> = {
  gemini:     "#34C759", // system green  (cloud, high quality)
  piper:      "#0A84FF", // system blue   (local ONNX)
  googlecloud:"#FF9F0A", // system orange (cloud, backup)
  webspeech:  "#8E8E93", // system grey   (emergency)
};

const STATE_OPACITY: Record<TtsStatusState, number> = {
  idle:     0,
  fetching: 0.6,
  speaking: 1,
  fallback: 0.55,
  error:    0.55,
};

// ─────────────────────────────────────────────────────────────────────────────
// Animated text — fades between messages with a 14px upward slide
// ─────────────────────────────────────────────────────────────────────────────

interface AnimatedTextProps {
  value: string;
  style?: React.CSSProperties;
}

function AnimatedText({ value, style }: AnimatedTextProps) {
  const [displayed, setDisplayed] = useState(value);
  const [visible, setVisible] = useState(!!value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (value) {
      setDisplayed(value);
      // tiny delay lets the exit animation finish before we update text
      timerRef.current = setTimeout(() => setVisible(true), 20);
    } else {
      setVisible(false);
      // keep text in DOM until opacity reaches 0
      timerRef.current = setTimeout(() => setDisplayed(""), 300);
    }
  }, [value]);

  return (
    <span
      style={{
        display: "inline-block",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(4px)",
        transition: "opacity 0.28s ease, transform 0.28s ease",
        ...style,
      }}
    >
      {displayed}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dot pulse indicator
// ─────────────────────────────────────────────────────────────────────────────

interface StatusDotProps {
  color: string;
  pulse: boolean;
  opacity: number;
}

function StatusDot({ color, pulse, opacity }: StatusDotProps) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 5,
        height: 5,
        borderRadius: "50%",
        background: color,
        opacity,
        marginRight: 6,
        verticalAlign: "middle",
        position: "relative",
        top: -1,
        transition: "opacity 0.28s ease, background 0.28s ease",
        // keyframe-driven ring pulse when fetching
        animation: pulse ? "sb-ring-pulse 1.2s ease infinite" : "none",
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StatusBar
// ─────────────────────────────────────────────────────────────────────────────

export interface StatusMessage {
  /** Display text — empty string hides the slot. */
  text: string;
  /** Optional override colour for the indicator dot. */
  dotColor?: string;
  state?: TtsStatusState;
  tier?: string;
}

export function StatusBar() {
  const debugText = useGameStore((s) => s.debugText);

  // Center slot: TTS audio status
  const [ttsStatus, setTtsStatus] = useState<StatusMessage>({ text: "", state: "idle" });

  const handleTtsStatus = useCallback((e: Event) => {
    const { message, state, tier } = (e as CustomEvent<TtsStatusDetail>).detail;
    setTtsStatus({
      text: message,
      state,
      tier,
      dotColor: tier ? TIER_COLORS[tier] : undefined,
    });
  }, []);

  useEffect(() => {
    window.addEventListener("tts-status", handleTtsStatus);
    return () => window.removeEventListener("tts-status", handleTtsStatus);
  }, [handleTtsStatus]);

  // Derive dot appearance
  const dotColor = ttsStatus.dotColor ?? "#8E8E93";
  const dotOpacity = STATE_OPACITY[ttsStatus.state ?? "idle"];
  const dotPulse = ttsStatus.state === "fetching";

  // Dim the hint text further when audio is speaking (focus shifts to center)
  const hintOpacity = ttsStatus.state === "speaking" ? 0.22 : 0.32;

  return (
    <>
      {/* Keyframes */}
      <style>{`
        @keyframes sb-ring-pulse {
          0%   { box-shadow: 0 0 0 0px ${dotColor}66; }
          60%  { box-shadow: 0 0 0 4px ${dotColor}00; }
          100% { box-shadow: 0 0 0 0px ${dotColor}00; }
        }
      `}</style>

      <div
        aria-hidden
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: 64,
          /* The feather: pure gradient, no solid fill */
          background: `linear-gradient(
            to top,
            rgba(0, 0, 0, 0.68) 0px,
            rgba(0, 0, 0, 0.38) 22px,
            rgba(0, 0, 0, 0.10) 44px,
            transparent 64px
          )`,
          pointerEvents: "none",
          zIndex: 500,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          padding: "0 20px 9px",
          userSelect: "none",
        }}
      >
        {/* ── Left: control hints ─────────────────────────────────────────── */}
        <div
          style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
            fontSize: 11,
            fontWeight: 400,
            letterSpacing: "0.015em",
            color: `rgba(255, 255, 255, ${hintOpacity})`,
            transition: "color 0.6s ease",
            whiteSpace: "nowrap",
            flex: "0 0 auto",
            minWidth: 0,
          }}
        >
          <AnimatedText value={debugText ?? ""} />
        </div>

        {/* ── Center: TTS / system status ─────────────────────────────────── */}
        <div
          style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
            fontSize: 11,
            fontWeight: 400,
            letterSpacing: "0.015em",
            color: "rgba(255, 255, 255, 0.72)",
            display: "flex",
            alignItems: "center",
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            bottom: 9,
            whiteSpace: "nowrap",
          }}
        >
          <StatusDot color={dotColor} pulse={dotPulse} opacity={dotOpacity} />
          <AnimatedText value={ttsStatus.text} />
        </div>

        {/* ── Right: reserved ─────────────────────────────────────────────── */}
        <div style={{ flex: "0 0 auto", minWidth: 0 }} />
      </div>
    </>
  );
}
