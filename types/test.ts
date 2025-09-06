import { Vector3 } from 'three';

export interface ValidationResult {
  criteria: string;
  passed: boolean;
  notes?: string;
}

export interface PerformanceMetrics {
  averageFPS: number;
  memoryUsage: number;
  drawCalls: number;
}

export interface TestResult {
  testId: string;
  passed: boolean;
  timestamp: number;
  duration: number;
  validationResults: ValidationResult[];
  performanceMetrics: PerformanceMetrics;
  notes?: string;
}
