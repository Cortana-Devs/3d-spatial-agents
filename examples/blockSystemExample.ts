/**
 * Example usage of the enhanced block system
 * This file demonstrates how to use the block validation, factory, and integration utilities
 */

import { Vector3 } from 'three';
import { 
  BlockType, 
  BlockFactory, 
  BlockValidator, 
  createValidatedBlock,
  createBlockBatch,
  getBlockTypeStatistics,
  validateWorldState,
  exportWorldData,
  importWorldData,
  createBlockLine,
  createBlockRectangle,
  getBlockTypeInfo,
  getAllBlockTypeInfo
} from '../utils';
import { useWorldStore } from '../store/worldStore';

/**
 * Example 1: Basic block creation with validation
 */
export function exampleBasicBlockCreation() {
  console.log('=== Basic Block Creation Example ===');
  
  // Create a stone block at origin
  const result = createValidatedBlock(
    new Vector3(0, 0, 0),
    BlockType.STONE,
    'human'
  );
  
  if (result.success) {
    console.log(`✅ Successfully created block with ID: ${result.blockId}`);
  } else {
    console.log(`❌ Failed to create block: ${result.errors.join(', ')}`);
  }
  
  // Try to create another block at the same position (should fail)
  const duplicateResult = createValidatedBlock(
    new Vector3(0, 0, 0),
    BlockType.LEAF,
    'human'
  );
  
  if (!duplicateResult.success) {
    console.log(`✅ Correctly prevented duplicate placement: ${duplicateResult.errors.join(', ')}`);
  }
}

/**
 * Example 2: Batch block creation
 */
export function exampleBatchBlockCreation() {
  console.log('\n=== Batch Block Creation Example ===');
  
  const blockParams = [
    { position: new Vector3(1, 0, 0), type: BlockType.STONE, createdBy: 'human' },
    { position: new Vector3(2, 0, 0), type: BlockType.LEAF, createdBy: 'human' },
    { position: new Vector3(3, 0, 0), type: BlockType.WOOD, createdBy: 'human' },
    { position: new Vector3(4, 0, 0), type: BlockType.STONE, createdBy: 'simulant-1', customColor: '#FF0000' }
  ];
  
  const result = createBlockBatch(blockParams, true);
  
  console.log(`✅ Created ${result.successful} blocks successfully`);
  console.log(`❌ Failed to create ${result.failed} blocks`);
  
  if (result.errors.length > 0) {
    console.log(`Errors: ${result.errors.join(', ')}`);
  }
}

/**
 * Example 3: Creating block patterns
 */
export function exampleBlockPatterns() {
  console.log('\n=== Block Patterns Example ===');
  
  // Create a line of blocks
  const linePositions = createBlockLine(
    { x: 5, y: 0, z: 0 },
    { x: 10, y: 0, z: 0 },
    BlockType.STONE,
    'human'
  );
  
  console.log(`📏 Line pattern created with ${linePositions.length} positions`);
  
  // Create a hollow rectangle
  const rectanglePositions = createBlockRectangle(
    { x: 0, y: 1, z: 0 },
    { x: 4, y: 1, z: 4 },
    BlockType.LEAF,
    'human',
    true // hollow
  );
  
  console.log(`🔲 Hollow rectangle pattern created with ${rectanglePositions.length} positions`);
  
  // Batch create the rectangle
  const rectangleParams = rectanglePositions.map(pos => ({
    position: pos,
    type: BlockType.LEAF,
    createdBy: 'human'
  }));
  
  const rectangleResult = createBlockBatch(rectangleParams, false);
  console.log(`✅ Rectangle: ${rectangleResult.successful} blocks created, ${rectangleResult.failed} failed`);
}

/**
 * Example 4: Block type information and statistics
 */
export function exampleBlockInformation() {
  console.log('\n=== Block Information Example ===');
  
  // Get information about all block types
  const allBlockTypes = getAllBlockTypeInfo();
  console.log('📋 Available block types:');
  allBlockTypes.forEach(info => {
    console.log(`  - ${info.displayName} (${info.type}): ${info.description}`);
    console.log(`    Color: ${info.color}, Can glow: ${info.canGlow}, Texture: ${info.textureUrl || 'None'}`);
  });
  
  // Get current world statistics
  const stats = getBlockTypeStatistics();
  console.log('\n📊 Current world statistics:');
  console.log(`  Total blocks: ${stats.totalBlocks}`);
  console.log(`  By type: Stone=${stats.byType.stone}, Leaf=${stats.byType.leaf}, Wood=${stats.byType.wood}`);
  console.log(`  By creator:`, stats.byCreator);
  console.log(`  Average age: ${Math.round(stats.averageAge / 1000)}s`);
}

/**
 * Example 5: World validation and cleanup
 */
export function exampleWorldValidation() {
  console.log('\n=== World Validation Example ===');
  
  const validation = validateWorldState();
  
  if (validation.isValid) {
    console.log('✅ World state is valid');
  } else {
    console.log('❌ World state has issues:');
    validation.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  console.log(`📊 Validation summary:`);
  console.log(`  Total blocks: ${validation.blockCount}`);
  console.log(`  Valid blocks: ${validation.validBlocks}`);
  console.log(`  Invalid blocks: ${validation.invalidBlocks}`);
  
  if (validation.warnings.length > 0) {
    console.log('⚠️ Warnings:');
    validation.warnings.forEach(warning => console.log(`  - ${warning}`));
  }
}

/**
 * Example 6: World export and import
 */
export function exampleWorldExportImport() {
  console.log('\n=== World Export/Import Example ===');
  
  // Export current world
  const exportResult = exportWorldData();
  
  if (exportResult.success && exportResult.data) {
    console.log('✅ World exported successfully');
    console.log(`📦 Export contains ${exportResult.data.blocks.length} blocks`);
    console.log(`📅 Exported at: ${new Date(exportResult.data.metadata.exportedAt).toISOString()}`);
    
    // Clear world and import it back
    const store = useWorldStore.getState();
    const originalBlockCount = store.blockCount;
    
    console.log('\n🧹 Clearing world for import test...');
    store.clearWorld();
    console.log(`World cleared. Block count: ${useWorldStore.getState().blockCount}`);
    
    // Import the data back
    const importResult = importWorldData(exportResult.data);
    
    if (importResult.success) {
      console.log('✅ World imported successfully');
      console.log(`📥 Imported ${importResult.importedBlocks} blocks`);
      console.log(`⏭️ Skipped ${importResult.skippedBlocks} blocks`);
      
      const newBlockCount = useWorldStore.getState().blockCount;
      console.log(`📊 Block count after import: ${newBlockCount} (original: ${originalBlockCount})`);
    } else {
      console.log('❌ World import failed:');
      importResult.errors.forEach(error => console.log(`  - ${error}`));
    }
  } else {
    console.log('❌ World export failed:');
    exportResult.errors.forEach(error => console.log(`  - ${error}`));
  }
}

/**
 * Example 7: Advanced block creation with custom properties
 */
export function exampleAdvancedBlockCreation() {
  console.log('\n=== Advanced Block Creation Example ===');
  
  // Create a glowing leaf block
  try {
    const glowingBlock = BlockFactory.createGlowingBlock(
      BlockType.LEAF,
      new Vector3(0, 2, 0),
      'human',
      0.8
    );
    
    console.log('✨ Created glowing block:');
    console.log(`  ID: ${glowingBlock.id}`);
    console.log(`  Type: ${glowingBlock.type}`);
    console.log(`  Glow intensity: ${glowingBlock.metadata.glow}`);
    console.log(`  Color: ${glowingBlock.color}`);
  } catch (error) {
    console.log(`❌ Failed to create glowing block: ${error}`);
  }
  
  // Create a block with custom metadata
  const customBlock = BlockFactory.createDefaultBlock(
    BlockType.WOOD,
    new Vector3(1, 2, 0),
    'simulant-architect'
  );
  
  // Add custom metadata
  customBlock.metadata.tags = ['structure', 'foundation'];
  customBlock.metadata.customProperties = {
    buildingPart: 'foundation',
    architect: 'simulant-architect',
    buildDate: new Date().toISOString()
  };
  
  console.log('🏗️ Created custom block with metadata:');
  console.log(`  Tags: ${customBlock.metadata.tags?.join(', ')}`);
  console.log(`  Custom properties:`, customBlock.metadata.customProperties);
}

/**
 * Run all examples
 */
export function runAllBlockExamples() {
  console.log('🚀 Running Block System Examples\n');
  
  // Reset world store for clean examples
  const store = useWorldStore.getState();
  store.resetStore();
  
  try {
    exampleBasicBlockCreation();
    exampleBatchBlockCreation();
    exampleBlockPatterns();
    exampleBlockInformation();
    exampleWorldValidation();
    exampleAdvancedBlockCreation();
    exampleWorldExportImport();
    
    console.log('\n✅ All examples completed successfully!');
    
    // Final world state
    const finalStats = getBlockTypeStatistics();
    console.log(`\n📊 Final world state: ${finalStats.totalBlocks} total blocks`);
    
  } catch (error) {
    console.error('❌ Error running examples:', error);
  }
}

// Individual examples are already exported above as named exports