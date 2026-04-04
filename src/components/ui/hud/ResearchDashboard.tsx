'use client';

import React, { useEffect, useReducer, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { AgentTaskRegistry } from '@/systems/AgentTaskQueue';
import { InteractableRegistry } from '@/systems/InteractableRegistry';
import type { WorldTask, WorldTaskStatus } from '@/types/worldTask';
import { useShallow } from 'zustand/react/shallow';

type DashboardTab = 'agents' | 'labTasks' | 'diagnostics';

function statusColor(s: WorldTaskStatus): string {
  switch (s) {
    case 'open':
      return '#ffaa44';
    case 'in_progress':
    case 'claimed':
      return '#00f2ff';
    case 'done':
      return '#4caf50';
    case 'failed':
      return '#ff5555';
    default:
      return '#888';
  }
}

function formatPayloadSummary(t: WorldTask): string {
  const p = t.payload;
  if (p.kind === 'deliver') {
    const item = InteractableRegistry.getInstance().getById(p.itemId);
    const area = InteractableRegistry.getInstance().getPlacingAreaById(
      p.destAreaId,
    );
    return `Deliver: ${item?.name ?? p.itemId} → ${area?.name ?? p.destAreaId}`;
  }
  if (p.kind === 'go_zone') return `Go to zone: ${p.zoneId}`;
  return 'Follow player';
}

// ── Components ───────────────────────────────────────────────────────────────

function WorldTaskRow({
  task,
  onDispatch,
  onRelease,
  onRemove,
  onReopen,
}: {
  task: WorldTask;
  onDispatch: () => void;
  onRelease: () => void;
  onRemove: () => void;
  onReopen: () => void;
}) {
  const canDispatch =
    task.status === 'open' && task.assigneeId == null;
  const canRelease =
    task.assigneeId != null &&
    task.status !== 'done' &&
    task.status !== 'failed';
  const canReopen = task.status === 'done' || task.status === 'failed';

  const btn: React.CSSProperties = {
    padding: '6px 10px',
    fontSize: '10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 600,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.06)',
    color: '#fff',
  };

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${statusColor(task.status)}44`,
        borderRadius: '10px',
         backdropFilter: 'blur(10px)',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '12px',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: '10px',
              fontFamily: 'monospace',
              color: 'rgba(255,255,255,0.45)',
              marginBottom: '4px',
            }}
          >
            {task.id}
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600 }}>{task.title}</div>
          <div
            style={{
              fontSize: '11px',
              opacity: 0.65,
              marginTop: '6px',
              lineHeight: 1.45,
            }}
          >
            {task.description}
          </div>
          <div
            style={{
              fontSize: '10px',
              fontFamily: 'monospace',
              marginTop: '8px',
              color: 'rgba(0,242,255,0.85)',
            }}
          >
            {formatPayloadSummary(task)}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div
            style={{
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: statusColor(task.status),
            }}
          >
            {task.status.toUpperCase().replace('_', ' ')}
          </div>
          <div style={{ fontSize: '10px', opacity: 0.5, marginTop: '4px' }}>
            pri {task.priority} · {task.createdBy}
          </div>
           {task.assigneeId && (
            <div style={{ fontSize: '10px', marginTop: '4px', color: '#00f2ff' }}>
              → {task.assigneeId}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {canDispatch && (
          <button
            type="button"
            style={{ ...btn, borderColor: 'rgba(0,242,255,0.4)', color: '#00f2ff' }}
            onClick={onDispatch}
          >
            Dispatch now
          </button>
        )}
        {canRelease && (
          <button type="button" style={btn} onClick={onRelease}>
            Release assignee
          </button>
        )}
        {canReopen && (
          <button type="button" style={btn} onClick={onReopen}>
            Reopen task
          </button>
        )}
        <button
          type="button"
          style={{
            ...btn,
            borderColor: 'rgba(255,85,85,0.35)',
            color: '#ff8888',
          }}
          onClick={onRemove}
        >
          Remove
        </button>
      </div>
    </div>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────────────────

export default function ResearchDashboard() {
  const [, tick] = useReducer((n) => n + 1, 0);
  const [tab, setTab] = useState<DashboardTab>('agents');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const {
    activeResearchAgents,
    spawnAgent,
    removeAgent,
    setMenuPanelOpen,
    setInspectedAgentId,
    setFollowingAgentId,
    worldTasksById,
    dispatchOpenWorldTask,
    addWorldTask,
    removeWorldTask,
    updateWorldTask,
    releaseWorldTask,
    setTaskPanelOpen,
    agentMetrics,
    purgeAgentMemory,
    purgeGlobalPersistence
  } = useGameStore(useShallow((s) => ({
    activeResearchAgents: s.activeResearchAgents,
    spawnAgent: s.spawnAgent,
    removeAgent: s.removeAgent,
    setMenuPanelOpen: s.setMenuPanelOpen,
    setInspectedAgentId: s.setInspectedAgentId,
    setFollowingAgentId: s.setFollowingAgentId,
    worldTasksById: s.worldTasksById,
    dispatchOpenWorldTask: s.dispatchOpenWorldTask,
    addWorldTask: s.addWorldTask,
    removeWorldTask: s.removeWorldTask,
    updateWorldTask: s.updateWorldTask,
    releaseWorldTask: s.releaseWorldTask,
    setTaskPanelOpen: s.setTaskPanelOpen,
    agentMetrics: s.agentMetrics,
    purgeAgentMemory: s.purgeAgentMemory,
    purgeGlobalPersistence: s.purgeGlobalPersistence
  })));

  useEffect(() => {
    const id = window.setInterval(() => tick(), 750);
    return () => window.clearInterval(id);
  }, []);

  const handleClose = () => {
    setMenuPanelOpen(false);
  };

  const handleSpawn = () => {
    spawnAgent();
  };

  const handleFocus = (id: string) => {
    setInspectedAgentId(id);
    setFollowingAgentId(id);
    handleClose();
  };

  const worldTasks = Object.values(worldTasksById).sort(
    (a, b) => b.priority - a.priority || b.createdAt - a.createdAt,
  );
  const openCount = worldTasks.filter(
    (t) => t.status === 'open' && t.assigneeId == null,
  ).length;
  const activeTaskCount = worldTasks.filter(
    (t) => t.status !== 'done' && t.status !== 'failed',
  ).length;

  const tabBtn = (key: DashboardTab, label: string, sub?: string) => (
    <button
      type="button"
      onClick={() => setTab(key)}
      style={{
        padding: '8px 16px',
        borderRadius: '8px',
        border:
          tab === key
            ? '1px solid rgba(0,242,255,0.6)'
            : '1px solid rgba(255,255,255,0.1)',
        background:
          tab === key ? 'rgba(0,242,255,0.12)' : 'rgba(255,255,255,0.04)',
        color: tab === key ? '#00f2ff' : 'rgba(255,255,255,0.55)',
        fontSize: '12px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      {label}
      {sub && (
        <span style={{ opacity: 0.5, fontWeight: 400, marginLeft: '6px' }}>
          {sub}
        </span>
      )}
    </button>
  );

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(1000px, 95vw)',
        height: 'min(750px, 85vh)',
        backgroundColor: 'rgba(10, 12, 20, 0.95)',
        backgroundImage: 'linear-gradient(rgba(0, 242, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 242, 255, 0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        backdropFilter: 'blur(30px)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 10000,
        color: '#fff',
        borderRadius: '16px',
        border: '1px solid rgba(0, 242, 255, 0.3)',
        boxShadow:
          '0 0 120px rgba(0,0,0,0.9), 0 0 40px rgba(0, 242, 255, 0.15)',
        overflow: 'hidden',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '24px 32px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(255,255,255,0.04)',
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 700,
              letterSpacing: '1.5px',
              color: '#00f2ff',
              textShadow: '0 0 10px rgba(0, 242, 255, 0.4)',
            }}
          >
            RESEARCH COMMAND CENTER{' '}
            <span style={{ opacity: 0.4, fontWeight: 300, marginLeft: '8px', fontSize: '14px' }}>
              v3.0.0-PRO
            </span>
          </h2>
          <div style={{ fontSize: '12px', opacity: 0.6, marginTop: '6px', fontFamily: 'monospace' }}>
            {activeResearchAgents.length} AGENTS ONLINE • SYSTEM NOMINAL • {new Date().toLocaleTimeString()}
          </div>
          <div
            style={{
              display: 'flex',
              gap: '10px',
              marginTop: '16px',
              flexWrap: 'wrap',
            }}
          >
            {tabBtn('agents', 'Agents', `[${activeResearchAgents.length}]`)}
            {tabBtn(
              'labTasks',
              'Backlog',
              `[${activeTaskCount}]`,
            )}
            {tabBtn('diagnostics', 'Diagnostics & Persistence')}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
          <button
            type="button"
            onClick={handleSpawn}
            style={{
              background: 'rgba(0, 242, 255, 0.12)',
              border: '1px solid rgba(0, 242, 255, 0.6)',
              color: '#00f2ff',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 700,
              transition: 'all 0.2s ease',
              boxShadow: '0 0 15px rgba(0, 242, 255, 0.1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 242, 255, 0.22)';
              e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 242, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0, 242, 255, 0.12)';
              e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 242, 255, 0.1)';
            }}
          >
            + DEPLOY AGENT
          </button>

          <button
            type="button"
            onClick={handleClose}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.6)',
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
               e.currentTarget.style.background = 'rgba(255,85,85,0.1)';
               e.currentTarget.style.color = '#ff5555';
            }}
             onMouseLeave={(e) => {
               e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
               e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
            }}
          >
            ✕
          </button>
        </div>
      </div>

      <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
        {tab === 'agents' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '24px',
              alignContent: 'start',
            }}
          >
            {activeResearchAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                metrics={agentMetrics[agent.id]}
                onFocus={() => handleFocus(agent.id)}
                onRemove={() => removeAgent(agent.id)}
                onPurge={() => {
                   if(confirm(`Wipe ALL memories and beliefs for ${agent.name}? This cannot be undone.`)) {
                     purgeAgentMemory(agent.id);
                   }
                }}
              />
            ))}
          </div>
        )}

        {tab === 'labTasks' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div
              style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                padding: '0 4px',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setTaskPanelOpen(true);
                  setMenuPanelOpen(false);
                }}
                style={{
                  padding: '10px 18px',
                  fontSize: '12px',
                  fontWeight: 700,
                  borderRadius: '8px',
                  border: '1px solid rgba(0,242,255,0.5)',
                  background: 'rgba(0,242,255,0.08)',
                  color: '#00f2ff',
                  cursor: 'pointer',
                }}
              >
                OPEN TASK BUILDER (M)
              </button>

              <button
                type="button"
                onClick={() => setIsAddingTask(!isAddingTask)}
                style={{
                  padding: '10px 18px',
                  fontSize: '12px',
                  fontWeight: 700,
                  borderRadius: '8px',
                  border: '1px solid #ff00ff',
                  background: isAddingTask ? 'rgba(255,0,255,0.2)' : 'rgba(255,0,255,0.05)',
                  color: '#ff00ff',
                  cursor: 'pointer',
                  boxShadow: isAddingTask ? '0 0 15px rgba(255,0,255,0.2)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                {isAddingTask ? '✕ CLOSE BUILDER' : '+ ADD RESEARCH TASK'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Permanently remove all completed/failed tasks?')) {
                    worldTasks
                      .filter((t) => t.status === 'done' || t.status === 'failed')
                      .forEach((t) => removeWorldTask(t.id));
                  }
                }}
                style={{
                  padding: '10px 18px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'rgba(255,255,255,0.7)',
                  cursor: 'pointer',
                }}
              >
                PURGE FINISHED
              </button>
               <span style={{ fontSize: '11px', opacity: 0.4, fontStyle: 'italic', marginLeft: '10px' }}>
                Backlog is synchronized across all active agent cognitive contexts.
              </span>
            </div>

            {isAddingTask && (
              <QuickTaskBuilder
                onClose={() => setIsAddingTask(false)}
                onAdd={(task) => {
                  addWorldTask(task);
                  setIsAddingTask(false);
                }}
              />
            )}

            {worldTasks.length === 0 ? (
              <div style={{ opacity: 0.3, padding: '40px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                Backlog empty. Deployed agents remain in standby mode.
              </div>
            ) : (
              worldTasks.map((task) => (
                <WorldTaskRow
                  key={task.id}
                  task={task}
                  onDispatch={() => dispatchOpenWorldTask(task.id)}
                  onRelease={() => releaseWorldTask(task.id, task.assigneeId!)}
                  onRemove={() => removeWorldTask(task.id)}
                  onReopen={() => updateWorldTask(task.id, { status: 'open', assigneeId: null })}
                />
              ))
            )}
          </div>
        )}

        {tab === 'diagnostics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <section>
              <h3 style={{ fontSize: '14px', color: '#00f2ff', marginBottom: '16px', letterSpacing: '1px' }}>GLOBAL PERSISTENCE MANAGEMENT</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                 <div style={{ padding: '24px', background: 'rgba(255,85,85,0.05)', border: '1px solid rgba(255,85,85,0.2)', borderRadius: '12px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#ff5555', marginBottom: '8px' }}>☢ TOTAL PERSISTENCE WIPE</div>
                    <p style={{ fontSize: '12px', opacity: 0.6, lineHeight: 1.5, marginBottom: '20px' }}>
                      Purge ALL persistent records from IndexedDB including beliefs, memories, and simulation states. 
                      The page will reload automatically.
                    </p>
                    <button 
                       onClick={() => {
                         if(confirm("DANGER: This will delete the entire agent-memory-db for this browser. Continue?")) {
                           purgeGlobalPersistence();
                         }
                       }}
                       style={{ background: '#ff5555', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '12px' }}
                    >
                      EXECUTE TOTAL WIPE
                    </button>
                 </div>

                 <div style={{ padding: '24px', background: 'rgba(255,170,68,0.05)', border: '1px solid rgba(255,170,68,0.2)', borderRadius: '12px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#ffaa44', marginBottom: '8px' }}>⚛ SIMULATION COGNITIVE STATS</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                          <span style={{ opacity: 0.5 }}>Active Memory Streams</span>
                          <span style={{ fontFamily: 'monospace', color: '#00f2ff' }}>{activeResearchAgents.length}</span>
                       </div>
                       <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                          <span style={{ opacity: 0.5 }}>Target LLM Frequency</span>
                          <span style={{ fontFamily: 'monospace', color: '#00f2ff' }}>Adaptive (1.5s - 5s)</span>
                       </div>
                       <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                          <span style={{ opacity: 0.5 }}>Knowledge Store Version</span>
                          <span style={{ fontFamily: 'monospace', color: '#00f2ff' }}>v4.0 (Compound Index)</span>
                       </div>
                    </div>
                 </div>
              </div>
            </section>

            <section>
              <h3 style={{ fontSize: '14px', color: '#00f2ff', marginBottom: '16px', letterSpacing: '1px' }}>NETWORK TOPOLOGY</h3>
              <div style={{ fontSize: '12px', opacity: 0.4, fontStyle: 'italic' }}>
                Topological graph visualization scheduled for v3.1 update.
              </div>
            </section>
          </div>
        )}
      </div>

      <div
        style={{
          padding: '16px 32px',
          fontSize: '11px',
          color: 'rgba(0, 242, 255, 0.4)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(0,0,0,0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: 'monospace'
        }}
      >
        <span>DEEP-MIND RESEARCH SUITE • COMMAND_MODE: ACTIVE</span>
        <span>LATENCY: NOMINAL • UPTIME: {Math.floor(performance.now()/1000)}s</span>
      </div>
    </div>
  );
}

// ── Quick Task Builder ───────────────────────────────────────────────────────

function QuickTaskBuilder({ 
  onClose, 
  onAdd 
}: { 
  onClose: () => void; 
  onAdd: (t: Omit<WorldTask, "id" | "createdAt"> & { id?: string }) => void;
}) {
  const [kind, setKind] = useState<'deliver' | 'go_zone' | 'follow_player'>('deliver');
  const [itemId, setItemId] = useState('rack-3');
  const [areaId, setAreaId] = useState('desk-supervisor-donut-inbox');
  const [zoneId, setZoneId] = useState('center-park');

  const handleAdd = () => {
    let title = "";
    let desc = "";
    let payload: any = { kind };

    if (kind === 'deliver') {
      title = `Procure ${itemId}`;
      desc = `Transfer ${itemId} to ${areaId} to support bench-top experiments.`;
      payload = { kind, itemId, destAreaId: areaId };
    } else if (kind === 'go_zone') {
      title = `Observe ${zoneId}`;
      desc = `Perform spatial reconnaissance and data entry for the ${zoneId} environment.`;
      payload = { kind, zoneId };
    } else {
      title = "Experimental Escort";
      desc = "Maintain proximity to the primary researcher and assist with mobile sensor data collection.";
      payload = { kind };
    }

    onAdd({
      title,
      description: desc,
      status: 'open',
      priority: 15,
      assigneeId: null,
      createdBy: 'player',
      payload,
    });
  };

  const inputStyle: React.CSSProperties = {
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff',
    padding: '8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontFamily: 'monospace'
  };

  return (
    <div style={{
      background: 'rgba(255,0,255,0.03)',
      border: '1px solid rgba(255,0,255,0.2)',
      borderRadius: '12px',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      marginBottom: '20px',
      boxShadow: 'inset 0 0 20px rgba(255,0,255,0.05)'
    }}>
      <div style={{ fontWeight: 700, fontSize: '14px', color: '#ff00ff', letterSpacing: '1px' }}>RESEARCH TASK TEMPLATES</div>
      
      <div style={{ display: 'flex', gap: '10px' }}>
        {[
          { id: 'deliver', label: 'Material Fetch', icon: '📦' },
          { id: 'go_zone', label: 'Spatial Recon', icon: '📡' },
          { id: 'follow_player', label: 'Researcher Escort', icon: '🛡️' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setKind(t.id as any)}
            style={{
              flex: 1,
              padding: '12px',
              background: kind === t.id ? 'rgba(255,0,255,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${kind === t.id ? '#ff00ff' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '8px',
              color: kind === t.id ? '#fff' : 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              fontSize: '11px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <span style={{ fontSize: '18px' }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '1px solid rgba(255,0,255,0.1)', paddingTop: '20px' }}>
        {kind === 'deliver' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '10px', opacity: 0.5 }}>TARGET_ITEM_ID</label>
              <select 
                value={itemId} 
                onChange={(e) => setItemId(e.target.value)}
                style={inputStyle}
              >
                <option value="rack-3">Rack 3 (Standard)</option>
                <option value="file-rack-core-lab">Core Lab Files</option>
                <option value="laptop-research-01">Research Laptop</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '10px', opacity: 0.5 }}>DESTINATION_BUREAU</label>
              <select 
                value={areaId} 
                onChange={(e) => setAreaId(e.target.value)}
                style={inputStyle}
              >
                <option value="desk-supervisor-donut-inbox">Supervisor Inbox</option>
                <option value="lab-bench-south-0">South Lab Bench</option>
                <option value="data-node-alpha-inbox">Data Node Alpha</option>
              </select>
            </div>
          </>
        )}

        {kind === 'go_zone' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '10px', opacity: 0.5 }}>COGNITIVE_ZONE_ID</label>
            <select 
              value={zoneId} 
              onChange={(e) => setZoneId(e.target.value)}
              style={inputStyle}
            >
              <option value="center-park">Center Garden</option>
              <option value="fishing-dock">Fishing Dock</option>
              <option value="core-lab">Core Lab</option>
              <option value="data-analysis">Data Analysis Wing</option>
              <option value="break-room">Break Room</option>
            </select>
          </div>
        )}

        {kind === 'follow_player' && (
          <div style={{ fontSize: '11px', opacity: 0.6, background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
            Status: Agent will track researcher coordinates in real-time. Assist mode enabled.
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
           <button
            onClick={handleAdd}
            style={{
              flex: 1,
              padding: '10px',
              background: '#ff00ff',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            CONFIRM & PUSH TO BACKLOG
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '10px 15px',
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Agent Card ───────────────────────────────────────────────────────────────

function AgentCard({
  agent,
  metrics,
  onFocus,
  onRemove,
  onPurge
}: {
  agent: {
    id: string;
    name: string;
    color: string;
    status: string;
    thoughtHistory: string[];
    currentTask: string;
  };
  metrics?: { 
    latency: number; 
    spatialRatio: number; 
    status?: 'INITIALIZING' | 'ACTIVE' 
  };
  onFocus: () => void;
  onRemove: () => void;
  onPurge: () => void;
}) {
  const queue = AgentTaskRegistry.getInstance().getQueueStatus(agent.id);
  const current = AgentTaskRegistry.getInstance()
    .getOrCreate(agent.id)
    .getCurrentTask();

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: `1px solid ${agent.color}44`,
        borderRadius: '12px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        backdropFilter: 'blur(5px)',
        transition: 'all 0.3s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
        e.currentTarget.style.borderColor = agent.color;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
        e.currentTarget.style.borderColor = `${agent.color}44`;
      }}
    >
      <div
        style={{
          padding: '14px 18px',
          background: `${agent.color}15`,
          borderBottom: `1px solid ${agent.color}25`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '10px',
              fontFamily: 'monospace',
              fontWeight: 700,
              color: agent.color,
              letterSpacing: '1.5px',
            }}
          >
            {agent.id.toUpperCase()}
          </div>
          <div style={{ fontSize: '15px', fontWeight: 700, marginTop: '2px' }}>{agent.name}</div>
        </div>
        <div
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: agent.status === 'THINKING' ? '#00f2ff' : '#444',
            boxShadow:
              agent.status === 'THINKING' ? '0 0 12px #00f2ff, 0 0 4px #00f2ff' : 'none',
          }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
         <div style={{ padding: '8px 12px', fontSize: '10px', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ opacity: 0.4 }}>LATENCY:</span> <span style={{ color: '#00f2ff', fontFamily: 'monospace' }}>{metrics?.status === 'ACTIVE' ? `${metrics.latency}ms` : '---'}</span>
         </div>
         <div style={{ padding: '8px 12px', fontSize: '10px' }}>
            <span style={{ opacity: 0.4 }}>DENSITY:</span> <span style={{ color: '#ffaa44', fontFamily: 'monospace' }}>{metrics?.status === 'ACTIVE' ? `${(metrics.spatialRatio * 100).toFixed(1)}%` : '---'}</span>
         </div>
      </div>

      <div
        style={{
          padding: '10px 14px',
          fontSize: '10px',
          fontFamily: 'monospace',
          background: 'rgba(0,0,0,0.25)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          color: 'rgba(255,255,255,0.8)',
        }}
      >
        <span style={{ opacity: 0.4 }}>QUEUE:</span> <span style={{ color: agent.color }}>{queue.phase}</span>
        {current && (
          <div style={{ marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <span style={{ opacity: 0.4 }}>ACTIVE:</span> <span style={{ color: '#fff' }}>{current.type}</span>
          </div>
        )}
      </div>

      <div
        style={{
          flex: 1,
          padding: '15px',
          fontSize: '11px',
          fontFamily: 'monospace',
          background: 'rgba(0,0,0,0.15)',
          minHeight: '120px',
          maxHeight: '180px',
          overflowY: 'auto',
          lineHeight: 1.5,
        }}
      >
        {agent.thoughtHistory.length > 0 ? (
          agent.thoughtHistory.map((thought, i) => (
            <div
              key={i}
              style={{
                marginBottom: '8px',
                opacity: i === agent.thoughtHistory.length - 1 ? 1 : 0.3,
                color: i === agent.thoughtHistory.length - 1 ? '#fff' : agent.color,
                borderLeft: `2px solid ${i === agent.thoughtHistory.length - 1 ? agent.color : 'rgba(255,255,255,0.1)'}`,
                paddingLeft: '8px',
              }}
            >
              <span style={{ opacity: 0.4 }}>{new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })} »</span> {thought}
            </div>
          ))
        ) : (
          <div style={{ opacity: 0.2, fontStyle: 'italic', display: 'flex', alignItems: 'center', height: '100%', justifyContent: 'center' }}>
            AWAITING COGNITIVE TICK...
          </div>
        )}
      </div>

      <div
        style={{
          padding: '14px',
          display: 'flex',
          gap: '10px',
          background: 'rgba(255,255,255,0.03)',
        }}
      >
        <button
          type="button"
          onClick={onFocus}
          style={{
            flex: 1,
            padding: '8px',
            fontSize: '11px',
            fontWeight: 700,
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '6px',
            color: '#fff',
            cursor: 'pointer',
            letterSpacing: '0.5px'
          }}
        >
          FOCUS_STREAM
        </button>
        <button
          type="button"
          onClick={onPurge}
          title="Reset Cognition & Memories"
          style={{
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,170,68,0.1)',
            border: '1px solid rgba(255,170,68,0.3)',
            borderRadius: '6px',
            color: '#ffaa44',
            cursor: 'pointer',
          }}
        >
          ♻
        </button>
        <button
          type="button"
          onClick={onRemove}
          style={{
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,85,85,0.1)',
            border: '1px solid rgba(255,85,85,0.3)',
            borderRadius: '6px',
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
