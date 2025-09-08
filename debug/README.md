# Y-Level Debug System Implementation

This directory contains the Y-level debug logging system for the Descendants metaverse, providing comprehensive debugging tools for simulant and block positioning.

## Overview

The Y-level debug system helps developers troubleshoot positioning issues by providing detailed console logging for:

- **Simulant Y Positioning**: Default positioning, spawning, and Y-level adjustments
- **Block Y Positioning**: Initial placement, calculations, and grid snapping  
- **Y-Level Validation**: Alignment checks and migrations
- **General Positioning**: Performance metrics and error tracking

All debug logging is controlled by environment variables and automatically disabled in production.

## Files Structure

```
debug/
├── README.md                      # This file
├── index.ts                       # Main exports and utilities
├── YLevelDebugTest.tsx           # Interactive debug test panel
├── DebugIntegrationExample.tsx   # Integration usage examples
└── ...                           # Future debug components
```

## Quick Start

1. **Copy the debug configuration template:**
   ```bash
   cp .env.debug.example .env.local
   ```

2. **Enable debug categories in `.env.local`:**
   ```bash
   DEBUG_SIMULANT_Y_POSITIONING=true
   DEBUG_BLOCK_Y_POSITIONING=true
   ```

3. **Restart development server:**
   ```bash
   npm run dev
   ```

4. **Open browser console** to see debug output

## Environment Variables

| Variable | Purpose | Output Example |
|----------|---------|----------------|
| `DEBUG_SIMULANT_Y_POSITIONING` | Simulant positioning logs | `🤖 ℹ️ Default Y positioning for simulant test-123` |
| `DEBUG_BLOCK_Y_POSITIONING` | Block placement logs | `🧱 ℹ️ Initial Y positioning for stone block abc-123` |
| `DEBUG_Y_LEVEL_VALIDATION` | Y-level alignment checks | `📐 ⚠️ Y-level alignment check: MISALIGNED` |
| `DEBUG_POSITIONING_GENERAL` | Performance and errors | `📍 ⚠️ Positioning performance: operation took 25ms` |

## Integration Examples

### Basic Debug Logging

```tsx
import { debugSimulantYPositioning } from '../utils/debugLogger';

function MySimulantComponent({ simulant }) {
  React.useEffect(() => {
    debugSimulantYPositioning.logDefaultPositioning(
      simulant.id,
      simulant.position,
      'Component render'
    );
  }, [simulant]);

  return <div>Simulant content</div>;
}
```

### Conditional Debug Components

```tsx
import { DevOnly, shouldShowDebugComponents, YLevelDebugTest } from '../debug';

function MyGameComponent() {
  return (
    <div>
      <GameContent />
      
      <DevOnly>
        {shouldShowDebugComponents() && <YLevelDebugTest />}
      </DevOnly>
    </div>
  );
}
```

### Performance Monitoring

```tsx
import { debugPositioning } from '../utils/debugLogger';

function performBulkOperation() {
  const startTime = performance.now();
  
  // ... positioning operations
  
  const duration = performance.now() - startTime;
  debugPositioning.logPerformance('bulk operation', duration, entityCount);
}
```

## Debug Components

### YLevelDebugTest

Interactive test panel with buttons to trigger various Y-level positioning scenarios:

- ✅ Test correct simulant positioning
- ⚠️ Test incorrect simulant positioning  
- 🧱 Test block placement with Y calculations
- 📐 Test Y-level validation
- ⚡ Performance testing
- 🔄 Migration scenarios

### DebugIntegrationExample

Example component showing integration patterns and best practices:

- Environment setup instructions
- Console output explanations
- Troubleshooting guides
- Usage examples

## Debug Output Format

All debug messages follow this consistent format:

```
[EMOJI] [LEVEL] [TIMESTAMP] [CATEGORY]: [MESSAGE]
  {
    // Detailed data object
  }
```

**Example:**
```
🤖 ℹ️ [14:30:15.123] SIMULANT-Y-POSITIONING: Default Y positioning for simulant test-123
  {
    simulantId: "test-123",
    position: { x: 5, y: 0.5, z: 3 },
    yLevel: 0.5,
    isGroundLevel: true,
    context: "Active simulant rendering"
  }
```

## Y-Level Constants Reference

The system uses these key positioning constants:

```typescript
// From config/yLevelConstants.ts
WORLD_GROUND_PLANE: 0.0        // Absolute world ground
PLAYER_GROUND_LEVEL: 0.5       // Player collision level
DEFAULT_FLOOR_Y: 0.0           // Default floor placement
BLOCK_HEIGHT: 1.0              // Standard block height
```

## Common Debug Scenarios

### 1. Simulants Floating/Sinking

**Environment:**
```bash
DEBUG_SIMULANT_Y_POSITIONING=true
DEBUG_Y_LEVEL_VALIDATION=true
```

**What to check:**
- `isGroundLevel: true` in simulant logs
- Y positions close to 0.5 (player ground level)
- Alignment validation warnings

### 2. Block Placement Issues

**Environment:**
```bash
DEBUG_BLOCK_Y_POSITIONING=true
DEBUG_Y_LEVEL_VALIDATION=true
```

**What to check:**
- `isFloorLevel` and `isPlayerLevel` flags
- Y-coordinate rounding/snapping logs
- Block top surface alignment with player level

### 3. Performance Problems

**Environment:**
```bash
DEBUG_POSITIONING_GENERAL=true
```

**What to check:**
- Operations taking >16ms (frame budget)
- High entity counts in bulk operations
- Frequent positioning updates

### 4. System Migration

**Environment:**
```bash
DEBUG_Y_LEVEL_VALIDATION=true
```

**What to check:**
- Migration logs showing old → new values
- Validation failures needing migration
- Constant usage for proper standards

## Troubleshooting

### No Debug Output

1. Check environment variables are set to `true` or `1`
2. Verify `NODE_ENV !== 'production'`
3. Restart development server after env changes
4. Check browser console is open and not filtered

### Too Much Output

1. Enable only needed debug categories
2. Use console filtering (search for emoji or category)
3. Temporarily disable with `=false`

### Debug System Status

Check debug configuration in browser console:

```javascript
import debug from '@/utils/debugLogger';
debug.logStatus();           // Shows enabled categories
debug.getEnabledCategories(); // Returns enabled array
```

## Performance Impact

- Minimal overhead in development
- Automatically disabled in production
- Console output can be significant with all categories
- Enable only needed categories for specific debugging

## Integration Points

The debug system integrates with:

- **WorldStore**: Block placement and simulant management
- **SimulantManager**: Simulant spawning and positioning
- **SimpleAnimatedAvatar**: Avatar positioning validation  
- **Y-Level Constants**: Validation and migration
- **Block Factory**: Block creation and positioning

## Best Practices

1. **Start Small**: Enable one category at a time
2. **Use Filtering**: Filter console by emoji or category name
3. **Document Issues**: Copy debug output when reporting bugs
4. **Clean Up**: Disable debugging when not needed
5. **Production Safety**: Never commit `.env.local` with debug flags

## Future Enhancements

Planned debug system improvements:

- Visual 3D debug indicators in scene
- Debug data export/import functionality
- Performance profiling dashboard
- Automated debug test suites
- Debug session recording/playback

## Support

For debug system issues:

1. Check this README for common solutions
2. Review environment variable configuration
3. Examine debug system source in `utils/debugLogger.ts`
4. Use interactive test panel for validation
5. Check comprehensive guide in `docs/Y_LEVEL_DEBUG_GUIDE.md`

The debug system is designed to be self-documenting through console output, providing all information needed to understand and resolve Y-level positioning issues.