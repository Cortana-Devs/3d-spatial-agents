"use client";
import { useState, useCallback, useEffect } from "react";
import puter from "@heyputer/puter.js";

export type AudioState = "idle" | "fetching_primary" | "fetching_fallback" | "speaking" | "error";

// Module-level singletons to share across all agents
let globalAudioCtx: AudioContext | null = null;
let globalWorker: Worker | null = null;
let globalResolveWorkerCb: ((buf: AudioBuffer) => void) | null = null;
let globalRejectWorkerCb: ((err: Error) => void) | null = null;
let globalSpeechLock = false; // Singleton lock
let globalSpeechQueue: { text: string; agentId?: string; isSubconscious: boolean }[] = [];
let globalHasInteracted = false;

export function useAudioController() {
  const [audioState, setAudioState] = useState<AudioState>("idle");
  const [currentBuffer, setCurrentBuffer] = useState<AudioBuffer | null>(null);
  const [currentAudioElement, setCurrentAudioElement] = useState<HTMLAudioElement | null>(null);
  const lastRequestId = useCallback(() => (window as any)._audioReqId = ((window as any)._audioReqId || 0) + 1, []);
  const reqIdRef = useState(() => ({ current: 0 }))[0]; // local ID tracker

  // Initialize or resume the Audio Context
  const ensureAudioContext = useCallback(async () => {
    if (typeof window !== "undefined") {
      if (!globalAudioCtx) {
        globalAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (globalAudioCtx.state === "suspended") {
        try {
          await globalAudioCtx.resume();
          console.log("[AudioController] AudioContext Resumed.");
        } catch (e) {
          console.warn("[AudioController] Resume failed:", e);
        }
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
            const ctx = await ensureAudioContext();
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

  // Global Queue Flush Logic
  useEffect(() => {
    if (globalHasInteracted) return;

    const flushQueue = async () => {
      if (globalHasInteracted) return;
      console.log(`[AudioController] Interaction detected - Flushing ${globalSpeechQueue.length} queued speech tasks.`);
      globalHasInteracted = true;
      
      const tasks = [...globalSpeechQueue];
      globalSpeechQueue = [];
      window.dispatchEvent(new CustomEvent("audio-queue-updated", { detail: { count: 0 } }));
      
      for (const task of tasks) {
        // We call speak on the next tick to ensure AudioContext has finished resuming
        setTimeout(() => speak(task.text, task.agentId, task.isSubconscious), 50);
      }
      
      // Cleanup
      events.forEach(e => document.removeEventListener(e, flushQueue));
    };

    const events = ["click", "keydown", "touchstart", "pointerdown"];
    events.forEach(e => document.addEventListener(e, flushQueue));
    return () => events.forEach(e => document.removeEventListener(e, flushQueue));
  }, []);

  // Main Speak Function
  // Main Speak Function
  const speak = useCallback(async (text: string, agentId?: string, isSubconscious = false) => {
    // 1. Singleton Lock: Prevent overlapping cloud synthesis
    if (globalSpeechLock && isSubconscious) return;
    
    // Auth Check: Puter OpenAI requires a valid session
    try {
      const isSignedIn = await puter.auth.isSignedIn();
      if (!isSignedIn) {
        if (isSubconscious) {
          console.log("[AudioController] Not signed in - falling back to local for subconscious.");
          throw new Error("Auth Required");
        } else {
          console.log("[AudioController] Not signed in - prompting login...");
          await puter.auth.signIn();
        }
      }
    } catch (e) {
       if (isSubconscious) throw e;
    }

    const requestId = ++reqIdRef.current;
    globalSpeechLock = true;
    
    setAudioState("fetching_primary");
    const ctx = await ensureAudioContext();
    if (!ctx) {
      globalSpeechLock = false;
      return;
    }

    // 2. Queue Logic: If blocked by browser, wait for interaction
    if (ctx.state !== "running") {
      console.log(`[AudioController] Audio blocked by browser policy. Queueing speech: \"${text.slice(0, 20)}...\"`);
      globalSpeechQueue.push({ text, agentId, isSubconscious });
      window.dispatchEvent(new CustomEvent("audio-queue-updated", { detail: { count: globalSpeechQueue.length } }));
      globalSpeechLock = false;
      return;
    }
    
    // Clear old state
    setCurrentBuffer(null);
    if (currentAudioElement) {
       currentAudioElement.pause();
       currentAudioElement.src = "";
    }
    setCurrentAudioElement(null);

    try {
      console.log(`[AudioController] -> CLOUD [Agent: ${agentId || 'User'}] Text: \"${text.slice(0, 30)}...\"`);
      
      const audioElement = await puter.ai.txt2speech(text, {
        provider: "openai",
        voice: "nova"
      });
      
      if (requestId !== reqIdRef.current) {
        globalSpeechLock = false;
        return;
      }

      // We return the element for MediaElementSource usage in the 3D entity
      setCurrentAudioElement(audioElement);
      setAudioState("speaking");
      
      audioElement.onended = () => {
        if (requestId === reqIdRef.current) globalSpeechLock = false;
      };
      audioElement.onerror = () => {
        if (requestId === reqIdRef.current) globalSpeechLock = false;
      };
      
      return audioElement;

    } catch (err) {
      console.warn("[AudioController] Cloud Primary Failed. Fallback to Kokoro...", err);
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

      if (requestId === reqIdRef.current) {
        setCurrentBuffer(buffer);
        setAudioState("speaking");
        // Clear lock after buffer length
        setTimeout(() => { if (requestId === reqIdRef.current) globalSpeechLock = false; }, (text.length * 80) + 1000);
      }
    } catch (fallbackErr) {
      console.error("[AudioController] Fallback TTS Failed:", fallbackErr);
      setAudioState("error");
      globalSpeechLock = false;
    }

  }, [ensureAudioContext, initFallbackWorker, currentAudioElement, reqIdRef]);

  const stopSpeaking = useCallback(() => {
    reqIdRef.current++;
    globalSpeechLock = false;
    setCurrentBuffer(null);
    if (currentAudioElement) {
      currentAudioElement.pause();
      currentAudioElement.src = "";
    }
    setCurrentAudioElement(null);
    setAudioState("idle");
  }, [currentAudioElement, reqIdRef]);

  return { 
    audioState, 
    currentBuffer, 
    currentAudioElement, 
    speak, 
    stopSpeaking, 
    ensureAudioContext,
    hasPendingAudio: globalSpeechQueue.length > 0
  };
}
