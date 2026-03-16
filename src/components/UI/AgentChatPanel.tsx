"use client";

import React, { useState, useRef, useEffect } from "react";
import { useGameStore } from "@/store/gameStore";
import { chatWithAgent } from "@/app/actions";
import { buildWorldContext } from "@/lib/nlp-parser";
import { AgentTaskRegistry } from "@/components/Systems/AgentTaskQueue";
import { InteractableRegistry } from "@/components/Systems/InteractableRegistry";
import { findAlternativeArea } from "@/lib/nlp-parser";
import { getMeetingRoomPosition } from "@/config/agentRoutines";
import * as THREE from "three";
import { memoryStream } from "@/lib/memory/MemoryStream";
import styles from "./AgentChatPanel.module.css";

const EMPTY_ARRAY: { role: "user" | "agent"; text: string }[] = [];

export const AgentChatPanel: React.FC = () => {
  const isChatOpen = useGameStore((state) => state.isChatOpen);
  const chatAgentId = useGameStore((state) => state.chatAgentId);
  const chatMessages = useGameStore((state) =>
    chatAgentId ? state.chatMessages[chatAgentId] || EMPTY_ARRAY : EMPTY_ARRAY,
  );
  const addChatMessage = useGameStore((state) => state.addChatMessage);
  const addCommonAgentMessage = useGameStore(
    (state) => state.addCommonAgentMessage,
  );
  const setChatOpen = useGameStore((state) => state.setChatOpen);
  const setCommonChatOpen = useGameStore((state) => state.setCommonChatOpen);
  const setChatAgentId = useGameStore((state) => state.setChatAgentId);
  const clearChatMessages = useGameStore((state) => state.clearChatMessages);
  const setNearbyAgentId = useGameStore((state) => state.setNearbyAgentId);
  const setChatPromptVisible = useGameStore(
    (state) => state.setChatPromptVisible,
  );

  const [inputValue, setInputValue] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isThinking]);

  // Focus input when chat opens
  useEffect(() => {
    if (isChatOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isChatOpen]);

  // Listen for task success/failure events from AgentTaskQueue
  useEffect(() => {
    const handleSuccess = (e: any) => {
      const { agentId, message } = e.detail;
      if (agentId === chatAgentId) {
        addChatMessage(agentId, { role: "agent", text: message });
      }
    };
    const handleFailure = (e: any) => {
      const { agentId, message } = e.detail;
      if (agentId === chatAgentId) {
        addChatMessage(agentId, { role: "agent", text: `⚠️ ${message}` });
      }
    };
    window.addEventListener("agent-task-success", handleSuccess);
    window.addEventListener("agent-task-failed", handleFailure);
    return () => {
      window.removeEventListener("agent-task-success", handleSuccess);
      window.removeEventListener("agent-task-failed", handleFailure);
    };
  }, [chatAgentId, addChatMessage]);

  const handleClose = () => {
    setChatOpen(false);
    setChatAgentId(null);
    // DO NOT CLEAR MESSAGES ON CLOSE to retain history.
    // clearChatMessages(chatAgentId);
    setNearbyAgentId(null);
    setChatPromptVisible(false);
  };

  // Handle Escape key to close
  useEffect(() => {
    if (!isChatOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isChatOpen]);

  // Process tasks returned from the LLM and inject into agent's task queue
  const processTasks = (
    agentId: string,
    tasks: {
      type: string;
      itemId?: string;
      destAreaId?: string;
      targetX?: number;
      targetZ?: number;
    }[],
  ) => {
    const registry = InteractableRegistry.getInstance();
    const queue = AgentTaskRegistry.getInstance().getOrCreate(agentId);

    // Track slots claimed in this run to avoid mapping two items to the same slot
    const locallyClaimedSlots = new Set<string>();

    for (const task of tasks) {
      switch (task.type) {
        case "ANNOUNCE_MEETING": {
          const taskRegistry = AgentTaskRegistry.getInstance();
          const allAgentIds = taskRegistry.getAllAgentIds();
          const meetingMessage =
            "Meeting in the meeting room. Heading there now.";
          for (const otherId of allAgentIds) {
            if (otherId !== agentId) {
              addChatMessage(otherId, {
                role: "agent",
                text: meetingMessage,
              });
              addCommonAgentMessage(otherId, {
                role: "agent",
                text: meetingMessage,
              });
              // So the other agent shows the message in their thought bubble
              window.dispatchEvent(
                new CustomEvent("agent-meeting-announcement", {
                  detail: { agentId: otherId, message: meetingMessage },
                }),
              );
            }
          }
          setCommonChatOpen(true);
          const meetingPos = getMeetingRoomPosition();
          if (!meetingPos) {
            console.warn(
              "[AgentChat] ANNOUNCE_MEETING: conference room position not available, skipping.",
            );
            break;
          }
          const scriptId = `meeting_${Date.now()}`;
          for (const id of allAgentIds) {
            taskRegistry.getOrCreate(id).enqueue({
              type: "GO_TO",
              priority: 20,
              scriptId,
              targetPos: meetingPos.clone(),
            });
          }
          console.log(
            `[AgentChat] ANNOUNCE_MEETING: informed ${allAgentIds.length} agent(s), enqueued GO_TO conference room.`,
          );
          break;
        }

        case "FETCH_AND_PLACE": {
          if (!task.itemId || !task.destAreaId) break;

          // Validate item exists
          let cleanedItemId = String(task.itemId)
            .replace(/\s*\([A-Z]\)$/i, "")
            .trim();
          let item = registry.getById(cleanedItemId);
          if (!item) item = registry.getByName(cleanedItemId);

          if (!item) {
            console.warn(
              `[AgentChat] Item "${task.itemId}" not found, skipping`,
            );
            useGameStore.getState().addChatMessage(agentId, {
              role: "agent",
              text: `I'm sorry, I couldn't find an item called "${task.itemId}".`,
            });
            break;
          }

          if (!item.pickable) {
            console.warn(
              `[AgentChat] Item "${task.itemId}" is not pickable, skipping`,
            );
            useGameStore.getState().addChatMessage(agentId, {
              role: "agent",
              text: `I'm sorry, I cannot pick up ${item.name || task.itemId}. It is too heavy or attached to the floor.`,
            });
            break;
          }
          cleanedItemId = item.id; // use correct ID

          // Validate area exists and resolve alternatives
          let cleanedAreaId = String(task.destAreaId)
            .replace(/\s*\([A-Z]\)$/i, "")
            .trim();
          let area = registry.getPlacingAreaById(cleanedAreaId);
          // Try empty group slot BEFORE name match so group names like
          // "lab-desk-h" resolve to an empty slot right away
          if (!area) area = registry.getEmptyAreaByGroup(cleanedAreaId);
          if (!area) area = registry.getAreaByName(cleanedAreaId);

          if (!area) {
            console.warn(
              `[AgentChat] Area "${task.destAreaId}" not found, skipping`,
            );
            useGameStore.getState().addChatMessage(agentId, {
              role: "agent",
              text: `I'm sorry, I don't see a destination called "${task.destAreaId}".`,
            });
            break;
          }

          let resolvedAreaId = area.id;
          let isOccupied = false;

          if (area.currentItem) {
            // Staleness check: verify the item actually still exists/occupies the slot
            const occupant = registry.getById(area.currentItem);
            if (!occupant || occupant.placedInArea !== area.id) {
              // Stale reference — the item was moved, clear the slot
              area.currentItem = null;
            } else {
              isOccupied = true;
            }
          }

          if (locallyClaimedSlots.has(resolvedAreaId)) {
            isOccupied = true;
          }

          if (isOccupied) {
            const alt = findAlternativeArea(
              resolvedAreaId,
              registry,
              locallyClaimedSlots,
            );
            if (alt) resolvedAreaId = alt;
            else {
              console.warn(
                `[AgentChat] All slots occupied for ${resolvedAreaId}`,
              );
              useGameStore.getState().addChatMessage(agentId, {
                role: "agent",
                text: `I'm sorry, there is no empty space left at "${task.destAreaId}".`,
              });
              break;
            }
          }

          locallyClaimedSlots.add(resolvedAreaId);

          // AgentTaskQueue will claim the item when the task actually starts

          queue.enqueue({
            type: "FETCH_AND_PLACE",
            priority: 20,
            scriptId: `chat_${Date.now()}`,
            itemId: cleanedItemId,
            destAreaId: resolvedAreaId,
          });

          console.log(
            `[AgentChat] Dispatched FETCH_AND_PLACE: ${cleanedItemId} → ${resolvedAreaId}`,
          );
          break;
        }

        case "FOLLOW_PLAYER": {
          queue.enqueue({ type: "FOLLOW_PLAYER", priority: 20 });
          console.log(`[AgentChat] Dispatched FOLLOW_PLAYER`);
          break;
        }

        case "GO_TO": {
          if (task.targetX !== undefined && task.targetZ !== undefined) {
            queue.enqueue({
              type: "GO_TO",
              priority: 20,
              targetPos: new THREE.Vector3(task.targetX, 0, task.targetZ),
            });
            console.log(
              `[AgentChat] Dispatched GO_TO: (${task.targetX}, ${task.targetZ})`,
            );
          }
          break;
        }

        case "PICK_NEARBY": {
          if (task.itemId) {
            let cleanedItemId = String(task.itemId)
              .replace(/\s*\([A-Z]\)$/i, "")
              .trim();
            let item = registry.getById(cleanedItemId);
            if (!item) item = registry.getByName(cleanedItemId);

            if (item) {
              queue.enqueue({
                type: "PICK_NEARBY",
                priority: 20,
                itemId: item.id,
              });
              console.log(`[AgentChat] Dispatched PICK_NEARBY: ${item.id}`);
            } else {
              console.warn(
                `[AgentChat] Item "${task.itemId}" not found for PICK_NEARBY, skipping`,
              );
              useGameStore.getState().addChatMessage(agentId, {
                role: "agent",
                text: `I'm sorry, I couldn't find an item called "${task.itemId}".`,
              });
            }
          }
          break;
        }

        case "READ_FILE": {
          if (task.itemId) {
            let cleanedItemId = String(task.itemId)
              .replace(/\s*\([A-Z]\)$/i, "")
              .trim();
            let item =
              registry.getById(cleanedItemId) ||
              registry.getByName(cleanedItemId);

            if (item) {
              queue.enqueue({
                type: "READ_FILE",
                priority: 20,
                itemId: item.id,
              });
              console.log(`[AgentChat] Dispatched READ_FILE: ${item.id}`);
            } else {
              console.warn(
                `[AgentChat] Item "${task.itemId}" not found for READ_FILE, skipping`,
              );
              useGameStore.getState().addChatMessage(agentId, {
                role: "agent",
                text: `I'm sorry, I couldn't find a file called "${task.itemId}".`,
              });
            }
          }
          break;
        }

        case "WRITE_FILE": {
          // @ts-ignore
          if (task.itemId && task.content) {
            let cleanedItemId = String(task.itemId)
              .replace(/\s*\([A-Z]\)$/i, "")
              .trim();
            let item =
              registry.getById(cleanedItemId) ||
              registry.getByName(cleanedItemId);

            if (item) {
              queue.enqueue({
                type: "WRITE_FILE",
                priority: 20,
                itemId: item.id,
                // @ts-ignore
                content: task.content,
              });
              console.log(`[AgentChat] Dispatched WRITE_FILE: ${item.id}`);
            } else {
              console.warn(
                `[AgentChat] Item "${task.itemId}" not found for WRITE_FILE, skipping`,
              );
              useGameStore.getState().addChatMessage(agentId, {
                role: "agent",
                text: `I'm sorry, I couldn't find a file called "${task.itemId}".`,
              });
            }
          }
          break;
        }

        case "COPY_FILE": {
          // @ts-ignore
          if (task.itemId && task.sourceItemId) {
            let cleanedItemId = String(task.itemId)
              .replace(/\s*\([A-Z]\)$/i, "")
              .trim();
            // @ts-ignore
            let cleanedSourceItemId = String(task.sourceItemId)
              .replace(/\s*\([A-Z]\)$/i, "")
              .trim();

            let item =
              registry.getById(cleanedItemId) ||
              registry.getByName(cleanedItemId);
            let sourceItem =
              registry.getById(cleanedSourceItemId) ||
              registry.getByName(cleanedSourceItemId);

            if (item && sourceItem) {
              queue.enqueue({
                type: "COPY_FILE",
                priority: 20,
                itemId: item.id,
                sourceItemId: sourceItem.id,
              });
              console.log(
                `[AgentChat] Dispatched COPY_FILE: ${sourceItem.id} -> ${item.id}`,
              );
            } else {
              console.warn(
                `[AgentChat] Items not found for COPY_FILE, skipping`,
              );
              useGameStore.getState().addChatMessage(agentId, {
                role: "agent",
                text: `I'm sorry, I couldn't find one of the files you asked to copy.`,
              });
            }
          }
          break;
        }

        default:
          console.warn(`[AgentChat] Unknown task type: ${task.type}`);
      }
    }
  };

  // Send message
  const handleSend = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isThinking || !chatAgentId) return;

    // Add user message to per-agent chat and common communication log
    addChatMessage(chatAgentId, { role: "user", text: trimmed });
    addCommonAgentMessage(chatAgentId, { role: "user", text: trimmed });
    setInputValue("");
    setIsThinking(true);

    try {
      // Build world context restricted to the agent's spatial awareness
      const agentPos = useGameStore.getState().agentPositions[chatAgentId];
      // Guard: if position is unknown, build context without spatial filter
      const ctx = agentPos
        ? buildWorldContext(agentPos, 150)
        : buildWorldContext();

      const recentMemories = await memoryStream.retrieve({ limit: 20 });
      const memoryContextStr =
        recentMemories.length > 0
          ? `\n\nRECENT MEMORIES:\n${recentMemories.map((m) => `- [${m.type}] ${m.content}`).join("\n")}`
          : "";

      const worldContextStr = `ITEMS:\n${ctx.items}\n\nPLACING AREAS:\n${ctx.areas}\n\nAGENTS:\n${ctx.agents}\n\nLocations: Meeting room = conference area.${memoryContextStr}`;

      const currentMessages =
        useGameStore.getState().chatMessages[chatAgentId] || [];
      const response = await chatWithAgent(
        chatAgentId,
        trimmed,
        currentMessages,
        worldContextStr,
      );

      // Add agent's reply to chat and to common agent communication
      addChatMessage(chatAgentId, { role: "agent", text: response.reply });
      addCommonAgentMessage(chatAgentId, {
        role: "agent",
        text: response.reply,
      });

      // If the LLM returned tasks, inject them into the agent's queue
      if (response.tasks && response.tasks.length > 0) {
        console.log(
          `[AgentChat] LLM returned ${response.tasks.length} task(s):`,
          response.tasks,
        );
        processTasks(chatAgentId, response.tasks);
      }
    } catch (err) {
      const errMsg = "Sorry, I'm having trouble responding right now.";
      addChatMessage(chatAgentId, { role: "agent", text: errMsg });
      addCommonAgentMessage(chatAgentId, { role: "agent", text: errMsg });
    } finally {
      setIsThinking(false);
    }
  };

  if (!isChatOpen || !chatAgentId) return null;

  return (
    <div
      className={styles.chatOverlay}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className={styles.chatHeader}>
        <div className={styles.chatAgentInfo}>
          <div className={styles.chatAgentAvatar}>🤖</div>
          <div className={styles.chatAgentName}>
            <strong>{chatAgentId}</strong>
            <span>Research Lab Assistant</span>
          </div>
        </div>
        <button className={styles.chatCloseBtn} onClick={handleClose}>
          ESC <span style={{ opacity: 0.6 }}>Close</span>
        </button>
      </div>

      {/* Messages */}
      <div className={styles.chatMessages}>
        {chatMessages.map((msg, idx) => (
          <div
            key={idx}
            className={`${styles.messageBubble} ${
              msg.role === "user" ? styles.messageUser : styles.messageAgent
            }`}
          >
            {msg.text}
          </div>
        ))}
        {isThinking && (
          <div
            className={`${styles.messageBubble} ${styles.messageAgent} ${styles.messageThinking}`}
          >
            <div className={styles.thinkingDots}>
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className={styles.chatInputArea}>
        <div className={styles.chatInputWrapper}>
          <input
            ref={inputRef}
            className={styles.chatInput}
            type="text"
            placeholder="Type a message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={isThinking}
          />
          <button
            className={styles.chatSendBtn}
            onClick={handleSend}
            disabled={isThinking || !inputValue.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};
