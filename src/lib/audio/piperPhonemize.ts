/**
 * Piper-compatible phonemization: eSpeak-ng runs in espeak.worker.js (WASM off main thread).
 * ONNX inference stays in piper.worker.js; ID mapping and timings stay on the main thread (light).
 */

import type { PhonemeTiming } from "./voiceTypes";

export type PiperPhonemeIdMap = Record<string, number[]>;

export interface PiperVoiceJson {
  audio?: { sample_rate?: number };
  espeak?: { voice?: string };
  inference?: {
    noise_scale?: number;
    length_scale?: number;
    noise_w?: number;
  };
  phoneme_type?: string;
  phoneme_map?: Record<string, string[]>;
  phoneme_id_map: PiperPhonemeIdMap;
}

const BOS = "^";
const EOS = "$";

// eSpeak runs in a dedicated worker so WASM startup + phonemize never blocks the main thread.
let espeakWorker: Worker | null = null;
const espeakCallbacks = new Map<
  number,
  { resolve: (v: string) => void; reject: (e: Error) => void }
>();
let espeakMsgId = 1;

function attachEspeakHandler() {
  if (!espeakWorker) return;
  espeakWorker.onmessage = (ev: MessageEvent) => {
    const { type, id, raw, error } = ev.data as {
      type: string;
      id: number;
      raw?: string;
      error?: string;
    };
    const cb = espeakCallbacks.get(id);
    if (!cb) return;
    espeakCallbacks.delete(id);
    if (type === "phoneme_raw") cb.resolve(raw ?? "");
    else cb.reject(new Error(error ?? "eSpeak worker error"));
  };
}

function getEspeakWorker(): Worker {
  if (typeof window === "undefined") {
    throw new Error("eSpeak worker requires a browser context");
  }
  if (!espeakWorker) {
    espeakWorker = new Worker(
      new URL("./espeak.worker.js", import.meta.url),
      { type: "module" },
    );
    attachEspeakHandler();
  }
  return espeakWorker;
}

function applyPhonemeMap(
  chars: string[],
  map: Record<string, string[]> | undefined,
): string[] {
  if (!map || Object.keys(map).length === 0) return chars;
  const out: string[] = [];
  for (const ch of chars) {
    const rep = map[ch];
    if (rep?.length) out.push(...rep);
    else out.push(ch);
  }
  return out;
}

/** Filter (lang) switches like Piper C++ phonemize. */
function filterLanguageFlags(chars: string[]): string[] {
  const out: string[] = [];
  let inFlag = false;
  for (const ch of chars) {
    if (inFlag) {
      if (ch === ")") inFlag = false;
      continue;
    }
    if (ch === "(") {
      inFlag = true;
      continue;
    }
    out.push(ch);
  }
  return out;
}

/** eSpeak phoneme string → grapheme list (NFD), Piper-style. */
function phonemeStringToGraphemes(phonemeUtf8: string): string[] {
  const norm = phonemeUtf8.normalize("NFD");
  const graphemes: string[] = [];
  for (const ch of norm) graphemes.push(ch);
  return filterLanguageFlags(graphemes);
}

export async function espeakRawPhonemeString(
  text: string,
  espeakVoice: string,
  assetBaseUrl: string,
): Promise<string> {
  const id = espeakMsgId++;
  return new Promise((resolve, reject) => {
    espeakCallbacks.set(id, { resolve, reject });
    try {
      getEspeakWorker().postMessage({
        type: "phonemize",
        id,
        text,
        espeakVoice,
        assetBaseUrl,
      });
    } catch (e) {
      espeakCallbacks.delete(id);
      reject(e instanceof Error ? e : new Error(String(e)));
    }
  });
}

export function phonemesToIds(
  phonemes: string[],
  phoneme_id_map: PiperPhonemeIdMap,
): number[] {
  const ids: number[] = [];
  const pushKey = (key: string) => {
    const arr = phoneme_id_map[key];
    if (!arr) return;
    for (const x of arr) ids.push(Number(x));
  };

  pushKey(BOS);
  for (const p of phonemes) {
    if (!(p in phoneme_id_map)) {
      console.warn("[piperPhonemize] Missing phoneme in id map:", p);
      continue;
    }
    pushKey(p);
    pushKey(" ");
  }
  pushKey(EOS);
  return ids;
}

export async function textToPhonemeIds(
  text: string,
  config: PiperVoiceJson,
  assetBaseUrl: string,
): Promise<{ ids: number[]; graphemes: string[] }> {
  if (config.phoneme_type && config.phoneme_type !== "espeak") {
    throw new Error(`Unsupported phoneme_type: ${config.phoneme_type}`);
  }
  const voice = config.espeak?.voice ?? "en-us";
  const raw = await espeakRawPhonemeString(text, voice, assetBaseUrl);
  const phonemeMap = config.phoneme_map as Record<string, string[]> | undefined;
  const lines = raw.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const pieces: string[] = [];
  for (const line of lines) {
    const g = phonemeStringToGraphemes(line);
    pieces.push(...applyPhonemeMap(g, phonemeMap));
  }
  if (pieces.length === 0 && raw.length > 0) {
    pieces.push(
      ...applyPhonemeMap(
        phonemeStringToGraphemes(raw),
        phonemeMap,
      ),
    );
  }
  if (pieces.length === 0) {
    pieces.push(
      ...applyPhonemeMap(
        filterLanguageFlags([...text.normalize("NFD")]),
        phonemeMap,
      ),
    );
  }
  return {
    ids: phonemesToIds(pieces, config.phoneme_id_map),
    graphemes: pieces,
  };
}

/** Coarse timings when ONNX has no duration head: spread phonemes across audio duration. */
export function coarsePhonemeTimings(
  phonemeGraphemes: string[],
  audioDurationSec: number,
): PhonemeTiming[] {
  const n = Math.max(1, phonemeGraphemes.length);
  const step = audioDurationSec / n;
  return phonemeGraphemes.map((g, i) => ({
    index: i,
    t0: i * step,
    t1: (i + 1) * step,
    id: g.codePointAt(0) ?? 0,
  }));
}
