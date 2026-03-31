'use client';

import React, { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { createPortal } from 'react-dom';

export default function ResearchDashboard() {
  const {
    activeResearchAgents,
    spawnAgent,
    removeAgent,
    setMenuPanelOpen,
    setInspectedAgentId,
    setFollowingAgentId,
  } = useGameStore();

  const handleClose = () => {
    if (setMenuPanelOpen) {
      setMenuPanelOpen(false);
    }
  };

  const handleSpawn = () => {
    spawnAgent();
  };

  const handleFocus = (id: string) => {
    setInspectedAgentId(id);
    setFollowingAgentId(id);
    handleClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: 'min(900px, 95vw)',
      height: 'min(700px, 85vh)',
      backgroundColor: 'rgba(10, 12, 20, 0.9)',
      backdropFilter: 'blur(20px)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 10000,
      color: '#fff',
      borderRadius: '16px',
      border: '1px solid rgba(0, 242, 255, 0.2)',
      boxShadow: '0 0 100px rgba(0,0,0,0.8), 0 0 20px rgba(0, 242, 255, 0.1)',
      overflow: 'hidden',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(255,255,255,0.03)',
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, letterSpacing: '1px', color: '#00f2ff' }}>
            RESEARCH COMMAND CENTER <span style={{ opacity: 0.5, fontWeight: 400, marginLeft: '8px' }}>v2.0</span>
          </h2>
          <div style={{ fontSize: '12px', opacity: 0.6, marginTop: '4px' }}>
            {activeResearchAgents.length} Agents Active • Sim-Time: {new Date().toLocaleTimeString()}
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={handleSpawn}
            style={{
              background: 'rgba(0, 242, 255, 0.15)',
              border: '1px solid #00f2ff',
              color: '#00f2ff',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0, 242, 255, 0.25)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(0, 242, 255, 0.15)')}
          >
            + SPAWN AGENT
          </button>
          
          <button
            onClick={handleClose}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Grid Area */}
      <div style={{
        flex: 1,
        padding: '24px',
        overflowY: 'auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: '20px',
        alignContent: 'start',
      }}>
        {activeResearchAgents.map((agent) => (
          <AgentCard 
            key={agent.id} 
            agent={agent} 
            onFocus={() => handleFocus(agent.id)}
            onRemove={() => removeAgent(agent.id)}
          />
        ))}
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px 24px',
        fontSize: '11px',
        opacity: 0.4,
        borderTop: '1px solid rgba(255,255,255,0.05)',
        textAlign: 'right',
      }}>
        DEEP-MIND RESEARCH SUITE • SECURE SESSION
      </div>
    </div>
  );
}

function AgentCard({ agent, onFocus, onRemove }: { agent: any, onFocus: () => void, onRemove: () => void }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${agent.color}33`,
      borderRadius: '12px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      transition: 'transform 0.2s',
    }}>
      {/* Card Header */}
      <div style={{
        padding: '12px 16px',
        background: `${agent.color}11`,
        borderBottom: `1px solid ${agent.color}22`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: agent.color, letterSpacing: '1px' }}>
            {agent.id.toUpperCase()}
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600 }}>{agent.name}</div>
        </div>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: agent.status === 'THINKING' ? '#00f2ff' : '#666',
          boxShadow: agent.status === 'THINKING' ? '0 0 8px #00f2ff' : 'none',
        }} />
      </div>

      {/* Thought History */}
      <div style={{
        flex: 1,
        padding: '12px',
        fontSize: '11px',
        fontFamily: 'monospace',
        background: 'rgba(0,0,0,0.2)',
        minHeight: '100px',
        maxHeight: '150px',
        overflowY: 'auto',
      }}>
        {agent.thoughtHistory.length > 0 ? (
          agent.thoughtHistory.map((thought: string, i: number) => (
            <div key={i} style={{ 
              marginBottom: '6px', 
              opacity: i === agent.thoughtHistory.length - 1 ? 1 : 0.4,
              color: i === agent.thoughtHistory.length - 1 ? '#fff' : agent.color,
            }}>
              <span style={{ opacity: 0.5 }}>{'>'}</span> {thought}
            </div>
          ))
        ) : (
          <div style={{ opacity: 0.3, fontStyle: 'italic' }}>Initializing context...</div>
        )}
      </div>

      {/* Quick Controls */}
      <div style={{
        padding: '12px',
        display: 'flex',
        gap: '8px',
        background: 'rgba(255,255,255,0.02)',
      }}>
        <button 
          onClick={onFocus}
          style={{
            flex: 1,
            padding: '6px',
            fontSize: '10px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '4px',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          FOCUS
        </button>
        <button 
          onClick={onRemove}
          style={{
            padding: '6px 10px',
            fontSize: '10px',
            background: 'rgba(255, 85, 85, 0.1)',
            border: '1px solid rgba(255, 85, 85, 0.3)',
            borderRadius: '4px',
            color: '#ff5555',
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
