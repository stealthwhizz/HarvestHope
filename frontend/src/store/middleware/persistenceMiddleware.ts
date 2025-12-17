/**
 * Redux middleware for automatic game state persistence with save slot support
 */

import type { GameState } from '../../../../shared/types/game-state';
import { saveGameState } from '../services/persistenceService';

// Actions that should trigger a save
const SAVE_TRIGGERING_ACTIONS = [
  'farm/updateMoney',
  'farm/advanceDay',
  'farm/plantCrop',
  'farm/harvestCrop',
  'economics/addLoan',
  'economics/repayLoan',
  'season/advanceSeasonDay',
  'npcs/addNPC',
  'npcs/updateRelationship',
  'progress/unlockAchievement',
  'stats/incrementSeasonsCompleted',
];

// Debounce save operations to avoid excessive API calls
let saveTimeout: number | null = null;
const SAVE_DEBOUNCE_MS = 2000; // 2 seconds

// Current save slot (can be set by the application)
let currentSaveSlot = 'slot1';

export const persistenceMiddleware = (store: any) => (next: any) => (action: any) => {
  const result = next(action);
  
  // Handle save slot changes
  if (action.type === 'persistence/setCurrentSaveSlot') {
    currentSaveSlot = action.payload;
    return result;
  }
  
  // Check if this action should trigger a save
  if (action.type && SAVE_TRIGGERING_ACTIONS.some(triggerAction => action.type.includes(triggerAction))) {
    // Clear existing timeout
    if (saveTimeout) {
      window.clearTimeout(saveTimeout);
    }
    
    // Set new timeout for debounced save
    saveTimeout = window.setTimeout(async () => {
      try {
        const state = store.getState();
        const gameState: GameState = {
          player: state.player,
          farm: state.farm,
          economics: state.economics,
          season: state.season,
          weather: state.weather,
          npcs: state.npcs,
          events: state.events,
          stats: state.stats,
          progress: state.progress,
        };
        
        await saveGameState(gameState, currentSaveSlot);
        console.log(`Game state saved successfully to ${currentSaveSlot}`);
      } catch (error) {
        console.error('Failed to save game state:', error);
        // Could dispatch an error action here if needed
      }
    }, SAVE_DEBOUNCE_MS);
  }
  
  return result;
};

// Action creator for setting current save slot
export const setCurrentSaveSlot = (saveSlot: string) => ({
  type: 'persistence/setCurrentSaveSlot',
  payload: saveSlot
});

// Get current save slot
export const getCurrentSaveSlot = () => currentSaveSlot;