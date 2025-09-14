# Debug Scripts

This directory contains utility scripts for debugging Y-level positioning issues in the Descendants metaverse.

## 🚀 Quick Start

```bash
# Check current debug configuration status
npm run debug:status

# Fix debug environment variables (adds missing NEXT_PUBLIC_ vars)
npm run debug:fix

# Restart development server after configuration changes
npm run dev
```

## 📋 Available Scripts

### `debug:status` - Quick Status Check
```bash
npm run debug:status
# or: node scripts/debug-status.js
```
**Purpose:** Quickly check if debug environment variables are properly configured.

**Output Example:**
```
✅ Debug system is FULLY configured!
🚀 Expected Browser Console Output:
  🔧 Y-Level Debug System Status
  Simulant Debug: true
  Block Debug: true
```

### `debug:fix` - Auto-Fix Configuration
```bash
npm run debug:fix  
# or: node scripts/fix-debug-env.js
```
**Purpose:** Automatically adds missing `NEXT_PUBLIC_` debug variables to `.env.local`.

**What it does:**
- Backs up your current `.env.local`
- Adds missing client-side debug variables
- Preserves existing configuration

**Variables added:**
- `NEXT_PUBLIC_DEBUG_SIMULANT_Y_POSITIONING=true`
- `NEXT_PUBLIC_DEBUG_BLOCK_Y_POSITIONING=true`
- `NEXT_PUBLIC_DEBUG_Y_LEVEL_VALIDATION=true`
- `NEXT_PUBLIC_DEBUG_POSITIONING_GENERAL=true`

### `debug:test` - Test Environment Loading
```bash
npm run debug:test
# or: node scripts/test-env-vars.js
```
**Purpose:** Test if environment variables are being loaded correctly.

**Checks:**
- Server-side vs client-side variables
- Environment file existence
- Variable syntax validation

### `debug:validate` - Validate Complete Setup
```bash
npm run debug:validate
# or: node scripts/validate-debug-fix.js
```
**Purpose:** Comprehensive validation that simulates Next.js environment loading.

**Features:**
- Simulates Next.js environment variable behavior
- Tests debug logger logic
- Shows expected browser console output
- Validates all required variables are present and enabled

## 🔧 Environment Variables Explained

### Why NEXT_PUBLIC_ Prefix?

Next.js has two types of environment variables:

1. **Server-side** (`DEBUG_*`): Only available during build time and SSR
2. **Client-side** (`NEXT_PUBLIC_*`): Available in the browser

Since Y-level positioning debug logs appear in the **browser console**, we need `NEXT_PUBLIC_` prefixed variables.

### Required Variables

For client-side debugging (browser console):
```bash
NEXT_PUBLIC_DEBUG_SIMULANT_Y_POSITIONING=true  # 🤖 Simulant positioning logs
NEXT_PUBLIC_DEBUG_BLOCK_Y_POSITIONING=true     # 🧱 Block placement logs  
NEXT_PUBLIC_DEBUG_Y_LEVEL_VALIDATION=true      # 📐 Y-level validation logs
NEXT_PUBLIC_DEBUG_POSITIONING_GENERAL=true     # 📍 Performance & error logs
```

Optional server-side versions (for SSR debugging):
```bash
DEBUG_SIMULANT_Y_POSITIONING=true
DEBUG_BLOCK_Y_POSITIONING=true
DEBUG_Y_LEVEL_VALIDATION=true
DEBUG_POSITIONING_GENERAL=true
```

## 🐛 Common Issues

### Issue: Console shows "disabled" for debug categories
**Solution:**
```bash
npm run debug:fix
npm run dev  # Restart required!
```

### Issue: Debug logs not appearing in browser
**Check:**
1. Environment variables have `NEXT_PUBLIC_` prefix
2. Development server was restarted after changes
3. Browser console is open and not filtered

**Quick fix:**
```bash
npm run debug:status  # Check configuration
npm run debug:fix     # Fix if needed
npm run dev           # Restart server
```

### Issue: Environment variables not loading
**Validate:**
```bash
npm run debug:validate  # Shows exactly what Next.js will see
```

## 📊 Expected Debug Output

When working correctly, you should see:

**Browser Console on App Load:**
```
🔧 Y-Level Debug System Status
Environment: development
Simulant Debug: true
Block Debug: true
🔊 Debug logging enabled for: ['simulant-y-positioning', 'block-y-positioning']
```

**When Adding Simulants:**
```
🤖 ℹ️ [14:30:15.123] SIMULANT-Y-POSITIONING: Spawning simulant simulant-123 - Test simulant creation
🤖 ℹ️ [14:30:15.456] SIMULANT-Y-POSITIONING: Default Y positioning for simulant simulant-123 (Active simulant rendering)
```

**When Placing Blocks:**
```
🧱 ℹ️ [14:30:16.789] BLOCK-Y-POSITIONING: Initial Y positioning for grass block block-456
🧱 ℹ️ [14:30:16.987] BLOCK-Y-POSITIONING: Block placement validation: VALID
```

## 📁 File Overview

| File | Purpose |
|------|---------|
| `debug-status.js` | Quick status check of debug configuration |
| `fix-debug-env.js` | Auto-fix missing NEXT_PUBLIC_ variables |
| `test-env-vars.js` | Test environment variable loading |
| `validate-debug-fix.js` | Comprehensive setup validation |

## 🔗 Related Files

- **Main Debug System:** `utils/debugLogger.ts`
- **Debug Guide:** `DEBUG_Y_POSITIONING.md` (root directory)
- **Environment Config:** `.env.local` (root directory)
- **Debug Usage:** `components/world/VoxelCanvas.tsx`

## 💡 Tips

1. **Always restart dev server** after changing environment variables
2. **Use npm scripts** instead of running node directly for convenience
3. **Check browser console** for the debug status message on app load
4. **Filter console by emojis** (🤖, 🧱, 📐, 📍) to see specific debug categories

## 🚨 Troubleshooting Workflow

1. Run `npm run debug:status` to check current state
2. If issues found, run `npm run debug:fix` 
3. Restart dev server: `npm run dev`
4. Check browser console for debug status
5. Test by adding simulants or placing blocks
6. If still not working, run `npm run debug:validate` for detailed analysis

For complete troubleshooting guide, see: `DEBUG_Y_POSITIONING.md`
