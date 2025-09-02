import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Canvas } from '@react-three/fiber';
import BlockSelector from '../BlockSelector';
import CameraControls from '../CameraControls';
import { useWorldStore } from '../../../store/worldStore';
import { BlockType, SelectionMode } from '../../../types';

// Mock the world store
vi.mock('../../../store/worldStore', () => ({
  useWorldStore: vi.fn(() => ({
    selectedBlockType: BlockType.STONE,
    selectionMode: SelectionMode.PLACE,
    setSelectedBlockType: vi.fn(),
    setSelectionMode: vi.fn(),
    blockCount: 0,
    worldLimits: { maxBlocks: 1000 },
    simulants: new Map(),
  })),
}));

// Mock React Three Fiber Canvas
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => <div data-testid="canvas">{children}</div>,
  useFrame: vi.fn(),
}));

describe('Keyboard Shortcut Fixes', () => {
  const mockSetSelectedBlockType = vi.fn();
  const mockSetSelectionMode = vi.fn();
  const mockOnModeChange = vi.fn();

  beforeEach(() => {
    vi.mocked(useWorldStore).mockReturnValue({
      selectedBlockType: BlockType.STONE,
      selectionMode: SelectionMode.PLACE,
      setSelectedBlockType: mockSetSelectedBlockType,
      setSelectionMode: mockSetSelectionMode,
      blockCount: 0,
      worldLimits: { maxBlocks: 1000 },
      simulants: new Map(),
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('BlockSelector keyboard shortcuts', () => {
    it('should handle number keys 0-4 for block selection', () => {
      render(<BlockSelector />);

      // Test key "0" for empty hand
      fireEvent.keyDown(window, { key: '0' });
      expect(mockSetSelectionMode).toHaveBeenCalledWith(SelectionMode.EMPTY);

      // Test key "1" for first block type
      fireEvent.keyDown(window, { key: '1' });
      expect(mockSetSelectedBlockType).toHaveBeenCalledWith(BlockType.STONE);
      expect(mockSetSelectionMode).toHaveBeenCalledWith(SelectionMode.PLACE);

      // Test key "2" for second block type
      fireEvent.keyDown(window, { key: '2' });
      expect(mockSetSelectedBlockType).toHaveBeenCalledWith(BlockType.LEAF);

      // Test key "3" for third block type
      fireEvent.keyDown(window, { key: '3' });
      expect(mockSetSelectedBlockType).toHaveBeenCalledWith(BlockType.WOOD);
    });

    it('should not handle number keys when modifier keys are pressed', () => {
      render(<BlockSelector />);

      // Test Cmd+1 should not trigger block selection
      fireEvent.keyDown(window, { key: '1', metaKey: true });
      expect(mockSetSelectedBlockType).not.toHaveBeenCalled();

      // Test Ctrl+1 should not trigger block selection
      fireEvent.keyDown(window, { key: '1', ctrlKey: true });
      expect(mockSetSelectedBlockType).not.toHaveBeenCalled();
    });

    it('should not handle keys when typing in input fields', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      render(<BlockSelector />);

      fireEvent.keyDown(input, { key: '1' });
      expect(mockSetSelectedBlockType).not.toHaveBeenCalled();

      document.body.removeChild(input);
    });
  });

  describe('CameraControls keyboard shortcuts', () => {
    it('should handle Cmd+C to cycle camera modes', () => {
      render(
        <CameraControls
          currentMode="orbit"
          onModeChange={mockOnModeChange}
        />
      );

      // Test Cmd+C
      fireEvent.keyDown(window, { key: 'c', metaKey: true });
      expect(mockOnModeChange).toHaveBeenCalledWith('fly');

      // Test Ctrl+C
      fireEvent.keyDown(window, { key: 'C', ctrlKey: true });
      expect(mockOnModeChange).toHaveBeenCalled();
    });

    it('should not handle plain number keys for camera modes', () => {
      render(
        <CameraControls
          currentMode="orbit"
          onModeChange={mockOnModeChange}
        />
      );

      // Test that plain number keys don't change camera mode
      fireEvent.keyDown(window, { key: '1' });
      fireEvent.keyDown(window, { key: '2' });
      fireEvent.keyDown(window, { key: '3' });
      fireEvent.keyDown(window, { key: '4' });

      expect(mockOnModeChange).not.toHaveBeenCalled();
    });

    it('should skip follow-simulant mode when no simulants are active', () => {
      render(
        <CameraControls
          currentMode="cinematic"
          onModeChange={mockOnModeChange}
        />
      );

      // When cycling from cinematic mode with no simulants, should skip to orbit
      fireEvent.keyDown(window, { key: 'c', metaKey: true });
      expect(mockOnModeChange).toHaveBeenCalledWith('orbit');
    });
  });

  describe('Keyboard shortcut priority', () => {
    it('should prioritize block selection over camera controls for number keys', () => {
      render(
        <div>
          <BlockSelector />
          <CameraControls
            currentMode="orbit"
            onModeChange={mockOnModeChange}
          />
        </div>
      );

      // Number keys should trigger block selection, not camera mode change
      fireEvent.keyDown(window, { key: '1' });
      
      expect(mockSetSelectedBlockType).toHaveBeenCalledWith(BlockType.STONE);
      expect(mockOnModeChange).not.toHaveBeenCalled();
    });

    it('should allow camera controls when using modifier keys', () => {
      render(
        <div>
          <BlockSelector />
          <CameraControls
            currentMode="orbit"
            onModeChange={mockOnModeChange}
          />
        </div>
      );

      // Cmd+C should trigger camera mode change, not block selection
      fireEvent.keyDown(window, { key: 'c', metaKey: true });
      
      expect(mockOnModeChange).toHaveBeenCalled();
      expect(mockSetSelectedBlockType).not.toHaveBeenCalled();
    });
  });
});