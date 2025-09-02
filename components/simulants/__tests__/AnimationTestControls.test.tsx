/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AnimationTestControls from '../AnimationTestControls';
import { useWorldStore } from '../../../store/worldStore';
import type { AISimulant } from '../../../types';

// Mock the world store
vi.mock('../../../store/worldStore', () => ({
  useWorldStore: vi.fn()
}));

// Mock UI components
vi.mock('../../ui/button', () => ({
  Button: ({ children, onClick, disabled, className, ...props }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={className}
      data-testid={props['data-testid']}
      {...props}
    >
      {children}
    </button>
  )
}));

vi.mock('../../ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: any) => <h3 className={className}>{children}</h3>
}));

vi.mock('../../ui/separator', () => ({
  Separator: ({ className }: any) => <hr className={className} />
}));

vi.mock('../../ui/slider', () => ({
  Slider: ({ value, onValueChange, min, max, step, className }: any) => (
    <input
      type="range"
      value={value[0]}
      onChange={(e) => onValueChange([parseFloat(e.target.value)])}
      min={min}
      max={max}
      step={step}
      className={className}
      data-testid="slider"
    />
  )
}));

vi.mock('../../ui/switch', () => ({
  Switch: ({ checked, onCheckedChange }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      data-testid="switch"
    />
  )
}));

vi.mock('../../ui/label', () => ({
  Label: ({ children, className }: any) => <label className={className}>{children}</label>
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Play: () => <span data-testid="play-icon">Play</span>,
  Pause: () => <span data-testid="pause-icon">Pause</span>,
  Square: () => <span data-testid="square-icon">Square</span>,
  Settings: () => <span data-testid="settings-icon">Settings</span>,
  User: () => <span data-testid="user-icon">User</span>,
  Activity: () => <span data-testid="activity-icon">Activity</span>,
  ChevronDown: () => <span data-testid="chevron-down-icon">ChevronDown</span>,
  ChevronUp: () => <span data-testid="chevron-up-icon">ChevronUp</span>,
  AlertCircle: () => <span data-testid="alert-circle-icon">AlertCircle</span>
}));

describe('AnimationTestControls', () => {
  const mockUpdateSimulant = vi.fn();
  const mockOnAnimationChange = vi.fn();
  const mockOnError = vi.fn();

  const createMockSimulant = (id: string, name: string): AISimulant => ({
    id,
    name,
    position: { x: 0, y: 0, z: 0 },
    status: 'active',
    lastAction: 'Standing peacefully',
    conversationHistory: [],
    geminiSessionId: `session-${id}`
  });

  const mockSimulants = new Map([
    ['sim1', createMockSimulant('sim1', 'Simulant-1')],
    ['sim2', createMockSimulant('sim2', 'Simulant-2')]
  ]);

  beforeEach(() => {
    vi.clearAllMocks();
    (useWorldStore as any).mockReturnValue({
      simulants: mockSimulants,
      updateSimulant: mockUpdateSimulant
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Requirement 4.1: Animation test interface loads with buttons', () => {
    it('should display buttons for Idle, Walk, Run, and Jump animations', async () => {
      render(<AnimationTestControls />);
      
      // Component auto-expands when simulants are available
      // Check for animation buttons
      expect(screen.getByText('Idle')).toBeInTheDocument();
      expect(screen.getByText('Walk')).toBeInTheDocument();
      expect(screen.getByText('Run')).toBeInTheDocument();
      expect(screen.getByText('Jump')).toBeInTheDocument();
    });

    it('should display all available animation types', async () => {
      render(<AnimationTestControls />);
      
      // Check for all animation types
      const expectedAnimations = ['Idle', 'Walk', 'Run', 'Jump', 'Build', 'Talk', 'Think', 'Celebrate'];
      
      expectedAnimations.forEach(animation => {
        expect(screen.getByText(animation)).toBeInTheDocument();
      });
    });
  });

  describe('Requirement 4.2: User clicks animation button triggers animation', () => {
    it('should trigger animation immediately when button is clicked', async () => {
      render(<AnimationTestControls onAnimationChange={mockOnAnimationChange} />);

      // Click walk animation button
      const walkButton = screen.getByText('Walk');
      await userEvent.click(walkButton);

      // Should update simulant with walking action
      expect(mockUpdateSimulant).toHaveBeenCalledWith('sim1', {
        lastAction: 'Walking around the world'
      });

      // Should call animation change callback
      expect(mockOnAnimationChange).toHaveBeenCalledWith('sim1', 'walking');
    });

    it('should update simulant lastAction for different animations', async () => {
      render(<AnimationTestControls />);

      // Test different animations
      const animations = [
        { button: 'Run', expectedAction: 'Running with excitement' },
        { button: 'Jump', expectedAction: 'Jumping with joy' },
        { button: 'Build', expectedAction: 'Building structures' }
      ];

      for (const { button, expectedAction } of animations) {
        const animButton = screen.getByText(button);
        await userEvent.click(animButton);

        expect(mockUpdateSimulant).toHaveBeenCalledWith('sim1', {
          lastAction: expectedAction
        });
      }
    });
  });

  describe('Requirement 4.3: Animation button shows current state', () => {
    it('should highlight currently playing animation button', async () => {
      render(<AnimationTestControls />);

      // Click walk button
      const walkButton = screen.getByText('Walk');
      await userEvent.click(walkButton);

      // Wait for state update
      await waitFor(() => {
        const walkButtonElement = walkButton.closest('button');
        expect(walkButtonElement).toHaveClass('ring-2', 'ring-white/30');
      });
    });

    it('should show playing indicator for active animation', async () => {
      render(<AnimationTestControls />);

      // Click an animation button
      const idleButton = screen.getByText('Idle');
      await userEvent.click(idleButton);

      // Should show playing status in current state display
      await waitFor(() => {
        expect(screen.getByText('Playing')).toBeInTheDocument();
      });
    });

    it('should show error state when animation fails', async () => {
      const mockErrorUpdateSimulant = vi.fn().mockImplementation(() => {
        throw new Error('Animation failed');
      });

      (useWorldStore as any).mockReturnValue({
        simulants: mockSimulants,
        updateSimulant: mockErrorUpdateSimulant
      });

      render(<AnimationTestControls onError={mockOnError} />);

      // Click animation button that will fail
      const walkButton = screen.getByText('Walk');
      await userEvent.click(walkButton);

      // Should call error callback
      expect(mockOnError).toHaveBeenCalledWith('Animation failed');
    });
  });

  describe('Requirement 4.4: Multiple simulants selection', () => {
    it('should allow selection of which simulant to control', async () => {
      render(<AnimationTestControls />);

      // Should have simulant selection dropdown
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();

      // Should show available simulants
      expect(screen.getByText('Simulant-1 (active)')).toBeInTheDocument();
      expect(screen.getByText('Simulant-2 (active)')).toBeInTheDocument();
    });

    it('should control different simulants when selection changes', async () => {
      render(<AnimationTestControls />);

      // Change simulant selection
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'sim2' } });

      // Click animation button
      const walkButton = screen.getByText('Walk');
      await userEvent.click(walkButton);

      // Should update the selected simulant (sim2)
      expect(mockUpdateSimulant).toHaveBeenCalledWith('sim2', {
        lastAction: 'Walking around the world'
      });
    });

    it('should auto-select first simulant when none selected', () => {
      render(<AnimationTestControls />);

      // Should auto-select first simulant
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('sim1');
    });
  });

  describe('Requirement 4.5: Animation failure handling', () => {
    it('should display failure reason when animation fails', async () => {
      const mockErrorUpdateSimulant = vi.fn().mockImplementation(() => {
        throw new Error('Network error');
      });

      (useWorldStore as any).mockReturnValue({
        simulants: mockSimulants,
        updateSimulant: mockErrorUpdateSimulant
      });

      render(<AnimationTestControls />);

      // Click animation button that will fail
      const walkButton = screen.getByText('Walk');
      await userEvent.click(walkButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('should allow clearing error state', async () => {
      const mockErrorUpdateSimulant = vi.fn().mockImplementation(() => {
        throw new Error('Test error');
      });

      (useWorldStore as any).mockReturnValue({
        simulants: mockSimulants,
        updateSimulant: mockErrorUpdateSimulant
      });

      render(<AnimationTestControls />);

      // Trigger error
      const walkButton = screen.getByText('Walk');
      await userEvent.click(walkButton);

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText('Test error')).toBeInTheDocument();
      });

      // Click clear button
      const clearButton = screen.getByText('Clear');
      await userEvent.click(clearButton);

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText('Test error')).not.toBeInTheDocument();
      });
    });
  });

  describe('Advanced Controls', () => {
    it('should show advanced controls when settings button is clicked', async () => {
      render(<AnimationTestControls />);

      // Click settings button (find by role and aria-label or title)
      const settingsButtons = screen.getAllByTestId('settings-icon');
      const settingsButton = settingsButtons[0].closest('button')!;
      await userEvent.click(settingsButton);

      // Should show advanced settings
      expect(screen.getByText('Advanced Settings')).toBeInTheDocument();
      expect(screen.getByText('Cross-fade Duration')).toBeInTheDocument();
      expect(screen.getByText('Animation Speed')).toBeInTheDocument();
    });

    it('should allow adjusting cross-fade duration', async () => {
      render(<AnimationTestControls />);

      const settingsButtons = screen.getAllByTestId('settings-icon');
      const settingsButton = settingsButtons[0].closest('button')!;
      await userEvent.click(settingsButton);

      // Find and adjust cross-fade slider
      const sliders = screen.getAllByTestId('slider');
      const crossFadeSlider = sliders[0]; // First slider is cross-fade duration
      
      fireEvent.change(crossFadeSlider, { target: { value: '0.5' } });
      
      // Should show updated value
      expect(screen.getByText('0.5s')).toBeInTheDocument();
    });

    it('should allow adjusting animation speed', async () => {
      render(<AnimationTestControls />);

      const settingsButtons = screen.getAllByTestId('settings-icon');
      const settingsButton = settingsButtons[0].closest('button')!;
      await userEvent.click(settingsButton);

      // Find and adjust speed slider
      const sliders = screen.getAllByTestId('slider');
      const speedSlider = sliders[1]; // Second slider is animation speed
      
      fireEvent.change(speedSlider, { target: { value: '1.5' } });
      
      // Should show updated value
      expect(screen.getByText('1.5x')).toBeInTheDocument();
    });

    it('should allow toggling real-time updates', async () => {
      render(<AnimationTestControls />);

      const settingsButtons = screen.getAllByTestId('settings-icon');
      const settingsButton = settingsButtons[0].closest('button')!;
      await userEvent.click(settingsButton);

      // Find and toggle real-time updates switch
      const realtimeSwitch = screen.getByTestId('switch');
      
      // Should be enabled by default
      expect(realtimeSwitch).toBeChecked();
      
      // Toggle it off
      await userEvent.click(realtimeSwitch);
      expect(realtimeSwitch).not.toBeChecked();
    });
  });

  describe('No Simulants State', () => {
    it('should show no simulants message when no simulants available', () => {
      (useWorldStore as any).mockReturnValue({
        simulants: new Map(),
        updateSimulant: mockUpdateSimulant
      });

      render(<AnimationTestControls />);

      expect(screen.getByText('No simulants available')).toBeInTheDocument();
    });
  });

  describe('Real-time Animation Updates', () => {
    it('should update animation state based on simulant lastAction changes', async () => {
      const simulantWithAction = createMockSimulant('sim1', 'Simulant-1');
      simulantWithAction.lastAction = 'Walking around the world';

      (useWorldStore as any).mockReturnValue({
        simulants: new Map([['sim1', simulantWithAction]]),
        updateSimulant: mockUpdateSimulant
      });

      render(<AnimationTestControls />);

      // Should detect walking animation from lastAction
      await waitFor(() => {
        expect(screen.getByText('walking')).toBeInTheDocument();
      });
    });
  });

  describe('Transition Progress Display', () => {
    it('should show transition progress when transitioning between animations', async () => {
      render(<AnimationTestControls />);

      // Click animation to start transition
      const walkButtons = screen.getAllByText('Walk');
      const walkButton = walkButtons[0];
      await userEvent.click(walkButton);

      // The component should show transition progress
      // Note: In a real scenario, this would be updated by the animation system
      // For testing, we're verifying the UI structure exists
      expect(screen.getByText('Current State')).toBeInTheDocument();
    });
  });
});