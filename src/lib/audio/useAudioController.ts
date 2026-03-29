"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { GoogleGenAI, Modality } from "@google/genai";
import { chunkTextForTts } from "./chunkTextForTts";
import { getAssetBaseUrl, loadPiperVoiceFiles } from "./piperModelCache";
import { coarsePhonemeTimings, textToPhonemeIds } from "./piperPhonemize";
import { useVoiceSettings } from "./VoiceProvider";
import { DEFAULT_VOICE_SETTINGS, type PhonemeTiming } from "./voiceTypes";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AudioState = "idle" | "fetching" | "speaking" | "error";

/** Ordered list of synthesis backends tried per utterance. */
type TierName = "gemini" | "piper" | "puter" | "webspeech";

// ─────────────────────────────────────────────────────────────────────────────
// TTS status broadcast  (consumed by StatusBar UI)
// ─────────────────────────────────────────────────────────────────────────────

export type TtsStatusState = "idle" | "fetching" | "speaking" | "fallback" | "error";

export interface TtsStatusDetail {
  message: string;
  state: TtsStatusState;
  tier?: TierName;
}

function emitTtsStatus(detail: TtsStatusDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<TtsStatusDetail>("tts-status", { detail }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Module-level singletons  (shared across all agents / hook instances)
// ─────────────────────────────────────────────────────────────────────────────

let globalAudioCtx: AudioContext | null = null;

// Piper ONNX worker
let globalPiperWorker: Worker | null = null;
const globalPiperCbs = new Map<number, (v: unknown) => void>();
const globalPiperErrs = new Map<number, (e: Error) => void>();
let globalPiperMsgId = 1;
let globalPiperInitedVoiceId: string | null = null;
let globalPiperReady = false;
let globalPiperWarmupInFlight = false;

// Serialised speech
let globalSpeechLock = false;
let globalSpeechQueue: {
  text: string;
  agentId?: string;
  isSubconscious: boolean;
}[] = [];
let globalHasInteracted = false;

const GEMINI_API_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_TTS_API_KEY ||
  "AIzaSyBTwWnhGxShFSIrX9z0kHa8vmGc5AGG9Ds";

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

/** Reject `promise` if it doesn't settle within `ms` milliseconds. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`[TTS] timeout ${ms}ms`)), ms),
    ),
  ]);
}

/** Convert Gemini's raw PCM base64 (16-bit 24kHz mono) to a WAV data URL. */
function base64PcmToWavUrl(base64: string, sampleRate = 24000): string {
  const bin = atob(base64);
  const pcm = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) pcm[i] = bin.charCodeAt(i);

  const numCh = 1;
  const bps = 16;
  const byteRate = sampleRate * numCh * (bps / 8);
  const blockAlign = numCh * (bps / 8);
  const buf = new ArrayBuffer(44 + pcm.length);
  const v = new DataView(buf);
  const w = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };

  w(0, "RIFF"); v.setUint32(4, 36 + pcm.length, true);
  w(8, "WAVE"); w(12, "fmt ");
  v.setUint32(16, 16, true);  v.setUint16(20, 1, true);
  v.setUint16(22, numCh, true); v.setUint32(24, sampleRate, true);
  v.setUint32(28, byteRate, true); v.setUint16(32, blockAlign, true);
  v.setUint16(34, bps, true); w(36, "data"); v.setUint32(40, pcm.length, true);
  new Uint8Array(buf, 44).set(pcm);

  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return `data:audio/wav;base64,${btoa(s)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Piper ONNX worker management
// ─────────────────────────────────────────────────────────────────────────────

function attachPiperHandler() {
  if (!globalPiperWorker) return;
  globalPiperWorker.onmessage = (e: MessageEvent) => {
    const { type, id, error } = e.data as {
      type: string;
      id: number;
      error?: string;
    };
    if (type === "error") {
      globalPiperErrs.get(id)?.(new Error(error ?? "Piper worker error"));
    } else if (type === "audio" || type === "ready" || type === "configured") {
      globalPiperCbs.get(id)?.(e.data);
    }
    globalPiperCbs.delete(id);
    globalPiperErrs.delete(id);
  };
}

function getPiperWorker(): Worker {
  if (typeof window === "undefined") throw new Error("Piper requires a browser context");
  if (!globalPiperWorker) {
    globalPiperWorker = new Worker(
      new URL("./piper.worker.js", import.meta.url),
      { type: "module" },
    );
    attachPiperHandler();
  }
  return globalPiperWorker;
}

function postPiper(
  msg: Record<string, unknown>,
  transfer?: Transferable[],
): Promise<unknown> {
  return new Promise((res, rej) => {
    const id = globalPiperMsgId++;
    globalPiperCbs.set(id, res);
    globalPiperErrs.set(id, rej);
    getPiperWorker().postMessage({ ...msg, id }, transfer ?? []);
  });
}

function resetPiperSession() {
  const err = new Error("Piper session reset");
  globalPiperErrs.forEach((r) => r(err));
  globalPiperCbs.clear();
  globalPiperErrs.clear();
  globalPiperWorker?.terminate();
  globalPiperWorker = null;
  globalPiperInitedVoiceId = null;
  globalPiperReady = false;
}

/**
 * Fire-and-forget. Downloads + initialises the ONNX session in the worker.
 * Sets globalPiperReady = true when done; subsequent speak() calls use Piper.
 */
async function startPiperWarmup(voiceId: string, base: string): Promise<void> {
  if (globalPiperReady || globalPiperWarmupInFlight) return;
  if (typeof window === "undefined") return;
  globalPiperWarmupInFlight = true;
  try {
    const { onnx, config } = await loadPiperVoiceFiles(voiceId);
    if (globalPiperInitedVoiceId === voiceId) {
      globalPiperReady = true;
      return;
    }
    resetPiperSession();
    await postPiper({ type: "configure", wasmBaseUrl: base });
    const copy = onnx.slice(0);
    await postPiper(
      {
        type: "init",
        wasmBaseUrl: base,
        modelBuf: copy,
        noiseScale: config.inference?.noise_scale,
        lengthScale: config.inference?.length_scale,
        noiseW: config.inference?.noise_w,
        sampleRate: config.audio?.sample_rate ?? 22050,
      },
      [copy],
    );
    globalPiperInitedVoiceId = voiceId;
    globalPiperReady = true;
    console.debug("[Piper] Warmup complete — local voice ready for future utterances.");
  } catch (err) {
    console.warn("[Piper] Background warmup failed:", err);
  } finally {
    globalPiperWarmupInFlight = false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tier implementations  (module-level, no React state)
// ─────────────────────────────────────────────────────────────────────────────

/** Tier: Gemini TTS — high quality cloud, ~400-800ms, 6s hard timeout. */
async function tierGemini(
  text: string,
  voiceName: string,
): Promise<HTMLAudioElement> {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const response = await withTimeout(
    ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say naturally: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName } },
        },
      },
    }),
    6_000,
  );
  const b64 =
    response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!b64) throw new Error("Gemini returned no audio data");
  const el = new Audio(base64PcmToWavUrl(b64));
  el.crossOrigin = "anonymous";
  return el;
}

/** Tier: Piper ONNX local — offline, ~200-600ms once warmed. */
async function tierPiper(
  text: string,
  ctx: AudioContext,
  voiceId: string,
  base: string,
): Promise<{ buffer: AudioBuffer; schedule: PhonemeTiming[] }> {
  if (!globalPiperReady || globalPiperInitedVoiceId !== voiceId) {
    throw new Error("Piper not warmed up");
  }

  const { config } = await withTimeout(loadPiperVoiceFiles(voiceId), 2_000);
  const sampleRate = config.audio?.sample_rate ?? 22050;
  const gapSec = 0.08;
  const gapSamples = Math.floor(gapSec * sampleRate);

  const chunks = chunkTextForTts(text);
  const toSynth = chunks.length > 0 ? chunks : [text.trim() || "."];
  const pcmPieces: Float32Array[] = [];
  const schedules: PhonemeTiming[] = [];
  let wallTime = 0;

  for (let ci = 0; ci < toSynth.length; ci++) {
    const { ids, graphemes } = await withTimeout(
      textToPhonemeIds(toSynth[ci], config, base),
      4_000,
    );
    const result = (await withTimeout(
      postPiper({ type: "generate_audio", phonemeIds: ids }),
      8_000,
    )) as { pcm: ArrayBuffer; sampleRate: number };

    const f32 = new Float32Array(result.pcm);
    pcmPieces.push(f32);
    const dur = f32.length / sampleRate;
    for (const p of coarsePhonemeTimings(graphemes, dur)) {
      schedules.push({
        index: p.index,
        t0: wallTime + p.t0,
        t1: wallTime + p.t1,
        id: p.id,
      });
    }
    wallTime += dur + (ci < toSynth.length - 1 ? gapSec : 0);
  }

  let totalLen = 0;
  for (let i = 0; i < pcmPieces.length; i++) {
    totalLen += pcmPieces[i].length + (i < pcmPieces.length - 1 ? gapSamples : 0);
  }
  if (totalLen === 0) throw new Error("Piper produced no audio samples");

  const merged = new Float32Array(totalLen);
  let off = 0;
  for (let i = 0; i < pcmPieces.length; i++) {
    merged.set(pcmPieces[i], off);
    off += pcmPieces[i].length + (i < pcmPieces.length - 1 ? gapSamples : 0);
  }

  const buffer = ctx.createBuffer(1, merged.length, sampleRate);
  buffer.copyToChannel(merged, 0);
  return { buffer, schedule: schedules };
}

/**
 * Puter.js injects a "Low Balance" / error dialog into document.body when an
 * API call fails. We suppress it with a MutationObserver that is active only
 * for the duration of the request, so nothing else is affected.
 */
function suppressPuterDialogs(): () => void {
  if (typeof document === "undefined") return () => {};

  const remove = (node: Node) => {
    if (!(node instanceof HTMLElement)) return;
    // Puter wraps the dialog in an overlay div; the content itself has
    // .dialog-content. Match either the wrapper or the content directly.
    const target =
      node.querySelector?.(".dialog-content") ??
      (node.classList?.contains("dialog-content") ? node : null);
    if (target) {
      // Remove the outermost injected container, not just the inner content
      const root = target.closest("body > *:not(#__next)") ?? target;
      try {
        root.remove();
      } catch {
        /* already removed */
      }
    }
  };

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach(remove);
    }
  });

  observer.observe(document.body, { childList: true, subtree: false });
  return () => observer.disconnect();
}

/** Tier: Puter / OpenAI TTS — cloud backup, ~1-2s, 8s hard timeout. */
async function tierPuter(text: string): Promise<HTMLAudioElement> {
  const stopSuppressing = suppressPuterDialogs();
  try {
    const puter = (await import("@heyputer/puter.js")).default;
    return await withTimeout<HTMLAudioElement>(
      puter.ai.txt2speech(text, { provider: "openai", voice: "nova" }),
      8_000,
    );
  } finally {
    // Keep observer alive briefly so any dialog triggered by the failure
    // response is still caught before we disconnect.
    setTimeout(stopSuppressing, 300);
  }
}

/**
 * Tier: Web Speech API — browser-native, instant, non-spatial.
 * Last resort only. Releases immediately (does not await utterance end)
 * so the speech lock doesn't block the next agent turn.
 */
function tierWebSpeech(text: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const synth =
      typeof window !== "undefined" ? window.speechSynthesis : null;
    if (!synth) {
      reject(new Error("speechSynthesis not available"));
      return;
    }
    // Cancel any pending utterances
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.05;
    u.onerror = (e) => reject(new Error(e.error || "WebSpeech error"));
    synth.speak(u);
    // Resolve immediately — we release the lock after duration estimate below
    resolve();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Tier ordering
// ─────────────────────────────────────────────────────────────────────────────

function buildTierOrder(
  backend: string,
  piperReady: boolean,
  disableWebSpeech: boolean,
): TierName[] {
  const hasPiper = piperReady && globalPiperInitedVoiceId !== null;
  const base: TierName[] =
    backend === "local"
      ? hasPiper
        ? ["piper", "gemini", "puter"]
        : ["gemini", "puter"]
      : // "google" — default: best quality first
        hasPiper
        ? ["gemini", "piper", "puter"]
        : ["gemini", "puter"];

  return disableWebSpeech ? base : [...base, "webspeech"];
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useAudioController() {
  const voiceSettings = useVoiceSettings();
  const [audioState, setAudioState] = useState<AudioState>("idle");
  const [currentBuffer, setCurrentBuffer] = useState<AudioBuffer | null>(null);
  const [currentPhonemeSchedule, setCurrentPhonemeSchedule] = useState<
    PhonemeTiming[] | null
  >(null);
  const [currentAudioElement, setCurrentAudioElement] =
    useState<HTMLAudioElement | null>(null);
  /** Tracks the active HTMLAudioElement without putting it in speak() deps (avoids cascade re-renders). */
  const currentAudioElementRef = useRef<HTMLAudioElement | null>(null);
  const reqIdRef = useState(() => ({ current: 0 }))[0];
  const speakRef = useRef<
    ((text: string, agentId?: string, isSubconscious?: boolean) => Promise<void>) | null
  >(null);

  // ── AudioContext ──────────────────────────────────────────────────────────

  const ensureAudioContext = useCallback(async () => {
    if (typeof window !== "undefined") {
      if (!globalAudioCtx) {
        globalAudioCtx = new (
          window.AudioContext ||
          (
            window as unknown as { webkitAudioContext: typeof AudioContext }
          ).webkitAudioContext
        )();
      }
      // Only attempt resume() after the user has interacted with the page.
      // Calling resume() on a suspended context before any gesture triggers a
      // Chrome DOMException and console warning — AudioUnlocker handles the
      // actual unlock on the first click/keydown/touch event.
      if (globalAudioCtx.state === "suspended" && globalHasInteracted) {
        try {
          await globalAudioCtx.resume();
        } catch {
          /* AudioUnlocker handles this */
        }
      }
    }
    return globalAudioCtx;
  }, []);

  // ── speak() ───────────────────────────────────────────────────────────────

  const speak = useCallback(
    async (text: string, agentId?: string, isSubconscious = false) => {
      if (!text.trim()) return;
      if (globalSpeechLock && isSubconscious) return;

      const requestId = ++reqIdRef.current;
      globalSpeechLock = true;
      setAudioState("fetching");

      const ctx = await ensureAudioContext();
      if (!ctx) {
        globalSpeechLock = false;
        setAudioState("idle");
        return;
      }

      // Queue if AudioContext not yet running (before first gesture)
      if (ctx.state !== "running") {
        globalSpeechQueue.push({ text, agentId, isSubconscious });
        window.dispatchEvent(
          new CustomEvent("audio-queue-updated", {
            detail: { count: globalSpeechQueue.length },
          }),
        );
        globalSpeechLock = false;
        return;
      }

      // Clear previous audio (use ref so speak() does not depend on React state)
      setCurrentBuffer(null);
      setCurrentPhonemeSchedule(null);
      const prevEl = currentAudioElementRef.current;
      if (prevEl) {
        prevEl.pause();
        prevEl.src = "";
      }
      currentAudioElementRef.current = null;
      setCurrentAudioElement(null);

      const piperVoiceId =
        voiceSettings.piperVoiceId ??
        DEFAULT_VOICE_SETTINGS.piperVoiceId ??
        "en_US-lessac-medium";
      const piperBase = getAssetBaseUrl();
      const googleVoice =
        voiceSettings.googleVoiceName ??
        DEFAULT_VOICE_SETTINGS.googleVoiceName ??
        "Leda";

      const tiers = buildTierOrder(
        voiceSettings.backend,
        globalPiperReady,
        voiceSettings.disableWebSpeech ?? false,
      );

      /** Release the global speech lock only for this request. */
      const releaseLock = () => {
        if (requestId === reqIdRef.current) globalSpeechLock = false;
      };

      const TIER_LABELS: Record<TierName, string> = {
        gemini: "Gemini",
        piper: "Local Voice",
        puter: "OpenAI",
        webspeech: "Browser Voice",
      };

      for (const tier of tiers) {
        if (requestId !== reqIdRef.current) {
          globalSpeechLock = false;
          return;
        }

        emitTtsStatus({ message: TIER_LABELS[tier], state: "fetching", tier });

        try {
          // ── Gemini ───────────────────────────────────────────────────────
          if (tier === "gemini") {
            const el = await tierGemini(text, googleVoice);
            if (requestId !== reqIdRef.current) {
              globalSpeechLock = false;
              return;
            }
            currentAudioElementRef.current = el;
            setCurrentAudioElement(el);
            setAudioState("speaking");
            emitTtsStatus({ message: TIER_LABELS[tier], state: "speaking", tier });
            el.onended = () => { releaseLock(); emitTtsStatus({ message: "", state: "idle" }); };
            el.onerror = () => { releaseLock(); emitTtsStatus({ message: "", state: "idle" }); };
            return;
          }

          // ── Piper ─────────────────────────────────────────────────────────
          if (tier === "piper" && piperBase) {
            const { buffer, schedule } = await tierPiper(
              text,
              ctx,
              piperVoiceId,
              piperBase,
            );
            if (requestId !== reqIdRef.current) {
              globalSpeechLock = false;
              return;
            }
            setCurrentPhonemeSchedule(schedule);
            setCurrentBuffer(buffer);
            setAudioState("speaking");
            emitTtsStatus({ message: TIER_LABELS[tier], state: "speaking", tier });
            setTimeout(() => {
              releaseLock();
              emitTtsStatus({ message: "", state: "idle" });
            }, buffer.duration * 1_000 + 300);
            return;
          }

          // ── Puter / OpenAI ────────────────────────────────────────────────
          if (tier === "puter") {
            const el = await tierPuter(text);
            if (requestId !== reqIdRef.current) {
              globalSpeechLock = false;
              return;
            }
            currentAudioElementRef.current = el;
            setCurrentAudioElement(el);
            setAudioState("speaking");
            emitTtsStatus({ message: TIER_LABELS[tier], state: "speaking", tier });
            el.onended = () => { releaseLock(); emitTtsStatus({ message: "", state: "idle" }); };
            el.onerror = () => { releaseLock(); emitTtsStatus({ message: "", state: "idle" }); };
            return;
          }

          // ── Web Speech API (emergency) ────────────────────────────────────
          if (tier === "webspeech") {
            await tierWebSpeech(text);
            if (requestId !== reqIdRef.current) {
              globalSpeechLock = false;
              return;
            }
            setAudioState("speaking");
            emitTtsStatus({ message: TIER_LABELS[tier], state: "speaking", tier });
            setTimeout(() => {
              releaseLock();
              emitTtsStatus({ message: "", state: "idle" });
            }, Math.max(500, text.length * 65));
            return;
          }
        } catch (err) {
          const msg = (err as Error).message;
          console.warn(`[TTS] Tier "${tier}" failed: ${msg}`);
          emitTtsStatus({ message: `${TIER_LABELS[tier]} unavailable`, state: "fallback", tier });

          // Piper timeout → reset session so next warmup can retry
          if (tier === "piper") resetPiperSession();

          // If cloud tiers are failing, try to kick off Piper warmup for future
          if (
            (tier === "gemini" || tier === "puter") &&
            piperBase &&
            !globalPiperReady
          ) {
            startPiperWarmup(piperVoiceId, piperBase).catch(() => {});
          }
          // continue to next tier
        }
      }

      // Every tier failed
      setAudioState("error");
      emitTtsStatus({ message: "Voice unavailable", state: "error" });
      globalSpeechLock = false;
    },
    [ensureAudioContext, reqIdRef, voiceSettings],
  );

  speakRef.current = speak;

  // ── First-interaction: unlock audio + warm Piper ─────────────────────────

  useEffect(() => {
    if (globalHasInteracted) return;

    const flushQueue = async () => {
      if (globalHasInteracted) return;
      globalHasInteracted = true;
      console.debug(
        `[TTS] Interaction detected — flushing ${globalSpeechQueue.length} queued task(s).`,
      );

      // Start Piper warmup proactively so it's ready before the user's first
      // real TTS request (Piper loads in background, cloud TTS serves immediately).
      const defaultVoiceId =
        DEFAULT_VOICE_SETTINGS.piperVoiceId ?? "en_US-lessac-medium";
      const base = getAssetBaseUrl();
      if (base) startPiperWarmup(defaultVoiceId, base).catch(() => {});

      const tasks = [...globalSpeechQueue];
      globalSpeechQueue = [];
      window.dispatchEvent(
        new CustomEvent("audio-queue-updated", { detail: { count: 0 } }),
      );
      for (const task of tasks) {
        setTimeout(
          () =>
            speakRef.current?.(task.text, task.agentId, task.isSubconscious),
          50,
        );
      }

      events.forEach((e) => document.removeEventListener(e, flushQueue));
    };

    const events = ["click", "keydown", "touchstart", "pointerdown"];
    events.forEach((e) => document.addEventListener(e, flushQueue));
    return () => events.forEach((e) => document.removeEventListener(e, flushQueue));
  }, []);

  // ── stopSpeaking ──────────────────────────────────────────────────────────

  const stopSpeaking = useCallback(() => {
    reqIdRef.current++;
    globalSpeechLock = false;
    emitTtsStatus({ message: "", state: "idle" });

    // Cancel Web Speech API if active
    if (typeof window !== "undefined" && window.speechSynthesis?.speaking) {
      window.speechSynthesis.cancel();
    }

    setCurrentBuffer(null);
    setCurrentPhonemeSchedule(null);
    const el = currentAudioElementRef.current;
    if (el) {
      el.pause();
      el.src = "";
    }
    currentAudioElementRef.current = null;
    setCurrentAudioElement(null);
    setAudioState("idle");
  }, [reqIdRef]);

  // ─────────────────────────────────────────────────────────────────────────

  return {
    audioState,
    currentBuffer,
    currentPhonemeSchedule,
    currentAudioElement,
    speak,
    stopSpeaking,
    ensureAudioContext,
    piperReady: globalPiperReady,
    hasPendingAudio: globalSpeechQueue.length > 0,
  };
}
