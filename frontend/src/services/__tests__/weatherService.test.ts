/**
 * Weather Service Tests
 */

import { weatherService } from '../weatherService';
import type { SeasonType, DailyWeather } from '../../../../shared/types/game-state';

describe('WeatherService', () => {
  describe('generateWeatherPrediction', () => {
    it('should generate weather prediction for Kharif season', async () => {
      const result = await weatherService.generateWeatherPrediction('Kharif');
      
      expect(result).toBeDefined();
      expect(result.monsoonPrediction).toBeDefined();
      expect(result.forecast).toBeDefined();
      expect(result.extremeEvents).toBeDefined();
      expect(result.forecast.length).toBe(7);
      expect(['weak', 'moderate', 'strong']).toContain(result.monsoonPrediction.strength);
    });

    it('should generate weather prediction for Rabi season', async () => {
      const result = await weatherService.generateWeatherPrediction('Rabi');
      
      expect(result).toBeDefined();
      expect(result.monsoonPrediction).toBeDefined();
      expect(result.forecast).toBeDefined();
      expect(result.extremeEvents).toBeDefined();
    });
  });

  describe('calculateWeatherImpact', () => {
    it('should calculate impact for rice crop in good weather', async () => {
      const weather: DailyWeather = {
        date: '2024-01-01',
        temperature: { min: 25, max: 30 },
        humidity: 70,
        rainfall: 15,
        windSpeed: 10,
        conditions: 'clear'
      };

      const result = await weatherService.calculateWeatherImpact(weather, 'rice', 'vegetative');
      
      expect(result).toBeDefined();
      expect(result.impact).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should provide drought recommendations for dry conditions', async () => {
      const dryWeather: DailyWeather = {
        date: '2024-01-01',
        temperature: { min: 35, max: 45 },
        humidity: 20,
        rainfall: 0,
        windSpeed: 15,
        conditions: 'hot'
      };

      const result = await weatherService.calculateWeatherImpact(dryWeather, 'wheat', 'flowering');
      
      expect(result.recommendations.some(rec => 
        rec.includes('irrigation') || rec.includes('water')
      )).toBe(true);
    });
  });

  describe('generateDailyWeather', () => {
    it('should generate realistic daily weather', async () => {
      const monsoonPrediction = {
        strength: 'moderate' as const,
        arrivalDate: '2024-06-15',
        totalRainfall: 800,
        droughtRisk: 0.2,
        floodRisk: 0.1,
        confidence: 0.8
      };

      const weather = await weatherService.generateDailyWeather('Kharif', 1, monsoonPrediction);
      
      expect(weather).toBeDefined();
      expect(weather.date).toBeDefined();
      expect(weather.temperature).toBeDefined();
      expect(weather.temperature.min).toBeLessThan(weather.temperature.max);
      expect(weather.humidity).toBeGreaterThanOrEqual(0);
      expect(weather.humidity).toBeLessThanOrEqual(100);
      expect(weather.rainfall).toBeGreaterThanOrEqual(0);
      expect(weather.windSpeed).toBeGreaterThan(0);
      expect(weather.conditions).toBeDefined();
    });
  });

  describe('updateGameWeather', () => {
    it('should update complete weather data', async () => {
      const result = await weatherService.updateGameWeather('Kharif');
      
      expect(result).toBeDefined();
      expect(result.current).toBeDefined();
      expect(result.forecast).toBeDefined();
      expect(result.monsoonPrediction).toBeDefined();
      expect(result.extremeEvents).toBeDefined();
    });
  });
});