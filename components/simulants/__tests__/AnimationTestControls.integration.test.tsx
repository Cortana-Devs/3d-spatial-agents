/**
 * Integration test for AnimationTestControls component
 * Tests the core functionality and requirements
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AnimationTestControls from '../AnimationTestControls';

// Mock the world store with a simple implementation
const mockUpdateSimulant = vi.fn();
const mockSimulants = new Map([
  ['sim1', {
    id: 'sim1',
    name: 'Test Simulant',
    position: { x: 0, y: 0, z: 0 },
    status: 'active' as const,
    lastAction: 'Standing peacefully',
    conversationHistory: [],
    geminiSessionId: 'session-sim1'
  }]
]);

vi.mock('../../../store/worldStore', () => ({
  useWorldStore: () => ({
    simulants: mockSimulants,
    updateSimulant: mockUpdateSimulant
  })
}));

describe('AnimationTestControls Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render and be functional', () => {
    const { container } = render(<AnimationTestControls />);
    
    // Component should render without crashing
    expect(container).toBeTruthy();
    
    // Should contain the main title
    expect(container.textContent).toContain('Animation Controls');
    
    // Should contain animation buttons
    expect(container.textContent).toContain('Idle');
    expect(container.textContent).toContain('Walk');
    expect(container.textContent).toContain('Run');
    expect(container.textContent).toContain('Jump');
    
    // Should contain simulant selection
    expect(container.textContent).toContain('Select Simulant');
    expect(container.textContent).toContain('Test Simulant');
    
    // Should contain current state display
    expect(container.textContent).toContain('Current State');
    expect(container.textContent).toContain('Animation:');
    expect(container.textContent).toContain('Status:');
  });

  it('should handle animation button clicks', () => {
    const onAnimationChange = vi.fn();
    render(<AnimationTestControls onAnimationChange={onAnimationChange} />);
    
    // Find and click a walk button (there might be multiple, so get all and click the first)
    const walkButtons = screen.getAllByText('Walk');
    if (walkButtons.length > 0) {
      fireEvent.click(walkButtons[0]);
      
      // Should call updateSimulant
      expect(mockUpdateSimulant).toHaveBeenCalledWith('sim1', {
        lastAction: 'Walking around the world'
      });
      
      // Should call the callback
      expect(onAnimationChange).toHaveBeenCalledWith('sim1', 'walking');
    }
  });

  it('should handle no simulants state', () => {
    // Mock empty simulants for this test
    vi.doMock('../../../store/worldStore', () => ({
      useWorldStore: () => ({
        simulants: new Map(),
        updateSimulant: vi.fn()
      })
    }));

    // Re-import the component to get the new mock
    const { container } = render(<AnimationTestControls />);
    
    // Should show no simulants message
    expect(container.textContent).toContain('No simulants available');
  });

  it('should show error handling', () => {
    const onError = vi.fn();
    
    // Mock updateSimulant to throw an error
    const mockErrorUpdateSimulant = vi.fn(() => {
      throw new Error('Test error');
    });
    
    vi.doMock('../../../store/worldStore', () => ({
      useWorldStore: () => ({
        simulants: mockSimulants,
        updateSimulant: mockErrorUpdateSimulant
      })
    }));

    render(<AnimationTestControls onError={onError} />);
    
    // Click an animation button to trigger error
    const walkButtons = screen.getAllByText('Walk');
    if (walkButtons.length > 0) {
      fireEvent.click(walkButtons[0]);
      
      // Should call error callback
      expect(onError).toHaveBeenCalledWith('Test error');
    }
  });

  it('should meet requirement 4.1 - display animation buttons', () => {
    const { container } = render(<AnimationTestControls />);
    
    // Requirement 4.1: Should display buttons for "Idle", "Walk", "Run", and "Jump" animations
    expect(container.textContent).toContain('Idle');
    expect(container.textContent).toContain('Walk');
    expect(container.textContent).toContain('Run');
    expect(container.textContent).toContain('Jump');
  });

  it('should meet requirement 4.2 - trigger animation on button click', () => {
    render(<AnimationTestControls />);
    
    // Requirement 4.2: When a user clicks an animation button, system should immediately trigger that animation
    const walkButtons = screen.getAllByText('Walk');
    if (walkButtons.length > 0) {
      fireEvent.click(walkButtons[0]);
      
      // Should update simulant immediately
      expect(mockUpdateSimulant).toHaveBeenCalledWith('sim1', {
        lastAction: 'Walking around the world'
      });
    }
  });

  it('should meet requirement 4.3 - show current state', () => {
    const { container } = render(<AnimationTestControls />);
    
    // Requirement 4.3: Should show current animation and state
    expect(container.textContent).toContain('Current State');
    expect(container.textContent).toContain('Animation:');
    expect(container.textContent).toContain('Status:');
    expect(container.textContent).toContain('idle'); // Default state
    expect(container.textContent).toContain('Playing'); // Default status
  });

  it('should meet requirement 4.4 - allow simulant selection', () => {
    const { container } = render(<AnimationTestControls />);
    
    // Requirement 4.4: Should allow selection of which simulant to control
    expect(container.textContent).toContain('Select Simulant');
    expect(container.textContent).toContain('Test Simulant');
    
    // Should have a select element
    const selects = container.querySelectorAll('select');
    expect(selects.length).toBeGreaterThan(0);
  });

  it('should meet requirement 4.5 - handle animation failures', () => {
    const onError = vi.fn();
    
    // Mock updateSimulant to throw an error
    const mockErrorUpdateSimulant = vi.fn(() => {
      throw new Error('Animation failed');
    });
    
    vi.doMock('../../../store/worldStore', () => ({
      useWorldStore: () => ({
        simulants: mockSimulants,
        updateSimulant: mockErrorUpdateSimulant
      })
    }));

    render(<AnimationTestControls onError={onError} />);
    
    // Requirement 4.5: Should show error state and display failure reason
    const walkButtons = screen.getAllByText('Walk');
    if (walkButtons.length > 0) {
      fireEvent.click(walkButtons[0]);
      
      // Should call error callback with failure reason
      expect(onError).toHaveBeenCalledWith('Animation failed');
    }
  });
});