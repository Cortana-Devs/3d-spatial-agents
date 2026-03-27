/** Which tier to try first when multiple are healthy. */
export type VoiceBackend = "google" | "local";

export interface VoiceSettings {
  backend: VoiceBackend;
  piperVoiceId?: string;
  /** Google TTS voice name (Gemini API). */
  googleVoiceName?: string;
  /** Opt out of browser Web Speech API emergency fallback. */
  disableWebSpeech?: boolean;
}

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  /** "google" = try Gemini first; Piper warms in the background and enters
   *  the chain once ready. Provides immediate high-quality speech on first use. */
  backend: "google",
  piperVoiceId: "en_US-lessac-medium",
  googleVoiceName: "Leda",
};

/** Seconds relative to the start of a played AudioBuffer. */
export interface PhonemeTiming {
  index: number;
  t0: number;
  t1: number;
  id: number;
}
