/**
 * HUD Component - Heads-up display showing essential game information
 */

import React from 'react';

import type { DailyWeather } from '../../../shared/types/game-state';

interface HUDProps {
  money: number;
  season: string;
  day: number;
  daysRemaining: number;
  weather: DailyWeather;
}

const HUD: React.FC<HUDProps> = ({ money, season, day, daysRemaining, weather }) => {
  // Get weather emoji based on condition
  const getWeatherEmoji = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'sunny':
      case 'clear':
        return '☀️';
      case 'rainy':
      case 'rain':
        return '🌧️';
      case 'cloudy':
      case 'overcast':
        return '☁️';
      case 'stormy':
        return '⛈️';
      default:
        return '🌤️';
    }
  };

  // Format money with Indian currency
  const formatMoney = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  return (
    <div className="hud-container retro-panel">
      <div className="hud-content retro-font">
        {/* Money */}
        <div className="hud-item">
          <span className="hud-icon">💰</span>
          <span className="hud-label">Money:</span>
          <span className={`hud-value ${money >= 0 ? 'retro-text-green' : 'retro-text-red'}`}>
            {formatMoney(money)}
          </span>
        </div>

        {/* Season and Day */}
        <div className="hud-item">
          <span className="hud-icon">📅</span>
          <span className="hud-label">Season:</span>
          <span className="hud-value retro-text-amber">
            {season} (Day {day}/{120 - daysRemaining + day})
          </span>
        </div>

        {/* Weather */}
        <div className="hud-item">
          <span className="hud-icon">{getWeatherEmoji(weather.conditions)}</span>
          <span className="hud-label">Weather:</span>
          <span className="hud-value retro-text-cyan">
            {weather.conditions} {weather.temperature.max}°C
          </span>
        </div>
      </div>
    </div>
  );
};

export default HUD;