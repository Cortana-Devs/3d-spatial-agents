"use client";
import { useEffect } from "react";

/**
 * AudioUnlocker: Global Chrome Autoplay Bypass
 * 1. Proxies window.AudioContext to track every instance created (even by Three.js).
 * 2. Resumes all tracked instances on the first user interaction (click, keydown, etc).
 */
export function AudioUnlocker() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const contexts: AudioContext[] = [];
    const events = ["click", "mousedown", "keydown", "touchstart", "pointerdown"];

    // 1. Trap AudioContext creation
    const OriginalAudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!OriginalAudioContext) return;

    // Use a proxy to intercept constructors
    (window as any).AudioContext = new Proxy(OriginalAudioContext, {
      construct(target, args) {
        const ctx = new target(...args);
        contexts.push(ctx);
        console.log("[AudioUnlocker] Tracked new AudioContext instance.", ctx);
        return ctx;
      },
    });

    // 2. Resume all on interaction
    async function resumeAll() {
      console.log("[AudioUnlocker] Interaction detected. Resuming all contexts...");
      for (const ctx of contexts) {
        if (ctx.state !== "running") {
          try {
            await ctx.resume();
            console.log("[AudioUnlocker] Context resumed:", ctx);
          } catch (e) {
            console.warn("[AudioUnlocker] Resume failed:", e);
          }
        }
      }
      
      // Clean up listeners once everything is running
      if (contexts.every(c => c.state === "running")) {
        console.log("[AudioUnlocker] All contexts running. Cleaning up listeners.");
        events.forEach(e => document.removeEventListener(e, resumeAll));
      }
    }

    events.forEach(e => document.addEventListener(e, resumeAll));
    
    // Add Puter script support - if Puter.js is loaded later, it might create its own context
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === "childList") {
                // Potential for Puter logic here if needed
            }
        });
    });
    observer.observe(document.head, { childList: true });

    return () => {
      events.forEach(e => document.removeEventListener(e, resumeAll));
      observer.disconnect();
    };
  }, []);

  return null;
}
