"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  DEFAULT_VOICE_SETTINGS,
  type VoiceBackend,
  type VoiceSettings,
} from "./voiceTypes";

interface VoiceContextValue {
  settings: VoiceSettings;
  setBackend: (b: VoiceBackend) => void;
  setSettings: (partial: Partial<VoiceSettings>) => void;
}

const VoiceContext = createContext<VoiceContextValue | null>(null);

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettingsState] = useState<VoiceSettings>(
    DEFAULT_VOICE_SETTINGS,
  );

  const setBackend = useCallback((b: VoiceBackend) => {
    setSettingsState((s) => ({ ...s, backend: b }));
  }, []);

  const setSettings = useCallback((partial: Partial<VoiceSettings>) => {
    setSettingsState((s) => ({ ...s, ...partial }));
  }, []);

  const value = useMemo(
    () => ({ settings, setBackend, setSettings }),
    [settings, setBackend, setSettings],
  );

  return (
    <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>
  );
}

export function useVoiceSettings(): VoiceSettings {
  const ctx = useContext(VoiceContext);
  return ctx?.settings ?? DEFAULT_VOICE_SETTINGS;
}

export function useVoiceActions() {
  const ctx = useContext(VoiceContext);
  if (!ctx) {
    return {
      setBackend: () => {},
      setSettings: () => {},
    };
  }
  return { setBackend: ctx.setBackend, setSettings: ctx.setSettings };
}
