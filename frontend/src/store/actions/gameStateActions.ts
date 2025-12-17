/**
 * Async action creators for game state management
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import type { GameState } from '../../../../shared/types/game-state';
import { loadGameState, saveGameState, deleteGameState } from '../services/persistenceService';
import { setPlayer } from '../slices/playerSlice';
import { setFarmData } from '../slices/farmSlice';
import { setEconomicsData } from '../slices/economicsSlice';
import { setSeasonData } from '../slices/seasonSlice';
import { setWeatherData } from '../slices/weatherSlice';
import { setNPCs } from '../slices/npcSlice';
import { setStats } from '../slices/statsSlice';
import { setProgress } from '../slices/progressSlice';

/**
 * Load complete game state from persistence layer
 */
export const loadGame = createAsyncThunk(
  'gameState/load',
  async (playerId: string, { dispatch, rejectWithValue }) => {
    try {
      const result = await loadGameState(playerId);
      
      if (!result.success || !result.gameState) {
        return rejectWithValue(result.message);
      }

      // Dispatch actions to update all slices
      dispatch(setPlayer(result.gameState.player));
      dispatch(setFarmData(result.gameState.farm));
      dispatch(setEconomicsData(result.gameState.economics));
      dispatch(setSeasonData(result.gameState.season));
      dispatch(setWeatherData(result.gameState.weather));
      dispatch(setNPCs(result.gameState.npcs));
      dispatch(setStats(result.gameState.stats));
      dispatch(setProgress(result.gameState.progress));

      return {
        message: result.message,
        lastSaved: result.lastSaved,
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load game');
    }
  }
);

/**
 * Save complete game state to persistence layer
 */
export const saveGame = createAsyncThunk(
  'gameState/save',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any; // Type assertion for RootState
      
      const gameState: GameState = {
        player: state.player,
        farm: state.farm,
        economics: state.economics,
        season: state.season,
        weather: state.weather,
        npcs: state.npcs,
        stats: state.stats,
        progress: state.progress,
      };

      const result = await saveGameState(gameState);
      
      if (!result.success) {
        return rejectWithValue(result.message);
      }

      return {
        message: result.message,
        timestamp: result.timestamp,
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to save game');
    }
  }
);

/**
 * Delete saved game state
 */
export const deleteGame = createAsyncThunk(
  'gameState/delete',
  async (playerId: string, { rejectWithValue }) => {
    try {
      const result = await deleteGameState(playerId);
      
      if (!result.success) {
        return rejectWithValue(result.message);
      }

      return result.message;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete game');
    }
  }
);

/**
 * Reset all game state to initial values
 */
export const resetGame = createAsyncThunk(
  'gameState/reset',
  async (_, { dispatch }) => {
    // Import reset actions from all slices
    const { resetPlayer } = await import('../slices/playerSlice');
    const { resetFarm } = await import('../slices/farmSlice');
    const { resetEconomics } = await import('../slices/economicsSlice');
    const { resetSeason } = await import('../slices/seasonSlice');
    const { resetWeather } = await import('../slices/weatherSlice');
    const { resetNPCs } = await import('../slices/npcSlice');
    const { resetStats } = await import('../slices/statsSlice');
    const { resetProgress } = await import('../slices/progressSlice');

    // Dispatch all reset actions
    dispatch(resetPlayer());
    dispatch(resetFarm());
    dispatch(resetEconomics());
    dispatch(resetSeason());
    dispatch(resetWeather());
    dispatch(resetNPCs());
    dispatch(resetStats());
    dispatch(resetProgress());

    return 'Game state reset successfully';
  }
);