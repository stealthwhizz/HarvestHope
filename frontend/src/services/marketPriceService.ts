/**
 * AI-Powered Market Price Service
 * Generates dynamic crop prices using Google Gemini AI
 * Based on Indian MSP (Minimum Support Price) system
 */

import { callGemini } from './geminiService';
import { parseJSONFromAIResponse } from './jsonUtils';

// Indian Government MSP (Minimum Support Price) 2024-25
const MSP_PRICES = {
  rice: 2300,     // ₹2300/quintal (Paddy)
  wheat: 2275,    // ₹2275/quintal
  cotton: 7121,   // ₹7121/quintal (Medium Staple)
  sugarcane: 340, // ₹340/quintal (FRP)
};

export interface MarketContext {
  season: string;
  day: number;
  weather: string;
  totalSupply: number; // Player's inventory in kg
  recentEvents: string[]; // Droughts, floods, etc.
}

export interface CropPrice {
  market_price: number;
  msp: number;
  trend: 'rising' | 'falling' | 'stable';
  reason: string;
}

export interface MarketData {
  date: string;
  prices: {
    rice: CropPrice;
    wheat: CropPrice;
    cotton: CropPrice;
    sugarcane: CropPrice;
  };
  market_summary: string;
  player_advice: string;
}

// Cache prices for current day to avoid repeated API calls
const priceCache: { day: number | null; data: MarketData | null } = {
  day: null,
  data: null,
};

export async function generateMarketPrices(context: MarketContext): Promise<MarketData> {
  // Return cached if same day
  if (priceCache.day === context.day && priceCache.data) {
    console.log('📊 Using cached market prices for day', context.day);
    return priceCache.data;
  }

  const prompt = `You are a market analyst for Indian agriculture mandis.

MARKET CONTEXT:
Season: ${context.season}
Day: ${context.day} of 120
Weather: ${context.weather}
Market Supply: ${Math.round(context.totalSupply / 100)} quintals (player inventory)
Recent Events: ${context.recentEvents.join(', ') || 'None'}

GOVERNMENT MSP (Minimum Support Price - FLOOR):
Rice (Paddy): ₹2,300/quintal
Wheat: ₹2,275/quintal
Cotton: ₹7,121/quintal
Sugarcane: ₹340/quintal

TASK: Generate today's market prices considering:

Seasonal Demand:
- Kharif crops (rice, cotton) harvest Oct-Nov → prices LOW during harvest
- Rabi crops (wheat) harvest Mar-Apr → prices LOW during harvest
- Prices HIGH during off-season (scarcity)

Supply-Demand:
- High player supply → prices slightly lower (local glut)
- Low supply → prices higher (scarcity premium)

Weather Impact:
- Drought → supply concerns → prices UP
- Floods → quality concerns → prices DOWN initially, then UP
- Good weather → normal prices

Festival/Export Demand:
- Diwali/Pongal seasons → rice prices +10-15%
- Export demand → cotton prices +5-10%

MSP Floor:
- Market price can go ABOVE MSP
- Market price CANNOT go below MSP (govt buys at MSP)

Return ONLY valid JSON (no markdown, no code blocks, no explanations):
{
  "date": "Day ${context.day}",
  "prices": {
    "rice": {
      "market_price": 2450,
      "msp": 2300,
      "trend": "rising",
      "reason": "Festival season demand increasing"
    },
    "wheat": {
      "market_price": 2275,
      "msp": 2275,
      "trend": "stable",
      "reason": "At MSP floor, government procurement active"
    },
    "cotton": {
      "market_price": 7350,
      "msp": 7121,
      "trend": "rising",
      "reason": "Export demand from textile mills"
    },
    "sugarcane": {
      "market_price": 355,
      "msp": 340,
      "trend": "stable",
      "reason": "Normal crushing season demand"
    }
  },
  "market_summary": "Mixed trading. Rice demand strong due to festivals. Cotton export demand supporting prices.",
  "player_advice": "Good time to sell rice - prices 7% above MSP. Hold wheat for better rates."
}

IMPORTANT:
- All prices in ₹ per quintal
- Prices realistic for Indian mandis 2024-25
- Educational tone
- MSP is FLOOR (minimum)`;

  let response = '';
  try {
    console.log('🤖 Generating AI market prices for day', context.day);
    response = await callGemini(prompt);
    console.log('🔍 Full AI response:', response);
    
    // Parse JSON from AI response (handles markdown code blocks)
    const data: MarketData = parseJSONFromAIResponse<MarketData>(response);
    
    // Validate data structure
    if (!data.prices || typeof data.prices !== 'object') {
      throw new Error('Invalid market data structure - missing prices');
    }
    
    // Validate prices above MSP
    Object.keys(MSP_PRICES).forEach(crop => {
      const cropKey = crop as keyof typeof MSP_PRICES;
      
      // Check if crop data exists
      if (!data.prices[cropKey]) {
        throw new Error(`Missing price data for ${crop}`);
      }
      
      // Ensure price is above MSP
      if (data.prices[cropKey].market_price < MSP_PRICES[cropKey]) {
        data.prices[cropKey].market_price = MSP_PRICES[cropKey];
        data.prices[cropKey].reason = "At MSP floor - government procurement active";
        data.prices[cropKey].trend = "stable";
      }
    });
    
    // Cache for this day
    priceCache.day = context.day;
    priceCache.data = data;
    
    console.log('✅ AI market prices generated successfully');
    // Add AI source indicator
    (data as any).isAI = true;
    (data as any).aiSource = 'Google Gemini AI';
    return data;
    
  } catch (error) {
    console.error('❌ Market price generation error:', error);
    console.log('🔄 Using fallback market prices');
    return generateFallbackPrices(context);
  }
}

// Fallback if AI fails
function generateFallbackPrices(context: MarketContext): MarketData {
  // Add some seasonal variation
  const seasonMultiplier = getSeasonMultiplier(context.season, context.day);
  
  const data: MarketData = {
    date: `Day ${context.day}`,
    prices: {
      rice: {
        market_price: Math.round(MSP_PRICES.rice * (1 + Math.random() * 0.15 * seasonMultiplier.rice)),
        msp: MSP_PRICES.rice,
        trend: Math.random() > 0.5 ? 'rising' : 'stable',
        reason: 'Normal trading conditions'
      },
      wheat: {
        market_price: Math.round(MSP_PRICES.wheat * (1 + Math.random() * 0.15 * seasonMultiplier.wheat)),
        msp: MSP_PRICES.wheat,
        trend: Math.random() > 0.5 ? 'rising' : 'stable',
        reason: 'Normal trading conditions'
      },
      cotton: {
        market_price: Math.round(MSP_PRICES.cotton * (1 + Math.random() * 0.15 * seasonMultiplier.cotton)),
        msp: MSP_PRICES.cotton,
        trend: Math.random() > 0.5 ? 'rising' : 'stable',
        reason: 'Normal trading conditions'
      },
      sugarcane: {
        market_price: Math.round(MSP_PRICES.sugarcane * (1 + Math.random() * 0.1 * seasonMultiplier.sugarcane)),
        msp: MSP_PRICES.sugarcane,
        trend: Math.random() > 0.5 ? 'rising' : 'stable',
        reason: 'Normal trading conditions'
      },
    },
    market_summary: `Markets trading normally during ${context.season} season.`,
    player_advice: 'Check individual crop prices for selling opportunities.'
  };
  
  // Ensure prices don't go below MSP
  Object.keys(MSP_PRICES).forEach(crop => {
    const cropKey = crop as keyof typeof MSP_PRICES;
    if (data.prices[cropKey].market_price < MSP_PRICES[cropKey]) {
      data.prices[cropKey].market_price = MSP_PRICES[cropKey];
      data.prices[cropKey].reason = "At MSP floor - government procurement";
    }
  });
  
  // Cache fallback data too
  priceCache.day = context.day;
  priceCache.data = data;
  
  // Add demo mode indicator
  (data as any).isAI = false;
  (data as any).aiSource = 'Demo Mode';
  
  return data;
}

// Get seasonal price multipliers
function getSeasonMultiplier(season: string, day: number) {
  const dayInSeason = day % 30;
  
  switch (season) {
    case 'Kharif': // Monsoon season - rice and cotton harvest
      return {
        rice: dayInSeason > 20 ? 0.8 : 1.2, // Lower during harvest
        wheat: 1.3, // Off-season, higher prices
        cotton: dayInSeason > 20 ? 0.9 : 1.1,
        sugarcane: 1.0
      };
    case 'Rabi': // Winter season - wheat harvest
      return {
        rice: 1.2, // Off-season
        wheat: dayInSeason > 20 ? 0.8 : 1.1, // Lower during harvest
        cotton: 1.1,
        sugarcane: 1.0
      };
    case 'Zaid': // Summer season
      return {
        rice: 1.1,
        wheat: 1.0,
        cotton: 1.0,
        sugarcane: 1.1 // Crushing season
      };
    default:
      return { rice: 1.0, wheat: 1.0, cotton: 1.0, sugarcane: 1.0 };
  }
}

// Clear cache when day changes (called from game component)
export function clearPriceCache() {
  priceCache.day = null;
  priceCache.data = null;
}