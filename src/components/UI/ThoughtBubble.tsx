import React, { useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { ClientBrain } from '../Systems/ClientBrain';
import * as THREE from 'three';

interface ThoughtBubbleProps {
    brain: ClientBrain;
}

export const ThoughtBubble: React.FC<ThoughtBubbleProps> = ({ brain }) => {
    const [thought, setThought] = useState("");
    const [isThinking, setIsThinking] = useState(false);
    const [visible, setVisible] = useState(true);

    // Polling Optimization
    // Only check every 10 frames to save React renders
    const frameCount = useRef(0);
    const lastThoughtTime = useRef(0);

    // LOD Logic
    const bubbleRef = useRef<HTMLDivElement>(null);
    const worldPos = useRef(new THREE.Vector3());

    useFrame((state) => {
        frameCount.current++;

        // 1. Level of Detail (LOD) - Hide if far
        if (frameCount.current % 30 === 0) {
            // Check camera distance
            // Note: We need a ref to the group to get world pos, but Html tracks parent.
            // We can check the parent's distance if we had a ref, or just let Html occlude.
            // For now, let's keep it simple. If we want true LOD, we need to pass a parent Ref.
            // But Html has `occlude` prop which handles visibility behind attributes.
            // Let's rely on `distanceFactor` and `zIndexRange` for basic scaling.
        }

        // 2. Poll Brain State
        if (frameCount.current % 10 === 0) {
            if (brain.state.isThinking !== isThinking) {
                setIsThinking(brain.state.isThinking);
            }

            if (brain.state.lastThoughtTime > lastThoughtTime.current) {
                setThought(brain.state.thought);
                lastThoughtTime.current = brain.state.lastThoughtTime;
            }
        }
    });

    return (
        <Html
            position={[0, 4.2, 0]} // Above head
            center
            distanceFactor={15}
            occlude
            style={{
                pointerEvents: 'none',
                userSelect: 'none',
                opacity: visible ? 1 : 0,
                transition: 'opacity 0.2s',
            }}
        >
            <div className="flex flex-col items-center">

                {/* Thinking Indicator */}
                {isThinking && (
                    <div className="mb-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 animate-pulse">
                        <span className="text-[10px] text-cyan-300 font-mono tracking-widest font-bold">
                            THINKING...
                        </span>
                    </div>
                )}

                {/* Thought Content */}
                {!isThinking && thought && (
                    <div className="
                        relative
                        bg-black/70 backdrop-blur-lg
                        border border-white/10
                        rounded-xl
                        p-3 max-w-[200px]
                        shadow-[0_0_15px_rgba(0,0,0,0.3)]
                        transition-all duration-300
                    ">
                        {/* Tail */}
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-black/70 border-b border-r border-white/10 rotate-45 transform" />

                        {/* Text */}
                        <p className="text-white/90 text-[11px] font-sans leading-relaxed text-center">
                            {thought.length > 80 ? thought.substring(0, 80) + "..." : thought}
                        </p>

                        {/* Decoration */}
                        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-500/50 rounded-tr-sm" />
                        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-500/50 rounded-bl-sm" />
                    </div>
                )}
            </div>
        </Html>
    );
};
