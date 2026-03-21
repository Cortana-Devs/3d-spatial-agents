import { pipeline, env } from "@huggingface/transformers";

// Disable local models to force downloading from HF Hub
env.allowLocalModels = false;
env.backends.onnx.wasm.numThreads = 1;

let synthesizer = null;
let isReady = false;

// We use IndexedDB cache by default in v3
async function initSynthesizer() {
  if (synthesizer) return synthesizer;
  
  // Use the WebGPU backend strictly as specified
  synthesizer = await pipeline("text-to-speech", "onnx-community/Kokoro-82M-v1.0-ONNX", {
    device: "webgpu",
    dtype: "fp32", // fp32 is safer for audio fidelity in WebGPU Kokoro
  });
  
  isReady = true;
  postMessage({ type: "READY" });
  return synthesizer;
}

// Initialize on load
initSynthesizer().catch((err) => {
  postMessage({ type: "ERROR", error: err.message });
});

self.onmessage = async (e) => {
  const { type, text, id } = e.data;

  if (type === "GENERATE") {
    if (!isReady) {
      postMessage({ type: "ERROR", id, error: "Synthesizer is still loading." });
      return;
    }

    try {
      // The model generates the audio tensor
      const output = await synthesizer(text, {
        voice: "af_bella", // default female voice, can be parameterized
      });

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
