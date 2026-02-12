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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === keyBindings.menu) {
        // If Pickup Menu is open, Close it first
        if (useGameStore.getState().isPickupMenuOpen) {
          useGameStore.getState().setPickupMenuOpen(false);
          useGameStore.getState().setNearbyItems([]);
          return;
        }

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
            pointerEvents: "none",
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
            T: Place selected | Scroll/Arrows: Change selection
          </div>
        </div>
      )}

      {/* Placing Areas Menu (Right Side) */}
      {nearbyPlacingAreas.length > 0 && playerInventory.length > 0 && (
        <div
          style={{
            position: "absolute",
            bottom: "250px",
            right: "20px",
            backgroundColor: "rgba(20, 30, 20, 0.95)",
            color: "white",
            padding: "12px 16px",
            borderRadius: "10px",
            border: "1px solid rgba(100, 255, 100, 0.4)",
            minWidth: "200px",
            maxWidth: "280px",
            zIndex: 151,
            pointerEvents: "none",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "#aaa",
              marginBottom: "8px",
              borderBottom: "1px solid #333",
              paddingBottom: "4px",
            }}
          >
            <span>📍 PLACING AREAS</span>
          </div>
          {nearbyPlacingAreas.map((area: any) => {
            const isSelected = area.id === activePlacingAreaId;
            return (
              <div
                key={area.id}
                style={{
                  padding: "4px 8px",
                  marginBottom: "2px",
                  borderRadius: "4px",
                  backgroundColor: isSelected
                    ? "rgba(100, 255, 100, 0.2)"
                    : "transparent",
                  border: isSelected
                    ? "1px solid rgba(100, 255, 100, 0.5)"
                    : "1px solid transparent",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "#dfd",
                }}
              >
                <span>{isSelected ? "▶" : " "}</span>
                <span style={{ fontWeight: isSelected ? "bold" : "normal" }}>
                  {area.name}
                </span>
              </div>
            );
          })}
          <div
            style={{
              fontSize: "10px",
              color: "#8aa",
              marginTop: "6px",
              borderTop: "1px solid #333",
              paddingTop: "4px",
            }}
          >
            Look at area to select | T: Place
          </div>
        </div>
      )}

      {/* Pickup Selection Menu (Right Side) */}
      {isPickupMenuOpen && (
        <div
          style={{
            position: "absolute",
            bottom: "70px",
            right: "20px",
            backgroundColor: "rgba(20, 30, 20, 0.95)",
            color: "white",
            padding: "12px 16px",
            borderRadius: "10px",
            border: "1px solid rgba(100, 255, 100, 0.4)",
            minWidth: "200px",
            maxWidth: "280px",
            zIndex: 151,
            pointerEvents: "none",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "#aaa",
              marginBottom: "8px",
              borderBottom: "1px solid #333",
              paddingBottom: "4px",
            }}
          >
            <span>🤏 NEARBY ITEMS</span>
          </div>
          {nearbyItems.map((item, idx) => {
            const isSelected = idx === selectedPickupIndex;
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
                style={{
                  padding: "4px 8px",
                  marginBottom: "2px",
                  borderRadius: "4px",
                  backgroundColor: isSelected
                    ? "rgba(100, 255, 100, 0.2)"
                    : "transparent",
                  border: isSelected
                    ? "1px solid rgba(100, 255, 100, 0.5)"
                    : "1px solid transparent",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "#dfd",
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
              color: "#8aa",
              marginTop: "6px",
              borderTop: "1px solid #333",
              paddingTop: "4px",
            }}
          >
            P: Confirm Pickup | Arrows: Select
          </div>
        </div>
      )}
    </>
  );
}
