import { describe, it, expect, beforeEach } from 'vitest';
import { Vector3 } from 'three';
import {
  BlockValidator,
  validateBlockType,
  validateBlockPosition,
  validateTimestamp,
  createDefaultMetadata,
  canModifyBlock,
  getValidationErrorMessage
} from '../blockValidation';
import {
  Block,
  BlockType,
  BlockValidationError,
  CreateBlockParams,
  UpdateBlockParams
} from '../../types/blocks';

describe('BlockValidator', () => {
  let existingBlocks: Map<string, Block>;
  const worldLimits = { maxBlocks: 1000 };

  beforeEach(() => {
    existingBlocks = new Map();
  });

  describe('validateCreateBlock', () => {
    it('should validate a valid block creation', () => {
      const params: CreateBlockParams = {
        position: new Vector3(0, 0, 0),
        type: BlockType.STONE,
        createdBy: 'human'
      };

      const result = BlockValidator.validateCreateBlock(params, existingBlocks, worldLimits);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid block type', () => {
      const params: CreateBlockParams = {
        position: new Vector3(0, 0, 0),
        type: 'invalid' as BlockType,
        createdBy: 'human'
      };

      const result = BlockValidator.validateCreateBlock(params, existingBlocks, worldLimits);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(BlockValidationError.INVALID_TYPE);
    });

    it('should reject occupied position', () => {
      // Add existing block
      const existingBlock: Block = {
        id: 'test-1',
        position: { x: 0, y: 0, z: 0 },
        type: BlockType.STONE,
        color: '#666666',
        metadata: {
          createdAt: Date.now(),
          modifiedAt: Date.now(),
          createdBy: 'human'
        }
      };
      existingBlocks.set('0,0,0', existingBlock);

      const params: CreateBlockParams = {
        position: new Vector3(0, 0, 0),
        type: BlockType.WOOD,
        createdBy: 'human'
      };

      const result = BlockValidator.validateCreateBlock(params, existingBlocks, worldLimits);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(BlockValidationError.POSITION_OCCUPIED);
    });

    it('should reject when world limit is reached', () => {
      // Fill up to world limit
      for (let i = 0; i < worldLimits.maxBlocks; i++) {
        const block: Block = {
          id: `test-${i}`,
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

      const params: CreateBlockParams = {
        position: new Vector3(1001, 0, 0),
        type: BlockType.STONE,
        createdBy: 'human'
      };

      const result = BlockValidator.validateCreateBlock(params, existingBlocks, worldLimits);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(BlockValidationError.WORLD_LIMIT_REACHED);
    });

    it('should reject invalid position coordinates', () => {
      const params: CreateBlockParams = {
        position: { x: NaN, y: 0, z: 0 },
        type: BlockType.STONE,
        createdBy: 'human'
      };

      const result = BlockValidator.validateCreateBlock(params, existingBlocks, worldLimits);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(BlockValidationError.INVALID_POSITION);
    });

    it('should reject invalid custom color', () => {
      const params: CreateBlockParams = {
        position: new Vector3(0, 0, 0),
        type: BlockType.STONE,
        createdBy: 'human',
        customColor: 'invalid-color'
      };

      const result = BlockValidator.validateCreateBlock(params, existingBlocks, worldLimits);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(BlockValidationError.INVALID_COLOR);
    });

    it('should accept valid custom colors', () => {
      const validColors = ['#FF0000', '#f00', 'red', 'rgb(255, 0, 0)', 'hsl(0, 100%, 50%)'];
      
      validColors.forEach(color => {
        const params: CreateBlockParams = {
          position: new Vector3(Math.random() * 100, 0, 0),
          type: BlockType.STONE,
          createdBy: 'human',
          customColor: color
        };

        const result = BlockValidator.validateCreateBlock(params, existingBlocks, worldLimits);
        
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject empty createdBy field', () => {
      const params: CreateBlockParams = {
        position: new Vector3(0, 0, 0),
        type: BlockType.STONE,
        createdBy: ''
      };

      const result = BlockValidator.validateCreateBlock(params, existingBlocks, worldLimits);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(BlockValidationError.MISSING_REQUIRED_FIELDS);
    });
  });

  describe('validateUpdateBlock', () => {
    let existingBlock: Block;

    beforeEach(() => {
      existingBlock = {
        id: 'test-1',
        position: { x: 0, y: 0, z: 0 },
        type: BlockType.STONE,
        color: '#666666',
        metadata: {
          createdAt: Date.now(),
          modifiedAt: Date.now(),
          createdBy: 'human'
        }
      };
    });

    it('should validate a valid block update', () => {
      const params: UpdateBlockParams = {
        id: 'test-1',
        color: '#FF0000',
        modifiedBy: 'human'
      };

      const result = BlockValidator.validateUpdateBlock(params, existingBlock);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject update for non-existent block', () => {
      const params: UpdateBlockParams = {
        id: 'test-1',
        color: '#FF0000',
        modifiedBy: 'human'
      };

      const result = BlockValidator.validateUpdateBlock(params, undefined);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(BlockValidationError.MISSING_REQUIRED_FIELDS);
    });

    it('should reject invalid color in update', () => {
      const params: UpdateBlockParams = {
        id: 'test-1',
        color: 'invalid-color',
        modifiedBy: 'human'
      };

      const result = BlockValidator.validateUpdateBlock(params, existingBlock);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(BlockValidationError.INVALID_COLOR);
    });

    it('should reject empty modifiedBy field', () => {
      const params: UpdateBlockParams = {
        id: 'test-1',
        color: '#FF0000',
        modifiedBy: ''
      };

      const result = BlockValidator.validateUpdateBlock(params, existingBlock);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(BlockValidationError.MISSING_REQUIRED_FIELDS);
    });
  });

  describe('validateBlock', () => {
    it('should validate a complete valid block', () => {
      const block: Block = {
        id: 'test-1',
        position: { x: 0, y: 0, z: 0 },
        type: BlockType.STONE,
        color: '#666666',
        metadata: {
          createdAt: Date.now(),
          modifiedAt: Date.now(),
          createdBy: 'human'
        }
      };

      const result = BlockValidator.validateBlock(block);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject block with missing ID', () => {
      const block: Block = {
        id: '',
        position: { x: 0, y: 0, z: 0 },
        type: BlockType.STONE,
        color: '#666666',
        metadata: {
          createdAt: Date.now(),
          modifiedAt: Date.now(),
          createdBy: 'human'
        }
      };

      const result = BlockValidator.validateBlock(block);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(BlockValidationError.MISSING_REQUIRED_FIELDS);
    });

    it('should reject block with invalid type', () => {
      const block: Block = {
        id: 'test-1',
        position: { x: 0, y: 0, z: 0 },
        type: 'invalid' as BlockType,
        color: '#666666',
        metadata: {
          createdAt: Date.now(),
          modifiedAt: Date.now(),
          createdBy: 'human'
        }
      };

      const result = BlockValidator.validateBlock(block);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(BlockValidationError.INVALID_TYPE);
    });
  });
});

describe('Utility Functions', () => {
  describe('validateBlockType', () => {
    it('should validate correct block types', () => {
      expect(validateBlockType('stone')).toBe(true);
      expect(validateBlockType('leaf')).toBe(true);
      expect(validateBlockType('wood')).toBe(true);
    });

    it('should reject invalid block types', () => {
      expect(validateBlockType('invalid')).toBe(false);
      expect(validateBlockType('')).toBe(false);
      expect(validateBlockType('STONE')).toBe(false);
    });
  });

  describe('validateBlockPosition', () => {
    it('should validate valid positions', () => {
      expect(validateBlockPosition(new Vector3(0, 0, 0))).toBe(true);
      expect(validateBlockPosition({ x: 1, y: 2, z: 3 })).toBe(true);
      expect(validateBlockPosition({ x: -1, y: -2, z: -3 })).toBe(true);
    });

    it('should reject invalid positions', () => {
      expect(validateBlockPosition({ x: NaN, y: 0, z: 0 })).toBe(false);
      expect(validateBlockPosition({ x: 0, y: Infinity, z: 0 })).toBe(false);
      expect(validateBlockPosition({ x: 0, y: 0, z: -Infinity })).toBe(false);
    });
  });

  describe('validateTimestamp', () => {
    it('should validate valid timestamps', () => {
      expect(validateTimestamp(Date.now())).toBe(true);
      expect(validateTimestamp(1000000000000)).toBe(true);
    });

    it('should reject invalid timestamps', () => {
      expect(validateTimestamp(0)).toBe(false);
      expect(validateTimestamp(-1)).toBe(false);
      expect(validateTimestamp(NaN)).toBe(false);
      expect(validateTimestamp(Date.now() + 1000000)).toBe(false); // Future timestamp
    });
  });

  describe('createDefaultMetadata', () => {
    it('should create valid default metadata', () => {
      const metadata = createDefaultMetadata('human');
      
      expect(metadata.createdBy).toBe('human');
      expect(metadata.version).toBe(1);
      expect(typeof metadata.createdAt).toBe('number');
      expect(typeof metadata.modifiedAt).toBe('number');
      expect(metadata.createdAt).toBeLessThanOrEqual(Date.now());
      expect(metadata.modifiedAt).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('canModifyBlock', () => {
    const block: Block = {
      id: 'test-1',
      position: { x: 0, y: 0, z: 0 },
      type: BlockType.STONE,
      color: '#666666',
      metadata: {
        createdAt: Date.now(),
        modifiedAt: Date.now(),
        createdBy: 'simulant-1'
      }
    };

    it('should allow creator to modify block', () => {
      expect(canModifyBlock(block, 'simulant-1')).toBe(true);
    });

    it('should allow human to modify any block', () => {
      expect(canModifyBlock(block, 'human')).toBe(true);
    });

    it('should reject non-creator simulant', () => {
      expect(canModifyBlock(block, 'simulant-2')).toBe(false);
    });
  });

  describe('getValidationErrorMessage', () => {
    it('should return appropriate error messages', () => {
      expect(getValidationErrorMessage(BlockValidationError.INVALID_TYPE)).toContain('Invalid block type');
      expect(getValidationErrorMessage(BlockValidationError.POSITION_OCCUPIED)).toContain('already occupied');
      expect(getValidationErrorMessage(BlockValidationError.WORLD_LIMIT_REACHED)).toContain('limit');
    });
  });
});