import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import '@testing-library/jest-dom';
import VoxelCanvas from '../VoxelCanvas';

// Mock React Three Fiber components
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="canvas">{children}</div>
  ),
  useFrame: () => {},
  useThree: () => ({
    camera: {},
    raycaster: {
      setFromCamera: vi.fn(),
      ray: {
        intersectPlane: vi.fn(),
        distanceToPoint: vi.fn(() => 1)
      }
    }
  })
}));

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => <div data-testid="orbit-controls" />,
  Grid: () => <div data-testid="grid" />
}));

// Mock the world store
vi.mock('../../../store/worldStore', () => ({
  useWorldStore: () => ({
    blockMap: new Map(),
    selectedBlockType: 'stone',
    worldLimits: { maxBlocks: 1000 },
    addBlock: vi.fn(),
    removeBlock: vi.fn()
  })
}));

describe('VoxelCanvas', () => {
  it('renders the 3D canvas', () => {
    render(<VoxelCanvas />);
    
    expect(screen.getByTestId('canvas')).toBeInTheDocument();
    expect(screen.getByTestId('orbit-controls')).toBeInTheDocument();
    expect(screen.getByTestId('grid')).toBeInTheDocument();
  });

  it('applies the correct CSS classes', () => {
    const { container } = render(<VoxelCanvas className="test-class" />);
    
    expect(container.firstChild).toHaveClass('w-full', 'h-full', 'test-class');
  });
});