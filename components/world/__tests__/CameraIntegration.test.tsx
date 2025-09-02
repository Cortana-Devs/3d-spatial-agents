import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import VoxelCanvas from "../VoxelCanvas";
import { useWorldStore } from "../../../store/worldStore";

// Mock the world store
vi.mock("../../../store/worldStore", () => ({
  useWorldStore: vi.fn(),
}));

// Mock Three.js and React Three Fiber
vi.mock("@react-three/fiber", () => ({
  Canvas: vi.fn(({ children, ...props }) => (
    <div data-testid="canvas" {...props}>
      {children}
    </div>
  )),
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({
    camera: {
      position: {
        x: 10,
        y: 10,
        z: 10,
        clone: vi.fn(),
        copy: vi.fn(),
        add: vi.fn(),
        lerp: vi.fn(),
        lookAt: vi.fn(),
      },
      quaternion: { setFromEuler: vi.fn() },
      fov: 60,
      updateProjectionMatrix: vi.fn(),
      getWorldDirection: vi.fn(),
    },
    gl: {
      domElement: document.createElement("canvas"),
    },
    raycaster: {
      setFromCamera: vi.fn(),
      ray: {
        intersectPlane: vi.fn(),
        distanceToPoint: vi.fn(),
      },
    },
  })),
}));

// Mock drei components
vi.mock("@react-three/drei", () => ({
  OrbitControls: vi.fn(() => null),
}));

// Mock Lucide React icons
vi.mock("lucide-react", () => ({
  Camera: () => <div data-testid="camera-icon" />,
  Move3D: () => <div data-testid="move3d-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  Video: () => <div data-testid="video-icon" />,
  RotateCcw: () => <div data-testid="rotateccw-icon" />,
  Maximize2: () => <div data-testid="maximize2-icon" />,
  Mountain: () => <div data-testid="mountain-icon" />,
  ArrowUp: () => <div data-testid="arrowup-icon" />,
  Navigation: () => <div data-testid="navigation-icon" />,
}));

// Mock GridSystem
vi.mock("../GridSystem", () => ({
  default: vi.fn(() => null),
  useGridConfig: vi.fn(() => ({
    config: {
      size: 50,
      cellSize: 1,
      opacity: 0.3,
      visibility: true,
      fadeDistance: 30,
      fadeStrength: 1,
      rippleEnabled: true,
      snapToGrid: true,
      showSnapIndicators: true,
    },
  })),
}));

const mockUseWorldStore = useWorldStore as jest.MockedFunction<typeof useWorldStore>;

describe("Camera Integration", () => {
  beforeEach(() => {
    mockUseWorldStore.mockReturnValue({
      blockMap: new Map(),
      removeBlock: vi.fn(),
      selectionMode: "empty",
      activeCamera: "orbit",
      setCameraMode: vi.fn(),
      simulants: new Map(),
    });
  });

  it("should render VoxelCanvas with camera controls", () => {
    render(<VoxelCanvas />);

    // Should render the 3D canvas
    expect(screen.getByTestId("canvas")).toBeInTheDocument();

    // Should render camera controls
    expect(screen.getByText("Orbit")).toBeInTheDocument();
  });

  it("should have camera mode switching functionality", () => {
    render(<VoxelCanvas />);

    // Should show current camera mode
    expect(screen.getByText("Orbit")).toBeInTheDocument();

    // Should have camera controls UI
    const cameraButton = screen.getByRole("button", { name: /orbit/i });
    expect(cameraButton).toBeInTheDocument();
  });

  it("should integrate camera controller with world store", () => {
    const setCameraMode = vi.fn();
    mockUseWorldStore.mockReturnValue({
      blockMap: new Map(),
      removeBlock: vi.fn(),
      selectionMode: "empty",
      activeCamera: "fly",
      setCameraMode,
      simulants: new Map(),
    });

    render(<VoxelCanvas />);

    // Should reflect the camera mode from store
    expect(screen.getByText("Fly")).toBeInTheDocument();
  });
});
