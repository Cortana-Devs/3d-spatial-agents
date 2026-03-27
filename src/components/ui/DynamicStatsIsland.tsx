"use client";

import React, { useEffect, useState, useRef } from "react";
import { StatsGl } from "@react-three/drei";

export default function DynamicStatsIsland() {
  // Use a lazy initial state to cleanly generate the pure DOM overlay
  // completely outside of React Three Fiber's virtual 3D rendering tree.
  const [elements] = useState(() => {
    if (typeof window === "undefined") return null;

    const sticker = document.createElement("div");
    // Layout & Absolute Position entirely fixed to the 2D window viewport
    sticker.style.position = "fixed";
    sticker.style.top = "20px";
    sticker.style.left = "20px";
    sticker.style.zIndex = "999999";

    // Interaction & UX
    sticker.style.cursor = "grab";
    sticker.style.userSelect = "none";
    sticker.style.touchAction = "none";

    // Transparent sticker aesthetic
    // 'screen' blending automatically removes the StatsGL black backgrounds
    sticker.style.mixBlendMode = "screen";
    sticker.style.filter =
      "drop-shadow(0px 8px 16px rgba(0,0,0,0.6)) contrast(1.1)";
    sticker.style.transform = "translate3d(0, 0, 0) scale(1)";
    sticker.style.transition =
      "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
    sticker.style.willChange = "transform, left, top";

    // Subtle glass backing frame
    sticker.style.padding = "6px";
    sticker.style.background = "rgba(255, 255, 255, 0.03)";
    sticker.style.borderRadius = "12px";
    sticker.style.border = "1px solid rgba(255, 255, 255, 0.15)";
    sticker.style.boxShadow = "inset 0 1px 0 rgba(255, 255, 255, 0.3)";

    const inner = document.createElement("div");
    // Maintain click-through to allow swapping between FPS / MS / MB panels
    inner.style.pointerEvents = "auto";

    sticker.appendChild(inner);

    return { sticker, inner };
  });

  // Provide a ref object to feed the detached DOM node directly into StatsGl
  const parentRef = useRef<HTMLElement | null>(
    elements ? elements.inner : null,
  );

  useEffect(() => {
    if (!elements) return;
    const { sticker } = elements;

    // Safely inject the detached sticker element into the main document body
    document.body.appendChild(sticker);

    let isDragging = false;
    let dragStart = { x: 0, y: 0 };

    const handlePointerDown = (e: PointerEvent) => {
      // Ignore right-clicks
      if (e.button !== 0) return;

      isDragging = true;
      dragStart = {
        x: e.clientX - sticker.offsetLeft,
        y: e.clientY - sticker.offsetTop,
      };

      sticker.setPointerCapture(e.pointerId);
      sticker.style.transition = "none";
      sticker.style.cursor = "grabbing";
      sticker.style.transform = "translate3d(0, 0, 0) scale(1.05)";
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const x = e.clientX - dragStart.x;
      const y = e.clientY - dragStart.y;

      // Update fixed position via top/left for absolute window targeting
      sticker.style.left = `${x}px`;
      sticker.style.top = `${y}px`;
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;
      sticker.releasePointerCapture(e.pointerId);
      sticker.style.transition =
        "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
      sticker.style.cursor = "grab";
      sticker.style.transform = "translate3d(0, 0, 0) scale(1)";
    };

    sticker.addEventListener("pointerdown", handlePointerDown);
    sticker.addEventListener("pointermove", handlePointerMove);
    sticker.addEventListener("pointerup", handlePointerUp);
    sticker.addEventListener("pointercancel", handlePointerUp);

    return () => {
      sticker.removeEventListener("pointerdown", handlePointerDown);
      sticker.removeEventListener("pointermove", handlePointerMove);
      sticker.removeEventListener("pointerup", handlePointerUp);
      sticker.removeEventListener("pointercancel", handlePointerUp);

      // Clean up the portaled DOM node perfectly
      if (document.body.contains(sticker)) {
        document.body.removeChild(sticker);
      }
    };
  }, [elements]);

  if (!elements) return null;

  return (
    <StatsGl
      parent={parentRef as React.RefObject<HTMLElement>}
      clearStatsGlStyle
    />
  );
}
