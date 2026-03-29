import { cp, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();

async function copyDirFiles(srcDir, dstDir, filter) {
  await mkdir(dstDir, { recursive: true });
  const names = await readdir(srcDir);
  for (const name of names) {
    if (filter && !filter(name)) continue;
    await cp(join(srcDir, name), join(dstDir, name));
  }
}

/**
 * ONNX Runtime Web loads ort-wasm-simd-threaded*.mjs + matching .wasm from wasmPaths.
 * Copying only *.wasm missed the .mjs loaders → 404s and Piper init failures.
 */
function shouldCopyOnnxRuntimeFile(name) {
  if (!name.startsWith("ort-wasm")) return false;
  return (
    name.endsWith(".wasm") ||
    name.endsWith(".mjs") ||
    (name.endsWith(".js") && !name.endsWith(".map"))
  );
}

await copyDirFiles(
  join(root, "node_modules/onnxruntime-web/dist"),
  join(root, "public/onnx-wasm"),
  shouldCopyOnnxRuntimeFile,
);

await copyDirFiles(
  join(root, "node_modules/espeak-ng/dist"),
  join(root, "public/espeak-ng"),
);

console.log(
  "[copy-tts-assets] Copied onnxruntime-web ort-wasm* (.wasm + .mjs/.js) → public/onnx-wasm",
);
console.log("[copy-tts-assets] Copied espeak-ng → public/espeak-ng");
