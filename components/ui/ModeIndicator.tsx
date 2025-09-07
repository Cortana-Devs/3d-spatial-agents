"use client";

import React from "react";
import { useWorldStore } from "../../store/worldStore";
import { BLOCK_DEFINITIONS, SelectionMode } from "../../types";

export default function ModeIndicator() {
  const { selectedBlockType, selectionMode } = useWorldStore();

  const isEmptyHand = selectionMode === SelectionMode.EMPTY;
  const isPlaceMode = selectionMode === SelectionMode.PLACE;

  return (
    <div className="fixed top-20 left-4 z-20 bg-black/80 backdrop-blur-md border border-white/20 rounded-lg px-3 py-2 text-white shadow-lg">
      <div className="flex items-center gap-2 text-sm">
        {/* Mode Icon */}
        <div className="flex items-center gap-1">
          {isEmptyHand ? (
            <span className="text-blue-400">🔍</span>
          ) : (
            <span className="text-green-400">🧱</span>
          )}

          {/* Mode Text */}
          <span className="font-medium">
            {isEmptyHand ? "SELECT" : "PLACE"}
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-4 bg-white/20" />

        {/* Current Block/Tool */}
        <div className="flex items-center gap-1">
          {isEmptyHand ? (
            <span className="text-white/80">Select Tool</span>
          ) : (
            <>
              <div
                className="w-3 h-3 rounded border border-white/30"
                style={{
                  backgroundColor: BLOCK_DEFINITIONS[selectedBlockType]?.color || "#666",
                }}
              />
              <span className="text-white/80">
                {BLOCK_DEFINITIONS[selectedBlockType]?.displayName || "Unknown"}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="text-xs text-white/60 mt-1">
        {isEmptyHand ? (
          "Press 1-7 to select blocks"
        ) : (
          "Click to place • Press 0 for select tool"
        )}
      </div>
    </div>
  );
}
