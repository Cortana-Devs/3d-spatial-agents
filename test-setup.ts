import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock UUID for consistent testing
vi.mock("uuid", () => ({
  v4: () => "test-uuid-123",
}));

// Mock Three.js classes for testing
class MockVector3 {
  x: number;
  y: number;
  z: number;

  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  clone() {
    return new MockVector3(this.x, this.y, this.z);
  }

  copy(v: MockVector3) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }

  add(v: MockVector3) {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }

  sub(v: MockVector3) {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    return this;
  }

  subVectors(a: MockVector3, b: MockVector3) {
    this.x = a.x - b.x;
    this.y = a.y - b.y;
    this.z = a.z - b.z;
    return this;
  }

  addVectors(a: MockVector3, b: MockVector3) {
    this.x = a.x + b.x;
    this.y = a.y + b.y;
    this.z = a.z + b.z;
    return this;
  }

  multiplyScalar(scalar: number) {
    this.x *= scalar;
    this.y *= scalar;
    this.z *= scalar;
    return this;
  }

  normalize() {
    const length = this.length();
    if (length === 0) return this;
    return this.multiplyScalar(1 / length);
  }

  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  distanceTo(v: MockVector3) {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    const dz = this.z - v.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
}

class MockColor {
  r: number;
  g: number;
  b: number;

  constructor(r = 1, g = 1, b = 1) {
    this.r = r;
    this.g = g;
    this.b = b;
  }
}

class MockBox3 {
  min: MockVector3;
  max: MockVector3;

  constructor(min = new MockVector3(), max = new MockVector3()) {
    this.min = min;
    this.max = max;
  }
}

vi.mock("three", () => ({
  Vector3: MockVector3,
  Color: MockColor,
  Box3: MockBox3,
  Vector2: vi.fn().mockImplementation((x = 0, y = 0) => ({ x, y })),
  Plane: vi.fn(),
  Mesh: vi.fn(),
  Object3D: vi.fn(),
  Math: {
    degToRad: (degrees: number) => degrees * (Math.PI / 180),
    radToDeg: (radians: number) => radians * (180 / Math.PI),
  },
}));

// Mock @react-three/fiber
vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => children,
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({
    camera: { position: { set: vi.fn() }, lookAt: vi.fn() },
    scene: { add: vi.fn(), remove: vi.fn() },
  })),
}));

// Mock @react-three/drei
vi.mock("@react-three/drei", () => ({
  OrbitControls: () => null,
  Environment: () => null,
  Text: ({ children }: { children: React.ReactNode }) => children,
  Line: () => null,
}));

// Mock performance for testing
Object.defineProperty(global, "performance", {
  writable: true,
  value: {
    now: vi.fn(() => Date.now()),
  },
});
