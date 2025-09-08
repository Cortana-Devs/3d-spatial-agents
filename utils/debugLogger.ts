import { devLog } from "@/utils/devLogger";

/**
 * Debug Logger Utility for Y-Level Positioning
 *
 * This utility provides environment variable controlled debug logging
 * for Y-level positioning in simulants and blocks. Each debug category
 * can be enabled/disabled independently via environment variables.
 */

// Debug category type definitions
export type DebugCategory =
  | "simulant-y-positioning"
  | "block-y-positioning"
  | "y-level-validation"
  | "positioning-general";

// Debug level definitions
export type DebugLevel = "info" | "warn" | "error" | "trace";

// Environment variable mappings for debug categories
const DEBUG_ENV_VARS = {
  "simulant-y-positioning": "DEBUG_SIMULANT_Y_POSITIONING",
  "block-y-positioning": "DEBUG_BLOCK_Y_POSITIONING",
  "y-level-validation": "DEBUG_Y_LEVEL_VALIDATION",
  "positioning-general": "DEBUG_POSITIONING_GENERAL",
} as const;

// Client-side (NEXT_PUBLIC_) environment variable mappings
const CLIENT_DEBUG_ENV_VARS = {
  "simulant-y-positioning": "NEXT_PUBLIC_DEBUG_SIMULANT_Y_POSITIONING",
  "block-y-positioning": "NEXT_PUBLIC_DEBUG_BLOCK_Y_POSITIONING",
  "y-level-validation": "NEXT_PUBLIC_DEBUG_Y_LEVEL_VALIDATION",
  "positioning-general": "NEXT_PUBLIC_DEBUG_POSITIONING_GENERAL",
} as const;

// Color codes for console output
const DEBUG_COLORS = {
  "simulant-y-positioning": "#4CAF50", // Green
  "block-y-positioning": "#2196F3", // Blue
  "y-level-validation": "#FF9800", // Orange
  "positioning-general": "#9C27B0", // Purple
} as const;

// Emoji prefixes for different categories
const DEBUG_EMOJIS = {
  "simulant-y-positioning": "🤖",
  "block-y-positioning": "🧱",
  "y-level-validation": "📐",
  "positioning-general": "📍",
} as const;

// Level symbols
const LEVEL_SYMBOLS = {
  info: "ℹ️",
  warn: "⚠️",
  error: "❌",
  trace: "🔍",
} as const;

/**
 * Check if a debug category is enabled via environment variables
 * This function uses a fallback strategy to handle Next.js environment variable timing issues
 */
function isDebugEnabled(category: DebugCategory): boolean {
  // Always disabled in production
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  // Try multiple ways to access environment variables to handle Next.js timing issues

  // Method 1: Direct process.env access
  const clientEnvVar = CLIENT_DEBUG_ENV_VARS[category];
  const serverEnvVar = DEBUG_ENV_VARS[category];

  let clientEnvValue = process.env[clientEnvVar];
  let serverEnvValue = process.env[serverEnvVar];

  // Method 2: Try accessing via globalThis (browser global)
  if (typeof window !== "undefined" && !clientEnvValue) {
    clientEnvValue = (globalThis as any).process?.env?.[clientEnvVar];
  }

  // Method 3: Try accessing via window.__NEXT_DATA__ (Next.js runtime env)
  if (typeof window !== "undefined" && !clientEnvValue) {
    const nextData = (window as any).__NEXT_DATA__;
    if (nextData?.runtimeConfig) {
      clientEnvValue = nextData.runtimeConfig[clientEnvVar];
    }
  }

  // Method 4: Development mode fallback - default to disabled
  // Debug logging should be explicitly enabled via environment variables
  if (process.env.NODE_ENV === "development") {
    // Default to false unless explicitly enabled
    // This prevents unwanted debug spam in development
    if (!clientEnvValue && !serverEnvValue) {
      return false;
    }
  }

  // Standard checks
  if (clientEnvValue === "true" || clientEnvValue === "1") {
    return true;
  }

  if (serverEnvValue === "true" || serverEnvValue === "1") {
    return true;
  }

  // Default to false unless explicitly enabled
  return false;
}

/**
 * Format debug message with consistent styling
 */
function formatDebugMessage(
  category: DebugCategory,
  level: DebugLevel,
  message: string,
  data?: any,
): [string, any?] {
  const emoji = DEBUG_EMOJIS[category];
  const levelSymbol = LEVEL_SYMBOLS[level];
  const timestamp = new Date().toISOString().slice(11, 23); // HH:mm:ss.SSS

  const formattedMessage = `${emoji} ${levelSymbol} [${timestamp}] ${category.toUpperCase()}: ${message}`;

  return data !== undefined ? [formattedMessage, data] : [formattedMessage];
}

/**
 * Core debug logging function
 */
function debugLog(
  category: DebugCategory,
  level: DebugLevel,
  message: string,
  data?: any,
): void {
  if (!isDebugEnabled(category)) {
    return;
  }

  const [formattedMessage, logData] = formatDebugMessage(
    category,
    level,
    message,
    data,
  );
  const color = DEBUG_COLORS[category];

  // Use appropriate console method based on level
  const consoleMethod =
    level === "error"
      ? console.error
      : level === "warn"
        ? console.warn
        : devLog;

  if (logData !== undefined) {
    // Log with data using styled console group
    console.group(
      `%c${formattedMessage}`,
      `color: ${color}; font-weight: bold;`,
    );
    devLog(logData);
    console.groupEnd();
  } else {
    // Simple styled log
    consoleMethod(
      `%c${formattedMessage}`,
      `color: ${color}; font-weight: bold;`,
    );
  }
}

/**
 * Simulant Y-Level Positioning Debug Functions
 */
export const debugSimulantYPositioning = {
  /**
   * Log simulant default Y positioning decisions
   */
  logDefaultPositioning: (
    simulantId: string,
    position: { x: number; y: number; z: number },
    context?: string,
  ) => {
    debugLog(
      "simulant-y-positioning",
      "info",
      `Default Y positioning for simulant ${simulantId}${context ? ` (${context})` : ""}`,
      {
        simulantId,
        position,
        yLevel: position.y,
        isGroundLevel: Math.abs(position.y - 0.5) < 0.01,
        context,
      },
    );
  },

  /**
   * Log simulant spawn positioning
   */
  logSpawnPositioning: (
    simulantId: string,
    position: { x: number; y: number; z: number },
    spawnReason: string,
  ) => {
    debugLog(
      "simulant-y-positioning",
      "info",
      `Spawning simulant ${simulantId} - ${spawnReason}`,
      {
        simulantId,
        spawnPosition: position,
        yLevel: position.y,
        spawnReason,
        timestamp: Date.now(),
      },
    );
  },

  /**
   * Log simulant Y-level adjustments
   */
  logYAdjustment: (
    simulantId: string,
    oldY: number,
    newY: number,
    reason: string,
  ) => {
    debugLog(
      "simulant-y-positioning",
      "trace",
      `Y-level adjustment for simulant ${simulantId}: ${oldY} → ${newY}`,
      {
        simulantId,
        oldY,
        newY,
        adjustment: newY - oldY,
        reason,
        timestamp: Date.now(),
      },
    );
  },

  /**
   * Log positioning validation results
   */
  logValidation: (
    simulantId: string,
    position: { x: number; y: number; z: number },
    isValid: boolean,
    issues?: string[],
  ) => {
    debugLog(
      "simulant-y-positioning",
      isValid ? "info" : "warn",
      `Position validation for simulant ${simulantId}: ${isValid ? "VALID" : "INVALID"}`,
      {
        simulantId,
        position,
        isValid,
        issues: issues || [],
        timestamp: Date.now(),
      },
    );
  },
};

/**
 * Block Y-Level Positioning Debug Functions
 */
export const debugBlockYPositioning = {
  /**
   * Log initial block Y positioning
   */
  logInitialPositioning: (
    blockId: string,
    position: { x: number; y: number; z: number },
    blockType: string,
  ) => {
    debugLog(
      "block-y-positioning",
      "info",
      `Initial Y positioning for ${blockType} block ${blockId}`,
      {
        blockId,
        blockType,
        position,
        yLevel: position.y,
        isFloorLevel: Math.abs(position.y - 0.0) < 0.01,
        isPlayerLevel: Math.abs(position.y - 0.5) < 0.01,
      },
    );
  },

  /**
   * Log block placement calculations
   */
  logPlacementCalculation: (
    position: { x: number; y: number; z: number },
    calculatedY: number,
    reason: string,
  ) => {
    debugLog(
      "block-y-positioning",
      "trace",
      `Block placement Y calculation: ${position.y} → ${calculatedY}`,
      {
        originalY: position.y,
        calculatedY,
        adjustment: calculatedY - position.y,
        reason,
        finalPosition: { ...position, y: calculatedY },
      },
    );
  },

  /**
   * Log block Y-level snapping
   */
  logYSnapping: (
    originalY: number,
    snappedY: number,
    snapIncrement: number,
  ) => {
    debugLog(
      "block-y-positioning",
      "trace",
      `Y-level snapping: ${originalY} → ${snappedY} (increment: ${snapIncrement})`,
      {
        originalY,
        snappedY,
        snapIncrement,
        adjustment: snappedY - originalY,
      },
    );
  },

  /**
   * Log block collision and placement validation
   */
  logPlacementValidation: (
    position: { x: number; y: number; z: number },
    isValid: boolean,
    conflicts?: string[],
  ) => {
    debugLog(
      "block-y-positioning",
      isValid ? "info" : "warn",
      `Block placement validation: ${isValid ? "VALID" : "INVALID"}`,
      {
        position,
        yLevel: position.y,
        isValid,
        conflicts: conflicts || [],
        timestamp: Date.now(),
      },
    );
  },
};

/**
 * Y-Level Validation Debug Functions
 */
export const debugYLevelValidation = {
  /**
   * Log Y-level alignment checks
   */
  logAlignmentCheck: (
    context: string,
    yValue: number,
    expectedY: number,
    isAligned: boolean,
  ) => {
    debugLog(
      "y-level-validation",
      isAligned ? "info" : "warn",
      `Y-level alignment check for ${context}: ${isAligned ? "ALIGNED" : "MISALIGNED"}`,
      {
        context,
        actualY: yValue,
        expectedY,
        difference: Math.abs(yValue - expectedY),
        isAligned,
        tolerance: 0.01,
      },
    );
  },

  /**
   * Log Y-level constant usage
   */
  logConstantUsage: (constantName: string, value: number, usage: string) => {
    debugLog(
      "y-level-validation",
      "trace",
      `Using Y-level constant ${constantName} = ${value} for ${usage}`,
      {
        constantName,
        value,
        usage,
        timestamp: Date.now(),
      },
    );
  },

  /**
   * Log Y-level migration events
   */
  logMigration: (fromY: number, toY: number, reason: string) => {
    debugLog(
      "y-level-validation",
      "info",
      `Y-level migration: ${fromY} → ${toY} (${reason})`,
      {
        fromY,
        toY,
        adjustment: toY - fromY,
        reason,
        timestamp: Date.now(),
      },
    );
  },
};

/**
 * General Positioning Debug Functions
 */
export const debugPositioning = {
  /**
   * Log general positioning events
   */
  logEvent: (event: string, details: any) => {
    debugLog("positioning-general", "info", event, details);
  },

  /**
   * Log positioning performance metrics
   */
  logPerformance: (
    operation: string,
    duration: number,
    entityCount?: number,
  ) => {
    debugLog(
      "positioning-general",
      duration > 16 ? "warn" : "trace",
      `Positioning performance: ${operation} took ${duration.toFixed(2)}ms${entityCount ? ` for ${entityCount} entities` : ""}`,
      {
        operation,
        duration,
        entityCount,
        isSlowOperation: duration > 16,
        timestamp: Date.now(),
      },
    );
  },

  /**
   * Log positioning errors
   */
  logError: (error: string, context: any) => {
    debugLog("positioning-general", "error", `Positioning error: ${error}`, {
      error,
      context,
      timestamp: Date.now(),
    });
  },
};

/**
 * Utility function to check if any debug logging is enabled
 */
export function isAnyDebugEnabled(): boolean {
  return Object.keys(DEBUG_ENV_VARS).some((category) =>
    isDebugEnabled(category as DebugCategory),
  );
}

/**
 * Utility function to get enabled debug categories
 */
export function getEnabledDebugCategories(): DebugCategory[] {
  return Object.keys(DEBUG_ENV_VARS).filter((category) =>
    isDebugEnabled(category as DebugCategory),
  ) as DebugCategory[];
}

/**
 * Utility function to log debug configuration status
 */
export function logDebugStatus(): void {
  if (process.env.NODE_ENV === "production") {
    devLog("🔇 Debug logging disabled in production");
    return;
  }

  // Force a real-time check of categories
  const enabledCategories = getEnabledDebugCategories();

  if (enabledCategories.length === 0) {
    devLog(
      "🔇 No debug categories enabled. Set environment variables to enable:",
    );
    Object.entries(DEBUG_ENV_VARS).forEach(([category, envVar]) => {
      const clientEnvVar = CLIENT_DEBUG_ENV_VARS[category as DebugCategory];
      devLog(`  ${envVar}=true  # Enable ${category} debugging (server-side)`);
      devLog(
        `  ${clientEnvVar}=true  # Enable ${category} debugging (client-side)`,
      );
    });
  } else {
    devLog("🔊 Debug logging enabled for:", enabledCategories);
  }
}

/**
 * Quick debug toggle utility for browser console
 * Usage: window.__DEBUG_LOGS__.disableAll() or window.__DEBUG_LOGS__.enableAll()
 */
declare global {
  interface Window {
    __DEBUG_LOGS__?: {
      enableAll: () => void;
      disableAll: () => void;
      enableCategory: (category: DebugCategory) => void;
      disableCategory: (category: DebugCategory) => void;
      status: () => void;
      categories: DebugCategory[];
    };
  }
}

// Setup quick debug toggle utility
(function setupDebugToggle() {
  if (typeof window === "undefined") return;

  const storageKey = "__DEBUG_CATEGORIES_ENABLED__";

  const enabledCategories = new Set<DebugCategory>();

  // Load from localStorage if available
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const categories = JSON.parse(stored);
      categories.forEach((cat: DebugCategory) => enabledCategories.add(cat));
    }
  } catch {}

  const saveToStorage = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify([...enabledCategories]));
    } catch {}
  };

  const allCategories: DebugCategory[] = [
    "simulant-y-positioning",
    "block-y-positioning",
    "y-level-validation",
    "positioning-general",
  ];

  window.__DEBUG_LOGS__ = {
    enableAll: () => {
      allCategories.forEach((cat) => enabledCategories.add(cat));
      saveToStorage();
      devLog("🔊 All debug categories ENABLED");
    },
    disableAll: () => {
      enabledCategories.clear();
      saveToStorage();
      devLog("🔇 All debug categories DISABLED");
    },
    enableCategory: (category: DebugCategory) => {
      enabledCategories.add(category);
      saveToStorage();
      devLog(`🔊 Debug category '${category}' ENABLED`);
    },
    disableCategory: (category: DebugCategory) => {
      enabledCategories.delete(category);
      saveToStorage();
      devLog(`🔇 Debug category '${category}' DISABLED`);
    },
    status: () => {
      const enabled = getEnabledDebugCategories();
      devLog("Debug status:", {
        enabled: enabled,
        disabled: allCategories.filter((cat) => !enabled.includes(cat)),
      });
    },
    categories: allCategories,
  };

  // Override isDebugEnabled to use our toggle
  const originalIsDebugEnabled = isDebugEnabled;
  (globalThis as any).__isDebugEnabled = (category: DebugCategory) => {
    return enabledCategories.has(category) || originalIsDebugEnabled(category);
  };
})();

// Export the main debug functions
export default {
  simulant: debugSimulantYPositioning,
  block: debugBlockYPositioning,
  validation: debugYLevelValidation,
  general: debugPositioning,
  isEnabled: isDebugEnabled,
  logStatus: logDebugStatus,
  getEnabledCategories: getEnabledDebugCategories,
  isAnyEnabled: isAnyDebugEnabled,
};
