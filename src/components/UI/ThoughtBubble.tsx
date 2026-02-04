import React, { useRef, useState, useEffect } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { ClientBrain } from '../Systems/ClientBrain';
import * as THREE from 'three';
import { Maximize2, Minimize2, Cpu, Activity, Clock } from 'lucide-react';

interface ThoughtBubbleProps {
    brain: ClientBrain;
}

interface ThoughtLog {
    id: string;
    text: string;
    timestamp: number;
    type: 'THOUGHT' | 'ACTION';
}

export const ThoughtBubble: React.FC<ThoughtBubbleProps> = ({ brain }) => {
    const [currentThought, setCurrentThought] = useState("");
    const [isThinking, setIsThinking] = useState(false);
    const [expanded, setExpanded] = useState(false);

    // Local History State
    const [history, setHistory] = useState<ThoughtLog[]>([]);

    // Optimization Refs
    const frameCount = useRef(0);
    const lastThoughtTime = useRef(0);

    // Polling Logic
    useFrame(() => {
        frameCount.current++;
        if (frameCount.current % 10 === 0) {
            // Update Thinking Status
            if (brain.state.isThinking !== isThinking) {
                setIsThinking(brain.state.isThinking);
            }

            // Update Thought Content
            if (brain.state.lastThoughtTime > lastThoughtTime.current) {
                const newText = brain.state.thought;
                setCurrentThought(newText);
                lastThoughtTime.current = brain.state.lastThoughtTime;

                // Add to history
                setHistory(prev => [
                    {
                        id: crypto.randomUUID(),
                        text: newText,
                        timestamp: Date.now(),
                        type: 'THOUGHT'
                    },
                    ...prev.slice(0, 9) // Keep last 10
                ]);
            }
        }
    });

    return (
        <Html
            position={[0, 4.5, 0]}
            center
            distanceFactor={12}
            occlude
            style={{
                pointerEvents: 'auto', // Enable interaction
                userSelect: 'none',
                transition: 'all 0.3s ease-out',
                transform: `scale(${expanded ? 1.0 : 0.9})`,
            }}
        >
            <div
                className={`
                    flex flex-col
                    transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
                    ${expanded ? 'w-[320px]' : 'w-[200px]'}
                `}
            >
                {/* --- MAIN WINDOW --- */}
                <div
                    className="
                        group relative
                        bg-black/80 backdrop-blur-xl
                        border border-white/10
                        rounded-2xl
                        shadow-[0_8px_32px_rgba(0,0,0,0.4)]
                        overflow-hidden
                    "
                >
                    {/* Feathered Glow Border (Pseudo-element via shadow or gradient) */}
                    <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10 pointer-events-none" />

                    {/* Header / Status Bar */}
                    <div
                        className="
                            flex items-center justify-between 
                            px-3 py-2 
                            bg-white/5 border-b border-white/5
                            cursor-pointer
                        "
                        onClick={() => setExpanded(!expanded)}
                    >
                        <div className="flex items-center gap-2">
                            {isThinking ? (
                                <Activity className="w-3 h-3 text-cyan-400 animate-pulse" />
                            ) : (
                                <Cpu className="w-3 h-3 text-emerald-400" />
                            )}
                            <span className="text-[10px] font-mono font-medium tracking-wider text-white/60 uppercase">
                                {isThinking ? 'PROCESSING' : 'NEURAL LINK'}
                            </span>
                        </div>

                        <div className="text-white/40 hover:text-white transition-colors">
                            {expanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="p-4 relative">
                        {/* Background Noise Texture */}
                        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay pointer-events-none" />

                        {/* Current Thought (Always Visible) */}
                        <div className="relative z-10">
                            {isThinking ? (
                                <div className="space-y-2">
                                    <div className="h-2 w-3/4 bg-white/10 rounded animate-pulse" />
                                    <div className="h-2 w-1/2 bg-white/10 rounded animate-pulse delay-75" />
                                </div>
                            ) : (
                                <p className="text-[12px] leading-relaxed font-sans text-white/90">
                                    "{currentThought || "System Idle"}"
                                </p>
                            )}
                        </div>

                        {/* Expanded History */}
                        <div className={`
                            mt-4 space-y-3 
                            transition-all duration-500 ease-in-out
                            ${expanded ? 'opacity-100 max-h-[200px] overflow-y-auto custom-scrollbar' : 'opacity-0 max-h-0 overflow-hidden'}
                        `}>
                            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                            <div className="space-y-3">
                                <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest pl-1">
                                    Recent Logs
                                </span>
                                {history.map((log) => (
                                    <div key={log.id} className="flex gap-2 group/item">
                                        <div className="mt-1 w-1 h-1 rounded-full bg-cyan-500/50 group-hover/item:bg-cyan-400 transition-colors" />
                                        <div className="flex-1">
                                            <p className="text-[10px] text-white/60 leading-tight">
                                                {log.text}
                                            </p>
                                            <div className="flex items-center gap-1 mt-1">
                                                <Clock size={8} className="text-white/20" />
                                                <span className="text-[8px] text-white/20">
                                                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Decorative Feathered Gradient at Bottom */}
                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-cyan-900/10 to-transparent pointer-events-none" />
                </div>

                {/* Connecting Line */}
                <div className="self-center w-px h-8 bg-gradient-to-b from-white/10 to-transparent" />
            </div>
        </Html>
    );
};
