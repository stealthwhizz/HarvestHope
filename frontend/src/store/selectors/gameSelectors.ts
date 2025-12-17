/**
 * Redux selectors for computed game state values
 */

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { LoanData, CropData, WeatherEvent, NPCData, EducationalProgress } from '../../../../shared/types/game-state';

// Basic selectors
export const selectPlayer = (state: RootState) => state.player;
export const selectFarm = (state: RootState) => state.farm;
export const selectEconomics = (state: RootState) => state.economics;
export const selectSeason = (state: RootState) => state.season;
export const selectWeather = (state: RootState) => state.weather;
export const selectNPCs = (state: RootState) => state.npcs;
export const selectStats = (state: RootState) => state.stats;
export const selectProgress = (state: RootState) => state.progress;

// Combined game state selector
export const selectGameState = (state: RootState) => ({
  player: state.player,
  farm: state.farm,
  economics: state.economics,
  season: state.season,
  weather: state.weather,
  npcs: state.npcs,
  events: state.events,
  stats: state.stats,
  progress: state.progress,
});

// Computed selectors
export const selectTotalMoney = createSelector(
  [selectFarm, selectEconomics],
  (farm, economics) => farm.money + economics.bankAccount
);

export const selectTotalDebt = createSelector(
  [selectEconomics],
  (economics) => economics.loans.reduce((total: number, loan: LoanData) => total + loan.remainingAmount, 0)
);

export const selectNetWorth = createSelector(
  [selectTotalMoney, selectTotalDebt],
  (totalMoney, totalDebt) => totalMoney - totalDebt
);

export const selectActiveCrops = createSelector(
  [selectFarm],
  (farm) => farm.crops.filter((crop: CropData) => crop.growthStage !== 'harvestable')
);

export const selectHarvestableCrops = createSelector(
  [selectFarm],
  (farm) => farm.crops.filter((crop: CropData) => crop.growthStage === 'harvestable')
);

export const selectTotalCropArea = createSelector(
  [selectFarm],
  (farm) => farm.crops.reduce((total: number, crop: CropData) => total + crop.area, 0)
);

export const selectAvailableLand = createSelector(
  [selectFarm, selectTotalCropArea],
  (farm, usedArea) => farm.landArea - usedArea
);

export const selectOverdueLoans = createSelector(
  [selectEconomics],
  (economics) => economics.loans.filter((loan: LoanData) => new Date(loan.dueDate) < new Date())
);

export const selectMonthlyEMI = createSelector(
  [selectEconomics],
  (economics) => economics.loans.reduce((total: number, loan: LoanData) => total + loan.emiAmount, 0)
);

export const selectCurrentSeasonProgress = createSelector(
  [selectSeason],
  (season) => ((120 - season.daysRemaining) / 120) * 100
);

export const selectWeatherRisk = createSelector(
  [selectWeather],
  (weather) => ({
    drought: weather.monsoonPrediction.droughtRisk,
    flood: weather.monsoonPrediction.floodRisk,
    overall: Math.max(weather.monsoonPrediction.droughtRisk, weather.monsoonPrediction.floodRisk),
  })
);

export const selectActiveWeatherEvents = createSelector(
  [selectWeather],
  (weather) => weather.extremeEvents.filter((event: WeatherEvent) => {
    const eventEnd = new Date(event.startDate);
    eventEnd.setDate(eventEnd.getDate() + event.duration);
    return eventEnd > new Date();
  })
);

export const selectNPCsByRelationship = createSelector(
  [selectNPCs],
  (npcs) => {
    const sorted = [...npcs].sort((a, b) => b.relationshipLevel - a.relationshipLevel);
    return {
      friends: sorted.filter(npc => npc.relationshipLevel > 50),
      neutral: sorted.filter(npc => npc.relationshipLevel >= -20 && npc.relationshipLevel <= 50),
      hostile: sorted.filter(npc => npc.relationshipLevel < -20),
    };
  }
);

export const selectNPCsInCrisis = createSelector(
  [selectNPCs],
  (npcs) => npcs.filter((npc: NPCData) => npc.currentCrisis !== 'debt' || npc.relationshipLevel > 0)
);

export const selectUnlockedAchievements = createSelector(
  [selectProgress],
  (progress) => progress.achievements.length
);

export const selectEducationalProgress = createSelector(
  [selectProgress],
  (progress) => {
    const completed = progress.educationalContent.filter((content: EducationalProgress) => content.completed).length;
    const total = progress.educationalContent.length;
    return {
      completed,
      total,
      percentage: total > 0 ? (completed / total) * 100 : 0,
    };
  }
);

export const selectGameSummary = createSelector(
  [
    selectPlayer,
    selectSeason,
    selectTotalMoney,
    selectTotalDebt,
    selectActiveCrops,
    selectStats,
  ],
  (player, season, totalMoney, totalDebt, activeCrops, stats) => ({
    playerName: player.name,
    currentSeason: season.current,
    day: season.day,
    year: Math.floor(stats.seasonsCompleted / 4) + 1,
    money: totalMoney,
    debt: totalDebt,
    activeCrops: activeCrops.length,
    seasonsCompleted: stats.seasonsCompleted,
  })
);