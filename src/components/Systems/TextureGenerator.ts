import * as THREE from 'three';

export class TextureGenerator {
    static createNoiseCanvas(width: number, height: number, type: 'sand' | 'rock' | 'metal' | 'wood' | 'concrete' | 'fabric') {
        if (typeof document === 'undefined') return null; // Server-side guard
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return canvas;

        const imgData = ctx.createImageData(width, height);
        const data = imgData.data;

        for (let i = 0; i < data.length; i += 4) {
            const x = (i / 4) % width;
            const y = Math.floor((i / 4) / width);

            let r = 0, g = 0, b = 0;

            if (type === 'sand') {
                const noise = Math.random();
                const base = 200 + noise * 30;
                r = base + Math.random() * 20;
                g = base - 20 + Math.random() * 20;
                b = base - 60 + Math.random() * 10;
                if (Math.random() > 0.98) { r = 255; g = 255; b = 255; }
            } else if (type === 'rock') {
                const nx = x / width;
                const ny = y / height;

                // Simplified FBM for performance
                let n = 0;
                n += (Math.sin(nx * 10) * Math.cos(ny * 10)) * 0.5;
                n += (Math.sin(nx * 30) * Math.cos(ny * 30)) * 0.25;
                n = n * 0.5 + 0.5;

                const color1 = new THREE.Color(0x4a4a4a);
                const color2 = new THREE.Color(0x8f8f8f);
                const color3 = new THREE.Color(0x554433);

                const finalColor = new THREE.Color().lerpColors(color1, color2, n);
                if (n < 0.3) finalColor.lerp(color3, 0.5);

                r = finalColor.r * 255;
                g = finalColor.g * 255;
                b = finalColor.b * 255;

            } else if (type === 'metal') {
                const noise = Math.random() * 20;
                const brush = (Math.sin(x * 0.5 + y * 0.05) * 20);
                const base = 180 + noise + brush;
                r = base; g = base; b = base + 10;
                if (Math.random() > 0.995) { r = 220; g = 220; b = 220; }
            } else if (type === 'wood') {
                const grain = Math.abs(Math.sin(x * 0.05 + Math.random() * 0.02) + Math.sin(y * 0.1));
                const base = 100 + grain * 60;
                r = base; g = base * 0.6; b = base * 0.3;
            } else if (type === 'concrete') {
                const noise = Math.random();
                const base = 120 + noise * 40;
                r = base; g = base; b = base;
                if (Math.random() > 0.99) { r = 80; g = 80; b = 80; } // Pits
            } else if (type === 'fabric') {
                const weave = (x % 4 < 2 ? 1 : 0) ^ (y % 4 < 2 ? 1 : 0);
                const base = 150 + weave * 30;
                r = base; g = base; b = base;
            }

            data[i] = Math.min(255, Math.max(0, r));
            data[i + 1] = Math.min(255, Math.max(0, g));
            data[i + 2] = Math.min(255, Math.max(0, b));
            data[i + 3] = 255;
        }

        ctx.putImageData(imgData, 0, 0);
        return canvas;
    }

    static generateTexture(type: 'sand' | 'rock' | 'metal' | 'wood' | 'concrete' | 'fabric') {
        // Reduced resolution for performance (prevent hanging)
        const size = (type === 'rock' || type === 'sand') ? 512 : 256;
        const canvas = this.createNoiseCanvas(size, size, type);
        if (!canvas) return new THREE.Texture(); // Fallback

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;

        if (type === 'sand') tex.repeat.set(50, 50);
        if (type === 'rock') tex.repeat.set(2, 2);
        if (type === 'metal') tex.repeat.set(1, 1);
        if (type === 'wood') tex.repeat.set(1, 4);
        if (type === 'concrete') tex.repeat.set(4, 4);
        if (type === 'fabric') tex.repeat.set(8, 8);

        return tex;
    }
}
