import React, { useEffect, useState } from "react";
import { useGameStore } from "@/store/gameStore";

export function FileEditorModal() {
  const isFileEditorOpen = useGameStore((state) => state.isFileEditorOpen);
  const setFileEditorOpen = useGameStore((state) => state.setFileEditorOpen);
  const activeFileId = useGameStore((state) => state.activeFileId);
  const fileContents = useGameStore((state) => state.fileContents);
  const setFileContent = useGameStore((state) => state.setFileContent);

  const [localText, setLocalText] = useState("");

  useEffect(() => {
    if (isFileEditorOpen && activeFileId) {
      setLocalText(fileContents[activeFileId] || "");
    }
  }, [isFileEditorOpen, activeFileId, fileContents]);

  if (!isFileEditorOpen || !activeFileId) return null;

  const handleSave = () => {
    setFileContent(activeFileId, localText);
    setFileEditorOpen(false);
  };

  const handleClose = () => {
    setFileEditorOpen(false);
  };

  // Stop propagation so we don't accidentally close on click or trigger game clicks
  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        pointerEvents: "auto",
        animation: "fadeIn 0.2s ease-out forwards",
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: "rgba(25, 25, 35, 0.9)",
          boxShadow:
            "0 24px 64px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.1)",
          padding: "24px",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "500px",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          color: "white",
          fontFamily: "Inter, system-ui, sans-serif",
          transform: "translateY(0) scale(1)",
        }}
        onClick={stopPropagation}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2
            style={{
              fontSize: "20px",
              fontWeight: 600,
              margin: 0,
              letterSpacing: "0.2px",
            }}
          >
            Document Viewer
          </h2>
          <span
            style={{
              fontSize: "11px",
              color: "rgba(255,255,255,0.5)",
              background: "rgba(255,255,255,0.1)",
              padding: "4px 8px",
              borderRadius: "6px",
              fontFamily: "monospace",
            }}
          >
            ID: {activeFileId}
          </span>
        </div>

        <textarea
          style={{
            width: "100%",
            height: "250px",
            padding: "16px",
            fontSize: "14px",
            fontFamily: "Inter, system-ui, sans-serif",
            lineHeight: "1.5",
            background: "rgba(10, 10, 15, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "8px",
            color: "rgba(255, 255, 255, 0.9)",
            outline: "none",
            resize: "none",
            boxSizing: "border-box",
            transition: "border-color 0.2s ease",
          }}
          value={localText}
          onChange={(e) => setLocalText(e.target.value)}
          onFocus={(e) =>
            (e.target.style.borderColor = "rgba(76, 175, 80, 0.6)")
          }
          onBlur={(e) =>
            (e.target.style.borderColor = "rgba(255, 255, 255, 0.2)")
          }
          placeholder="Start typing file contents here..."
          autoFocus
        />

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
            marginTop: "8px",
          }}
        >
          <button
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 500,
              color: "rgba(255, 255, 255, 0.7)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              transition: "color 0.2s ease, background 0.2s ease",
            }}
            onClick={handleClose}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "white";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "rgba(255, 255, 255, 0.7)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            Cancel
          </button>
          <button
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 600,
              color: "white",
              background: "#4CAF50",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(76, 175, 80, 0.3)",
              transition: "transform 0.1s ease, background 0.2s ease",
            }}
            onClick={handleSave}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#45a049")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#4CAF50")}
            onMouseDown={(e) =>
              (e.currentTarget.style.transform = "scale(0.97)")
            }
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            Save Document
          </button>
        </div>
      </div>
    </div>
  );
}
