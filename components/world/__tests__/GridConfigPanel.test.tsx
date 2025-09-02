import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import GridConfigPanel from "../GridConfigPanel";
import { GridConfig } from "../GridSystem";

describe("GridConfigPanel", () => {
  const defaultConfig: GridConfig = {
    size: 50,
    cellSize: 1,
    opacity: 0.3,
    visibility: true,
    fadeDistance: 30,
    fadeStrength: 1,
    rippleEnabled: true,
    snapToGrid: true,
    showSnapIndicators: true,
  };

  const mockOnConfigChange = vi.fn();

  beforeEach(() => {
    mockOnConfigChange.mockClear();
  });

  it("renders grid configuration panel", () => {
    render(
      <GridConfigPanel
        config={defaultConfig}
        onConfigChange={mockOnConfigChange}
      />,
    );

    expect(screen.getByText("Grid System")).toBeInTheDocument();
    expect(screen.getByText("Visibility")).toBeInTheDocument();
    expect(screen.getByText("Ripple Effects")).toBeInTheDocument();
    expect(screen.getByText("Snap to Grid")).toBeInTheDocument();
  });

  it("displays current configuration values", () => {
    render(
      <GridConfigPanel
        config={defaultConfig}
        onConfigChange={mockOnConfigChange}
      />,
    );

    expect(screen.getByText("Grid Size: 50")).toBeInTheDocument();
    expect(screen.getByText("Cell Size: 1.0")).toBeInTheDocument();
    expect(screen.getByText("Opacity: 30%")).toBeInTheDocument();
    expect(screen.getByText("Fade Distance: 30")).toBeInTheDocument();
  });

  it("calls onConfigChange when visibility is toggled", () => {
    render(
      <GridConfigPanel
        config={defaultConfig}
        onConfigChange={mockOnConfigChange}
      />,
    );

    const visibilitySwitch = screen.getByRole("switch", {
      name: /visibility/i,
    });
    fireEvent.click(visibilitySwitch);

    expect(mockOnConfigChange).toHaveBeenCalledWith({ visibility: false });
  });

  it("calls onConfigChange when ripple effects is toggled", () => {
    render(
      <GridConfigPanel
        config={defaultConfig}
        onConfigChange={mockOnConfigChange}
      />,
    );

    const rippleSwitch = screen.getByRole("switch", {
      name: /ripple effects/i,
    });
    fireEvent.click(rippleSwitch);

    expect(mockOnConfigChange).toHaveBeenCalledWith({ rippleEnabled: false });
  });

  it("calls onConfigChange when snap to grid is toggled", () => {
    render(
      <GridConfigPanel
        config={defaultConfig}
        onConfigChange={mockOnConfigChange}
      />,
    );

    const snapSwitch = screen.getByRole("switch", { name: /snap to grid/i });
    fireEvent.click(snapSwitch);

    expect(mockOnConfigChange).toHaveBeenCalledWith({ snapToGrid: false });
  });

  it("disables controls when visibility is false", () => {
    const hiddenConfig = { ...defaultConfig, visibility: false };

    render(
      <GridConfigPanel
        config={hiddenConfig}
        onConfigChange={mockOnConfigChange}
      />,
    );

    const rippleSwitch = screen.getByRole("switch", {
      name: /ripple effects/i,
    });
    const snapSwitch = screen.getByRole("switch", { name: /snap to grid/i });

    expect(rippleSwitch).toBeDisabled();
    expect(snapSwitch).toBeDisabled();
  });

  it("disables snap indicators when snap to grid is disabled", () => {
    const noSnapConfig = { ...defaultConfig, snapToGrid: false };

    render(
      <GridConfigPanel
        config={noSnapConfig}
        onConfigChange={mockOnConfigChange}
      />,
    );

    const snapIndicatorsSwitch = screen.getByRole("switch", {
      name: /show snap indicators/i,
    });

    expect(snapIndicatorsSwitch).toBeDisabled();
  });

  it("applies preset configurations when preset buttons are clicked", () => {
    render(
      <GridConfigPanel
        config={defaultConfig}
        onConfigChange={mockOnConfigChange}
      />,
    );

    const minimalButton = screen.getByRole("button", { name: /minimal/i });
    fireEvent.click(minimalButton);

    expect(mockOnConfigChange).toHaveBeenCalledWith({
      size: 30,
      cellSize: 1,
      opacity: 0.2,
      fadeDistance: 20,
      fadeStrength: 1,
      rippleEnabled: false,
      snapToGrid: true,
      showSnapIndicators: false,
    });
  });

  it("applies standard preset configuration", () => {
    render(
      <GridConfigPanel
        config={defaultConfig}
        onConfigChange={mockOnConfigChange}
      />,
    );

    const standardButton = screen.getByRole("button", { name: /standard/i });
    fireEvent.click(standardButton);

    expect(mockOnConfigChange).toHaveBeenCalledWith({
      size: 50,
      cellSize: 1,
      opacity: 0.4,
      fadeDistance: 40,
      fadeStrength: 1.5,
      rippleEnabled: true,
      snapToGrid: true,
      showSnapIndicators: true,
    });
  });

  it("applies detailed preset configuration", () => {
    render(
      <GridConfigPanel
        config={defaultConfig}
        onConfigChange={mockOnConfigChange}
      />,
    );

    const detailedButton = screen.getByRole("button", { name: /detailed/i });
    fireEvent.click(detailedButton);

    expect(mockOnConfigChange).toHaveBeenCalledWith({
      size: 80,
      cellSize: 0.5,
      opacity: 0.6,
      fadeDistance: 60,
      fadeStrength: 2,
      rippleEnabled: true,
      snapToGrid: true,
      showSnapIndicators: true,
    });
  });

  it("applies large scale preset configuration", () => {
    render(
      <GridConfigPanel
        config={defaultConfig}
        onConfigChange={mockOnConfigChange}
      />,
    );

    const largeScaleButton = screen.getByRole("button", {
      name: /large scale/i,
    });
    fireEvent.click(largeScaleButton);

    expect(mockOnConfigChange).toHaveBeenCalledWith({
      size: 100,
      cellSize: 2,
      opacity: 0.8,
      fadeDistance: 80,
      fadeStrength: 0.5,
      rippleEnabled: true,
      snapToGrid: true,
      showSnapIndicators: true,
    });
  });
});
