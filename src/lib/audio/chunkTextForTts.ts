const MAX_CHUNK_CHARS = 800;

/**
 * Split for Piper sentence-by-sentence synthesis. Keeps closing punctuation on the chunk.
 */
export function chunkTextForTts(text: string): string[] {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return [];

  const parts: string[] = [];
  let buf = "";
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    buf += c;
    if (c === "." || c === "!" || c === "?") {
      const s = buf.trim();
      if (s) parts.push(s);
      buf = "";
    } else if (buf.length >= MAX_CHUNK_CHARS) {
      const s = buf.trim();
      if (s) parts.push(s);
      buf = "";
    }
  }
  const tail = buf.trim();
  if (tail) parts.push(tail);
  return parts;
}
