import { useState, useRef, useEffect, useCallback } from "react";

export type AudioState = "idle" | "fetching_primary" | "fetching_fallback" | "speaking" | "error";

export function useAudioController() {
  const [audioState, setAudioState] = useState<AudioState>("idle");
  const [currentBuffer, setCurrentBuffer] = useState<AudioBuffer | null>(null);
  
  // AudioContext reference, shared across executions
  const audioCtxRef = useRef<AudioContext | null>(null);
  // Web Worker reference
  const workerRef = useRef<Worker | null>(null);
  const resolveWorkerCb = useRef<((buf: AudioBuffer) => void) | null>(null);
  const rejectWorkerCb = useRef<((err: Error) => void) | null>(null);

  // Initialize or resume the Audio Context
  const ensureAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume().catch(console.warn);
    }
    return audioCtxRef.current;
  }, []);

  // Initialize the Web Worker lazily
  const initFallbackWorker = useCallback(() => {
    if (!workerRef.current) {
      console.log("[AudioController] Init Fallback Worker...");
      workerRef.current = new Worker(new URL("./kokoroWorker.js", import.meta.url), { type: "module" });
      
      workerRef.current.onmessage = async (e) => {
        const { type, audio, sampleRate, error } = e.data;
        
        if (type === "READY") {
          console.log("[AudioController] Fallback TTS Engine Ready.");
        } else if (type === "SUCCESS" && audio && sampleRate) {
          try {
            const ctx = ensureAudioContext();
            // Kokoro outputs mono Float32Array
            const buffer = ctx.createBuffer(1, audio.length, sampleRate);
            buffer.copyToChannel(audio, 0);
            
            if (resolveWorkerCb.current) {
              resolveWorkerCb.current(buffer);
            }
          } catch (err) {
            if (rejectWorkerCb.current) rejectWorkerCb.current(err as Error);
          }
        } else if (type === "ERROR") {
          if (rejectWorkerCb.current) rejectWorkerCb.current(new Error(error));
        }
      };
    }
    return workerRef.current;
  }, [ensureAudioContext]);

  // Clean up worker on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
         // Optionally close context, but generally fine to leave GC to handle
      }
    };
  }, []);

  // Main Speak Function
  const speak = useCallback(async (text: string) => {
    setAudioState("fetching_primary");
    const ctx = ensureAudioContext();
    
    // Attempt 1: Puter API (ElevenLabs wrapper)
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 2000); // Strict 2000ms timeout

    try {
      console.log("[AudioController] Fetching primary TTS...");
      // Assuming user uses standard puter js integration pattern
      const response = await fetch("https://api.puter.com/v2/ai/text-to-speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_PUTER_API_KEY || ''}`, // Fallback to window.puter if needed
        },
        body: JSON.stringify({ text, voice: "josh" }),
        signal: abortController.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Primary TTS failed with status ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);
      
      setCurrentBuffer(decodedBuffer);
      setAudioState("speaking");
      return;

    } catch (err) {
      console.warn("[AudioController] Primary TTS Failed/Timed out. Proceeding to fallback...", err);
      // Clean timeout if caught
      clearTimeout(timeoutId);
    }

    // Attempt 2: Fallback (Kokoro WebGPU)
    try {
      setAudioState("fetching_fallback");
      const worker = initFallbackWorker();
      
      const buffer = await new Promise<AudioBuffer>((resolve, reject) => {
        resolveWorkerCb.current = resolve;
        rejectWorkerCb.current = reject;
        
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
