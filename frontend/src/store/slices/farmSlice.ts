/**
 * Redux slice for farm data management
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { FarmData, CropData, StoredCropData, LivestockData, EquipmentData, SeasonType } from '../../../../shared/types/game-state';


const initialState: FarmData = {
  money: 50000, // Starting money in rupees
  day: 1,
  season: 'Kharif',
  year: 1,
  landArea: 2, // Starting with 2 acres
  soilQuality: 0.7, // 70% soil quality
  crops: [],
  storedCrops: [],
  livestock: [],
  equipment: [],
  storageCapacity: {
    farm: 1000, // 1000 kg farm storage
    warehouse: 0, // No warehouse initially
    cold_storage: 0, // No cold storage initially
  },
};

const farmSlice = createSlice({
  name: 'farm',
  initialState,
  reducers: {
    setFarmData: (_state, action: PayloadAction<FarmData>) => {
      return action.payload;
    },
    updateMoney: (state, action: PayloadAction<number>) => {
      state.money += action.payload;
    },
    setMoney: (state, action: PayloadAction<number>) => {
      state.money = action.payload;
    },
    advanceDay: (state) => {
      state.day += 1;
    },
    setSeason: (state, action: PayloadAction<SeasonType>) => {
      state.season = action.payload;
    },
    setDay: (state, action: PayloadAction<number>) => {
      state.day = Math.max(1, action.payload);
    },
    advanceYear: (state) => {
      state.year += 1;
    },
    setYear: (state, action: PayloadAction<number>) => {
      state.year = action.payload;
    },
    plantCrop: (state, action: PayloadAction<CropData>) => {
      state.crops.push(action.payload);
    },
    updateCrop: (state, action: PayloadAction<{ id: string; updates: Partial<CropData> }>) => {
      const cropIndex = state.crops.findIndex(crop => crop.id === action.payload.id);
      if (cropIndex !== -1) {
        state.crops[cropIndex] = { ...state.crops[cropIndex], ...action.payload.updates };
      }
    },
    harvestCrop: (state, action: PayloadAction<string>) => {
      state.crops = state.crops.filter(crop => crop.id !== action.payload);
    },
    updateCropHealth: (state, action: PayloadAction<{ id: string; healthChange: number }>) => {
      const cropIndex = state.crops.findIndex(crop => crop.id === action.payload.id);
      if (cropIndex !== -1) {
        state.crops[cropIndex].health = Math.max(0, Math.min(100, 
          state.crops[cropIndex].health + action.payload.healthChange
        ));
      }
    },
    updateCropYield: (state, action: PayloadAction<{ id: string; yieldChange: number }>) => {
      const cropIndex = state.crops.findIndex(crop => crop.id === action.payload.id);
      if (cropIndex !== -1) {
        state.crops[cropIndex].expectedYield = Math.max(0, 
          state.crops[cropIndex].expectedYield + action.payload.yieldChange
        );
      }
    },
    updateCropGrowthStage: (state, action: PayloadAction<{ id: string; stage: string }>) => {
      const cropIndex = state.crops.findIndex(crop => crop.id === action.payload.id);
      if (cropIndex !== -1) {
        state.crops[cropIndex].growthStage = action.payload.stage as any;
      }
    },
    addLivestock: (state, action: PayloadAction<LivestockData>) => {
      state.livestock.push(action.payload);
    },
    updateLivestock: (state, action: PayloadAction<{ id: string; updates: Partial<LivestockData> }>) => {
      const livestockIndex = state.livestock.findIndex(livestock => livestock.id === action.payload.id);
      if (livestockIndex !== -1) {
        state.livestock[livestockIndex] = { ...state.livestock[livestockIndex], ...action.payload.updates };
      }
    },
    addEquipment: (state, action: PayloadAction<EquipmentData>) => {
      state.equipment.push(action.payload);
    },
    updateEquipment: (state, action: PayloadAction<{ id: string; updates: Partial<EquipmentData> }>) => {
      const equipmentIndex = state.equipment.findIndex(equipment => equipment.id === action.payload.id);
      if (equipmentIndex !== -1) {
        state.equipment[equipmentIndex] = { ...state.equipment[equipmentIndex], ...action.payload.updates };
      }
    },
    updateSoilQuality: (state, action: PayloadAction<number>) => {
      state.soilQuality = Math.max(0, Math.min(1, action.payload)); // Keep between 0 and 1
    },
    storeCrop: (state, action: PayloadAction<StoredCropData>) => {
      state.storedCrops.push(action.payload);
    },
    updateStoredCrop: (state, action: PayloadAction<{ id: string; updates: Partial<StoredCropData> }>) => {
      const cropIndex = state.storedCrops.findIndex(crop => crop.id === action.payload.id);
      if (cropIndex !== -1) {
        state.storedCrops[cropIndex] = { ...state.storedCrops[cropIndex], ...action.payload.updates };
      }
    },
    sellStoredCrop: (state, action: PayloadAction<{ id: string; quantity: number; price: number }>) => {
      const cropIndex = state.storedCrops.findIndex(crop => crop.id === action.payload.id);
      if (cropIndex !== -1) {
        const crop = state.storedCrops[cropIndex];
        const sellQuantity = Math.min(action.payload.quantity, crop.quantity);
        const revenue = sellQuantity * action.payload.price / 100; // Convert to quintal pricing
        
        state.money += revenue;
        crop.quantity -= sellQuantity;
        
        // Remove crop if fully sold
        if (crop.quantity <= 0) {
          state.storedCrops.splice(cropIndex, 1);
        }
      }
    },
    upgradeStorage: (state, action: PayloadAction<{ type: keyof FarmData['storageCapacity']; capacity: number; cost: number }>) => {
      if (state.money >= action.payload.cost) {
        state.money -= action.payload.cost;
        state.storageCapacity[action.payload.type] += action.payload.capacity;
      }
    },
    payStorageCosts: (state) => {
      let totalCost = 0;
      state.storedCrops.forEach(crop => {
        totalCost += crop.storageCost;
        // Apply deterioration
        crop.qualityGrade = applyDeterioration(crop.qualityGrade, crop.deteriorationRate);
      });
      state.money = Math.max(0, state.money - totalCost);
    },
    resetFarm: () => initialState,
  },
});

// Helper function for crop deterioration
function applyDeterioration(currentGrade: StoredCropData['qualityGrade'], deteriorationRate: number): StoredCropData['qualityGrade'] {
  const grades: StoredCropData['qualityGrade'][] = ['premium', 'grade_a', 'grade_b', 'grade_c', 'below_standard'];
  const currentIndex = grades.indexOf(currentGrade);
  
  // Random deterioration based on rate
  if (Math.random() < deteriorationRate) {
    const newIndex = Math.min(currentIndex + 1, grades.length - 1);
    return grades[newIndex];
  }
  
  return currentGrade;
}

export const {
  setFarmData,
  updateMoney,
  setMoney,
  advanceDay,
  setSeason,
  setDay,
  setYear,
  advanceYear,
  plantCrop,
  updateCrop,
  harvestCrop,
  updateCropHealth,
  updateCropYield,
  updateCropGrowthStage,
  addLivestock,
  updateLivestock,
  addEquipment,
  updateEquipment,
  updateSoilQuality,
  storeCrop,
  updateStoredCrop,
  sellStoredCrop,
  upgradeStorage,
  payStorageCosts,
  resetFarm,
} = farmSlice.actions;

export const farmReducer = farmSlice.reducer;