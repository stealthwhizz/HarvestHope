/**
 * Weather Actions
 * Redux actions for weather system management
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import type { SeasonType, DailyWeather, WeatherData } from '../../../../shared/types/game-state';
import { weatherService } from '../../services/weatherService';
import type { RootState } from '../index';

/**
 * Generate new weather prediction for the current season
 */
export const generateWeatherPrediction = createAsyncThunk(
  'weather/generatePrediction',
  async (params: { season: SeasonType; currentConditions?: DailyWeather }) => {
    const weatherData = await weatherService.updateGameWeather(params.season, params.currentConditions);
    return weatherData;
  }
);

/**
 * Generate daily weather for progression
 */
export const generateDailyWeather = createAsyncThunk(
  'weather/generateDaily',
  async (params: { season: SeasonType; day: number }, { getState }) => {
    const state = getState() as RootState;
    const monsoonPrediction = state.weather.monsoonPrediction;
    
    const dailyWeather = await weatherService.generateDailyWeather(
      params.season,
      params.day,
      monsoonPrediction
    );
    
    return dailyWeather;
  }
);

/**
 * Calculate weather impact on crops
 */
export const calculateWeatherImpact = createAsyncThunk(
  'weather/calculateImpact',
  async (params: { 
    weather: DailyWeather; 
    cropType: string; 
    growthStage: string;
  }) => {
    const impactData = await weatherService.calculateWeatherImpact(
      params.weather,
      params.cropType,
      params.growthStage
    );
    
    return {
      cropType: params.cropType,
      growthStage: params.growthStage,
      ...impactData
    };
  }
);

/**
 * Update weather for season transition
 */
export const updateWeatherForSeason = createAsyncThunk(
  'weather/updateForSeason',
  async (season: SeasonType) => {
    const weatherData = await weatherService.updateGameWeather(season);
    return weatherData;
  }
);