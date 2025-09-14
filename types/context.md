# Types Context

## Overview
TypeScript type definitions for the entire Descendants metaverse system.

## Core Type Files

### `blocks.ts` - Voxel Block System
- **Block** - Individual voxel block interface
- **BlockType** - Enum of available block types (Glass, Stone, Wood, etc.)
- **BlockDefinition** - Material properties and rendering config
- **SelectionMode** - Block placement/selection states

### `animations.ts` - 3D Character Animation
- Animation states and transitions for RPM avatars
- External animation loading and management
- Performance optimization for animation systems

### `skybox.ts` - Environment System
- Skybox presets and configurations
- Texture loading and transition definitions
- Performance monitoring for environment rendering

### `playerAvatar.ts` - Avatar System
- Ready Player Me integration types
- Character customization and state management
- Animation controller interfaces

## Key Interfaces

### `AISimulant` - AI Agent System
- Simulant state management (active/idle/disconnected)
- Chat history and Gemini AI session tracking
- Spatial positioning and world interaction

### `WorldState` - Global State Management
- Block collection and world limits
- Camera system integration
- Real-time synchronization status
- Performance metrics tracking

### `CameraMode` - 3D Camera System
- Multiple camera modes (orbit, fly, follow-simulant, cinematic)
- Camera state and target management
- FOV and positioning configurations

## Integration Points
- **Zustand Store**: Provides state management types
- **Three.js**: Extends Vector3, Matrix4, and other 3D types
- **React Three Fiber**: Canvas and component integration
- **Supabase**: Real-time synchronization types

## Usage Patterns
- Re-exports from dedicated modules for clean imports
- Performance monitoring integration in all major interfaces
- Type-safe error handling and validation
- Comprehensive documentation for complex 3D interactions
