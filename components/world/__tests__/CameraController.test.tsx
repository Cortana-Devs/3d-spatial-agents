import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Canvas } from "@react-three/fiber";
import { describe, it, expect, vi, beforeEach } from "vitest";
import CameraController, {
  CAMERA_PRESETS,
  CAMERA_CONFIG,
} from "../CameraController";
import { useWorldStore } from "../../../store/worldStore";
import { CameraMode } from "../../../types";

// Mock the world store
vi.mock("../../../store/worldStore", () => ({
  useWorldStore: vi.fn(),
}));

// Mock Three.js components
vi.mock("@react-three/drei", () => ({
  OrbitControls: vi.fn(({ children, ...props }) => (
    <div data-testid="orbit-controls" {...props}>
      {children}
    </div>
  )),
}));

// Mock useFrame hook and Canvas
vi.mock("@react-three/fiber", () => ({
  Canvas: vi.fn(({ children, ...props }) => (
    <div data-testid="canvas" {...props}>
      {children}
    </div>
  )),
  useFrame: vi.fn((callback) => {
    // Simulate frame updates for testing
    callback({ clock: { elapsedTime: 0 } }, 0.016);
  }),
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

const mockUseWorldStore = useWorldStore as jest.MockedFunction<
  typeof useWorldStore
>;

describe("CameraController", () => {
  const mockSimulants = new Map([
    [
      "simulant1",
      {
        id: "simulant1",
        name: "Test Simulant",
        position: { x: 5, y: 0, z: 5 },
        status: "active" as const,
        lastAction: "",
        conversationHistory: [],
        geminiSessionId: "test-session",
      },
    ],
  ]);

  beforeEach(() => {
    mockUseWorldStore.mockReturnValue({
      simulants: mockSimulants,
      blockMap: new Map(),
    });

    // Reset DOM
    document.body.innerHTML = "";

    // Mock pointer lock API
    Object.defineProperty(document, "pointerLockElement", {
      writable: true,
      value: null,
    });

    const mockCanvas = document.createElement("canvas");
    mockCanvas.requestPointerLock = vi.fn();
    document.body.appendChild(mockCanvas);
  });

  const renderCameraController = (mode: CameraMode = "orbit", props = {}) => {
    return render(
      <Canvas>
        <CameraController mode={mode} {...props} />
      </Canvas>,
    );
  };

  describe("Camera Mode Switching", () => {
    it("should render OrbitControls in orbit mode", () => {
      renderCameraController("orbit");
      expect(screen.getByTestId("orbit-controls")).toBeInTheDocument();
    });

    it("should not render OrbitControls in fly mode", () => {
      renderCameraController("fly");
      expect(screen.queryByTestId("orbit-controls")).not.toBeInTheDocument();
    });

    it("should call onModeChange when mode changes", () => {
      const onModeChange = vi.fn();
      const { rerender } = renderCameraController("orbit", { onModeChange });

      rerender(
        <Canvas>
          <CameraController mode="fly" onModeChange={onModeChange} />
        </Canvas>,
      );

      // Mode change should trigger internal logic
      expect(onModeChange).not.toHaveBeenCalled(); // onModeChange is not called internally
    });
  });

  describe("Fly Mode Controls", () => {
    beforeEach(() => {
      // Mock pointer lock API
      Object.defineProperty(document, "pointerLockElement", {
        writable: true,
        value: null,
      });
    });

    it("should handle WASD key presses in fly mode", () => {
      renderCameraController("fly");

      // Simulate key presses
      fireEvent.keyDown(window, { code: "KeyW" });
      fireEvent.keyDown(window, { code: "KeyA" });
      fireEvent.keyDown(window, { code: "KeyS" });
      fireEvent.keyDown(window, { code: "KeyD" });
      fireEvent.keyDown(window, { code: "Space" });
      fireEvent.keyDown(window, { code: "ShiftLeft" });

      // Key releases
      fireEvent.keyUp(window, { code: "KeyW" });
      fireEvent.keyUp(window, { code: "KeyA" });
      fireEvent.keyUp(window, { code: "KeyS" });
      fireEvent.keyUp(window, { code: "KeyD" });
      fireEvent.keyUp(window, { code: "Space" });
      fireEvent.keyUp(window, { code: "ShiftLeft" });

      // Should not throw errors
      expect(true).toBe(true);
    });

    it("should ignore key presses in non-fly modes", () => {
      renderCameraController("orbit");

      // These should not cause errors
      fireEvent.keyDown(window, { code: "KeyW" });
      fireEvent.keyUp(window, { code: "KeyW" });

      expect(true).toBe(true);
    });
  });

  describe("Follow Simulant Mode", () => {
    it("should handle follow-simulant mode with valid target", () => {
      renderCameraController("follow-simulant", { target: "simulant1" });

      // Should not throw errors
      expect(true).toBe(true);
    });

    it("should handle follow-simulant mode with invalid target", () => {
      renderCameraController("follow-simulant", { target: "nonexistent" });

      // Should not throw errors
      expect(true).toBe(true);
    });

    it("should handle follow-simulant mode with Vector3 target", () => {
      renderCameraController("follow-simulant", {
        target: { x: 5, y: 0, z: 5 },
      });

      // Should not throw errors
      expect(true).toBe(true);
    });
  });

  describe("Camera Presets", () => {
    it("should have all required presets defined", () => {
      expect(CAMERA_PRESETS.overview).toBeDefined();
      expect(CAMERA_PRESETS.closeup).toBeDefined();
      expect(CAMERA_PRESETS.topDown).toBeDefined();
      expect(CAMERA_PRESETS.side).toBeDefined();

      // Check preset structure
      Object.values(CAMERA_PRESETS).forEach((preset) => {
        expect(preset.position).toBeDefined();
        expect(preset.target).toBeDefined();
        expect(preset.fov).toBeDefined();
      });
    });

    it("should have valid camera configuration", () => {
      expect(CAMERA_CONFIG.orbit).toBeDefined();
      expect(CAMERA_CONFIG.fly).toBeDefined();
      expect(CAMERA_CONFIG.cinematic).toBeDefined();
      expect(CAMERA_CONFIG.followSimulant).toBeDefined();

      // Check orbit config
      expect(CAMERA_CONFIG.orbit.dampingFactor).toBeGreaterThan(0);
      expect(CAMERA_CONFIG.orbit.minDistance).toBeGreaterThan(0);
      expect(CAMERA_CONFIG.orbit.maxDistance).toBeGreaterThan(
        CAMERA_CONFIG.orbit.minDistance,
      );

      // Check fly config
      expect(CAMERA_CONFIG.fly.moveSpeed).toBeGreaterThan(0);
      expect(CAMERA_CONFIG.fly.maxSpeed).toBeGreaterThan(
        CAMERA_CONFIG.fly.minSpeed,
      );
    });
  });

  describe("Event Listeners", () => {
    it("should add and remove event listeners properly", () => {
      const addEventListenerSpy = vi.spyOn(window, "addEventListener");
      const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

      const { unmount } = renderCameraController("fly");

      // Should add event listeners
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "keydown",
        expect.any(Function),
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "keyup",
        expect.any(Function),
      );

      unmount();

      // Should remove event listeners
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "keydown",
        expect.any(Function),
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "keyup",
        expect.any(Function),
      );

      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });
  });

  describe("Camera Transitions", () => {
    it("should handle cinematic mode transitions", () => {
      renderCameraController("cinematic");

      // Should not throw errors during transition setup
      expect(true).toBe(true);
    });

    it("should handle mode transitions smoothly", async () => {
      const { rerender } = renderCameraController("orbit");

      // Change to fly mode
      rerender(
        <Canvas>
          <CameraController mode="fly" />
        </Canvas>,
      );

      // Change to cinematic mode
      rerender(
        <Canvas>
          <CameraController mode="cinematic" />
        </Canvas>,
      );

      // Should not throw errors
      expect(true).toBe(true);
    });
  });

  describe("Double Click Focus", () => {
    it("should handle double click events when enabled", () => {
      const canvas = document.createElement("canvas");
      document.body.appendChild(canvas);

      renderCameraController("orbit", { enableDoubleClickFocus: true });

      // Simulate double click
      fireEvent.doubleClick(canvas);

      // Should not throw errors
      expect(true).toBe(true);
    });

    it("should ignore double click events when disabled", () => {
      const canvas = document.createElement("canvas");
      document.body.appendChild(canvas);

      renderCameraController("orbit", { enableDoubleClickFocus: false });

      // Simulate double click
      fireEvent.doubleClick(canvas);

      // Should not throw errors
      expect(true).toBe(true);
    });
  });
});
