'use client';

import React from 'react';
import { useGameStore } from '@/store/gameStore';

export default function Overlay() {
    const debugText = useGameStore((state) => state.debugText);

    return (
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
    );
}
