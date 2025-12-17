/**
 * Redux slice for event system management
 * Handles active events, event history, and educational progress
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { 
  EventData, 
  GameEvent, 
  EventResolution, 
  ResolvedConsequences,
  GameState 
} from '../../../../shared/types/game-state';
import { eventService } from '../../services/eventService';

// Async thunks for event operations
export const generateEvent = createAsyncThunk(
  'events/generate',
  async (gameState: Partial<GameState>) => {
    const event = await eventService.generateEvent({ gameState });
    return event;
  }
);

export const resolveEvent = createAsyncThunk(
  'events/resolve',
  async ({ event, choiceId, gameState }: { 
    event: GameEvent; 
    choiceId: string; 
    gameState: Partial<GameState> 
  }) => {
    const consequences = await eventService.resolveEvent({ event, choiceId, gameState });
    return { eventId: event.id, choiceId, consequences };
  }
);

const initialState: EventData = {
  activeEvents: [],
  eventHistory: [],
  pendingConsequences: [],
  educationalProgress: {},
};

const eventSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    setEventData: (_state, action: PayloadAction<EventData>) => {
      return action.payload;
    },

    addEvent: (state, action: PayloadAction<GameEvent>) => {
      // Check if event already exists
      const existingIndex = state.activeEvents.findIndex(e => e.id === action.payload.id);
      if (existingIndex === -1) {
        state.activeEvents.push(action.payload);
      }
    },

    removeEvent: (state, action: PayloadAction<string>) => {
      state.activeEvents = state.activeEvents.filter(event => event.id !== action.payload);
    },

    addEventResolution: (state, action: PayloadAction<EventResolution>) => {
      state.eventHistory.push(action.payload);
      
      // Remove the resolved event from active events
      state.activeEvents = state.activeEvents.filter(
        event => event.id !== action.payload.eventId
      );
    },

    addPendingConsequences: (state, action: PayloadAction<ResolvedConsequences>) => {
      state.pendingConsequences.push(action.payload);
    },

    processPendingConsequences: (state) => {
      // Mark consequences as processed (they should be applied to game state by middleware)
      state.pendingConsequences = [];
    },

    updateEducationalProgress: (state, action: PayloadAction<{
      topic: string;
      lesson: string;
      eventsExperienced?: number;
    }>) => {
      const { topic, lesson, eventsExperienced = 1 } = action.payload;
      
      if (!state.educationalProgress[topic]) {
        state.educationalProgress[topic] = {
          eventsExperienced: 0,
          lessonsLearned: [],
          masteryLevel: 0,
        };
      }

      const progress = state.educationalProgress[topic];
      progress.eventsExperienced += eventsExperienced;
      
      if (!progress.lessonsLearned.includes(lesson)) {
        progress.lessonsLearned.push(lesson);
      }

      // Calculate mastery level
      progress.masteryLevel = Math.min(100, 
        progress.eventsExperienced * 10 + progress.lessonsLearned.length * 5
      );
    },

    expireOldEvents: (state) => {
      const now = new Date();
      state.activeEvents = state.activeEvents.filter(event => {
        const expiresAt = new Date(event.expires_at);
        return expiresAt > now;
      });
    },

    clearEventHistory: (state) => {
      state.eventHistory = [];
      state.educationalProgress = {};
    },

    resetEvents: () => initialState,
  },

  extraReducers: (builder) => {
    builder
      .addCase(generateEvent.fulfilled, (state, action) => {
        // Add the generated event to active events
        const event = action.payload;
        const existingIndex = state.activeEvents.findIndex(e => e.id === event.id);
        if (existingIndex === -1) {
          state.activeEvents.push(event);
        }
      })
      .addCase(generateEvent.rejected, (state, action) => {
        console.error('Failed to generate event:', action.error.message);
      })
      .addCase(resolveEvent.fulfilled, (state, action) => {
        const { eventId, choiceId, consequences } = action.payload;
        
        // Create resolution record
        const resolution: EventResolution = {
          eventId,
          choiceId,
          timestamp: new Date().toISOString(),
          consequences,
        };
        
        // Add to history
        state.eventHistory.push(resolution);
        
        // Remove from active events
        state.activeEvents = state.activeEvents.filter(event => event.id !== eventId);
        
        // Add consequences to pending list
        state.pendingConsequences.push(consequences);
        
        // Update educational progress
        const topic = consequences.educational_impact.topic;
        const lesson = consequences.educational_impact.lesson_learned;
        
        if (!state.educationalProgress[topic]) {
          state.educationalProgress[topic] = {
            eventsExperienced: 0,
            lessonsLearned: [],
            masteryLevel: 0,
          };
        }

        const progress = state.educationalProgress[topic];
        progress.eventsExperienced += 1;
        
        if (!progress.lessonsLearned.includes(lesson)) {
          progress.lessonsLearned.push(lesson);
        }

        progress.masteryLevel = Math.min(100, 
          progress.eventsExperienced * 10 + progress.lessonsLearned.length * 5
        );
      })
      .addCase(resolveEvent.rejected, (state, action) => {
        console.error('Failed to resolve event:', action.error.message);
      });
  },
});

export const {
  setEventData,
  addEvent,
  removeEvent,
  addEventResolution,
  addPendingConsequences,
  processPendingConsequences,
  updateEducationalProgress,
  expireOldEvents,
  clearEventHistory,
  resetEvents,
} = eventSlice.actions;

// Selectors
export const selectActiveEvents = (state: { events: EventData }) => state.events.activeEvents;
export const selectEventHistory = (state: { events: EventData }) => state.events.eventHistory;
export const selectPendingConsequences = (state: { events: EventData }) => state.events.pendingConsequences;
export const selectEducationalProgress = (state: { events: EventData }) => state.events.educationalProgress;

export const selectEventsByCategory = (category: string) => (state: { events: EventData }) =>
  state.events.activeEvents.filter(event => event.category === category);

export const selectEventsBySeverity = (severity: string) => (state: { events: EventData }) =>
  state.events.activeEvents.filter(event => event.severity === severity);

export const selectExtremeWeatherEvents = (state: { events: EventData }) =>
  state.events.activeEvents.filter(event => 
    event.category === 'extreme_weather' || 
    event.type.includes('severe') || 
    event.type.includes('emergency')
  );

export const selectCrisisEvents = (state: { events: EventData }) =>
  state.events.activeEvents.filter(event => 
    event.severity === 'critical' || 
    event.category === 'emergency_crisis'
  );

export const selectPestEvents = (state: { events: EventData }) =>
  state.events.activeEvents.filter(event => event.category === 'pest_crisis');

export const selectMasteryLevel = (topic: string) => (state: { events: EventData }) =>
  state.events.educationalProgress[topic]?.masteryLevel || 0;

export const selectLessonsLearned = (topic: string) => (state: { events: EventData }) =>
  state.events.educationalProgress[topic]?.lessonsLearned || [];

export const selectTotalEventsExperienced = (state: { events: EventData }) =>
  Object.values(state.events.educationalProgress).reduce(
    (total, progress) => total + progress.eventsExperienced, 0
  );

export const selectEducationalTopics = (state: { events: EventData }) =>
  Object.keys(state.events.educationalProgress);

export const eventReducer = eventSlice.reducer;