'use client';

import React, { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';

export default function GameMenu() {
    const {
        invertedMouse, setInvertedMouse,
        sensitivity, setSensitivity,
        volume, setVolume,
        setMenuOpen,
        keyBindings, setKeyBinding
    } = useGameStore();

    const [activeTab, setActiveTab] = useState<'map' | 'settings' | 'controls'>('map');
    const [listeningFor, setListeningFor] = useState<string | null>(null);

    const handleClose = () => {
        setMenuOpen(false);
    };

    useEffect(() => {
        if (!listeningFor) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Allow Escape to cancel listening if it's not the target being remapped
            if (e.code === 'Escape' && listeningFor !== 'menu') {
                setListeningFor(null);
                return;
            }

            setKeyBinding(listeningFor, e.code);
            setListeningFor(null);
        };

        window.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
    }, [listeningFor, setKeyBinding]);

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            color: 'white',
            fontFamily: 'sans-serif'
        }}>
            {/* Header / Tabs */}
            <div style={{
                display: 'flex',
                gap: '20px',
                marginBottom: '30px',
                borderBottom: '1px solid #555',
                paddingBottom: '10px',
                width: '80%',
                justifyContent: 'center'
            }}>
                {['map', 'settings', 'controls'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: activeTab === tab ? '#4CAF50' : '#aaa',
                            fontSize: '24px',
                            cursor: 'pointer',
                            textTransform: 'capitalize',
                            fontWeight: activeTab === tab ? 'bold' : 'normal',
                            padding: '10px 20px'
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div style={{
                width: '80%',
                height: '60%',
                backgroundColor: '#222',
                borderRadius: '10px',
                padding: '40px',
                overflowY: 'auto',
                boxShadow: '0 0 30px rgba(0,0,0,0.5)'
            }}>
                {activeTab === 'map' && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100%',
                        flexDirection: 'column',
                        color: '#888'
                    }}>
                        <div style={{
                            width: '100%',
                            height: '100%',
                            backgroundColor: '#111',
                            borderRadius: '5px',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            border: '2px dashed #444'
                        }}>
                            <h2>Map Unavailable</h2>
                        </div>
                        <p style={{ marginTop: '10px' }}>Minimap system coming soon.</p>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                        <h2 style={{ borderBottom: '1px solid #444', paddingBottom: '10px' }}>Game Settings</h2>
                        
                        {/* Inverted Mouse */}
                        <div style={{ margin: '20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label htmlFor="inverted-mouse" style={{ fontSize: '18px' }}>Inverted Mouse</label>
                            <input
                                id="inverted-mouse"
                                type="checkbox"
                                checked={invertedMouse}
                                onChange={(e) => setInvertedMouse(e.target.checked)}
                                style={{ transform: 'scale(1.5)', cursor: 'pointer' }}
                            />
                        </div>

                        {/* Sensitivity */}
                        <div style={{ margin: '30px 0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <label htmlFor="sensitivity" style={{ fontSize: '18px' }}>Mouse Sensitivity</label>
                                <span style={{ color: '#4CAF50' }}>{sensitivity.toFixed(1)}</span>
                            </div>
                            <input
                                id="sensitivity"
                                type="range"
                                min="0.1"
                                max="5.0"
                                step="0.1"
                                value={sensitivity}
                                onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                                style={{ width: '100%', cursor: 'pointer' }}
                            />
                        </div>

                        {/* Volume */}
                        <div style={{ margin: '30px 0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <label htmlFor="volume" style={{ fontSize: '18px' }}>Master Volume</label>
                                <span style={{ color: '#4CAF50' }}>{Math.round(volume * 100)}%</span>
                            </div>
                            <input
                                id="volume"
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={volume}
                                onChange={(e) => setVolume(parseFloat(e.target.value))}
                                style={{ width: '100%', cursor: 'pointer' }}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'controls' && (
                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                        <h2 style={{ borderBottom: '1px solid #444', paddingBottom: '10px' }}>Key Bindings</h2>
                        <p style={{ color: '#888', marginBottom: '20px' }}>Click a key to rebind it.</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '20px' }}>
                            <ControlRow action="Move Forward" actionKey="forward" currentKey={keyBindings.forward} isListening={listeningFor === 'forward'} onListen={() => setListeningFor('forward')} />
                            <ControlRow action="Move Backward" actionKey="backward" currentKey={keyBindings.backward} isListening={listeningFor === 'backward'} onListen={() => setListeningFor('backward')} />
                            <ControlRow action="Move Left" actionKey="left" currentKey={keyBindings.left} isListening={listeningFor === 'left'} onListen={() => setListeningFor('left')} />
                            <ControlRow action="Move Right" actionKey="right" currentKey={keyBindings.right} isListening={listeningFor === 'right'} onListen={() => setListeningFor('right')} />
                            <ControlRow action="Jump" actionKey="jump" currentKey={keyBindings.jump} isListening={listeningFor === 'jump'} onListen={() => setListeningFor('jump')} />
                            <ControlRow action="Sprint / Sneak" actionKey="sprint" currentKey={keyBindings.sprint} isListening={listeningFor === 'sprint'} onListen={() => setListeningFor('sprint')} />
                            <ControlRow action="Interact / Sit" actionKey="interact" currentKey={keyBindings.interact} isListening={listeningFor === 'interact'} onListen={() => setListeningFor('interact')} />
                            <ControlRow action="Toggle Menu" actionKey="menu" currentKey={keyBindings.menu} isListening={listeningFor === 'menu'} onListen={() => setListeningFor('menu')} />
                        </div>
                    </div>
                )}
            </div>

            {/* Footer / Close */}
            <div style={{ marginTop: '30px' }}>
                <button
                    onClick={handleClose}
                    style={{
                        padding: '15px 40px',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)'
                    }}
                >
                    RESUME GAME
                </button>
            </div>
        </div>
    );
}

function ControlRow({ action, actionKey, currentKey, isListening, onListen }: { action: string, actionKey: string, currentKey: string, isListening: boolean, onListen: () => void }) {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '15px',
            backgroundColor: isListening ? '#444' : '#333',
            borderRadius: '5px',
            alignItems: 'center',
            border: isListening ? '1px solid #4CAF50' : '1px solid transparent',
            transition: 'all 0.2s'
        }}>
            <span style={{ fontSize: '16px' }}>{action}</span>
            <button 
                onClick={onListen}
                style={{
                    backgroundColor: isListening ? '#4CAF50' : '#111',
                    padding: '8px 20px',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    color: isListening ? 'white' : '#ddd',
                    border: '1px solid #555',
                    cursor: 'pointer',
                    minWidth: '100px'
                }}
            >
                {isListening ? 'PRESS KEY...' : currentKey.replace('Key', '')}
            </button>
        </div>
    );
}
