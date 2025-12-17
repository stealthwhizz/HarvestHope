/**
 * Integration tests for Advanced Market Features
 * Tests the storage system, government procurement, and market analysis
 */

import { marketService } from '../marketService';

// Mock fetch for testing
Object.defineProperty(globalThis, 'fetch', {
  value: jest.fn(),
  writable: true,
});

describe('Advanced Market Features Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Storage Options', () => {
    it('should fetch storage options successfully', async () => {
      const mockStorageOptions = [
        {
          storage_id: 'farm_storage',
          storage_name: 'On-Farm Storage',
          capacity: 1000,
          cost_per_day: 0.5,
          deterioration_rate: 0.02,
          location: 'Farm premises',
          features: ['Basic protection', 'Easy access'],
          available: true
        }
      ];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockStorageOptions })
      });

      const result = await marketService.getStorageOptions('wheat', 500, 'central');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/market'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"operation":"get_storage_options"')
        })
      );

      expect(result).toEqual(mockStorageOptions);
    });

    it('should fallback to mock storage options when API fails', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await marketService.getStorageOptions('wheat', 500, 'central');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('storage_name');
      expect(result[0]).toHaveProperty('capacity');
      expect(result[0]).toHaveProperty('cost_per_day');
      expect(result[0]).toHaveProperty('available');
    });
  });

  describe('Market Trend Analysis', () => {
    it('should fetch trend analysis successfully', async () => {
      const mockTrendAnalysis = {
        crop_type: 'wheat',
        current_trend: 'bullish' as const,
        price_momentum: 0.15,
        volatility: 0.4,
        support_level: 1800,
        resistance_level: 2800,
        seasonal_pattern: {
          expected_peak_month: 4,
          expected_low_month: 10,
          seasonal_multiplier: 1.2
        },
        technical_indicators: {
          moving_average_7d: 2200,
          moving_average_30d: 2150,
          rsi: 65
        },
        fundamental_factors: {
          supply_outlook: 'balanced' as const,
          demand_outlook: 'moderate' as const,
          government_intervention_risk: 0.2
        }
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockTrendAnalysis })
      });

      const result = await marketService.getMarketTrendAnalysis('wheat', '30d');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/market'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"operation":"get_trend_analysis"')
        })
      );

      expect(result).toEqual(mockTrendAnalysis);
    });

    it('should fallback to mock trend analysis when API fails', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await marketService.getMarketTrendAnalysis('wheat', '30d');

      expect(result.crop_type).toBe('wheat');
      expect(result).toHaveProperty('current_trend');
      expect(result).toHaveProperty('price_momentum');
      expect(result).toHaveProperty('technical_indicators');
      expect(result).toHaveProperty('fundamental_factors');
    });
  });

  describe('Advanced Selling Recommendations', () => {
    it('should fetch advanced recommendations successfully', async () => {
      const mockRecommendation = {
        action: 'sell_now' as const,
        confidence: 0.9,
        reasoning: ['Price significantly above MSP', 'High profit margins available'],
        optimal_timing: 'Immediate',
        expected_price_range: {
          min: 1900,
          max: 2800,
          target: 2300
        },
        risk_assessment: {
          storage_risk: 0.1,
          price_risk: 0.6,
          opportunity_cost: 0.4
        },
        alternative_strategies: [
          {
            strategy: 'Partial Sale',
            description: 'Sell 50% now, hold remainder',
            expected_outcome: 'Balanced risk-reward approach'
          }
        ]
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockRecommendation })
      });

      const result = await marketService.getAdvancedSellingRecommendation(
        'wheat', 100, 2400, true, 'medium', 'grade_b'
      );

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/market'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"operation":"get_advanced_recommendation"')
        })
      );

      expect(result).toEqual(mockRecommendation);
    });

    it('should fallback to mock recommendations when API fails', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await marketService.getAdvancedSellingRecommendation(
        'wheat', 100, 2400, true, 'medium', 'grade_b'
      );

      expect(result).toHaveProperty('action');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('reasoning');
      expect(result).toHaveProperty('expected_price_range');
      expect(result).toHaveProperty('risk_assessment');
      expect(Array.isArray(result.reasoning)).toBe(true);
      expect(Array.isArray(result.alternative_strategies)).toBe(true);
    });
  });

  describe('Government Procurement', () => {
    it('should check government procurement availability', async () => {
      const msp = marketService.getMSP('wheat');
      const belowMspPrice = msp * 0.9; // 90% of MSP

      const result = await marketService.checkGovernmentProcurement('wheat', 100, belowMspPrice);

      expect(result.available).toBe(true);
      expect(result.msp_price).toBe(msp);
      expect(result.procurement_centers.length).toBeGreaterThan(0);
      expect(Array.isArray(result.requirements)).toBe(true);
      expect(result.timeline).toBeTruthy();
    });

    it('should indicate procurement not available when price is above MSP', async () => {
      const msp = marketService.getMSP('wheat');
      const aboveMspPrice = msp * 1.2; // 120% of MSP

      const result = await marketService.checkGovernmentProcurement('wheat', 100, aboveMspPrice);

      expect(result.available).toBe(false);
      expect(result.msp_price).toBe(msp);
      expect(result.procurement_centers.length).toBe(0);
    });
  });

  describe('Integration Scenarios', () => {
    it('should provide comprehensive market analysis for decision making', async () => {
      // Mock all API calls to fail so we get consistent mock data
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const cropType = 'wheat';
      const quantity = 100;
      const currentPrice = 2300;

      // Get all market information
      const [
        marketPrice,
        sellingOptions,
        storageOptions,
        trendAnalysis,
        recommendation,
        governmentProcurement
      ] = await Promise.all([
        marketService.simulateMarketPrice(cropType, 'Kharif'),
        marketService.getSellingOptions(cropType, quantity, 'grade_b', 'central', currentPrice),
        marketService.getStorageOptions(cropType, quantity, 'central'),
        marketService.getMarketTrendAnalysis(cropType, '30d'),
        marketService.getAdvancedSellingRecommendation(cropType, quantity, currentPrice, true, 'medium', 'grade_b'),
        marketService.checkGovernmentProcurement(cropType, quantity, currentPrice)
      ]);

      // Verify all components return valid data
      expect(marketPrice.crop_type).toBe(cropType);
      expect(Array.isArray(sellingOptions)).toBe(true);
      expect(Array.isArray(storageOptions)).toBe(true);
      expect(trendAnalysis.crop_type).toBe(cropType);
      expect(recommendation.action).toBeTruthy();
      expect(typeof governmentProcurement.available).toBe('boolean');

      // Verify data consistency
      expect(marketPrice.msp).toBe(marketService.getMSP(cropType));
      expect(sellingOptions.every(option => option.available !== undefined)).toBe(true);
      expect(storageOptions.every(option => option.capacity > 0)).toBe(true);
    });

    it('should handle storage capacity constraints correctly', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const largeQuantity = 5000; // Larger than some storage options
      const storageOptions = await marketService.getStorageOptions('wheat', largeQuantity, 'central');

      // Some storage options should be unavailable for large quantities
      const availableOptions = storageOptions.filter(option => option.available);
      const unavailableOptions = storageOptions.filter(option => !option.available);

      expect(storageOptions.length).toBeGreaterThan(0);
      // At least one option should handle large quantities (warehouse)
      expect(availableOptions.length).toBeGreaterThan(0);
    });
  });
});