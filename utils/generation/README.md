# Island Generation System 🏝️

A comprehensive procedural island generation system for the Descendants project. This system creates organic, deterministic islands with region-based floor placement rules that match a specific reference diagram layout.

## 🌍 NEW: Massive Archipelago System

The system now includes a **Massive Archipelago Generator** with Minecraft-style optimization techniques for generating **5-10 huge islands (200-500 block radius)** with advanced performance features:

### Key Features
- **🏗️ Chunk-based Generation**: Memory-efficient streaming with 32x32 block chunks
- **📊 Level-of-Detail (LOD)**: Performance scaling based on distance
- **🔍 Spatial Partitioning**: QuadTree optimization for fast island queries  
- **⚡ Batched Placement**: Async block placement in configurable batches
- **🧠 Memory Management**: LRU chunk caching with configurable limits
- **🌿 8 Biome Types**: From tropical paradises to mystical realms
- **🎨 10 Presets**: Performance, Epic, Scenic, and Experimental categories

### Quick Massive Generation
```typescript
import { generateMassiveArchipelago, createDefaultMassiveConfig } from '@/utils/generation';

// Generate with defaults (5-8 islands, 2048x2048 world)
const result = await generateMassiveArchipelago();

// Use preset
import { createMassiveConfigFromPreset } from '@/utils/generation';
const config = createMassiveConfigFromPreset('paradise_islands');
const result = await generateMassiveArchipelago(config);

// Access blocks
const blocks = result.getAllBlocks();
console.log(`Generated ${blocks.length} blocks across ${result.islands.length} massive islands`);
```

## Overview

The Island Generation System produces contiguous, organic island shapes partitioned into three types of regions:
- **All (Blue)**: Mixed variety regions in the north-west
- **Unique (Orange)**: Non-repeating floor types along a diagonal chain
- **Pure (White)**: Single floor type regions forming an eastern arc

## Features

✅ **Deterministic Generation**: Same seed always produces identical results  
✅ **Organic Coastlines**: FBM noise creates natural-looking shores  
✅ **Region-Based Rules**: Three distinct placement strategies  
✅ **Configurable Palettes**: Customizable floor type selections  
✅ **Streaming Support**: Batched placement to avoid UI blocking  
✅ **Debug Visualization**: Real-time overlay showing regions and masks  
✅ **Performance Optimized**: Efficient algorithms for large islands  
✅ **React Integration**: Hooks and components for easy usage  

## Quick Start

### Basic Usage

```typescript
import { generateIsland, createDefaultIslandConfig } from '@/utils/generation';

// Create configuration
const config = createDefaultIslandConfig('my-seed', 'island-1');

// Generate island
const result = generateIsland(config);

// Access placements
result.placements.forEach(placement => {
  console.log(`Place ${placement.floorId} at (${placement.x}, ${placement.z})`);
});
```

### React Hook Usage

### Massive Archipelago Presets

| Category | Preset | Islands | World Size | Blocks | Memory |
|----------|--------|---------|------------|---------|---------|
| **Performance** | Performance Islands | 5-6 | 1536x1536 | ~50k | 128MB |
| **Epic** | Titan Archipelago | 8-10 | 4096x4096 | ~500k | 1GB |
| **Scenic** | Paradise Islands | 6-8 | 2560x2560 | ~200k | 384MB |
| **Experimental** | Ultimate Stress Test | 10-12 | 4608x4608 | ~750k | 1.5GB |

```typescript
import { useIslandGeneration } from '@/hooks/useIslandGeneration';

const MyComponent = () => {
  const {
    state,
    generateIsland,
    clearIsland,
    canGenerate
  } = useIslandGeneration({
    enableDevControls: true,
    getPlayerPosition: () => ({ x: 0, z: 0 }),
    defaultPreset: 'medium'
  });

  const handleGenerate = async () => {
    if (canGenerate()) {
      await generateIsland({
        size: { width: 128, height: 128 }
      });
    }
  };

  return (
    <div>
      <button onClick={handleGenerate} disabled={!canGenerate()}>
        {state.isGenerating ? 'Generating...' : 'Generate Island'}
      </button>
      {state.progress.value > 0 && (
        <div>Progress: {Math.round(state.progress.value * 100)}%</div>
      )}
    </div>
  );
};
```

### Development Controls

For development and testing, keyboard shortcuts are available:
- **Shift + I**: Generate island at current position
- **Shift + K**: Clear area at current position

## Architecture

### Core Components

```
utils/generation/
├── islands/
│   ├── IslandGenerator.ts      # Main generation logic
│   ├── types.ts               # TypeScript interfaces
│   └── integration.ts         # World store integration
├── noise/
│   └── NoiseGenerator.ts      # Simplex noise and FBM
├── rng/
│   └── DeterministicRNG.ts    # Seedable random number generator
└── __tests__/
    └── IslandGenerator.test.ts # Comprehensive test suite
```

### Generation Pipeline

1. **Seed & Space**: Initialize deterministic RNG and coordinate system
2. **Island Silhouette**: Create organic mask using radial falloff + FBM noise
3. **Region Layout**: Place seeds according to reference diagram pattern
4. **Region Assignment**: Voronoi partitioning with connectivity validation
5. **Palette Application**: Apply placement rules (All, Pure, Unique)
6. **Emission**: Convert to world coordinates and batch placement

## Configuration

### Island Generation Config

```typescript
interface IslandGenConfig {
  seed: number | string;          // Deterministic seed
  islandId: string;               // Unique identifier
  mask: IslandMaskConfig;         // Shape configuration
  layout: RegionLayoutConfig;     // Region placement
  palette: GlobalPalette;         // Floor type palettes
  grid: GridConfig;               // World placement
  debug?: DebugConfig;            // Debug options
}
```

### Presets

Several built-in presets are available:

- **Small**: 64x64, simple layout, fast generation
- **Medium**: 128x128, balanced detail and performance
- **Large**: 192x192, high detail, complex regions
- **Organic**: Enhanced noise for natural coastlines
- **Geometric**: Reduced noise for clean shapes

```typescript
import { getIslandPresets } from '@/utils/generation';

const presets = getIslandPresets();
const mediumConfig = {
  ...createDefaultIslandConfig('seed', 'island'),
  ...presets.medium
};
```

### Custom Palettes

Define custom floor type palettes:

```typescript
const customPalette: GlobalPalette = {
  all: [
    { id: BlockType.STONE, weight: 3 },
    { id: BlockType.WOOD, weight: 2 },
    { id: BlockType.FROSTED_GLASS, weight: 1 },
  ],
  exotic: [
    { id: BlockType.NUMBER_4, rarity: 5 },
    { id: BlockType.NUMBER_5, rarity: 3 },
  ],
  safeFallback: [BlockType.STONE, BlockType.WOOD]
};
```

## Region Rules

### All Regions (Blue)
- **Location**: North-west cluster (3 regions by default)
- **Behavior**: Weighted random selection from palette
- **Visual**: Mixed variety with subtle noise to prevent patterns

### Pure Regions (White)
- **Location**: Eastern arc (5-7 regions by default)
- **Behavior**: Single floor type per region
- **Visual**: Clean, uniform appearance within each region

### Unique Regions (Orange)
- **Location**: Diagonal chain from SW to E (5-6 regions by default)
- **Behavior**: No repeating floor types, distance constraints
- **Visual**: Distinct, non-repeating surfaces using exotic floors

## Performance

### Benchmarks
- **Small Island (64x64)**: ~5ms generation, ~500 blocks
- **Medium Island (128x128)**: ~15ms generation, ~3,000 blocks  
- **Large Island (192x192)**: ~35ms generation, ~8,000 blocks

### Optimization Features
- O(n) algorithms for core operations
- Spatial hash maps for efficient lookups
- Batched world store commits (configurable chunk size)
- Memory-efficient data structures
- Streaming support for large islands

## Debug Tools

### Debug Overlay
Visual debugging component showing:
- Island mask as cyan heatmap
- Region boundaries with color coding
- Seed positions with rule labels
- Real-time statistics

```typescript
import IslandDebugOverlay from '@/components/debug/IslandDebugOverlay';

<IslandDebugOverlay
  debugInfo={result.debug}
  width={300}
  height={300}
  visible={showDebug}
/>
```

### Development Panel
Comprehensive development interface with:
- Preset selection
- Real-time configuration editing
- Validation warnings
- Progress monitoring
- Generation statistics

```typescript
import IslandGenDevPanel from '@/components/debug/IslandGenDevPanel';

<IslandGenDevPanel
  visible={showPanel}
  playerPosition={playerPos}
/>
```

## API Reference

### Core Functions

```typescript
// Generate island with configuration
function generateIsland(config: IslandGenConfig): IslandGenResult

// Generate and commit to world store (streaming)
async function generateIslandAndCommit(
  config: IslandGenConfig,
  addBlockFn: (x: number, y: number, z: number, type: BlockType) => boolean,
  onProgress?: (progress: number) => void
): Promise<void>

// Create default configuration
function createDefaultIslandConfig(
  seed?: string | number,
  islandId?: string
): IslandGenConfig
```

### Integration Functions

```typescript
// Generate and place in world
async function generateAndPlaceIsland(
  config: IslandIntegrationConfig,
  worldStore: WorldStoreInterface
): Promise<IslandIntegrationResult>

// Clear region
async function clearIslandRegion(
  center: { x: number; z: number },
  size: { width: number; height: number },
  worldStore: WorldStoreInterface
): Promise<number>
```

### Utility Functions

```typescript
// Create deterministic RNG
function createDeterministicRNG(seed: number | string, suffix?: string): RNG

// Create noise generators
function createNoiseGenerator(rng: RNG): { simplex: SimplexNoise2D; fbm: FBMNoise }

// Get available presets
function getIslandPresets(): Record<string, Partial<IslandGenConfig>>
```

## Testing

The system includes comprehensive tests covering:

- **Determinism**: Same seed produces identical results
- **Region Rules**: Proper enforcement of All/Pure/Unique constraints
- **Spatial Coherence**: Regions form contiguous shapes
- **Performance**: Generation completes within time limits
- **Edge Cases**: Small islands, extreme configurations
- **Integration**: World store compatibility

Run tests:
```bash
npm test utils/generation/__tests__/IslandGenerator.test.ts
```

## Troubleshooting

### Common Issues

**Empty Island Generation**
- Check island radius vs grid size ratio
- Verify mask noise parameters aren't too aggressive
- Ensure palette contains valid floor types

**Performance Issues**
- Reduce island size or use smaller preset
- Lower FBM octave count in mask configuration
- Increase chunk size for batching

**Region Rule Violations**
- Check unique distance constraints for large regions
- Verify exotic palette has sufficient variety
- Ensure safe fallback palette is not empty

**Integration Problems**
- Confirm world store interface implementation
- Check block placement coordinates are valid
- Verify block types exist in game system

### Debug Logging

Enable debug logging for detailed generation info:

```typescript
const config = {
  ...defaultConfig,
  debug: {
    emitOverlay: true,
    labelRegions: true
  }
};

console.log('Generation started with seed:', config.seed);
const result = generateIsland(config);
console.log('Generated', result.placements.length, 'placements');
```

## Examples

### Custom Island with Specific Requirements

```typescript
const config: IslandGenConfig = {
  seed: 'volcanic-island-42',
  islandId: 'volcano-1',
  mask: {
    radius: 45,
    noiseFrequency: 1.2,
    noiseAmplitude: 0.25,
    fbmOctaves: 4,
    shoreSoftness: 0.6
  },
  layout: {
    allCount: 2,       // Fewer mixed regions
    pureCount: 8,      // More uniform areas
    uniqueCount: 4,    // Fewer unique spots
    uniqueNoRepeatDistance: 8,
    relaxIterations: 2  // More relaxation for smoother regions
  },
  palette: {
    all: [
      { id: BlockType.STONE, weight: 5 },  // Volcanic stone dominant
      { id: BlockType.LEAF, weight: 1 }    // Rare vegetation
    ],
    exotic: [
      { id: BlockType.NUMBER_6, rarity: 1 } // Lava flows
    ],
    safeFallback: [BlockType.STONE]
  },
  grid: {
    size: { width: 96, height: 96 },
    origin: { x: 100, z: -50 },
    yLevel: 0,
    chunkSize: 32
  }
};

const volcanicIsland = generateIsland(config);
```

### Streaming Large Island with Progress

```typescript
async function generateMassiveIsland() {
  const config = createDefaultIslandConfig('massive-seed', 'huge-island');
  config.grid.size = { width: 512, height: 512 };
  config.mask.radius = 240;

  await generateIslandAndCommit(
    config,
    (x, y, z, type) => worldStore.addBlock(new Vector3(x, y, z), type, 'generator'),
    (progress) => {
      console.log(`Generation progress: ${Math.round(progress * 100)}%`);
      updateProgressBar(progress);
    }
  );
}
```

## Contributing

When contributing to the island generation system:

1. **Maintain Determinism**: All changes must preserve seed-based determinism
2. **Add Tests**: Include tests for new features or bug fixes
3. **Performance**: Profile changes and ensure they don't regress performance
4. **Documentation**: Update this README and code comments
5. **TypeScript**: Maintain strict type safety

### Adding New Region Rules

To add a new region placement rule:

1. Add rule to `RegionRule` type in `types.ts`
2. Implement rule logic in `generateTilePlacements()`
3. Add rule to color mapping in debug overlay
4. Update tests to cover new rule behavior
5. Document rule behavior and use cases

## License

This island generation system is part of the Descendants project and follows the same license terms.

---

For more examples and detailed API documentation, see the inline code documentation and test files.