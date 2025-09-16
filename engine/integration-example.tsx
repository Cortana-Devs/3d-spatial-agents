/**
 * Engine Integration Example for Descendants Project
 * 
 * Demonstrates how to integrate the Central Engine with the existing
 * React Three Fiber 3D simulation components.
 */

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createEngine, Engine, EngineUtils, EngineMetrics, EngineSnapshot } from './index';

/**
 * React hook for managing engine lifecycle
 */
export function useEngine(config?: { 
  id?: string; 
  autoStart?: boolean; 
  tickInterval?: number;
}) {
  const [engine, setEngine] = useState<Engine | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [metrics, setMetrics] = useState<EngineMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize engine
  useEffect(() => {
    let mounted = true;

    const initEngine = async () => {
      try {
        const newEngine = await createEngine({
          id: config?.id || `descendants_engine_${Date.now()}`,
          logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
          tickIntervalMs: config?.tickInterval || 100,
          maxEventDepth: 32
        });

        if (mounted) {
          setEngine(newEngine);
          setIsRunning(true);
          setError(null);

          // Set up metrics polling
          const metricsInterval = setInterval(() => {
            if (mounted) {
              setMetrics(newEngine.getMetrics());
            }
          }, 1000);

          // Cleanup on unmount
          return () => {
            clearInterval(metricsInterval);
            newEngine.stop();
          };
        }
      } catch (err) {
        if (mounted) {
          setError(String(err));
          setIsRunning(false);
        }
      }
    };

    if (config?.autoStart !== false) {
      initEngine();
    }

    return () => {
      mounted = false;
    };
  }, [config?.id, config?.autoStart, config?.tickInterval]);

  // Engine control methods
  const start = useCallback(async () => {
    if (!engine && !isRunning) {
      // Re-initialize if needed
      const newEngine = await createEngine({
        id: config?.id || `descendants_engine_${Date.now()}`,
        logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
        tickIntervalMs: config?.tickInterval || 100
      });
      setEngine(newEngine);
      setIsRunning(true);
    }
  }, [engine, isRunning, config]);

  const stop = useCallback(async () => {
    if (engine) {
      await engine.stop();
      setEngine(null);
      setIsRunning(false);
    }
  }, [engine]);

  const restart = useCallback(async () => {
    await stop();
    await start();
  }, [stop, start]);

  return {
    engine,
    isRunning,
    metrics,
    error,
    start,
    stop,
    restart
  };
}

/**
 * Engine status display component
 */
export function EngineStatusDisplay({ engine }: { engine: Engine | null }) {
  const [snapshot, setSnapshot] = useState<EngineSnapshot | null>(null);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  useEffect(() => {
    if (!engine) return;

    const updateSnapshot = () => {
      setSnapshot(engine.snapshot());
      setLastUpdate(Date.now());
    };

    // Initial snapshot
    updateSnapshot();

    // Update every 2 seconds
    const interval = setInterval(updateSnapshot, 2000);

    return () => clearInterval(interval);
  }, [engine]);

  if (!engine || !snapshot) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <strong className="font-bold">Engine Offline</strong>
        <span className="block sm:inline"> - Engine is not running</span>
      </div>
    );
  }

  const uptime = Date.now() - (snapshot.now - 1000); // Rough uptime calculation
  const uptimeSeconds = Math.floor(uptime / 1000);
  const uptimeMinutes = Math.floor(uptimeSeconds / 60);

  return (
    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
      <div className="flex justify-between items-center">
        <div>
          <strong className="font-bold">Engine Online</strong>
          <span className="block text-sm">
            ID: {snapshot.engineId} | Uptime: {uptimeMinutes}m {uptimeSeconds % 60}s
          </span>
        </div>
        <div className="text-right text-sm">
          <div>Entities: {snapshot.entityCount}</div>
          <div>Scheduled: {snapshot.scheduled.total}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Engine metrics dashboard component
 */
export function EngineMetricsDashboard({ metrics }: { metrics: EngineMetrics | null }) {
  if (!metrics) return null;

  const successRate = metrics.requestsTotal > 0 
    ? ((metrics.requestsTotal - metrics.requestsFailed) / metrics.requestsTotal * 100)
    : 100;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
      <div className="text-center">
        <div className="text-2xl font-bold text-blue-600">{metrics.requestsTotal}</div>
        <div className="text-sm text-gray-600">Total Requests</div>
      </div>
      
      <div className="text-center">
        <div className="text-2xl font-bold text-green-600">{successRate.toFixed(1)}%</div>
        <div className="text-sm text-gray-600">Success Rate</div>
      </div>
      
      <div className="text-center">
        <div className="text-2xl font-bold text-purple-600">{metrics.averageLatencyMs.toFixed(1)}ms</div>
        <div className="text-sm text-gray-600">Avg Latency</div>
      </div>
      
      <div className="text-center">
        <div className="text-2xl font-bold text-orange-600">{metrics.activeEntities}</div>
        <div className="text-sm text-gray-600">Active Entities</div>
      </div>
    </div>
  );
}

/**
 * Integration with Three.js/R3F world
 */
export function EngineWorldIntegration({ engine }: { engine: Engine | null }) {
  const [entities, setEntities] = useState<string[]>([]);

  useEffect(() => {
    if (!engine) return;

    // Register world-related entities
    engine.registerEntity('world_manager', 'SYSTEM', 'world_controller', {
      role: 'world_management',
      capabilities: ['terrain_generation', 'physics_simulation']
    });

    engine.registerEntity('camera_controller', 'SYSTEM', 'camera', {
      position: { x: 0, y: 10, z: 10 },
      target: { x: 0, y: 0, z: 0 }
    });

    // Listen for entity registration events
    const unsubscribe = engine.on('entity:registered', (event) => {
      if (event.type === 'entity:registered') {
        setEntities(prev => [...prev, event.payload.entity.id]);
      }
    });

    // Schedule periodic world updates
    engine.scheduleAction({
      runAt: Date.now() + 1000,
      repeatEveryMs: 5000, // Every 5 seconds
      actionType: 'world.update',
      payload: { updateType: 'physics_tick' }
    });

    return unsubscribe;
  }, [engine]);

  // Example of making world mutation requests
  const handleBlockPlace = useCallback(async (position: [number, number, number], blockType: string) => {
    if (!engine) return;

    const request = EngineUtils.createRequest(
      'world.mutate',
      'world_manager',
      'SYSTEM',
      {
        operation: 'place_block',
        data: { position, blockType }
      }
    );

    const response = await engine.request(request);
    console.log('Block placement:', response.ok ? 'Success' : 'Failed');
  }, [engine]);

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-2">World Integration</h3>
      <p
        className="text-sm text-gray-600 mb-4"
        aria-live="polite"
        aria-label={`Number of registered entities: ${entities.length}`}
      >
        Registered entities: {entities.length}
      </p>
      
      <button
        onClick={() => handleBlockPlace([Math.floor(Math.random() * 20), 0, Math.floor(Math.random() * 20)], 'stone')}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Place Random Block
      </button>
    </div>
  );
}

/**
 * Complete engine integration component
 */
export function DescendantsEngineIntegration() {
  const { engine, isRunning, metrics, error } = useEngine({
    id: 'descendants_main',
    autoStart: true,
    tickInterval: 100
  });

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-bold">Descendants Engine System</h2>
      
      {/* Engine Status */}
      <EngineStatusDisplay engine={engine} />
      
      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}
      
      {/* Metrics Dashboard */}
      {metrics && <EngineMetricsDashboard metrics={metrics} />}
      
      {/* World Integration */}
      {engine && <EngineWorldIntegration engine={engine} />}
      
      {/* Debug Information */}
      {engine && process.env.NODE_ENV === 'development' && (
        <details className="bg-gray-100 p-4 rounded">
          <summary className="cursor-pointer font-semibold">Debug Information</summary>
          <pre className="mt-2 text-xs overflow-auto max-h-40">
            {JSON.stringify(engine.snapshot(), null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

/**
 * Example of using engine in a Next.js page component
 */
export default function EngineIntegrationPage() {
  return (
    <div className="container mx-auto py-8">
      <DescendantsEngineIntegration />
    </div>
  );
}
