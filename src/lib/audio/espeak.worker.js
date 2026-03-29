/// <reference lib="webworker" />
/**
 * Offloads eSpeak-ng (Emscripten) phonemization off the main thread so Piper
 * TTS prep does not block the R3F render loop.
 */
self.onmessage = async (e) => {
  const { type, id, text, espeakVoice, assetBaseUrl } = e.data || {};
  if (type !== "phonemize" || id == null) return;

  const reply = (payload) => self.postMessage({ ...payload, id });

  try {
    const base = String(assetBaseUrl || "").replace(/\/$/, "");
    const modUrl = `${base}/espeak-ng/espeak-ng.js`;
    const mod = await import(/* webpackIgnore: true */ modUrl);
    const ESpeakNg = mod.default;

    const safe = String(text || "")
      .replace(/\r/g, " ")
      .replace(/\n/g, " ")
      .trim();
    if (!safe) {
      reply({ type: "phoneme_raw", raw: "" });
      return;
    }

    const escaped = safe.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

    const instance = await ESpeakNg({
      locateFile: (path) => `${base}/espeak-ng/${path}`,
      arguments: [
        "--phonout",
        "generated",
        '--sep=""',
        "-q",
        "-b=1",
        "--ipa=3",
        "-v",
        espeakVoice,
        `"${escaped}"`,
      ],
    });

    const raw = instance.FS.readFile("generated", { encoding: "utf8" }).trim();
    reply({ type: "phoneme_raw", raw });
  } catch (err) {
    reply({
      type: "error",
      error: String(err?.message || err),
    });
  }
};
