import { useState, useCallback, useEffect } from "react";

export type AudioState = "idle" | "fetching_primary" | "fetching_fallback" | "speaking" | "error";

// Module-level singletons to share across all agents
let globalAudioCtx: AudioContext | null = null;
let globalWorker: Worker | null = null;
let globalResolveWorkerCb: ((buf: AudioBuffer) => void) | null = null;
let globalRejectWorkerCb: ((err: Error) => void) | null = null;

export function useAudioController() {
  const [audioState, setAudioState] = useState<AudioState>("idle");
  const [currentBuffer, setCurrentBuffer] = useState<AudioBuffer | null>(null);

  // Initialize or resume the Audio Context
  const ensureAudioContext = useCallback(() => {
    if (typeof window !== "undefined") {
      if (!globalAudioCtx) {
        globalAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (globalAudioCtx.state === "suspended") {
        globalAudioCtx.resume().catch(console.warn);
      }
    }
    return globalAudioCtx;
  }, []);

  // Initialize the Web Worker lazily
  const initFallbackWorker = useCallback(() => {
    if (typeof window !== "undefined" && !globalWorker) {
      console.log("[AudioController] Init Shared Fallback Worker...");
      globalWorker = new Worker(new URL("./kokoroWorker.js", import.meta.url), { type: "module" });
      
      globalWorker.onmessage = async (e) => {
        const { type, audio, sampleRate, error } = e.data;
        
        if (type === "READY") {
          console.log("[AudioController] Fallback TTS Engine Ready.");
        } else if (type === "SUCCESS" && audio && sampleRate) {
          try {
            const ctx = ensureAudioContext();
            if (ctx) {
               // Kokoro outputs mono Float32Array
               const buffer = ctx.createBuffer(1, audio.length, sampleRate);
               buffer.copyToChannel(audio, 0);
               
               if (globalResolveWorkerCb) {
                 globalResolveWorkerCb(buffer);
                 globalResolveWorkerCb = null;
                 globalRejectWorkerCb = null;
               }
            }
          } catch (err) {
            if (globalRejectWorkerCb) {
              globalRejectWorkerCb(err as Error);
              globalResolveWorkerCb = null;
              globalRejectWorkerCb = null;
            }
          }
        } else if (type === "ERROR") {
          if (globalRejectWorkerCb) {
             globalRejectWorkerCb(new Error(error));
             globalResolveWorkerCb = null;
             globalRejectWorkerCb = null;
          }
        }
      };
    }
    return globalWorker;
  }, [ensureAudioContext]);

  // Main Speak Function
  const speak = useCallback(async (text: string) => {
    setAudioState("fetching_primary");
    const ctx = ensureAudioContext();
    if (!ctx) return;
    
    // Attempt 1: Puter API (via official SDK)
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 8000); // Allow more time for network

    try {
      console.log("[AudioController] Fetching primary TTS via window.puter...");
      
      if (typeof window === "undefined" || !(window as any).puter) {
        throw new Error("window.puter SDK is not available.");
      }

      // 1. Generate via Puter (returns an HTMLAudioElement)
      const audioElement = await (window as any).puter.ai.txt2speech(text);
      
      // 2. We need the native raw decoded buffer to use in PositionalAudio spatial context
      // So we fetch the blob/URL directly from the returned element's src
      const response = await fetch(audioElement.src, { signal: abortController.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch audio stream from puter src: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);
      
      setCurrentBuffer(decodedBuffer);
      setAudioState("speaking");
      return;

    } catch (err) {
      console.warn("[AudioController] Primary TTS Failed/Timed out. Proceeding to fallback...", err);
      clearTimeout(timeoutId);
    }

    // Attempt 2: Fallback (Kokoro WebGPU)
    try {
      setAudioState("fetching_fallback");
      const worker = initFallbackWorker();
      if (!worker) throw new Error("Worker not initialized");
      
      const buffer = await new Promise<AudioBuffer>((resolve, reject) => {
        globalResolveWorkerCb = resolve;
        globalRejectWorkerCb = reject;
        
        worker.postMessage({
          type: "GENERATE",
          id: Date.now(),
          text
        });
      });

      setCurrentBuffer(buffer);
      setAudioState("speaking");
    } catch (fallbackErr) {
      console.error("[AudioController] Fallback TTS Failed:", fallbackErr);
      setAudioState("error");
    }

  }, [ensureAudioContext, initFallbackWorker]);

  const stopSpeaking = useCallback(() => {
    setCurrentBuffer(null);
    setAudioState("idle");
  }, []);

  return { audioState, currentBuffer, speak, stopSpeaking, ensureAudioContext };
}
