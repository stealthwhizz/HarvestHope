/**
 * Tests for persistence service
 */

import { saveGameState, loadGameState } from '../persistenceService';
import type { GameState } from '../../../../../shared/types/game-state';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock fetch
Object.defineProperty(globalThis, 'fetch', {
  value: jest.fn(),
  writable: true,
});

const mockGameState: GameState = {
  player: {
    id: 'test-player',
    name: 'Test Player',
    createdAt: '2023-01-01T00:00:00Z',
    lastPlayed: '2023-01-01T00:00:00Z',
  },
  farm: {
    money: 50000,
    day: 1,
    season: 'Kharif',
    year: 1,
    landArea: 2,
    soilQuality: 0.7,
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
  economics: {
    bankAccount: 50000,
    loans: [],
    income: [],
    expenses: [],
    creditScore: 750,
    governmentBenefits: [],
  },
  season: {
    current: 'Kharif',
    day: 1,
    daysRemaining: 119,
    nextSeason: 'Rabi',
  },
  weather: {
    current: {
      date: '2023-01-01',
      temperature: { min: 20, max: 35 },
      humidity: 60,
      rainfall: 0,
      windSpeed: 10,
      conditions: 'clear',
    },
    forecast: [],
    monsoonPrediction: {
      strength: 'moderate',
      arrivalDate: '',
      totalRainfall: 800,
      droughtRisk: 0.2,
      floodRisk: 0.1,
      confidence: 0.7,
    },
    extremeEvents: [],
  },
  npcs: [],
  events: {
    activeEvents: [],
    eventHistory: [],
    pendingConsequences: [],
    educationalProgress: {},
  },
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
};

describe('PersistenceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveGameState', () => {
    test('should save to localStorage when API fails', async () => {
      // Mock fetch to fail
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await saveGameState(mockGameState);

      expect(result.success).toBe(true);
      expect(result.message).toContain('local storage');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'harvest-hope-save-test-player-slot1',
        expect.stringContaining('test-player')
      );
    });

    test('should handle localStorage failure', async () => {
      // Mock fetch to fail
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      // First call for device ID should succeed, second call for save should fail
      let callCount = 0;
      localStorageMock.setItem.mockImplementation(() => {
        callCount++;
        if (callCount === 2) { // Second call is for saving game state
          throw new Error('Storage quota exceeded');
        }
      });

      const result = await saveGameState(mockGameState);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to save game state both online and offline');
    });
  });

  describe('loadGameState', () => {
    test('should load from localStorage when API fails', async () => {
      // Mock fetch to fail
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      // Mock localStorage to return saved data
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        gameState: mockGameState,
        timestamp: '2023-01-01T00:00:00Z',
      }));

      const result = await loadGameState('test-player');

      expect(result.success).toBe(true);
      expect(result.gameState).toEqual(mockGameState);
      expect(result.message).toContain('local storage');
    });

    test('should return failure when no save found', async () => {
      // Mock fetch to fail
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      // Mock localStorage to return null
      localStorageMock.getItem.mockReturnValue(null);

      const result = await loadGameState('test-player');

      expect(result.success).toBe(false);
      expect(result.message).toContain('No saved game found');
    });
  });
});