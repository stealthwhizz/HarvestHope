/**
 * Redux store configuration for Harvest Hope game state management
 */

import { configureStore } from '@reduxjs/toolkit';
import { farmReducer } from './slices/farmSlice';
import { economicsReducer } from './slices/economicsSlice';
import { weatherReducer } from './slices/weatherSlice';
import { npcReducer } from './slices/npcSlice';
import { playerReducer } from './slices/playerSlice';
import { seasonReducer } from './slices/seasonSlice';
import { statsReducer } from './slices/statsSlice';
import { progressReducer } from './slices/progressSlice';
import { marketReducer } from './slices/marketSlice';
import { eventReducer } from './slices/eventSlice';
import { persistenceMiddleware } from './middleware/persistenceMiddleware';

const rootReducer = {
  player: playerReducer,
  farm: farmReducer,
  economics: economicsReducer,
  season: seasonReducer,
  weather: weatherReducer,
  npcs: npcReducer,
  events: eventReducer,
  stats: statsReducer,
  progress: progressReducer,
  market: marketReducer,
};

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for serializable check
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }).concat(persistenceMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;