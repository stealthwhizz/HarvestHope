/**
 * Redux slice for season and time management
 * Implements seasonal cycle logic, day progression, and event scheduling
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { SeasonData, SeasonType } from '../../../../shared/types/game-state';
import { 
  DAYS_PER_SEASON, 
  SEASON_CYCLE, 
  getNextSeason, 
  getPreviousSeason 
} from '../../utils/seasonValidation';

// Extended season data interface for time management
export interface ExtendedSeasonData extends SeasonData {
  scheduledEvents: ScheduledEvent[];
  seasonTransitionData?: SeasonTransitionData;
}

export interface ScheduledEvent {
  id: string;
  type: 'crop_growth' | 'weather_change' | 'market_update' | 'npc_event' | 'government_scheme';
  scheduledDay: number;
  scheduledSeason: SeasonType;
  data: any;
  recurring?: boolean;
  completed: boolean;
}

export interface SeasonTransitionData {
  isTransitioning: boolean;
  previousSeason: SeasonType;
  transitionEffects: {
    cropImpacts: string[];
    weatherChanges: string[];
    marketShifts: string[];
  };
}

const initialState: ExtendedSeasonData = {
  current: 'Kharif',
  day: 1,
  daysRemaining: DAYS_PER_SEASON - 1, // 119 days remaining when on day 1
  nextSeason: 'Rabi',
  scheduledEvents: [],
  seasonTransitionData: undefined,
};

const seasonSlice = createSlice({
  name: 'season',
  initialState,
  reducers: {
    setSeasonData: (_state, action: PayloadAction<ExtendedSeasonData>) => {
      return action.payload;
    },
    
    advanceDay: (state) => {
      // First advance the day
      state.day += 1;
      state.daysRemaining -= 1;
      
      // Check if season should advance (when we've completed all 120 days)
      if (state.day > DAYS_PER_SEASON) {
        // Prepare season transition
        state.seasonTransitionData = {
          isTransitioning: true,
          previousSeason: state.current,
          transitionEffects: {
            cropImpacts: [],
            weatherChanges: [],
            marketShifts: [],
          },
        };
        
        // Advance to next season
        state.current = state.nextSeason;
        state.day = 1;
        state.daysRemaining = DAYS_PER_SEASON - 1;
        state.nextSeason = getNextSeason(state.current);
        
        // Clean up completed non-recurring events
        state.scheduledEvents = state.scheduledEvents.filter(
          event => !event.completed || event.recurring
        );
        
        // Reset recurring events
        state.scheduledEvents.forEach(event => {
          if (event.recurring && event.completed) {
            event.completed = false;
          }
        });
      } else {
        // Process scheduled events for the new current day AFTER advancing
        const eventsToProcess = state.scheduledEvents.filter(
          event => event.scheduledDay === state.day && 
                   event.scheduledSeason === state.current && 
                   !event.completed
        );
        
        // Mark events as completed (actual processing would be handled by middleware)
        eventsToProcess.forEach(event => {
          const eventIndex = state.scheduledEvents.findIndex(e => e.id === event.id);
          if (eventIndex !== -1) {
            state.scheduledEvents[eventIndex].completed = true;
          }
        });
      }
    },
    
    setSeason: (state, action: PayloadAction<{ season: SeasonType; day?: number }>) => {
      const { season, day = 1 } = action.payload;
      
      // Validate day is within season bounds
      const validDay = Math.max(1, Math.min(DAYS_PER_SEASON, day));
      
      state.current = season;
      state.day = validDay;
      state.daysRemaining = DAYS_PER_SEASON - validDay;
      state.nextSeason = getNextSeason(season);
      
      // Clear transition data when manually setting season
      state.seasonTransitionData = undefined;
    },
    
    scheduleEvent: (state, action: PayloadAction<Omit<ScheduledEvent, 'completed'>>) => {
      const event: ScheduledEvent = {
        ...action.payload,
        completed: false,
      };
      
      // Validate scheduled day is within season bounds
      if (event.scheduledDay < 1 || event.scheduledDay > DAYS_PER_SEASON) {
        return; // Invalid day, don't schedule
      }
      
      // Remove existing event with same ID if it exists
      state.scheduledEvents = state.scheduledEvents.filter(e => e.id !== event.id);
      
      // Add new event
      state.scheduledEvents.push(event);
      
      // Sort events by scheduled day for efficient processing
      state.scheduledEvents.sort((a, b) => {
        if (a.scheduledSeason !== b.scheduledSeason) {
          return SEASON_CYCLE.indexOf(a.scheduledSeason) - SEASON_CYCLE.indexOf(b.scheduledSeason);
        }
        return a.scheduledDay - b.scheduledDay;
      });
    },
    
    cancelEvent: (state, action: PayloadAction<string>) => {
      state.scheduledEvents = state.scheduledEvents.filter(
        event => event.id !== action.payload
      );
    },
    
    completeSeasonTransition: (state) => {
      state.seasonTransitionData = undefined;
    },
    
    addTransitionEffect: (state, action: PayloadAction<{
      category: 'cropImpacts' | 'weatherChanges' | 'marketShifts';
      effect: string;
    }>) => {
      if (state.seasonTransitionData) {
        state.seasonTransitionData.transitionEffects[action.payload.category].push(
          action.payload.effect
        );
      }
    },
    
    // Utility actions for season validation and information
    validateSeasonCycle: (state) => {
      // Ensure season cycle integrity
      const expectedNext = getNextSeason(state.current);
      if (state.nextSeason !== expectedNext) {
        state.nextSeason = expectedNext;
      }
      
      // Ensure day bounds
      if (state.day < 1) {
        state.day = 1;
        state.daysRemaining = DAYS_PER_SEASON - 1;
      } else if (state.day > DAYS_PER_SEASON) {
        state.day = DAYS_PER_SEASON;
        state.daysRemaining = 0;
      } else {
        state.daysRemaining = DAYS_PER_SEASON - state.day;
      }
    },
    
    resetSeason: () => initialState,
  },
});

export const {
  setSeasonData,
  advanceDay,
  setSeason,
  scheduleEvent,
  cancelEvent,
  completeSeasonTransition,
  addTransitionEffect,
  validateSeasonCycle,
  resetSeason,
} = seasonSlice.actions;

// Selectors for season information
export const selectCurrentSeason = (state: { season: ExtendedSeasonData }) => state.season.current;
export const selectCurrentDay = (state: { season: ExtendedSeasonData }) => state.season.day;
export const selectDaysRemaining = (state: { season: ExtendedSeasonData }) => state.season.daysRemaining;
export const selectNextSeason = (state: { season: ExtendedSeasonData }) => state.season.nextSeason;
export const selectScheduledEvents = (state: { season: ExtendedSeasonData }) => state.season.scheduledEvents;
export const selectSeasonTransition = (state: { season: ExtendedSeasonData }) => state.season.seasonTransitionData;

// Utility functions
export const getSeasonInfo = (season: SeasonType) => {
  const seasonInfo = {
    'Kharif': {
      name: 'Kharif',
      description: 'Monsoon season (June-October)',
      crops: ['Rice', 'Cotton', 'Sugarcane', 'Maize'],
      characteristics: ['Heavy rainfall', 'High humidity', 'Warm temperatures'],
    },
    'Rabi': {
      name: 'Rabi',
      description: 'Winter season (November-March)',
      crops: ['Wheat', 'Barley', 'Peas', 'Gram'],
      characteristics: ['Cool temperatures', 'Low rainfall', 'Clear skies'],
    },
    'Zaid': {
      name: 'Zaid',
      description: 'Summer season (April-June)',
      crops: ['Watermelon', 'Cucumber', 'Fodder crops'],
      characteristics: ['Hot temperatures', 'Irrigation dependent', 'Limited crops'],
    },
    'Off-season': {
      name: 'Off-season',
      description: 'Preparation and planning period',
      crops: ['Soil preparation', 'Equipment maintenance'],
      characteristics: ['Planning phase', 'Market analysis', 'Preparation activities'],
    },
  };
  
  return seasonInfo[season];
};

export const isValidSeasonTransition = (from: SeasonType, to: SeasonType): boolean => {
  const expectedNext = getNextSeason(from);
  return expectedNext === to;
};

export const calculateSeasonProgress = (day: number): number => {
  return Math.min(100, Math.max(0, (day / DAYS_PER_SEASON) * 100));
};

export const seasonReducer = seasonSlice.reducer;