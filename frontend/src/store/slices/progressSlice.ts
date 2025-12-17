/**
 * Redux slice for progress data management
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { ProgressData, Achievement, EducationalProgress } from '../../../../shared/types/game-state';

const initialState: ProgressData = {
  achievements: [],
  unlockedFeatures: [],
  educationalContent: [],
};

const progressSlice = createSlice({
  name: 'progress',
  initialState,
  reducers: {
    setProgress: (_state, action: PayloadAction<ProgressData>) => {
      return action.payload;
    },
    unlockAchievement: (state, action: PayloadAction<Achievement>) => {
      const exists = state.achievements.find(achievement => achievement.id === action.payload.id);
      if (!exists) {
        state.achievements.push(action.payload);
      }
    },
    unlockFeature: (state, action: PayloadAction<string>) => {
      if (!state.unlockedFeatures.includes(action.payload)) {
        state.unlockedFeatures.push(action.payload);
      }
    },
    addEducationalProgress: (state, action: PayloadAction<EducationalProgress>) => {
      const existingIndex = state.educationalContent.findIndex(
        content => content.topicId === action.payload.topicId
      );
      if (existingIndex !== -1) {
        state.educationalContent[existingIndex] = action.payload;
      } else {
        state.educationalContent.push(action.payload);
      }
    },
    completeEducationalTopic: (state, action: PayloadAction<{ topicId: string; score?: number }>) => {
      const topicIndex = state.educationalContent.findIndex(
        content => content.topicId === action.payload.topicId
      );
      if (topicIndex !== -1) {
        state.educationalContent[topicIndex].completed = true;
        state.educationalContent[topicIndex].completedDate = new Date().toISOString();
        if (action.payload.score !== undefined) {
          state.educationalContent[topicIndex].score = action.payload.score;
        }
      }
    },
    resetProgress: () => initialState,
  },
});

export const {
  setProgress,
  unlockAchievement,
  unlockFeature,
  addEducationalProgress,
  completeEducationalTopic,
  resetProgress,
} = progressSlice.actions;

export const progressReducer = progressSlice.reducer;