/**
 * Redux slice for NPC data management
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { NPCData, DialogueEntry } from '../../../../shared/types/game-state';

const initialState: NPCData[] = [];

const npcSlice = createSlice({
  name: 'npcs',
  initialState,
  reducers: {
    setNPCs: (_state, action: PayloadAction<NPCData[]>) => {
      return action.payload;
    },
    addNPC: (state, action: PayloadAction<NPCData>) => {
      state.push(action.payload);
    },
    updateNPC: (state, action: PayloadAction<{ id: string; updates: Partial<NPCData> }>) => {
      const npcIndex = state.findIndex(npc => npc.id === action.payload.id);
      if (npcIndex !== -1) {
        state[npcIndex] = { ...state[npcIndex], ...action.payload.updates };
      }
    },
    removeNPC: (state, action: PayloadAction<string>) => {
      return state.filter(npc => npc.id !== action.payload);
    },
    updateRelationship: (state, action: PayloadAction<{ id: string; change: number }>) => {
      const npcIndex = state.findIndex(npc => npc.id === action.payload.id);
      if (npcIndex !== -1) {
        state[npcIndex].relationshipLevel = Math.max(-100, Math.min(100, 
          state[npcIndex].relationshipLevel + action.payload.change
        ));
      }
    },
    addDialogue: (state, action: PayloadAction<{ npcId: string; dialogue: DialogueEntry }>) => {
      const npcIndex = state.findIndex(npc => npc.id === action.payload.npcId);
      if (npcIndex !== -1) {
        state[npcIndex].dialogueHistory.push(action.payload.dialogue);
      }
    },
    resetNPCs: () => initialState,
  },
});

export const {
  setNPCs,
  addNPC,
  updateNPC,
  removeNPC,
  updateRelationship,
  addDialogue,
  resetNPCs,
} = npcSlice.actions;

export const npcReducer = npcSlice.reducer;