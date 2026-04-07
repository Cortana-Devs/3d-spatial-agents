"use client";

import React, { useEffect, useState } from "react";
import { useProgress } from "@react-three/drei";

export default function CustomLoader() {
  const { active, progress, errors, item, loaded, total } = useProgress();
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (!active && progress === 100) {
      // Small delay to allow fade out animation
      const timeout = setTimeout(() => setShow(false), 800);
      return () => clearTimeout(timeout);
    }
    if (active) {
      setShow(true);
    }
  }, [active, progress]);

  if (!show) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "#05070a", // Deep futuristic dark blue/black
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999, // Ensure it covers everything
        opacity: active && progress < 100 ? 1 : 0,
        transition: "opacity 0.8s ease-in-out",
        fontFamily: "'Inter', sans-serif",
        color: "#fff",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "300px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {/* Glow effect back */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "350px",
            height: "150px",
            background: "radial-gradient(circle, rgba(14,165,233,0.15) 0%, rgba(0,0,0,0) 70%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", letterSpacing: "1px", textTransform: "uppercase", color: "#94a3b8" }}>
          <span>INITIALIZING</span>
          <span style={{ color: "#0ea5e9", fontWeight: "600" }}>{Math.round(progress)}%</span>
        </div>

        {/* Progress bar container */}
        <div
          style={{
            width: "100%",
            height: "4px",
            background: "rgba(255,255,255,0.05)",
            borderRadius: "2px",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* Animated fill line */}
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: "#0ea5e9",
              boxShadow: "0 0 10px rgba(14,165,233,0.8)",
              transition: "width 0.3s ease-out",
            }}
          />
          {/* Scanning line effect */}
          <div
            className="loader-scan-line"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              bottom: 0,
              width: "20%",
              background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0) 100%)",
              animation: "scan 1.5s infinite linear",
            }}
          />
        </div>

        {/* Item loading text below */}
        <div style={{ fontSize: "10px", color: "#475569", fontFamily: "monospace", display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: "15px" }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "80%" }}>
            {item ? `Loading: ${item.split('/').pop()}` : 'Booting kernel...'}
          </span>
          <span>[{loaded}/{total}]</span>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(500%); }
        }
      `}</style>
    </div>
  );
}
