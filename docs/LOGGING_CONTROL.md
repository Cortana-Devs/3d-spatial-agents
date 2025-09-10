# Logging Control System

This document explains how to control development logging throughout the application.

## Overview

The project uses a sophisticated development logging system that replaces direct `console.log/warn/error` statements with controlled logging functions. This allows you to easily enable/disable all console output without modifying code.

## Quick Start

### 1. Disable All Console Logging

Set environment variables in `.env.local`:
```bash
NEXT_PUBLIC_DEV_LOG=false
NEXT_PUBLIC_DEBUG_LOG=false
```

### 2. Enable Console Logging
```bash
NEXT_PUBLIC_DEV_LOG=true
NEXT_PUBLIC_DEBUG_LOG=true
```

### 3. Runtime Control (Browser)
```javascript
// Disable logging at runtime
window.__DEV_LOGS__.disable()

// Enable logging at runtime  
window.__DEV_LOGS__.enable()

// Check current status
window.__DEV_LOGS__.status()
```

### 4. URL-based Control
Add to your URL: `?devlog=false` to disable logging for that session.

## Development Logging Functions

Instead of direct console calls, the codebase uses:

| Old Method | New Method | Purpose |
|------------|------------|---------|
| `console.log()` | `devLog()` | General development logging |
| `console.warn()` | `devWarn()` | Development warnings |
| `console.error()` | `devError()` | Development errors |
| `console.info()` | `devLog()` | Information logging |
| `console.debug()` | `devLog()` | Debug information |

## Import and Usage

```typescript
import { devLog, devWarn, devError, ifDev, createScopedLogger } from "@/utils/devLogger";

// Basic logging
devLog("Something happened", { data });
devWarn("Potential issue", { warning });
devError("Recoverable error", error);

// Conditional execution (only in development)
ifDev(() => {
  // Expensive debug operations
  performComplexAnalysis();
});

// Scoped logging for modules
const logger = createScopedLogger("ModuleName");
logger.log("Module initialized");
logger.warn("Module warning");
logger.error("Module error");

// One-time logging
devOnce("unique-key", "This will only log once per session");
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_DEV_LOG` | `true` in dev | Master control for development logging |
| `NEXT_PUBLIC_DEBUG_LOG` | `true` in dev | Control for debug-level logging |
| `NEXT_PUBLIC_LOGS` | - | Alternative master control |

## Browser Controls

The logging system exposes global controls in the browser:

```javascript
// Available on window.__DEV_LOGS__
{
  enable: () => void,           // Enable all logging
  disable: () => void,          // Disable all logging  
  set: (boolean) => void,       // Set logging state
  status: () => boolean,        // Get current state
  clearOnceKeys: () => void     // Clear one-time log keys
}
```

## NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run setup:logging` | Configure logging in .env.local |
| `npm run replace:console` | Preview console statement replacements |
| `npm run replace:console:apply` | Apply console statement replacements |

## Configuration Examples

### Disable All Logging (Production-like)
```bash
# .env.local
NEXT_PUBLIC_DEV_LOG=false
NEXT_PUBLIC_DEBUG_LOG=false
```

### Enable Only Error Logging
```bash
# .env.local  
NEXT_PUBLIC_DEV_LOG=false
NEXT_PUBLIC_DEBUG_LOG=false
```
Then use only `devError()` in critical paths.

### Selective Module Logging
```typescript
// Create module-specific loggers
const uiLogger = createScopedLogger("UI");
const apiLogger = createScopedLogger("API");
const gameLogger = createScopedLogger("GAME");

// Use in code
uiLogger.log("Component mounted");
apiLogger.warn("API rate limit approaching");
gameLogger.error("Physics simulation failed");
```

## Advanced Features

### Performance Measurement
```typescript
import { measure } from "@/utils/devLogger";

const result = measure("expensiveOperation", () => {
  return performExpensiveOperation();
});
// Automatically logs: [DEV:TIMING] expensiveOperation: 45.2ms
```

### One-time Warnings
```typescript
import { devOnce } from "@/utils/devLogger";

// This will only log once per session, even if called multiple times
devOnce("deprecated-api", "This API is deprecated, use newAPI instead");
```

### Conditional Development Code
```typescript
import { ifDev } from "@/utils/devLogger";

ifDev(() => {
  // This code only runs in development
  validateDataIntegrity();
  performExpensiveChecks();
  enableDebugFeatures();
});
```

## Best Practices

### 1. Use Appropriate Log Levels
```typescript
// ✅ Good
devLog("User action completed", { action, userId });
devWarn("Performance threshold exceeded", { metric, threshold });
devError("Failed to save data", error);

// ❌ Avoid
devError("User clicked button"); // Not an error
devLog("Critical system failure", error); // Should be devError
```

### 2. Use Scoped Loggers for Modules
```typescript
// ✅ Good - Easy to filter in browser console
const logger = createScopedLogger("AnimationSystem");
logger.log("Animation started");

// ❌ Less organized
devLog("Animation started"); // Harder to trace source
```

### 3. Include Context in Logs
```typescript
// ✅ Good
devLog("Block placed", { 
  position: { x, y, z }, 
  blockType, 
  playerId 
});

// ❌ Less useful
devLog("Block placed");
```

### 4. Use ifDev for Expensive Operations
```typescript
// ✅ Good - Performance-conscious
ifDev(() => {
  const stats = calculateComplexStats();
  devLog("Performance stats", stats);
});

// ❌ Wasteful in production builds
devLog("Performance stats", calculateComplexStats());
```

## Troubleshooting

### Logging Not Working
1. Check `.env.local` settings
2. Restart dev server after changing environment variables
3. Check browser console for `window.__DEV_LOGS__.status()`

### Too Much Logging Output
```javascript
// Temporarily disable in browser console
window.__DEV_LOGS__.disable()

// Or filter by scope in browser console
// Filter by: [DEV:UI] to see only UI logs
```

### Missing Imports After Script
If the automated replacement script missed imports:
```typescript
import { devLog, devWarn, devError } from "@/utils/devLogger";
```

## Migration from Console Statements

The project includes scripts to automatically replace `console.*` calls:

### 1. Preview Changes
```bash
npm run replace:console
```

### 2. Apply Changes
```bash
npm run replace:console:apply
```

### 3. Configure Environment
```bash
npm run setup:logging
```

The script will:
- Replace `console.log` → `devLog`
- Replace `console.warn` → `devWarn`  
- Replace `console.error` → `devError`
- Add necessary imports
- Skip already-wrapped statements

## Production Behavior

In production builds (`NODE_ENV=production`):
- All dev logging functions become no-ops
- No console output is generated
- No performance impact from logging calls
- ifDev blocks don't execute

This ensures clean production builds without manual cleanup.