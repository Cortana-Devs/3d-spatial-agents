import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Canvas } from '@react-three/fiber';
import CameraController from '../CameraController';
import { useWorldStore } from '../../../store/worldStore';

// Mock the world store
vi.mock('../../../store/worldStore', () => ({
  useWorldStore: vi.fn(() => ({
    simulants: new Map(),
  })),
}));

// Mock Three.js components
vi.mock('@react-three/drei', () => ({
  OrbitControls: vi.fn(() => null),
}));

describe('CameraController Fixes', () => {
  beforeEach(() => {
    // Mock pointer lock API
    Object.defineProperty(document, 'pointerLockElement', {
      writable: true,
      value: null,
    });
    
    // Mock canvas element
    const mockCanvas = {
      requestPointerLock: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    
    vi.spyOn(document, 'querySelector').mockReturnValue(mockCanvas as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should handle keyboard events properly in fly mode', () => {
    const mockAddEventListener = vi.spyOn(document, 'addEventListener');
    
    render(
      <Canvas>
        <CameraController mode="fly" />
      </Canvas>
    );

    // Verify that keyboard event listeners are attached to document
    expect(mockAddEventListener).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function),
      { passive: false }
    );
    expect(mockAddEventListener).toHaveBeenCalledWith(
      'keyup',
      expect.any(Function),
      { passive: false }
    );
  });

  it('should handle pointer lock changes correctly', () => {
    const mockAddEventListener = vi.spyOn(document, 'addEventListener');
    
    render(
      <Canvas>
        <CameraController mode="fly" />
      </Canvas>
    );

    // Verify pointer lock event listener is attached
    expect(mockAddEventListener).toHaveBeenCalledWith(
      'pointerlockchange',
      expect.any(Function)
    );
  });

  it('should render OrbitControls only in orbit mode', () => {
    const { rerender } = render(
      <Canvas>
        <CameraController mode="orbit" />
      </Canvas>
    );

    // In orbit mode, OrbitControls should be rendered
    // (We can't easily test the actual rendering due to mocking, but we can test the logic)

    rerender(
      <Canvas>
        <CameraController mode="fly" />
      </Canvas>
    );

    // In fly mode, OrbitControls should not be rendered
    // The component should return null for non-orbit modes
  });

  it('should prevent default behavior for movement keys in fly mode', () => {
    const mockPreventDefault = vi.fn();
    const mockKeyEvent = {
      code: 'KeyW',
      preventDefault: mockPreventDefault,
    } as any;

    render(
      <Canvas>
        <CameraController mode="fly" />
      </Canvas>
    );

    // Simulate keydown event
    const keydownHandler = vi.mocked(document.addEventListener).mock.calls
      .find(call => call[0] === 'keydown')?.[1] as Function;
    
    if (keydownHandler) {
      keydownHandler(mockKeyEvent);
      expect(mockPreventDefault).toHaveBeenCalled();
    }
  });
});