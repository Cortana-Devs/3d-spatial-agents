/**
 * Grid System Example - Descendants Metaverse Editor
 *
 * This example demonstrates the intelligent grid system with spatial indexing,
 * snap-to-grid functionality, and interaction ripples.
 */

import { Vector3 } from "three";
import { GridUtils } from "@components/world/GridSystem";

// Example 1: Basic Grid Operations
console.log("=== Grid System Example ===\n");

// Snap arbitrary positions to grid
const positions = [
  new Vector3(1.7, 2.3, -0.8),
  new Vector3(-3.2, 0.6, 4.9),
  new Vector3(0.1, -0.4, 0.5),
];

console.log("1. Snap-to-Grid Operations:");
positions.forEach((pos, index) => {
  const snapped = GridUtils.snapToGrid(pos, 1);
  console.log(
    `Position ${index + 1}: (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}) → (${snapped.x}, ${snapped.y}, ${snapped.z})`,
  );
});

// Example 2: Grid Cell Conversion
console.log("\n2. Grid Cell Conversion:");
const worldPos = new Vector3(5, -3, 2);
const cell = GridUtils.getGridCell(worldPos, 1);
const backToWorld = GridUtils.gridCellToWorld(cell, 1);

console.log(`World Position: (${worldPos.x}, ${worldPos.y}, ${worldPos.z})`);
console.log(`Grid Cell: (${cell.x}, ${cell.y}, ${cell.z})`);
console.log(
  `Back to World: (${backToWorld.x}, ${backToWorld.y}, ${backToWorld.z})`,
);

// Example 3: Different Cell Sizes
console.log("\n3. Different Cell Sizes:");
const testPos = new Vector3(3.7, 4.3, -1.8);

[0.5, 1, 2, 5].forEach((cellSize) => {
  const snapped = GridUtils.snapToGrid(testPos, cellSize);
  console.log(
    `Cell Size ${cellSize}: (${testPos.x}, ${testPos.y}, ${testPos.z}) → (${snapped.x}, ${snapped.y}, ${snapped.z})`,
  );
});

// Example 4: Grid Validation
console.log("\n4. Grid Position Validation:");
const testPositions = [
  new Vector3(2, 3, -1), // On grid
  new Vector3(2.5, 3, -1), // Off grid
  new Vector3(0, 0, 0), // Origin
  new Vector3(-5, 10, 7), // Negative coordinates
];

testPositions.forEach((pos, index) => {
  const isOnGrid = GridUtils.isOnGrid(pos, 1);
  console.log(
    `Position ${index + 1}: (${pos.x}, ${pos.y}, ${pos.z}) - ${isOnGrid ? "ON GRID" : "OFF GRID"}`,
  );
});

// Example 5: Performance Test
console.log("\n5. Performance Test:");
const startTime = performance.now();
const iterations = 10000;

for (let i = 0; i < iterations; i++) {
  const randomPos = new Vector3(
    Math.random() * 100 - 50,
    Math.random() * 100 - 50,
    Math.random() * 100 - 50,
  );

  const snapped = GridUtils.snapToGrid(randomPos, 1);
  GridUtils.isOnGrid(snapped, 1);
  const cell = GridUtils.getGridCell(snapped, 1);
  GridUtils.gridCellToWorld(cell, 1);
}

const endTime = performance.now();
const duration = endTime - startTime;

console.log(
  `Completed ${iterations} grid operations in ${duration.toFixed(2)}ms`,
);
console.log(
  `Average: ${((duration / iterations) * 1000).toFixed(3)}μs per operation`,
);

// Example 6: Spatial Indexing Simulation
console.log("\n6. Spatial Indexing Simulation:");

// Simulate a world with blocks placed on a grid
const worldBlocks = new Map<string, { position: Vector3; type: string }>();

// Place some blocks
const blockPositions = [
  new Vector3(0, 0, 0),
  new Vector3(1, 0, 0),
  new Vector3(0, 1, 0),
  new Vector3(1, 1, 0),
  new Vector3(2, 0, 0),
];

blockPositions.forEach((pos, index) => {
  const key = `${pos.x},${pos.y},${pos.z}`;
  worldBlocks.set(key, {
    position: pos,
    type: index % 2 === 0 ? "stone" : "wood",
  });
});

console.log(`Created world with ${worldBlocks.size} blocks:`);
worldBlocks.forEach((block, key) => {
  console.log(`  ${key}: ${block.type}`);
});

// Simulate block lookup by position
const lookupPos = new Vector3(1, 1, 0);
const lookupKey = `${lookupPos.x},${lookupPos.y},${lookupPos.z}`;
const foundBlock = worldBlocks.get(lookupKey);

console.log(
  `\nLooking up block at (${lookupPos.x}, ${lookupPos.y}, ${lookupPos.z}):`,
);
console.log(foundBlock ? `Found: ${foundBlock.type}` : "Not found");

// Example 7: Grid Configuration Scenarios
console.log("\n7. Grid Configuration Scenarios:");

const configurations = [
  {
    name: "Fine Detail",
    cellSize: 0.5,
    description: "High precision building",
  },
  { name: "Standard", cellSize: 1, description: "Default block placement" },
  { name: "Large Scale", cellSize: 2, description: "Architectural planning" },
  { name: "Mega Structures", cellSize: 5, description: "City-scale building" },
];

const samplePos = new Vector3(7.3, 4.8, -2.1);

configurations.forEach((config) => {
  const snapped = GridUtils.snapToGrid(samplePos, config.cellSize);
  console.log(
    `${config.name} (${config.cellSize}): (${samplePos.x}, ${samplePos.y}, ${samplePos.z}) → (${snapped.x}, ${snapped.y}, ${snapped.z}) - ${config.description}`,
  );
});

console.log("\n=== Grid System Example Complete ===");

// Export for use in other examples
export const GridSystemExample = {
  demonstrateSnapToGrid: (position: Vector3, cellSize: number = 1) => {
    const snapped = GridUtils.snapToGrid(position, cellSize);
    console.log(
      `Snapped (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}) to (${snapped.x}, ${snapped.y}, ${snapped.z})`,
    );
    return snapped;
  },

  validateGridPosition: (position: Vector3, cellSize: number = 1) => {
    const isValid = GridUtils.isOnGrid(position, cellSize);
    console.log(
      `Position (${position.x}, ${position.y}, ${position.z}) is ${isValid ? "valid" : "invalid"} for grid with cell size ${cellSize}`,
    );
    return isValid;
  },

  performanceTest: (iterations: number = 1000) => {
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      const pos = new Vector3(
        Math.random() * 10,
        Math.random() * 10,
        Math.random() * 10,
      );
      GridUtils.snapToGrid(pos, 1);
    }

    const duration = performance.now() - startTime;
    console.log(
      `${iterations} operations completed in ${duration.toFixed(2)}ms`,
    );
    return duration;
  },
};
