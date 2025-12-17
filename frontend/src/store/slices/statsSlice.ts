/**
 * Redux slice for statistics data management
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { StatisticsData } from '../../../../shared/types/game-state';

const initialState: StatisticsData = {
  totalPlayTime: 0,
  seasonsCompleted: 0,
  totalIncome: 0,
  totalExpenses: 0,
  cropsHarvested: 0,
  loansRepaid: 0,
  npcRelationships: 0,
};

const statsSlice = createSlice({
  name: 'stats',
  initialState,
  reducers: {
    setStats: (_state, action: PayloadAction<StatisticsData>) => {
      return action.payload;
    },
    incrementPlayTime: (state, action: PayloadAction<number>) => {
      state.totalPlayTime += action.payload;
    },
    incrementSeasonsCompleted: (state) => {
      state.seasonsCompleted += 1;
    },
    addIncome: (state, action: PayloadAction<number>) => {
      state.totalIncome += action.payload;
    },
    addExpense: (state, action: PayloadAction<number>) => {
      state.totalExpenses += action.payload;
    },
    incrementCropsHarvested: (state, action: PayloadAction<number>) => {
      state.cropsHarvested += action.payload;
    },
    incrementLoansRepaid: (state) => {
      state.loansRepaid += 1;
    },
    updateNPCRelationships: (state, action: PayloadAction<number>) => {
      state.npcRelationships = action.payload;
    },
    resetStats: () => initialState,
  },
});

export const {
  setStats,
  incrementPlayTime,
  incrementSeasonsCompleted,
  addIncome,
  addExpense,
  incrementCropsHarvested,
  incrementLoansRepaid,
  updateNPCRelationships,
  resetStats,
} = statsSlice.actions;

export const statsReducer = statsSlice.reducer;