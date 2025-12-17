"""
Weather Service Lambda Function
Generates realistic monsoon predictions using AWS Bedrock
Implements daily weather generation and impact calculations
"""
import json
import boto3
import random
import math
from datetime import datetime, timedelta
from typing import Dict, Any, List, Tuple
import os
from functools import lru_cache

# Initialize AWS clients with connection pooling and reuse
bedrock_client = None
s3_client = None

def get_bedrock_client():
    global bedrock_client
    if bedrock_client is None:
        bedrock_client = boto3.client(
            'bedrock-runtime',
            config=boto3.session.Config(
                retries={'max_attempts': 2, 'mode': 'adaptive'},
                max_pool_connections=10
            )
        )
    return bedrock_client

def get_s3_client():
    global s3_client
    if s3_client is None:
        s3_client = boto3.client(
            's3',
            config=boto3.session.Config(
                retries={'max_attempts': 2, 'mode': 'adaptive'},
                max_pool_connections=5
            )
        )
    return s3_client

# Historical IMD data patterns (simplified for simulation)
MONSOON_PATTERNS = {
    'weak': {'rainfall_range': (400, 600), 'drought_risk': 0.4, 'flood_risk': 0.05},
    'moderate': {'rainfall_range': (600, 1000), 'drought_risk': 0.2, 'flood_risk': 0.15},
    'strong': {'rainfall_range': (1000, 1500), 'drought_risk': 0.05, 'flood_risk': 0.35}
}

SEASONAL_WEATHER_PATTERNS = {
    'Kharif': {
        'temp_range': (25, 35),
        'humidity_range': (70, 90),
        'rainfall_probability': 0.7,
        'wind_range': (10, 25)
    },
    'Rabi': {
        'temp_range': (15, 25),
        'humidity_range': (40, 60),
        'rainfall_probability': 0.2,
        'wind_range': (5, 15)
    },
    'Zaid': {
        'temp_range': (30, 45),
        'humidity_range': (30, 50),
        'rainfall_probability': 0.1,
        'wind_range': (15, 30)
    },
    'Off-season': {
        'temp_range': (20, 30),
        'humidity_range': (50, 70),
        'rainfall_probability': 0.3,
        'wind_range': (8, 20)
    }
}

@lru_cache(maxsize=128)
def generate_monsoon_prediction_with_ai(season: str, current_conditions_hash: str) -> Dict[str, Any]:
    """
    Generate monsoon prediction using AWS Bedrock AI with caching
    """
    # Parse conditions from hash (simple implementation)
    current_conditions = json.loads(current_conditions_hash) if current_conditions_hash else {}
    
    try:
        # Optimized prompt for faster processing
        prompt = f"""Generate monsoon prediction for {season} season. Current: temp={current_conditions.get('temperature', 25)}°C, humidity={current_conditions.get('humidity', 60)}%, rainfall={current_conditions.get('rainfall', 0)}mm. Return JSON: {{"strength":"weak/moderate/strong","totalRainfall":number,"droughtRisk":0-1,"floodRisk":0-1,"confidence":0-1,"arrivalDate":"YYYY-MM-DD"}}"""
        
        request_body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 300,  # Reduced for faster response
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.7  # Slightly more deterministic for caching
        }
        
        bedrock = get_bedrock_client()
        response = bedrock.invoke_model(
            modelId="anthropic.claude-3-5-sonnet-20241022-v2:0",
            body=json.dumps(request_body)
        )
        
        response_body = json.loads(response['body'].read())
        ai_prediction = json.loads(response_body['content'][0]['text'])
        
        return ai_prediction
        
    except Exception as e:
        print(f"AI prediction failed, using fallback: {e}")
        # Fallback to rule-based prediction
        return generate_fallback_monsoon_prediction(season)

def generate_fallback_monsoon_prediction(season: str) -> Dict[str, Any]:
    """
    Fallback monsoon prediction using rule-based approach
    """
    # Simulate realistic monsoon prediction based on season
    if season == 'Kharif':
        strength = random.choices(['weak', 'moderate', 'strong'], weights=[0.2, 0.6, 0.2])[0]
    elif season == 'Rabi':
        strength = random.choices(['weak', 'moderate', 'strong'], weights=[0.5, 0.4, 0.1])[0]
    else:
        strength = random.choices(['weak', 'moderate', 'strong'], weights=[0.6, 0.3, 0.1])[0]
    
    pattern = MONSOON_PATTERNS[strength]
    rainfall = random.randint(*pattern['rainfall_range'])
    
    # Calculate arrival date (for Kharif season, typically June)
    if season == 'Kharif':
        arrival_date = (datetime.now() + timedelta(days=random.randint(10, 60))).strftime('%Y-%m-%d')
    else:
        arrival_date = (datetime.now() + timedelta(days=random.randint(30, 120))).strftime('%Y-%m-%d')
    
    return {
        'strength': strength,
        'totalRainfall': rainfall,
        'droughtRisk': pattern['drought_risk'] + random.uniform(-0.1, 0.1),
        'floodRisk': pattern['flood_risk'] + random.uniform(-0.05, 0.05),
        'confidence': random.uniform(0.6, 0.9),
        'arrivalDate': arrival_date
    }

def generate_daily_weather(season: str, day: int, monsoon_prediction: Dict) -> Dict[str, Any]:
    """
    Generate realistic daily weather based on season and monsoon prediction
    """
    pattern = SEASONAL_WEATHER_PATTERNS.get(season, SEASONAL_WEATHER_PATTERNS['Kharif'])
    
    # Base temperature with seasonal variation
    temp_min = random.randint(*pattern['temp_range']) - 5
    temp_max = temp_min + random.randint(8, 15)
    
    # Humidity based on season and monsoon strength
    humidity_base = random.randint(*pattern['humidity_range'])
    if monsoon_prediction['strength'] == 'strong':
        humidity_base = min(95, humidity_base + 10)
    elif monsoon_prediction['strength'] == 'weak':
        humidity_base = max(20, humidity_base - 10)
    
    # Rainfall calculation
    rainfall = 0
    conditions = 'clear'
    
    if random.random() < pattern['rainfall_probability']:
        if monsoon_prediction['strength'] == 'strong':
            rainfall = random.uniform(10, 50)
            conditions = 'heavy_rain' if rainfall > 25 else 'rain'
        elif monsoon_prediction['strength'] == 'moderate':
            rainfall = random.uniform(2, 20)
            conditions = 'rain' if rainfall > 10 else 'light_rain'
        else:
            rainfall = random.uniform(0, 5)
            conditions = 'light_rain' if rainfall > 2 else 'cloudy'
    else:
        # Determine clear weather conditions
        if humidity_base > 80:
            conditions = 'cloudy'
        elif temp_max > 40:
            conditions = 'hot'
        else:
            conditions = 'clear'
    
    wind_speed = random.randint(*pattern['wind_range'])
    
    return {
        'date': (datetime.now() + timedelta(days=day)).strftime('%Y-%m-%d'),
        'temperature': {'min': temp_min, 'max': temp_max},
        'humidity': humidity_base,
        'rainfall': round(rainfall, 1),
        'windSpeed': wind_speed,
        'conditions': conditions
    }

def calculate_weather_impact_on_crops(weather: Dict, crop_type: str, growth_stage: str) -> Dict[str, float]:
    """
    Calculate weather impact on crop growth and health
    """
    impact = {
        'growth_rate': 1.0,
        'health_change': 0.0,
        'yield_multiplier': 1.0,
        'water_requirement': 1.0
    }
    
    temp_max = weather['temperature']['max']
    rainfall = weather['rainfall']
    humidity = weather['humidity']
    
    # Temperature impact
    if crop_type in ['rice', 'cotton', 'sugarcane']:  # Kharif crops
        if temp_max < 20 or temp_max > 40:
            impact['growth_rate'] *= 0.7
            impact['health_change'] -= 5
        elif 25 <= temp_max <= 35:
            impact['growth_rate'] *= 1.2
            impact['health_change'] += 2
    elif crop_type in ['wheat', 'barley', 'peas']:  # Rabi crops
        if temp_max < 10 or temp_max > 30:
            impact['growth_rate'] *= 0.6
            impact['health_change'] -= 8
        elif 15 <= temp_max <= 25:
            impact['growth_rate'] *= 1.3
            impact['health_change'] += 3
    
    # Rainfall impact
    if rainfall > 50:  # Heavy rain
        if growth_stage in ['seedling', 'flowering']:
            impact['health_change'] -= 10  # Vulnerable stages
        impact['water_requirement'] *= 0.5
    elif rainfall > 20:  # Moderate rain
        impact['health_change'] += 5
        impact['water_requirement'] *= 0.7
    elif rainfall < 2:  # Drought conditions
        impact['health_change'] -= 3
        impact['water_requirement'] *= 1.5
    
    # Humidity impact
    if humidity > 85:
        impact['health_change'] -= 3  # Disease risk
    elif humidity < 30:
        impact['health_change'] -= 2  # Stress
    
    # Growth stage specific impacts
    if growth_stage == 'flowering' and rainfall > 30:
        impact['yield_multiplier'] *= 0.8  # Pollination issues
    elif growth_stage == 'mature' and rainfall > 40:
        impact['yield_multiplier'] *= 0.7  # Harvest issues
    
    return impact

def generate_extreme_weather_events(monsoon_prediction: Dict, season: str) -> List[Dict]:
    """
    Generate extreme weather events based on monsoon prediction
    """
    events = []
    
    # Drought events
    if monsoon_prediction['droughtRisk'] > 0.3:
        if random.random() < monsoon_prediction['droughtRisk']:
            events.append({
                'id': f"drought_{datetime.now().timestamp()}",
                'type': 'drought',
                'severity': random.uniform(0.5, 1.0),
                'startDate': (datetime.now() + timedelta(days=random.randint(10, 60))).strftime('%Y-%m-%d'),
                'duration': random.randint(15, 45),
                'impact': 'Reduced crop yields, increased irrigation costs, water scarcity'
            })
    
    # Flood events
    if monsoon_prediction['floodRisk'] > 0.2:
        if random.random() < monsoon_prediction['floodRisk']:
            events.append({
                'id': f"flood_{datetime.now().timestamp()}",
                'type': 'flood',
                'severity': random.uniform(0.4, 0.9),
                'startDate': (datetime.now() + timedelta(days=random.randint(5, 30))).strftime('%Y-%m-%d'),
                'duration': random.randint(3, 10),
                'impact': 'Crop damage, soil erosion, delayed planting/harvesting'
            })
    
    # Cyclone events (mainly for coastal areas during monsoon)
    if season == 'Kharif' and monsoon_prediction['strength'] == 'strong':
        if random.random() < 0.1:  # 10% chance during strong monsoon
            events.append({
                'id': f"cyclone_{datetime.now().timestamp()}",
                'type': 'cyclone',
                'severity': random.uniform(0.6, 1.0),
                'startDate': (datetime.now() + timedelta(days=random.randint(20, 80))).strftime('%Y-%m-%d'),
                'duration': random.randint(2, 5),
                'impact': 'Severe crop damage, infrastructure damage, emergency evacuation'
            })
    
    return events

def generate_crop_care_recommendations(weather: Dict, crop_type: str, growth_stage: str) -> List[str]:
    """
    Generate crop care recommendations based on weather conditions
    """
    recommendations = []
    
    temp_max = weather['temperature']['max']
    rainfall = weather['rainfall']
    humidity = weather['humidity']
    
    # Temperature-based recommendations
    if temp_max > 40:
        recommendations.append("Provide shade or increase irrigation frequency due to high temperatures")
        recommendations.append("Consider mulching to reduce soil temperature")
    elif temp_max < 15:
        recommendations.append("Protect crops from cold stress, consider covering young plants")
    
    # Rainfall-based recommendations
    if rainfall > 50:
        recommendations.append("Ensure proper drainage to prevent waterlogging")
        recommendations.append("Monitor for fungal diseases due to excess moisture")
    elif rainfall < 2:
        recommendations.append("Increase irrigation frequency due to dry conditions")
        recommendations.append("Consider drought-resistant farming practices")
    
    # Humidity-based recommendations
    if humidity > 85:
        recommendations.append("Monitor for pest and disease outbreaks in high humidity")
        recommendations.append("Ensure good air circulation around plants")
    
    # Growth stage specific recommendations
    if growth_stage == 'flowering':
        if rainfall > 30:
            recommendations.append("Protect flowering crops from heavy rain to ensure pollination")
        recommendations.append("Monitor closely as flowering stage is critical for yield")
    elif growth_stage == 'mature':
        if rainfall > 20:
            recommendations.append("Plan harvest timing to avoid rain damage to mature crops")
    
    return recommendations if recommendations else ["Weather conditions are favorable for normal crop care"]

# Response caching for frequently requested data
response_cache = {}
CACHE_TTL = 300  # 5 minutes

def get_cached_response(cache_key: str) -> Dict[str, Any] | None:
    """Get cached response if still valid"""
    if cache_key in response_cache:
        cached_data, timestamp = response_cache[cache_key]
        if datetime.now().timestamp() - timestamp < CACHE_TTL:
            return cached_data
        else:
            del response_cache[cache_key]
    return None

def cache_response(cache_key: str, data: Dict[str, Any]) -> None:
    """Cache response with timestamp"""
    response_cache[cache_key] = (data, datetime.now().timestamp())

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Optimized Lambda handler for weather prediction service
    """
    try:
        # Parse request body efficiently
        if 'body' in event:
            body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
        else:
            body = event
        
        action = body.get('action', 'predict')
        
        # Create cache key for cacheable requests
        cache_key = None
        if action in ['predict', 'daily']:
            cache_key = f"{action}_{body.get('season', 'Kharif')}_{body.get('day', 0)}"
            
            # Check cache first
            cached_response = get_cached_response(cache_key)
            if cached_response:
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                        'X-Cache': 'HIT'
                    },
                    'body': json.dumps(cached_response)
                }
        
        # Process request
        if action == 'predict':
            season = body.get('season', 'Kharif')
            current_conditions = body.get('currentConditions', {})
            
            # Use cached AI prediction
            conditions_hash = json.dumps(current_conditions, sort_keys=True)
            monsoon_prediction = generate_monsoon_prediction_with_ai(season, conditions_hash)
            
            # Generate forecast efficiently
            forecast = [generate_daily_weather(season, day, monsoon_prediction) for day in range(7)]
            extreme_events = generate_extreme_weather_events(monsoon_prediction, season)
            
            response_data = {
                'monsoonPrediction': monsoon_prediction,
                'forecast': forecast,
                'extremeEvents': extreme_events,
                'generatedAt': datetime.now().isoformat(),
                'cached': False
            }
            
        elif action == 'impact':
            weather_data = body.get('weather', {})
            crop_type = body.get('cropType', 'rice')
            growth_stage = body.get('growthStage', 'vegetative')
            
            impact = calculate_weather_impact_on_crops(weather_data, crop_type, growth_stage)
            
            response_data = {
                'impact': impact,
                'recommendations': generate_crop_care_recommendations(weather_data, crop_type, growth_stage)
            }
            
        elif action == 'daily':
            season = body.get('season', 'Kharif')
            day = body.get('day', 0)
            monsoon_prediction = body.get('monsoonPrediction', {'strength': 'moderate'})
            
            daily_weather = generate_daily_weather(season, day, monsoon_prediction)
            response_data = {'weather': daily_weather}
            
        else:
            raise ValueError(f"Unknown action: {action}")
        
        # Cache the response if applicable
        if cache_key:
            cache_response(cache_key, response_data)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'X-Cache': 'MISS'
            },
            'body': json.dumps(response_data)
        }
        
    except Exception as e:
        print(f"Weather service error: {e}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({
                'error': str(e),
                'message': 'Weather service error'
            })
        }