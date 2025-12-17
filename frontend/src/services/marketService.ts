/**
 * Market Service for Harvest Hope
 * Handles crop price simulation, market dynamics, and selling advice
 */

export interface MarketPrice {
  crop_type: string;
  current_price: number;
  msp: number;
  price_vs_msp: number;
  trend: PriceTrend;
  factors: PriceFactors;
  market_sentiment: MarketSentiment;
  timestamp: string;
}

export interface PriceTrend {
  direction: 'rising' | 'declining' | 'stable' | 'slightly_rising' | 'slightly_declining';
  confidence: number;
  reason: string;
  forecast_days: number;
}

export interface PriceFactors {
  weather_impact: number;
  seasonal_demand: number;
  supply_situation: number;
  demand_situation: number;
}

export type MarketSentiment = 'very_bullish' | 'bullish' | 'neutral' | 'bearish' | 'very_bearish';

export interface SellingOption {
  channel_id: string;
  channel_name: string;
  gross_price_per_quintal: number;
  net_price_per_quintal: number;
  total_revenue: number;
  transport_cost: number;
  commission: number;
  payment_delay_days: number;
  reliability_score: number;
  quality_adjustment: number;
  recommendation_score: number;
  available: boolean;
  requirements?: string[];
}

export interface StorageOption {
  storage_id: string;
  storage_name: string;
  capacity: number; // kg
  cost_per_day: number; // ₹ per kg per day
  deterioration_rate: number; // quality loss per day
  location: string;
  features: string[];
  available: boolean;
}

export interface MarketTrendAnalysis {
  crop_type: string;
  current_trend: 'bullish' | 'bearish' | 'neutral';
  price_momentum: number; // -1 to 1
  volatility: number; // 0 to 1
  support_level: number; // price floor
  resistance_level: number; // price ceiling
  seasonal_pattern: {
    expected_peak_month: number;
    expected_low_month: number;
    seasonal_multiplier: number;
  };
  technical_indicators: {
    moving_average_7d: number;
    moving_average_30d: number;
    rsi: number; // Relative Strength Index
  };
  fundamental_factors: {
    supply_outlook: 'surplus' | 'balanced' | 'deficit';
    demand_outlook: 'weak' | 'moderate' | 'strong';
    government_intervention_risk: number; // 0 to 1
  };
}

export interface SellingRecommendation {
  action: 'sell_now' | 'hold_short_term' | 'hold_long_term' | 'sell_government' | 'store_and_wait';
  confidence: number; // 0 to 1
  reasoning: string[];
  optimal_timing: string;
  expected_price_range: {
    min: number;
    max: number;
    target: number;
  };
  risk_assessment: {
    storage_risk: number;
    price_risk: number;
    opportunity_cost: number;
  };
  alternative_strategies: Array<{
    strategy: string;
    description: string;
    expected_outcome: string;
  }>;
}

export interface SellingAdvice {
  recommendation: 'sell_immediately' | 'wait_for_better_prices' | 'sell_to_government' | 
                  'monitor_and_decide' | 'sell_best_available_option';
  reasoning: string[];
  optimal_timing: string;
  risk_factors: string[];
  alternative_strategies: string[];
}

export interface MarketIntelligence {
  crop_type: string;
  region: string;
  current_market_status: {
    supply_situation: 'surplus' | 'balanced' | 'deficit';
    demand_strength: 'weak' | 'moderate' | 'strong';
    storage_levels: number;
    export_prospects: 'poor' | 'fair' | 'good' | 'excellent';
  };
  price_drivers: string[];
  upcoming_events: Array<{
    event: string;
    expected_date: string;
    potential_impact: 'positive' | 'negative' | 'neutral';
  }>;
  regional_variations: Record<string, { price_premium: number; demand: string }>;
  quality_premiums: Record<string, number>;
}

export interface WeatherConditions {
  rainfall: number;
  temperature: number;
  drought_risk: number;
  flood_risk: number;
}

export interface SupplyFactors {
  local_production: number;
  storage_levels: number;
  imports: number;
}

export interface DemandFactors {
  population_growth: number;
  export_demand: number;
  industrial_use: number;
}

class MarketService {
  private baseUrl: string;

  constructor() {
    // In production, this would be the actual API Gateway URL
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
  }

  /**
   * Simulate market price for a specific crop
   */
  async simulateMarketPrice(
    cropType: string,
    season: string,
    weatherConditions: WeatherConditions = {
      rainfall: 50,
      temperature: 25,
      drought_risk: 0,
      flood_risk: 0
    },
    supplyFactors: SupplyFactors = {
      local_production: 1.0,
      storage_levels: 0.5,
      imports: 1.0
    },
    demandFactors: DemandFactors = {
      population_growth: 1.02,
      export_demand: 1.0,
      industrial_use: 1.0
    }
  ): Promise<MarketPrice> {
    try {
      const response = await fetch(`${this.baseUrl}/market`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'simulate_price',
          crop_type: cropType,
          season,
          weather_conditions: weatherConditions,
          supply_factors: supplyFactors,
          demand_factors: demandFactors
        }),
      });

      if (!response.ok) {
        throw new Error(`Market price simulation failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Market price simulation failed');
      }

      return data.data;
    } catch (error) {
      console.error('Market price simulation error:', error);
      
      // Fallback to mock data for development
      return this.getMockMarketPrice(cropType, season);
    }
  }

  /**
   * Get available selling options for a crop
   */
  async getSellingOptions(
    cropType: string,
    quantity: number,
    qualityGrade: string = 'grade_b',
    location: string = 'central',
    currentPrice: number
  ): Promise<SellingOption[]> {
    try {
      const response = await fetch(`${this.baseUrl}/market`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'get_selling_options',
          crop_type: cropType,
          quantity,
          quality_grade: qualityGrade,
          location,
          current_price: currentPrice
        }),
      });

      if (!response.ok) {
        throw new Error(`Selling options fetch failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Selling options fetch failed');
      }

      return data.data;
    } catch (error) {
      console.error('Selling options fetch error:', error);
      
      // Fallback to mock data for development
      return this.getMockSellingOptions(cropType, quantity, currentPrice);
    }
  }

  /**
   * Get AI-powered selling advice
   */
  async getSellingAdvice(
    cropType: string,
    currentPrice: number,
    quantity: number,
    storageCapacity: boolean = false,
    financialUrgency: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<SellingAdvice> {
    try {
      const response = await fetch(`${this.baseUrl}/market`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'get_selling_advice',
          crop_type: cropType,
          current_price: currentPrice,
          quantity,
          storage_capacity: storageCapacity,
          financial_urgency: financialUrgency
        }),
      });

      if (!response.ok) {
        throw new Error(`Selling advice fetch failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Selling advice fetch failed');
      }

      return data.data;
    } catch (error) {
      console.error('Selling advice fetch error:', error);
      
      // Fallback to mock data for development
      return this.getMockSellingAdvice(cropType, currentPrice);
    }
  }

  /**
   * Get available storage options for crops
   */
  async getStorageOptions(
    cropType: string,
    quantity: number,
    location: string = 'central'
  ): Promise<StorageOption[]> {
    try {
      const response = await fetch(`${this.baseUrl}/market`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'get_storage_options',
          crop_type: cropType,
          quantity,
          location
        }),
      });

      if (!response.ok) {
        throw new Error(`Storage options fetch failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Storage options fetch failed');
      }

      return data.data;
    } catch (error) {
      console.error('Storage options fetch error:', error);
      
      // Fallback to mock data for development
      return this.getMockStorageOptions(cropType, quantity);
    }
  }

  /**
   * Get market trend analysis for informed decision making
   */
  async getMarketTrendAnalysis(
    cropType: string,
    timeframe: '7d' | '30d' | '90d' = '30d'
  ): Promise<MarketTrendAnalysis> {
    try {
      const response = await fetch(`${this.baseUrl}/market`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'get_trend_analysis',
          crop_type: cropType,
          timeframe
        }),
      });

      if (!response.ok) {
        throw new Error(`Trend analysis fetch failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Trend analysis fetch failed');
      }

      return data.data;
    } catch (error) {
      console.error('Trend analysis fetch error:', error);
      
      // Fallback to mock data for development
      return this.getMockTrendAnalysis(cropType);
    }
  }

  /**
   * Get advanced selling recommendations with storage considerations
   */
  async getAdvancedSellingRecommendation(
    cropType: string,
    quantity: number,
    currentPrice: number,
    storageCapacity: boolean = false,
    financialUrgency: 'low' | 'medium' | 'high' = 'medium',
    qualityGrade: string = 'grade_b'
  ): Promise<SellingRecommendation> {
    try {
      const response = await fetch(`${this.baseUrl}/market`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'get_advanced_recommendation',
          crop_type: cropType,
          quantity,
          current_price: currentPrice,
          storage_capacity: storageCapacity,
          financial_urgency: financialUrgency,
          quality_grade: qualityGrade
        }),
      });

      if (!response.ok) {
        throw new Error(`Advanced recommendation fetch failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Advanced recommendation fetch failed');
      }

      return data.data;
    } catch (error) {
      console.error('Advanced recommendation fetch error:', error);
      
      // Fallback to mock data for development
      return this.getMockAdvancedRecommendation(cropType, currentPrice);
    }
  }

  /**
   * Check government procurement availability
   */
  async checkGovernmentProcurement(
    cropType: string,
    quantity: number,
    currentPrice: number
  ): Promise<{
    available: boolean;
    msp_price: number;
    procurement_centers: Array<{
      name: string;
      location: string;
      distance: number;
      capacity_available: number;
    }>;
    requirements: string[];
    timeline: string;
  }> {
    try {
      const msp = this.getMSP(cropType);
      const available = currentPrice <= msp * 1.05; // Available if price is near or below MSP

      return {
        available,
        msp_price: msp,
        procurement_centers: available ? [
          {
            name: 'Central Procurement Center',
            location: 'District Headquarters',
            distance: 15,
            capacity_available: 10000
          },
          {
            name: 'Regional FCI Depot',
            location: 'Regional Hub',
            distance: 25,
            capacity_available: 50000
          }
        ] : [],
        requirements: [
          'Valid farmer registration',
          'Land ownership documents',
          'Crop quality certificate',
          'Moisture content below 14%'
        ],
        timeline: 'Processing within 7-14 days'
      };
    } catch (error) {
      console.error('Government procurement check error:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive market intelligence
   */
  async getMarketIntelligence(
    cropType: string,
    region: string = 'central'
  ): Promise<MarketIntelligence> {
    try {
      const response = await fetch(`${this.baseUrl}/market`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'get_market_intelligence',
          crop_type: cropType,
          region
        }),
      });

      if (!response.ok) {
        throw new Error(`Market intelligence fetch failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Market intelligence fetch failed');
      }

      return data.data;
    } catch (error) {
      console.error('Market intelligence fetch error:', error);
      
      // Fallback to mock data for development
      return this.getMockMarketIntelligence(cropType, region);
    }
  }

  /**
   * Get MSP (Minimum Support Price) for a crop
   */
  getMSP(cropType: string): number {
    const mspData: Record<string, number> = {
      wheat: 2125,
      rice: 2183,
      cotton: 6080,
      sugarcane: 315,
      maize: 1962,
      soybean: 4300,
      mustard: 5450,
      gram: 5335,
      tur: 6600,
      groundnut: 5850,
      sunflower: 6400,
      sesame: 7307,
      safflower: 5441,
      nigerseed: 7287,
      linseed: 5940
    };

    return mspData[cropType.toLowerCase()] || 2000;
  }

  /**
   * Calculate potential revenue from crop sale
   */
  calculateRevenue(
    quantity: number,
    pricePerQuintal: number,
    transportCost: number = 0,
    commission: number = 0
  ): number {
    const grossRevenue = (quantity / 100) * pricePerQuintal; // Convert kg to quintal
    const netRevenue = grossRevenue - transportCost - (grossRevenue * commission);
    return Math.max(0, netRevenue);
  }

  /**
   * Get market sentiment description
   */
  getMarketSentimentDescription(sentiment: MarketSentiment): string {
    const descriptions = {
      very_bullish: 'Extremely favorable market conditions with high prices',
      bullish: 'Good market conditions with above-average prices',
      neutral: 'Stable market conditions with fair prices',
      bearish: 'Challenging market conditions with below-average prices',
      very_bearish: 'Difficult market conditions with very low prices'
    };

    return descriptions[sentiment] || 'Market conditions unclear';
  }

  // Mock data methods for development/fallback
  private getMockMarketPrice(cropType: string, season: string): MarketPrice {
    const msp = this.getMSP(cropType);
    const mockPrice = msp * (0.8 + Math.random() * 0.8); // 80% to 160% of MSP

    return {
      crop_type: cropType,
      current_price: Math.round(mockPrice),
      msp,
      price_vs_msp: Math.round((mockPrice / msp) * 100 * 10) / 10,
      trend: {
        direction: Math.random() > 0.5 ? 'rising' : 'declining',
        confidence: 0.6 + Math.random() * 0.3,
        reason: 'Mock market conditions for development',
        forecast_days: 30
      },
      factors: {
        weather_impact: (Math.random() - 0.5) * 20,
        seasonal_demand: (Math.random() - 0.5) * 15,
        supply_situation: (Math.random() - 0.5) * 10,
        demand_situation: (Math.random() - 0.5) * 12
      },
      market_sentiment: mockPrice > msp * 1.2 ? 'bullish' : mockPrice < msp * 0.9 ? 'bearish' : 'neutral',
      timestamp: new Date().toISOString()
    };
  }

  private getMockSellingOptions(cropType: string, quantity: number, currentPrice: number): SellingOption[] {
    return [
      {
        channel_id: 'enam',
        channel_name: 'eNAM Platform',
        gross_price_per_quintal: currentPrice * 0.96,
        net_price_per_quintal: currentPrice * 0.94,
        total_revenue: (quantity / 100) * currentPrice * 0.94,
        transport_cost: 100 * (quantity / 100),
        commission: currentPrice * (quantity / 100) * 0.01,
        payment_delay_days: 7,
        reliability_score: 0.99,
        quality_adjustment: 0,
        recommendation_score: 85,
        available: true,
        requirements: ['eNAM registration', 'Digital payment setup', 'Quality assaying']
      },
      {
        channel_id: 'local_mandi',
        channel_name: 'Local Mandi',
        gross_price_per_quintal: currentPrice * 0.85,
        net_price_per_quintal: currentPrice * 0.82,
        total_revenue: (quantity / 100) * currentPrice * 0.82,
        transport_cost: 50 * (quantity / 100),
        commission: currentPrice * (quantity / 100) * 0.02,
        payment_delay_days: 1,
        reliability_score: 0.95,
        quality_adjustment: 0,
        recommendation_score: 75,
        available: true,
        requirements: ['Basic quality check']
      }
    ];
  }

  private getMockSellingAdvice(cropType: string, currentPrice: number): SellingAdvice {
    const msp = this.getMSP(cropType);
    const ratio = currentPrice / msp;

    if (ratio > 1.2) {
      return {
        recommendation: 'sell_immediately',
        reasoning: ['Current price is significantly above MSP', 'Good market conditions'],
        optimal_timing: 'Immediate sale recommended',
        risk_factors: ['Price volatility risk'],
        alternative_strategies: ['Consider selling in multiple lots']
      };
    } else {
      return {
        recommendation: 'monitor_and_decide',
        reasoning: ['Price near MSP level', 'Market conditions are stable'],
        optimal_timing: 'Flexible timing based on cash needs',
        risk_factors: ['Normal market volatility'],
        alternative_strategies: ['Wait for better prices if storage available']
      };
    }
  }

  private getMockStorageOptions(cropType: string, quantity: number): StorageOption[] {
    return [
      {
        storage_id: 'farm_storage',
        storage_name: 'On-Farm Storage',
        capacity: 1000,
        cost_per_day: 0.5,
        deterioration_rate: 0.02,
        location: 'Farm premises',
        features: ['Basic protection', 'Easy access'],
        available: true
      },
      {
        storage_id: 'warehouse',
        storage_name: 'Local Warehouse',
        capacity: 5000,
        cost_per_day: 1.0,
        deterioration_rate: 0.01,
        location: '5km from farm',
        features: ['Climate controlled', 'Pest protection', 'Insurance coverage'],
        available: true
      },
      {
        storage_id: 'cold_storage',
        storage_name: 'Cold Storage Facility',
        capacity: 2000,
        cost_per_day: 2.0,
        deterioration_rate: 0.005,
        location: '15km from farm',
        features: ['Temperature controlled', 'Extended shelf life', 'Premium quality maintenance'],
        available: quantity <= 2000
      }
    ];
  }

  private getMockTrendAnalysis(cropType: string): MarketTrendAnalysis {
    const msp = this.getMSP(cropType);
    const currentPrice = msp * (0.9 + Math.random() * 0.4); // 90% to 130% of MSP

    return {
      crop_type: cropType,
      current_trend: currentPrice > msp * 1.1 ? 'bullish' : currentPrice < msp * 0.95 ? 'bearish' : 'neutral',
      price_momentum: (Math.random() - 0.5) * 2, // -1 to 1
      volatility: 0.3 + Math.random() * 0.4, // 0.3 to 0.7
      support_level: msp * 0.85,
      resistance_level: msp * 1.4,
      seasonal_pattern: {
        expected_peak_month: 4, // April (harvest season)
        expected_low_month: 10, // October (pre-harvest)
        seasonal_multiplier: 1.2
      },
      technical_indicators: {
        moving_average_7d: currentPrice * (0.98 + Math.random() * 0.04),
        moving_average_30d: currentPrice * (0.95 + Math.random() * 0.1),
        rsi: 30 + Math.random() * 40 // 30-70 range
      },
      fundamental_factors: {
        supply_outlook: Math.random() > 0.6 ? 'balanced' : Math.random() > 0.5 ? 'surplus' : 'deficit',
        demand_outlook: Math.random() > 0.6 ? 'moderate' : Math.random() > 0.5 ? 'strong' : 'weak',
        government_intervention_risk: currentPrice < msp * 0.9 ? 0.8 : 0.2
      }
    };
  }

  private getMockAdvancedRecommendation(cropType: string, currentPrice: number): SellingRecommendation {
    const msp = this.getMSP(cropType);
    const priceRatio = currentPrice / msp;

    let action: SellingRecommendation['action'];
    let confidence: number;
    let reasoning: string[];

    if (priceRatio > 1.3) {
      action = 'sell_now';
      confidence = 0.9;
      reasoning = ['Price significantly above MSP', 'High profit margins available', 'Risk of price correction'];
    } else if (priceRatio < 0.8) {
      action = 'sell_government';
      confidence = 0.8;
      reasoning = ['Price below MSP', 'Government procurement available', 'Guaranteed minimum price'];
    } else if (priceRatio < 1.0) {
      action = 'store_and_wait';
      confidence = 0.6;
      reasoning = ['Price below fair value', 'Storage may improve returns', 'Seasonal price recovery expected'];
    } else {
      action = 'hold_short_term';
      confidence = 0.5;
      reasoning = ['Price near fair value', 'Monitor for better opportunities', 'Moderate upside potential'];
    }

    return {
      action,
      confidence,
      reasoning,
      optimal_timing: action === 'sell_now' ? 'Immediate' : action === 'store_and_wait' ? '2-4 weeks' : '1-2 weeks',
      expected_price_range: {
        min: msp * 0.9,
        max: msp * 1.4,
        target: msp * 1.15
      },
      risk_assessment: {
        storage_risk: action === 'store_and_wait' ? 0.3 : 0.1,
        price_risk: priceRatio > 1.2 ? 0.6 : 0.3,
        opportunity_cost: action === 'hold_short_term' ? 0.2 : 0.4
      },
      alternative_strategies: [
        {
          strategy: 'Partial Sale',
          description: 'Sell 50% now, hold remainder',
          expected_outcome: 'Balanced risk-reward approach'
        },
        {
          strategy: 'Value Addition',
          description: 'Process crop for higher margins',
          expected_outcome: '15-25% price premium possible'
        }
      ]
    };
  }

  private getMockMarketIntelligence(cropType: string, region: string): MarketIntelligence {
    return {
      crop_type: cropType,
      region,
      current_market_status: {
        supply_situation: 'balanced',
        demand_strength: 'moderate',
        storage_levels: 0.6,
        export_prospects: 'fair'
      },
      price_drivers: [
        'Monsoon performance in key growing regions',
        'Government policy announcements',
        'International market conditions'
      ],
      upcoming_events: [
        {
          event: 'Harvest season peak',
          expected_date: '2024-04-01',
          potential_impact: 'negative'
        }
      ],
      regional_variations: {
        north: { price_premium: 5, demand: 'high' },
        south: { price_premium: -2, demand: 'moderate' }
      },
      quality_premiums: {
        premium: 15,
        grade_a: 5,
        grade_b: 0,
        grade_c: -10
      }
    };
  }
}

export const marketService = new MarketService();
export default marketService;