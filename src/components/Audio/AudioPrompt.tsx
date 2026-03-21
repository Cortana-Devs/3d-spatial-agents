"use client";
import React, { useEffect, useState } from "react";

/**
 * AudioPrompt: Visual cue for blocked audio.
 * Displays a premium "Audio Pending" badge when agents are waiting to be heard.
 */
export function AudioPrompt() {
  const [hasPending, setHasPending] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleUpdate = (e: any) => {
      const count = e.detail?.count || 0;
      setHasPending(count > 0);
    };

    window.addEventListener("audio-queue-updated", handleUpdate);
    return () => window.removeEventListener("audio-queue-updated", handleUpdate);
  }, []);

  useEffect(() => {
    // Only show if pending AND the user hasn't interacted yet
    if (hasPending) {
        setIsVisible(true);
    } else {
        setIsVisible(false);
    }
  }, [hasPending]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-8 right-8 z-[9999] animate-fade-in pointer-events-none">
      <div className="relative group flex items-center gap-4 bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-2xl shadow-2xl overflow-hidden min-w-[280px]">
        {/* Animated Background Pulse */}
        <div className="absolute inset-0 bg-blue-500/10 animate-pulse" />
        
        {/* Glowing Icon */}
        <div className="relative flex items-center justify-center w-12 h-12 bg-blue-600/20 rounded-xl border border-blue-400/30">
          <div className="absolute inset-0 bg-blue-400/20 blur-md animate-pulse" />
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="w-6 h-6 text-blue-400" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>

        {/* Text Content */}
        <div className="relative flex flex-col">
          <span className="text-white font-semibold text-sm tracking-wide uppercase opacity-90">
            Audio Requirement
          </span>
          <span className="text-blue-300 text-xs font-medium animate-pulse">
            Click anywhere to enable voice
          </span>
        </div>

        {/* Dynamic Waveform Decoration */}
        <div className="absolute right-0 bottom-0 opacity-20 pointer-events-none">
          <svg width="100" height="40" viewBox="0 0 100 40">
            {[...Array(6)].map((_, i) => (
              <rect
                key={i}
                x={70 + i * 5}
                y={20 - i * 2}
                width="3"
                height={10 + i * 4}
                fill="#60a5fa"
                className="animate-bounce"
                style={{ animationDelay: `${i * 0.1}s`, animationDuration: '1.2s' }}
              />
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}
