/**
 * Google Gemini AI Service for Weather Advisory
 * Uses official Google Generative AI SDK for farming recommendations
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// You can get a free API key from: https://aistudio.google.com/app/apikey
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'demo-mode';

// Initialize Google Generative AI
let genAI: GoogleGenerativeAI | null = null;
let model: any = null;

if (GEMINI_API_KEY !== 'demo-mode') {
  try {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.3,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      }
    });
    console.log('🤖 Gemini AI SDK initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Gemini AI SDK:', error);
  }
}

// Log API key status on module load
if (GEMINI_API_KEY === 'demo-mode') {
  console.log('%c🤖 Gemini AI: Demo Mode', 'color: #FFB000; font-weight: bold; font-size: 14px');
  console.log('%cTo enable real AI features:', 'color: #4af626; font-size: 12px');
  console.log('%c1. Get free API key: https://aistudio.google.com/app/apikey', 'color: #4af626');
  console.log('%c2. Add to frontend/.env: VITE_GEMINI_API_KEY=your-key', 'color: #4af626');
  console.log('%c3. Restart dev server', 'color: #4af626');
  console.log('%c📖 See frontend/API_SETUP.md for detailed guide', 'color: #00ffff');
} else {
  console.log('%c🤖 Gemini AI: Connected ✅ (gemini-2.5-flash)', 'color: #4af626; font-weight: bold; font-size: 14px');
  console.log('%cAI-powered weather and market features enabled!', 'color: #4af626');
}

export async function callGemini(prompt: string): Promise<string> {
  try {
    if (GEMINI_API_KEY === 'demo-mode' || !model) {
      console.log('🤖 Gemini API key not configured or model not initialized, using demo response');
      return generateDemoResponse(prompt);
    }
    
    console.log('🤖 Calling Google Gemini AI SDK...');
    console.log('🔍 Prompt preview:', prompt.substring(0, 100) + '...');
    
    // Generate content using the official SDK
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    // Check if response was blocked or empty
    if (!response || !response.text) {
      throw new Error('Empty or blocked response from Gemini AI');
    }
    
    const aiResponse = response.text();
    
    if (!aiResponse || aiResponse.trim().length === 0) {
      throw new Error('Empty response text from Gemini AI');
    }
    
    console.log('✅ Gemini AI response received via SDK');
    console.log('📝 Response preview:', aiResponse.substring(0, 200) + '...');
    
    return aiResponse;
    
  } catch (error) {
    console.error('❌ Gemini AI SDK error:', error);
    
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    console.log('🔄 Falling back to demo response');
    return generateDemoResponse(prompt);
  }
}

// Test function to verify Gemini AI is working
export async function testGeminiConnection(): Promise<boolean> {
  try {
    if (GEMINI_API_KEY === 'demo-mode' || !model) {
      console.log('🧪 Test: Gemini AI not configured, demo mode active');
      return false;
    }
    
    console.log('🧪 Testing Gemini AI connection...');
    const testPrompt = 'Respond with exactly: "Gemini AI is working for Harvest Hope farming game"';
    const response = await callGemini(testPrompt);
    
    const isWorking = response.includes('Gemini AI is working') || 
                     response.includes('working') || 
                     response.includes('Harvest Hope');
    
    console.log(`🧪 Test result: ${isWorking ? '✅ WORKING' : '❌ FAILED'}`);
    console.log(`🧪 Test response: "${response.substring(0, 100)}..."`);
    
    return isWorking;
  } catch (error) {
    console.error('🧪 Test failed:', error);
    return false;
  }
}

// Debug function to check API key status
export function getGeminiStatus(): { hasKey: boolean; keyPreview: string; modelReady: boolean } {
  return {
    hasKey: GEMINI_API_KEY !== 'demo-mode',
    keyPreview: GEMINI_API_KEY === 'demo-mode' ? 'demo-mode' : `${GEMINI_API_KEY.substring(0, 8)}...`,
    modelReady: !!model
  };
}

// Generate demo response when API is not available
function generateDemoResponse(prompt: string): string {
  // Check if this is a market price request
  const isMarketRequest = prompt.includes('market analyst') || prompt.includes('MSP');
  
  if (isMarketRequest) {
    // Generate market price demo response
    const demoMarketResponse = {
      "date": "Day 1",
      "prices": {
        "rice": {
          "market_price": 2450,
          "msp": 2300,
          "trend": "rising",
          "reason": "Kharif season demand increasing, festival season approaching"
        },
        "wheat": {
          "market_price": 2350,
          "msp": 2275,
          "trend": "stable",
          "reason": "Off-season for wheat, steady demand from flour mills"
        },
        "cotton": {
          "market_price": 7350,
          "msp": 7121,
          "trend": "rising",
          "reason": "Export demand from textile mills supporting prices"
        },
        "sugarcane": {
          "market_price": 355,
          "msp": 340,
          "trend": "stable",
          "reason": "Normal crushing season demand from sugar mills"
        }
      },
      "market_summary": "Mixed trading during Kharif season. Rice and cotton showing strength due to seasonal demand.",
      "player_advice": "Good time to sell rice - prices 7% above MSP. Cotton also trading well above MSP floor."
    };
    return JSON.stringify(demoMarketResponse, null, 2);
  }
  
  // Weather advisory demo response
  const hasHeavyRain = prompt.includes('heavy_rain') || prompt.includes('rainfall_mm": 2') || prompt.includes('rainfall_mm": 3');
  const hasLightRain = prompt.includes('light_rain') || prompt.includes('rainfall_mm": 1');
  const isDry = prompt.includes('rainfall_mm": 0');
  const isHot = prompt.includes('temp_max": 3') || prompt.includes('temp_max": 4');
  
  let overall_condition = 'Good';
  let irrigation_need = 'Moderate irrigation recommended';
  let warnings = [];
  
  if (hasHeavyRain) {
    overall_condition = 'Fair - Heavy Rainfall';
    irrigation_need = 'Minimal - sufficient rainfall expected';
    warnings.push('Heavy rainfall may cause waterlogging in low-lying areas');
  } else if (isDry && isHot) {
    overall_condition = 'Poor - Hot & Dry';
    irrigation_need = 'Intensive irrigation required';
    warnings.push('High temperatures may stress crops');
  } else if (hasLightRain) {
    overall_condition = 'Excellent';
    irrigation_need = 'Reduced irrigation needed';
  }
  
  const demoResponse = {
    "overall_condition": overall_condition,
    "total_rainfall": hasHeavyRain ? 180 : hasLightRain ? 80 : 20,
    "drought_risk": isDry ? 70 : 20,
    "flood_risk": hasHeavyRain ? 60 : 10,
    "crop_advice": {
      "rice": hasHeavyRain ? "Excellent rainfall for rice cultivation. Ensure proper drainage." : 
             hasLightRain ? "Good conditions for rice transplanting." :
             "Increase irrigation frequency for rice fields.",
      "wheat": hasHeavyRain ? "Delay harvesting until drier conditions." :
               hasLightRain ? "Favorable conditions for wheat growth." :
               "Monitor soil moisture levels closely.",
      "cotton": hasHeavyRain ? "Risk of bollworm due to high humidity. Monitor closely." :
                hasLightRain ? "Ideal conditions for cotton flowering." :
                "Increase irrigation to prevent heat stress.",
      "sugarcane": hasHeavyRain ? "Good for sugarcane growth but watch for waterlogging." :
                   "Continue regular irrigation schedule."
    },
    "irrigation_need": irrigation_need,
    "warnings": warnings.length > 0 ? warnings : ["Monitor weather conditions regularly"]
  };
  
  return JSON.stringify(demoResponse, null, 2);
}