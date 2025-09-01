import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock UUID for consistent testing
vi.mock('uuid', () => ({
  v4: () => 'test-uuid-123'
}));

// Mock Three.js for testing
vi.mock('three', () => ({
  Vector3: vi.fn().mockImplementation((x = 0, y = 0, z = 0) => ({ x, y, z })),
  Vector2: vi.fn().mockImplementation((x = 0, y = 0) => ({ x, y })),
  Plane: vi.fn(),
  Mesh: vi.fn()
}));