/**
 * Weather Advisory Service
 * Combines real weather data with AI farming recommendations
 */

import { callGemini } from './geminiService';
import type { WeatherData } from './weatherService';

export interface WeatherAdvisory {
  overall_condition: string;
  total_rainfall: number;
  drought_risk: number;
  flood_risk: number;
  crop_advice: { [cropType: string]: string };
  irrigation_need: string;
  warnings: string[];
  source: 'AI Advisory (Google Gemini)' | 'Demo Advisory';
}

export async function getWeatherAdvisory(
  weatherData: WeatherData,
  _region: string,
  currentCrops: string[] = ['rice', 'wheat', 'cotton', 'sugarcane']
): Promise<WeatherAdvisory> {
  
  console.log('🤖 Generating AI weather advisory...');
  
  const prompt = `You are an expert agricultural advisor for Indian farmers in ${_region}.

REAL WEATHER FORECAST DATA (Next 7 days):
${JSON.stringify(weatherData.forecast, null, 2)}

WEATHER SUMMARY:
- Total Rainfall: ${weatherData.summary.total_rainfall}mm
- Average Temperature: ${weatherData.summary.avg_temp}°C
- Drought Risk: ${weatherData.summary.drought_risk}%
- Flood Risk: ${weatherData.summary.flood_risk}%

CURRENT CROPS PLANTED: ${currentCrops.join(', ')}

TASK: Based on this REAL weather forecast, provide farming advisory in JSON format.

Consider:
1. Indian monsoon patterns and seasonal farming
2. Crop-specific water requirements
3. Temperature stress on different crops
4. Pest and disease risks based on humidity/rainfall
5. Optimal timing for planting, irrigation, and harvesting

Return ONLY valid JSON in this exact format:
{
  "overall_condition": "Excellent/Good/Fair/Poor - brief reason",
  "total_rainfall": ${weatherData.summary.total_rainfall},
  "drought_risk": ${weatherData.summary.drought_risk},
  "flood_risk": ${weatherData.summary.flood_risk},
  "crop_advice": {
    "rice": "Specific advice for rice based on weather",
    "wheat": "Specific advice for wheat based on weather", 
    "cotton": "Specific advice for cotton based on weather",
    "sugarcane": "Specific advice for sugarcane based on weather"
  },
  "irrigation_need": "Detailed irrigation recommendations",
  "warnings": ["Array of specific weather-related warnings for farmers"]
}

Focus on actionable, practical advice that Indian farmers can implement immediately.`;

  try {
    const response = await callGemini(prompt);
    
    // Extract JSON from AI response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }
    
    const advisory = JSON.parse(jsonMatch[0]);
    
    // Validate and sanitize the response
    const validatedAdvisory: WeatherAdvisory = {
      overall_condition: advisory.overall_condition || 'Good',
      total_rainfall: advisory.total_rainfall || weatherData.summary.total_rainfall,
      drought_risk: Math.max(0, Math.min(100, advisory.drought_risk || weatherData.summary.drought_risk)),
      flood_risk: Math.max(0, Math.min(100, advisory.flood_risk || weatherData.summary.flood_risk)),
      crop_advice: advisory.crop_advice || {
        rice: 'Monitor weather conditions and adjust irrigation accordingly.',
        wheat: 'Continue normal farming operations.',
        cotton: 'Watch for pest activity due to weather changes.',
        sugarcane: 'Maintain regular irrigation schedule.'
      },
      irrigation_need: advisory.irrigation_need || 'Moderate irrigation recommended based on weather conditions.',
      warnings: Array.isArray(advisory.warnings) ? advisory.warnings : ['Monitor weather conditions regularly'],
      source: 'AI Advisory (Google Gemini)'
    };
    
    console.log('✅ AI weather advisory generated successfully');
    return validatedAdvisory;
    
  } catch (error) {
    console.error('❌ Error generating AI advisory:', error);
    console.log('🔄 Using fallback advisory');
    
    // Fallback advisory based on weather data
    return generateFallbackAdvisory(weatherData, _region);
  }
}

function generateFallbackAdvisory(weatherData: WeatherData, _region: string): WeatherAdvisory {
  const { total_rainfall, drought_risk, flood_risk, avg_temp } = weatherData.summary;
  
  let overall_condition = 'Good';
  let irrigation_need = 'Moderate irrigation recommended';
  let warnings = ['Monitor local weather conditions'];
  
  // Determine conditions based on weather data
  if (flood_risk > 60) {
    overall_condition = 'Poor - High Flood Risk';
    irrigation_need = 'Minimal irrigation - excess water expected';
    warnings = ['Heavy rainfall may cause waterlogging', 'Ensure proper field drainage'];
  } else if (drought_risk > 60) {
    overall_condition = 'Poor - High Drought Risk';
    irrigation_need = 'Intensive irrigation required';
    warnings = ['Low rainfall expected', 'Conserve water resources'];
  } else if (total_rainfall > 100) {
    overall_condition = 'Excellent - Good Rainfall';
    irrigation_need = 'Reduced irrigation needed';
  } else if (avg_temp > 35) {
    overall_condition = 'Fair - High Temperature';
    irrigation_need = 'Increase irrigation frequency';
    warnings = ['High temperatures may stress crops', 'Provide shade for sensitive crops'];
  }
  
  // Generate crop-specific advice
  const crop_advice: { [key: string]: string } = {
    rice: total_rainfall > 50 ? 
      'Excellent conditions for rice cultivation. Ensure proper drainage to prevent waterlogging.' :
      'Increase irrigation frequency. Consider drought-resistant varieties.',
    
    wheat: total_rainfall > 30 ? 
      'Good moisture conditions for wheat. Monitor for fungal diseases.' :
      'Provide supplemental irrigation. Wheat is sensitive to water stress.',
    
    cotton: flood_risk > 40 ? 
      'High humidity may increase pest risk. Monitor for bollworm and aphids.' :
      drought_risk > 40 ? 'Ensure adequate irrigation during flowering stage.' :
      'Favorable conditions for cotton growth.',
    
    sugarcane: total_rainfall > 80 ? 
      'Excellent conditions for sugarcane growth. Monitor soil drainage.' :
      'Maintain regular irrigation. Sugarcane requires consistent moisture.'
  };
  
  return {
    overall_condition,
    total_rainfall,
    drought_risk,
    flood_risk,
    crop_advice,
    irrigation_need,
    warnings,
    source: 'Demo Advisory'
  };
}