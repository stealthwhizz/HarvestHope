/**
 * Tests for Market Service
 */

import { marketService } from '../marketService';
import type { MarketPrice, SellingOption, SellingAdvice } from '../marketService';

// Mock fetch for testing
Object.defineProperty(globalThis, 'fetch', {
  value: jest.fn(),
  writable: true,
});

describe('MarketService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('simulateMarketPrice', () => {
    it('should fetch market price successfully', async () => {
      const mockResponse: MarketPrice = {
        crop_type: 'wheat',
        current_price: 2300,
        msp: 2125,
        price_vs_msp: 108.2,
        trend: {
          direction: 'rising',
          confidence: 0.7,
          reason: 'Good market conditions',
          forecast_days: 30
        },
        factors: {
          weather_impact: 5.0,
          seasonal_demand: 10.0,
          supply_situation: -2.0,
          demand_situation: 8.0
        },
        market_sentiment: 'bullish',
        timestamp: '2024-01-01T00:00:00Z'
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockResponse })
      });

      const result = await marketService.simulateMarketPrice('wheat', 'Kharif');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/market'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"operation":"simulate_price"')
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should fallback to mock data when API fails', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await marketService.simulateMarketPrice('wheat', 'Kharif');

      expect(result.crop_type).toBe('wheat');
      expect(result.current_price).toBeGreaterThan(0);
      expect(result.msp).toBe(2125); // MSP for wheat
      expect(result.price_vs_msp).toBeGreaterThan(0);
    });
  });

  describe('getSellingOptions', () => {
    it('should fetch selling options successfully', async () => {
      const mockOptions: SellingOption[] = [
        {
          channel_id: 'enam',
          channel_name: 'eNAM Platform',
          gross_price_per_quintal: 2208,
          net_price_per_quintal: 2162,
          total_revenue: 21620,
          transport_cost: 100,
          commission: 22.08,
          payment_delay_days: 7,
          reliability_score: 0.99,
          quality_adjustment: 0,
          recommendation_score: 85,
          available: true,
          requirements: ['eNAM registration', 'Digital payment setup']
        }
      ];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockOptions })
      });

      const result = await marketService.getSellingOptions('wheat', 100, 'grade_b', 'central', 2300);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/market'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"operation":"get_selling_options"')
        })
      );

      expect(result).toEqual(mockOptions);
    });

    it('should fallback to mock data when API fails', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await marketService.getSellingOptions('wheat', 100, 'grade_b', 'central', 2300);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('channel_name');
      expect(result[0]).toHaveProperty('total_revenue');
      expect(result[0]).toHaveProperty('available');
      expect(result[0]).toHaveProperty('requirements');
    });
  });

  describe('getSellingAdvice', () => {
    it('should fetch selling advice successfully', async () => {
      const mockAdvice: SellingAdvice = {
        recommendation: 'sell_immediately',
        reasoning: ['Current price is 8.2% above MSP', 'Good market conditions'],
        optimal_timing: 'Immediate sale recommended',
        risk_factors: ['Price volatility risk'],
        alternative_strategies: ['Consider selling in multiple lots']
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAdvice })
      });

      const result = await marketService.getSellingAdvice('wheat', 2300, 100, false, 'medium');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/market'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"operation":"get_selling_advice"')
        })
      );

      expect(result).toEqual(mockAdvice);
    });

    it('should fallback to mock data when API fails', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await marketService.getSellingAdvice('wheat', 2300, 100, false, 'medium');

      expect(result).toHaveProperty('recommendation');
      expect(result).toHaveProperty('reasoning');
      expect(result).toHaveProperty('optimal_timing');
      expect(Array.isArray(result.reasoning)).toBe(true);
    });
  });

  describe('getMSP', () => {
    it('should return correct MSP for known crops', () => {
      expect(marketService.getMSP('wheat')).toBe(2125);
      expect(marketService.getMSP('rice')).toBe(2183);
      expect(marketService.getMSP('cotton')).toBe(6080);
      expect(marketService.getMSP('maize')).toBe(1962);
    });

    it('should return default MSP for unknown crops', () => {
      expect(marketService.getMSP('unknown_crop')).toBe(2000);
    });

    it('should be case insensitive', () => {
      expect(marketService.getMSP('WHEAT')).toBe(2125);
      expect(marketService.getMSP('Wheat')).toBe(2125);
    });
  });

  describe('calculateRevenue', () => {
    it('should calculate revenue correctly', () => {
      const revenue = marketService.calculateRevenue(100, 2300, 100, 0.02);
      
      // 100kg = 1 quintal, 1 * 2300 = 2300 gross
      // Commission: 2300 * 0.02 = 46
      // Net: 2300 - 100 - 46 = 2154
      expect(revenue).toBe(2154);
    });

    it('should handle zero transport cost and commission', () => {
      const revenue = marketService.calculateRevenue(100, 2300, 0, 0);
      expect(revenue).toBe(2300);
    });

    it('should not return negative revenue', () => {
      const revenue = marketService.calculateRevenue(100, 100, 200, 0.5);
      expect(revenue).toBe(0);
    });

    it('should handle different quantities correctly', () => {
      const revenue1 = marketService.calculateRevenue(50, 2300, 50, 0.01); // 0.5 quintal
      const revenue2 = marketService.calculateRevenue(200, 2300, 100, 0.01); // 2 quintals
      
      expect(revenue2).toBeGreaterThan(revenue1 * 3); // Should be roughly 4x but with fixed transport cost
    });
  });

  describe('getMarketSentimentDescription', () => {
    it('should return correct descriptions for all sentiments', () => {
      expect(marketService.getMarketSentimentDescription('very_bullish'))
        .toContain('Extremely favorable');
      expect(marketService.getMarketSentimentDescription('bullish'))
        .toContain('Good market conditions');
      expect(marketService.getMarketSentimentDescription('neutral'))
        .toContain('Stable market conditions');
      expect(marketService.getMarketSentimentDescription('bearish'))
        .toContain('Challenging market conditions');
      expect(marketService.getMarketSentimentDescription('very_bearish'))
        .toContain('Difficult market conditions');
    });

    it('should handle unknown sentiment', () => {
      expect(marketService.getMarketSentimentDescription('unknown' as any))
        .toContain('unclear');
    });
  });

  describe('getMarketIntelligence', () => {
    it('should fetch market intelligence successfully', async () => {
      const mockIntelligence = {
        crop_type: 'wheat',
        region: 'central',
        current_market_status: {
          supply_situation: 'balanced' as const,
          demand_strength: 'moderate' as const,
          storage_levels: 0.6,
          export_prospects: 'fair' as const
        },
        price_drivers: ['Monsoon performance', 'Government policy'],
        upcoming_events: [
          {
            event: 'Harvest season peak',
            expected_date: '2024-04-01',
            potential_impact: 'negative' as const
          }
        ],
        regional_variations: {
          north: { price_premium: 5, demand: 'high' }
        },
        quality_premiums: {
          premium: 15,
          grade_a: 5
        }
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockIntelligence })
      });

      const result = await marketService.getMarketIntelligence('wheat', 'central');

      expect(result).toEqual(mockIntelligence);
    });

    it('should fallback to mock data when API fails', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await marketService.getMarketIntelligence('wheat', 'central');

      expect(result.crop_type).toBe('wheat');
      expect(result.region).toBe('central');
      expect(result.current_market_status).toHaveProperty('supply_situation');
      expect(Array.isArray(result.price_drivers)).toBe(true);
    });
  });
});