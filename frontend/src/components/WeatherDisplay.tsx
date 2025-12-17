/**
 * Weather Display Component
 * Shows current weather, forecast, and monsoon predictions
 */

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store';
import { generateWeatherPrediction, generateDailyWeather } from '../store/actions/weatherActions';
import type { SeasonType } from '../../../shared/types/game-state';

interface WeatherDisplayProps {
  className?: string;
  showForecast?: boolean;
  showMonsoonPrediction?: boolean;
}

export const WeatherDisplay: React.FC<WeatherDisplayProps> = ({
  className = '',
  showForecast = true,
  showMonsoonPrediction = true
}) => {
  const dispatch = useDispatch();
  const { weather, season } = useSelector((state: RootState) => ({
    weather: state.weather,
    season: state.season
  }));

  useEffect(() => {
    // Generate initial weather prediction if not available
    if (!weather.monsoonPrediction.arrivalDate) {
      dispatch(generateWeatherPrediction({ 
        season: season.current,
        currentConditions: weather.current 
      }) as any);
    }
  }, [dispatch, season.current, weather.monsoonPrediction.arrivalDate, weather.current]);

  const getWeatherIcon = (conditions: string): string => {
    switch (conditions) {
      case 'heavy_rain': return '🌧️';
      case 'rain': return '🌦️';
      case 'light_rain': return '🌤️';
      case 'cloudy': return '☁️';
      case 'hot': return '🌡️';
      case 'clear':
      default: return '☀️';
    }
  };

  const getMonsoonStrengthColor = (strength: string): string => {
    switch (strength) {
      case 'weak': return 'text-yellow-600';
      case 'moderate': return 'text-blue-600';
      case 'strong': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const getRiskColor = (risk: number): string => {
    if (risk > 0.4) return 'text-red-600';
    if (risk > 0.2) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Weather Information</h3>
      
      {/* Current Weather */}
      <div className="mb-6">
        <h4 className="text-md font-medium mb-2 text-gray-700">Current Weather</h4>
        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getWeatherIcon(weather.current.conditions)}</span>
            <div>
              <p className="font-medium text-gray-800 capitalize">
                {weather.current.conditions.replace('_', ' ')}
              </p>
              <p className="text-sm text-gray-600">{weather.current.date}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-gray-800">
              {weather.current.temperature.min}° - {weather.current.temperature.max}°C
            </p>
            <p className="text-sm text-gray-600">
              💧 {weather.current.rainfall}mm | 💨 {weather.current.windSpeed}km/h
            </p>
            <p className="text-sm text-gray-600">
              Humidity: {weather.current.humidity}%
            </p>
          </div>
        </div>
      </div>

      {/* Monsoon Prediction */}
      {showMonsoonPrediction && (
        <div className="mb-6">
          <h4 className="text-md font-medium mb-2 text-gray-700">Monsoon Prediction</h4>
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Strength</p>
                <p className={`font-semibold capitalize ${getMonsoonStrengthColor(weather.monsoonPrediction.strength)}`}>
                  {weather.monsoonPrediction.strength}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Expected Rainfall</p>
                <p className="font-semibold text-gray-800">
                  {weather.monsoonPrediction.totalRainfall}mm
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Drought Risk</p>
                <p className={`font-semibold ${getRiskColor(weather.monsoonPrediction.droughtRisk)}`}>
                  {Math.round(weather.monsoonPrediction.droughtRisk * 100)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Flood Risk</p>
                <p className={`font-semibold ${getRiskColor(weather.monsoonPrediction.floodRisk)}`}>
                  {Math.round(weather.monsoonPrediction.floodRisk * 100)}%
                </p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="text-sm text-gray-600">
                Confidence: {Math.round(weather.monsoonPrediction.confidence * 100)}%
              </p>
              {weather.monsoonPrediction.arrivalDate && (
                <p className="text-sm text-gray-600">
                  Expected Arrival: {new Date(weather.monsoonPrediction.arrivalDate).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7-Day Forecast */}
      {showForecast && weather.forecast.length > 0 && (
        <div className="mb-4">
          <h4 className="text-md font-medium mb-2 text-gray-700">7-Day Forecast</h4>
          <div className="space-y-2">
            {weather.forecast.slice(0, 7).map((day, index) => (
              <div key={day.date} className="flex items-center justify-between bg-gray-50 rounded p-2">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{getWeatherIcon(day.conditions)}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {index === 0 ? 'Today' : new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </p>
                    <p className="text-xs text-gray-600 capitalize">
                      {day.conditions.replace('_', ' ')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-800">
                    {day.temperature.min}° - {day.temperature.max}°C
                  </p>
                  <p className="text-xs text-gray-600">
                    💧 {day.rainfall}mm
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Extreme Weather Events */}
      {weather.extremeEvents.length > 0 && (
        <div className="mb-4">
          <h4 className="text-md font-medium mb-2 text-gray-700">Weather Alerts</h4>
          <div className="space-y-2">
            {weather.extremeEvents.map((event) => (
              <div key={event.id} className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-red-800 capitalize">
                      {event.type} Alert
                    </p>
                    <p className="text-sm text-red-600">
                      Severity: {Math.round(event.severity * 100)}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-red-600">
                      {new Date(event.startDate).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-red-500">
                      Duration: {event.duration} days
                    </p>
                  </div>
                </div>
                <p className="text-sm text-red-700 mt-2">
                  {event.impact}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <button
        onClick={() => dispatch(generateWeatherPrediction({ 
          season: season.current,
          currentConditions: weather.current 
        }) as any)}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Update Weather Forecast
      </button>
    </div>
  );
};