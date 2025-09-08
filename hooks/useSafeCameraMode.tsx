"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useWorldStore } from "../store/worldStore";
import { CameraMode } from "../types";
import { devWarn } from "@/utils/devLogger";

interface SafeCameraModeConfig {
  minModeChangeDelay: number; // Minimum time between mode changes (ms)
  enableDoubleClickFocus: boolean; // Allow double-click to focus
  enableKeyboardShortcuts: boolean; // Allow keyboard shortcuts
  preventUnintentionalSwitches: boolean; // Extra protection
}

const DEFAULT_CONFIG: SafeCameraModeConfig = {
  minModeChangeDelay: 500,
  enableDoubleClickFocus: true,
  enableKeyboardShortcuts: true,
  preventUnintentionalSwitches: true,
};

export function useSafeCameraMode(config: Partial<SafeCameraModeConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const { activeCamera, setCameraMode } = useWorldStore();

  // Track mode change timing to prevent rapid switches
  const lastModeChange = useRef<number>(0);
  const pendingModeChange = useRef<NodeJS.Timeout | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Track user interaction to distinguish intentional vs accidental switches
  const userInteractionContext = useRef<{
    lastKeyPress: number;
    lastClick: number;
    lastDoubleClick: number;
    intentionalModeChange: boolean;
  }>({
    lastKeyPress: 0,
    lastClick: 0,
    lastDoubleClick: 0,
    intentionalModeChange: false,
  });

  // Safe mode change function with protection mechanisms
  const changeCameraMode = useCallback(
    (
      newMode: CameraMode,
      force: boolean = false,
      reason: "user" | "keyboard" | "doubleclick" | "api" = "api",
    ) => {
      const now = Date.now();
      const timeSinceLastChange = now - lastModeChange.current;

      // Skip if same mode
      if (newMode === activeCamera && !force) {
        return false;
      }

      // Check minimum delay between changes (unless forced)
      if (!force && timeSinceLastChange < finalConfig.minModeChangeDelay) {
        devWarn(
          `Camera mode change rejected: too soon after last change (${timeSinceLastChange}ms < ${finalConfig.minModeChangeDelay}ms)`,
        );
        return false;
      }

      // Extra protection against unintentional switches
      if (finalConfig.preventUnintentionalSwitches && !force) {
        // Block cinematic mode if not explicitly triggered by user
        if (
          newMode === "cinematic" &&
          reason !== "user" &&
          reason !== "keyboard"
        ) {
          devWarn(
            "Cinematic mode change blocked: not triggered by explicit user action",
          );
          return false;
        }

        // Block rapid mode cycling
        if (timeSinceLastChange < 1000 && reason === "doubleclick") {
          devWarn("Double-click camera mode change blocked: too rapid");
          return false;
        }
      }

      // Mark as transitioning to prevent interruptions
      setIsTransitioning(true);

      // Clear any pending mode changes
      if (pendingModeChange.current) {
        clearTimeout(pendingModeChange.current);
      }

      // Record the interaction context
      userInteractionContext.current.intentionalModeChange =
        reason === "user" || reason === "keyboard";
      lastModeChange.current = now;

      // Perform the mode change
      setCameraMode(newMode);

      void import("@/utils/devLogger").then(({ devLog }) =>
        devLog(
          `Camera mode changed: ${activeCamera} → ${newMode} (reason: ${reason})`,
        ),
      );

      // Clear transitioning state after a delay
      pendingModeChange.current = setTimeout(() => {
        setIsTransitioning(false);
        pendingModeChange.current = null;
      }, finalConfig.minModeChangeDelay);

      return true;
    },
    [activeCamera, setCameraMode, finalConfig],
  );

  // Cycle through camera modes (keyboard shortcut)
  const cycleCameraMode = useCallback(() => {
    if (isTransitioning) return false;

    const modes: CameraMode[] = [
      "orbit",
      "fly",
      "cinematic",
      "follow-simulant",
    ];
    const currentIndex = modes.indexOf(activeCamera as CameraMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    const nextMode = modes[nextIndex];

    // Skip follow-simulant if no active simulants
    // This would need to be implemented based on your simulant system
    // For now, we'll just proceed with the next mode

    return changeCameraMode(nextMode, false, "keyboard");
  }, [activeCamera, changeCameraMode, isTransitioning]);

  // Handle double-click focus (safer version)
  const handleDoubleClickFocus = useCallback(
    (event: MouseEvent) => {
      if (!finalConfig.enableDoubleClickFocus) return false;
      if (activeCamera !== "orbit") return false; // Only allow in orbit mode
      if (isTransitioning) return false;

      const now = Date.now();
      userInteractionContext.current.lastDoubleClick = now;

      // Don't switch modes on double-click, just focus
      // The actual focusing should be handled by the camera controller

      return true;
    },
    [finalConfig.enableDoubleClickFocus, activeCamera, isTransitioning],
  );

  // Keyboard shortcut handler
  useEffect(() => {
    if (!finalConfig.enableKeyboardShortcuts) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const now = Date.now();
      userInteractionContext.current.lastKeyPress = now;

      // Ctrl/Cmd + C to cycle camera modes
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "c") {
        event.preventDefault();
        cycleCameraMode();
        return;
      }

      // Number keys for direct mode selection
      if (
        event.key >= "1" &&
        event.key <= "4" &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        const modeMap: { [key: string]: CameraMode } = {
          "1": "orbit",
          "2": "fly",
          "3": "cinematic",
          "4": "follow-simulant",
        };
        const targetMode = modeMap[event.key];
        if (targetMode) {
          changeCameraMode(targetMode, false, "keyboard");
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [finalConfig.enableKeyboardShortcuts, cycleCameraMode, changeCameraMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pendingModeChange.current) {
        clearTimeout(pendingModeChange.current);
      }
    };
  }, []);

  // Debug information
  const getDebugInfo = useCallback(() => {
    const now = Date.now();
    return {
      currentMode: activeCamera,
      isTransitioning,
      timeSinceLastChange: now - lastModeChange.current,
      canChangeMode:
        !isTransitioning &&
        now - lastModeChange.current >= finalConfig.minModeChangeDelay,
      userInteractionContext: userInteractionContext.current,
      config: finalConfig,
    };
  }, [activeCamera, isTransitioning, finalConfig]);

  return {
    // Current state
    currentMode: activeCamera as CameraMode,
    isTransitioning,

    // Safe mode change functions
    changeCameraMode,
    cycleCameraMode,

    // Event handlers
    handleDoubleClickFocus,

    // Utilities
    canChangeMode: !isTransitioning,
    getDebugInfo,

    // Configuration
    config: finalConfig,
  };
}

export default useSafeCameraMode;
