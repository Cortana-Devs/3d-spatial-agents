"use client";
import { useState, useCallback, useEffect } from "react";
import puter from "@heyputer/puter.js";
import { GoogleGenAI, Modality } from "@google/genai";

export type AudioState = "idle" | "fetching_primary" | "fetching_fallback" | "speaking" | "error";

// Module-level singletons to share across all agents
let globalAudioCtx: AudioContext | null = null;
let globalWorker: Worker | null = null;
let globalResolveWorkerCb: ((buf: AudioBuffer) => void) | null = null;
let globalRejectWorkerCb: ((err: Error) => void) | null = null;
let globalSpeechLock = false; // Singleton lock
let globalSpeechQueue: { text: string; agentId?: string; isSubconscious: boolean }[] = [];
let globalHasInteracted = false;

// Voice config from sample project
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_TTS_API_KEY || 'AIzaSyBTwWnhGxShFSIrX9z0kHa8vmGc5AGG9Ds';

export function useAudioController() {
  const [audioState, setAudioState] = useState<AudioState>("idle");
  const [currentBuffer, setCurrentBuffer] = useState<AudioBuffer | null>(null);
  const [currentAudioElement, setCurrentAudioElement] = useState<HTMLAudioElement | null>(null);
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
          console.debug("[AudioController] AudioContext Resumed.");
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
          console.debug("[AudioController] Fallback TTS Engine Ready.");
        } else if (type === "SUCCESS" && audio && sampleRate) {
          try {
            const ctx = await ensureAudioContext();
            if (ctx) {
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
      console.debug(`[AudioController] Interaction detected - Flushing ${globalSpeechQueue.length} queued speech tasks.`);
      globalHasInteracted = true;
      
      const tasks = [...globalSpeechQueue];
      globalSpeechQueue = [];
      window.dispatchEvent(new CustomEvent("audio-queue-updated", { detail: { count: 0 } }));
      
      for (const task of tasks) {
        setTimeout(() => speak(task.text, task.agentId, task.isSubconscious), 50);
      }
      
      events.forEach(e => document.removeEventListener(e, flushQueue));
    };

    const events = ["click", "keydown", "touchstart", "pointerdown"];
    events.forEach(e => document.addEventListener(e, flushQueue));
    return () => events.forEach(e => document.removeEventListener(e, flushQueue));
  }, []);

  // Helper to construct WAV header for raw PCM data
  const createWavDataUrl = (base64Audio: string) => {
    const binaryString = atob(base64Audio);
    const pcmData = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      pcmData[i] = binaryString.charCodeAt(i);
    }
    
    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = pcmData.length;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    const writeString = (view: DataView, offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    const pcmView = new Uint8Array(buffer, 44);
    pcmView.set(pcmData);

    const bytes = new Uint8Array(buffer);
    let wavBinary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      wavBinary += String.fromCharCode(bytes[i]);
    }
    
    return `data:audio/wav;base64,${btoa(wavBinary)}`;
  };

  const speak = useCallback(async (text: string, agentId?: string, isSubconscious = false) => {
    if (globalSpeechLock && isSubconscious) return;
    
    const requestId = ++reqIdRef.current;
    globalSpeechLock = true;
    
    setAudioState("fetching_primary");
    const ctx = await ensureAudioContext();
    if (!ctx) {
      globalSpeechLock = false;
      return;
    }

    if (ctx.state !== "running") {
      console.debug(`[AudioController] Audio blocked by browser policy. Queueing speech: \"${text.slice(0, 20)}...\"`);
      globalSpeechQueue.push({ text, agentId, isSubconscious });
      window.dispatchEvent(new CustomEvent("audio-queue-updated", { detail: { count: globalSpeechQueue.length } }));
      globalSpeechLock = false;
      return;
    }
    
    setCurrentBuffer(null);
    if (currentAudioElement) {
       currentAudioElement.pause();
       currentAudioElement.src = "";
    }
    setCurrentAudioElement(null);

    // Attempt 1: Gemini TTS (Free Unlimited)
    try {
      console.debug(`[AudioController] -> GEMINI TTS [Agent: ${agentId || 'User'}]`);
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Read aloud in a warm, welcoming tone: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Leda" }, // Default to Leda
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) throw new Error("No audio data from Gemini");

      if (requestId !== reqIdRef.current) {
        globalSpeechLock = false;
        return;
      }

      const audioSrc = createWavDataUrl(base64Audio);
      const audioElement = new Audio(audioSrc);
      audioElement.crossOrigin = "anonymous";
      
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
      console.warn("[AudioController] Gemini TTS Failed. Falling back to Puter/OpenAI...", err);
    }

    // Attempt 2: Puter AI (OpenAI)
    try {
      console.debug(`[AudioController] -> PUTER CLOUD [Agent: ${agentId || 'User'}]`);
      const audioElement = await puter.ai.txt2speech(text, {
        provider: "openai",
        voice: "nova"
      });
      
      if (requestId !== reqIdRef.current) {
        globalSpeechLock = false;
        return;
      }

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
      console.warn("[AudioController] Puter Cloud Failed. Fallback to Kokoro...", err);
    }

    // Attempt 3: Fallback (Kokoro WebGPU)
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
