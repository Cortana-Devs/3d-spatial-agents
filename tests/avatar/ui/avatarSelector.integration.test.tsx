/**
 * avatarSelector.integration.test.ts
 * Feature: F01-FEMALE-AVATAR
 *
 * Purpose:
 *  Integration tests for the AvatarSelector UI + selection store + event emission.
 *
 * Validates (subset of plan):
 *  - UI reflects persisted selection from localStorage (UI-PERSIST-001)
 *  - Toggling emits `avatar:changed` exactly once per actual change (EVT-CHG-001 / UI-INTEG-002)
 *  - Re-selecting same avatar is a no-op (STORE-UNIT-001)
 *  - ARIA roles / attributes present (UI-ARIA-001)
 *  - No unhandled promise rejections during simple toggling (NEG-ERR-001)
 *
 * Notes:
 *  - This test does not mount any 3D runtime; it isolates selector + store logic.
 *  - Uses @testing-library/react conventions (assumes dependency available).
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';

import {
  AvatarSelector,
  setAvatar,
  getAvatarSelectionState,
  _resetAvatarSelectionForTests,
} from '../../../src/state/avatarSelectionStore';

// Utility constants
const PREF_KEY = 'selectedAvatar';
const FEMALE = 'female-c-girl';
const MALE = 'male-default';

function getButton(label: string): HTMLButtonElement {
  const btn = screen.getByRole('radio', { name: label }) as HTMLButtonElement;
  expect(btn).toBeTruthy();
  return btn;
}

describe('AvatarSelector Integration', () => {
  let changedEvents: Array<{ previous: string; next: string; timestamp: number }> = [];
  let unhandledRejections = 0;

  beforeEach(() => {
    cleanup();
    changedEvents = [];
    unhandledRejections = 0;

    // Reset store & localStorage
    _resetAvatarSelectionForTests(MALE);
    localStorage.removeItem(PREF_KEY);

    // Event listener capture
    window.addEventListener(
      'avatar:changed',
      (e: Event) => {
        const ce = e as CustomEvent<{
          previous: string; next: string; timestamp: number;
        }>;
        changedEvents.push(ce.detail);
      },
      { once: false }
    );

    // Track unhandled promise rejections (should stay zero)
    window.addEventListener('unhandledrejection', () => {
      unhandledRejections++;
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('loads female selection from localStorage (persistence)', () => {
    localStorage.setItem(PREF_KEY, FEMALE);
    render(<AvatarSelector />);
    const femaleBtn = getButton('Female');
    const maleBtn = getButton('Male');

    expect(femaleBtn.getAttribute('aria-checked')).toBe('true');
    expect(maleBtn.getAttribute('aria-checked')).toBe('false');

    const state = getAvatarSelectionState();
    expect(state.current).toBe(FEMALE);
  });

  it('emits avatar:changed exactly once per distinct toggle', () => {
    render(<AvatarSelector />);

    const maleBtn = getButton('Male');
    const femaleBtn = getButton('Female');

    // Initial state should be male by default, no events yet
    expect(getAvatarSelectionState().current).toBe(MALE);
    expect(changedEvents.length).toBe(0);

    // Toggle to female
    fireEvent.click(femaleBtn);
    expect(getAvatarSelectionState().current).toBe(FEMALE);
    expect(changedEvents.length).toBe(1);
    expect(changedEvents[0].previous).toBe(MALE);
    expect(changedEvents[0].next).toBe(FEMALE);

    // Toggle back to male
    fireEvent.click(maleBtn);
    expect(getAvatarSelectionState().current).toBe(MALE);
    expect(changedEvents.length).toBe(2);
    expect(changedEvents[1].previous).toBe(FEMALE);
    expect(changedEvents[1].next).toBe(MALE);

    // Re-click male (no change)
    fireEvent.click(maleBtn);
    expect(changedEvents.length).toBe(2);
  });

  it('re-selecting same avatar does not dispatch event', () => {
    render(<AvatarSelector />);
    const maleBtn = getButton('Male');

    // Initial male -> click male again
    fireEvent.click(maleBtn);
    expect(changedEvents.length).toBe(0); // Still zero (no change)
  });

  it('exposes proper ARIA roles and attributes', () => {
    render(<AvatarSelector />);
    const group = screen.getByRole('radiogroup', { name: 'Avatar Selection' });
    expect(group).toBeTruthy();

    const maleBtn = getButton('Male');
    const femaleBtn = getButton('Female');

    expect(maleBtn.getAttribute('role')).toBe('radio');
    expect(femaleBtn.getAttribute('role')).toBe('radio');

    // Baseline check - default male selected
    expect(maleBtn.getAttribute('aria-checked')).toBe('true');
    expect(femaleBtn.getAttribute('aria-checked')).toBe('false');
  });

  it('persists selection across simulated reload', () => {
    render(<AvatarSelector />);
    const femaleBtn = getButton('Female');
    fireEvent.click(femaleBtn);
    expect(getAvatarSelectionState().current).toBe(FEMALE);

    // Simulate "reload" by unmounting + resetting store (but not clearing localStorage)
    cleanup();
    _resetAvatarSelectionForTests(MALE); // reset internal memory to male
    render(<AvatarSelector />);

    // Should restore female from localStorage
    const femaleBtn2 = getButton('Female');
    expect(femaleBtn2.getAttribute('aria-checked')).toBe('true');
    expect(getAvatarSelectionState().current).toBe(FEMALE);
  });

  it('manual setAvatar emits event with correct payload ordering', () => {
    render(<AvatarSelector />);
    setAvatar(FEMALE);
    setAvatar(MALE);
    expect(changedEvents.length).toBe(2);
    expect(changedEvents[0].previous).toBe(MALE);
    expect(changedEvents[0].next).toBe(FEMALE);
    expect(changedEvents[1].previous).toBe(FEMALE);
    expect(changedEvents[1].next).toBe(MALE);
  });

  it('no unhandled promise rejections during basic toggling', async () => {
    render(<AvatarSelector />);
    const femaleBtn = getButton('Female');
    const maleBtn = getButton('Male');

    fireEvent.click(femaleBtn);
    fireEvent.click(maleBtn);
    fireEvent.click(femaleBtn);

    // Allow microtasks to settle
    await Promise.resolve();

    expect(unhandledRejections).toBe(0);
  });

  it('class names / inline style differences reflect active selection', () => {
    render(<AvatarSelector />);
    const maleBtn = getButton('Male');
    const femaleBtn = getButton('Female');

    // Style assertion (border indicates active per implementation)
    expect(maleBtn.style.border.includes('2px')).toBe(true);
    expect(femaleBtn.style.border.includes('2px')).toBe(false);

    fireEvent.click(femaleBtn);
    expect(femaleBtn.style.border.includes('2px')).toBe(true);
    expect(maleBtn.style.border.includes('2px')).toBe(false);
  });

  it('debug state remains consistent after multiple toggles', () => {
    render(<AvatarSelector />);
    const femaleBtn = getButton('Female');
    const maleBtn = getButton('Male');

    fireEvent.click(femaleBtn);
    fireEvent.click(maleBtn);
    fireEvent.click(femaleBtn);

    const state = getAvatarSelectionState();
    expect(state.current).toBe(FEMALE);
    expect(state.lastChangeTs).toBeGreaterThan(0);
  });
});
