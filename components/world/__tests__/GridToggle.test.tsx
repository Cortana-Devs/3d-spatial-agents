import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CameraControls from "../CameraControls";
import { useWorldStore } from "../../../store/worldStore";

// Mock the world store
const mockUpdateGridConfig = vi.fn();
vi.mock("../../../store/worldStore", () => ({
  useWorldStore: vi.fn(() => ({
    simulants: new Map(),
    gridConfig: {
      visibility: true,
      opacity: 0.3,
      snapToGrid: true,
      size: 50,
      cellSize: 1,
      fadeDistance: 30,
      fadeStrength: 1,
      rippleEnabled: false,
      showSnapIndicators: true,
    },
    updateGridConfig: mockUpdateGridConfig,
  })),
}));

describe("Grid Toggle Functionality", () => {
  const mockOnModeChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should display grid controls when camera controls are expanded", () => {
    render(
      <CameraControls currentMode="orbit" onModeChange={mockOnModeChange} />,
    );

    // Click to expand camera controls
    const expandButton = screen.getByRole("button");
    fireEvent.click(expandButton);

    // Check if grid controls are visible
    expect(screen.getByText("Grid Settings")).toBeInTheDocument();
    expect(screen.getByText("Grid")).toBeInTheDocument();
    expect(screen.getByText("Snap to Grid")).toBeInTheDocument();
  });

  it("should toggle grid visibility when grid button is clicked", () => {
    render(
      <CameraControls currentMode="orbit" onModeChange={mockOnModeChange} />,
    );

    // Expand camera controls
    const expandButton = screen.getByRole("button");
    fireEvent.click(expandButton);

    // Find and click the grid toggle button
    const gridButton = screen.getByText("Grid").closest("button");
    expect(gridButton).toBeInTheDocument();

    if (gridButton) {
      fireEvent.click(gridButton);
      expect(mockUpdateGridConfig).toHaveBeenCalledWith({ visibility: false });
    }
  });

  it("should toggle snap to grid when snap button is clicked", () => {
    render(
      <CameraControls currentMode="orbit" onModeChange={mockOnModeChange} />,
    );

    // Expand camera controls
    const expandButton = screen.getByRole("button");
    fireEvent.click(expandButton);

    // Find and click the snap to grid button
    const snapButton = screen.getByText("Snap to Grid").closest("button");
    expect(snapButton).toBeInTheDocument();

    if (snapButton) {
      fireEvent.click(snapButton);
      expect(mockUpdateGridConfig).toHaveBeenCalledWith({ snapToGrid: false });
    }
  });

  it("should handle G key press to toggle grid visibility", () => {
    render(
      <CameraControls currentMode="orbit" onModeChange={mockOnModeChange} />,
    );

    // Simulate G key press
    fireEvent.keyDown(window, { key: "g" });
    expect(mockUpdateGridConfig).toHaveBeenCalledWith({ visibility: false });

    // Test uppercase G as well
    fireEvent.keyDown(window, { key: "G" });
    expect(mockUpdateGridConfig).toHaveBeenCalledWith({ visibility: false });
  });

  it("should show opacity slider when grid is visible", () => {
    // Mock grid as visible
    vi.mocked(useWorldStore).mockReturnValue({
      simulants: new Map(),
      gridConfig: {
        visibility: true,
        opacity: 0.5,
        snapToGrid: true,
        size: 50,
        cellSize: 1,
        fadeDistance: 30,
        fadeStrength: 1,
        rippleEnabled: false,
        showSnapIndicators: true,
      },
      updateGridConfig: mockUpdateGridConfig,
    } as ReturnType<typeof useWorldStore>);

    render(
      <CameraControls currentMode="orbit" onModeChange={mockOnModeChange} />,
    );

    // Expand camera controls
    const expandButton = screen.getByRole("button");
    fireEvent.click(expandButton);

    // Check if opacity slider is visible
    expect(screen.getByText("Opacity")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument(); // 0.5 * 100 = 50%

    const slider = screen.getByRole("slider");
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveValue("0.5");
  });

  it("should update opacity when slider is changed", () => {
    // Mock grid as visible
    vi.mocked(useWorldStore).mockReturnValue({
      simulants: new Map(),
      gridConfig: {
        visibility: true,
        opacity: 0.3,
        snapToGrid: true,
        size: 50,
        cellSize: 1,
        fadeDistance: 30,
        fadeStrength: 1,
        rippleEnabled: false,
        showSnapIndicators: true,
      },
      updateGridConfig: mockUpdateGridConfig,
    } as ReturnType<typeof useWorldStore>);

    render(
      <CameraControls currentMode="orbit" onModeChange={mockOnModeChange} />,
    );

    // Expand camera controls
    const expandButton = screen.getByRole("button");
    fireEvent.click(expandButton);

    // Find and change the opacity slider
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "0.7" } });

    expect(mockUpdateGridConfig).toHaveBeenCalledWith({ opacity: 0.7 });
  });
});
