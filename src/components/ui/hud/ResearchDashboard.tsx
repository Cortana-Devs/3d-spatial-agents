'use client';

import React, { useEffect, useReducer, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { AgentTaskRegistry } from '@/systems/AgentTaskQueue';
import { InteractableRegistry } from '@/systems/InteractableRegistry';
import type { WorldTask, WorldTaskStatus } from '@/types/worldTask';

type DashboardTab = 'agents' | 'labTasks';

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
          {task.helpersNeeded && (
            <div style={{ fontSize: '9px', marginTop: '4px', color: '#ffaa44' }}>
              helpers OK
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

export default function ResearchDashboard() {
  const [, tick] = useReducer((n) => n + 1, 0);
  const [tab, setTab] = useState<DashboardTab>('agents');

  const activeResearchAgents = useGameStore((s) => s.activeResearchAgents);
  const spawnAgent = useGameStore((s) => s.spawnAgent);
  const removeAgent = useGameStore((s) => s.removeAgent);
  const setMenuPanelOpen = useGameStore((s) => s.setMenuPanelOpen);
  const setInspectedAgentId = useGameStore((s) => s.setInspectedAgentId);
  const setFollowingAgentId = useGameStore((s) => s.setFollowingAgentId);
  const worldTasksById = useGameStore((s) => s.worldTasksById);
  const dispatchOpenWorldTask = useGameStore((s) => s.dispatchOpenWorldTask);
  const removeWorldTask = useGameStore((s) => s.removeWorldTask);
  const updateWorldTask = useGameStore((s) => s.updateWorldTask);
  const releaseWorldTask = useGameStore((s) => s.releaseWorldTask);
  const clearWorldTasks = useGameStore((s) => s.clearWorldTasks);
  const setTaskPanelOpen = useGameStore((s) => s.setTaskPanelOpen);

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
        boxShadow:
          '0 0 100px rgba(0,0,0,0.8), 0 0 20px rgba(0, 242, 255, 0.1)',
        overflow: 'hidden',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(255,255,255,0.03)',
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 600,
              letterSpacing: '1px',
              color: '#00f2ff',
            }}
          >
            RESEARCH COMMAND CENTER{' '}
            <span style={{ opacity: 0.5, fontWeight: 400, marginLeft: '8px' }}>
              v2.0
            </span>
          </h2>
          <div style={{ fontSize: '12px', opacity: 0.6, marginTop: '4px' }}>
            {activeResearchAgents.length} Agents Active • Sim-Time:{' '}
            {new Date().toLocaleTimeString()}
          </div>
          <div
            style={{
              display: 'flex',
              gap: '8px',
              marginTop: '12px',
              flexWrap: 'wrap',
            }}
          >
            {tabBtn('agents', 'Agents')}
            {tabBtn(
              'labTasks',
              'Shared lab tasks',
              `(${activeTaskCount} active, ${openCount} unassigned)`,
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <button
            type="button"
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
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = 'rgba(0, 242, 255, 0.25)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = 'rgba(0, 242, 255, 0.15)')
            }
          >
            + SPAWN AGENT
          </button>

          <button
            type="button"
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

      {tab === 'agents' && (
        <div
          style={{
            flex: 1,
            padding: '24px',
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '20px',
            alignContent: 'start',
          }}
        >
          {activeResearchAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onFocus={() => handleFocus(agent.id)}
              onRemove={() => removeAgent(agent.id)}
            />
          ))}
        </div>
      )}

      {tab === 'labTasks' && (
        <div
          style={{
            flex: 1,
            padding: '24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px',
              alignItems: 'center',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setTaskPanelOpen(true);
                setMenuPanelOpen(false);
              }}
              style={{
                padding: '8px 14px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '6px',
                border: '1px solid rgba(0,242,255,0.45)',
                background: 'rgba(0,242,255,0.1)',
                color: '#00f2ff',
                cursor: 'pointer',
              }}
            >
              Open task builder (M)
            </button>
            <button
              type="button"
              onClick={() => {
                if (
                  !confirm(
                    'Remove all completed / failed tasks from the list?',
                  )
                )
                  return;
                worldTasks
                  .filter((t) => t.status === 'done' || t.status === 'failed')
                  .forEach((t) => removeWorldTask(t.id));
              }}
              style={{
                padding: '8px 14px',
                fontSize: '11px',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.05)',
                color: 'rgba(255,255,255,0.7)',
                cursor: 'pointer',
              }}
            >
              Clear finished
            </button>
            <span style={{ fontSize: '11px', opacity: 0.45 }}>
              Agents read this backlog in their LLM context; dispatch assigns an
              idle agent to the physical steps.
            </span>
          </div>

          {worldTasks.length === 0 ? (
            <div
              style={{
                opacity: 0.45,
                fontSize: '13px',
                fontStyle: 'italic',
                padding: '24px',
                textAlign: 'center',
              }}
            >
              No shared tasks. Scenario seeds appear when the Donut Lab loads;
              use Task Assignment (M) to add more.
            </div>
          ) : (
            worldTasks.map((task) => (
              <WorldTaskRow
                key={task.id}
                task={task}
                onDispatch={() => {
                  const id = dispatchOpenWorldTask(task.id);
                  if (!id) {
                    window.alert(
                      'No agent available (check queues / chat lock) or task is not open.',
                    );
                  }
                }}
                onRelease={() => {
                  if (task.assigneeId) {
                    releaseWorldTask(task.id, task.assigneeId);
                  }
                }}
                onRemove={() => {
                  if (
                    !confirm(
                      `Remove "${task.title}" from the shared backlog?`,
                    )
                  )
                    return;
                  removeWorldTask(task.id);
                }}
                onReopen={() => {
                  updateWorldTask(task.id, {
                    status: 'open',
                    assigneeId: null,
                  });
                }}
              />
            ))
          )}
        </div>
      )}

      <div
        style={{
          padding: '12px 24px',
          fontSize: '11px',
          opacity: 0.4,
          borderTop: '1px solid rgba(255,255,255,0.05)',
          textAlign: 'right',
        }}
      >
        DEEP-MIND RESEARCH SUITE • ESC menu • Shared tasks sync to agents
      </div>
    </div>
  );
}

function AgentCard({
  agent,
  onFocus,
  onRemove,
}: {
  agent: {
    id: string;
    name: string;
    color: string;
    status: string;
    thoughtHistory: string[];
  };
  onFocus: () => void;
  onRemove: () => void;
}) {
  const queue = AgentTaskRegistry.getInstance().getQueueStatus(agent.id);
  const current = AgentTaskRegistry.getInstance()
    .getOrCreate(agent.id)
    .getCurrentTask();

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${agent.color}33`,
        borderRadius: '12px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          background: `${agent.color}11`,
          borderBottom: `1px solid ${agent.color}22`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: agent.color,
              letterSpacing: '1px',
            }}
          >
            {agent.id.toUpperCase()}
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600 }}>{agent.name}</div>
        </div>
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: agent.status === 'THINKING' ? '#00f2ff' : '#666',
            boxShadow:
              agent.status === 'THINKING' ? '0 0 8px #00f2ff' : 'none',
          }}
        />
      </div>

      <div
        style={{
          padding: '8px 12px',
          fontSize: '10px',
          fontFamily: 'monospace',
          background: 'rgba(0,0,0,0.35)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          color: 'rgba(255,255,255,0.75)',
        }}
      >
        Queue: <span style={{ color: '#00f2ff' }}>{queue.phase}</span>
        {current && (
          <>
            {' '}
            · now:{' '}
            <span style={{ color: '#fff' }}>{current.type}</span>
            {current.worldTaskId && (
              <span style={{ opacity: 0.6 }}>
                {' '}
                (wt: {current.worldTaskId.slice(0, 12)}…)
              </span>
            )}
          </>
        )}
      </div>

      <div
        style={{
          flex: 1,
          padding: '12px',
          fontSize: '11px',
          fontFamily: 'monospace',
          background: 'rgba(0,0,0,0.2)',
          minHeight: '100px',
          maxHeight: '150px',
          overflowY: 'auto',
        }}
      >
        {agent.thoughtHistory.length > 0 ? (
          agent.thoughtHistory.map((thought: string, i: number) => (
            <div
              key={i}
              style={{
                marginBottom: '6px',
                opacity: i === agent.thoughtHistory.length - 1 ? 1 : 0.4,
                color:
                  i === agent.thoughtHistory.length - 1 ? '#fff' : agent.color,
              }}
            >
              <span style={{ opacity: 0.5 }}>{'>'}</span> {thought}
            </div>
          ))
        ) : (
          <div style={{ opacity: 0.3, fontStyle: 'italic' }}>
            Initializing context...
          </div>
        )}
      </div>

      <div
        style={{
          padding: '12px',
          display: 'flex',
          gap: '8px',
          background: 'rgba(255,255,255,0.02)',
        }}
      >
        <button
          type="button"
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
          type="button"
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
