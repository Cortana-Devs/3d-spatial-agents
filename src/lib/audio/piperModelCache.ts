import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { PiperVoiceJson } from "./piperPhonemize";

const HF_BASE =
  "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium";

interface PiperCacheSchema extends DBSchema {
  piperModels: {
    key: string;
    value: {
      voiceId: string;
      onnx: ArrayBuffer;
      jsonText: string;
      savedAt: number;
    };
  };
}

const DB_NAME = "piper-tts-cache";
const STORE = "piperModels";
const OPFS_DIR = "piper-tts";

let dbPromise: Promise<IDBPDatabase<PiperCacheSchema>> | null = null;

function getDb() {
  if (typeof window === "undefined") return null;
  if (!dbPromise) {
    dbPromise = openDB<PiperCacheSchema>(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(STORE, { keyPath: "voiceId" });
      },
    });
  }
  return dbPromise;
}

export function piperOnnxUrl(voiceId: string): string {
  if (voiceId === "en_US-lessac-medium") {
    return `${HF_BASE}/en_US-lessac-medium.onnx`;
  }
  return `https://huggingface.co/rhasspy/piper-voices/resolve/main/${voiceId}.onnx`;
}

export function piperJsonUrl(voiceId: string): string {
  if (voiceId === "en_US-lessac-medium") {
    return `${HF_BASE}/en_US-lessac-medium.onnx.json`;
  }
  return `https://huggingface.co/rhasspy/piper-voices/resolve/main/${voiceId}.onnx.json`;
}

async function readOpfs(voiceId: string): Promise<{ onnx: ArrayBuffer; jsonText: string } | null> {
  try {
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle(OPFS_DIR, { create: false });
    const onnxH = await dir.getFileHandle(`${voiceId}.onnx`);
    const jsonH = await dir.getFileHandle(`${voiceId}.onnx.json`);
    const onnxBuf = await (await onnxH.getFile()).arrayBuffer();
    const jsonText = await (await jsonH.getFile()).text();
    return { onnx: onnxBuf, jsonText };
  } catch {
    return null;
  }
}

async function writeOpfs(voiceId: string, onnx: ArrayBuffer, jsonText: string) {
  const root = await navigator.storage.getDirectory();
  const dir = await root.getDirectoryHandle(OPFS_DIR, { create: true });
  const onnxFh = await dir.getFileHandle(`${voiceId}.onnx`, { create: true });
  let w = await onnxFh.createWritable();
  await w.write(onnx);
  await w.close();
  const jsonFh = await dir.getFileHandle(`${voiceId}.onnx.json`, { create: true });
  w = await jsonFh.createWritable();
  await w.write(new Blob([jsonText]));
  await w.close();
}

async function readIdb(voiceId: string): Promise<{ onnx: ArrayBuffer; jsonText: string } | null> {
  const db = getDb();
  if (!db) return null;
  const row = await (await db).get(STORE, voiceId);
  if (!row) return null;
  return { onnx: row.onnx, jsonText: row.jsonText };
}

async function writeIdb(voiceId: string, onnx: ArrayBuffer, jsonText: string) {
  const db = getDb();
  if (!db) return;
  await (await db).put(STORE, {
    voiceId,
    onnx,
    jsonText,
    savedAt: Date.now(),
  });
}

async function fetchVoice(voiceId: string): Promise<{ onnx: ArrayBuffer; jsonText: string }> {
  const [onnxRes, jsonRes] = await Promise.all([
    fetch(piperOnnxUrl(voiceId)),
    fetch(piperJsonUrl(voiceId)),
  ]);
  if (!onnxRes.ok) throw new Error(`Piper ONNX fetch failed: ${onnxRes.status}`);
  if (!jsonRes.ok) throw new Error(`Piper JSON fetch failed: ${jsonRes.status}`);
  const onnx = await onnxRes.arrayBuffer();
  const jsonText = await jsonRes.text();
  return { onnx, jsonText };
}

/**
 * OPFS first, then IndexedDB, then network; writes back to OPFS + IDB when fetched.
 */
export async function loadPiperVoiceFiles(
  voiceId: string,
): Promise<{ onnx: ArrayBuffer; jsonText: string; config: PiperVoiceJson }> {
  let got = await readOpfs(voiceId);
  if (!got) got = await readIdb(voiceId);
  if (!got) {
    got = await fetchVoice(voiceId);
    try {
      await writeOpfs(voiceId, got.onnx, got.jsonText);
    } catch {
      /* OPFS optional */
    }
    await writeIdb(voiceId, got.onnx, got.jsonText);
  }
  const config = JSON.parse(got.jsonText) as PiperVoiceJson;
  return { ...got, config };
}

export function getAssetBaseUrl(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}
