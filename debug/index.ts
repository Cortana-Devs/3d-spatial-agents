/**
 * Debug Components Index
 *
 * This module exports all debug components and utilities for the Descendants metaverse.
 * These components are only available in development mode and provide tools for
 * debugging Y-level positioning, performance monitoring, and system validation.
 */

import React from "react";
import {
  isAnyDebugEnabled,
  getEnabledDebugCategories,
} from "../utils/debugLogger";

// Debug components
export { default as YLevelDebugTest } from "./YLevelDebugTest";
export { default as DebugIntegrationExample } from "./DebugIntegrationExample";

// Debug utilities (re-export for convenience)
export {
  debugSimulantYPositioning,
  debugBlockYPositioning,
  debugYLevelValidation,
  debugPositioning,
  isAnyDebugEnabled,
  getEnabledDebugCategories,
  logDebugStatus,
  type DebugCategory,
  type DebugLevel,
} from "../utils/debugLogger";

// Y-Level debug utilities (re-export for convenience)
export {
  Y_LEVEL_DEBUG,
  Y_LEVEL_CONSTANTS,
  Y_LEVEL_VALIDATION,
  Y_LEVEL_MIGRATION,
} from "../config/yLevelConstants";

/**
 * Development-only debug component wrapper
 * Only renders children in development mode
 */
export const DevOnly: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }
  return React.createElement(React.Fragment, null, children);
};

/**
 * Debug panel configuration
 */
export const DEBUG_PANEL_CONFIG = {
  // Default position for debug panels
  defaultPosition: {
    top: "1rem",
    right: "1rem",
  },

  // Z-index for debug panels to ensure they appear above content
  zIndex: 9999,

  // Common styling classes
  panelClasses:
    "fixed bg-black/90 text-white p-4 rounded-lg border border-gray-600",

  // Panel sizing
  panelWidth: "20rem", // 320px
  maxHeight: "70vh",
} as const;

/**
 * Check if any debug features are enabled
 * Useful for conditionally rendering debug components
 */
export function shouldShowDebugComponents(): boolean {
  if (process.env.NODE_ENV !== "development") {
    return false;
  }

  // Check if any debug environment variables are enabled
  const debugEnvVars = [
    "DEBUG_SIMULANT_Y_POSITIONING",
    "DEBUG_BLOCK_Y_POSITIONING",
    "DEBUG_Y_LEVEL_VALIDATION",
    "DEBUG_POSITIONING_GENERAL",
  ];

  return debugEnvVars.some(
    (envVar) => process.env[envVar] === "true" || process.env[envVar] === "1",
  );
}

/**
 * Debug component registry
 * Used for dynamic loading of debug components
 */
export const DEBUG_COMPONENTS = {
  YLevelDebugTest: {
    name: "Y-Level Debug Test",
    description: "Interactive testing for Y-level positioning system",
    component: "YLevelDebugTest",
    category: "positioning",
    requiresDebugFlag: [
      "DEBUG_SIMULANT_Y_POSITIONING",
      "DEBUG_BLOCK_Y_POSITIONING",
    ],
  },
  DebugIntegrationExample: {
    name: "Debug Integration Example",
    description: "Example component showing how to integrate debug logging",
    component: "DebugIntegrationExample",
    category: "integration",
    requiresDebugFlag: [],
  },
} as const;

/**
 * Debug categories with descriptions
 */
export const DEBUG_CATEGORIES = {
  "simulant-y-positioning": {
    name: "Simulant Y Positioning",
    description: "Debug logs for AI simulant Y-level positioning and spawning",
    envVar: "DEBUG_SIMULANT_Y_POSITIONING",
    emoji: "🤖",
  },
  "block-y-positioning": {
    name: "Block Y Positioning",
    description: "Debug logs for block placement and Y-level calculations",
    envVar: "DEBUG_BLOCK_Y_POSITIONING",
    emoji: "🧱",
  },
  "y-level-validation": {
    name: "Y-Level Validation",
    description: "Debug logs for Y-level alignment checks and migrations",
    envVar: "DEBUG_Y_LEVEL_VALIDATION",
    emoji: "📐",
  },
  "positioning-general": {
    name: "General Positioning",
    description: "Debug logs for positioning performance and errors",
    envVar: "DEBUG_POSITIONING_GENERAL",
    emoji: "📍",
  },
} as const;

/**
 * Utility to get debug status summary
 */
export function getDebugStatusSummary() {
  const categories = Object.entries(DEBUG_CATEGORIES);
  const enabledCount = categories.filter(
    ([key]) =>
      isAnyDebugEnabled() && getEnabledDebugCategories().includes(key as any),
  ).length;

  return {
    totalCategories: categories.length,
    enabledCategories: enabledCount,
    isAnyEnabled: enabledCount > 0,
    isDevelopment: process.env.NODE_ENV === "development",
    shouldShowDebugComponents: shouldShowDebugComponents(),
  };
}
