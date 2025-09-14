# Config Context

## Overview
Configuration constants and settings for the Descendants metaverse world system.

## Core Configuration Files

### `floorConstants.ts` - Floor System Configuration
- **Material Properties**: Glass transparency, roughness, metalness values
- **Rendering Settings**: Opacity levels, reflection parameters
- **Performance Thresholds**: LOD distances, culling parameters
- **Visual Effects**: Glow intensities, color variations

### `floorDepthConfig.ts` - Floor Depth Management
- **Y-Level Definitions**: Vertical positioning for different floor types
- **Depth Calculations**: Multi-layer floor system configuration
- **Collision Detection**: Floor interaction boundaries
- **Seamless Integration**: Transition settings between floor types

### `yLevelConstants.ts` - Vertical World Alignment
- **World Height Mapping**: Standard Y-level references for consistent positioning
- **Camera Positioning**: Default heights for different camera modes
- **Block Placement**: Vertical alignment rules for block systems
- **Floor Integration**: Y-level coordination with floor systems

## Usage Patterns
- **Import as Constants**: Used throughout the application for consistent values
- **Type Safety**: All configurations are typed for compile-time validation
- **Performance Optimization**: Pre-calculated values to avoid runtime calculations
- **Debugging Support**: Clear naming and documentation for development

## Key Values
- **Floor Y-Levels**: Standardized heights for different floor types
- **Material Presets**: Consistent visual properties across the world
- **Performance Thresholds**: Optimization trigger points for different systems
- **Visual Standards**: Color schemes and effect intensities

## Integration Points
- **World Store**: Provides default values for world state initialization
- **Floor Systems**: Direct integration with floor rendering components
- **Camera System**: Default positioning and movement constraints
- **Debug Tools**: Configuration validation and testing utilities

## Maintenance Notes
- Values are fine-tuned for optimal visual quality and performance
- Changes should be tested across different device capabilities
- Floor depth values are critical for seamless transparency rendering
- Y-level alignment affects all vertical positioning in the world
