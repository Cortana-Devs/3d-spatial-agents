'use client';

import React, { useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import GameMenu from './GameMenu';

export default function Overlay() {
    const debugText = useGameStore((state) => state.debugText);
    const isTeleporting = useGameStore((state) => state.isTeleporting);
    const isMenuOpen = useGameStore((state) => state.isMenuOpen);
    const setMenuOpen = useGameStore((state) => state.setMenuOpen);
    const keyBindings = useGameStore((state) => state.keyBindings);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === keyBindings.menu) {
                setMenuOpen(!isMenuOpen);
                if (!isMenuOpen) {
                    document.exitPointerLock();
                } else {
                    // Optional: Re-lock pointer when closing menu? 
                    // Usually better to let user click to resume.
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isMenuOpen, setMenuOpen, keyBindings]);

    return (
        <>
            {/* Teleport Fade Overlay */}
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'black',
                opacity: isTeleporting ? 1 : 0,
                transition: 'opacity 0.5s ease-in-out',
                pointerEvents: 'none',
                zIndex: 100
            }} />

            {/* Debug Text */}
            <div style={{
                position: 'absolute',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                color: 'white',
                background: 'rgba(0,0,0,0.5)',
                padding: '10px 20px',
                borderRadius: '20px',
                fontFamily: 'sans-serif',
                pointerEvents: 'none',
                userSelect: 'none',
                textAlign: 'center',
                width: '80%',
                zIndex: 10
            }}>
                {debugText}
            </div>

            {/* Settings Button (Optional, can keep or remove since ESC works) */}
            <button
                onClick={() => setMenuOpen(true)}
                style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    padding: '10px',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    zIndex: 10,
                    pointerEvents: 'auto'
                }}
            >
                Menu ({keyBindings.menu.replace('Key', '')})
            </button>

            {/* Game Menu */}
            {isMenuOpen && <GameMenu />}
        </>
    );
}
