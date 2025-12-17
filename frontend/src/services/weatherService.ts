/**
 * Real Weather Service using Open-Meteo API
 * No API key required - completely free!
 */

// Open-Meteo API (NO KEY NEEDED!)
const WEATHER_API = 'https://api.open-meteo.com/v1/forecast';

// Indian farming regions coordinates
const REGIONS = {
  maharashtra: { lat: 19.0760, lon: 72.8777, name: 'Maharashtra' },
  punjab: { lat: 30.9010, lon: 75.8573, name: 'Punjab' },
  tamilnadu: { lat: 11.1271, lon: 78.6569, name: 'Tamil Nadu' },
  karnataka: { lat: 15.3173, lon: 75.7139, name: 'Karnataka' },
  rajasthan: { lat: 27.0238, lon: 74.2179, name: 'Rajasthan' },
  uttarpradesh: { lat: 26.8467, lon: 80.9462, name: 'Uttar Pradesh' }
};

export interface WeatherDay {
  date: string;
  day_number: number;
  temp_min: number;
  temp_max: number;
  rainfall_mm: number;
  humidity: number;
  condition: string;
  icon: string;
  soil_moisture: number;
}

export interface WeatherData {
  region: string;
  forecast: WeatherDay[];
  summary: {
    total_rainfall: number;
    avg_temp: number;
    drought_risk: number;
    flood_risk: number;
  };
  source: 'Real Weather Data (Open-Meteo)';
}

export async function getRealWeatherData(region: string = 'maharashtra'): Promise<WeatherData> {
  try {
    const coords = REGIONS[region.toLowerCase() as keyof typeof REGIONS] || REGIONS.maharashtra;
    
    console.log(`🌍 Fetching real weather data for ${coords.name}...`);
    
    const params = new URLSearchParams({
      latitude: coords.lat.toString(),
      longitude: coords.lon.toString(),
      hourly: 'temperature_2m,precipitation,relative_humidity_2m,soil_moisture_0_to_10cm',
      daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max',
      forecast_days: '7',
      timezone: 'Asia/Kolkata'
    });

    const response = await fetch(`${WEATHER_API}?${params}`);
    
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('✅ Real weather data received:', data);
    
    // Transform to our format
    const forecast: WeatherDay[] = data.daily.time.map((date: string, i: number) => {
      const temp_min = Math.round(data.daily.temperature_2m_min[i]);
      const temp_max = Math.round(data.daily.temperature_2m_max[i]);
      const rainfall_mm = Math.round(data.daily.precipitation_sum[i] || 0);
      const humidity = Math.round(data.hourly.relative_humidity_2m[i * 24] || 60);
      const soil_moisture = Math.round(data.hourly.soil_moisture_0_to_10cm[i * 24] || 30);
      
      // Determine weather condition based on rainfall and temperature
      let condition = 'sunny';
      let icon = '☀️';
      
      if (rainfall_mm > 20) {
        condition = 'heavy_rain';
        icon = '🌧️';
      } else if (rainfall_mm > 5) {
        condition = 'light_rain';
        icon = '🌦️';
      } else if (humidity > 80) {
        condition = 'cloudy';
        icon = '☁️';
      } else if (temp_max > 35) {
        condition = 'hot_sunny';
        icon = '🌞';
      } else {
        condition = 'partly_cloudy';
        icon = '🌤️';
      }
      
      return {
        date: new Date(date).toLocaleDateString('en-IN'),
        day_number: i + 1,
        temp_min,
        temp_max,
        rainfall_mm,
        humidity,
        condition,
        icon,
        soil_moisture
      };
    });
    
    // Calculate summary statistics
    const total_rainfall = forecast.reduce((sum, day) => sum + day.rainfall_mm, 0);
    const avg_temp = Math.round(
      forecast.reduce((sum, day) => sum + (day.temp_min + day.temp_max) / 2, 0) / forecast.length
    );
    
    // Calculate risk factors
    const drought_risk = total_rainfall < 20 ? 80 : total_rainfall < 50 ? 40 : 10;
    const flood_risk = forecast.some(day => day.rainfall_mm > 50) ? 70 : 
                      forecast.some(day => day.rainfall_mm > 30) ? 40 : 10;
    
    return {
      region: coords.name,
      forecast,
      summary: {
        total_rainfall,
        avg_temp,
        drought_risk,
        flood_risk
      },
      source: 'Real Weather Data (Open-Meteo)'
    };
    
  } catch (error) {
    console.error('❌ Real weather API error:', error);
    throw error;
  }
}

// Get weather condition emoji
export function getWeatherIcon(condition: string): string {
  const iconMap: { [key: string]: string } = {
    'sunny': '☀️',
    'hot_sunny': '🌞',
    'partly_cloudy': '🌤️',
    'cloudy': '☁️',
    'light_rain': '🌦️',
    'heavy_rain': '🌧️',
    'thunderstorm': '⛈️'
  };
  return iconMap[condition] || '🌤️';
}

// Get farming condition based on weather
export function getFarmingCondition(weatherData: WeatherData): string {
  const { total_rainfall, drought_risk, flood_risk } = weatherData.summary;
  
  if (flood_risk > 60) return 'Poor - Flood Risk';
  if (drought_risk > 60) return 'Poor - Drought Risk';
  if (total_rainfall > 100 && total_rainfall < 200) return 'Excellent';
  if (total_rainfall > 50) return 'Good';
  if (total_rainfall > 20) return 'Fair';
  return 'Poor - Low Rainfall';
}