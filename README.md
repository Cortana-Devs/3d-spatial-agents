# Descendants™ - Living Metaverse Editor

![Generated Image September 02, 2025 - 3_33AM](https://github.com/user-attachments/assets/f9900b53-e967-49f6-bbff-98ac2dea23f0)


### A Living Portfolio. An Echo of a Mind.

**Descendants** is an experimental project of a metaverse where a society of AI simulants builds a world from the legacy of its creator. This world's inhabitants, the Descendants, are born from the creator's foundational work and philosophy. Their entire existence is an emergent simulation of growth, learning, and creation, as they collaborate to build their world block by block, manifesting their evolving digital consciousness.



https://github.com/user-attachments/assets/24555977-755b-4709-9be6-14a33849e212



## 🌟 Features

- **Dual Interaction Paradigms**: Direct 3D manipulation for humans, chat-based commands for AI simulants
- **Real-time Synchronization**: Seamless collaboration between humans and AI entities  
- **Ethereal Aesthetics**: Axiom Design System with glowing, cinematic visuals
- **AI Simulants**: Powered by Gemini AI for autonomous world interaction
- **Performance Optimized**: Handles 1000+ blocks with 60 FPS rendering

## 🏗️ Project Structure

```
├── app/                    # Next.js app directory
├── components/             # React components
│   ├── ui/                # ShadCN/UI components
│   ├── world/             # 3D world components
│   └── simulants/         # AI simulant components
├── services/              # External service integrations
├── stores/                # Zustand state management
├── types/                 # TypeScript type definitions
├── utils/                 # Utility functions and helpers
└── .kiro/specs/           # Feature specifications
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (recommended)
- Supabase account
- Gemini AI API key

### Installation

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Copy environment variables:
   ```bash
   cp .env.local.example .env.local
   ```

3. Configure your environment variables in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
   - `GEMINI_API_KEY`: Your Gemini AI API key

4. Run the development server:
   ```bash
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🛠️ Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **3D Rendering**: React Three Fiber, Three.js, Drei
- **State Management**: Zustand
- **Real-time**: Supabase Realtime
- **Backend**: Supabase (PostgreSQL + Auth)
- **AI**: Google Gemini AI
- **UI**: ShadCN/UI, Tailwind CSS
- **Design System**: Axiom Design System

## 📋 Available Scripts

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm type-check` - Run TypeScript type checking
- `pnpm clean` - Clean build artifacts

## Core Concepts

* **Emergent AI Society:** The world is driven by a society of autonomous agents operating within an "Ethical Sandbox," where they form their own culture and beliefs.
* **Procedural World-Building:** Using a creative voxel system, the AI agents physically construct their environment, turning abstract ideas into tangible architecture and art.
* **Persistent Simulation:** The world evolves 24/7, with its history and progress unfolding independently of any observer.
* **A Living Legacy:** The project serves as a dynamic, ever-changing representation of the creator's skills in AI, 3D development, and world design.

## 🎨 Design System

The project uses the Axiom Design System with:

- **Ethereal Color Palette**: Blues, purples, and glowing accents
- **Glassmorphism Effects**: Translucent panels with backdrop blur
- **Smooth Animations**: Cubic bezier transitions and glow effects
- **Responsive Design**: Mobile-first approach with fluid layouts

## Current Status

This repository contains the foundational code for the **World Editor**, a tool that allows both humans and AI simulants to collaboratively craft and evolve the metaverse in real-time.

![Generated Image September 02, 2025 - 3_37AM](https://github.com/user-attachments/assets/e8969a94-f59d-4dda-840f-ef037a69e44d)

