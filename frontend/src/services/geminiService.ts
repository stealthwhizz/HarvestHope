/**
 * Google Gemini AI Service for Weather Advisory
 * Uses free Gemini API for farming recommendations
 */

// Free Gemini API endpoint
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

// You can get a free API key from: https://makersuite.google.com/app/apikey
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'demo-mode';

export async function callGemini(prompt: string): Promise<string> {
  try {
    if (GEMINI_API_KEY === 'demo-mode') {
      console.log('🤖 Gemini API key not configured, using demo response');
      return generateDemoResponse(prompt);
    }
    
    console.log('🤖 Calling Google Gemini API...');
    
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid Gemini API response');
    }
    
    const aiResponse = data.candidates[0].content.parts[0].text;
    console.log('✅ Gemini AI response received');
    
    return aiResponse;
    
  } catch (error) {
    console.error('❌ Gemini API error:', error);
    console.log('🔄 Falling back to demo response');
    return generateDemoResponse(prompt);
  }
}

// Generate demo response when API is not available
function generateDemoResponse(prompt: string): string {
  // Extract weather data from prompt for realistic demo
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