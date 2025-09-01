import { describe, it, expect, beforeEach } from 'vitest';
import { Vector3 } from 'three';
import { BlockFactory, createBlockLine, createBlockRectangle, getBlockTypeInfo, getAllBlockTypeInfo } from '../blockFactory';
import { Block, BlockType } from '../../types/blocks';

describe('BlockFactory', () => {
  let existingBlocks: Map<string, Block>;
  const worldLimits = { maxBlocks: 1000 };

  beforeEach(() => {
    existingBlocks = new Map();
  });

  describe('createBlock', () => {
    it('should create a valid block', () => {
      const result = BlockFactory.createBlock(
        {
          position: new Vector3(0, 0, 0),
          type: BlockType.STONE,
          createdBy: 'human'
        },
        existingBlocks,
        worldLimits
      );

      expect(result.block).toBeTruthy();
      expect(result.errors).toHaveLength(0);
      expect(result.block!.type).toBe(BlockType.STONE);
      expect(result.block!.position).toEqual({ x: 0, y: 0, z: 0 });
      expect(result.block!.metadata.createdBy).toBe('human');
    });

    it('should use custom color when provided', () => {
      const result = BlockFactory.createBlock(
        {
          position: new Vector3(0, 0, 0),
          type: BlockType.STONE,
          createdBy: 'human',
          customColor: '#FF0000'
        },
        existingBlocks,
        worldLimits
      );

      expect(result.block).toBeTruthy();
      expect(result.block!.color).toBe('#FF0000');
    });

    it('should use default color when no custom color provided', () => {
      const result = BlockFactory.createBlock(
        {
          position: new Vector3(0, 0, 0),
          type: BlockType.STONE,
          createdBy: 'human'
        },
        existingBlocks,
        worldLimits
      );

      expect(result.block).toBeTruthy();
      expect(result.block!.color).toBe('#666666'); // Default stone color
    });

    it('should return errors for invalid input', () => {
      const result = BlockFactory.createBlock(
        {
          position: new Vector3(0, 0, 0),
          type: 'invalid' as BlockType,
          createdBy: 'human'
        },
        existingBlocks,
        worldLimits
      );

      expect(result.block).toBeNull();
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('updateBlock', () => {
    let existingBlock: Block;

    beforeEach(() => {
      existingBlock = {
        id: 'test-1',
        position: { x: 0, y: 0, z: 0 },
        type: BlockType.STONE,
        color: '#666666',
        metadata: {
          createdAt: Date.now() - 1000,
          modifiedAt: Date.now() - 1000,
          createdBy: 'human'
        }
      };
    });

    it('should update block successfully', () => {
      const result = BlockFactory.updateBlock(
        {
          id: 'test-1',
          color: '#FF0000',
          modifiedBy: 'human'
        },
        existingBlock
      );

      expect(result.block).toBeTruthy();
      expect(result.errors).toHaveLength(0);
      expect(result.block!.color).toBe('#FF0000');
      expect(result.block!.metadata.modifiedAt).toBeGreaterThan(existingBlock.metadata.modifiedAt);
    });

    it('should preserve existing properties when updating', () => {
      const result = BlockFactory.updateBlock(
        {
          id: 'test-1',
          color: '#FF0000',
          modifiedBy: 'human'
        },
        existingBlock
      );

      expect(result.block!.id).toBe(existingBlock.id);
      expect(result.block!.position).toEqual(existingBlock.position);
      expect(result.block!.type).toBe(existingBlock.type);
      expect(result.block!.metadata.createdBy).toBe(existingBlock.metadata.createdBy);
    });
  });

  describe('createDefaultBlock', () => {
    it('should create block with default properties', () => {
      const block = BlockFactory.createDefaultBlock(
        BlockType.LEAF,
        new Vector3(1, 2, 3),
        'simulant-1'
      );

      expect(block.type).toBe(BlockType.LEAF);
      expect(block.position).toEqual({ x: 1, y: 2, z: 3 });
      expect(block.color).toBe('#4CAF50'); // Default leaf color
      expect(block.metadata.createdBy).toBe('simulant-1');
    });

    it('should throw error for invalid block type', () => {
      expect(() => {
        BlockFactory.createDefaultBlock(
          'invalid' as BlockType,
          new Vector3(0, 0, 0),
          'human'
        );
      }).toThrow();
    });
  });

  describe('createBlockPattern', () => {
    it('should create multiple blocks successfully', () => {
      const positions = [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
        { x: 2, y: 0, z: 0 }
      ];

      const result = BlockFactory.createBlockPattern(
        BlockType.WOOD,
        positions,
        'human',
        existingBlocks,
        worldLimits
      );

      expect(result.blocks).toHaveLength(3);
      expect(result.errors).toHaveLength(0);
      expect(result.skipped).toBe(0);
    });

    it('should skip blocks when world limit is reached', () => {
      // Fill existing blocks to near limit
      for (let i = 0; i < worldLimits.maxBlocks - 1; i++) {
        const block: Block = {
          id: `existing-${i}`,
          position: { x: i, y: 0, z: 0 },
          type: BlockType.STONE,
          color: '#666666',
          metadata: {
            createdAt: Date.now(),
            modifiedAt: Date.now(),
            createdBy: 'human'
          }
        };
        existingBlocks.set(`${i},0,0`, block);
      }

      const positions = [
        { x: 1000, y: 0, z: 0 },
        { x: 1001, y: 0, z: 0 },
        { x: 1002, y: 0, z: 0 }
      ];

      const result = BlockFactory.createBlockPattern(
        BlockType.WOOD,
        positions,
        'human',
        existingBlocks,
        worldLimits
      );

      expect(result.blocks).toHaveLength(1); // Only one block should be created
      expect(result.skipped).toBe(2);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('cloneBlock', () => {
    it('should clone block with new position and ID', () => {
      const originalBlock: Block = {
        id: 'original',
        position: { x: 0, y: 0, z: 0 },
        type: BlockType.STONE,
        color: '#666666',
        metadata: {
          createdAt: Date.now() - 1000,
          modifiedAt: Date.now() - 1000,
          createdBy: 'human',
          glow: 0.5,
          tags: ['test']
        }
      };

      const clonedBlock = BlockFactory.cloneBlock(
        originalBlock,
        new Vector3(5, 5, 5),
        'simulant-1'
      );

      expect(clonedBlock.id).not.toBe(originalBlock.id);
      expect(clonedBlock.position).toEqual({ x: 5, y: 5, z: 5 });
      expect(clonedBlock.type).toBe(originalBlock.type);
      expect(clonedBlock.color).toBe(originalBlock.color);
      expect(clonedBlock.metadata.createdBy).toBe('simulant-1');
      expect(clonedBlock.metadata.glow).toBe(0.5);
      expect(clonedBlock.metadata.tags).toEqual(['test']);
      expect(clonedBlock.metadata.version).toBe(1); // Reset version
    });
  });

  describe('createGlowingBlock', () => {
    it('should create glowing block for glowable type', () => {
      const block = BlockFactory.createGlowingBlock(
        BlockType.LEAF,
        new Vector3(0, 0, 0),
        'human',
        0.8
      );

      expect(block.type).toBe(BlockType.LEAF);
      expect(block.metadata.glow).toBe(0.8);
      expect(block.color).toBe('#2E7D32'); // Emissive color for leaf
    });

    it('should throw error for non-glowable block type', () => {
      expect(() => {
        BlockFactory.createGlowingBlock(
          BlockType.STONE,
          new Vector3(0, 0, 0),
          'human',
          0.5
        );
      }).toThrow();
    });

    it('should clamp glow intensity to valid range', () => {
      const block = BlockFactory.createGlowingBlock(
        BlockType.LEAF,
        new Vector3(0, 0, 0),
        'human',
        1.5 // Above max
      );

      expect(block.metadata.glow).toBe(1);
    });
  });

  describe('sanitizeBlock', () => {
    it('should sanitize valid block data', () => {
      const blockData = {
        id: 'test-1',
        position: { x: 1, y: 2, z: 3 },
        type: 'stone',
        color: '#666666',
        metadata: {
          createdAt: Date.now(),
          modifiedAt: Date.now(),
          createdBy: 'human'
        }
      };

      const sanitized = BlockFactory.sanitizeBlock(blockData);

      expect(sanitized).toBeTruthy();
      expect(sanitized!.id).toBe('test-1');
      expect(sanitized!.type).toBe(BlockType.STONE);
    });

    it('should return null for invalid data', () => {
      const invalidData = {
        id: 'test-1',
        // Missing position
        type: 'stone',
        color: '#666666'
      };

      const sanitized = BlockFactory.sanitizeBlock(invalidData);
      expect(sanitized).toBeNull();
    });

    it('should sanitize and clamp numeric values', () => {
      const blockData = {
        id: 'test-1',
        position: { x: 1.7, y: 2.3, z: 3.9 },
        type: 'leaf',
        color: '#4CAF50',
        metadata: {
          createdAt: Date.now(),
          modifiedAt: Date.now(),
          createdBy: 'human',
          glow: 1.5, // Above max
          durability: -0.1 // Below min
        }
      };

      const sanitized = BlockFactory.sanitizeBlock(blockData);

      expect(sanitized).toBeTruthy();
      expect(sanitized!.position).toEqual({ x: 2, y: 2, z: 4 }); // Rounded
      expect(sanitized!.metadata.glow).toBe(1); // Clamped to max
      expect(sanitized!.metadata.durability).toBe(0); // Clamped to min
    });
  });
});

describe('Utility Functions', () => {
  describe('createBlockLine', () => {
    it('should create line between two points', () => {
      const positions = createBlockLine(
        { x: 0, y: 0, z: 0 },
        { x: 3, y: 0, z: 0 },
        BlockType.STONE,
        'human'
      );

      expect(positions.length).toBeGreaterThan(1);
      expect(positions[0]).toEqual({ x: 0, y: 0, z: 0 });
      // The line should include the end point
      expect(positions).toContainEqual({ x: 3, y: 0, z: 0 });
    });
  });

  describe('createBlockRectangle', () => {
    it('should create solid rectangle', () => {
      const positions = createBlockRectangle(
        { x: 0, y: 0, z: 0 },
        { x: 2, y: 2, z: 0 },
        BlockType.STONE,
        'human',
        false
      );

      expect(positions).toHaveLength(9); // 3x3 rectangle
    });

    it('should create hollow rectangle', () => {
      const positions = createBlockRectangle(
        { x: 1, y: 1, z: 1 },
        { x: 3, y: 3, z: 3 },
        BlockType.STONE,
        'human',
        true
      );

      // For a 3x3x3 cube, hollow should have only the faces, not the interior
      // Total blocks = 27, interior blocks = 1 (center), so hollow = 26
      const solidPositions = createBlockRectangle(
        { x: 1, y: 1, z: 1 },
        { x: 3, y: 3, z: 3 },
        BlockType.STONE,
        'human',
        false
      );
      
      expect(positions.length).toBeLessThan(solidPositions.length); // Hollow should have fewer blocks
      expect(positions.length).toBeGreaterThan(0); // But should still have some blocks
    });
  });

  describe('getBlockTypeInfo', () => {
    it('should return block type information', () => {
      const info = getBlockTypeInfo(BlockType.STONE);

      expect(info.type).toBe(BlockType.STONE);
      expect(info.displayName).toBe('Stone Block');
      expect(info.color).toBe('#666666');
      expect(info.description).toContain('foundation');
      expect(info.canGlow).toBe(false);
      expect(info.textureUrl).toBe('/Stone_texture.webp');
    });
  });

  describe('getAllBlockTypeInfo', () => {
    it('should return information for all block types', () => {
      const allInfo = getAllBlockTypeInfo();

      expect(allInfo).toHaveLength(3);
      expect(allInfo.map(info => info.type)).toEqual(
        expect.arrayContaining([BlockType.STONE, BlockType.LEAF, BlockType.WOOD])
      );
    });
  });
});