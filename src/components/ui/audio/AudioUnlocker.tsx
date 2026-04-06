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
    const events = [
      "click",
      "mousedown",
      "keydown",
      "touchstart",
      "pointerdown",
    ];

    // 1. Trap AudioContext creation
    const OriginalAudioContext =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!OriginalAudioContext) return;

    // Use a proxy to intercept constructors
    (window as any).AudioContext = new Proxy(OriginalAudioContext, {
      construct(target, args) {
        const ctx = new target(...args);
        contexts.push(ctx);
        return ctx;
      },
    });

    // 2. Resume all on interaction
    async function resumeAll() {
      for (const ctx of contexts) {
        if (ctx.state !== "running") {
          try {
            await ctx.resume();
          } catch (e) {
            // Silently fail, user might need another interaction
          }
        }
      }

      // Clean up listeners once everything is running
      if (contexts.every((c) => c.state === "running")) {
        events.forEach((e) => document.removeEventListener(e, resumeAll));
      }
    }

    events.forEach((e) => document.addEventListener(e, resumeAll));

    return () => {
      events.forEach((e) => document.removeEventListener(e, resumeAll));
    };
  }, []);

  return null;
}
