/**
 * Tests for SaveGameManager component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SaveGameManager from '../SaveGameManager';
import * as persistenceService from '../../store/services/persistenceService';
import type { GameState } from '../../../../shared/types/game-state';

// Mock the persistence service
jest.mock('../../store/services/persistenceService');

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

const mockSaveSlots = [
  {
    saveSlot: 'slot1',
    lastSaved: '2023-01-01T00:00:00Z',
    farmName: 'Test Farm 1',
    season: 'Kharif',
    day: 1,
    money: 50000,
    checksum: 'abc123',
    deviceId: 'device1',
    version: '1.0.0'
  },
  {
    saveSlot: 'slot2',
    lastSaved: '2023-01-02T00:00:00Z',
    farmName: 'Test Farm 2',
    season: 'Rabi',
    day: 30,
    money: 75000,
    checksum: 'def456',
    deviceId: 'device1',
    version: '1.0.0'
  }
];

describe('SaveGameManager', () => {
  const mockOnLoadGame = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (persistenceService.getSaveSlots as jest.Mock).mockResolvedValue({
      success: true,
      saveSlots: mockSaveSlots
    });
    (persistenceService.checkSyncStatus as jest.Mock).mockResolvedValue({
      online: true,
      needsSync: 0
    });
  });

  it('should render when open', async () => {
    render(
      <SaveGameManager
        playerId="test-player"
        currentGameState={mockGameState}
        onLoadGame={mockOnLoadGame}
        onClose={mockOnClose}
        isOpen={true}
      />
    );

    expect(screen.getByText('Save Game Manager')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Test Farm 1')).toBeInTheDocument();
      expect(screen.getByText('Test Farm 2')).toBeInTheDocument();
    });
  });

  it('should not render when closed', () => {
    render(
      <SaveGameManager
        playerId="test-player"
        currentGameState={mockGameState}
        onLoadGame={mockOnLoadGame}
        onClose={mockOnClose}
        isOpen={false}
      />
    );

    expect(screen.queryByText('Save Game Manager')).not.toBeInTheDocument();
  });

  it('should show sync status', async () => {
    (persistenceService.checkSyncStatus as jest.Mock).mockResolvedValue({
      online: false,
      needsSync: 2
    });

    render(
      <SaveGameManager
        playerId="test-player"
        currentGameState={mockGameState}
        onLoadGame={mockOnLoadGame}
        onClose={mockOnClose}
        isOpen={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Offline (2 need sync)')).toBeInTheDocument();
      expect(screen.getByText('Sync Now')).toBeInTheDocument();
    });
  });

  it('should handle load game', async () => {
    (persistenceService.loadGameState as jest.Mock).mockResolvedValue({
      success: true,
      gameState: mockGameState
    });

    render(
      <SaveGameManager
        playerId="test-player"
        currentGameState={mockGameState}
        onLoadGame={mockOnLoadGame}
        onClose={mockOnClose}
        isOpen={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Farm 1')).toBeInTheDocument();
    });

    const loadButton = screen.getAllByText('Load')[0];
    fireEvent.click(loadButton);

    await waitFor(() => {
      expect(persistenceService.loadGameState).toHaveBeenCalledWith('test-player', 'slot1');
      expect(mockOnLoadGame).toHaveBeenCalledWith(mockGameState, 'slot1');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should handle save game', async () => {
    (persistenceService.saveGameState as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Saved successfully'
    });

    render(
      <SaveGameManager
        playerId="test-player"
        currentGameState={mockGameState}
        onLoadGame={mockOnLoadGame}
        onClose={mockOnClose}
        isOpen={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Farm 1')).toBeInTheDocument();
    });

    const overwriteButton = screen.getAllByText('Overwrite')[0];
    fireEvent.click(overwriteButton);

    await waitFor(() => {
      expect(persistenceService.saveGameState).toHaveBeenCalledWith(mockGameState, 'slot1');
    });
  });

  it('should show create new save slot form', async () => {
    render(
      <SaveGameManager
        playerId="test-player"
        currentGameState={mockGameState}
        onLoadGame={mockOnLoadGame}
        onClose={mockOnClose}
        isOpen={true}
      />
    );

    // Wait for save slots to load first
    await waitFor(() => {
      expect(screen.getByText('Test Farm 1')).toBeInTheDocument();
    });

    const createButton = screen.getByText('Create New Save Slot');
    fireEvent.click(createButton);

    expect(screen.getByText('Create New Save Slot')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter farm name...')).toBeInTheDocument();
  });

  it('should handle close', () => {
    render(
      <SaveGameManager
        playerId="test-player"
        currentGameState={mockGameState}
        onLoadGame={mockOnLoadGame}
        onClose={mockOnClose}
        isOpen={true}
      />
    );

    const closeButton = screen.getByText('×');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });
});