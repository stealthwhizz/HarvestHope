/**
 * Extreme Weather Service
 * Specialized service for handling extreme weather and crisis events
 * Integrates with weather service and event service for comprehensive crisis management
 */

import type { 
  GameEvent, 
  GameState, 
  WeatherData, 
  DailyWeather,
  SeasonType,
  SeasonData 
} from '../../../shared/types/game-state';
import { eventService } from './eventService';
import { weatherService } from './weatherService';

export interface ExtremeWeatherTrigger {
  type: 'drought' | 'flood' | 'cyclone' | 'pest_outbreak' | 'equipment_failure' | 'health_crisis';
  probability: number;
  severity: number;
  conditions: string[];
}

export interface CrisisAssessment {
  immediateThreats: ExtremeWeatherTrigger[];
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  recommendedActions: string[];
  timeToAct: number; // hours
}

export class ExtremeWeatherService {
  private static instance: ExtremeWeatherService;

  static getInstance(): ExtremeWeatherService {
    if (!ExtremeWeatherService.instance) {
      ExtremeWeatherService.instance = new ExtremeWeatherService();
    }
    return ExtremeWeatherService.instance;
  }

  /**
   * Assess current crisis risk based on game state
   */
  assessCrisisRisk(gameState: GameState): CrisisAssessment {
    const threats: ExtremeWeatherTrigger[] = [];
    const weather = gameState.weather;
    const farm = gameState.farm;
    const economics = gameState.economics;
    const season = gameState.season;

    // Drought risk assessment
    const droughtRisk = this.calculateDroughtRisk(weather, season);
    if (droughtRisk.probability > 0.3) {
      threats.push(droughtRisk);
    }

    // Flood risk assessment
    const floodRisk = this.calculateFloodRisk(weather, season);
    if (floodRisk.probability > 0.2) {
      threats.push(floodRisk);
    }

    // Pest outbreak risk
    const pestRisk = this.calculatePestRisk(farm, season, weather);
    if (pestRisk.probability > 0.25) {
      threats.push(pestRisk);
    }

    // Equipment failure risk
    const equipmentRisk = this.calculateEquipmentRisk(farm);
    if (equipmentRisk.probability > 0.15) {
      threats.push(equipmentRisk);
    }

    // Financial crisis risk
    const financialRisk = this.calculateFinancialCrisisRisk(economics, farm);
    if (financialRisk.probability > 0.4) {
      threats.push({
        type: 'health_crisis',
        probability: financialRisk.probability,
        severity: financialRisk.severity,
        conditions: ['Low funds', 'High debt', 'Stress factors']
      });
    }

    // Determine overall risk level
    const maxSeverity = Math.max(...threats.map(t => t.severity), 0);
    const totalProbability = threats.reduce((sum, t) => sum + t.probability, 0);

    let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
    if (maxSeverity > 0.8 || totalProbability > 1.5) {
      riskLevel = 'critical';
    } else if (maxSeverity > 0.6 || totalProbability > 1.0) {
      riskLevel = 'high';
    } else if (maxSeverity > 0.4 || totalProbability > 0.5) {
      riskLevel = 'moderate';
    }

    return {
      immediateThreats: threats,
      riskLevel,
      recommendedActions: this.generateRecommendations(threats),
      timeToAct: this.calculateTimeToAct(threats)
    };
  }

  /**
   * Generate extreme weather event based on current conditions
   */
  async generateExtremeWeatherEvent(gameState: GameState): Promise<GameEvent | null> {
    const assessment = this.assessCrisisRisk(gameState);
    
    if (assessment.immediateThreats.length === 0) {
      return null;
    }

    // Select the most severe threat
    const primaryThreat = assessment.immediateThreats.reduce((max, threat) => 
      threat.severity > max.severity ? threat : max
    );

    // Generate event based on threat type
    return await eventService.generateEvent({
      gameState,
      eventType: primaryThreat.type,
      urgency: assessment.riskLevel === 'critical' ? 'high' : 
               assessment.riskLevel === 'high' ? 'medium' : 'low'
    });
  }

  /**
   * Check if conditions warrant triggering an extreme event
   */
  shouldTriggerExtremeEvent(gameState: GameState): boolean {
    const assessment = this.assessCrisisRisk(gameState);
    
    // Trigger based on risk level and random chance
    const triggerProbability = {
      'critical': 0.8,
      'high': 0.4,
      'moderate': 0.15,
      'low': 0.05
    };

    return Math.random() < triggerProbability[assessment.riskLevel];
  }

  /**
   * Get early warning for potential extreme events
   */
  getEarlyWarnings(gameState: GameState): string[] {
    const assessment = this.assessCrisisRisk(gameState);
    const warnings: string[] = [];

    assessment.immediateThreats.forEach(threat => {
      switch (threat.type) {
        case 'drought':
          warnings.push(`Drought conditions developing. Water conservation recommended.`);
          break;
        case 'flood':
          warnings.push(`Heavy rainfall expected. Prepare drainage and evacuation plans.`);
          break;
        case 'cyclone':
          warnings.push(`Cyclone formation detected. Secure property and prepare for evacuation.`);
          break;
        case 'pest_outbreak':
          warnings.push(`Pest activity increasing. Monitor crops closely and prepare treatments.`);
          break;
        case 'equipment_failure':
          warnings.push(`Equipment showing signs of wear. Schedule maintenance immediately.`);
          break;
        case 'health_crisis':
          warnings.push(`Financial stress levels high. Consider seeking support or counseling.`);
          break;
      }
    });

    return warnings;
  }

  // Private helper methods

  private calculateDroughtRisk(weather: WeatherData, season: SeasonData): ExtremeWeatherTrigger {
    const droughtRisk = weather.monsoonPrediction?.droughtRisk || 0;
    const currentRainfall = weather.current?.rainfall || 0;
    const forecastRainfall = weather.forecast?.reduce((sum, day) => sum + day.rainfall, 0) || 0;
    
    let probability = droughtRisk;
    let severity = droughtRisk;

    // Only increase risk if drought risk is already significant
    if (droughtRisk > 0.5) {
      // Increase risk if current conditions are dry
      if (currentRainfall < 2 && forecastRainfall < 10) {
        probability += 0.2;
        severity += 0.1;
      }

      // Season-specific adjustments
      if (season.current === 'Kharif' && season.day > 30) {
        probability += 0.1; // Critical period for monsoon crops
      }
    }

    return {
      type: 'drought',
      probability: Math.min(1, probability),
      severity: Math.min(1, severity),
      conditions: ['Low rainfall', 'High temperatures', 'Monsoon delay']
    };
  }

  private calculateFloodRisk(weather: WeatherData, season: SeasonData): ExtremeWeatherTrigger {
    const floodRisk = weather.monsoonPrediction?.floodRisk || 0;
    const currentRainfall = weather.current?.rainfall || 0;
    const forecastRainfall = weather.forecast?.reduce((sum, day) => sum + day.rainfall, 0) || 0;
    
    let probability = floodRisk;
    let severity = floodRisk;

    // Increase risk if heavy rainfall is occurring or forecast
    if (currentRainfall > 50 || forecastRainfall > 200) {
      probability += 0.4;
      severity += 0.3;
    }

    // Monsoon season increases flood risk
    if (season.current === 'Kharif' && season.day > 15 && season.day < 90) {
      probability += 0.1;
    }

    return {
      type: 'flood',
      probability: Math.min(1, probability),
      severity: Math.min(1, severity),
      conditions: ['Heavy rainfall', 'River overflow', 'Poor drainage']
    };
  }

  private calculatePestRisk(farm: any, season: SeasonData, weather: WeatherData): ExtremeWeatherTrigger {
    let probability = 0.05; // Lower base pest risk
    let severity = 0.2;

    // Higher risk during crop vulnerable stages
    const vulnerableCrops = farm.crops?.filter((crop: any) => 
      crop.growthStage === 'flowering' || crop.growthStage === 'vegetative'
    ).length || 0;

    if (vulnerableCrops > 0) {
      probability += 0.15;
      severity += 0.15;
    }

    // Weather conditions affecting pest risk
    const humidity = weather.current?.humidity || 0;
    const temperature = weather.current?.temperature?.max || 0;

    if (humidity > 85 && temperature > 28 && temperature < 35) {
      probability += 0.25; // Ideal conditions for many pests
      severity += 0.2;
    }

    // Season-specific pest risks
    if (season.current === 'Kharif' && season.day > 30 && season.day < 90) {
      probability += 0.1; // Peak pest season
    }

    return {
      type: 'pest_outbreak',
      probability: Math.min(1, probability),
      severity: Math.min(1, severity),
      conditions: ['High humidity', 'Optimal temperature', 'Vulnerable crops']
    };
  }

  private calculateEquipmentRisk(farm: any): ExtremeWeatherTrigger {
    let probability = 0.05; // Base equipment failure risk
    let severity = 0.4;

    // Check equipment condition
    const poorEquipment = farm.equipment?.filter((eq: any) => eq.condition < 50).length || 0;
    const totalEquipment = farm.equipment?.length || 1;

    if (poorEquipment > 0) {
      probability += (poorEquipment / totalEquipment) * 0.3;
      severity += 0.3;
    }

    // Age and maintenance factors would be considered here
    // For now, using simplified logic

    return {
      type: 'equipment_failure',
      probability: Math.min(1, probability),
      severity: Math.min(1, severity),
      conditions: ['Poor maintenance', 'Old equipment', 'Heavy usage']
    };
  }

  private calculateFinancialCrisisRisk(economics: any, farm: any): { probability: number; severity: number } {
    let probability = 0.1;
    let severity = 0.3;

    const money = farm.money || 0;
    const loans = economics.loans?.length || 0;
    const totalDebt = economics.loans?.reduce((sum: number, loan: any) => sum + loan.remainingAmount, 0) || 0;

    // Low money increases crisis risk
    if (money < 15000) {
      probability += 0.4;
      severity += 0.3;
    }

    // High debt burden
    if (totalDebt > money * 3) {
      probability += 0.3;
      severity += 0.4;
    }

    // Multiple loans indicate financial stress
    if (loans > 2) {
      probability += 0.2;
      severity += 0.2;
    }

    return {
      probability: Math.min(1, probability),
      severity: Math.min(1, severity)
    };
  }

  private generateRecommendations(threats: ExtremeWeatherTrigger[]): string[] {
    const recommendations: string[] = [];

    threats.forEach(threat => {
      switch (threat.type) {
        case 'drought':
          recommendations.push('Install water-efficient irrigation systems');
          recommendations.push('Consider drought-resistant crop varieties');
          break;
        case 'flood':
          recommendations.push('Improve farm drainage systems');
          recommendations.push('Prepare evacuation plans for livestock');
          break;
        case 'pest_outbreak':
          recommendations.push('Implement integrated pest management');
          recommendations.push('Monitor crops daily for early detection');
          break;
        case 'equipment_failure':
          recommendations.push('Schedule immediate equipment maintenance');
          recommendations.push('Consider equipment insurance');
          break;
        case 'health_crisis':
          recommendations.push('Seek financial counseling');
          recommendations.push('Explore government support schemes');
          break;
      }
    });

    return recommendations;
  }

  private calculateTimeToAct(threats: ExtremeWeatherTrigger[]): number {
    if (threats.length === 0) return 168; // 1 week default

    const maxSeverity = Math.max(...threats.map(t => t.severity));
    
    // More severe threats require faster action
    if (maxSeverity > 0.8) return 24; // 1 day
    if (maxSeverity > 0.6) return 48; // 2 days
    if (maxSeverity > 0.4) return 72; // 3 days
    return 120; // 5 days
  }
}

// Export singleton instance
export const extremeWeatherService = ExtremeWeatherService.getInstance();