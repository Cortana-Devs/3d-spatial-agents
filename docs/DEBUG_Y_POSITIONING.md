# Y-Level Positioning Debug Troubleshooting Guide

This guide helps you debug Y-level positioning issues for simulants and blocks in the Descendants metaverse.

## 🔧 Quick Setup

1. **Copy environment template:**
   ```bash
   cp .env.debug.example .env.local
   ```

2. **Enable debug categories in `.env.local`:**
   ```bash
   # For simulant positioning issues (client-side debugging)
   NEXT_PUBLIC_DEBUG_SIMULANT_Y_POSITIONING=true
   
   # For block placement issues (client-side debugging)
   NEXT_PUBLIC_DEBUG_BLOCK_Y_POSITIONING=true
   
   # For Y-level validation issues (client-side debugging)
   NEXT_PUBLIC_DEBUG_Y_LEVEL_VALIDATION=true
   
   # For performance issues (client-side debugging)
   NEXT_PUBLIC_DEBUG_POSITIONING_GENERAL=true
   
   # Server-side versions (optional, for SSR debugging)
   DEBUG_SIMULANT_Y_POSITIONING=true
   DEBUG_BLOCK_Y_POSITIONING=true
   DEBUG_Y_LEVEL_VALIDATION=true
   DEBUG_POSITIONING_GENERAL=true
   ```

3. **Restart development server:**
   ```bash
   npm run dev
   ```

4. **Check browser console** - you should see:
   ```
   🔧 Y-Level Debug System Status
   Environment: development
   Simulant Debug: true
   Block Debug: true
   🔊 Debug logging enabled for: ['simulant-y-positioning', 'block-y-positioning']
   ```

## 🚨 Troubleshooting: No Debug Logs Appearing

### Problem: Environment variables not working

**Check 1: Verify environment variables are set**
```bash
# In your .env.local file, make sure you have:
DEBUG_SIMULANT_Y_POSITIONING=true
DEBUG_BLOCK_Y_POSITIONING=true
```

**Check 2: Restart the development server**
```bash
# Environment changes require server restart
npm run dev
```

**Check 2: Check console startup message**
Look for this in your browser console when the app loads:
```
🔧 Y-Level Debug System Status
Environment: development
Simulant Debug: true  ← Should say "true", not "disabled"
Block Debug: true     ← Should say "true", not "disabled"
🔊 Debug logging enabled for: ['simulant-y-positioning', 'block-y-positioning']
```

**Check 4: Verify development mode**
Debug logging only works in development. Make sure you see:
```
Environment: development  ← NOT "production"
```

### Problem: Console shows "disabled" for debug categories

If you see this in console:
```
Simulant Debug: disabled
Block Debug: disabled
```

**Solution:** Check your `.env.local` file syntax and Next.js requirements:

**For client-side debugging (browser console):**
- ✅ Correct: `NEXT_PUBLIC_DEBUG_SIMULANT_Y_POSITIONING=true`
- ❌ Wrong: `NEXT_PUBLIC_DEBUG_SIMULANT_Y_POSITIONING = true` (spaces)
- ❌ Wrong: `NEXT_PUBLIC_DEBUG_SIMULANT_Y_POSITIONING="true"` (quotes)
- ❌ Wrong: `# NEXT_PUBLIC_DEBUG_SIMULANT_Y_POSITIONING=true` (commented out)

**For server-side debugging (SSR/build time):**
- ✅ Correct: `DEBUG_SIMULANT_Y_POSITIONING=true`

**⚠️ Important:** Next.js requires `NEXT_PUBLIC_` prefix for client-side environment variables!

### Problem: Browser console is empty

**Check 1: Console is open and not filtered**
- Press F12 to open DevTools
- Click "Console" tab
- Make sure console filter is set to "All levels"

**Check 2: Clear console and reload**
- Press Ctrl+L (or Cmd+K on Mac) to clear console
- Reload the page (F5)

**Check 3: Look for debug status indicator**
In the bottom-left corner, you should see:
```
🔧 Debug Mode Active - Check Console
```

## 📊 Expected Debug Output

### When Simulants Are Positioned

```
🤖 ℹ️ [14:30:15.123] SIMULANT-Y-POSITIONING: Default Y positioning for simulant test-123 (Active simulant rendering)
  {
    simulantId: "test-123",
    position: { x: 5, y: 0, z: 3 },
    yLevel: 0,
    isGroundLevel: false,
    context: "Active simulant rendering"
  }
```

### When Blocks Are Placed

```
🧱 ℹ️ [14:30:15.456] BLOCK-Y-POSITIONING: Initial Y positioning for default floor block default-floor-0-0
  {
    blockId: "default-floor-0-0",
    blockType: "default floor block",
    position: { x: 0, y: 0, z: 0 },
    yLevel: 0,
    isFloorLevel: true,
    isPlayerLevel: false
  }
```

### When Camera Moves

```
🤖 ℹ️ [14:30:15.789] SIMULANT-Y-POSITIONING: Canvas camera initialization
  {
    x: 10,
    y: 10,
    z: 10
  }
```

## 🔍 Common Y-Level Issues & Solutions

### Issue 1: Simulants Floating Above Ground

**Debug Output to Look For:**
```
🤖 ⚠️ Position validation for simulant xyz: INVALID
  {
    simulantId: "xyz",
    position: { x: 0, y: 5.5, z: 0 },  ← Y too high
    isValid: false,
    issues: ["Y position 5.5 is not at ground level (expected ~0.5)"]
  }
```

**Root Cause:** Simulants positioned at Y > 0.5
**Solution:** Check simulant spawn logic in `FloatingSidebar.tsx`

### Issue 2: Blocks Not Aligning with Ground

**Debug Output to Look For:**
```
🧱 ⚠️ Block placement validation: INVALID
  {
    position: { x: 2, y: 1.5, z: 4 },  ← Y should be 0 or 1
    yLevel: 1.5,
    isValid: false,
    conflicts: ["Block Y position not aligned to grid"]
  }
```

**Root Cause:** Block Y positions not snapped to integer grid
**Solution:** Check block placement logic in `worldStore.ts`

### Issue 3: Camera Positioned Incorrectly

**Debug Output to Look For:**
```
🤖 ℹ️ Canvas camera initialization
  {
    x: 10,
    y: 10,  ← Initial camera Y position
    z: 10
  }
```

**Expected Values:**
- **Camera Y=10**: Good starting position for overview
- **Simulant Y=0**: Ground level for character walking
- **Floor Block Y=0**: Ground level for floors
- **Elevated Block Y=1,2,3...**: Integer levels above ground

## 🎯 Testing Scenarios

### Test 1: Add a Simulant
1. Open FloatingSidebar
2. Click "Animation" tab  
3. Click "Add Simulant"
4. **Expected Console Output:**
   ```
   🤖 ℹ️ Spawning simulant simulant-[timestamp] - Test simulant creation
   🤖 ℹ️ Default Y positioning for simulant [id] (Active simulant rendering)
   ```

### Test 2: Place a Block
1. Select a block type (press 1-7)
2. Click somewhere in the 3D world
3. **Expected Console Output:**
   ```
   🧱 ℹ️ Initial Y positioning for [blockType] block [id]
   🧱 ℹ️ Block placement validation: VALID
   ```

### Test 3: Move Camera
1. Use WASD keys or drag to move camera
2. **Expected Console Output:**
   ```
   🤖 ℹ️ Camera transition starting from current position
   🤖 ℹ️ Camera transition targeting end position
   ```

## 📈 Performance Debugging

Enable performance debugging:
```bash
DEBUG_POSITIONING_GENERAL=true
```

**Look for slow operations:**
```
📍 ⚠️ Positioning performance: bulk operation took 25.45ms for 50 entities
  {
    operation: "bulk operation",
    duration: 25.45,
    entityCount: 50,
    isSlowOperation: true  ← Operations >16ms are flagged
  }
```

## 🔧 Advanced Debugging

### Enable All Debug Categories
```bash
# Client-side debugging (required for browser console)
NEXT_PUBLIC_DEBUG_SIMULANT_Y_POSITIONING=true
NEXT_PUBLIC_DEBUG_BLOCK_Y_POSITIONING=true  
NEXT_PUBLIC_DEBUG_Y_LEVEL_VALIDATION=true
NEXT_PUBLIC_DEBUG_POSITIONING_GENERAL=true

# Server-side debugging (optional)
DEBUG_SIMULANT_Y_POSITIONING=true
DEBUG_BLOCK_Y_POSITIONING=true  
DEBUG_Y_LEVEL_VALIDATION=true
DEBUG_POSITIONING_GENERAL=true
```

### Filter Console Output
In browser console, filter by:
- `🤖` for simulant logs only
- `🧱` for block logs only  
- `📐` for validation logs only
- `📍` for performance logs only

### Check Debug Function Status
In browser console:
```javascript
// Check which debug categories are enabled
import debug from './utils/debugLogger.js';
debug.getEnabledCategories();  // Returns array like ['simulant-y-positioning']
debug.isAnyEnabled();          // Returns true/false
debug.logStatus();             // Prints current status
```

## 🐛 Report Issues

When reporting Y-level positioning bugs, include:

1. **Environment Variables:**
   ```
   NEXT_PUBLIC_DEBUG_SIMULANT_Y_POSITIONING=true
   NEXT_PUBLIC_DEBUG_BLOCK_Y_POSITIONING=true
   DEBUG_SIMULANT_Y_POSITIONING=true
   DEBUG_BLOCK_Y_POSITIONING=true
   ```

2. **Console Output:** Copy the relevant debug logs

3. **Steps to Reproduce:** What actions triggered the issue

4. **Expected vs Actual:** What Y positions you expected vs what you got

## 📚 Related Files

- **Main Debug Logic:** `utils/debugLogger.ts`
- **Y-Level Constants:** `config/yLevelConstants.ts`  
- **Simulant Positioning:** `components/simulants/SimulantManager.tsx`
- **Block Positioning:** `store/worldStore.ts`
- **Camera Positioning:** `components/world/CameraController.tsx`
- **Canvas Setup:** `components/world/VoxelCanvas.tsx`

## ⚡ Quick Reference

| Environment Variable | Controls | Console Output |
|---------------------|----------|----------------|
| `NEXT_PUBLIC_DEBUG_SIMULANT_Y_POSITIONING=true` | Simulant & camera positioning (client-side) | `🤖 ℹ️ Default Y positioning...` |
| `NEXT_PUBLIC_DEBUG_BLOCK_Y_POSITIONING=true` | Block placement & Y calculations (client-side) | `🧱 ℹ️ Initial Y positioning...` |  
| `NEXT_PUBLIC_DEBUG_Y_LEVEL_VALIDATION=true` | Y-level alignment checks (client-side) | `📐 ⚠️ Y-level alignment check...` |
| `NEXT_PUBLIC_DEBUG_POSITIONING_GENERAL=true` | Performance & errors (client-side) | `📍 ⚠️ Positioning performance...` |
| `DEBUG_*=true` | Server-side versions (optional for SSR) | Same output during build/SSR |

**Remember:** 
- Changes to `.env.local` require restarting the dev server!
- Use `NEXT_PUBLIC_` prefix for client-side debugging in the browser
- Server-side variables (without prefix) are for SSR/build-time debugging only