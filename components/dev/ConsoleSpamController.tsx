"use client";

import React, { useEffect, useState } from 'react';

/**
 * Console Spam Controller
 * ======================
 *
 * A development component that provides easy controls to manage console spam.
 * Only renders in development mode and provides UI controls + auto-disable options.
 */

interface ConsoleState {
  isMuted: boolean;
  isSpamDisabled: boolean;
  devLoggerEnabled: boolean;
}

export default function ConsoleSpamController() {
  const [isVisible, setIsVisible] = useState(false);
  const [consoleState, setConsoleState] = useState<ConsoleState>({
    isMuted: false,
    isSpamDisabled: false,
    devLoggerEnabled: true,
  });

  // Only show in development
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    // Auto-disable spam after 3 seconds if there's too much logging
    const timer = setTimeout(() => {
      // Check if there's been excessive logging
      const hasExcessiveLogs = document.querySelectorAll('[data-testid]').length > 10;

      if (hasExcessiveLogs || window.location.search.includes('nospam')) {
        disableAllSpam();
      }

      setIsVisible(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const disableAllSpam = () => {
    try {
      // Disable dev logger
      if (window.__DEV_LOGS__) {
        window.__DEV_LOGS__.disable();
      }
      localStorage.setItem('__DEV_LOG_ENABLED__', '0');

      // Disable React DevTools spam
      const originalWarn = console.warn;
      console.warn = (...args: any[]) => {
        const message = args.join(' ');
        if (
          message.includes('React DevTools') ||
          message.includes('react-devtools') ||
          message.includes('[DEV') ||
          message.includes('🎭') ||
          message.includes('🎬') ||
          message.includes('Performance warning')
        ) {
          return;
        }
        originalWarn(...args);
      };

      // Also silence excessive info logs
      const originalInfo = console.info;
      console.info = (...args: any[]) => {
        const message = args.join(' ');
        if (message.includes('[DEV') || message.includes('🔧')) {
          return;
        }
        originalInfo(...args);
      };

      updateConsoleState();
      console.log('🚫 Console spam disabled');
    } catch (error) {
      console.error('Failed to disable console spam:', error);
    }
  };

  const enableAllSpam = () => {
    try {
      // Re-enable dev logger
      if (window.__DEV_LOGS__) {
        window.__DEV_LOGS__.enable();
      }
      localStorage.setItem('__DEV_LOG_ENABLED__', '1');

      // Reload to restore original console methods
      window.location.reload();
    } catch (error) {
      console.error('Failed to enable console spam:', error);
    }
  };

  const muteConsole = () => {
    const originalMethods = {
      log: console.log,
      warn: console.warn,
      info: console.info,
      debug: console.debug,
    };

    console.log = () => {};
    console.warn = () => {};
    console.info = () => {};
    console.debug = () => {};

    localStorage.setItem('__CONSOLE_MUTED__', 'true');
    updateConsoleState();
  };

  const updateConsoleState = () => {
    setConsoleState({
      isMuted: localStorage.getItem('__CONSOLE_MUTED__') === 'true',
      isSpamDisabled: localStorage.getItem('__DEV_LOG_ENABLED__') === '0',
      devLoggerEnabled: window.__DEV_LOGS__?.status() || false,
    });
  };

  // Setup global console controls
  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.__CONSOLE_CONTROLS__ = {
      disableAll: disableAllSpam,
      enableAll: enableAllSpam,
      mute: muteConsole,
      status: () => {
        console.log('Console State:', {
          devLogger: window.__DEV_LOGS__?.status(),
          muted: localStorage.getItem('__CONSOLE_MUTED__') === 'true',
          spamDisabled: localStorage.getItem('__DEV_LOG_ENABLED__') === '0',
        });
      },
      help: () => {
        console.log(`
🎛️ Console Controls:
  __CONSOLE_CONTROLS__.disableAll() - Stop all spam
  __CONSOLE_CONTROLS__.enableAll()  - Re-enable logging
  __CONSOLE_CONTROLS__.mute()       - Silence everything
  __CONSOLE_CONTROLS__.status()     - Show current state

Quick: Add ?nospam to URL to auto-disable spam
        `);
      },
    };

    updateConsoleState();
  }, []);

  // Don't render in production or if not visible
  if (process.env.NODE_ENV !== 'development' || !isVisible) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 10,
        right: 10,
        background: 'rgba(0, 0, 0, 0.9)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '6px',
        fontSize: '11px',
        fontFamily: 'monospace',
        zIndex: 9999,
        border: '1px solid #333',
        backdropFilter: 'blur(5px)',
      }}
    >
      <div style={{ marginBottom: '8px', fontWeight: 'bold', color: '#4CAF50' }}>
        🎛️ Console Controls
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
        <button
          onClick={disableAllSpam}
          style={{
            padding: '4px 8px',
            fontSize: '10px',
            border: 'none',
            borderRadius: '3px',
            background: consoleState.isSpamDisabled ? '#4CAF50' : '#FF5722',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          {consoleState.isSpamDisabled ? '✅ Spam Off' : '🚫 Stop Spam'}
        </button>

        <button
          onClick={enableAllSpam}
          style={{
            padding: '4px 8px',
            fontSize: '10px',
            border: 'none',
            borderRadius: '3px',
            background: '#2196F3',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          🔊 Enable All
        </button>
      </div>

      <div style={{ fontSize: '9px', opacity: 0.7, lineHeight: '1.2' }}>
        <div>Dev Logger: {consoleState.devLoggerEnabled ? '🟢' : '🔴'}</div>
        <div>Console: {consoleState.isMuted ? '🔇 Muted' : '🔊 Active'}</div>
        <div style={{ marginTop: '4px', color: '#888' }}>
          Console: __CONSOLE_CONTROLS__.help()
        </div>
      </div>
    </div>
  );
}
