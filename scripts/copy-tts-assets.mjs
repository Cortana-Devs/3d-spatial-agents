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

await copyDirFiles(
  join(root, "node_modules/onnxruntime-web/dist"),
  join(root, "public/onnx-wasm"),
  (n) => n.endsWith(".wasm"),
);

await copyDirFiles(
  join(root, "node_modules/espeak-ng/dist"),
  join(root, "public/espeak-ng"),
);

console.log("[copy-tts-assets] Copied onnxruntime-web wasm → public/onnx-wasm");
console.log("[copy-tts-assets] Copied espeak-ng → public/espeak-ng");
