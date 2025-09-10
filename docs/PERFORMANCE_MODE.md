# 🚀 Performance Mode - Butter Smooth Experience

This guide helps you achieve optimal performance by disabling all development logging for a butter-smooth experience.

## Quick Setup (30 seconds)

### Option 1: Environment Variables (Recommended)
```bash
# Copy the performance config to your .env.local
cp .env.local.debug.disable .env.local

# Restart your dev server
npm run dev
```

### Option 2: Browser Console (Instant)
Open browser console and run:
```javascript
// Disable all dev logging instantly
window.__DEV_LOGS__.disable();

// Disable all debug categories
window.__DEBUG_LOGS__.disableAll();

// Refresh page for full effect
location.reload();
```

## What Gets Disabled

✅ **Block Y-positioning logs** (🧱 logs)  
✅ **Simulant positioning logs** (🤖 logs)  
✅ **Debug system status logs**  
✅ **Performance monitoring logs**  
✅ **Animation state logs**  
✅ **Skybox transition logs**  
✅ **All devLog() calls**  

## Performance Benefits

- **Reduced CPU overhead** from console logging
- **Cleaner browser console** 
- **Faster React re-renders** (no debug effects)
- **Lower memory usage** (no log buffering)
- **Smoother animations** (less main thread blocking)

## Environment Variables Explained

```env
# Master performance switch - disables ALL logging
NEXT_PUBLIC_PERF_MODE=true
PERF_MODE=true

# Individual debug categories (redundant if PERF_MODE=true)
NEXT_PUBLIC_DEBUG_BLOCK_Y_POSITIONING=false
NEXT_PUBLIC_DEBUG_SIMULANT_Y_POSITIONING=false
NEXT_PUBLIC_DEBUG_Y_LEVEL_VALIDATION=false
NEXT_PUBLIC_DEBUG_POSITIONING_GENERAL=false

# Dev logger controls
NEXT_PUBLIC_DEV_LOG=false
```

## Re-enabling Debugging (When Needed)

### Quick Toggle
```javascript
// Re-enable specific categories
window.__DEBUG_LOGS__.enableCategory('block-y-positioning');

// Enable everything
window.__DEBUG_LOGS__.enableAll();
window.__DEV_LOGS__.enable();
```

### Environment Override
```env
# In .env.local - set to false or remove
NEXT_PUBLIC_PERF_MODE=false

# Then restart: npm run dev
```

## Verification

After setup, you should see:
- ✅ Clean console (no emoji logs)
- ✅ No "Y-Level Debug System Status"
- ✅ No block/simulant positioning logs
- ✅ Smoother 60fps performance

## Troubleshooting

**Still seeing logs?**
1. Check `.env.local` exists and has `NEXT_PUBLIC_PERF_MODE=true`
2. Restart dev server completely (`Ctrl+C`, then `npm run dev`)
3. Hard refresh browser (`Ctrl+Shift+R`)

**Need debugging back?**
1. Set `NEXT_PUBLIC_PERF_MODE=false` in `.env.local`
2. Or use browser console: `window.__DEBUG_LOGS__.enableAll()`

---

🎯 **Goal**: Achieve butter-smooth 60fps with zero debug logging overhead