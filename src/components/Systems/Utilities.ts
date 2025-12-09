import * as THREE from 'three';

export function createWaterNormalMap() {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.fillStyle = '#8080ff';
    context.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 20000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const r = Math.random() * 2 + 1;
        context.beginPath();
        context.arc(x, y, r, 0, Math.PI * 2);
        context.fillStyle = `rgba(${128 + Math.random() * 50}, ${128 + Math.random() * 50}, 255, ${Math.random() * 0.1})`;
        context.fill();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

// Fractal Brownian Motion for terrain (Optimized)
export function fbm(x: number, z: number) {
    let total = 0;
    let amplitude = 1;
    let frequency = 0.005;

    // Reduced octaves for generation speed
    for (let i = 0; i < 4; i++) {
        total += (Math.sin(x * frequency) * Math.cos(z * frequency) + Math.sin(x * frequency * 1.7 + z * frequency * 0.7)) * amplitude;
        amplitude *= 0.5;
        frequency *= 2.0;
    }

    return total;
}
