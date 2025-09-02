import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { expect, describe, it, beforeEach, vi } from "vitest";
import BlockSelector from "../BlockSelector";
import { useWorldStore } from "../../../store/worldStore";
import { BlockType, SelectionMode } from "../../../types";

// Mock the world store
vi.mock("../../../store/worldStore");
const mockUseWorldStore = vi.mocked(useWorldStore);

// Mock React Three Fiber Canvas component
vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-canvas">{children}</div>
  ),
  useFrame: () => {},
}));

describe("BlockSelector", () => {
  const mockSetSelectedBlockType = vi.fn();
  const mockSetSelectionMode = vi.fn();

  const baseMockStoreValue = {
    selectedBlockType: BlockType.STONE,
    selectionMode: SelectionMode.EMPTY,
    setSelectedBlockType: mockSetSelectedBlockType,
    setSelectionMode: mockSetSelectionMode,
    blockCount: 0,
    worldLimits: { maxBlocks: 1000 },
    // Add other required properties with default values
    blockMap: new Map(),
    simulants: new Map(),
    lastUpdate: Date.now(),
    syncStatus: "disconnected" as const,
    activeCamera: "orbit" as const,
    history: {
      states: [],
      currentIndex: -1,
      maxStates: 50,
      redoStates: [],
    },
    addBlock: vi.fn(),
    addBlockInternal: vi.fn(),
    removeBlock: vi.fn(),
    removeBlockById: vi.fn(),
    getBlock: vi.fn(),
    getBlockById: vi.fn(),
    getAllBlocks: vi.fn(),
    hasBlock: vi.fn(),
    addSimulant: vi.fn(),
    removeSimulant: vi.fn(),
    updateSimulant: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    canUndo: vi.fn(),
    canRedo: vi.fn(),
    saveSnapshot: vi.fn(),
    setCameraMode: vi.fn(),
    setSyncStatus: vi.fn(),
    clearWorld: vi.fn(),
    getWorldStats: vi.fn(),
    resetStore: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseWorldStore.mockReturnValue(baseMockStoreValue);
  });

  it("renders the block palette with all block types", () => {
    render(<BlockSelector />);

    expect(screen.getByText("Block Palette")).toBeTruthy();
    expect(screen.getByText("Select Tool")).toBeTruthy();
    expect(screen.getByText("Stone Block")).toBeTruthy();
    expect(screen.getByText("Leaf Block")).toBeTruthy();
    expect(screen.getByText("Wood Block")).toBeTruthy();
  });

  it("shows keyboard shortcuts for each block type", () => {
    render(<BlockSelector />);

    expect(screen.getByText("0")).toBeTruthy(); // Select tool
    expect(screen.getByText("1")).toBeTruthy(); // Stone
    expect(screen.getByText("2")).toBeTruthy(); // Leaf
    expect(screen.getByText("3")).toBeTruthy(); // Wood
  });

  it("calls setSelectionMode when select tool is clicked", () => {
    render(<BlockSelector />);

    const selectTool = screen.getByText("Select Tool").closest("button");
    fireEvent.click(selectTool!);

    expect(mockSetSelectionMode).toHaveBeenCalledWith(SelectionMode.EMPTY);
  });

  it("calls setSelectedBlockType when a block type is clicked", () => {
    render(<BlockSelector />);

    const stoneBlock = screen.getByText("Stone Block").closest("button");
    fireEvent.click(stoneBlock!);

    expect(mockSetSelectedBlockType).toHaveBeenCalledWith(BlockType.STONE);
  });

  it("shows block count and limit", () => {
    mockUseWorldStore.mockReturnValue({
      ...baseMockStoreValue,
      blockCount: 50,
      worldLimits: { maxBlocks: 1000 },
    });

    render(<BlockSelector />);

    expect(screen.getByText("50/1000")).toBeTruthy();
  });

  it("shows warning when at block limit", () => {
    mockUseWorldStore.mockReturnValue({
      ...baseMockStoreValue,
      blockCount: 1000,
      worldLimits: { maxBlocks: 1000 },
    });

    render(<BlockSelector />);

    expect(screen.getByText(/Block limit reached/)).toBeTruthy();
  });

  it("renders 3D preview canvases for each block type", () => {
    render(<BlockSelector />);

    // Should have 3 canvases (one for each block type)
    const canvases = screen.getAllByTestId("mock-canvas");
    expect(canvases).toHaveLength(3);
  });

  it("applies correct styling for selected block type", () => {
    mockUseWorldStore.mockReturnValue({
      ...baseMockStoreValue,
      selectedBlockType: BlockType.STONE,
      selectionMode: SelectionMode.PLACE,
    });

    render(<BlockSelector />);

    const stoneBlock = screen.getByText("Stone Block").closest("button");
    expect(stoneBlock?.className).toContain("border-axiom-primary-400");
  });

  it("applies correct styling for selected empty hand tool", () => {
    mockUseWorldStore.mockReturnValue({
      ...baseMockStoreValue,
      selectionMode: SelectionMode.EMPTY,
    });

    render(<BlockSelector />);

    const selectTool = screen.getByText("Select Tool").closest("button");
    expect(selectTool?.className).toContain("border-axiom-glow-purple");
  });
});
