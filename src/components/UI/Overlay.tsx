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
            T: Place selected | Scroll: Change selection
          </div>
        </div>
      )}

      {/* Unified Nearby Interaction Table */}
      {(nearbyItems.length > 0 ||
        (playerInventory.length > 0 && nearbyPlacingAreas.length > 0)) && (
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
            width: "300px",
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
              NEARBY ENTITIES
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
              {nearbyItems.length + nearbyPlacingAreas.length} found
            </span>
          </div>

          {/* Table Body */}
          <div
            style={{
              maxHeight: "300px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* 1. Pickup Items Section */}
            {nearbyItems.length > 0 && (
              <>
                <div
                  style={{
                    padding: "8px 16px",
                    fontSize: "10px",
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.5)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    marginTop: "4px",
                  }}
                >
                  Pick Up (Key: P)
                </div>
                {nearbyItems.map((item, idx) => {
                  const isSelected =
                    idx === selectedPickupIndex && isPickupMenuOpen; // Only highlight if menu active? Or always?
                  // Let's highlight if it's the "active" selection for P key.
                  const isTarget = idx === selectedPickupIndex;

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
                      key={`pickup-${item.id}`}
                      style={{
                        padding: "8px 16px",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        background: isTarget
                          ? "rgba(50, 150, 255, 0.15)"
                          : "transparent",
                        borderLeft: isTarget
                          ? "3px solid #4a90e2"
                          : "3px solid transparent",
                        transition: "background 0.2s",
                      }}
                    >
                      <div
                        style={{ fontSize: "16px", filter: "grayscale(20%)" }}
                      >
                        {emoji}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "13px",
                            color: isTarget ? "#fff" : "#ccc",
                            fontWeight: isTarget ? 600 : 400,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {item.name}
                        </div>
                        <div
                          style={{
                            fontSize: "10px",
                            color: "rgba(255,255,255,0.4)",
                          }}
                        >
                          {item.type}
                        </div>
                      </div>
                      {isTarget && (
                        <div
                          style={{
                            fontSize: "10px",
                            fontWeight: 600,
                            color: "#4a90e2",
                            background: "rgba(74, 144, 226, 0.1)",
                            padding: "2px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          PICK UP
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {/* 2. Placing Areas Section */}
            {playerInventory.length > 0 && nearbyPlacingAreas.length > 0 && (
              <>
                <div
                  style={{
                    padding: "8px 16px",
                    fontSize: "10px",
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.5)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    marginTop: "8px",
                    borderTop: "1px solid rgba(255,255,255,0.05)",
                    paddingTop: "8px",
                  }}
                >
                  Place Item (Key: T)
                </div>
                {nearbyPlacingAreas.map((area: any) => {
                  const isSelected = area.id === activePlacingAreaId;
                  return (
                    <div
                      key={`place-${area.id}`}
                      style={{
                        padding: "8px 16px",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        background: isSelected
                          ? "rgba(76, 175, 80, 0.15)"
                          : "transparent",
                        borderLeft: isSelected
                          ? "3px solid #4CAF50"
                          : "3px solid transparent",
                        transition: "background 0.2s",
                      }}
                    >
                      <div style={{ fontSize: "16px", opacity: 0.8 }}>📍</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "13px",
                            color: isSelected ? "#fff" : "#ccc",
                            fontWeight: isSelected ? 600 : 400,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {area.name}
                        </div>
                        <div
                          style={{
                            fontSize: "10px",
                            color: "rgba(255,255,255,0.4)",
                          }}
                        >
                          Capacity: {area.currentItems.length}/{area.capacity}
                        </div>
                      </div>
                      {isSelected && (
                        <div
                          style={{
                            fontSize: "10px",
                            fontWeight: 600,
                            color: "#4CAF50",
                            background: "rgba(76, 175, 80, 0.1)",
                            padding: "2px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          PLACE HERE
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Footer Hint */}
          <div
            style={{
              padding: "8px 16px",
              background: "rgba(0, 0, 0, 0.2)",
              borderTop: "1px solid rgba(255, 255, 255, 0.05)",
              fontSize: "10px",
              color: "rgba(255, 255, 255, 0.4)",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>Look at object to select</span>
            <span>Auto-detect active</span>
          </div>
        </div>
      )}
    </>
  );
}
