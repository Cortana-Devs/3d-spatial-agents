# Y-Level Debug Logging System Guide

This guide explains how to use the Y-level debug logging system to troubleshoot positioning issues with simulants and blocks in the Descendants metaverse.

## Overview

The Y-level debug logging system provides detailed console output for:
- **Simulant Y positioning**: Default positioning, spawning, and Y-level adjustments
- **Block Y positioning**: Initial placement, calculations, and grid snapping
- **Y-level validation**: Alignment checks and migrations
- **General positioning**: Performance metrics and error tracking

All debug logging is controlled by environment variables and automatically disabled in production.

## Quick Start

1. Copy the debug configuration template:
   ```bash
   cp .env.debug.example .env.local
   ```

2. Edit `.env.local` and uncomment the debug categories you want:
   ```bash
   # Enable simulant Y positioning debug
   DEBUG_SIMULANT_Y_POSITIONING=true
   
   # Enable block Y positioning debug  
   DEBUG_BLOCK_Y_POSITIONING=true
   ```

3. Restart your development server:
   ```bash
   npm run dev
   ```

4. Open browser console to see debug output

## Environment Variables

| Variable | Description | Example Output |
|----------|-------------|----------------|
| `DEBUG_SIMULANT_Y_POSITIONING` | Logs simulant positioning decisions | `🤖 ℹ️ Default Y positioning for simulant test-123` |
| `DEBUG_BLOCK_Y_POSITIONING` | Logs block placement Y calculations | `🧱 ℹ️ Initial Y positioning for stone block abc-123` |
| `DEBUG_Y_LEVEL_VALIDATION` | Logs alignment checks and migrations | `📐 ⚠️ Y-level alignment check: MISALIGNED` |
| `DEBUG_POSITIONING_GENERAL` | Logs performance metrics and errors | `📍 ⚠️ Positioning performance: operation took 25ms` |

## Debug Output Format

Each debug message follows this format:
```
[EMOJI] [LEVEL] [TIMESTAMP] [CATEGORY]: [MESSAGE]
  {
    // Detailed data object
  }
```

### Example Output

**Simulant Positioning:**
```
🤖 ℹ️ [14:30:15.123] SIMULANT-Y-POSITIONING: Default Y positioning for simulant player-1 (Active simulant rendering)
  {
    simulantId: "player-1",
    position: { x: 5, y: 0.5, z: 3 },
    yLevel: 0.5,
    isGroundLevel: true,
    context: "Active simulant rendering"
  }
```

**Block Positioning:**
```
🧱 ℹ️ [14:30:15.456] BLOCK-Y-POSITIONING: Initial Y positioning for stone block block-abc-123
  {
    blockId: "block-abc-123", 
    blockType: "stone",
    position: { x: 2, y: 0, z: 4 },
    yLevel: 0,
    isFloorLevel: true,
    isPlayerLevel: false
  }
```

**Y-Level Validation:**
```
📐 ⚠️ [14:30:15.789] Y-LEVEL-VALIDATION: Y-level alignment check for Floor Alignment: MISALIGNED
  {
    context: "Floor Alignment",
    actualY: 0.3,
    expectedY: 0.5, 
    difference: 0.2,
    isAligned: false,
    tolerance: 0.01
  }
```

## Common Debugging Scenarios

### Simulants Floating or Sinking

**Problem**: AI simulants appear to float above the ground or sink into floors.

**Debug Configuration:**
```bash
DEBUG_SIMULANT_Y_POSITIONING=true
DEBUG_Y_LEVEL_VALIDATION=true
```

**What to Look For:**
- Check if `isGroundLevel: true` in simulant positioning logs
- Look for Y-level validation warnings about misalignment
- Verify simulant Y positions are close to 0.5 (player ground level)

### Blocks Not Aligning Properly

**Problem**: Blocks don't align correctly with player walking level or other blocks.

**Debug Configuration:**
```bash
DEBUG_BLOCK_Y_POSITIONING=true
DEBUG_Y_LEVEL_VALIDATION=true
```

**What to Look For:**
- Check `isFloorLevel` and `isPlayerLevel` flags in block positioning logs
- Look for Y-coordinate rounding/snapping adjustments
- Verify block top surfaces align with player ground level (0.5)

### Performance Issues with Positioning

**Problem**: Positioning calculations are causing frame rate drops.

**Debug Configuration:**
```bash
DEBUG_POSITIONING_GENERAL=true
```

**What to Look For:**
- Performance warnings for operations taking >16ms
- High entity counts in performance logs
- Frequent positioning updates

### Migration from Old Y-Level System

**Problem**: Existing content has incorrect Y-level positioning after system updates.

**Debug Configuration:**
```bash
DEBUG_Y_LEVEL_VALIDATION=true
DEBUG_POSITIONING_GENERAL=true
```

**What to Look For:**
- Y-level migration logs showing old → new value adjustments
- Validation failures indicating content that needs migration
- Constant usage logs showing which Y-level standards are being applied

## Y-Level Constants Reference

The system uses these key Y-level constants:

| Constant | Value | Purpose |
|----------|--------|---------|
| `WORLD_GROUND_PLANE` | 0.0 | Absolute world ground reference |
| `PLAYER_GROUND_LEVEL` | 0.5 | Player collision ground level |
| `DEFAULT_FLOOR_Y` | 0.0 | Default floor block placement |
| `BLOCK_HEIGHT` | 1.0 | Standard block height |

## Debug Log Levels

| Level | Symbol | When Used | Console Method |
|-------|--------|-----------|----------------|
| `info` | ℹ️ | Normal operations | `console.log` |
| `warn` | ⚠️ | Potential issues | `console.warn` |
| `error` | ❌ | Critical problems | `console.error` |
| `trace` | 🔍 | Detailed tracing | `console.log` |

## Performance Impact

- Debug logging has minimal performance overhead
- All logging is disabled automatically in production builds
- Console output can be significant with all categories enabled
- Enable only the categories you need for specific debugging

## Troubleshooting the Debug System

### Debug Logs Not Appearing

1. **Check Environment Variables**: Ensure variables are set to `true` or `1`
2. **Check Development Mode**: Debug logs only work in development (`NODE_ENV !== 'production'`)
3. **Restart Server**: Environment variable changes require server restart
4. **Check Browser Console**: Make sure console is open and not filtered

### Too Much Debug Output

1. **Enable Specific Categories**: Only enable the debug categories you need
2. **Use Console Filtering**: Filter console output by category (e.g., "SIMULANT-Y-POSITIONING")
3. **Temporary Disable**: Set variables to `false` to temporarily disable

### Debug System Status

You can check which debug categories are enabled:

```javascript
// In browser console
import debug from '@/utils/debugLogger';
debug.logStatus(); // Shows enabled categories
debug.getEnabledCategories(); // Returns array of enabled categories
```

## Integration with Existing Systems

The debug logging integrates with:

- **World Store**: Logs block placement and simulant management Y-level decisions
- **Simulant Manager**: Logs simulant spawning and positioning
- **Y-Level Constants**: Logs validation and constant usage
- **Simple Animated Avatar**: Logs avatar positioning

## Best Practices

1. **Start Small**: Enable one category at a time to avoid information overload
2. **Use Console Filtering**: Filter console output by emoji or category name
3. **Document Issues**: Copy relevant debug output when reporting issues
4. **Clean Up**: Disable debug logging when not needed to reduce console noise
5. **Production Safety**: Never commit `.env.local` with debug flags enabled

## API Reference

### Debug Functions

```typescript
// Simulant positioning debug
debugSimulantYPositioning.logDefaultPositioning(id, position, context)
debugSimulantYPositioning.logSpawnPositioning(id, position, reason)
debugSimulantYPositioning.logYAdjustment(id, oldY, newY, reason)

// Block positioning debug  
debugBlockYPositioning.logInitialPositioning(id, position, type)
debugBlockYPositioning.logPlacementCalculation(pos, calculatedY, reason)
debugBlockYPositioning.logYSnapping(originalY, snappedY, increment)

// Y-level validation debug
debugYLevelValidation.logAlignmentCheck(context, yValue, expectedY, isAligned)
debugYLevelValidation.logConstantUsage(constantName, value, usage)
debugYLevelValidation.logMigration(fromY, toY, reason)
```

### Utility Functions

```typescript
// Check if debugging is enabled
debug.isEnabled('simulant-y-positioning') // boolean

// Get debug status
debug.logStatus() // Logs current debug configuration
debug.getEnabledCategories() // string[]
debug.isAnyEnabled() // boolean
```

## Examples

### Example 1: Debug Simulant Spawning Issue

```bash
# .env.local
DEBUG_SIMULANT_Y_POSITIONING=true
```

Expected output when simulant spawns:
```
🤖 ℹ️ [14:30:15.123] SIMULANT-Y-POSITIONING: Spawning simulant test-simulant-1 - Test simulant creation
  {
    simulantId: "test-simulant-1",
    spawnPosition: { x: 0, y: 0, z: 0 },
    yLevel: 0,
    spawnReason: "Test simulant creation",
    timestamp: 1703682615123
  }
```

### Example 2: Debug Block Placement Alignment

```bash
# .env.local  
DEBUG_BLOCK_Y_POSITIONING=true
DEBUG_Y_LEVEL_VALIDATION=true
```

Expected output when placing block:
```
🧱 ℹ️ [14:30:15.456] BLOCK-Y-POSITIONING: Initial Y positioning for stone block block-123
  {
    blockId: "block-123",
    blockType: "stone", 
    position: { x: 2, y: 0, z: 4 },
    yLevel: 0,
    isFloorLevel: true,
    isPlayerLevel: false
  }

📐 ℹ️ [14:30:15.458] Y-LEVEL-VALIDATION: Y-level alignment check for Floor Alignment (validateFloorAlignment): ALIGNED
  {
    context: "Floor Alignment (validateFloorAlignment)",
    actualY: 0,
    expectedY: 0.5,
    difference: 0.5,
    isAligned: true,
    tolerance: 0.01
  }
```

### Example 3: Monitor Positioning Performance

```bash
# .env.local
DEBUG_POSITIONING_GENERAL=true
```

Expected output during intensive positioning:
```
📍 ⚠️ [14:30:15.789] POSITIONING-GENERAL: Positioning performance: bulk simulant update took 18.45ms for 25 entities
  {
    operation: "bulk simulant update",
    duration: 18.45,
    entityCount: 25,
    isSlowOperation: true,
    timestamp: 1703682615789
  }
```

## Support

If you encounter issues with the Y-level debug system:

1. Check this guide for common solutions
2. Verify your environment variable configuration
3. Check the browser console for debug output
4. Review the debug system source code in `utils/debugLogger.ts`

The debug system is designed to be self-documenting through its console output, providing all the information needed to understand and fix Y-level positioning issues.