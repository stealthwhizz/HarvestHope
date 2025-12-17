/**
 * Tests for season slice and time management
 * Includes property-based tests for seasonal cycle consistency
 */

import { configureStore } from '@reduxjs/toolkit';
import fc from 'fast-check';
import { 
  seasonReducer, 
  advanceDay, 
  setSeason, 
  scheduleEvent, 
  validateSeasonCycle,
  selectCurrentSeason,
  selectCurrentDay,
  selectDaysRemaining,
  getSeasonInfo,
  isValidSeasonTransition,
  calculateSeasonProgress,
  type ExtendedSeasonData 
} from '../seasonSlice';
import { 
  isValidSeasonTransition as utilIsValidTransition,
  getNextSeason,
  validateSeasonData,
  DAYS_PER_SEASON,
  SEASON_CYCLE 
} from '../../../utils/seasonValidation';
import type { SeasonType } from '../../../../../shared/types/game-state';

// Test store setup
const createTestStore = (initialState?: Partial<ExtendedSeasonData>) => {
  const defaultState: ExtendedSeasonData = {
    current: 'Kharif',
    day: 1,
    daysRemaining: 119,
    nextSeason: 'Rabi',
    scheduledEvents: [],
    seasonTransitionData: undefined,
    ...initialState,
  };

  // If current season is overridden, make sure nextSeason is correct
  if (initialState?.current && !initialState?.nextSeason) {
    defaultState.nextSeason = getNextSeason(initialState.current);
  }

  return configureStore({
    reducer: {
      season: seasonReducer,
    },
    preloadedState: {
      season: defaultState,
    },
  });
};

describe('Season Slice', () => {
  describe('Basic functionality', () => {
    test('should initialize with correct default state', () => {
      const store = createTestStore();
      const state = store.getState().season;
      
      expect(state.current).toBe('Kharif');
      expect(state.day).toBe(1);
      expect(state.daysRemaining).toBe(119);
      expect(state.nextSeason).toBe('Rabi');
      expect(state.scheduledEvents).toEqual([]);
    });

    test('should advance day correctly', () => {
      const store = createTestStore();
      
      store.dispatch(advanceDay());
      const state = store.getState().season;
      
      expect(state.day).toBe(2);
      expect(state.daysRemaining).toBe(118);
      expect(state.current).toBe('Kharif');
    });

    test('should transition seasons when day exceeds 120', () => {
      const store = createTestStore({ day: 120, daysRemaining: 0 });
      
      store.dispatch(advanceDay());
      const state = store.getState().season;
      
      expect(state.current).toBe('Rabi');
      expect(state.day).toBe(1);
      expect(state.daysRemaining).toBe(119);
      expect(state.nextSeason).toBe('Zaid');
    });

    test('should set season correctly', () => {
      const store = createTestStore();
      
      store.dispatch(setSeason({ season: 'Rabi', day: 50 }));
      const state = store.getState().season;
      
      expect(state.current).toBe('Rabi');
      expect(state.day).toBe(50);
      expect(state.daysRemaining).toBe(70);
      expect(state.nextSeason).toBe('Zaid');
    });

    test('should schedule events correctly', () => {
      const store = createTestStore();
      const event = {
        id: 'test-event',
        type: 'crop_growth' as const,
        scheduledDay: 30,
        scheduledSeason: 'Kharif' as SeasonType,
        data: { message: 'Test event' },
        recurring: false,
      };
      
      store.dispatch(scheduleEvent(event));
      const state = store.getState().season;
      
      expect(state.scheduledEvents).toHaveLength(1);
      expect(state.scheduledEvents[0]).toMatchObject(event);
      expect(state.scheduledEvents[0].completed).toBe(false);
    });
  });

  describe('Season validation', () => {
    test('should validate season cycle correctly', () => {
      const store = createTestStore({ 
        current: 'Kharif', 
        nextSeason: 'Zaid' // Wrong next season
      });
      
      store.dispatch(validateSeasonCycle());
      const state = store.getState().season;
      
      expect(state.nextSeason).toBe('Rabi'); // Should be corrected
    });

    test('should handle invalid day bounds', () => {
      const store = createTestStore({ day: 150, daysRemaining: -30 });
      
      store.dispatch(validateSeasonCycle());
      const state = store.getState().season;
      
      expect(state.day).toBe(120);
      expect(state.daysRemaining).toBe(0);
    });
  });

  describe('Selectors', () => {
    test('selectors should return correct values', () => {
      const store = createTestStore({ current: 'Rabi', day: 45, daysRemaining: 75 });
      const state = store.getState();
      
      expect(selectCurrentSeason(state)).toBe('Rabi');
      expect(selectCurrentDay(state)).toBe(45);
      expect(selectDaysRemaining(state)).toBe(75);
    });
  });

  describe('Utility functions', () => {
    test('getSeasonInfo should return correct information', () => {
      const kharifInfo = getSeasonInfo('Kharif');
      expect(kharifInfo.name).toBe('Kharif');
      expect(kharifInfo.crops).toContain('Rice');
      expect(kharifInfo.characteristics).toContain('Heavy rainfall');
    });

    test('isValidSeasonTransition should validate transitions correctly', () => {
      expect(isValidSeasonTransition('Kharif', 'Rabi')).toBe(true);
      expect(isValidSeasonTransition('Rabi', 'Zaid')).toBe(true);
      expect(isValidSeasonTransition('Zaid', 'Off-season')).toBe(true);
      expect(isValidSeasonTransition('Off-season', 'Kharif')).toBe(true);
      expect(isValidSeasonTransition('Kharif', 'Zaid')).toBe(false);
    });

    test('calculateSeasonProgress should return correct percentage', () => {
      expect(calculateSeasonProgress(1)).toBe(0.8333333333333334);
      expect(calculateSeasonProgress(60)).toBe(50);
      expect(calculateSeasonProgress(120)).toBe(100);
    });
  });
});

describe('Property-Based Tests', () => {
  /**
   * **Feature: harvest-hope, Property 1: Seasonal cycle consistency**
   * For any game state, each season should provide exactly 120 days and advance to the correct next season in the cycle
   */
  test('Property 1: Seasonal cycle consistency', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SEASON_CYCLE),
        fc.integer({ min: 1, max: DAYS_PER_SEASON }),
        (season: SeasonType, startDay: number) => {
          const store = createTestStore({ 
            current: season, 
            day: startDay, 
            daysRemaining: DAYS_PER_SEASON - startDay 
          });
          
          // Advance through the remaining days of the season until transition
          let currentState = store.getState().season;
          const initialSeason = currentState.current;
          let daysAdvanced = 0;
          
          // Keep advancing until we transition to the next season
          while (currentState.current === initialSeason) {
            store.dispatch(advanceDay());
            currentState = store.getState().season;
            daysAdvanced++;
            
            // Safety check to prevent infinite loop
            if (daysAdvanced > DAYS_PER_SEASON + 5) {
              throw new Error(`Advanced ${daysAdvanced} days without season transition`);
            }
          }
          
          // After advancing through the season, we should be in the next season
          const expectedNextSeason = getNextSeason(initialSeason);
          
          // Verify season transition is correct
          expect(currentState.current).toBe(expectedNextSeason);
          expect(currentState.day).toBe(1);
          expect(currentState.daysRemaining).toBe(DAYS_PER_SEASON - 1);
          
          // Verify the transition was valid
          expect(utilIsValidTransition(initialSeason, currentState.current)).toBe(true);
          
          // Verify we advanced the correct number of days to complete the season
          // From startDay through day 120 = 120 - startDay + 1 days
          const expectedDaysToAdvance = DAYS_PER_SEASON - startDay + 1;
          expect(daysAdvanced).toBe(expectedDaysToAdvance);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property: Season data validation consistency', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SEASON_CYCLE),
        fc.integer({ min: 1, max: DAYS_PER_SEASON }),
        (season: SeasonType, day: number) => {
          const daysRemaining = DAYS_PER_SEASON - day;
          const nextSeason = getNextSeason(season);
          
          const seasonData = {
            current: season,
            day,
            daysRemaining,
            nextSeason,
          };
          
          const validation = validateSeasonData(seasonData);
          
          // Valid season data should pass validation
          expect(validation.isValid).toBe(true);
          expect(validation.errors).toHaveLength(0);
          expect(validation.correctedData).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property: Season cycle completeness', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SEASON_CYCLE),
        (startSeason: SeasonType) => {
          const store = createTestStore({ current: startSeason, day: 1 });
          
          const seasonsVisited: SeasonType[] = [];
          let currentState = store.getState().season;
          seasonsVisited.push(currentState.current);
          
          // Advance through 4 complete seasons (one full cycle)
          for (let seasonCount = 0; seasonCount < 4; seasonCount++) {
            const currentSeason = store.getState().season.current;
            
            // Advance until we transition to the next season
            while (store.getState().season.current === currentSeason) {
              store.dispatch(advanceDay());
            }
            
            const newState = store.getState().season;
            seasonsVisited.push(newState.current);
          }
          
          // After one complete cycle, we should be back to the starting season
          const finalState = store.getState().season;
          expect(finalState.current).toBe(startSeason);
          
          // We should have visited 5 seasons total (start + 4 transitions)
          expect(seasonsVisited).toHaveLength(5);
          
          // Verify the order is correct
          for (let i = 0; i < seasonsVisited.length; i++) {
            const expectedSeason = SEASON_CYCLE[(SEASON_CYCLE.indexOf(startSeason) + i) % SEASON_CYCLE.length];
            expect(seasonsVisited[i]).toBe(expectedSeason);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property: Event scheduling consistency', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SEASON_CYCLE),
        fc.integer({ min: 1, max: DAYS_PER_SEASON }),
        fc.integer({ min: 1, max: DAYS_PER_SEASON }),
        (season: SeasonType, currentDay: number, eventDay: number) => {
          const store = createTestStore({ current: season, day: currentDay });
          
          const event = {
            id: `test-event-${Date.now()}-${Math.random()}`, // Ensure unique ID
            type: 'crop_growth' as const,
            scheduledDay: eventDay,
            scheduledSeason: season,
            data: { message: 'Test event' },
            recurring: false,
          };
          
          store.dispatch(scheduleEvent(event));
          const state = store.getState().season;
          
          // Event should be scheduled
          expect(state.scheduledEvents).toHaveLength(1);
          expect(state.scheduledEvents[0].scheduledDay).toBe(eventDay);
          expect(state.scheduledEvents[0].scheduledSeason).toBe(season);
          expect(state.scheduledEvents[0].completed).toBe(false);
          
          // Only test events scheduled for future days
          if (eventDay > currentDay) {
            // Advance to the event day
            const daysToAdvance = eventDay - currentDay;
            for (let i = 0; i < daysToAdvance; i++) {
              const beforeState = store.getState().season;
              store.dispatch(advanceDay());
              const afterState = store.getState().season;
              
              // If we transitioned to a different season, stop
              if (afterState.current !== season) {
                break;
              }
            }
            
            const updatedState = store.getState().season;
            const scheduledEvent = updatedState.scheduledEvents.find(e => e.id === event.id);
            
            // If we reached the event day in the same season, event should be completed
            if (updatedState.current === season && updatedState.day === eventDay) {
              expect(scheduledEvent?.completed).toBe(true);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});