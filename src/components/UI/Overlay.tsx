'use client';

import React from 'react';
import { useGameStore } from '@/store/gameStore';

export default function Overlay() {
    const debugText = useGameStore((state) => state.debugText);
    const isTeleporting = useGameStore((state) => state.isTeleporting);

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
        </>
    );
}
