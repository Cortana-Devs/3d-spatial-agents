import type { StateCreator } from "zustand";
import type { ChatSlice, GameState } from "./gameStoreTypes";

export const createChatSlice: StateCreator<
  GameState,
  [],
  [],
  ChatSlice
> = (set) => ({
  nearbyAgentId: null,
  setNearbyAgentId: (id) => set({ nearbyAgentId: id }),
  chatPromptVisible: false,
  setChatPromptVisible: (visible) => set({ chatPromptVisible: visible }),

  isChatOpen: false,
  setChatOpen: (isOpen) => set({ isChatOpen: isOpen }),
  chatAgentId: null,
  setChatAgentId: (id) => set({ chatAgentId: id }),
  chatMessages: {},
  addChatMessage: (agentId, msg) =>
    set((state) => ({
      chatMessages: {
        ...state.chatMessages,
        [agentId]: [...(state.chatMessages[agentId] || []), msg],
      },
    })),
  clearChatMessages: (agentId) =>
    set((state) => ({
      chatMessages: { ...state.chatMessages, [agentId]: [] },
    })),

  commonAgentMessages: [],
  addCommonAgentMessage: (agentId, msg) =>
    set((state) => ({
      commonAgentMessages: [
        ...state.commonAgentMessages,
        { agentId, role: msg.role, text: msg.text },
      ],
    })),
  isCommonChatOpen: false,
  setCommonChatOpen: (open) => set({ isCommonChatOpen: open }),
});
