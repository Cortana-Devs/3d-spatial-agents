"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGameStore } from "@/store/gameStore";

export default function FPSMonitor() {
  const frames = useRef(0);
  const prevTime = useRef(performance.now());

  useFrame(() => {
    frames.current++;
    const time = performance.now();
    
    if (time >= prevTime.current + 1000) {
      const fps = Math.round((frames.current * 1000) / (time - prevTime.current));
      useGameStore.setState({ currentFps: fps });
      frames.current = 0;
      prevTime.current = time;
    }
  });

  return null;
}
