import { RefObject, useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { PhonemeTiming } from "./voiceTypes";

export type { PhonemeTiming };

export function useAgentAudio(
  audioRef: RefObject<THREE.PositionalAudio | null>,
  buffer: AudioBuffer | null,
  phonemeSchedule: PhonemeTiming[] | null,
  onViseme?: (weights: Record<string, number>, elapsedSec: number) => void,
) {
  const playStartCtxTime = useRef<number | null>(null);

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !buffer) {
      playStartCtxTime.current = null;
      return;
    }
    if (a.isPlaying) a.stop();
    a.setBuffer(buffer);
    a.play();
    playStartCtxTime.current = a.context.currentTime;
  }, [buffer, audioRef]);

  useFrame(() => {
    const a = audioRef.current;
    if (!a?.isPlaying || playStartCtxTime.current == null) return;
    const elapsed = a.context.currentTime - playStartCtxTime.current;
    if (onViseme) {
      const w = scheduleToMorphWeights(phonemeSchedule, elapsed);
      onViseme(w, elapsed);
    }
  });
}

function scheduleToMorphWeights(
  schedule: PhonemeTiming[] | null,
  t: number,
): Record<string, number> {
  if (!schedule?.length) return {};
  const out: Record<string, number> = {};
  for (const p of schedule) {
    if (t >= p.t0 && t < p.t1) {
      out[`phoneme_${p.id}`] = 1;
      break;
    }
  }
  return out;
}
