import React, { useRef, useEffect } from "react";
import { useGameStore } from "@/store/gameStore";
import * as THREE from "three";

export function Minimap() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const playerPosition = useGameStore((state) => state.playerPosition);
    const agentPositions = useGameStore((state) => state.agentPositions);
    const interactables = useGameStore((state) => state.interactables);
    const obstacles = useGameStore((state) => state.obstacles);

    // Map Configuration
    const mapSize = 250; // Size of the canvas in pixels
    const worldScale = 3.0; // Pixels per world unit (higher = more zoomed in)

    // Center map on player? Or static lab view?
    // Let's do Static Lab View centered on 0,0 for now, as lab is built around origin.
    // Lab bounds approx -20 to 20 X, -10 to 60 Z based on Robot initial pos [0, 5, 65] (Lobby?)
    // Actually, Robot starts at [0, 5, 65].
    // Let's center on the average interactable position or just 0,0.
    // Better: Center on Player, but clamped?
    // Let's try Centered on Player for a "Minimap" feel.

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Clear
        ctx.clearRect(0, 0, mapSize, mapSize);

        // Background
        ctx.fillStyle = "rgba(20, 20, 30, 0.5)";
        ctx.fillRect(0, 0, mapSize, mapSize);

        const centerX = mapSize / 2;
        const centerY = mapSize / 2;

        // Transform World -> Canvas
        // Canvas X = (World X - Player X) * scale + CenterX
        // Canvas Y = (World Z - Player Z) * scale + CenterY (Z is Y in 2D top-down)

        const worldToCanvas = (x: number, z: number) => {
            const dx = (x - playerPosition.x) * worldScale;
            const dy = (z - playerPosition.z) * worldScale;
            // Rotate? No, keeping North up (World -Z) is easier for now.
            // Actually, standard minimaps rotate with player. 
            // But let's stick to "North Up" (Fixed orientation) for simplicity first.
            // World +Z is "Down" on screen?
            // World -Z is "Up" (Forward).
            return { x: centerX + dx, y: centerY + dy };
        };

        // 1. Draw Static Geometry (Obstacles - Walls, Furniture collisions)
        ctx.fillStyle = "rgba(120, 120, 160, 0.4)"; // Muted blue-grey for structure
        obstacles.forEach(ob => {
            const p = worldToCanvas(ob.position.x, ob.position.z);
            const r = ob.radius * worldScale;

            // Draw simple circles for obstacles
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(2, r), 0, Math.PI * 2);
            ctx.fill();
        });

        // 2. Draw Interactables (Active items - highlight them)
        ctx.fillStyle = "rgba(100, 200, 255, 0.8)"; // Cyan for interactables
        interactables.forEach(item => {
            const p = worldToCanvas(item.position.x, item.position.z);
            // Draw small dot
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw Agents
        ctx.fillStyle = "#ff5555"; // Red for agents
        Object.values(agentPositions).forEach(pos => {
            const p = worldToCanvas(pos.x, pos.z);
            // Check bounds (don't draw if off map?) 
            // Canvas clips automatically, but good to know.
            ctx.beginPath();
            ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
            ctx.fill();

            // Direction? (Need rotation, not currently synced)
        });

        // Draw Player (Center)
        ctx.fillStyle = "#55ff55"; // Green for player
        ctx.beginPath();
        ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
        ctx.fill();

        // Player View Cone (approx)
        // We need player rotation for this. Not in store yet.
        // For now, just a dot.

        // Grid lines
        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        ctx.beginPath();
        // Scanlines style
        for (let i = 0; i < mapSize; i += 20) {
            ctx.moveTo(0, i);
            ctx.lineTo(mapSize, i);
            ctx.moveTo(i, 0);
            ctx.lineTo(i, mapSize);
        }
        ctx.stroke();

    }, [playerPosition, agentPositions, interactables, obstacles]);

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
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                position: 'relative',
                backgroundColor: '#000'
            }}>
                <canvas
                    ref={canvasRef}
                    width={mapSize}
                    height={mapSize}
                    style={{ width: '100%', height: '100%' }}
                />

                {/* Legend / Overlay Text */}
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
