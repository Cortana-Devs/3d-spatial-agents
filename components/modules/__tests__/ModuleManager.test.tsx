import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ModuleManager, useModuleSystem } from '../ModuleManager';
import React from 'react';

// Mock React Three Fiber
vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn((callback) => {
    // Simulate frame callback
    setTimeout(() => callback({}, 0.016), 16);
  }),
}));

// Test component that uses the module system
function TestModule({ id, priority }: { id: string; priority: number }) {
  const { requestFrame, setEnabled, getStats } = useModuleSystem({
    id,
    priority,
    maxFrameTime: 10,
    targetFPS: 60,
    canSkipFrames: true,
  });

  const [frameCount, setFrameCount] = React.useState(0);

  const updateLoop = React.useCallback((deltaTime: number) => {
    setFrameCount(prev => prev + 1);
  }, []);

  React.useEffect(() => {
    requestFrame(updateLoop);
  }, [requestFrame, updateLoop]);

  return (
    <div data-testid={`module-${id}`}>
      Module {id} - Frames: {frameCount}
    </div>
  );
}

describe('ModuleManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(
      <ModuleManager>
        <div>Test Content</div>
      </ModuleManager>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should provide module system context to children', () => {
    render(
      <ModuleManager>
        <TestModule id="test-module" priority={5} />
      </ModuleManager>
    );

    expect(screen.getByTestId('module-test-module')).toBeInTheDocument();
    expect(screen.getByText(/Module test-module/)).toBeInTheDocument();
  });

  it('should handle multiple modules with different priorities', () => {
    render(
      <ModuleManager>
        <TestModule id="high-priority" priority={10} />
        <TestModule id="low-priority" priority={1} />
      </ModuleManager>
    );

    expect(screen.getByTestId('module-high-priority')).toBeInTheDocument();
    expect(screen.getByTestId('module-low-priority')).toBeInTheDocument();
  });

  it('should throw error when useModuleSystem is used outside ModuleManager', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestModule id="orphan-module" priority={5} />);
    }).toThrow('useModuleSystem must be used within a ModuleManager');

    consoleSpy.mockRestore();
  });
});

describe('useModuleSystem', () => {
  it('should provide module registration functionality', () => {
    let moduleControls: any = null;

    function TestComponent() {
      moduleControls = useModuleSystem({
        id: 'test',
        priority: 5,
        maxFrameTime: 10,
        targetFPS: 60,
        canSkipFrames: true,
      });

      return <div>Test</div>;
    }

    render(
      <ModuleManager>
        <TestComponent />
      </ModuleManager>
    );

    expect(moduleControls).toBeTruthy();
    expect(moduleControls.requestFrame).toBeInstanceOf(Function);
    expect(moduleControls.setEnabled).toBeInstanceOf(Function);
    expect(moduleControls.getStats).toBeInstanceOf(Function);
  });

  it('should handle module configuration with defaults', () => {
    let moduleId: string | null = null;

    function TestComponent() {
      const { moduleId: id } = useModuleSystem({
        priority: 5,
        maxFrameTime: 10,
        targetFPS: 60,
      });

      moduleId = id;
      return <div>Test</div>;
    }

    render(
      <ModuleManager>
        <TestComponent />
      </ModuleManager>
    );

    expect(moduleId).toBeTruthy();
    expect(typeof moduleId).toBe('string');
  });
});
