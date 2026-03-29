import type { StateCreator } from "zustand";
import type { GameState, SettingsSlice } from "./gameStoreTypes";

export const createSettingsSlice: StateCreator<
  GameState,
  [],
  [],
  SettingsSlice
> = (set) => ({
  invertedMouse: false,
  setInvertedMouse: (inverted) => set({ invertedMouse: inverted }),
  sensitivity: 1.0,
  setSensitivity: (sensitivity) => set({ sensitivity }),
  volume: 0.5,
  setVolume: (volume) => set({ volume }),
  audioDistanceModel: "exponential",
  setAudioDistanceModel: (model) => set({ audioDistanceModel: model }),
  audioRefDistance: 5,
  setAudioRefDistance: (dist) => set({ audioRefDistance: dist }),
  audioMaxDistance: 50,
  setAudioMaxDistance: (dist) => set({ audioMaxDistance: dist }),
  audioRolloffFactor: 1,
  setAudioRolloffFactor: (factor) => set({ audioRolloffFactor: factor }),
  audioVoice: "nova",
  setAudioVoice: (voice) => set({ audioVoice: voice }),

  keyBindings: {
    forward: "KeyW",
    backward: "KeyS",
    left: "KeyA",
    right: "KeyD",
    jump: "Space",
    sprint: "ShiftLeft",
    interact: "KeyE",
    pickUp: "KeyP",
    placeItem: "KeyT",
    menu: "Escape",
    taskPanel: "KeyM",
    commandBar: "Slash",
    debugMode: "Backquote",
    agentComms: "KeyJ",
  },
  setKeyBinding: (action, key) =>
    set((state) => ({
      keyBindings: { ...state.keyBindings, [action]: key },
    })),
});
