import React from 'react'
import { Block as BlockType, BlockType as BlockTypeEnum } from '../../types/blocks'
import { FrostedGlassFloor as FloorType } from '../../types/floorTypes'
import Block from './Block'
import FrostedGlassBlock from './FrostedGlassBlock'
import Number4Block from './Number4Block'

interface BlockRendererProps {
  block?: BlockType
  floor?: FloorType
  onClick?: (item: BlockType | FloorType) => void
  onHover?: (item: BlockType | FloorType) => void
  selected?: boolean
  animated?: boolean
  scale?: number
  enableEffects?: boolean
  materialPreset?: string
  glowIntensity?: number
}

export const BlockRenderer: React.FC<BlockRendererProps> = ({
  block,
  floor,
  onClick,
  onHover,
  selected = false,
  animated = true,
  scale = 1,
  enableEffects = true,
  materialPreset = 'showroom_glass',
  glowIntensity = 1
}) => {
  // Handle floor rendering
  if (!block && floor) {
    return (
      <FrostedGlassBlock
        floor={floor}
        onClick={onClick}
        onHover={onHover}
        selected={selected}
        materialPreset={materialPreset}
        enableEffects={enableEffects}
        scale={scale}
      />
    )
  }

  // Handle block rendering based on type
  if (block) {
    switch (block.type) {
      case BlockTypeEnum.FROSTED_GLASS:
        return (
          <FrostedGlassBlock
            block={block}
            onClick={onClick}
            onHover={onHover}
            selected={selected}
            materialPreset={materialPreset}
            enableEffects={enableEffects}
            scale={scale}
          />
        )

      case BlockTypeEnum.NUMBER_4:
        return (
          <Number4Block
            block={block}
            onClick={onClick}
            onHover={onHover}
            selected={selected}
            animated={animated}
            scale={scale}
            glowIntensity={glowIntensity}
          />
        )

      default:
        return (
          <Block
            block={block}
            onClick={onClick}
            onHover={onHover}
            selected={selected}
            animated={animated}
            scale={scale}
          />
        )
    }
  }

  // Return null if no valid item provided
  return null
}

// Convenience components for specific types
export const FrostedGlassBlockRenderer: React.FC<Omit<BlockRendererProps, 'block'> & { block: BlockType }> = (props) => (
  <BlockRenderer {...props} />
)

export const Number4BlockRenderer: React.FC<Omit<BlockRendererProps, 'block'> & { block: BlockType }> = (props) => (
  <BlockRenderer {...props} />
)

export const FloorRenderer: React.FC<Omit<BlockRendererProps, 'floor'> & { floor: FloorType }> = (props) => (
  <BlockRenderer {...props} />
)

export default BlockRenderer
