import { Material, MeshStandardMaterial } from 'three';

export class MaterialPresetManager {
  private static instance: MaterialPresetManager;
  private presets: Map<string, Material>;

  private constructor() {
    this.presets = new Map();
    this.initializePresets();
  }

  public static getInstance(): MaterialPresetManager {
    if (!MaterialPresetManager.instance) {
      MaterialPresetManager.instance = new MaterialPresetManager();
    }
    return MaterialPresetManager.instance;
  }

  private initializePresets() {
    // Basic presets
    this.addPreset('standard', new MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.7,
      metalness: 0.0
    }));

    // Glass presets
    this.addPreset('clear-glass', new MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.1,
      metalness: 0.3,
      transparent: true,
      opacity: 0.3
    }));

    this.addPreset('frosted-glass', new MeshStandardMaterial({
      color: 0xe0e0e0,
      roughness: 0.4,
      metalness: 0.2,
      transparent: true,
      opacity: 0.5
    }));
  }

  public addPreset(name: string, material: Material) {
    this.presets.set(name, material);
  }

  public getPreset(name: string): Material | undefined {
    return this.presets.get(name);
  }

  public getAllPresets(): Array<[string, Material]> {
    return Array.from(this.presets.entries());
  }

  public createCustomPreset(name: string, params: {
    color?: number;
    roughness?: number;
    metalness?: number;
    transparent?: boolean;
    opacity?: number;
  }): Material {
    const material = new MeshStandardMaterial(params);
    this.addPreset(name, material);
    return material;
  }

  public static applyPreset(preset: any): Material {
    const instance = MaterialPresetManager.getInstance();
    return instance.createCustomPreset(preset.name || 'custom', preset);
  }
}
