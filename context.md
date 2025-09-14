# Descendants™ - Project Context

## Overview
A living metaverse editor where AI simulants and humans collaboratively build a 3D voxel world in real-time. This project serves as both a portfolio showcase and an experimental platform for AI-driven world creation.

## Architecture Summary

### Frontend Stack
- **Next.js 15** with App Router and Turbopack
- **React 19** with concurrent features
- **React Three Fiber** for 3D rendering with Three.js
- **Zustand** for performant state management
- **TypeScript** for type safety across all systems

### Backend & Services
- **Supabase** for real-time database and authentication
- **Google Gemini AI** for simulant intelligence
- **Vercel** for deployment and edge functions

### Design System
- **Axiom Design System** with ethereal/glassmorphism aesthetics
- **Tailwind CSS v4** for styling
- **ShadCN/UI** components with custom theming

## Key System Components

### 🎮 World Engine (`/components/world/`)
- **VoxelCanvas**: Main 3D viewport with Three.js integration
- **Block System**: Optimized voxel rendering with instancing
- **Camera System**: Multiple camera modes (orbit, fly, follow, cinematic)
- **Grid System**: Precision placement with visual guides

### 🤖 AI Simulants (`/components/simulants/`)
- **Ready Player Me** avatar integration
- **Gemini AI** powered autonomous agents
- **Real-time animation** and movement systems
- **Natural language** world interaction

### 🏗️ Procedural Generation (`/utils/generation/`)
- **Island Generator**: Noise-based terrain creation
- **Archipelago System**: Large-scale world generation
- **Deterministic RNG**: Consistent multiplayer generation

### ⚡ Performance Systems (`/systems/`, `/utils/performance/`)
- **GPU Memory Management**: Optimized 3D rendering
- **LOD System**: Distance-based quality scaling
- **Transparency Optimization**: Advanced glass rendering
- **Mobile Optimization**: Touch controls and performance scaling

## Development Workflow

### Key Entry Points
1. **Main App**: `app/page.tsx` → `VoxelCanvas.tsx`
2. **State Management**: `store/worldStore.ts`
3. **Type Definitions**: `types/index.ts`
4. **Core Utilities**: `utils/index.ts`

### Development Tools
- **Debug Panels**: Comprehensive debugging interface (`/debug/`)
- **Performance Monitoring**: Real-time metrics and optimization
- **Example Components**: Usage demonstrations (`/examples/`)
- **Testing Suite**: Comprehensive test coverage (`/__tests__/`)

### Scripts & Automation
- `pnpm dev` - Development with Turbopack
- `pnpm test` - Vitest testing suite
- **Logging Control**: Advanced logging system with filtering
- **Y-Level Validation**: Ensures consistent vertical positioning

## Core Concepts

### Dual Interaction Paradigms
- **Human Users**: Direct 3D manipulation, visual block placement
- **AI Simulants**: Chat-based commands, autonomous world building

### Real-time Collaboration
- **Supabase Integration**: Live synchronization between users
- **Conflict Resolution**: Handles simultaneous edits gracefully
- **Optimistic Updates**: Responsive UI with server confirmation

### Performance Philosophy
- **60 FPS Target**: Maintains smooth performance with 1000+ blocks
- **Mobile-First**: Optimized for all device capabilities
- **Progressive Enhancement**: Scales quality based on hardware

## Integration Guidelines

### Adding New Features
1. **Types First**: Define interfaces in `/types/`
2. **State Integration**: Update Zustand stores in `/store/`
3. **Component Development**: Create in appropriate `/components/` subdirectory
4. **Performance Testing**: Add to debug panels and benchmarks
5. **Documentation**: Update relevant context.md files

### Performance Considerations
- Use instanced rendering for repeated geometry
- Implement LOD systems for complex features
- Monitor GPU memory usage continuously
- Test across mobile and desktop platforms

### AI Integration
- Simulants interact through structured actions
- Natural language processing via Gemini AI
- Real-time state synchronization with human users
- Autonomous decision-making within ethical constraints

This project represents the intersection of AI, 3D graphics, and collaborative creativity—a living portfolio that evolves through the interactions of its AI inhabitants.
