/**
 * Season Validation Utilities
 * Provides validation functions for seasonal cycle consistency and time management
 */

import type { SeasonType, SeasonData } from '../../../shared/types/game-state';

export const DAYS_PER_SEASON = 120;
export const SEASON_CYCLE: SeasonType[] = ['Kharif', 'Rabi', 'Zaid', 'Off-season'];

/**
 * Validate if a season transition is correct according to the cycle
 */
export function isValidSeasonTransition(from: SeasonType, to: SeasonType): boolean {
  const fromIndex = SEASON_CYCLE.indexOf(from);
  const toIndex = SEASON_CYCLE.indexOf(to);
  
  if (fromIndex === -1 || toIndex === -1) {
    return false;
  }
  
  const expectedNextIndex = (fromIndex + 1) % SEASON_CYCLE.length;
  return expectedNextIndex === toIndex;
}

/**
 * Get the next season in the cycle
 */
export function getNextSeason(currentSeason: SeasonType): SeasonType {
  const currentIndex = SEASON_CYCLE.indexOf(currentSeason);
  if (currentIndex === -1) {
    throw new Error(`Invalid season: ${currentSeason}`);
  }
  
  return SEASON_CYCLE[(currentIndex + 1) % SEASON_CYCLE.length];
}

/**
 * Get the previous season in the cycle
 */
export function getPreviousSeason(currentSeason: SeasonType): SeasonType {
  const currentIndex = SEASON_CYCLE.indexOf(currentSeason);
  if (currentIndex === -1) {
    throw new Error(`Invalid season: ${currentSeason}`);
  }
  
  return SEASON_CYCLE[(currentIndex - 1 + SEASON_CYCLE.length) % SEASON_CYCLE.length];
}

/**
 * Validate season data consistency
 */
export function validateSeasonData(seasonData: SeasonData): {
  isValid: boolean;
  errors: string[];
  correctedData?: SeasonData;
} {
  const errors: string[] = [];
  let correctedData: SeasonData | undefined;

  // Check if current season is valid
  if (!SEASON_CYCLE.includes(seasonData.current)) {
    errors.push(`Invalid current season: ${seasonData.current}`);
  }

  // Check if next season is correct
  const expectedNext = getNextSeason(seasonData.current);
  if (seasonData.nextSeason !== expectedNext) {
    errors.push(`Invalid next season: expected ${expectedNext}, got ${seasonData.nextSeason}`);
  }

  // Check day bounds
  if (seasonData.day < 1 || seasonData.day > DAYS_PER_SEASON) {
    errors.push(`Invalid day: ${seasonData.day}. Must be between 1 and ${DAYS_PER_SEASON}`);
  }

  // Check days remaining consistency
  const expectedDaysRemaining = DAYS_PER_SEASON - seasonData.day;
  if (seasonData.daysRemaining !== expectedDaysRemaining) {
    errors.push(`Inconsistent days remaining: expected ${expectedDaysRemaining}, got ${seasonData.daysRemaining}`);
  }

  // If there are errors, provide corrected data
  if (errors.length > 0) {
    correctedData = {
      current: SEASON_CYCLE.includes(seasonData.current) ? seasonData.current : 'Kharif',
      day: Math.max(1, Math.min(DAYS_PER_SEASON, seasonData.day)),
      daysRemaining: 0, // Will be recalculated
      nextSeason: expectedNext,
    };
    
    // Recalculate days remaining
    correctedData.daysRemaining = DAYS_PER_SEASON - correctedData.day;
    correctedData.nextSeason = getNextSeason(correctedData.current);
  }

  return {
    isValid: errors.length === 0,
    errors,
    correctedData,
  };
}

/**
 * Calculate season progress as percentage
 */
export function calculateSeasonProgress(day: number): number {
  return Math.min(100, Math.max(0, (day / DAYS_PER_SEASON) * 100));
}

/**
 * Calculate total days elapsed from start of game
 */
export function calculateTotalDays(currentSeason: SeasonType, currentDay: number, year: number): number {
  const seasonIndex = SEASON_CYCLE.indexOf(currentSeason);
  const seasonsCompleted = (year - 1) * SEASON_CYCLE.length + seasonIndex;
  const daysInCompletedSeasons = seasonsCompleted * DAYS_PER_SEASON;
  
  return daysInCompletedSeasons + currentDay;
}

/**
 * Convert total days back to season, day, and year
 */
export function convertTotalDaysToSeasonData(totalDays: number): {
  season: SeasonType;
  day: number;
  year: number;
} {
  const totalSeasonsElapsed = Math.floor((totalDays - 1) / DAYS_PER_SEASON);
  const year = Math.floor(totalSeasonsElapsed / SEASON_CYCLE.length) + 1;
  const seasonIndex = totalSeasonsElapsed % SEASON_CYCLE.length;
  const day = ((totalDays - 1) % DAYS_PER_SEASON) + 1;

  return {
    season: SEASON_CYCLE[seasonIndex],
    day,
    year,
  };
}

/**
 * Check if a specific day/season combination is in the future
 */
export function isFutureDate(
  targetSeason: SeasonType,
  targetDay: number,
  currentSeason: SeasonType,
  currentDay: number,
  currentYear: number
): boolean {
  const currentSeasonIndex = SEASON_CYCLE.indexOf(currentSeason);
  const targetSeasonIndex = SEASON_CYCLE.indexOf(targetSeason);
  
  // If target season is later in the same year
  if (targetSeasonIndex > currentSeasonIndex) {
    return true;
  }
  
  // If target season is the same as current
  if (targetSeasonIndex === currentSeasonIndex) {
    return targetDay > currentDay;
  }
  
  // If target season is earlier in cycle, it's next year
  return targetSeasonIndex < currentSeasonIndex;
}

/**
 * Get season characteristics for validation and information
 */
export function getSeasonCharacteristics(season: SeasonType): {
  name: string;
  description: string;
  months: string;
  primaryCrops: string[];
  weatherPattern: string;
  challenges: string[];
} {
  const characteristics = {
    'Kharif': {
      name: 'Kharif',
      description: 'Monsoon-dependent summer crops',
      months: 'June - October',
      primaryCrops: ['Rice', 'Cotton', 'Sugarcane', 'Maize', 'Pulses'],
      weatherPattern: 'Heavy rainfall, high humidity, warm temperatures',
      challenges: ['Flooding', 'Pest outbreaks', 'Waterlogging', 'Disease pressure'],
    },
    'Rabi': {
      name: 'Rabi',
      description: 'Winter crops grown with irrigation',
      months: 'November - March',
      primaryCrops: ['Wheat', 'Barley', 'Peas', 'Gram', 'Mustard'],
      weatherPattern: 'Cool temperatures, low rainfall, clear skies',
      challenges: ['Irrigation requirements', 'Frost damage', 'Market timing'],
    },
    'Zaid': {
      name: 'Zaid',
      description: 'Summer crops requiring intensive irrigation',
      months: 'April - June',
      primaryCrops: ['Watermelon', 'Cucumber', 'Fodder crops', 'Vegetables'],
      weatherPattern: 'Hot temperatures, minimal rainfall, high evaporation',
      challenges: ['Water scarcity', 'Heat stress', 'High input costs', 'Limited crop options'],
    },
    'Off-season': {
      name: 'Off-season',
      description: 'Preparation and planning period',
      months: 'Transition period',
      primaryCrops: ['Land preparation', 'Soil improvement', 'Equipment maintenance'],
      weatherPattern: 'Variable, preparation for next cycle',
      challenges: ['Income gap', 'Planning decisions', 'Resource allocation', 'Market analysis'],
    },
  };

  return characteristics[season];
}

/**
 * Validate if crops are appropriate for the current season
 */
export function validateCropsForSeason(crops: string[], season: SeasonType): {
  appropriate: string[];
  inappropriate: string[];
  warnings: string[];
} {
  const seasonCharacteristics = getSeasonCharacteristics(season);
  const appropriate: string[] = [];
  const inappropriate: string[] = [];
  const warnings: string[] = [];

  crops.forEach(crop => {
    if (seasonCharacteristics.primaryCrops.includes(crop)) {
      appropriate.push(crop);
    } else {
      inappropriate.push(crop);
      warnings.push(`${crop} is not typically grown during ${season} season`);
    }
  });

  return { appropriate, inappropriate, warnings };
}

/**
 * Calculate optimal planting window for a season
 */
export function getOptimalPlantingWindow(season: SeasonType): {
  startDay: number;
  endDay: number;
  description: string;
} {
  const plantingWindows = {
    'Kharif': {
      startDay: 5,
      endDay: 30,
      description: 'Plant after monsoon arrival but before peak rains',
    },
    'Rabi': {
      startDay: 10,
      endDay: 40,
      description: 'Plant after monsoon withdrawal when soil moisture is optimal',
    },
    'Zaid': {
      startDay: 1,
      endDay: 20,
      description: 'Plant early to avoid peak summer heat',
    },
    'Off-season': {
      startDay: 1,
      endDay: 120,
      description: 'Focus on land preparation and planning',
    },
  };

  return plantingWindows[season];
}

/**
 * Validate season transition timing
 */
export function validateSeasonTransitionTiming(
  currentSeason: SeasonType,
  currentDay: number,
  daysRemaining: number
): {
  canTransition: boolean;
  shouldTransition: boolean;
  daysUntilTransition: number;
  warnings: string[];
} {
  const warnings: string[] = [];
  const canTransition = daysRemaining <= 0;
  const shouldTransition = daysRemaining <= 0;
  const daysUntilTransition = Math.max(0, daysRemaining);

  // Add warnings for late season activities
  if (daysRemaining <= 10 && daysRemaining > 0) {
    warnings.push(`Season ending soon. Complete harvesting and prepare for ${getNextSeason(currentSeason)}`);
  }

  if (daysRemaining <= 30 && currentSeason !== 'Off-season') {
    warnings.push('Consider harvesting mature crops before season ends');
  }

  return {
    canTransition,
    shouldTransition,
    daysUntilTransition,
    warnings,
  };
}