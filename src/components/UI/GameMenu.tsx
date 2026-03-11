'use client';

import React, { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Minimap } from './Minimap';

export default function GameMenu() {
    const {
        invertedMouse, setInvertedMouse,
        sensitivity, setSensitivity,
        volume, setVolume,
        setMenuPanelOpen,
        keyBindings, setKeyBinding
    } = useGameStore();

    const [activeTab, setActiveTab] = useState<'map' | 'settings' | 'controls' | 'logs'>('map');
    const [listeningFor, setListeningFor] = useState<string | null>(null);

    // Logs State
    const [logs, setLogs] = useState<string>("");
    const [logsLoading, setLogsLoading] = useState(false);
    const [logsError, setLogsError] = useState<string | null>(null);

    useEffect(() => {
        if (activeTab === 'logs') {
            setLogsLoading(true);
            fetch("/api/logs/groq")
                .then(async (res) => {
                    if (!res.ok) throw new Error("Failed to load logs");
                    return res.text();
                })
                .then((text) => {
                    setLogs(text);
                    setLogsLoading(false);
                })
                .catch((err) => {
                    setLogsError(err.message);
                    setLogsLoading(false);
                });
        }
    }, [activeTab]);

    const handleDownloadLogs = () => {
        const blob = new Blob([logs], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "groq_interactions.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleClose = () => {
        if (setMenuPanelOpen) {
            setMenuPanelOpen(false);
        }
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

    const tabStyle = (tab: string) => ({
        background: activeTab === tab
            ? 'rgba(76, 175, 80, 0.2)'
            : 'transparent',
        border: activeTab === tab
            ? '1px solid rgba(76, 175, 80, 0.5)'
            : '1px solid transparent',
        color: activeTab === tab ? '#4CAF50' : 'rgba(255,255,255,0.5)',
        fontSize: '14px',
        cursor: 'pointer' as const,
        textTransform: 'capitalize' as const,
        fontWeight: activeTab === tab ? 600 : 400,
        padding: '8px 20px',
        borderRadius: '10px',
        transition: 'all 0.2s ease',
        letterSpacing: '0.3px',
    });

    return (
        <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -55%)',
            width: 'min(680px, 90vw)',
            maxHeight: '70vh',
            backgroundColor: 'rgba(10, 10, 20, 0.75)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000,
            color: 'white',
            fontFamily: 'sans-serif',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 24px 80px rgba(0, 0, 0, 0.5), 0 0 1px rgba(255,255,255,0.1)',
            overflow: 'hidden',
        }}>
            {/* Header with tabs and close button */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            }}>
                <div style={{
                    display: 'flex',
                    gap: '8px',
                }}>
                    {['map', 'settings', 'controls', 'logs'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            style={tabStyle(tab)}
                        >
                            {tab === 'map' ? '🗺️' : tab === 'settings' ? '⚙️' : tab === 'controls' ? '🎮' : '📋'}{' '}
                            {tab}
                        </button>
                    ))}
                </div>
                <button
                    onClick={handleClose}
                    style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'rgba(255, 255, 255, 0.5)',
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontSize: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 80, 80, 0.2)';
                        e.currentTarget.style.borderColor = 'rgba(255, 80, 80, 0.4)';
                        e.currentTarget.style.color = '#ff5555';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
                    }}
                >
                    ✕
                </button>
            </div>

            {/* Content Area */}
            <div style={{
                padding: '24px',
                overflowY: 'auto',
                flex: 1,
            }}>
                {activeTab === 'map' && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '260px',
                        flexDirection: 'column',
                    }}>
                        <Minimap />
                        <p style={{ margin: '8px 0 0', fontSize: '12px', opacity: 0.5, color: 'white' }}>
                            Research Lab Layout • {new Date().toLocaleTimeString()}
                        </p>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div style={{ maxWidth: '500px', margin: '0 auto' }}>
                        <h3 style={{
                            fontWeight: 500,
                            fontSize: '16px',
                            color: 'rgba(255,255,255,0.6)',
                            marginTop: 0,
                            marginBottom: '24px',
                            letterSpacing: '0.5px',
                        }}>
                            Game Settings
                        </h3>

                        {/* Inverted Mouse */}
                        <div style={{
                            margin: '0 0 20px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '14px 16px',
                            backgroundColor: 'rgba(255, 255, 255, 0.04)',
                            borderRadius: '12px',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                        }}>
                            <label htmlFor="inverted-mouse" style={{ fontSize: '14px', fontWeight: 500 }}>Inverted Mouse</label>
                            <input
                                id="inverted-mouse"
                                type="checkbox"
                                checked={invertedMouse}
                                onChange={(e) => setInvertedMouse(e.target.checked)}
                                style={{ transform: 'scale(1.3)', cursor: 'pointer', accentColor: '#4CAF50' }}
                            />
                        </div>

                        {/* Sensitivity */}
                        <div style={{
                            margin: '0 0 20px',
                            padding: '14px 16px',
                            backgroundColor: 'rgba(255, 255, 255, 0.04)',
                            borderRadius: '12px',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <label htmlFor="sensitivity" style={{ fontSize: '14px', fontWeight: 500 }}>Mouse Sensitivity</label>
                                <span style={{ color: '#4CAF50', fontWeight: 600, fontSize: '14px' }}>{sensitivity.toFixed(1)}</span>
                            </div>
                            <input
                                id="sensitivity"
                                type="range"
                                min="0.1"
                                max="5.0"
                                step="0.1"
                                value={sensitivity}
                                onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                                style={{ width: '100%', cursor: 'pointer', accentColor: '#4CAF50' }}
                            />
                        </div>

                        {/* Volume */}
                        <div style={{
                            margin: '0 0 20px',
                            padding: '14px 16px',
                            backgroundColor: 'rgba(255, 255, 255, 0.04)',
                            borderRadius: '12px',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <label htmlFor="volume" style={{ fontSize: '14px', fontWeight: 500 }}>Master Volume</label>
                                <span style={{ color: '#4CAF50', fontWeight: 600, fontSize: '14px' }}>{Math.round(volume * 100)}%</span>
                            </div>
                            <input
                                id="volume"
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={volume}
                                onChange={(e) => setVolume(parseFloat(e.target.value))}
                                style={{ width: '100%', cursor: 'pointer', accentColor: '#4CAF50' }}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'controls' && (
                    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                        <h3 style={{
                            fontWeight: 500,
                            fontSize: '16px',
                            color: 'rgba(255,255,255,0.6)',
                            marginTop: 0,
                            marginBottom: '8px',
                            letterSpacing: '0.5px',
                        }}>
                            Key Bindings
                        </h3>
                        <p style={{ color: 'rgba(255,255,255,0.3)', marginBottom: '20px', fontSize: '13px' }}>Click a key to rebind it.</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <ControlRow action="Move Forward" actionKey="forward" currentKey={keyBindings.forward} isListening={listeningFor === 'forward'} onListen={() => setListeningFor('forward')} />
                            <ControlRow action="Move Backward" actionKey="backward" currentKey={keyBindings.backward} isListening={listeningFor === 'backward'} onListen={() => setListeningFor('backward')} />
                            <ControlRow action="Move Left" actionKey="left" currentKey={keyBindings.left} isListening={listeningFor === 'left'} onListen={() => setListeningFor('left')} />
                            <ControlRow action="Move Right" actionKey="right" currentKey={keyBindings.right} isListening={listeningFor === 'right'} onListen={() => setListeningFor('right')} />
                            <ControlRow action="Jump" actionKey="jump" currentKey={keyBindings.jump} isListening={listeningFor === 'jump'} onListen={() => setListeningFor('jump')} />
                            <ControlRow action="Sprint / Sneak" actionKey="sprint" currentKey={keyBindings.sprint} isListening={listeningFor === 'sprint'} onListen={() => setListeningFor('sprint')} />
                            <ControlRow action="Interact / Sit" actionKey="interact" currentKey={keyBindings.interact} isListening={listeningFor === 'interact'} onListen={() => setListeningFor('interact')} />
                            <ControlRow action="Pick Up Item" actionKey="pickUp" currentKey={keyBindings.pickUp} isListening={listeningFor === 'pickUp'} onListen={() => setListeningFor('pickUp')} />
                            <ControlRow action="Place Item" actionKey="placeItem" currentKey={keyBindings.placeItem} isListening={listeningFor === 'placeItem'} onListen={() => setListeningFor('placeItem')} />
                            <ControlRow action="Toggle Menu" actionKey="menu" currentKey={keyBindings.menu} isListening={listeningFor === 'menu'} onListen={() => setListeningFor('menu')} />
                            <ControlRow action="Task Panel" actionKey="taskPanel" currentKey={keyBindings.taskPanel} isListening={listeningFor === 'taskPanel'} onListen={() => setListeningFor('taskPanel')} />
                            <ControlRow action="Command Bar" actionKey="commandBar" currentKey={keyBindings.commandBar} isListening={listeningFor === 'commandBar'} onListen={() => setListeningFor('commandBar')} />
                            <ControlRow action="Debug Mode" actionKey="debugMode" currentKey={keyBindings.debugMode} isListening={listeningFor === 'debugMode'} onListen={() => setListeningFor('debugMode')} />
                        </div>
                    </div>
                )}

                {activeTab === 'logs' && (
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '16px'
                        }}>
                            <h3 style={{
                                fontWeight: 500,
                                fontSize: '16px',
                                color: 'rgba(255,255,255,0.6)',
                                margin: 0,
                                letterSpacing: '0.5px',
                            }}>
                                System Logs
                            </h3>
                            <button
                                onClick={handleDownloadLogs}
                                disabled={logsLoading || !!logsError || !logs}
                                style={{
                                    padding: '6px 12px',
                                    backgroundColor: '#2563eb',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    opacity: logsLoading || !!logsError || !logs ? 0.5 : 1,
                                    transition: 'background 0.2s',
                                }}
                            >
                                Download CSV
                            </button>
                        </div>

                        <div
                            style={{
                                flex: 1,
                                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                borderRadius: '8px',
                                padding: '16px',
                                overflow: 'auto',
                                fontFamily: 'monospace',
                                fontSize: '11px',
                                whiteSpace: 'pre-wrap',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                color: '#ccc'
                            }}
                        >
                            {logsLoading ? (
                                <div style={{ color: "#888" }}>Loading logs...</div>
                            ) : logsError ? (
                                <div style={{ color: "#ff4444" }}>Error: {logsError}</div>
                            ) : (
                                logs || "Log file is empty."
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function ControlRow({ action, currentKey, isListening, onListen }: { action: string, actionKey: string, currentKey: string, isListening: boolean, onListen: () => void }) {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '12px 14px',
            backgroundColor: isListening ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 255, 255, 0.04)',
            borderRadius: '10px',
            alignItems: 'center',
            border: isListening ? '1px solid rgba(76, 175, 80, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)',
            transition: 'all 0.2s ease',
        }}>
            <span style={{ fontSize: '13px', fontWeight: 500 }}>{action}</span>
            <button
                onClick={onListen}
                style={{
                    backgroundColor: isListening ? 'rgba(76, 175, 80, 0.3)' : 'rgba(0, 0, 0, 0.3)',
                    padding: '6px 16px',
                    borderRadius: '8px',
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    fontSize: '12px',
                    color: isListening ? '#4CAF50' : 'rgba(255, 255, 255, 0.7)',
                    border: isListening ? '1px solid rgba(76, 175, 80, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                    cursor: 'pointer',
                    minWidth: '80px',
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                }}
            >
                {isListening ? 'PRESS KEY...' : currentKey.replace('Key', '')}
            </button>
        </div>
    );
}
