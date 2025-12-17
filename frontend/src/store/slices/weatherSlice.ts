/**
 * Redux slice for weather data management
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { WeatherData, DailyWeather, MonsoonPrediction, WeatherEvent } from '../../../../shared/types/game-state';
import { 
  generateWeatherPrediction, 
  generateDailyWeather, 
  calculateWeatherImpact,
  updateWeatherForSeason 
} from '../actions/weatherActions';

const initialState: WeatherData = {
  current: {
    date: new Date().toISOString().split('T')[0],
    temperature: { min: 20, max: 35 },
    humidity: 60,
    rainfall: 0,
    windSpeed: 10,
    conditions: 'clear',
  },
  forecast: [],
  monsoonPrediction: {
    strength: 'moderate',
    arrivalDate: '',
    totalRainfall: 800,
    droughtRisk: 0.2,
    floodRisk: 0.1,
    confidence: 0.7,
  },
  extremeEvents: [],
};

const weatherSlice = createSlice({
  name: 'weather',
  initialState,
  reducers: {
    setWeatherData: (_state, action: PayloadAction<WeatherData>) => {
      return action.payload;
    },
    setCurrentWeather: (state, action: PayloadAction<DailyWeather>) => {
      state.current = action.payload;
    },
    setForecast: (state, action: PayloadAction<DailyWeather[]>) => {
      state.forecast = action.payload;
    },
    addForecastDay: (state, action: PayloadAction<DailyWeather>) => {
      state.forecast.push(action.payload);
    },
    setMonsoonPrediction: (state, action: PayloadAction<MonsoonPrediction>) => {
      state.monsoonPrediction = action.payload;
    },
    addWeatherEvent: (state, action: PayloadAction<WeatherEvent>) => {
      state.extremeEvents.push(action.payload);
    },
    removeWeatherEvent: (state, action: PayloadAction<string>) => {
      state.extremeEvents = state.extremeEvents.filter(event => event.id !== action.payload);
    },
    updateWeatherEvent: (state, action: PayloadAction<{ id: string; updates: Partial<WeatherEvent> }>) => {
      const eventIndex = state.extremeEvents.findIndex(event => event.id === action.payload.id);
      if (eventIndex !== -1) {
        state.extremeEvents[eventIndex] = { ...state.extremeEvents[eventIndex], ...action.payload.updates };
      }
    },
    resetWeather: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Generate weather prediction
      .addCase(generateWeatherPrediction.fulfilled, (state, action) => {
        return action.payload;
      })
      .addCase(generateWeatherPrediction.rejected, (state, action) => {
        console.error('Failed to generate weather prediction:', action.error);
      })
      
      // Generate daily weather
      .addCase(generateDailyWeather.fulfilled, (state, action) => {
        state.current = action.payload;
        // Add to forecast if not already present
        const existingIndex = state.forecast.findIndex(day => day.date === action.payload.date);
        if (existingIndex === -1) {
          state.forecast.push(action.payload);
        } else {
          state.forecast[existingIndex] = action.payload;
        }
      })
      .addCase(generateDailyWeather.rejected, (state, action) => {
        console.error('Failed to generate daily weather:', action.error);
      })
      
      // Calculate weather impact
      .addCase(calculateWeatherImpact.fulfilled, (state, action) => {
        // Store impact data for reference (could be used for UI feedback)
        console.log('Weather impact calculated:', action.payload);
      })
      .addCase(calculateWeatherImpact.rejected, (state, action) => {
        console.error('Failed to calculate weather impact:', action.error);
      })
      
      // Update weather for season
      .addCase(updateWeatherForSeason.fulfilled, (state, action) => {
        return action.payload;
      })
      .addCase(updateWeatherForSeason.rejected, (state, action) => {
        console.error('Failed to update weather for season:', action.error);
      });
  },
});

export const {
  setWeatherData,
  setCurrentWeather,
  setForecast,
  addForecastDay,
  setMonsoonPrediction,
  addWeatherEvent,
  removeWeatherEvent,
  updateWeatherEvent,
  resetWeather,
} = weatherSlice.actions;

export const weatherReducer = weatherSlice.reducer;