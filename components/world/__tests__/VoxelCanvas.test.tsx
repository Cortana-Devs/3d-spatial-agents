import { createElement, type ReactNode } from "react";
import { vi, describe, it, expect } from "vitest";
import VoxelCanvas from "../VoxelCanvas";

// Mock React Three Fiber components
vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children: ReactNode }) => (
    <div data-testid="canvas">{children}</div>
  ),
  useFrame: () => {},
  useThree: () => ({
    camera: {},
    raycaster: {
      setFromCamera: vi.fn(),
      ray: {
        intersectPlane: vi.fn(),
        distanceToPoint: vi.fn(() => 1),
      },
    },
  }),
}));

vi.mock("@react-three/drei", () => ({
  OrbitControls: () => <div data-testid="orbit-controls" />,
  Grid: () => <div data-testid="grid" />,
}));

// Mock the world store
vi.mock("../../../store/worldStore", () => ({
  useWorldStore: () => ({
    blockMap: new Map(),
    selectedBlockType: "stone",
    worldLimits: { maxBlocks: 1000 },
    addBlock: vi.fn(),
    removeBlock: vi.fn(),
  }),
}));

describe("VoxelCanvas", () => {
  it("component exports correctly", () => {
    expect(VoxelCanvas).toBeDefined();
    expect(typeof VoxelCanvas).toBe("function");
  });

  it("accepts className and enablePerformanceStats props", () => {
    const props = {
      className: "test-class",
      enablePerformanceStats: true,
    };

    expect(() => {
      createElement(VoxelCanvas, props);
    }).not.toThrow();
  });
});
