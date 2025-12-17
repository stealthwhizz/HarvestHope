/**
 * Redux slice for player profile management
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { PlayerProfile } from '../../../../shared/types/game-state';

const initialState: PlayerProfile = {
  id: '',
  name: '',
  createdAt: '',
  lastPlayed: '',
};

const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    setPlayer: (_state, action: PayloadAction<PlayerProfile>) => {
      return action.payload;
    },
    updateLastPlayed: (state) => {
      state.lastPlayed = new Date().toISOString();
    },
    resetPlayer: () => initialState,
  },
});

export const { setPlayer, updateLastPlayed, resetPlayer } = playerSlice.actions;
export const playerReducer = playerSlice.reducer;