/**
 * Main Game HUD Component
 * Displays essential game information: money, day, season, weather, and quick actions
 */

import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store';
import { advanceDay } from '../store/slices/seasonSlice';
import { updateLastPlayed } from '../store/slices/playerSlice';
import SaveGameManager from './SaveGameManager';
import type { GameState } from '../../../shared/types/game-state';

interface GameHUDProps {
  className?: string;
  onOpenFinancialDashboard?: () => void;
  onOpenSchemeEncyclopedia?: () => void;
  onOpenEventDialog?: () => void;
  onLoadGame?: (gameState: GameState, saveSlot: string) => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  className = '',
  onOpenFinancialDashboard,
  onOpenSchemeEncyclopedia,
  onOpenEventDialog,
  onLoadGame
}) => {
  const dispatch = useDispatch();
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showSaveManager, setShowSaveManager] = useState(false);
  
  const gameState = useSelector((state: RootState) => ({
    player: state.player,
    farm: state.farm,
    economics: state.economics,
    season: state.season,
    weather: state.weather,
    events: state.events,
    npcs: state.npcs,
    stats: state.stats,
    progress: state.progress
  }));

  const handleAdvanceDay = () => {
    dispatch(advanceDay());
    dispatch(updateLastPlayed());
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getSeasonColor = (season: string) => {
    switch (season) {
      case 'Kharif': return 'bg-green-500 text-white';
      case 'Rabi': return 'bg-blue-500 text-white';
      case 'Zaid': return 'bg-yellow-500 text-black';
      case 'Off-season': return 'bg-gray-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

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

  const getFinancialHealthColor = (amount: number) => {
    if (amount < 10000) return 'text-red-600';
    if (amount < 50000) return 'text-yellow-600';
    return 'text-green-600';
  };

  const hasActiveEvents = gameState.events.activeEvents.length > 0;
  const hasUnreadNPCs = gameState.npcs.some(npc => 
    npc.lastInteraction && new Date(npc.lastInteraction) < new Date(Date.now() - 24 * 60 * 60 * 1000)
  );

  return (
    <div className={`bg-gradient-to-r from-green-800 to-green-600 text-white shadow-lg ${className}`}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left Section - Player & Farm Info */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🚜</span>
              <div>
                <h1 className="text-lg font-bold">Harvest Hope</h1>
                <p className="text-xs text-green-200">
                  {gameState.player.name || 'Farmer'}
                </p>
              </div>
            </div>

            {/* Money Display */}
            <div className="bg-white bg-opacity-20 rounded-lg px-4 py-2">
              <div className="flex items-center space-x-2">
                <span className="text-xl">💰</span>
                <div>
                  <p className="text-xs text-green-200">Bank Balance</p>
                  <p className={`text-lg font-bold ${getFinancialHealthColor(gameState.economics.bankAccount)}`}>
                    {formatCurrency(gameState.economics.bankAccount)}
                  </p>
                </div>
              </div>
            </div>

            {/* Credit Score */}
            <div className="bg-white bg-opacity-20 rounded-lg px-3 py-2">
              <div className="flex items-center space-x-2">
                <span className="text-lg">📊</span>
                <div>
                  <p className="text-xs text-green-200">Credit Score</p>
                  <p className="text-sm font-semibold">{gameState.economics.creditScore}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Center Section - Time & Season */}
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className={`px-4 py-2 rounded-full text-sm font-bold ${getSeasonColor(gameState.season.current)}`}>
                {gameState.season.current} Season
              </div>
              <p className="text-xs text-green-200 mt-1">
                Day {gameState.season.day} of 120
              </p>
            </div>

            <div className="bg-white bg-opacity-20 rounded-lg px-4 py-2">
              <div className="flex items-center space-x-2">
                <span className="text-xl">{getWeatherIcon(gameState.weather.current.conditions)}</span>
                <div>
                  <p className="text-xs text-green-200">Today's Weather</p>
                  <p className="text-sm font-semibold capitalize">
                    {gameState.weather.current.conditions.replace('_', ' ')}
                  </p>
                  <p className="text-xs text-green-200">
                    {gameState.weather.current.temperature.min}° - {gameState.weather.current.temperature.max}°C
                  </p>
                </div>
              </div>
            </div>

            {/* Day Advance Button */}
            <button
              onClick={handleAdvanceDay}
              className="bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              Next Day ⏭️
            </button>
          </div>

          {/* Right Section - Quick Actions & Notifications */}
          <div className="flex items-center space-x-3">
            {/* Notification Indicators */}
            <div className="flex space-x-2">
              {hasActiveEvents && (
                <button
                  onClick={onOpenEventDialog}
                  className="relative bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-colors"
                  title="Active Events"
                >
                  <span className="text-lg">⚠️</span>
                  <span className="absolute -top-1 -right-1 bg-red-700 text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {gameState.events.activeEvents.length}
                  </span>
                </button>
              )}

              {hasUnreadNPCs && (
                <button
                  className="relative bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full transition-colors"
                  title="NPC Interactions Available"
                >
                  <span className="text-lg">👥</span>
                  <span className="absolute -top-1 -right-1 bg-blue-700 text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    !
                  </span>
                </button>
              )}

              {gameState.economics.loans.length > 0 && (
                <button
                  onClick={onOpenFinancialDashboard}
                  className="relative bg-orange-500 hover:bg-orange-600 text-white p-2 rounded-full transition-colors"
                  title="Active Loans"
                >
                  <span className="text-lg">🏦</span>
                  <span className="absolute -top-1 -right-1 bg-orange-700 text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {gameState.economics.loans.length}
                  </span>
                </button>
              )}
            </div>

            {/* Quick Actions Menu */}
            <div className="relative">
              <button
                onClick={() => setShowQuickActions(!showQuickActions)}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-lg transition-colors"
                title="Quick Actions"
              >
                <span className="text-xl">⚙️</span>
              </button>

              {showQuickActions && (
                <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg py-2 min-w-48 z-50">
                  <button
                    onClick={() => {
                      onOpenFinancialDashboard?.();
                      setShowQuickActions(false);
                    }}
                    className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <span>💰</span>
                    <span>Financial Dashboard</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      onOpenSchemeEncyclopedia?.();
                      setShowQuickActions(false);
                    }}
                    className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <span>🏛️</span>
                    <span>Government Schemes</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowSaveManager(true);
                      setShowQuickActions(false);
                    }}
                    className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <span>💾</span>
                    <span>Save Game Manager</span>
                  </button>

                  <div className="border-t border-gray-200 my-1"></div>
                  
                  <div className="px-4 py-2 text-xs text-gray-500">
                    <p>Days Remaining: {gameState.season.daysRemaining}</p>
                    <p>Next Season: {gameState.season.nextSeason}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Status Bar */}
        <div className="mt-2 pt-2 border-t border-green-500 border-opacity-30">
          <div className="flex justify-between items-center text-xs text-green-200">
            <div className="flex space-x-4">
              <span>Crops: {gameState.farm.crops.length}</span>
              <span>Land: {gameState.farm.landArea} hectares</span>
              <span>Soil Quality: {Math.round(gameState.farm.soilQuality * 100)}%</span>
            </div>
            
            <div className="flex space-x-4">
              {gameState.weather.monsoonPrediction.strength && (
                <span>
                  Monsoon: {gameState.weather.monsoonPrediction.strength} 
                  ({Math.round(gameState.weather.monsoonPrediction.confidence * 100)}% confidence)
                </span>
              )}
              <span>Last Played: {new Date(gameState.player.lastPlayed).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Save Game Manager Modal */}
      <SaveGameManager
        playerId={gameState.player.id}
        currentGameState={gameState as GameState}
        onLoadGame={(loadedGameState, saveSlot) => {
          onLoadGame?.(loadedGameState, saveSlot);
          setShowSaveManager(false);
        }}
        onClose={() => setShowSaveManager(false)}
        isOpen={showSaveManager}
      />
    </div>
  );
};

export default GameHUD;