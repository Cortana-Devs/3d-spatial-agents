"use client";

import React, { useEffect } from "react";
import { useGameStore } from "@/store/gameStore";
import GameMenu from "./GameMenu";

export default function Overlay() {
  const debugText = useGameStore((state) => state.debugText);
  const debugTarget = useGameStore((state) => state.debugTarget);
  const isTeleporting = useGameStore((state) => state.isTeleporting);
  const isMenuOpen = useGameStore((state) => state.isMenuOpen);
  const setMenuOpen = useGameStore((state) => state.setMenuOpen);
  const keyBindings = useGameStore((state) => state.keyBindings);
  const interactionNotification = useGameStore(
    (state) => state.interactionNotification,
  );
  const playerInventory = useGameStore((state) => state.playerInventory);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === keyBindings.menu) {
        setMenuOpen(!isMenuOpen);
        if (!isMenuOpen) {
          document.exitPointerLock();
        } else {
          // Optional: Re-lock pointer when closing menu?
          // Usually better to let user click to resume.
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMenuOpen, setMenuOpen, keyBindings]);

  return (
    <>
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
            // Using similar colors to the original 3D tooltip
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

      {/* Settings Button (Optional, can keep or remove since ESC works) */}
      <button
        onClick={() => setMenuOpen(true)}
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          padding: "10px",
          backgroundColor: "rgba(0,0,0,0.5)",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          zIndex: 10,
          pointerEvents: "auto",
        }}
      >
        Menu ({keyBindings.menu.replace("Key", "")})
      </button>

      {/* Game Menu */}
      {isMenuOpen && <GameMenu />}

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

      {/* Inventory Indicator */}
      {playerInventory && (
        <div
          style={{
            position: "absolute",
            bottom: "20px",
            left: "20px",
            backgroundColor: "rgba(50, 50, 50, 0.8)",
            color: "white",
            padding: "15px",
            borderRadius: "10px",
            border: "2px solid #aaa",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            zIndex: 150,
            pointerEvents: "none",
          }}
        >
          <div style={{ fontSize: "24px" }}>🎒</div>
          <div>
            <div style={{ fontSize: "12px", color: "#ccc" }}>CARRYING</div>
            <div style={{ fontWeight: "bold" }}>{playerInventory.name}</div>
          </div>
        </div>
      )}
    </>
  );
}
