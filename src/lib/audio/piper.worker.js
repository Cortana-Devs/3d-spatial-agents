/// <reference lib="webworker" />
import * as ort from "onnxruntime-web";

ort.env.wasm.numThreads = 1;
ort.env.wasm.simd = true;

/** @type {ort.InferenceSession | null} */
let session = null;
let noiseScale = 0.667;
let lengthScale = 1;
let noiseW = 0.8;
let outputSampleRate = 22050;

/**
 * @param {string} wasmBaseUrl origin + path prefix, e.g. https://x.com
 */
function configureWasmPaths(wasmBaseUrl) {
  const base = wasmBaseUrl.replace(/\/$/, "");
  ort.env.wasm.wasmPaths = `${base}/onnx-wasm/`;
}

/**
 * @param {ort.Tensor} t
 */
function tensorToFloat32Flat(t) {
  const raw = t.data;
  return raw instanceof Float32Array ? raw : new Float32Array(raw);
}

self.onmessage = async (e) => {
  const { type, id, wasmBaseUrl, modelBuf, noiseScale: ns, lengthScale: ls, noiseW: nw, sampleRate, phonemeIds } =
    e.data;

  if (type === "configure") {
    try {
      if (wasmBaseUrl) configureWasmPaths(wasmBaseUrl);
      postMessage({ type: "configured", id });
    } catch (err) {
      postMessage({ type: "error", id, error: String(err?.message || err) });
    }
    return;
  }

  if (type === "init") {
    try {
      if (wasmBaseUrl) configureWasmPaths(wasmBaseUrl);
      noiseScale = ns ?? 0.667;
      lengthScale = ls ?? 1;
      noiseW = nw ?? 0.8;
      outputSampleRate = sampleRate ?? 22050;

      session = await ort.InferenceSession.create(modelBuf, {
        executionProviders: ["wasm"],
        graphOptimizationLevel: "all",
      });

      postMessage({
        type: "ready",
        id,
        inputs: session.inputNames,
        outputs: session.outputNames,
      });
    } catch (err) {
      postMessage({ type: "error", id, error: String(err?.message || err) });
    }
    return;
  }

  if (type === "generate_audio") {
    if (!session) {
      postMessage({ type: "error", id, error: "Piper worker not initialized" });
      return;
    }
    try {
      const ids = phonemeIds;
      if (!ids?.length) {
        postMessage({ type: "error", id, error: "Empty phoneme id sequence" });
        return;
      }

      const input = new BigInt64Array(ids.length);
      for (let i = 0; i < ids.length; i++) input[i] = BigInt(ids[i]);

      /** @type {Record<string, ort.Tensor>} */
      const feeds = {
        input: new ort.Tensor("int64", input, [1, input.length]),
        input_lengths: new ort.Tensor("int64", BigInt64Array.from([BigInt(input.length)]), [1]),
        scales: new ort.Tensor("float32", new Float32Array([noiseScale, lengthScale, noiseW]), [1, 3]),
      };

      if (session.inputNames.includes("sid")) {
        feeds.sid = new ort.Tensor("int64", BigInt64Array.from([0n]), [1]);
      }

      const results = await session.run(feeds);
      const outName = session.outputNames[0];
      const audioTensor = results[outName] ?? results.output;
      if (!audioTensor) {
        postMessage({ type: "error", id, error: "No audio output tensor" });
        return;
      }

      const floatData = tensorToFloat32Flat(audioTensor);
      const buf = floatData.buffer.slice(floatData.byteOffset, floatData.byteOffset + floatData.byteLength);

      postMessage(
        {
          type: "audio",
          id,
          pcm: buf,
          sampleRate: outputSampleRate,
          numSamples: floatData.length,
        },
        [buf],
      );
    } catch (err) {
      postMessage({ type: "error", id, error: String(err?.message || err) });
    }
  }
};
