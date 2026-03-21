import { pipeline, env } from "@huggingface/transformers";

// Disable local models to force downloading from HF Hub
env.allowLocalModels = false;
env.backends.onnx.wasm.numThreads = 1;

let synthesizer = null;
let isReady = false;
let initPromise = null;

// We use IndexedDB cache by default in v3
async function initSynthesizer() {
  if (synthesizer) return synthesizer;
  
  try {
    synthesizer = await pipeline("text-to-speech", "Xenova/mms-tts-eng", {
      device: "webgpu",
      dtype: "q8"
    });
  } catch (err) {
    console.warn("WebGPU not supported or failed, falling back to wasm:", err);
    synthesizer = await pipeline("text-to-speech", "Xenova/mms-tts-eng", {
      device: "wasm",
      dtype: "q8",
      quantized: true
    });
  }
  
  isReady = true;
  postMessage({ type: "READY" });
  return synthesizer;
}

// Initialize on load
initPromise = initSynthesizer();
initPromise.catch((err) => {
  postMessage({ type: "ERROR", error: err.message });
});

self.onmessage = async (e) => {
  const { type, text, id } = e.data;

  if (type === "GENERATE") {
    try {
      if (!isReady) {
        await initPromise;
      }

      // The model generates the audio tensor
      const output = await synthesizer(text);

      // output.audio is a Float32Array
      // output.sampling_rate is typically 24000
      postMessage(
        {
          type: "SUCCESS",
          id,
          audio: output.audio, // Float32Array
          sampleRate: output.sampling_rate,
        },
        // Fast memory transfer
        [output.audio.buffer]
      );
    } catch (err) {
      console.error("[Kokoro Worker] Generation error:", err);
      postMessage({ type: "ERROR", id, error: err.message });
    }
  }
};
