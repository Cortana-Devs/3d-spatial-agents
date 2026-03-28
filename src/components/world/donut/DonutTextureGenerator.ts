import * as THREE from "three";

export class TextureGenerator {
  // Elite Performance: Cache textures to prevent expensive canvas operations on re-renders
  static textureCache: Record<string, THREE.Texture> = {};

  static createWoodCanvas(width: number, height: number, type: "color" | "bump") {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;

    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    const plankWidth = 48;
    const plankHeight = 256;
    const gap = 2;

    for (let i = 0; i < data.length; i += 4) {
      const pixelIndex = i / 4;
      const x = pixelIndex % width;
      const y = Math.floor(pixelIndex / width);

      const plankX = Math.floor(x / plankWidth);
      const yOffset = (plankX % 2 === 0) ? 0 : plankHeight / 2;
      const localY = (y + yOffset) % plankHeight;
      const localX = x % plankWidth;

      const isGap = localX < gap || localY < gap;

      let r = 0, g = 0, b = 0;

      if (isGap) {
        if (type === "bump") {
          r = 0; g = 0; b = 0;
        } else {
          // Light subtle gap between planks
          r = 160; g = 140; b = 120;
        }
      } else {
        // Plank variation
        const plankSeed = plankX * 31.4 + Math.floor((y + yOffset) / plankHeight) * 17.2;
        const plankDarkness = (Math.sin(plankSeed) * 0.5 + 0.5) * 25; // More contrast

        // Wood grain (wobbly vertical lines)
        const grainWobble = Math.sin(y * 0.02 + plankSeed) * 4;
        const grain = Math.sin((x + grainWobble) * 0.4) * 12 + Math.random() * 6;

        if (type === "bump") {
          const val = 240 + grain;
          r = val; g = val; b = val;
        } else {
          // Premium Warm Oak Wood
          const baseR = 200 - plankDarkness + grain;
          const baseG = 160 - plankDarkness + grain * 0.9;
          const baseB = 110 - plankDarkness + grain * 0.8;
          r = Math.max(0, Math.min(255, baseR));
          g = Math.max(0, Math.min(255, baseG));
          b = Math.max(0, Math.min(255, baseB));
        }
      }
      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas;
  }

  static generateTexture(type: "color" | "bump") {
    if (this.textureCache[type]) return this.textureCache[type];

    const canvas = this.createWoodCanvas(512, 512, type);
    if (!canvas) return new THREE.Texture();
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(20, 20);
    
    // CRITICAL FIX: Set correct color space so the texture isn't washed out to white
    if (type === "color") {
      tex.colorSpace = THREE.SRGBColorSpace;
    } else {
      tex.colorSpace = THREE.NoColorSpace; // Bump maps should remain linear
    }
    
    this.textureCache[type] = tex;
    return tex;
  }
}
