/**
 * Console Controls
 * ================
 *
 * Utility to manage console spam in development environments.
 * Provides multiple ways to disable verbose logging and console output.
 *
 * Usage:
 *   import { disableConsoleSpam, enableConsoleSpam, muteConsole, unmuteConsole } from '@/utils/consoleControls';
 *
 *   // Disable all dev logging
 *   disableConsoleSpam();
 *
 *   // Temporarily mute console
 *   muteConsole();
 *
 *   // Quick toggle via browser console
 *   window.__CONSOLE_CONTROLS__.disableAll();
 */

// Store original console methods
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
  debug: console.debug,
  group: console.group,
  groupCollapsed: console.groupCollapsed,
  groupEnd: console.groupEnd,
};

// Muted state
let isConsoleMuted = false;
let isSpamDisabled = false;

// Spam filter patterns - these will be blocked when spam is disabled
const spamPatterns = [
  /^\[DEV.*?\]/,           // Dev logger messages
  /🎭|🎬|✅|🗑️|🔧|⚠️|❌/,   // Emoji-heavy logs
  /Animation transition/,   // Animation state changes
  /Performance warning/,    // Performance logs
  /GPU/,                   // GPU-related logs
  /frame time/,            // Frame timing logs
  /Skybox/,                // Skybox loading logs
  /Avatar animator/,       // Avatar animation logs
  /Movement Animation/,    // Movement controller logs
  /Player avatar/,         // Player avatar logs
];

// Silent console methods
const silentConsole = {
  log: () => {},
  warn: () => {},
  error: () => {},
  info: () => {},
  debug: () => {},
  group: () => {},
  groupCollapsed: () => {},
  groupEnd: () => {},
};

// Filtered console methods that block spam but allow important messages
const filteredConsole = {
  log: createFilteredMethod('log'),
  warn: createFilteredMethod('warn'),
  error: originalConsole.error, // Always show errors
  info: createFilteredMethod('info'),
  debug: createFilteredMethod('debug'),
  group: createFilteredMethod('group'),
  groupCollapsed: createFilteredMethod('groupCollapsed'),
  groupEnd: originalConsole.groupEnd,
};

function createFilteredMethod(method: keyof typeof originalConsole) {
  return (...args: any[]) => {
    const message = args.join(' ');

    // Check if message matches spam patterns
    const isSpam = spamPatterns.some(pattern => pattern.test(message));

    if (!isSpam) {
      originalConsole[method](...args);
    }
  };
}

/**
 * Completely mute the console (all output stopped)
 */
export function muteConsole(): void {
  if (isConsoleMuted) return;

  Object.assign(console, silentConsole);
  isConsoleMuted = true;

  // Store in localStorage for persistence
  try {
    localStorage.setItem('__CONSOLE_MUTED__', 'true');
  } catch {}
}

/**
 * Restore console to normal operation
 */
export function unmuteConsole(): void {
  if (!isConsoleMuted && !isSpamDisabled) return;

  Object.assign(console, originalConsole);
  isConsoleMuted = false;
  isSpamDisabled = false;

  try {
    localStorage.removeItem('__CONSOLE_MUTED__');
    localStorage.removeItem('__CONSOLE_SPAM_DISABLED__');
  } catch {}

  console.log('🔊 Console restored to normal operation');
}

/**
 * Disable spam while keeping important messages (errors, warnings)
 */
export function disableConsoleSpam(): void {
  if (isSpamDisabled) return;

  Object.assign(console, filteredConsole);
  isSpamDisabled = true;

  try {
    localStorage.setItem('__CONSOLE_SPAM_DISABLED__', 'true');
  } catch {}

  console.log('🔇 Console spam disabled (errors still visible)');
}

/**
 * Enable all console output
 */
export function enableConsoleSpam(): void {
  unmuteConsole();
}

/**
 * Disable dev logger specifically
 */
export function disableDevLogger(): void {
  // Try to access the dev logger controls
  try {
    if (typeof window !== 'undefined' && window.__DEV_LOGS__) {
      window.__DEV_LOGS__.disable();
    }

    // Also set the localStorage key directly
    localStorage.setItem('__DEV_LOG_ENABLED__', '0');
  } catch {}
}

/**
 * Enable dev logger
 */
export function enableDevLogger(): void {
  try {
    if (typeof window !== 'undefined' && window.__DEV_LOGS__) {
      window.__DEV_LOGS__.enable();
    }

    localStorage.setItem('__DEV_LOG_ENABLED__', '1');
  } catch {}
}

/**
 * Quick disable everything that's causing spam
 */
export function disableAllSpam(): void {
  disableDevLogger();
  disableConsoleSpam();

  // Also try to disable React DevTools messages
  try {
    if (typeof window !== 'undefined') {
      // Suppress React DevTools download message
      const originalWarn = console.warn;
      console.warn = (...args: any[]) => {
        const message = args.join(' ');
        if (message.includes('React DevTools') || message.includes('react-devtools')) {
          return;
        }
        originalWarn(...args);
      };
    }
  } catch {}

  console.log('🚫 All console spam disabled');
}

/**
 * Get current console state
 */
export function getConsoleState() {
  return {
    isMuted: isConsoleMuted,
    isSpamDisabled: isSpamDisabled,
    devLoggerEnabled: typeof window !== 'undefined' && window.__DEV_LOGS__?.status() || false,
  };
}

/**
 * Auto-restore console state from localStorage
 */
function restoreConsoleState(): void {
  if (typeof window === 'undefined') return;

  try {
    const isMuted = localStorage.getItem('__CONSOLE_MUTED__') === 'true';
    const isSpamDisabled = localStorage.getItem('__CONSOLE_SPAM_DISABLED__') === 'true';

    if (isMuted) {
      muteConsole();
    } else if (isSpamDisabled) {
      disableConsoleSpam();
    }
  } catch {}
}

// Global controls for browser console
declare global {
  interface Window {
    __CONSOLE_CONTROLS__?: {
      mute: () => void;
      unmute: () => void;
      disableSpam: () => void;
      enableSpam: () => void;
      disableAll: () => void;
      status: () => void;
      help: () => void;
    };
  }
}

// Setup global controls
if (typeof window !== 'undefined') {
  window.__CONSOLE_CONTROLS__ = {
    mute: muteConsole,
    unmute: unmuteConsole,
    disableSpam: disableConsoleSpam,
    enableSpam: enableConsoleSpam,
    disableAll: disableAllSpam,
    status: () => {
      const state = getConsoleState();
      console.log('Console Status:', state);
    },
    help: () => {
      console.log(`
🎛️ Console Controls:
  __CONSOLE_CONTROLS__.disableAll()  - Stop all spam
  __CONSOLE_CONTROLS__.disableSpam() - Filter spam, keep errors
  __CONSOLE_CONTROLS__.mute()        - Silence everything
  __CONSOLE_CONTROLS__.unmute()      - Restore normal operation
  __CONSOLE_CONTROLS__.status()      - Show current state

Quick tip: Add ?devlog=false to URL to disable dev logger
      `);
    },
  };

  // Show help on first load if there's spam
  const shouldShowHelp = () => {
    const hasDevLogs = document.querySelector('script[src*="dev"]') !== null;
    const hasSpam = localStorage.getItem('__CONSOLE_SPAM_DISABLED__') !== 'true';
    return hasDevLogs && hasSpam;
  };

  // Delayed help to avoid showing during initial page load
  setTimeout(() => {
    if (shouldShowHelp()) {
      console.log('💡 Console spam detected. Type __CONSOLE_CONTROLS__.disableAll() to stop it.');
    }
  }, 2000);

  // Restore previous state
  restoreConsoleState();
}

export default {
  mute: muteConsole,
  unmute: unmuteConsole,
  disableSpam: disableConsoleSpam,
  enableSpam: enableConsoleSpam,
  disableAll: disableAllSpam,
  disableDevLogger,
  enableDevLogger,
  getState: getConsoleState,
};
