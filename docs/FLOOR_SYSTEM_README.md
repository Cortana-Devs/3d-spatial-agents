# Floor Block System - Descendants Metaverse Editor

## Overview

The Floor Block System provides a comprehensive solution for creating and managing floor blocks that cover the full grid area in the Descendants Metaverse Editor. This system integrates seamlessly with the existing block and grid systems to provide users with powerful floor creation tools.

## Features

### ✨ Core Features
- **Full Grid Coverage**: Floor blocks can cover the entire grid area with a single component
- **Multiple Block Types**: Support for Stone, Wood, Glass, and custom floor block types
- **Pattern Support**: Various floor patterns including solid, checkerboard, border, cross, and diagonal
- **Quick Actions**: One-click floor placement with preset configurations
- **Advanced Controls**: Detailed configuration panel for custom floor creation
- **Performance Optimized**: Efficient rendering and memory management

### 🎮 User Interface
- **Floating Sidebar Integration**: Floor controls integrated into the main sidebar
- **Keyboard Shortcuts**: Quick access via keyboard (F key for stone floor)
- **Visual Feedback**: Real-time preview and status indicators
- **Block Counter Integration**: Automatic tracking of placed floor blocks

## Components

### 1. FloorBlock Component (`components/world/FloorBlock.tsx`)

The main rendering component for individual floor blocks.

**Props:**
- `size`: Size of the floor in grid units (default: 50)
- `position`: Center position of the floor (default: Vector3(0, -0.5, 0))
- `blockType`: Type of block to use (default: BlockType.STONE)
- `textureRepeat`: Texture repetition factor
- `onInteract`: Callback for interaction events

**Features:**
- Automatic texture loading and UV mapping
- Support for all existing block types
- Emissive properties for glowing blocks
- Click interaction handling

### 2. FloorManager (`utils/floorManager.ts`)

Utility class for programmatic floor placement and management.

**Key Methods:**
- `placeSolidFloor(config)`: Places a solid floor of specified type
- `placeCheckerboardFloor(primary, secondary, config)`: Creates checkerboard pattern
- `placeBorderFloor(center, border, config)`: Creates border pattern
- `placeCrossFloor(center, cross, config)`: Creates cross pattern
- `clearFloor(region)`: Removes floor blocks in specified area
- `fillFloorHoles(region, blockType)`: Fills gaps in existing floors

### 3. FloorControlPanel (`components/world/FloorControlPanel.tsx`)

Advanced floor configuration interface with full customization options.

**Features:**
- Pattern selection (solid, checkerboard, border, cross, diagonal)
- Block type selection with visual previews
- Size and position controls
- Replace existing blocks option
- Real-time block count tracking
- Performance warnings

## Usage Guide

### Quick Floor Placement

#### Via Keyboard Shortcut
```typescript
// Press 'F' key anywhere in the app
// Automatically places a stone floor covering the current grid size
```

#### Via Floating Sidebar
1. Open the Floating Sidebar
2. Navigate to the "Floor" tab
3. Click on desired floor type:
   - Stone Floor
   - Wood Floor
   - Glass Floor
   - Checker Pattern

#### Programmatic Usage
```typescript
import { floorManager, quickFloorUtils } from '../utils/floorManager';

// Quick methods
quickFloorUtils.placeStoneFloor(50);
quickFloorUtils.placeWoodFloor(25);
quickFloorUtils.placeGlassFloor(30);
quickFloorUtils.placeCheckerFloor(40);
quickFloorUtils.clearFloorArea(50);

// Advanced configuration
floorManager.placeFloor({
  blockType: BlockType.STONE,
  pattern: "checkerboard",
  size: 50,
  centerPosition: new Vector3(0, 0, 0),
  yLevel: 0, // Floor blocks at Y=0, top face at Y=0.5 (player ground level)
  replaceExisting: false,
  fillHoles: true
});
```

### Advanced Floor Creation

#### Custom Patterns
```typescript
// Create a custom 4x4 pattern
const customPattern = [
  BlockType.STONE, BlockType.WOOD, BlockType.STONE, BlockType.WOOD,
  BlockType.WOOD, BlockType.GLASS, BlockType.GLASS, BlockType.STONE,
  BlockType.STONE, BlockType.GLASS, BlockType.GLASS, BlockType.WOOD,
  BlockType.WOOD, BlockType.STONE, BlockType.WOOD, BlockType.STONE,
];

floorManager.placeCustomPatternFloor({
  blockType: BlockType.STONE, // Default type
  customPattern: customPattern,
  size: 16, // Will repeat the 4x4 pattern
  centerPosition: new Vector3(0, 0, 0),
  yLevel: 0 // Floor blocks at Y=0, walkable surface at Y=0.5
});
```

#### Region-based Operations
```typescript
// Clear a specific region
floorManager.clearFloor({
  minX: -25,
  maxX: 25,
  minZ: -25,
  maxZ: 25,
  yLevel: 0
});

// Fill holes in existing floor
floorManager.fillFloorHoles({
  minX: -10,
  maxX: 10,
  minZ: -10,
  maxZ: 10,
  yLevel: 0
}, BlockType.STONE);
```

## Configuration Options

### FloorConfiguration Interface
```typescript
interface FloorConfiguration {
  blockType: BlockType;                    // Primary block type
  pattern?: "solid" | "checkerboard" | "border" | "cross" | "diagonal" | "custom";
  customPattern?: BlockType[];             // Custom pattern array (for "custom" pattern)
  size: number;                           // Size in grid units
  centerPosition?: Vector3;               // Center position (default: 0,0,0)
  yLevel?: number;                        // Y level for placement (default: 0, top face at 0.5)
  fillHoles?: boolean;                    // Fill existing holes
  replaceExisting?: boolean;              // Replace existing blocks
}
```

### Pattern Types

1. **Solid**: Uniform floor using single block type
2. **Checkerboard**: Alternating pattern with two block types
3. **Border**: Different block type for edges
4. **Cross**: Cross pattern through the center
5. **Diagonal**: Diagonal stripe pattern
6. **Custom**: User-defined pattern from array

## Integration with Existing Systems

### Block System Integration
- Uses existing `BlockType` enum and `BLOCK_DEFINITIONS`
- Integrates with world store for block placement/removal
- Respects block limits and validation rules

### Grid System Integration
- Automatically uses current grid configuration
- Respects grid size and cell size settings
- Snaps to grid alignment

### Performance Considerations
- Efficient batch placement operations
- Memory-optimized rendering for large floors
- LOD system for distance-based optimization
- Frustum culling for off-screen floor sections

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `F` | Place stone floor covering current grid |
| `G` | Toggle grid visibility (existing) |
| `0-9` | Block selection (existing) |

## Block Types Supported

All existing block types are supported:
- **STONE**: Solid stone floor with texture
- **WOOD**: Wooden floor with warm tones
- **LEAF**: Organic leaf floor with subtle glow
- **FROSTED_GLASS**: Transparent frosted glass
- **FLOOR**: Dedicated floor block type
- **NUMBER_4-7**: Special numbered blocks

## Performance Optimization

### Memory Management
- Instanced rendering for repeated patterns
- Texture atlas optimization
- Automatic LOD based on camera distance

### Rendering Optimization
- Frustum culling
- Batch operations
- GPU-optimized shaders

### User Experience
- Progressive loading for large floors
- Visual feedback during placement
- Undo/redo support through world store

## Future Enhancements

### Planned Features
- **Animated Floors**: Moving/rotating floor patterns
- **Procedural Textures**: Generated floor textures
- **Multi-level Floors**: Stacked floor systems
- **Floor Physics**: Walkable surface properties
- **Custom Materials**: User-defined floor materials

### API Extensions
- Floor templates and presets
- Import/export floor configurations
- Collaborative floor editing
- Version control for floor designs

## Troubleshooting

### Common Issues

#### Floor Not Appearing
- Check Y level (default is 0, creates walkable surface at 0.5)
- Verify block limits not exceeded
- Ensure grid is visible
- Check console for error messages

#### Performance Issues
- Reduce floor size for testing
- Check block count limits
- Disable advanced effects temporarily
- Monitor GPU memory usage

#### Pattern Not Working
- Verify custom pattern array is perfect square
- Check pattern size calculations
- Ensure block types are valid
- Test with simple patterns first

### Debug Commands
```typescript
// Enable floor debug logging
console.log("Floor Manager:", floorManager);

// Check current block count
const { blockCount, worldLimits } = useWorldStore.getState();
console.log(`Blocks: ${blockCount}/${worldLimits.maxBlocks}`);

// Test floor placement
quickFloorUtils.placeStoneFloor(10); // Small test floor
```

## Contributing

When contributing to the floor system:

1. **Follow TypeScript patterns**: Use proper typing for all interfaces
2. **Performance first**: Consider memory and rendering impact
3. **User experience**: Provide clear feedback and error handling
4. **Documentation**: Update this README for new features
5. **Testing**: Test with various grid sizes and block limits

## License

This floor system is part of the Descendants Metaverse Editor and follows the same license terms as the main project.

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Compatibility**: Descendants Metaverse Editor v2.0+