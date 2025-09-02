import { describe, it, expect } from 'vitest'
import {
  extractClipName,
  categorizeAnimation,
  generateAnimationTags,
  shouldAnimationLoop,
  getDefaultAnimationPaths,
  estimateAssetSize,
  formatFileSize,
  createCacheKey
} from '../animationUtils'

describe('animationUtils', () => {
  describe('extractClipName', () => {
    it('should extract semantic names from Mixamo file paths', () => {
      expect(extractClipName('/animation_GLB/M_Walk_001.glb')).toBe('walk_male')
      expect(extractClipName('/animation_GLB/F_Standing_Idle_Variations_001.glb')).toBe('idle_female_1')
      expect(extractClipName('/animation_GLB/M_Run_001.glb')).toBe('run_male')
      expect(extractClipName('/animation_GLB/F_Dances_007.glb')).toBe('dance_female')
    })

    it('should handle unknown file names', () => {
      expect(extractClipName('/unknown/Custom_Animation.glb')).toBe('custom_animation')
      expect(extractClipName('/path/to/file.glb')).toBe('file')
    })

    it('should handle malformed paths', () => {
      expect(extractClipName('')).toBe('unknown')
      expect(extractClipName('no-extension')).toBe('no-extension')
    })
  })

  describe('categorizeAnimation', () => {
    it('should categorize locomotion animations', () => {
      expect(categorizeAnimation('walk_male')).toBe('locomotion')
      expect(categorizeAnimation('run_male')).toBe('locomotion')
      expect(categorizeAnimation('jump_male')).toBe('locomotion')
      expect(categorizeAnimation('M_Walk_001')).toBe('locomotion')
    })

    it('should categorize idle animations', () => {
      expect(categorizeAnimation('idle_female_1')).toBe('idle')
      expect(categorizeAnimation('F_Standing_Idle_Variations_001')).toBe('idle')
      expect(categorizeAnimation('tpose_male')).toBe('idle')
    })

    it('should categorize action animations', () => {
      expect(categorizeAnimation('dance_female')).toBe('action')
      expect(categorizeAnimation('crouch_walk_male')).toBe('action')
      expect(categorizeAnimation('walk_backward_male')).toBe('action')
    })

    it('should categorize expression animations', () => {
      expect(categorizeAnimation('talk_male')).toBe('expression')
      expect(categorizeAnimation('expression_male')).toBe('expression')
      expect(categorizeAnimation('M_Talking_Variations_005')).toBe('expression')
    })

    it('should default to action for unknown animations', () => {
      expect(categorizeAnimation('unknown_animation')).toBe('action')
      expect(categorizeAnimation('custom_move')).toBe('action')
    })
  })

  describe('generateAnimationTags', () => {
    it('should generate gender tags', () => {
      const maleTags = generateAnimationTags('walk_male', 'locomotion')
      expect(maleTags).toContain('male')
      expect(maleTags).toContain('locomotion')
      expect(maleTags).toContain('walk')

      const femaleTags = generateAnimationTags('F_Dances_007', 'action')
      expect(femaleTags).toContain('female')
      expect(femaleTags).toContain('action')
      expect(femaleTags).toContain('dance')
    })

    it('should generate movement tags', () => {
      const walkTags = generateAnimationTags('M_Walk_001', 'locomotion')
      expect(walkTags).toContain('walk')
      expect(walkTags).toContain('male')

      const runTags = generateAnimationTags('run_female', 'locomotion')
      expect(runTags).toContain('run')
    })

    it('should generate variant tags', () => {
      const variant1Tags = generateAnimationTags('idle_female_001', 'idle')
      expect(variant1Tags).toContain('variant-1')

      const variant2Tags = generateAnimationTags('F_Standing_Idle_Variations_002', 'idle')
      expect(variant2Tags).toContain('variant-2')
    })

    it('should remove duplicate tags', () => {
      const tags = generateAnimationTags('walk_male_walk', 'locomotion')
      const walkCount = tags.filter(tag => tag === 'walk').length
      expect(walkCount).toBe(1)
    })
  })

  describe('shouldAnimationLoop', () => {
    it('should loop locomotion animations except jumps', () => {
      expect(shouldAnimationLoop('walk_male', 'locomotion')).toBe(true)
      expect(shouldAnimationLoop('run_male', 'locomotion')).toBe(true)
      expect(shouldAnimationLoop('jump_male', 'locomotion')).toBe(false)
    })

    it('should loop idle animations', () => {
      expect(shouldAnimationLoop('idle_female_1', 'idle')).toBe(true)
      expect(shouldAnimationLoop('tpose_male', 'idle')).toBe(true)
    })

    it('should loop talking expressions', () => {
      expect(shouldAnimationLoop('talk_male', 'expression')).toBe(true)
      expect(shouldAnimationLoop('expression_male', 'expression')).toBe(false)
    })

    it('should not loop most actions', () => {
      expect(shouldAnimationLoop('dance_female', 'action')).toBe(false)
      expect(shouldAnimationLoop('crouch_walk_male', 'action')).toBe(false)
    })
  })

  describe('getDefaultAnimationPaths', () => {
    it('should return array of default animation paths', () => {
      const paths = getDefaultAnimationPaths()
      expect(Array.isArray(paths)).toBe(true)
      expect(paths.length).toBeGreaterThan(0)
      expect(paths[0]).toMatch(/^\/animation_GLB\/.*\.glb$/)
    })

    it('should include key animation types', () => {
      const paths = getDefaultAnimationPaths()
      const pathString = paths.join(' ')
      
      expect(pathString).toMatch(/Walk/)
      expect(pathString).toMatch(/Run/)
      expect(pathString).toMatch(/Idle/)
      expect(pathString).toMatch(/Jump/)
    })
  })

  describe('estimateAssetSize', () => {
    it('should return 0 for empty object', () => {
      expect(estimateAssetSize({})).toBe(0)
    })

    it('should estimate size for mock GLTF with geometry', () => {
      const mockGLTF = {
        scene: {
          traverse: (callback: (child: any) => void) => {
            callback({
              geometry: {
                attributes: {
                  position: { count: 1000 },
                  normal: { count: 1000 },
                  uv: { count: 1000 }
                }
              }
            })
          }
        }
      }
      
      const size = estimateAssetSize(mockGLTF)
      expect(size).toBeGreaterThan(0)
      expect(size).toBe(1000 * 3 * 4) // vertices * attributes * 4 bytes
    })

    it('should include animation data in size estimate', () => {
      const mockGLTF = {
        scene: { traverse: () => {} },
        animations: [{
          tracks: [{
            times: new Array(100),
            values: new Array(300)
          }]
        }]
      }
      
      const size = estimateAssetSize(mockGLTF)
      expect(size).toBe(400 * 4) // (100 + 300) * 4 bytes
    })
  })

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 B')
      expect(formatFileSize(1024)).toBe('1 KB')
      expect(formatFileSize(1024 * 1024)).toBe('1 MB')
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB')
    })

    it('should handle decimal places', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB') // 1.5 KB
      expect(formatFileSize(1024 * 1024 * 1.5)).toBe('1.5 MB')
    })

    it('should handle large numbers', () => {
      expect(formatFileSize(1024 * 1024 * 1024 * 2.5)).toBe('2.5 GB')
    })
  })

  describe('createCacheKey', () => {
    it('should create valid cache keys from paths', () => {
      expect(createCacheKey('/animation_GLB/M_Walk_001.glb')).toBe('_animation_GLB_M_Walk_001_glb')
      expect(createCacheKey('/models/avatar.glb')).toBe('_models_avatar_glb')
    })

    it('should handle special characters', () => {
      expect(createCacheKey('/path/with-dashes_and.dots.glb')).toBe('_path_with_dashes_and_dots_glb')
      expect(createCacheKey('/path/with spaces/file.glb')).toBe('_path_with_spaces_file_glb')
    })

    it('should be consistent', () => {
      const path = '/animation_GLB/test.glb'
      expect(createCacheKey(path)).toBe(createCacheKey(path))
    })
  })
})