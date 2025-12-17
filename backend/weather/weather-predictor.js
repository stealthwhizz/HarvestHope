/**
 * AWS Lambda Function: Weather Predictor
 * Uses AWS Bedrock Claude 3.5 Sonnet for AI-powered weather predictions
 * Tailored for Indian farming context with monsoon patterns
 */

const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

// Initialize Bedrock client
const bedrockClient = new BedrockRuntimeClient({ 
    region: process.env.AWS_REGION || "us-east-1" 
});

// Claude 3.5 Sonnet model ID
const MODEL_ID = "anthropic.claude-3-5-sonnet-20241022-v2:0";

exports.handler = async (event) => {
    console.log('Weather Predictor Lambda invoked:', JSON.stringify(event, null, 2));
    
    try {
        // Parse input
        const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        const { region = "Maharashtra", season = "Kharif", day = 1, currentWeather = "sunny" } = body;
        
        // Create sophisticated agricultural meteorology prompt
        const prompt = createWeatherPrompt(region, season, day, currentWeather);
        
        // Call AWS Bedrock
        const response = await callBedrock(prompt);
        
        // Parse AI response into structured weather data
        const weatherData = parseWeatherResponse(response);
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: JSON.stringify({
                success: true,
                data: weatherData,
                region,
                season,
                day,
                generatedAt: new Date().toISOString()
            })
        };
        
    } catch (error) {
        console.error('Weather prediction error:', error);
        
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                error: error.message,
                fallback: generateFallbackWeather()
            })
        };
    }
};

/**
 * Create sophisticated prompt for agricultural meteorology AI
 */
function createWeatherPrompt(region, season, day, currentWeather) {
    return `You are an expert agricultural meteorologist specializing in Indian monsoon patterns and farming weather predictions. 

CONTEXT:
- Region: ${region}, India
- Current Season: ${season}
- Day in Season: ${day}
- Current Weather: ${currentWeather}

INDIAN AGRICULTURAL SEASONS:
- Kharif (June-October): Southwest monsoon, rice/cotton season
- Rabi (November-April): Post-monsoon winter crops, wheat season  
- Zaid (April-June): Summer crops, sugarcane/fodder
- Off-season: Transition periods

TASK: Generate a realistic 7-day weather forecast for ${region} during ${season} season, day ${day}.

REQUIREMENTS:
1. Consider authentic Indian monsoon patterns for ${region}
2. Include realistic rainfall amounts (0-100mm daily during monsoon)
3. Temperature ranges appropriate for ${season} (15-45°C)
4. Weather conditions: sunny, partly_cloudy, cloudy, light_rain, heavy_rain, thunderstorm
5. Provide farming-specific advisory for each day
6. Consider regional climate patterns (Western Ghats, Gangetic plains, etc.)

OUTPUT FORMAT (JSON):
{
  "forecast": [
    {
      "day": 1,
      "date": "Day ${day + 1}",
      "condition": "heavy_rain",
      "icon": "🌧️",
      "temperature": {"min": 24, "max": 28},
      "rainfall": 45,
      "humidity": 85,
      "advisory": "Heavy monsoon rain expected. Avoid field operations. Good for rice nursery preparation."
    }
    // ... 6 more days
  ],
  "summary": "Southwest monsoon active over ${region}. Expect good rainfall for Kharif crops.",
  "farming_tips": [
    "Ensure proper drainage in rice fields",
    "Monitor for pest outbreaks due to high humidity",
    "Delay cotton sowing until rain subsides"
  ]
}

Generate realistic, region-appropriate weather data that reflects actual Indian agricultural meteorology patterns.`;
}

/**
 * Call AWS Bedrock Claude 3.5 Sonnet
 */
async function callBedrock(prompt) {
    const payload = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 2000,
        temperature: 0.3, // Lower temperature for more consistent weather data
        messages: [
            {
                role: "user",
                content: prompt
            }
        ]
    };
    
    const command = new InvokeModelCommand({
        modelId: MODEL_ID,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(payload)
    });
    
    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    return responseBody.content[0].text;
}

/**
 * Parse AI response into structured weather data
 */
function parseWeatherResponse(aiResponse) {
    try {
        // Extract JSON from AI response
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found in AI response');
        }
        
        const weatherData = JSON.parse(jsonMatch[0]);
        
        // Validate and sanitize data
        if (!weatherData.forecast || !Array.isArray(weatherData.forecast)) {
            throw new Error('Invalid forecast format');
        }
        
        // Ensure all required fields are present
        weatherData.forecast = weatherData.forecast.map((day, index) => ({
            day: day.day || index + 1,
            date: day.date || `Day ${index + 1}`,
            condition: day.condition || 'sunny',
            icon: day.icon || getWeatherIcon(day.condition || 'sunny'),
            temperature: {
                min: Math.max(15, Math.min(45, day.temperature?.min || 20)),
                max: Math.max(15, Math.min(45, day.temperature?.max || 30))
            },
            rainfall: Math.max(0, Math.min(200, day.rainfall || 0)),
            humidity: Math.max(30, Math.min(100, day.humidity || 60)),
            advisory: day.advisory || 'Normal farming operations can continue.'
        }));
        
        return weatherData;
        
    } catch (error) {
        console.error('Error parsing AI response:', error);
        throw new Error('Failed to parse weather prediction');
    }
}

/**
 * Get appropriate weather icon for condition
 */
function getWeatherIcon(condition) {
    const iconMap = {
        'sunny': '☀️',
        'partly_cloudy': '🌤️',
        'cloudy': '☁️',
        'light_rain': '🌦️',
        'heavy_rain': '🌧️',
        'thunderstorm': '⛈️'
    };
    return iconMap[condition] || '🌤️';
}

/**
 * Generate fallback weather data if AI fails
 */
function generateFallbackWeather() {
    const conditions = ['sunny', 'partly_cloudy', 'cloudy', 'light_rain'];
    const forecast = [];
    
    for (let i = 0; i < 7; i++) {
        const condition = conditions[Math.floor(Math.random() * conditions.length)];
        forecast.push({
            day: i + 1,
            date: `Day ${i + 1}`,
            condition,
            icon: getWeatherIcon(condition),
            temperature: {
                min: 20 + Math.floor(Math.random() * 5),
                max: 28 + Math.floor(Math.random() * 8)
            },
            rainfall: condition.includes('rain') ? Math.floor(Math.random() * 30) + 5 : 0,
            humidity: 50 + Math.floor(Math.random() * 30),
            advisory: 'Weather prediction service temporarily unavailable. Using fallback data.'
        });
    }
    
    return {
        forecast,
        summary: 'Fallback weather data - AI service unavailable',
        farming_tips: [
            'Monitor local weather conditions',
            'Prepare for variable weather patterns',
            'Ensure adequate water management'
        ]
    };
}