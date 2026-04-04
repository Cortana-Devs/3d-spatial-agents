/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/preserve-manual-memoization */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Minimap } from './Minimap';
import { TickSnapshotBuffer, type AgentSnapshot } from '@/debug/TickSnapshot';
import { KnowledgeGraph, type KnowledgeFact } from '@/lib/memory/KnowledgeGraph';
import { memoryStream } from '@/lib/memory/MemoryStream';
import type { MemoryObject } from '@/lib/memory/types';

// ── colour helpers ────────────────────────────────────────────────────────────

function driveColor(value: number): string {
    if (value >= 60) return '#4CAF50';
    if (value >= 30) return '#FFC107';
    return '#F44336';
}

function provenanceColor(source?: string): string {
    switch (source) {
        case 'direct_observation': return '#4CAF50';
        case 'self_action':        return '#00BCD4';
        case 'player':             return '#FF9800';
        case 'peer':               return '#9C27B0';
        case 'llm_inference':      return '#3F51B5';
        case 'reflection':         return '#607D8B';
        default:                   return '#555';
    }
}

function provenanceLabel(source?: string): string {
    const labels: Record<string, string> = {
        direct_observation: 'OBSERVED',
        self_action:        'ACTION',
        player:             'PLAYER',
        peer:               'PEER',
        llm_inference:      'LLM',
        reflection:         'REFLECT',
        system:             'SYS',
    };
    return labels[source ?? 'system'] ?? 'SYS';
}

// ── sub-component: Drive Monitor ─────────────────────────────────────────────

function DriveMonitorTab({ agentId }: { agentId: string }) {
    const [snapshot, setSnapshot] = useState<AgentSnapshot | null>(null);

    useEffect(() => {
        const update = () => {
            const buf = TickSnapshotBuffer.getInstance(agentId);
            const recent = buf.getRecent(1);
            setSnapshot(recent[0] ?? null);
        };
        update();
        const id = setInterval(update, 2000);
        return () => clearInterval(id);
    }, [agentId]);

    if (!snapshot || Object.keys(snapshot.drives).length === 0) {
        return (
            <div style={{ color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', textAlign: 'center', padding: '40px 0' }}>
                No drive data yet — agent needs to complete at least one LLM tick.
            </div>
        );
    }

    return (
        <div>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '16px' }}>
                Tick #{snapshot.tickId} &nbsp;·&nbsp; {new Date(snapshot.timestamp).toLocaleTimeString()}
                &nbsp;·&nbsp; Latency: {snapshot.latencyMs}ms &nbsp;·&nbsp; Tokens: {snapshot.tokenCount}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {Object.entries(snapshot.drives).map(([drive, value]) => (
                    <div key={drive}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 500, textTransform: 'capitalize' }}>{drive}</span>
                            <span style={{ fontSize: '13px', color: driveColor(value), fontWeight: 700, fontFamily: 'monospace' }}>
                                {value.toFixed(1)}
                            </span>
                        </div>
                        <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{
                                width: `${Math.max(0, Math.min(100, value))}%`,
                                height: '100%',
                                background: driveColor(value),
                                borderRadius: '3px',
                                transition: 'width 0.5s ease, background 0.5s ease',
                            }} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── sub-component: Decision Timeline ─────────────────────────────────────────

function DecisionTimelineTab({ agentId }: { agentId: string }) {
    const [snaps, setSnaps] = useState<AgentSnapshot[]>([]);
    const [selected, setSelected] = useState<AgentSnapshot | null>(null);

    useEffect(() => {
        const update = () => {
            setSnaps(TickSnapshotBuffer.getInstance(agentId).getAll().reverse());
        };
        update();
        const id = setInterval(update, 2000);
        return () => clearInterval(id);
    }, [agentId]);

    const dotColor = (s: AgentSnapshot) => {
        if (s.wasSubconscious) return '#888';
        if (s.criticRetries > 0) return '#F44336';
        if (s.decision === 'INTERFERE_SCRIPT') return '#2196F3';
        return '#4CAF50';
    };

    const dotLabel = (s: AgentSnapshot) => {
        if (s.wasSubconscious) return '⚪';
        if (s.criticRetries > 0) return '🔴';
        if (s.decision === 'INTERFERE_SCRIPT') return '🔵';
        return '🟢';
    };

    if (snaps.length === 0) {
        return (
            <div style={{ color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', textAlign: 'center', padding: '40px 0' }}>
                No ticks recorded yet.
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '8px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px' }}>
                {snaps.map((s) => (
                    <button
                        key={s.tickId}
                        title={`Tick #${s.tickId} — ${s.decision}`}
                        onClick={() => setSelected(selected?.tickId === s.tickId ? null : s)}
                        style={{
                            fontSize: '14px',
                            background: selected?.tickId === s.tickId ? 'rgba(255,255,255,0.12)' : 'transparent',
                            border: selected?.tickId === s.tickId ? `1px solid ${dotColor(s)}` : '1px solid transparent',
                            borderRadius: '4px', cursor: 'pointer', padding: '2px 4px', transition: 'all 0.15s',
                        }}
                    >
                        {dotLabel(s)}
                    </button>
                ))}
            </div>

            <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                <span>🟢 Observe</span><span>🔵 Act</span><span>🔴 Critic Retry</span><span>⚪ Subconscious</span>
            </div>

            {selected && (
                <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', fontSize: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px', marginBottom: '10px', color: 'rgba(255,255,255,0.6)' }}>
                        <span><b style={{ color: '#fff' }}>Tick:</b> #{selected.tickId}</span>
                        <span><b style={{ color: '#fff' }}>Time:</b> {new Date(selected.timestamp).toLocaleTimeString()}</span>
                        <span><b style={{ color: '#fff' }}>Phase:</b> {selected.taskPhase}</span>
                        <span><b style={{ color: '#fff' }}>Zone:</b> {selected.zoneId ?? '—'}</span>
                        <span><b style={{ color: '#fff' }}>Latency:</b> {selected.latencyMs}ms</span>
                        <span><b style={{ color: '#fff' }}>Tokens:</b> {selected.tokenCount}</span>
                        <span><b style={{ color: '#fff' }}>Nearby:</b> {selected.nearbyEntityCount}</span>
                        <span><b style={{ color: '#fff' }}>Retries:</b> {selected.criticRetries}</span>
                        {selected.toolCalls.length > 0 && (
                            <span style={{ gridColumn: '1 / -1' }}>
                                <b style={{ color: '#fff' }}>Tools:</b> {selected.toolCalls.join(', ')}
                            </span>
                        )}
                    </div>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '8px', fontFamily: 'monospace', color: '#a5f3fc', lineHeight: 1.6, wordBreak: 'break-word' }}>
                        "{selected.thought}"
                    </div>
                </div>
            )}
        </div>
    );
}

// ── sub-component: Knowledge Graph Viewer ────────────────────────────────────

function KnowledgeTab({ agentId }: { agentId: string }) {
    const [facts, setFacts] = useState<KnowledgeFact[]>([]);
    const [sortBy, setSortBy] = useState<'confidence' | 'updatedAt'>('confidence');
    const [clearing, setClearing] = useState(false);

    const refresh = useCallback(async () => {
        const kg = KnowledgeGraph.getInstance(agentId);
        const all = await kg.getAll();
        setFacts(sortBy === 'confidence'
            ? all.sort((a, b) => b.confidence - a.confidence)
            : all.sort((a, b) => b.updatedAt - a.updatedAt));
    }, [agentId, sortBy]);

    useEffect(() => {
        refresh();
        const id = setInterval(refresh, 3000);
        return () => clearInterval(id);
    }, [refresh]);

    const clearFact = async (fact: KnowledgeFact) => {
        await KnowledgeGraph.getInstance(agentId).clearFact(fact.subject, fact.predicate, fact.object);
        refresh();
    };

    const clearAll = async () => {
        setClearing(true);
        await KnowledgeGraph.getInstance(agentId).clearAll();
        setFacts([]);
        setClearing(false);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {(['confidence', 'updatedAt'] as const).map((key) => (
                        <button key={key} onClick={() => setSortBy(key)} style={{
                            padding: '4px 10px', fontSize: '11px', borderRadius: '4px', cursor: 'pointer',
                            background: sortBy === key ? 'rgba(76,175,80,0.2)' : 'rgba(255,255,255,0.06)',
                            border: sortBy === key ? '1px solid #4CAF50' : '1px solid rgba(255,255,255,0.1)',
                            color: sortBy === key ? '#4CAF50' : 'rgba(255,255,255,0.5)',
                        }}>{key === 'confidence' ? 'By Confidence' : 'By Recent'}</button>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{facts.length} facts</span>
                    <button onClick={clearAll} disabled={clearing || facts.length === 0} style={{
                        padding: '4px 10px', fontSize: '11px', borderRadius: '4px', cursor: 'pointer',
                        background: 'rgba(244,67,54,0.15)', border: '1px solid rgba(244,67,54,0.4)',
                        color: '#F44336', opacity: facts.length === 0 ? 0.4 : 1,
                    }}>Clear All</button>
                </div>
            </div>

            {facts.length === 0 ? (
                <div style={{ color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', textAlign: 'center', padding: '30px 0' }}>
                    No facts yet. Facts auto-extract from agent actions.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '280px', overflowY: 'auto' }}>
                    {facts.map((fact) => (
                        <div key={fact.id} style={{
                            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 60px 80px 28px',
                            gap: '8px', alignItems: 'center', padding: '6px 10px',
                            background: 'rgba(255,255,255,0.04)', borderRadius: '6px',
                            fontSize: '11px', color: 'rgba(255,255,255,0.75)',
                            opacity: fact.confidence < 0.3 ? 0.4 : 1,
                        }}>
                            <span style={{ fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={fact.subject}>{fact.subject}</span>
                            <span style={{ color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fact.predicate}</span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={fact.object}>{fact.object}</span>
                            <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
                                <div style={{ width: `${fact.confidence * 100}%`, height: '100%', background: driveColor(fact.confidence * 100), borderRadius: '2px' }} />
                            </div>
                            <span style={{
                                fontSize: '10px', padding: '2px 6px', borderRadius: '4px', textAlign: 'center',
                                background: `${provenanceColor(fact.source)}22`, color: provenanceColor(fact.source),
                                border: `1px solid ${provenanceColor(fact.source)}44`,
                            }}>{provenanceLabel(fact.source)}</span>
                            <button onClick={() => clearFact(fact)} title="Remove this fact" style={{
                                background: 'rgba(244,67,54,0.1)', border: '1px solid rgba(244,67,54,0.25)',
                                color: '#f87171', borderRadius: '4px', cursor: 'pointer', fontSize: '10px',
                                width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>✕</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── sub-component: Memory Stream Viewer ──────────────────────────────────────

function MemoryStreamTab({ agentId }: { agentId: string }) {
    const [memories, setMemories] = useState<MemoryObject[]>([]);
    const [filter, setFilter] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            const all = await memoryStream.retrieve({ agentId, limit: 40 });
            setMemories(all.reverse());
        };
        load();
        const id = setInterval(load, 3000);
        return () => clearInterval(id);
    }, [agentId]);

    const typeColors: Record<string, string> = {
        OBSERVATION:    '#06b6d4',
        DIALOGUE:       '#a855f7',
        THOUGHT:        '#3b82f6',
        ACTION:         '#22c55e',
        SCRIPT_OUTCOME: '#f59e0b',
    };

    const filtered = filter ? memories.filter((m) => m.type === filter) : memories;
    const types = ['OBSERVATION', 'DIALOGUE', 'THOUGHT', 'ACTION', 'SCRIPT_OUTCOME'];

    return (
        <div>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
                <button onClick={() => setFilter(null)} style={{
                    padding: '3px 10px', fontSize: '11px', borderRadius: '12px', cursor: 'pointer',
                    background: filter === null ? 'rgba(255,255,255,0.15)' : 'transparent',
                    border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)',
                }}>All ({memories.length})</button>
                {types.map((t) => (
                    <button key={t} onClick={() => setFilter(filter === t ? null : t)} style={{
                        padding: '3px 10px', fontSize: '11px', borderRadius: '12px', cursor: 'pointer',
                        background: filter === t ? `${typeColors[t]}22` : 'transparent',
                        border: `1px solid ${filter === t ? typeColors[t] : 'rgba(255,255,255,0.1)'}`,
                        color: filter === t ? typeColors[t] : 'rgba(255,255,255,0.5)',
                    }}>{t}</button>
                ))}
            </div>

            {filtered.length === 0 ? (
                <div style={{ color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', textAlign: 'center', padding: '30px 0' }}>
                    No memories matching filter.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '280px', overflowY: 'auto' }}>
                    {filtered.map((m) => (
                        <div key={m.id} style={{
                            padding: '8px 10px', background: 'rgba(255,255,255,0.04)',
                            borderRadius: '6px', borderLeft: `3px solid ${typeColors[m.type] ?? '#555'}`,
                        }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                                <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: `${typeColors[m.type]}22`, color: typeColors[m.type] ?? '#888' }}>{m.type}</span>
                                <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: `${provenanceColor(m.source)}22`, color: provenanceColor(m.source), border: `1px solid ${provenanceColor(m.source)}44` }}>{provenanceLabel(m.source)}</span>
                                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>
                                    {new Date(m.timestamp).toLocaleTimeString()} · imp {m.importance}
                                </span>
                            </div>
                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.5, wordBreak: 'break-word' }}>
                                {m.content}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Main GameMenu ─────────────────────────────────────────────────────────────

export default function GameMenu() {
    const {
        invertedMouse, setInvertedMouse,
        sensitivity, setSensitivity,
        volume, setVolume,
        setMenuPanelOpen,
        keyBindings, setKeyBinding,
        activeResearchAgents,
    } = useGameStore();

    const [activeTab, setActiveTab] = useState<'map' | 'settings' | 'controls' | 'logs' | 'cognitive'>('map');
    const [listeningFor, setListeningFor] = useState<string | null>(null);
    const [cogAgentId, setCogAgentId] = useState<string>('agent-01');
    const [cogSubTab, setCogSubTab] = useState<'drives' | 'timeline' | 'knowledge' | 'memory'>('drives');

    const [logs, setLogs] = useState<string>('');
    const [logsLoading, setLogsLoading] = useState(false);
    const [logsError, setLogsError] = useState<string | null>(null);

    useEffect(() => {
        if (activeTab === 'logs') {
            setLogsLoading(true);
            fetch('/api/logs/groq')
                .then(async (res) => { if (!res.ok) throw new Error('Failed to load logs'); return res.text(); })
                .then((text) => { setLogs(text); setLogsLoading(false); })
                .catch((err) => { setLogsError(err.message); setLogsLoading(false); });
        }
    }, [activeTab]);

    const handleDownloadLogs = () => {
        const blob = new Blob([logs], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'groq_interactions.csv';
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
    };

    const handleClose = () => { if (setMenuPanelOpen) setMenuPanelOpen(false); };

    useEffect(() => {
        if (!listeningFor) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            e.preventDefault(); e.stopPropagation();
            if (e.code === 'Escape' && listeningFor !== 'menu') { setListeningFor(null); return; }
            setKeyBinding(listeningFor, e.code);
            setListeningFor(null);
        };
        window.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
    }, [listeningFor, setKeyBinding]);

    const tabStyle = (tab: string) => ({
        background: activeTab === tab ? 'var(--color-success-bg)' : 'transparent',
        border: activeTab === tab ? '1px solid var(--color-success)' : '1px solid transparent',
        color: activeTab === tab ? 'var(--color-success)' : 'rgba(255,255,255,0.5)',
        fontSize: '13px', cursor: 'pointer' as const,
        textTransform: 'capitalize' as const,
        fontWeight: activeTab === tab ? 600 : 400,
        padding: '8px 16px', borderRadius: 'var(--radius-sm)',
        transition: 'all 0.2s ease', letterSpacing: '0.3px', whiteSpace: 'nowrap' as const,
    });

    const cogSubTabStyle = (tab: string) => ({
        background: cogSubTab === tab ? 'rgba(255,255,255,0.1)' : 'transparent',
        border: 'none',
        color: cogSubTab === tab ? '#fff' : 'rgba(255,255,255,0.45)',
        fontSize: '12px', cursor: 'pointer' as const,
        padding: '6px 14px', borderRadius: 'var(--radius-sm)',
        fontWeight: cogSubTab === tab ? 600 : 400, transition: 'all 0.15s',
    });

    return (
        <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -55%)',
            width: 'min(820px, 94vw)', maxHeight: '75vh',
            backgroundColor: 'var(--ui-bg)',
            backdropFilter: 'blur(var(--ui-blur))', WebkitBackdropFilter: 'blur(var(--ui-blur))',
            display: 'flex', flexDirection: 'column', zIndex: 1000,
            color: 'var(--foreground)', fontFamily: 'inherit',
            borderRadius: 'var(--radius-md)', border: '1px solid var(--ui-border)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.5), 0 0 1px rgba(255,255,255,0.1)',
            overflow: 'hidden',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 20px', borderBottom: '1px solid var(--ui-border)',
                gap: '8px', flexWrap: 'wrap',
            }}>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {(['map', 'settings', 'controls', 'logs', 'cognitive'] as const).map((tab) => (
                        <button key={tab} onClick={() => setActiveTab(tab)} style={tabStyle(tab)}>
                            {tab === 'map' ? '🗺️ Map'
                                : tab === 'settings' ? '⚙️ Settings'
                                : tab === 'controls' ? '🎮 Controls'
                                : tab === 'logs' ? '📋 Logs'
                                : '🧠 Cognitive'}
                        </button>
                    ))}
                </div>
                <button onClick={handleClose} style={{
                    background: 'var(--color-agent-bg)', border: '1px solid var(--ui-border)',
                    color: 'rgba(255,255,255,0.5)', width: '36px', height: '36px',
                    borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '18px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s ease', flexShrink: 0,
                }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,80,80,0.2)'; e.currentTarget.style.color = '#ff5555'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
                >✕</button>
            </div>

            {/* Content */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>

                {/* Map */}
                {activeTab === 'map' && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '260px', flexDirection: 'column' }}>
                        <Minimap />
                        <p style={{ margin: '8px 0 0', fontSize: '12px', opacity: 0.5, color: 'white' }}>
                            Research Lab Layout · {new Date().toLocaleTimeString()}
                        </p>
                    </div>
                )}

                {/* Settings */}
                {activeTab === 'settings' && (
                    <div style={{ maxWidth: '500px', margin: '0 auto' }}>
                        <h3 style={{ fontWeight: 500, fontSize: '16px', color: 'rgba(255,255,255,0.6)', marginTop: 0, marginBottom: '24px' }}>Game Settings</h3>
                        <div style={{ margin: '0 0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', backgroundColor: 'var(--color-agent-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--ui-border)' }}>
                            <label htmlFor="inverted-mouse" style={{ fontSize: '14px', fontWeight: 500 }}>Inverted Mouse</label>
                            <input id="inverted-mouse" type="checkbox" checked={invertedMouse} onChange={(e) => setInvertedMouse(e.target.checked)} style={{ transform: 'scale(1.3)', cursor: 'pointer', accentColor: 'var(--color-success)' }} />
                        </div>
                        <div style={{ margin: '0 0 20px', padding: '14px 16px', backgroundColor: 'var(--color-agent-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--ui-border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <label htmlFor="sensitivity" style={{ fontSize: '14px', fontWeight: 500 }}>Mouse Sensitivity</label>
                                <span style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: '14px' }}>{sensitivity.toFixed(1)}</span>
                            </div>
                            <input id="sensitivity" type="range" min="0.1" max="5.0" step="0.1" value={sensitivity} onChange={(e) => setSensitivity(parseFloat(e.target.value))} style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--color-success)' }} />
                        </div>
                        <div style={{ margin: '0 0 20px', padding: '14px 16px', backgroundColor: 'var(--color-agent-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--ui-border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <label htmlFor="volume" style={{ fontSize: '14px', fontWeight: 500 }}>Master Volume</label>
                                <span style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: '14px' }}>{Math.round(volume * 100)}%</span>
                            </div>
                            <input id="volume" type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--color-success)' }} />
                        </div>
                    </div>
                )}

                {/* Controls */}
                {activeTab === 'controls' && (
                    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                        <h3 style={{ fontWeight: 500, fontSize: '16px', color: 'rgba(255,255,255,0.6)', marginTop: 0, marginBottom: '8px' }}>Key Bindings</h3>
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
                            <ControlRow action="Agent Communication" actionKey="agentComms" currentKey={keyBindings.agentComms} isListening={listeningFor === 'agentComms'} onListen={() => setListeningFor('agentComms')} />
                            <ControlRow action="Debug Mode" actionKey="debugMode" currentKey={keyBindings.debugMode} isListening={listeningFor === 'debugMode'} onListen={() => setListeningFor('debugMode')} />
                        </div>
                    </div>
                )}

                {/* Logs */}
                {activeTab === 'logs' && (
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontWeight: 500, fontSize: '16px', color: 'rgba(255,255,255,0.6)', margin: 0 }}>System Logs</h3>
                            <button onClick={handleDownloadLogs} disabled={logsLoading || !!logsError || !logs} style={{
                                padding: '6px 12px', backgroundColor: '#2563eb', color: 'white',
                                border: 'none', borderRadius: '6px', cursor: 'pointer',
                                fontSize: '12px', fontWeight: 500,
                                opacity: logsLoading || !!logsError || !logs ? 0.5 : 1,
                            }}>Download CSV</button>
                        </div>
                        <div style={{
                            flex: 1, backgroundColor: 'var(--color-agent-bg)', borderRadius: 'var(--radius-sm)',
                            padding: '16px', overflow: 'auto', fontFamily: 'monospace', fontSize: '11px',
                            whiteSpace: 'pre-wrap', border: '1px solid var(--ui-border)', color: 'var(--foreground)', opacity: 0.8,
                        }}>
                            {logsLoading ? <span style={{ color: '#888' }}>Loading logs...</span>
                                : logsError ? <span style={{ color: '#ff4444' }}>Error: {logsError}</span>
                                : logs || 'Log file is empty.'}
                        </div>
                    </div>
                )}

                {/* 🧠 Cognitive Dashboard */}
                {activeTab === 'cognitive' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Agent:</span>
                                <select value={cogAgentId} onChange={(e) => setCogAgentId(e.target.value)} style={{
                                    background: 'var(--color-agent-bg)', border: '1px solid var(--ui-border)',
                                    color: '#fff', borderRadius: '6px', padding: '6px 10px', fontSize: '13px', cursor: 'pointer',
                                }}>
                                    {activeResearchAgents.map((a) => (
                                        <option key={a.id} value={a.id}>{a.name} ({a.id})</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px' }}>
                                {(['drives', 'timeline', 'knowledge', 'memory'] as const).map((t) => (
                                    <button key={t} onClick={() => setCogSubTab(t)} style={cogSubTabStyle(t)}>
                                        {t === 'drives' ? '📊 Drives' : t === 'timeline' ? '🕐 Timeline' : t === 'knowledge' ? '🧩 Knowledge' : '🧬 Memory'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '16px', minHeight: '220px' }}>
                            {cogSubTab === 'drives'    && <DriveMonitorTab agentId={cogAgentId} />}
                            {cogSubTab === 'timeline'  && <DecisionTimelineTab agentId={cogAgentId} />}
                            {cogSubTab === 'knowledge' && <KnowledgeTab agentId={cogAgentId} />}
                            {cogSubTab === 'memory'    && <MemoryStreamTab agentId={cogAgentId} />}
                        </div>

                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginTop: '10px', textAlign: 'center' }}>
                            Data refreshes every 2–3 s · Tick snapshots in-memory only · Knowledge facts persist to IndexedDB
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

function ControlRow({ action, currentKey, isListening, onListen }: { action: string, actionKey: string, currentKey: string, isListening: boolean, onListen: () => void }) {
    return (
        <div style={{
            display: 'flex', justifyContent: 'space-between', padding: '12px 14px',
            backgroundColor: isListening ? 'var(--color-success-bg)' : 'var(--color-agent-bg)',
            borderRadius: 'var(--radius-sm)', alignItems: 'center',
            border: isListening ? '1px solid var(--color-success)' : '1px solid var(--ui-border)',
            transition: 'all 0.2s ease',
        }}>
            <span style={{ fontSize: '13px', fontWeight: 500 }}>{action}</span>
            <button onClick={onListen} style={{
                backgroundColor: isListening ? 'var(--color-success-bg)' : 'var(--color-agent-bg)',
                padding: '6px 16px', borderRadius: 'var(--radius-sm)',
                fontFamily: 'monospace', fontWeight: 600, fontSize: '12px',
                color: isListening ? 'var(--color-success)' : 'rgba(255,255,255,0.7)',
                border: isListening ? '1px solid var(--color-success)' : '1px solid var(--ui-border)',
                cursor: 'pointer', minWidth: '80px', textAlign: 'center', transition: 'all 0.2s ease',
            }}>
                {isListening ? 'PRESS KEY...' : currentKey.replace('Key', '')}
            </button>
        </div>
    );
}
