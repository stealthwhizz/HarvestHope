/**
 * Event Service Tests
 * Tests for event generation, resolution, and consequence tracking
 */

import { eventService } from '../eventService';
import type { GameEvent, GameState, EventChoice } from '../../../../shared/types/game-state';

// Mock fetch for testing
global.fetch = jest.fn();

describe('EventService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    eventService.clearCache();
  });

  const mockGameState: Partial<GameState> = {
    player: {
      id: 'test-player',
      name: 'Test Farmer',
      createdAt: '2024-01-01',
      lastPlayed: '2024-01-01',
    },
    farm: {
      money: 50000,
      day: 30,
      season: 'Kharif',
      year: 1,
      landArea: 10,
      soilQuality: 75,
      crops: [],
      storedCrops: [],
      livestock: [],
      equipment: [],
      storageCapacity: {
        farm: 1000,
        warehouse: 5000,
        cold_storage: 2000
      }
    },
    season: {
      current: 'Kharif',
      day: 30,
      daysRemaining: 90,
      nextSeason: 'Rabi',
    },
  };

  const mockEvent: GameEvent = {
    id: 'test-event-1',
    type: 'weather_warning',
    title: 'Drought Warning',
    description: 'Meteorological department has issued a drought warning.',
    educational_content: 'Drought management is crucial for farmers.',
    choices: [
      {
        id: 'drill_borewell',
        text: 'Drill a new borewell (₹50,000)',
        cost: 50000,
        consequences: { water_access: 30, debt: 50000 },
      },
      {
        id: 'wait',
        text: 'Wait for rain',
        cost: 0,
        consequences: { crop_risk: 60 },
      },
    ],
    timestamp: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    severity: 'high',
    category: 'weather_crisis',
  };

  describe('generateEvent', () => {
    it('should generate an event successfully', async () => {
      const mockResponse = {
        event: mockEvent,
        message: 'Event generated successfully',
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await eventService.generateEvent({ gameState: mockGameState });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/events/generate'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('generate'),
        })
      );

      expect(result).toEqual(mockEvent);
      
      // Check that the event is cached
      const activeEvents = eventService.getActiveEvents();
      expect(activeEvents).toHaveLength(1);
      expect(activeEvents[0]).toEqual(mockEvent);
    });

    it('should return fallback event when API fails', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await eventService.generateEvent({ gameState: mockGameState });

      expect(result).toBeDefined();
      expect(result.type).toBe('weather_warning');
      expect(result.choices).toHaveLength(2);
    });

    it('should handle different game state contexts', async () => {
      const lowMoneyState = {
        ...mockGameState,
        farm: { ...mockGameState.farm!, money: 5000 },
      };

      const mockResponse = {
        event: { ...mockEvent, category: 'financial_crisis' },
        message: 'Event generated successfully',
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await eventService.generateEvent({ gameState: lowMoneyState });

      expect(result.category).toBe('financial_crisis');
    });
  });

  describe('resolveEvent', () => {
    it('should resolve event choice successfully', async () => {
      const mockConsequences = {
        immediate_effects: { money_change: -50000 },
        long_term_effects: { water_access: 30 },
        educational_impact: {
          topic: 'drought_management',
          lesson_learned: 'Investing in water infrastructure is crucial.',
          awareness_increased: true,
        },
        choice_made: 'Drill a new borewell (₹50,000)',
        cost: 50000,
      };

      const mockResponse = {
        consequences: mockConsequences,
        message: 'Event resolved successfully',
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      // Add event to cache first
      eventService['eventCache'].set(mockEvent.id, mockEvent);

      const result = await eventService.resolveEvent({
        event: mockEvent,
        choiceId: 'drill_borewell',
        gameState: mockGameState,
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/events/resolve'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('resolve'),
        })
      );

      expect(result).toEqual(mockConsequences);
      expect(eventService.getEventHistory()).toHaveLength(1);
      expect(eventService.getActiveEvents()).not.toContain(mockEvent);
    });

    it('should return fallback consequences when API fails', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await eventService.resolveEvent({
        event: mockEvent,
        choiceId: 'wait',
        gameState: mockGameState,
      });

      expect(result).toBeDefined();
      expect(result.choice_made).toBe('Wait for rain');
      expect(result.cost).toBe(0);
    });
  });

  describe('isChoiceAvailable', () => {
    it('should return true for affordable choices', () => {
      const result = eventService.isChoiceAvailable(mockEvent, 'wait', mockGameState);
      expect(result).toBe(true);
    });

    it('should return true for choices without requirements', () => {
      const result = eventService.isChoiceAvailable(mockEvent, 'drill_borewell', mockGameState);
      expect(result).toBe(true);
    });

    it('should handle choices with money requirements', () => {
      const expensiveChoice: EventChoice = {
        id: 'expensive',
        text: 'Expensive option',
        cost: 100000,
        consequences: {},
        requirements: [
          { type: 'money', value: 100000, operator: 'gte' },
        ],
      };

      const eventWithRequirements: GameEvent = {
        ...mockEvent,
        choices: [expensiveChoice],
      };

      const result = eventService.isChoiceAvailable(
        eventWithRequirements,
        'expensive',
        mockGameState
      );

      expect(result).toBe(false);
    });
  });

  describe('applyConsequences', () => {
    it('should apply financial consequences correctly', () => {
      const consequences = {
        immediate_effects: { money_change: -25000, debt_increase: 10000 },
        long_term_effects: { social_standing: 10 },
        educational_impact: {
          topic: 'financial_management',
          lesson_learned: 'Debt management is important.',
          awareness_increased: true,
        },
        choice_made: 'Test choice',
        cost: 25000,
      };

      const fullGameState: GameState = {
        ...mockGameState,
        events: {
          activeEvents: [],
          eventHistory: [],
          pendingConsequences: [],
          educationalProgress: {},
        },
        economics: {
          bankAccount: 100000,
          loans: [],
          income: [],
          expenses: [],
          creditScore: 750,
          governmentBenefits: [],
        },
        weather: {
          current: {
            date: '2024-01-01',
            temperature: { min: 20, max: 35 },
            humidity: 60,
            rainfall: 0,
            windSpeed: 10,
            conditions: 'sunny',
          },
          forecast: [],
          monsoonPrediction: {
            strength: 'moderate',
            arrivalDate: '2024-06-15',
            totalRainfall: 800,
            droughtRisk: 20,
            floodRisk: 10,
            confidence: 75,
          },
          extremeEvents: [],
        },
        npcs: [],
        stats: {
          totalPlayTime: 0,
          seasonsCompleted: 0,
          totalIncome: 0,
          totalExpenses: 0,
          cropsHarvested: 0,
          loansRepaid: 0,
          npcRelationships: 0,
        },
        progress: {
          achievements: [],
          unlockedFeatures: [],
          educationalContent: [],
        },
      } as GameState;

      const result = eventService.applyConsequences(consequences, fullGameState);

      expect(result.farm.money).toBe(25000); // 50000 - 25000
      expect(result.economics.bankAccount).toBe(90000); // 100000 - 10000
      expect(result.events.educationalProgress.financial_management).toBeDefined();
      expect(result.events.educationalProgress.financial_management.eventsExperienced).toBe(1);
    });

    it('should apply crop yield consequences', () => {
      const consequences = {
        immediate_effects: { yield_change: 20 },
        long_term_effects: {},
        educational_impact: {
          topic: 'crop_management',
          lesson_learned: 'Proper care increases yield.',
          awareness_increased: true,
        },
        choice_made: 'Test choice',
        cost: 0,
      };

      const gameStateWithCrops: GameState = {
        ...mockGameState,
        farm: {
          ...mockGameState.farm!,
          crops: [
            {
              id: 'crop1',
              type: 'rice',
              plantedDate: 1,
              growthStage: 'vegetative',
              health: 100,
              expectedYield: 100,
              area: 2,
            },
          ],
        },
        events: {
          activeEvents: [],
          eventHistory: [],
          pendingConsequences: [],
          educationalProgress: {},
        },
      } as GameState;

      const result = eventService.applyConsequences(consequences, gameStateWithCrops);

      expect(result.farm.crops[0].expectedYield).toBe(120); // 100 * 1.2
    });
  });

  describe('getEducationalInsights', () => {
    it('should calculate educational insights from event history', () => {
      // Simulate some event resolutions
      eventService['resolutionHistory'] = [
        {
          eventId: 'event1',
          choiceId: 'choice1',
          timestamp: '2024-01-01',
          consequences: {
            immediate_effects: {},
            long_term_effects: {},
            educational_impact: {
              topic: 'drought_management',
              lesson_learned: 'Water conservation is important.',
              awareness_increased: true,
            },
            choice_made: 'Test',
            cost: 0,
          },
        },
        {
          eventId: 'event2',
          choiceId: 'choice2',
          timestamp: '2024-01-02',
          consequences: {
            immediate_effects: {},
            long_term_effects: {},
            educational_impact: {
              topic: 'drought_management',
              lesson_learned: 'Drip irrigation saves water.',
              awareness_increased: true,
            },
            choice_made: 'Test',
            cost: 0,
          },
        },
      ];

      const insights = eventService.getEducationalInsights();

      expect(insights).toHaveLength(1);
      expect(insights[0].topic).toBe('drought_management');
      expect(insights[0].insights).toHaveLength(2);
      expect(insights[0].masteryLevel).toBe(20); // 2 events * 10
    });
  });

  describe('event expiration', () => {
    it('should remove expired events from active list', () => {
      const expiredEvent: GameEvent = {
        ...mockEvent,
        id: 'expired-event',
        expires_at: '2020-01-01T00:00:00Z', // Past date
      };

      eventService['eventCache'].set(expiredEvent.id, expiredEvent);
      
      const activeEvents = eventService.getActiveEvents();
      
      expect(activeEvents).not.toContain(expiredEvent);
      expect(eventService['eventCache'].has(expiredEvent.id)).toBe(false);
    });

    it('should keep non-expired events in active list', () => {
      const futureEvent: GameEvent = {
        ...mockEvent,
        id: 'future-event',
        expires_at: '2030-01-01T00:00:00Z', // Future date
      };

      eventService['eventCache'].set(futureEvent.id, futureEvent);
      
      const activeEvents = eventService.getActiveEvents();
      
      expect(activeEvents).toContain(futureEvent);
    });
  });
});