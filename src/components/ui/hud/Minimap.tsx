import React, { useRef, useEffect } from "react";
import { useGameStore } from "@/store/gameStore";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

export function Minimap() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const playerPosition = useGameStore((state) => state.playerPosition);
    const interactables = useGameStore((state) => state.interactables);
    const obstacles = useGameStore((state) => state.obstacles);

    // Map Configuration
    const mapSize = 250; 
    const worldScale = 3.0; 

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.getContext("2d", { alpha: false }); 
        }
    }, []);

    useFrame(() => {
        const canvas = canvasRef.current;
        if (!canvas || (typeof document !== 'undefined' && document.visibilityState !== 'visible')) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const { agentPositionsRef } = useGameStore.getState();

        // Clear
        ctx.clearRect(0, 0, mapSize, mapSize);

        // Background
        ctx.fillStyle = "rgba(10, 12, 20, 1)";
        ctx.fillRect(0, 0, mapSize, mapSize);

        const centerX = mapSize / 2;
        const centerY = mapSize / 2;

        const worldToCanvas = (x: number, z: number) => {
            const dx = (x - playerPosition.x) * worldScale;
            const dy = (z - playerPosition.z) * worldScale;
            return { x: centerX + dx, y: centerY + dy };
        };

        // 1. Draw Static Geometry (Obstacles)
        obstacles.forEach(ob => {
            const p = worldToCanvas(ob.position.x, ob.position.z);
            if (ob.halfExtents) {
                const w = ob.halfExtents.x * 2 * worldScale;
                const h = ob.halfExtents.z * 2 * worldScale;
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(-(ob.rotation ?? 0));
                ctx.fillStyle = ob.type === "wall"
                    ? "rgba(100, 120, 160, 0.35)"
                    : "rgba(140, 150, 180, 0.25)";
                ctx.fillRect(-w / 2, -h / 2, w, h);
                ctx.restore();
            } else if (ob.radius) {
                const r = ob.radius * worldScale;
                ctx.fillStyle = "rgba(140, 150, 180, 0.3)";
                ctx.beginPath();
                ctx.arc(p.x, p.y, Math.max(2, r), 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // 2. Draw Interactables
        ctx.fillStyle = "#00e5ff";
        interactables.forEach(item => {
            const p = worldToCanvas(item.position.x, item.position.z);
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.fill();
        });

        // 3. Draw Agents using mutable Ref
        ctx.fillStyle = "#ef5350";
        Object.values(agentPositionsRef).forEach(pos => {
            if (!pos) return;
            const p = worldToCanvas(pos.x, pos.z);
            ctx.beginPath();
            ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
            ctx.fill();
        });

        // 4. Draw Player (Center)
        ctx.fillStyle = "#4caf50";
        ctx.beginPath();
        ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
        ctx.fill();

        // Grid lines
        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        ctx.beginPath();
        for (let i = 0; i < mapSize; i += 20) {
            ctx.moveTo(0, i);
            ctx.lineTo(mapSize, i);
            ctx.moveTo(i, 0);
            ctx.lineTo(i, mapSize);
        }
        ctx.stroke();
    });

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '260px',
            flexDirection: 'column',
        }}>
            <div style={{
                width: mapSize,
                height: mapSize,
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
                border: '1px solid var(--ui-border)',
                position: 'relative',
                backgroundColor: 'var(--background)'
            }}>
                <canvas
                    ref={canvasRef}
                    width={mapSize}
                    height={mapSize}
                    style={{ width: '100%', height: '100%' }}
                />
                <div style={{
                    position: 'absolute',
                    bottom: 8,
                    left: 8,
                    fontSize: '10px',
                    color: 'rgba(255,255,255,0.5)',
                    pointerEvents: 'none'
                }}>
                    Location: {Math.round(playerPosition.x)}, {Math.round(playerPosition.z)}
                </div>
            </div>
        </div>
    );
}
