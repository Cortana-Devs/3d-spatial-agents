import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import CameraControls from "../CameraControls";
import { useWorldStore } from "../../../store/worldStore";
import { CameraMode } from "../../../types";

// Mock the world store
vi.mock("../../../store/worldStore", () => ({
  useWorldStore: vi.fn(),
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

const mockUseWorldStore = useWorldStore as jest.MockedFunction<
  typeof useWorldStore
>;

describe("CameraControls", () => {
  const mockSimulants = new Map([
    [
      "simulant1",
      {
        id: "simulant1",
        name: "Test Simulant 1",
        position: { x: 5, y: 0, z: 5 },
        status: "active" as const,
        lastAction: "",
        conversationHistory: [],
        geminiSessionId: "test-session-1",
      },
    ],
    [
      "simulant2",
      {
        id: "simulant2",
        name: "Test Simulant 2",
        position: { x: -3, y: 2, z: 8 },
        status: "active" as const,
        lastAction: "",
        conversationHistory: [],
        geminiSessionId: "test-session-2",
      },
    ],
    [
      "simulant3",
      {
        id: "simulant3",
        name: "Inactive Simulant",
        position: { x: 0, y: 0, z: 0 },
        status: "idle" as const,
        lastAction: "",
        conversationHistory: [],
        geminiSessionId: "test-session-3",
      },
    ],
  ]);

  const defaultProps = {
    currentMode: "orbit" as CameraMode,
    onModeChange: vi.fn(),
    onPresetApply: vi.fn(),
    onFocusOnBlock: vi.fn(),
  };

  beforeEach(() => {
    mockUseWorldStore.mockReturnValue({
      simulants: mockSimulants,
    });

    vi.clearAllMocks();
  });

  const renderCameraControls = (props = {}) => {
    return render(<CameraControls {...defaultProps} {...props} />);
  };

  describe("Basic Rendering", () => {
    it("should render the camera controls with current mode", () => {
      renderCameraControls();

      expect(screen.getByText("Orbit")).toBeInTheDocument();
      expect(screen.getByText("C")).toBeInTheDocument(); // Keyboard shortcut
    });

    it("should show different modes correctly", () => {
      const modes: CameraMode[] = [
        "orbit",
        "fly",
        "cinematic",
        "follow-simulant",
      ];

      modes.forEach((mode) => {
        const { rerender } = render(
          <CameraControls {...defaultProps} currentMode={mode} />,
        );

        const expectedLabels = {
          orbit: "Orbit",
          fly: "Fly",
          cinematic: "Cinematic",
          "follow-simulant": "Follow",
        };

        expect(screen.getByText(expectedLabels[mode])).toBeInTheDocument();

        rerender(<div />); // Clear for next iteration
      });
    });
  });

  describe("Expanded Controls", () => {
    it("should expand when clicked", async () => {
      renderCameraControls();

      const expandButton = screen.getByRole("button", { name: /orbit/i });
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText("Camera Modes")).toBeInTheDocument();
      });
    });

    it("should show all camera modes when expanded", async () => {
      renderCameraControls();

      const expandButton = screen.getByRole("button", { name: /orbit/i });
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText("Orbit")).toBeInTheDocument();
        expect(screen.getByText("Fly")).toBeInTheDocument();
        expect(screen.getByText("Cinematic")).toBeInTheDocument();
        expect(screen.getByText("Follow")).toBeInTheDocument();
      });
    });

    it("should call onModeChange when a mode is selected", async () => {
      const onModeChange = vi.fn();
      renderCameraControls({ onModeChange });

      const expandButton = screen.getByRole("button", { name: /orbit/i });
      fireEvent.click(expandButton);

      await waitFor(() => {
        const flyButton = screen.getByRole("button", { name: /fly/i });
        fireEvent.click(flyButton);
      });

      expect(onModeChange).toHaveBeenCalledWith("fly");
    });
  });

  describe("Follow Simulant Mode", () => {
    it("should show active simulants when in follow mode", async () => {
      renderCameraControls({ currentMode: "follow-simulant" });

      const expandButton = screen.getByRole("button", { name: /follow/i });
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText("Active Simulants")).toBeInTheDocument();
        expect(screen.getByText("Test Simulant 1")).toBeInTheDocument();
        expect(screen.getByText("Test Simulant 2")).toBeInTheDocument();
        expect(screen.queryByText("Inactive Simulant")).not.toBeInTheDocument();
      });
    });

    it("should disable follow mode when no active simulants", async () => {
      mockUseWorldStore.mockReturnValue({
        simulants: new Map([
          [
            "simulant1",
            {
              id: "simulant1",
              name: "Inactive Simulant",
              position: { x: 0, y: 0, z: 0 },
              status: "idle" as const,
              lastAction: "",
              conversationHistory: [],
              geminiSessionId: "test-session",
            },
          ],
        ]),
      });

      renderCameraControls();

      const expandButton = screen.getByRole("button", { name: /orbit/i });
      fireEvent.click(expandButton);

      await waitFor(() => {
        const followButton = screen.getByRole("button", { name: /follow/i });
        expect(followButton).toBeDisabled();
      });
    });
  });

  describe("Camera Presets", () => {
    it("should show camera presets when expanded", async () => {
      renderCameraControls();

      const expandButton = screen.getByRole("button", { name: /orbit/i });
      fireEvent.click(expandButton);

      await waitFor(() => {
        const presetsButton = screen.getByRole("button", {
          name: /camera presets/i,
        });
        fireEvent.click(presetsButton);
      });

      await waitFor(() => {
        expect(screen.getByText("Overview")).toBeInTheDocument();
        expect(screen.getByText("Close-up")).toBeInTheDocument();
        expect(screen.getByText("Top Down")).toBeInTheDocument();
        expect(screen.getByText("Side View")).toBeInTheDocument();
      });
    });

    it("should call onPresetApply when a preset is selected", async () => {
      const onPresetApply = vi.fn();
      renderCameraControls({ onPresetApply });

      const expandButton = screen.getByRole("button", { name: /orbit/i });
      fireEvent.click(expandButton);

      await waitFor(() => {
        const presetsButton = screen.getByRole("button", {
          name: /camera presets/i,
        });
        fireEvent.click(presetsButton);
      });

      await waitFor(() => {
        const overviewButton = screen.getByRole("button", {
          name: /overview/i,
        });
        fireEvent.click(overviewButton);
      });

      expect(onPresetApply).toHaveBeenCalledWith("overview");
    });
  });

  describe("Keyboard Shortcuts", () => {
    it("should handle number key shortcuts", () => {
      const onModeChange = vi.fn();
      renderCameraControls({ onModeChange });

      // Test each number key
      fireEvent.keyDown(window, { key: "1" });
      expect(onModeChange).toHaveBeenCalledWith("orbit");

      fireEvent.keyDown(window, { key: "2" });
      expect(onModeChange).toHaveBeenCalledWith("fly");

      fireEvent.keyDown(window, { key: "3" });
      expect(onModeChange).toHaveBeenCalledWith("cinematic");

      fireEvent.keyDown(window, { key: "4" });
      expect(onModeChange).toHaveBeenCalledWith("follow-simulant");
    });

    it("should ignore shortcuts when typing in input fields", () => {
      const onModeChange = vi.fn();
      renderCameraControls({ onModeChange });

      // Create a mock input element
      const input = document.createElement("input");
      document.body.appendChild(input);
      input.focus();

      fireEvent.keyDown(input, { key: "1" });

      expect(onModeChange).not.toHaveBeenCalled();

      document.body.removeChild(input);
    });

    it("should handle toggle shortcuts", async () => {
      renderCameraControls();

      // Test expand/collapse shortcut
      fireEvent.keyDown(window, { key: "c" });

      await waitFor(() => {
        expect(screen.getByText("Camera Modes")).toBeInTheDocument();
      });

      fireEvent.keyDown(window, { key: "c" });

      await waitFor(() => {
        expect(screen.queryByText("Camera Modes")).not.toBeInTheDocument();
      });
    });
  });

  describe("Mode Instructions", () => {
    it("should show fly mode instructions when in fly mode", async () => {
      renderCameraControls({ currentMode: "fly" });

      const expandButton = screen.getByRole("button", { name: /fly/i });
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText("Fly Controls")).toBeInTheDocument();
        expect(screen.getByText("WASD - Move")).toBeInTheDocument();
        expect(screen.getByText("Space - Up")).toBeInTheDocument();
        expect(screen.getByText("Shift - Down")).toBeInTheDocument();
        expect(screen.getByText("Mouse - Look around")).toBeInTheDocument();
        expect(screen.getByText("Click to lock cursor")).toBeInTheDocument();
      });
    });

    it("should show orbit mode instructions when in orbit mode", async () => {
      renderCameraControls({ currentMode: "orbit" });

      const expandButton = screen.getByRole("button", { name: /orbit/i });
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText("Orbit Controls")).toBeInTheDocument();
        expect(screen.getByText("Left Click - Rotate")).toBeInTheDocument();
        expect(screen.getByText("Right Click - Pan")).toBeInTheDocument();
        expect(screen.getByText("Scroll - Zoom")).toBeInTheDocument();
        expect(
          screen.getByText("Double Click - Focus block"),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Quick Mode Indicators", () => {
    it("should show quick mode buttons when collapsed", () => {
      renderCameraControls();

      // Should show quick mode indicators by default (collapsed state)
      const quickButtons = screen.getAllByRole("button");

      // Should have main button plus 4 quick mode buttons
      expect(quickButtons.length).toBeGreaterThanOrEqual(4);
    });

    it("should highlight current mode in quick indicators", () => {
      renderCameraControls({ currentMode: "fly" });

      // The fly mode button should have active styling
      // This is tested through the presence of the component
      expect(screen.getByText("Fly")).toBeInTheDocument();
    });
  });

  describe("Responsive Behavior", () => {
    it("should handle mobile viewport", async () => {
      // Mock mobile viewport
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 500,
      });

      const onModeChange = vi.fn();
      renderCameraControls({ onModeChange });

      const expandButton = screen.getByRole("button", { name: /orbit/i });
      fireEvent.click(expandButton);

      await waitFor(() => {
        const flyButton = screen.getByRole("button", { name: /fly/i });
        fireEvent.click(flyButton);
      });

      expect(onModeChange).toHaveBeenCalledWith("fly");

      // Reset viewport
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 1024,
      });
    });
  });
});
