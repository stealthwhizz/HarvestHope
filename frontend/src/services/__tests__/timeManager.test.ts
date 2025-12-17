/**
 * Tests for TimeManager service
 */

import { timeManager } from '../timeManager';
import { store } from '../../store';
import { resetSeason } from '../../store/slices/seasonSlice';
import { resetFarm } from '../../store/slices/farmSlice';

describe('TimeManager', () => {
  beforeEach(() => {
    // Reset store state before each test
    store.dispatch(resetSeason());
    store.dispatch(resetFarm());
    timeManager.stopGameLoop();
  });

  afterEach(() => {
    timeManager.stopGameLoop();
  });

  test('should advance game time manually', () => {
    const initialState = store.getState();
    expect(initialState.season.current).toBe('Kharif');
    expect(initialState.season.day).toBe(1);
    expect(initialState.farm.day).toBe(1);

    // Advance one day
    timeManager.advanceGameTime();

    const newState = store.getState();
    expect(newState.season.day).toBe(2);
    expect(newState.farm.day).toBe(2);
    expect(newState.season.current).toBe('Kharif'); // Still same season
  });

  test('should transition seasons after 120 days', () => {
    const initialState = store.getState();
    expect(initialState.season.current).toBe('Kharif');

    // Advance 120 days to trigger season transition
    for (let i = 0; i < 120; i++) {
      timeManager.advanceGameTime();
    }

    const newState = store.getState();
    expect(newState.season.current).toBe('Rabi');
    expect(newState.season.day).toBe(1);
    expect(newState.farm.season).toBe('Rabi');
  });

  test('should complete full season cycle', () => {
    const initialState = store.getState();
    expect(initialState.season.current).toBe('Kharif');
    expect(initialState.farm.year).toBe(1);

    // Advance through 4 complete seasons (480 days)
    for (let i = 0; i < 480; i++) {
      timeManager.advanceGameTime();
    }

    const newState = store.getState();
    expect(newState.season.current).toBe('Kharif'); // Back to start
    expect(newState.season.day).toBe(1);
    expect(newState.farm.year).toBe(2); // Year should advance
  });

  test('should schedule custom events', () => {
    const event = {
      id: 'test-custom-event',
      type: 'crop_growth' as const,
      scheduledDay: 5,
      scheduledSeason: 'Kharif' as const,
      data: { message: 'Custom test event' },
      recurring: false,
    };

    timeManager.scheduleCustomEvent(event);

    const state = store.getState();
    expect(state.season.scheduledEvents).toHaveLength(1);
    expect(state.season.scheduledEvents[0].id).toBe('test-custom-event');
  });

  test('should provide season information', () => {
    const kharifInfo = timeManager.getSeasonInfo('Kharif');
    expect(kharifInfo.name).toBe('Kharif');
    expect(kharifInfo.duration).toBe(120);
    expect(kharifInfo.crops).toContain('Rice');
    expect(kharifInfo.characteristics).toContain('Heavy rainfall');

    const currentSeasonInfo = timeManager.getSeasonInfo();
    expect(currentSeasonInfo.name).toBe('Kharif'); // Default to current season
  });

  test('should manage game speed', () => {
    expect(timeManager.getGameSpeed()).toBe(1000); // Default speed

    timeManager.setGameSpeed(500);
    expect(timeManager.getGameSpeed()).toBe(500);

    // Test minimum speed constraint
    timeManager.setGameSpeed(50);
    expect(timeManager.getGameSpeed()).toBe(100); // Should be clamped to minimum
  });

  test('should track game loop state', () => {
    expect(timeManager.isGameRunning()).toBe(false);

    timeManager.startGameLoop(2000);
    expect(timeManager.isGameRunning()).toBe(true);

    timeManager.stopGameLoop();
    expect(timeManager.isGameRunning()).toBe(false);
  });
});