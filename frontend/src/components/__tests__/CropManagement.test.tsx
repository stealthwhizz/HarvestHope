/**
 * Integration tests for Crop Management Component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import CropManagement from '../CropManagement';
import { farmReducer } from '../../store/slices/farmSlice';
import { seasonReducer } from '../../store/slices/seasonSlice';
import { weatherReducer } from '../../store/slices/weatherSlice';

// Create a test store
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      farm: farmReducer,
      season: seasonReducer,
      weather: weatherReducer,
    },
    preloadedState: {
      farm: {
        money: 50000,
        day: 1,
        season: 'Kharif' as const,
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
      season: {
        current: 'Kharif' as const,
        day: 1,
        daysRemaining: 119,
        nextSeason: 'Rabi' as const,
        scheduledEvents: [],
        seasonTransitionData: undefined,
      },
      weather: {
        current: {
          date: '2024-01-01',
          temperature: { min: 20, max: 30 },
          humidity: 60,
          rainfall: 25,
          windSpeed: 10,
          conditions: 'clear' as const,
        },
        forecast: [],
        monsoonPrediction: {
          strength: 'moderate' as const,
          arrivalDate: '',
          totalRainfall: 800,
          droughtRisk: 0.2,
          floodRisk: 0.1,
          confidence: 0.7,
        },
        extremeEvents: [],
      },
      ...initialState,
    },
  });
};

describe('CropManagement Component', () => {
  it('should render crop management interface', () => {
    const store = createTestStore();
    
    render(
      <Provider store={store}>
        <CropManagement />
      </Provider>
    );

    expect(screen.getByText('Crop Management')).toBeInTheDocument();
    expect(screen.getByText('Plant Crop')).toBeInTheDocument();
    expect(screen.getByText('Current Crops (0)')).toBeInTheDocument();
  });

  it('should show available crops for current season', () => {
    const store = createTestStore();
    
    render(
      <Provider store={store}>
        <CropManagement />
      </Provider>
    );

    // Check season info shows Kharif crops
    expect(screen.getByText(/Current Season: Kharif/)).toBeInTheDocument();
    expect(screen.getByText(/Available crops for this season: Rice, Cotton, Sugarcane, Soybean, Onion/)).toBeInTheDocument();
  });

  it('should open planting modal when plant crop button is clicked', async () => {
    const store = createTestStore();
    
    render(
      <Provider store={store}>
        <CropManagement />
      </Provider>
    );

    const plantButton = screen.getByText('Plant Crop');
    fireEvent.click(plantButton);

    await waitFor(() => {
      expect(screen.getByText('Plant New Crop')).toBeInTheDocument();
      expect(screen.getByText('Crop Type')).toBeInTheDocument();
      expect(screen.getByText('Area (acres)')).toBeInTheDocument();
    });
  });

  it('should display planted crops', () => {
    const storeWithCrops = createTestStore({
      farm: {
        money: 50000,
        day: 1,
        season: 'Kharif',
        year: 1,
        landArea: 2,
        soilQuality: 0.7,
        crops: [{
          id: 'test-crop-1',
          type: 'rice',
          plantedDate: 1,
          growthStage: 'seedling',
          health: 85,
          expectedYield: 2500,
          area: 1,
        }],
        livestock: [],
        equipment: [],
      },
    });
    
    render(
      <Provider store={storeWithCrops}>
        <CropManagement />
      </Provider>
    );

    expect(screen.getByText('Current Crops (1)')).toBeInTheDocument();
    expect(screen.getByText('Rice')).toBeInTheDocument();
    expect(screen.getByText('85% Health')).toBeInTheDocument();
    expect(screen.getByText('Stage:')).toBeInTheDocument();
    expect(screen.getByText('seedling')).toBeInTheDocument();
  });

  it('should show no crops message when no crops are planted', () => {
    const store = createTestStore();
    
    render(
      <Provider store={store}>
        <CropManagement />
      </Provider>
    );

    expect(screen.getByText('No crops planted yet')).toBeInTheDocument();
  });

  it('should disable plant button when no crops available for season', () => {
    const storeWithOffSeason = createTestStore({
      season: {
        current: 'Off-season',
        day: 1,
        daysRemaining: 119,
        nextSeason: 'Kharif',
        scheduledEvents: [],
        seasonTransitionData: {
          isTransitioning: false,
          previousSeason: 'Off-season',
          transitionEffects: {
            cropImpacts: [],
            weatherChanges: [],
            marketShifts: [],
          },
        },
      },
    });
    
    render(
      <Provider store={storeWithOffSeason}>
        <CropManagement />
      </Provider>
    );

    const plantButton = screen.getByText('Plant Crop');
    expect(plantButton).toBeDisabled();
  });
});