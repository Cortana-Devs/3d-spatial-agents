/**
 * Global type augmentations:
 * - Performance.memory (Chromium-specific) to avoid `(performance as any).memory` casts
 * - Window.__animationAPI set by IsolatedAnimationManager for dev tooling
 */

import type { Object3D, AnimationClip } from "three";

declare global {
  /**
   * Non-standard Performance memory API
   * Supported by Chromium-based browsers. Optional in our types.
   */
  interface PerformanceMemory {
    jsHeapSizeLimit: number;
    totalJSHeapSize: number;
    usedJSHeapSize: number;
  }

  interface Performance {
    /**
     * Chromium-only memory stats. Optional to safely access with `?.`.
     */
    memory?: PerformanceMemory;
  }

  /**
   * Minimal render metrics shape exposed by the isolated animation renderer
   */
  interface GlobalRenderMetrics {
    frameTime: number;
    fps: number;
    isThrottled: boolean;
  }

  /**
   * Minimal animation metrics shape exposed by the isolated animation manager
   */
  interface GlobalAnimationMetrics {
    activeMixers: number;
    totalActions: number;
    averageFrameTime: number;
    blendTransitions: number;
    memoryUsage: number;
  }

  /**
   * Dev-only animation API exposed to the window by IsolatedAnimationManager
   * This enables quick manual inspection and debugging from the console.
   */
  interface AnimationAPI {
    registerAnimation: (
      simulantId: string,
      object: Object3D,
      animationClips: AnimationClip[],
      priority?: number,
    ) => void;
    playAnimation: (
      simulantId: string,
      animationName: string,
      loop?: boolean,
      fadeTime?: number,
    ) => void;
    stopAnimation: (simulantId: string, fadeTime?: number) => void;
    unregisterAnimation: (simulantId: string) => void;
    getMetrics: () => GlobalAnimationMetrics;
    getRenderMetrics: () => GlobalRenderMetrics;
  }

  interface Window {
    /**
     * Set in development by IsolatedAnimationManager for debugging.
     */
    __animationAPI?: AnimationAPI;
  }

  /**
   * Network Information API (optional browser support)
   */
  interface NetworkInformation {
    effectiveType: "slow-2g" | "2g" | "3g" | "4g" | string;
    downlink: number;
    rtt: number;
    saveData: boolean;
  }

  /**
   * Battery Status API (optional, deprecated in some browsers)
   * Minimal surface used by the app to avoid any casts.
   */
  interface BatteryManager {
    charging: boolean;
    level: number;
    chargingTime?: number;
    dischargingTime?: number;
    addEventListener(
      type:
        | "levelchange"
        | "chargingchange"
        | "chargingtimechange"
        | "dischargingtimechange",
      listener: (this: BatteryManager, ev: Event) => void,
      options?: boolean | AddEventListenerOptions,
    ): void;
    removeEventListener(
      type:
        | "levelchange"
        | "chargingchange"
        | "chargingtimechange"
        | "dischargingtimechange",
      listener: (this: BatteryManager, ev: Event) => void,
      options?: boolean | EventListenerOptions,
    ): void;
    onlevelchange?: ((this: BatteryManager, ev: Event) => void) | null;
    onchargingchange?: ((this: BatteryManager, ev: Event) => void) | null;
    onchargingtimechange?: ((this: BatteryManager, ev: Event) => void) | null;
    ondischargingtimechange?:
      | ((this: BatteryManager, ev: Event) => void)
      | null;
  }

  interface Navigator {
    /**
     * Approximate amount of device memory in gigabytes.
     * Present in some browsers (e.g., Chrome).
     */
    deviceMemory?: number;

    /**
     * Network information about the current connection.
     * Present in some browsers (e.g., Chrome).
     */
    connection?: NetworkInformation;

    /**
     * Battery information accessor. Present in some browsers (e.g., Chrome).
     */
    getBattery?: () => Promise<BatteryManager>;
  }
}

export {};
