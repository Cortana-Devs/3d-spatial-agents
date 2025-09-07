import { Scene, Object3D, Light } from 'three';

export interface BenchmarkScenario {
  objects: Object3D[];
  lights: Light[];
  cleanup: () => void;
}

export interface TestResult {
  name: string;
  fps: number;
  drawCalls: number;
  triangles: number;
  passed: boolean;
  details?: string;
}

export interface MaterialTestConfig {
  name: string;
  color: string;
  opacity: number;
  roughness: number;
  metalness: number;
}

export interface BenchmarkTest {
  name: string;
  description: string;
  minFPS: number;
  maxDrawCalls: number;
  run: () => Promise<TestResult>;
}
