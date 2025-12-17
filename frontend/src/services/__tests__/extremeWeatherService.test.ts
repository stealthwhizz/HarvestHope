/**
 * Tests for Extreme Weather Service
 * Validates crisis assessment and extreme weather event generation
 */

import { extremeWeatherService } from '../extremeWeatherService';
import type { GameState } from '../../../../shared/types/game-state';

// Mock the event service
jest.mock('../eventService', () => ({
  eventService: {
    generateEvent: jest.fn().mockResolvedValue({
      id: 'test-extreme-event',
      type: 'severe_drought',
      title: 'Severe Drought Emergency',
      description: 'Critical drought conditions detected',
      choices: [],
      timestamp: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      severity: 'critical',
      category: 'extreme_weather'
    })
  }
}));

describe('ExtremeWeatherService', () => {
  const createMockGameState = (overrides: Partial<GameState> = {}): GameState => ({
    player: {
      id: 'test-player',
      name: 'Test Farmer',
      createdAt: '2024-01-01',
      lastPlayed: '2024-01-01'
    },
    farm: {
      money: 50000,
      day: 45,
      season: 'Kharif',
      year: 1,
      landArea: 5,
      soilQuality: 75,
      crops: [
        {
          id: 'crop1',
          type: 'rice',
          plantedDate: 30,
          growthStage: 'flowering',
          health: 80,
          expectedYield: 1000,
          area: 2
        }
      ],
      storedCrops: [],
      livestock: [],
      equipment: [
        {
          id: 'tractor1',
          type: 'tractor',
          condition: 60,
          maintenanceCost: 5000
        }
      ],
      storageCapacity: {
        farm: 1000,
        warehouse: 5000,
        cold_storage: 2000
      }
    },
    economics: {
      bankAccount: 45000,
      loans: [
        {
          id: 'loan1',
          type: 'bank',
          principal: 100000,
          interestRate: 7,
          emiAmount: 5000,
          remainingAmount: 80000,
          dueDate: '2024-12-31',
          penalties: 0
        }
      ],
      income: [],
      expenses: [],
      creditScore: 650,
      governmentBenefits: []
    },
    season: {
      current: 'Kharif',
      day: 45,
      daysRemaining: 75,
      nextSeason: 'Rabi'
    },
    weather: {
      current: {
        date: '2024-07-15',
        temperature: { min: 25, max: 35 },
        humidity: 85,
        rainfall: 0.5,
        windSpeed: 15,
        conditions: 'clear'
      },
      forecast: [
        {
          date: '2024-07-16',
          temperature: { min: 26, max: 36 },
          humidity: 80,
          rainfall: 0,
          windSpeed: 12,
          conditions: 'clear'
        }
      ],
      monsoonPrediction: {
        strength: 'weak',
        arrivalDate: '2024-06-15',
        totalRainfall: 400,
        droughtRisk: 0.7,
        floodRisk: 0.1,
        confidence: 0.8
      },
      extremeEvents: []
    },
    npcs: [],
    events: {
      activeEvents: [],
      eventHistory: [],
      pendingConsequences: [],
      educationalProgress: {}
    },
    stats: {
      totalPlayTime: 0,
      seasonsCompleted: 0,
      totalIncome: 0,
      totalExpenses: 0,
      cropsHarvested: 0,
      loansRepaid: 0,
      npcRelationships: 0
    },
    progress: {
      achievements: [],
      unlockedFeatures: [],
      educationalContent: []
    },
    ...overrides
  });

  describe('assessCrisisRisk', () => {
    it('should identify drought risk correctly', () => {
      const gameState = createMockGameState({
        weather: {
          ...createMockGameState().weather,
          current: {
            date: '2024-07-15',
            temperature: { min: 25, max: 35 },
            humidity: 40, // Low humidity for drought
            rainfall: 0, // No rain
            windSpeed: 15,
            conditions: 'clear'
          },
          forecast: [
            {
              date: '2024-07-16',
              temperature: { min: 26, max: 36 },
              humidity: 35,
              rainfall: 0, // No forecast rain
              windSpeed: 12,
              conditions: 'clear'
            }
          ],
          monsoonPrediction: {
            strength: 'weak',
            arrivalDate: '2024-06-15',
            totalRainfall: 300,
            droughtRisk: 0.8,
            floodRisk: 0.1,
            confidence: 0.9
          }
        }
      });

      const assessment = extremeWeatherService.assessCrisisRisk(gameState);

      const droughtThreat = assessment.immediateThreats.find(t => t.type === 'drought');
      expect(droughtThreat).toBeDefined();
      expect(droughtThreat?.probability).toBeGreaterThan(0.3);
      expect(assessment.riskLevel).toBe('critical');
    });

    it('should identify flood risk correctly', () => {
      const gameState = createMockGameState({
        weather: {
          ...createMockGameState().weather,
          current: {
            date: '2024-07-15',
            temperature: { min: 25, max: 30 },
            humidity: 95,
            rainfall: 80,
            windSpeed: 25,
            conditions: 'heavy_rain'
          },
          monsoonPrediction: {
            strength: 'strong',
            arrivalDate: '2024-06-15',
            totalRainfall: 1500,
            droughtRisk: 0.1,
            floodRisk: 0.6,
            confidence: 0.8
          }
        }
      });

      const assessment = extremeWeatherService.assessCrisisRisk(gameState);

      const floodThreat = assessment.immediateThreats.find(t => t.type === 'flood');
      expect(floodThreat).toBeDefined();
      expect(floodThreat?.probability).toBeGreaterThan(0.2);
    });

    it('should identify pest risk during vulnerable crop stages', () => {
      const gameState = createMockGameState({
        farm: {
          ...createMockGameState().farm,
          crops: [
            {
              id: 'crop1',
              type: 'cotton',
              plantedDate: 30,
              growthStage: 'flowering',
              health: 80,
              expectedYield: 800,
              area: 3
            }
          ]
        },
        weather: {
          ...createMockGameState().weather,
          current: {
            date: '2024-07-15',
            temperature: { min: 25, max: 32 },
            humidity: 85,
            rainfall: 5,
            windSpeed: 10,
            conditions: 'light_rain'
          }
        }
      });

      const assessment = extremeWeatherService.assessCrisisRisk(gameState);

      const pestThreat = assessment.immediateThreats.find(t => t.type === 'pest_outbreak');
      expect(pestThreat).toBeDefined();
      expect(pestThreat?.probability).toBeGreaterThan(0.25);
    });

    it('should identify equipment failure risk', () => {
      const gameState = createMockGameState({
        farm: {
          ...createMockGameState().farm,
          equipment: [
            {
              id: 'tractor1',
              type: 'tractor',
              condition: 30, // Poor condition
              maintenanceCost: 8000
            }
          ]
        }
      });

      const assessment = extremeWeatherService.assessCrisisRisk(gameState);

      const equipmentThreat = assessment.immediateThreats.find(t => t.type === 'equipment_failure');
      expect(equipmentThreat).toBeDefined();
      expect(equipmentThreat?.probability).toBeGreaterThan(0.15);
    });

    it('should identify financial crisis risk', () => {
      const gameState = createMockGameState({
        farm: {
          ...createMockGameState().farm,
          money: 8000 // Very low money
        },
        economics: {
          ...createMockGameState().economics,
          loans: [
            {
              id: 'loan1',
              type: 'bank',
              principal: 100000,
              interestRate: 7,
              emiAmount: 5000,
              remainingAmount: 90000,
              dueDate: '2024-12-31',
              penalties: 0
            },
            {
              id: 'loan2',
              type: 'moneylender',
              principal: 50000,
              interestRate: 36,
              emiAmount: 8000,
              remainingAmount: 45000,
              dueDate: '2024-11-30',
              penalties: 2000
            }
          ]
        }
      });

      const assessment = extremeWeatherService.assessCrisisRisk(gameState);

      const healthThreat = assessment.immediateThreats.find(t => t.type === 'health_crisis');
      expect(healthThreat).toBeDefined();
      expect(assessment.riskLevel).toBe('critical');
    });

    it('should return low risk for stable conditions', () => {
      const gameState = createMockGameState({
        farm: {
          ...createMockGameState().farm,
          money: 100000, // Good financial position
          crops: [
            {
              id: 'crop1',
              type: 'rice',
              plantedDate: 30,
              growthStage: 'mature', // Not vulnerable stage
              health: 90,
              expectedYield: 1000,
              area: 2
            }
          ],
          equipment: [
            {
              id: 'tractor1',
              type: 'tractor',
              condition: 85, // Good condition
              maintenanceCost: 3000
            }
          ]
        },
        weather: {
          ...createMockGameState().weather,
          current: {
            date: '2024-07-15',
            temperature: { min: 25, max: 30 },
            humidity: 70, // Moderate humidity
            rainfall: 10, // Some rain
            windSpeed: 15,
            conditions: 'light_rain'
          },
          monsoonPrediction: {
            strength: 'moderate',
            arrivalDate: '2024-06-15',
            totalRainfall: 800,
            droughtRisk: 0.2,
            floodRisk: 0.1,
            confidence: 0.8
          }
        },
        economics: {
          ...createMockGameState().economics,
          loans: [] // No debt
        }
      });

      const assessment = extremeWeatherService.assessCrisisRisk(gameState);

      expect(assessment.riskLevel).toBe('low');
      expect(assessment.immediateThreats).toHaveLength(0);
    });
  });

  describe('shouldTriggerExtremeEvent', () => {
    it('should trigger events for critical risk levels', () => {
      const gameState = createMockGameState({
        weather: {
          ...createMockGameState().weather,
          monsoonPrediction: {
            strength: 'weak',
            arrivalDate: '2024-06-15',
            totalRainfall: 200,
            droughtRisk: 0.9,
            floodRisk: 0.1,
            confidence: 0.9
          }
        }
      });

      // Test multiple times due to randomness
      let triggered = false;
      for (let i = 0; i < 10; i++) {
        if (extremeWeatherService.shouldTriggerExtremeEvent(gameState)) {
          triggered = true;
          break;
        }
      }

      expect(triggered).toBe(true);
    });

    it('should rarely trigger events for low risk levels', () => {
      const gameState = createMockGameState({
        farm: {
          ...createMockGameState().farm,
          money: 200000
        },
        weather: {
          ...createMockGameState().weather,
          monsoonPrediction: {
            strength: 'moderate',
            arrivalDate: '2024-06-15',
            totalRainfall: 800,
            droughtRisk: 0.1,
            floodRisk: 0.1,
            confidence: 0.8
          }
        }
      });

      // Test multiple times - should rarely trigger
      let triggerCount = 0;
      for (let i = 0; i < 20; i++) {
        if (extremeWeatherService.shouldTriggerExtremeEvent(gameState)) {
          triggerCount++;
        }
      }

      expect(triggerCount).toBeLessThan(5); // Should be rare
    });
  });

  describe('getEarlyWarnings', () => {
    it('should provide appropriate warnings for drought conditions', () => {
      const gameState = createMockGameState({
        weather: {
          ...createMockGameState().weather,
          monsoonPrediction: {
            strength: 'weak',
            arrivalDate: '2024-06-15',
            totalRainfall: 300,
            droughtRisk: 0.7,
            floodRisk: 0.1,
            confidence: 0.8
          }
        }
      });

      const warnings = extremeWeatherService.getEarlyWarnings(gameState);

      expect(warnings).toContain('Drought conditions developing. Water conservation recommended.');
    });

    it('should provide appropriate warnings for pest risks', () => {
      const gameState = createMockGameState({
        farm: {
          ...createMockGameState().farm,
          crops: [
            {
              id: 'crop1',
              type: 'cotton',
              plantedDate: 30,
              growthStage: 'flowering',
              health: 80,
              expectedYield: 800,
              area: 3
            }
          ]
        },
        weather: {
          ...createMockGameState().weather,
          current: {
            date: '2024-07-15',
            temperature: { min: 25, max: 32 },
            humidity: 90, // Higher humidity for pest risk
            rainfall: 5,
            windSpeed: 10,
            conditions: 'light_rain'
          }
        }
      });

      const warnings = extremeWeatherService.getEarlyWarnings(gameState);

      expect(warnings.some(w => w.includes('Pest'))).toBe(true);
    });

    it('should return empty warnings for stable conditions', () => {
      const gameState = createMockGameState({
        farm: {
          ...createMockGameState().farm,
          money: 150000,
          crops: [
            {
              id: 'crop1',
              type: 'rice',
              plantedDate: 30,
              growthStage: 'mature', // Not vulnerable
              health: 90,
              expectedYield: 1000,
              area: 2
            }
          ],
          equipment: [
            {
              id: 'tractor1',
              type: 'tractor',
              condition: 85, // Good condition
              maintenanceCost: 3000
            }
          ]
        },
        weather: {
          ...createMockGameState().weather,
          current: {
            date: '2024-07-15',
            temperature: { min: 25, max: 30 },
            humidity: 70, // Moderate humidity
            rainfall: 10,
            windSpeed: 15,
            conditions: 'light_rain'
          },
          monsoonPrediction: {
            strength: 'moderate',
            arrivalDate: '2024-06-15',
            totalRainfall: 800,
            droughtRisk: 0.2,
            floodRisk: 0.1,
            confidence: 0.8
          }
        },
        economics: {
          ...createMockGameState().economics,
          loans: []
        }
      });

      const warnings = extremeWeatherService.getEarlyWarnings(gameState);

      expect(warnings).toHaveLength(0);
    });
  });

  describe('generateExtremeWeatherEvent', () => {
    it('should generate event for high-risk conditions', async () => {
      const gameState = createMockGameState({
        weather: {
          ...createMockGameState().weather,
          monsoonPrediction: {
            strength: 'weak',
            arrivalDate: '2024-06-15',
            totalRainfall: 250,
            droughtRisk: 0.8,
            floodRisk: 0.1,
            confidence: 0.9
          }
        }
      });

      const event = await extremeWeatherService.generateExtremeWeatherEvent(gameState);

      expect(event).toBeDefined();
      expect(event?.category).toBe('extreme_weather');
      expect(event?.severity).toBe('critical');
    });

    it('should return null for low-risk conditions', async () => {
      const gameState = createMockGameState({
        farm: {
          ...createMockGameState().farm,
          money: 200000,
          crops: [
            {
              id: 'crop1',
              type: 'rice',
              plantedDate: 30,
              growthStage: 'mature', // Not vulnerable
              health: 90,
              expectedYield: 1000,
              area: 2
            }
          ],
          equipment: [
            {
              id: 'tractor1',
              type: 'tractor',
              condition: 85, // Good condition
              maintenanceCost: 3000
            }
          ]
        },
        weather: {
          ...createMockGameState().weather,
          current: {
            date: '2024-07-15',
            temperature: { min: 25, max: 30 },
            humidity: 70,
            rainfall: 10,
            windSpeed: 15,
            conditions: 'light_rain'
          },
          monsoonPrediction: {
            strength: 'moderate',
            arrivalDate: '2024-06-15',
            totalRainfall: 800,
            droughtRisk: 0.1,
            floodRisk: 0.1,
            confidence: 0.8
          }
        },
        economics: {
          ...createMockGameState().economics,
          loans: []
        }
      });

      const event = await extremeWeatherService.generateExtremeWeatherEvent(gameState);

      expect(event).toBeNull();
    });
  });
});