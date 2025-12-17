/**
 * Crop Management Service
 * Handles crop planting, growth tracking, yield calculations, and health management
 */

import type { CropData, GrowthStage, SeasonType, DailyWeather } from '../../../shared/types/game-state';
import { CROP_TYPES, GROWTH_STAGES, PEST_DISEASE_TYPES, type CropType, type PestDiseaseEvent } from '../types/crops';
import { weatherService, type WeatherImpact } from './weatherService';

export interface PlantCropParams {
  cropType: string;
  area: number;
  currentDay: number;
  currentSeason: SeasonType;
  soilQuality: number;
  availableMoney: number;
}

export interface CropGrowthUpdate {
  cropId: string;
  newStage: GrowthStage;
  healthChange: number;
  yieldChange: number;
}

export interface YieldCalculationResult {
  baseYield: number;
  weatherMultiplier: number;
  soilMultiplier: number;
  healthMultiplier: number;
  pestDiseaseMultiplier: number;
  finalYield: number;
  qualityGrade: 'poor' | 'average' | 'good' | 'excellent';
}

export class CropManager {
  private static instance: CropManager;
  private pestDiseaseEvents: Map<string, PestDiseaseEvent[]> = new Map();

  static getInstance(): CropManager {
    if (!CropManager.instance) {
      CropManager.instance = new CropManager();
    }
    return CropManager.instance;
  }

  /**
   * Plant a new crop
   */
  plantCrop(params: PlantCropParams): { success: boolean; crop?: CropData; cost?: number; error?: string } {
    const cropType = CROP_TYPES[params.cropType];
    if (!cropType) {
      return { success: false, error: 'Invalid crop type' };
    }

    // Check if crop can be planted in current season
    if (!cropType.seasons.includes(params.currentSeason)) {
      return { success: false, error: `${cropType.name} cannot be planted in ${params.currentSeason} season` };
    }

    // Calculate planting cost
    const plantingCost = cropType.baseCost * params.area;
    if (params.availableMoney < plantingCost) {
      return { success: false, error: 'Insufficient funds for planting' };
    }

    // Check soil suitability
    const soilSuitability = this.calculateSoilSuitability(cropType, params.soilQuality);
    if (soilSuitability < 0.3) {
      return { success: false, error: 'Soil quality too poor for this crop' };
    }

    // Create crop data
    const crop: CropData = {
      id: `${params.cropType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: params.cropType,
      plantedDate: params.currentDay,
      growthStage: 'seedling',
      health: Math.min(100, 70 + (soilSuitability * 30)), // Base health affected by soil
      expectedYield: this.calculateExpectedYield(cropType, params.area, params.soilQuality),
      area: params.area,
    };

    return { success: true, crop, cost: plantingCost };
  }

  /**
   * Update crop growth based on daily progression
   */
  async updateCropGrowth(
    crop: CropData,
    currentDay: number,
    weather: DailyWeather,
    soilQuality: number
  ): Promise<CropGrowthUpdate> {
    const cropType = CROP_TYPES[crop.type];
    if (!cropType) {
      throw new Error(`Invalid crop type: ${crop.type}`);
    }

    const daysGrown = currentDay - crop.plantedDate;
    const newStage = this.calculateGrowthStage(cropType, daysGrown);
    
    // Get AI-powered weather impact
    let weatherImpact: number;
    
    try {
      const impactResponse = await weatherService.calculateWeatherImpact(
        weather,
        crop.type,
        crop.growthStage
      );
      
      weatherImpact = impactResponse.impact.health_change;
    } catch (error) {
      console.warn('Using fallback weather impact calculation:', error);
      weatherImpact = this.calculateWeatherImpact(cropType, crop.growthStage, weather);
    }
    
    const soilImpact = this.calculateSoilImpact(cropType, soilQuality);
    const pestDiseaseImpact = this.calculatePestDiseaseImpact(crop);

    const healthChange = weatherImpact + soilImpact + pestDiseaseImpact;
    
    // Calculate yield changes
    const yieldChange = this.calculateYieldChange(crop, weatherImpact, soilImpact, pestDiseaseImpact);

    return {
      cropId: crop.id,
      newStage,
      healthChange,
      yieldChange,
    };
  }

  /**
   * Calculate final yield when harvesting
   */
  calculateFinalYield(
    crop: CropData,
    weatherHistory: DailyWeather[],
    soilQuality: number
  ): YieldCalculationResult {
    const cropType = CROP_TYPES[crop.type];
    if (!cropType) {
      throw new Error(`Invalid crop type: ${crop.type}`);
    }

    const baseYield = cropType.baseYield * crop.area;
    
    // Calculate multipliers
    const weatherMultiplier = this.calculateWeatherMultiplier(cropType, weatherHistory);
    const soilMultiplier = this.calculateSoilSuitability(cropType, soilQuality);
    const healthMultiplier = crop.health / 100;
    const pestDiseaseMultiplier = this.calculatePestDiseaseMultiplier(crop);

    const finalYield = baseYield * weatherMultiplier * soilMultiplier * healthMultiplier * pestDiseaseMultiplier;
    
    // Determine quality grade
    const qualityScore = (weatherMultiplier + soilMultiplier + healthMultiplier + pestDiseaseMultiplier) / 4;
    let qualityGrade: 'poor' | 'average' | 'good' | 'excellent';
    
    if (qualityScore >= 0.9) qualityGrade = 'excellent';
    else if (qualityScore >= 0.7) qualityGrade = 'good';
    else if (qualityScore >= 0.5) qualityGrade = 'average';
    else qualityGrade = 'poor';

    return {
      baseYield,
      weatherMultiplier,
      soilMultiplier,
      healthMultiplier,
      pestDiseaseMultiplier,
      finalYield: Math.max(0, finalYield),
      qualityGrade,
    };
  }

  /**
   * Generate random pest or disease event
   */
  generatePestDiseaseEvent(crop: CropData, currentDay: number): PestDiseaseEvent | null {
    const cropType = CROP_TYPES[crop.type];
    if (!cropType) return null;

    // Check vulnerability based on growth stage
    const stageInfo = GROWTH_STAGES[crop.growthStage];
    const pestChance = stageInfo.pestVulnerability * (1 - cropType.pestResistance) * 0.1; // 10% base chance
    const diseaseChance = stageInfo.diseaseVulnerability * (1 - cropType.diseaseResistance) * 0.08; // 8% base chance

    const random = Math.random();
    
    if (random < pestChance) {
      return this.createPestEvent(crop, currentDay);
    } else if (random < pestChance + diseaseChance) {
      return this.createDiseaseEvent(crop, currentDay);
    }

    return null;
  }

  /**
   * Get available crops for current season
   */
  getAvailableCrops(season: SeasonType): CropType[] {
    return Object.values(CROP_TYPES).filter(crop => crop.seasons.includes(season));
  }

  /**
   * Check if crop is ready for harvest
   */
  isReadyForHarvest(crop: CropData, currentDay: number): boolean {
    const cropType = CROP_TYPES[crop.type];
    if (!cropType) return false;

    const daysGrown = currentDay - crop.plantedDate;
    return daysGrown >= cropType.growthDuration && crop.growthStage === 'harvestable';
  }

  /**
   * Get crop care recommendations
   */
  async getCropCareRecommendations(crop: CropData, weather: DailyWeather): Promise<string[]> {
    try {
      const impactResponse = await weatherService.calculateWeatherImpact(
        weather,
        crop.type,
        crop.growthStage
      );
      
      // Combine weather service recommendations with crop-specific recommendations
      const cropSpecificRecommendations = this.getFallbackCropCareRecommendations(crop, weather);
      const allRecommendations = [...impactResponse.recommendations, ...cropSpecificRecommendations];
      
      // Remove duplicates
      return [...new Set(allRecommendations)];
    } catch (error) {
      console.warn('Using fallback recommendations:', error);
      return this.getFallbackCropCareRecommendations(crop, weather);
    }
  }

  private getFallbackCropCareRecommendations(crop: CropData, weather: DailyWeather): string[] {
    const recommendations: string[] = [];
    const cropType = CROP_TYPES[crop.type];
    if (!cropType) return recommendations;

    // Water/irrigation recommendations
    const stageInfo = GROWTH_STAGES[crop.growthStage];
    const waterNeed = this.getWaterRequirementLevel(cropType.waterRequirement) * stageInfo.waterNeed;
    
    if (weather.rainfall < waterNeed && weather.humidity < 60) {
      recommendations.push('Consider irrigation - crop needs more water');
    }

    // Health recommendations
    if (crop.health < 70) {
      recommendations.push('Crop health is declining - check for pests and diseases');
    }

    // Weather-specific recommendations for heat/shade
    if (weather.temperature.max > 40) {
      recommendations.push('Extreme heat - provide shade or increase watering');
    }

    if (weather.rainfall > 50) {
      recommendations.push('Heavy rainfall - ensure proper drainage');
    }

    return recommendations;
  }

  // Private helper methods

  private calculateGrowthStage(cropType: CropType, daysGrown: number): GrowthStage {
    const totalDuration = cropType.growthDuration;
    const progress = daysGrown / totalDuration;

    if (progress < GROWTH_STAGES.seedling.duration) return 'seedling';
    if (progress < GROWTH_STAGES.seedling.duration + GROWTH_STAGES.vegetative.duration) return 'vegetative';
    if (progress < GROWTH_STAGES.seedling.duration + GROWTH_STAGES.vegetative.duration + GROWTH_STAGES.flowering.duration) return 'flowering';
    if (progress < 0.95) return 'mature';
    return 'harvestable';
  }

  private calculateSoilSuitability(cropType: CropType, soilQuality: number): number {
    const requirement = cropType.soilRequirement;
    
    switch (requirement) {
      case 'poor':
        return Math.min(1, soilQuality + 0.3); // Poor soil crops are more tolerant
      case 'medium':
        return soilQuality;
      case 'good':
        return Math.max(0, soilQuality - 0.2); // Good soil crops need better conditions
      default:
        return soilQuality;
    }
  }

  private calculateExpectedYield(cropType: CropType, area: number, soilQuality: number): number {
    const soilMultiplier = this.calculateSoilSuitability(cropType, soilQuality);
    return cropType.baseYield * area * soilMultiplier;
  }

  private calculateWeatherImpact(cropType: CropType, stage: GrowthStage, weather: DailyWeather): number {
    const stageInfo = GROWTH_STAGES[stage];
    const waterNeed = this.getWaterRequirementLevel(cropType.waterRequirement) * stageInfo.waterNeed;
    
    let impact = 0;

    // Rainfall impact
    const rainfallRatio = weather.rainfall / waterNeed;
    if (rainfallRatio < 0.5) {
      impact -= 2; // Drought stress
    } else if (rainfallRatio > 2) {
      impact -= 1; // Too much water
    } else {
      impact += 1; // Good water levels
    }

    // Temperature impact
    if (weather.temperature.max > 45 || weather.temperature.min < 5) {
      impact -= 3; // Extreme temperatures
    } else if (weather.temperature.max > 35 || weather.temperature.min < 10) {
      impact -= 1; // Stress temperatures
    }

    return Math.max(-5, Math.min(3, impact));
  }

  private calculateSoilImpact(cropType: CropType, soilQuality: number): number {
    const suitability = this.calculateSoilSuitability(cropType, soilQuality);
    
    if (suitability > 0.8) return 1;
    if (suitability > 0.6) return 0;
    if (suitability > 0.4) return -1;
    return -2;
  }

  private calculatePestDiseaseImpact(crop: CropData): number {
    const events = this.pestDiseaseEvents.get(crop.id) || [];
    let totalImpact = 0;

    events.forEach(event => {
      if (event.canTreat) {
        totalImpact -= event.severity * 2; // Treatable but still causes damage
      } else {
        totalImpact -= event.severity * 5; // Untreated causes more damage
      }
    });

    return Math.max(-10, totalImpact);
  }

  private calculateYieldChange(crop: CropData, weatherImpact: number, soilImpact: number, pestDiseaseImpact: number): number {
    const totalImpact = weatherImpact + soilImpact + pestDiseaseImpact;
    return crop.expectedYield * (totalImpact / 100); // Convert to percentage change
  }

  private calculateWeatherMultiplier(cropType: CropType, weatherHistory: DailyWeather[]): number {
    if (weatherHistory.length === 0) return 0.7; // Default if no history

    let totalRainfall = 0;
    let extremeDays = 0;
    let goodDays = 0;

    weatherHistory.forEach(day => {
      totalRainfall += day.rainfall;
      
      if (day.temperature.max > 45 || day.temperature.min < 5) {
        extremeDays++;
      } else if (day.temperature.max <= 35 && day.temperature.min >= 15) {
        goodDays++;
      }
    });

    const avgRainfall = totalRainfall / weatherHistory.length;
    const waterNeed = this.getWaterRequirementLevel(cropType.waterRequirement);
    
    let multiplier = 0.7; // Base multiplier

    // Rainfall impact
    const rainfallRatio = avgRainfall / waterNeed;
    if (rainfallRatio >= 0.8 && rainfallRatio <= 1.5) {
      multiplier += 0.2;
    } else if (rainfallRatio < 0.5 || rainfallRatio > 2) {
      multiplier -= 0.3;
    }

    // Temperature impact
    const extremeRatio = extremeDays / weatherHistory.length;
    const goodRatio = goodDays / weatherHistory.length;
    
    multiplier -= extremeRatio * 0.4;
    multiplier += goodRatio * 0.2;

    return Math.max(0.1, Math.min(1.5, multiplier));
  }

  private calculatePestDiseaseMultiplier(crop: CropData): number {
    const events = this.pestDiseaseEvents.get(crop.id) || [];
    let multiplier = 1.0;

    events.forEach(event => {
      if (event.canTreat) {
        multiplier *= (1 - event.yieldImpact * 0.3); // Treated reduces impact
      } else {
        multiplier *= (1 - event.yieldImpact); // Full impact if untreated
      }
    });

    return Math.max(0.1, multiplier);
  }

  private createPestEvent(crop: CropData, currentDay: number): PestDiseaseEvent {
    const availablePests = PEST_DISEASE_TYPES.pests.filter(pest => 
      pest.affectedCrops.includes(crop.type)
    );
    
    const pest = availablePests[Math.floor(Math.random() * availablePests.length)];
    
    const randomizedSeverity = Math.min(1.0, pest.severity * (0.7 + Math.random() * 0.6)); // Ensure max 1.0
    
    const event: PestDiseaseEvent = {
      id: `pest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'pest',
      name: pest.name,
      severity: randomizedSeverity,
      cropId: crop.id,
      startDay: currentDay,
      duration: 7 + Math.floor(Math.random() * 14), // 7-21 days
      yieldImpact: randomizedSeverity * 0.3, // 30% of severity as yield impact
      treatmentCost: pest.treatmentCost * crop.area,
      canTreat: true,
    };

    // Add to tracking
    if (!this.pestDiseaseEvents.has(crop.id)) {
      this.pestDiseaseEvents.set(crop.id, []);
    }
    this.pestDiseaseEvents.get(crop.id)!.push(event);

    return event;
  }

  private createDiseaseEvent(crop: CropData, currentDay: number): PestDiseaseEvent {
    const availableDiseases = PEST_DISEASE_TYPES.diseases.filter(disease => 
      disease.affectedCrops.includes(crop.type)
    );
    
    const disease = availableDiseases[Math.floor(Math.random() * availableDiseases.length)];
    
    const randomizedSeverity = Math.min(1.0, disease.severity * (0.7 + Math.random() * 0.6)); // Ensure max 1.0
    
    const event: PestDiseaseEvent = {
      id: `disease_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'disease',
      name: disease.name,
      severity: randomizedSeverity,
      cropId: crop.id,
      startDay: currentDay,
      duration: 10 + Math.floor(Math.random() * 20), // 10-30 days
      yieldImpact: randomizedSeverity * 0.4, // 40% of severity as yield impact
      treatmentCost: disease.treatmentCost * crop.area,
      canTreat: Math.random() > 0.3, // 70% chance treatable
    };

    // Add to tracking
    if (!this.pestDiseaseEvents.has(crop.id)) {
      this.pestDiseaseEvents.set(crop.id, []);
    }
    this.pestDiseaseEvents.get(crop.id)!.push(event);

    return event;
  }

  private getWaterRequirementLevel(requirement: 'low' | 'medium' | 'high'): number {
    switch (requirement) {
      case 'low': return 10;
      case 'medium': return 25;
      case 'high': return 50;
      default: return 25;
    }
  }

  /**
   * Treat a pest or disease event
   */
  treatPestDisease(eventId: string, cropId: string): { success: boolean; cost: number; error?: string } {
    const events = this.pestDiseaseEvents.get(cropId) || [];
    const event = events.find(e => e.id === eventId);

    if (!event) {
      return { success: false, cost: 0, error: 'Event not found' };
    }

    if (!event.canTreat) {
      return { success: false, cost: 0, error: 'This condition cannot be treated' };
    }

    // Remove the event (treatment successful)
    const updatedEvents = events.filter(e => e.id !== eventId);
    this.pestDiseaseEvents.set(cropId, updatedEvents);

    return { success: true, cost: event.treatmentCost };
  }

  /**
   * Get active pest/disease events for a crop
   */
  getActivePestDiseaseEvents(cropId: string): PestDiseaseEvent[] {
    return this.pestDiseaseEvents.get(cropId) || [];
  }

  /**
   * Clean up expired events
   */
  cleanupExpiredEvents(currentDay: number): void {
    this.pestDiseaseEvents.forEach((events, cropId) => {
      const activeEvents = events.filter(event => 
        currentDay - event.startDay < event.duration
      );
      this.pestDiseaseEvents.set(cropId, activeEvents);
    });
  }
}

export const cropManager = CropManager.getInstance();