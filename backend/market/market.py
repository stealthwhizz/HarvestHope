"""
Market Service Lambda Function for Harvest Hope
Handles crop price simulation, market dynamics, and selling advice
"""

import json
import boto3
import logging
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Any, Optional
import uuid
import random
import math
from functools import lru_cache

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# AWS clients with connection pooling
dynamodb = None
bedrock = None

def get_dynamodb():
    global dynamodb
    if dynamodb is None:
        dynamodb = boto3.resource(
            'dynamodb',
            config=boto3.session.Config(
                retries={'max_attempts': 2, 'mode': 'adaptive'},
                max_pool_connections=10
            )
        )
    return dynamodb

def get_bedrock():
    global bedrock
    if bedrock is None:
        bedrock = boto3.client(
            'bedrock-runtime',
            config=boto3.session.Config(
                retries={'max_attempts': 2, 'mode': 'adaptive'},
                max_pool_connections=5
            )
        )
    return bedrock

class MarketService:
    """Core market service for price simulation and selling advice"""
    
    def __init__(self):
        db = get_dynamodb()
        self.market_data_table = db.Table('HarvestHope-MarketData')
        self.price_history_table = db.Table('HarvestHope-PriceHistory')
        
        # MSP (Minimum Support Price) data for major crops (₹ per quintal)
        self.msp_data = {
            'wheat': 2125,
            'rice': 2183,
            'cotton': 6080,
            'sugarcane': 315,  # per tonne
            'maize': 1962,
            'soybean': 4300,
            'mustard': 5450,
            'gram': 5335,
            'tur': 6600,
            'groundnut': 5850,
            'sunflower': 6400,
            'sesame': 7307,
            'safflower': 5441,
            'nigerseed': 7287,
            'linseed': 5940
        }
        
        # Market channels with their characteristics
        self.market_channels = {
            'local_mandi': {
                'name': 'Local Mandi',
                'price_factor': 0.85,  # 85% of market price due to middlemen
                'transport_cost': 50,  # ₹ per quintal
                'commission': 0.02,  # 2% commission
                'payment_delay_days': 1,
                'reliability': 0.95,
                'available': True,
                'requirements': ['Basic quality check']
            },
            'apmc': {
                'name': 'APMC Market',
                'price_factor': 0.92,  # 92% of market price
                'transport_cost': 150,  # ₹ per quintal
                'commission': 0.025,  # 2.5% commission
                'payment_delay_days': 3,
                'reliability': 0.98,
                'available': True,
                'requirements': ['APMC registration', 'Quality certificate']
            },
            'enam': {
                'name': 'eNAM Platform',
                'price_factor': 0.96,  # 96% of market price
                'transport_cost': 100,  # ₹ per quintal
                'commission': 0.01,  # 1% commission
                'payment_delay_days': 7,
                'reliability': 0.99,
                'available': True,
                'requirements': ['eNAM registration', 'Digital payment setup', 'Quality assaying']
            },
            'direct_sale': {
                'name': 'Direct to Consumer',
                'price_factor': 1.15,  # 115% of market price
                'transport_cost': 200,  # ₹ per quintal
                'commission': 0.0,  # No commission
                'payment_delay_days': 0,
                'reliability': 0.85,
                'available': True,
                'requirements': ['Customer network', 'Transportation arrangement']
            },
            'cooperative': {
                'name': 'Farmer Cooperative',
                'price_factor': 0.98,  # 98% of market price
                'transport_cost': 75,  # ₹ per quintal
                'commission': 0.005,  # 0.5% commission
                'payment_delay_days': 5,
                'reliability': 0.97,
                'available': True,
                'requirements': ['Cooperative membership', 'Share contribution']
            },
            'government_procurement': {
                'name': 'Government Procurement',
                'price_factor': 1.0,  # Exactly MSP
                'transport_cost': 25,  # ₹ per quintal
                'commission': 0.0,  # No commission
                'payment_delay_days': 14,
                'reliability': 1.0,
                'available': False,  # Conditionally available
                'requirements': ['Farmer registration', 'Land documents', 'Quality standards']
            }
        }
        
        # Storage options with characteristics
        self.storage_options = {
            'farm_storage': {
                'name': 'On-Farm Storage',
                'capacity': 1000,  # kg
                'cost_per_day': 0.5,  # ₹ per kg per day
                'deterioration_rate': 0.02,  # 2% quality loss per day
                'location': 'Farm premises',
                'features': ['Basic protection', 'Easy access'],
                'available': True
            },
            'warehouse': {
                'name': 'Local Warehouse',
                'capacity': 5000,  # kg
                'cost_per_day': 1.0,  # ₹ per kg per day
                'deterioration_rate': 0.01,  # 1% quality loss per day
                'location': '5km from farm',
                'features': ['Climate controlled', 'Pest protection', 'Insurance coverage'],
                'available': True
            },
            'cold_storage': {
                'name': 'Cold Storage Facility',
                'capacity': 2000,  # kg
                'cost_per_day': 2.0,  # ₹ per kg per day
                'deterioration_rate': 0.005,  # 0.5% quality loss per day
                'location': '15km from farm',
                'features': ['Temperature controlled', 'Extended shelf life', 'Premium quality maintenance'],
                'available': True
            }
        }
    
    @lru_cache(maxsize=256)
    def simulate_market_price(self, crop_type: str, season: str, weather_conditions_hash: str, 
                            supply_factors_hash: str, demand_factors_hash: str) -> Dict[str, Any]:
        """
        Simulate realistic market prices based on supply/demand dynamics (cached)
        """
        try:
            # Parse hashed parameters
            weather_conditions = json.loads(weather_conditions_hash) if weather_conditions_hash else {}
            supply_factors = json.loads(supply_factors_hash) if supply_factors_hash else {}
            demand_factors = json.loads(demand_factors_hash) if demand_factors_hash else {}
            
            base_msp = self.msp_data.get(crop_type.lower(), 2000)
            
            # Base market price starts at 110% of MSP (normal market conditions)
            base_price = base_msp * 1.1
            
            # Weather impact on supply
            weather_multiplier = self._calculate_weather_impact(weather_conditions)
            
            # Seasonal demand patterns
            seasonal_multiplier = self._calculate_seasonal_demand(crop_type, season)
            
            # Supply factors (local production, storage, imports)
            supply_multiplier = self._calculate_supply_impact(supply_factors)
            
            # Demand factors (population, exports, industrial use)
            demand_multiplier = self._calculate_demand_impact(demand_factors)
            
            # Market volatility (random factor)
            volatility_multiplier = random.uniform(0.95, 1.05)
            
            # Calculate final market price
            market_price = base_price * weather_multiplier * seasonal_multiplier * \
                          supply_multiplier * demand_multiplier * volatility_multiplier
            
            # Ensure price doesn't go below 50% MSP (government intervention threshold)
            market_price = max(market_price, base_msp * 0.5)
            
            # Rarely goes above 200% MSP except in extreme shortages
            if market_price > base_msp * 2.0:
                shortage_probability = random.random()
                if shortage_probability > 0.05:  # 5% chance of extreme shortage
                    market_price = base_msp * random.uniform(1.5, 2.0)
            
            # Generate price trend prediction
            trend = self._predict_price_trend(crop_type, market_price, base_msp, weather_conditions)
            
            return {
                'crop_type': crop_type,
                'current_price': round(market_price, 2),
                'msp': base_msp,
                'price_vs_msp': round((market_price / base_msp) * 100, 1),
                'trend': trend,
                'factors': {
                    'weather_impact': round((weather_multiplier - 1) * 100, 1),
                    'seasonal_demand': round((seasonal_multiplier - 1) * 100, 1),
                    'supply_situation': round((supply_multiplier - 1) * 100, 1),
                    'demand_situation': round((demand_multiplier - 1) * 100, 1)
                },
                'market_sentiment': self._get_market_sentiment(market_price, base_msp),
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Market price simulation error: {str(e)}")
            raise
    
    def _calculate_weather_impact(self, weather_conditions: Dict) -> float:
        """Calculate weather impact on crop supply and prices"""
        rainfall = weather_conditions.get('rainfall', 50)  # mm
        temperature = weather_conditions.get('temperature', 25)  # °C
        drought_risk = weather_conditions.get('drought_risk', 0)  # 0-1
        flood_risk = weather_conditions.get('flood_risk', 0)  # 0-1
        
        # Optimal rainfall range: 40-80mm per month
        if 40 <= rainfall <= 80:
            rainfall_factor = 1.0
        elif rainfall < 40:
            rainfall_factor = 1.0 + (40 - rainfall) * 0.01  # Drought increases prices
        else:
            rainfall_factor = 1.0 + (rainfall - 80) * 0.005  # Excess rain increases prices
        
        # Drought and flood risks
        drought_factor = 1.0 + drought_risk * 0.3  # Up to 30% price increase
        flood_factor = 1.0 + flood_risk * 0.25  # Up to 25% price increase
        
        return rainfall_factor * drought_factor * flood_factor
    
    def _calculate_seasonal_demand(self, crop_type: str, season: str) -> float:
        """Calculate seasonal demand patterns for different crops"""
        seasonal_patterns = {
            'wheat': {
                'Kharif': 0.9,    # Low demand during growing season
                'Rabi': 1.2,      # High demand during harvest
                'Zaid': 1.0,      # Normal demand
                'Off-season': 1.1  # Slightly higher demand
            },
            'rice': {
                'Kharif': 1.3,    # High demand during main season
                'Rabi': 0.9,      # Lower demand
                'Zaid': 1.0,      # Normal demand
                'Off-season': 1.1  # Slightly higher demand
            },
            'cotton': {
                'Kharif': 1.2,    # High demand during growing season
                'Rabi': 1.4,      # Peak demand during harvest
                'Zaid': 0.8,      # Low demand
                'Off-season': 0.9  # Lower demand
            }
        }
        
        return seasonal_patterns.get(crop_type.lower(), {}).get(season, 1.0)
    
    def _calculate_supply_impact(self, supply_factors: Dict) -> float:
        """Calculate supply-side factors affecting prices"""
        local_production = supply_factors.get('local_production', 1.0)  # Relative to normal
        storage_levels = supply_factors.get('storage_levels', 0.5)  # 0-1 (empty to full)
        imports = supply_factors.get('imports', 1.0)  # Relative to normal
        
        # Higher production = lower prices
        production_factor = 2.0 - local_production  # Inverse relationship
        
        # Higher storage = lower prices (more supply available)
        storage_factor = 1.0 + (0.5 - storage_levels) * 0.2
        
        # Higher imports = lower prices
        import_factor = 2.0 - imports  # Inverse relationship
        
        return (production_factor + storage_factor + import_factor) / 3
    
    def _calculate_demand_impact(self, demand_factors: Dict) -> float:
        """Calculate demand-side factors affecting prices"""
        population_growth = demand_factors.get('population_growth', 1.02)  # 2% annual growth
        export_demand = demand_factors.get('export_demand', 1.0)  # Relative to normal
        industrial_use = demand_factors.get('industrial_use', 1.0)  # Relative to normal
        
        # All demand factors directly correlate with prices
        return population_growth * export_demand * industrial_use
    
    def _predict_price_trend(self, crop_type: str, current_price: float, msp: float, 
                           weather_conditions: Dict) -> Dict[str, Any]:
        """Predict short-term price trends"""
        # Simple trend prediction based on current conditions
        price_ratio = current_price / msp
        
        if price_ratio > 1.5:
            trend_direction = 'declining'
            confidence = 0.7
            reason = 'High prices likely to attract more supply'
        elif price_ratio < 0.8:
            trend_direction = 'rising'
            confidence = 0.8
            reason = 'Low prices may trigger government intervention'
        else:
            # Random walk for normal prices
            trend_direction = random.choice(['stable', 'slightly_rising', 'slightly_declining'])
            confidence = 0.5
            reason = 'Normal market conditions with typical volatility'
        
        return {
            'direction': trend_direction,
            'confidence': confidence,
            'reason': reason,
            'forecast_days': 30
        }
    
    def _get_market_sentiment(self, current_price: float, msp: float) -> str:
        """Get market sentiment based on price levels"""
        ratio = current_price / msp
        
        if ratio >= 1.5:
            return 'very_bullish'
        elif ratio >= 1.2:
            return 'bullish'
        elif ratio >= 0.9:
            return 'neutral'
        elif ratio >= 0.7:
            return 'bearish'
        else:
            return 'very_bearish'
    
    def get_selling_options(self, crop_type: str, quantity: float, quality_grade: str,
                          location: str, current_price: float) -> List[Dict[str, Any]]:
        """Get available selling options with price calculations"""
        try:
            selling_options = []
            
            for channel_id, channel_info in self.market_channels.items():
                # Skip government procurement if price is above MSP
                msp = self.msp_data.get(crop_type.lower(), 2000)
                if channel_id == 'government_procurement' and current_price > msp:
                    continue
                
                # Calculate net price for this channel
                gross_price = current_price * channel_info['price_factor']
                transport_cost = channel_info['transport_cost'] * quantity / 100  # Convert to total cost
                commission = gross_price * quantity / 100 * channel_info['commission']
                net_revenue = (gross_price * quantity / 100) - transport_cost - commission
                
                # Quality adjustments
                quality_multiplier = self._get_quality_multiplier(quality_grade)
                net_revenue *= quality_multiplier
                
                # Check availability for government procurement
                available = channel_info.get('available', True)
                if channel_id == 'government_procurement':
                    available = current_price <= msp * 1.05  # Available if price near or below MSP

                selling_options.append({
                    'channel_id': channel_id,
                    'channel_name': channel_info['name'],
                    'gross_price_per_quintal': round(gross_price, 2),
                    'net_price_per_quintal': round((net_revenue * 100) / quantity, 2),
                    'total_revenue': round(net_revenue, 2),
                    'transport_cost': round(transport_cost, 2),
                    'commission': round(commission, 2),
                    'payment_delay_days': channel_info['payment_delay_days'],
                    'reliability_score': channel_info['reliability'],
                    'quality_adjustment': round((quality_multiplier - 1) * 100, 1),
                    'recommendation_score': self._calculate_recommendation_score(
                        net_revenue, channel_info, quality_multiplier
                    ),
                    'available': available,
                    'requirements': channel_info.get('requirements', [])
                })
            
            # Sort by recommendation score (highest first)
            selling_options.sort(key=lambda x: x['recommendation_score'], reverse=True)
            
            return selling_options
            
        except Exception as e:
            logger.error(f"Selling options calculation error: {str(e)}")
            raise
    
    def _get_quality_multiplier(self, quality_grade: str) -> float:
        """Get price multiplier based on crop quality"""
        quality_multipliers = {
            'premium': 1.15,
            'grade_a': 1.05,
            'grade_b': 1.0,
            'grade_c': 0.9,
            'below_standard': 0.75
        }
        return quality_multipliers.get(quality_grade.lower(), 1.0)
    
    def _calculate_recommendation_score(self, net_revenue: float, channel_info: Dict, 
                                      quality_multiplier: float) -> float:
        """Calculate recommendation score for selling channel"""
        # Factors: revenue (40%), reliability (30%), payment speed (20%), quality bonus (10%)
        revenue_score = min(net_revenue / 100000, 1.0) * 40  # Normalize to max 40 points
        reliability_score = channel_info['reliability'] * 30
        payment_speed_score = max(0, (14 - channel_info['payment_delay_days']) / 14) * 20
        quality_bonus = (quality_multiplier - 1) * 100 * 10
        
        return revenue_score + reliability_score + payment_speed_score + quality_bonus
    
    def get_selling_advice(self, crop_type: str, current_price: float, quantity: float,
                          storage_capacity: bool, financial_urgency: str) -> Dict[str, Any]:
        """Provide AI-powered selling advice based on market conditions"""
        try:
            msp = self.msp_data.get(crop_type.lower(), 2000)
            price_ratio = current_price / msp
            
            # Generate advice based on multiple factors
            advice = {
                'recommendation': '',
                'reasoning': [],
                'optimal_timing': '',
                'risk_factors': [],
                'alternative_strategies': []
            }
            
            # Price-based recommendations
            if price_ratio >= 1.3:
                advice['recommendation'] = 'sell_immediately'
                advice['reasoning'].append(f'Current price is {round((price_ratio - 1) * 100, 1)}% above MSP')
                advice['optimal_timing'] = 'Immediate sale recommended'
            elif price_ratio <= 0.8:
                if storage_capacity and financial_urgency != 'high':
                    advice['recommendation'] = 'wait_for_better_prices'
                    advice['reasoning'].append('Price below MSP - consider waiting if possible')
                    advice['optimal_timing'] = 'Wait 2-4 weeks for price recovery'
                else:
                    advice['recommendation'] = 'sell_to_government'
                    advice['reasoning'].append('Use government procurement at MSP')
                    advice['optimal_timing'] = 'Immediate sale to government agencies'
            else:
                advice['recommendation'] = 'monitor_and_decide'
                advice['reasoning'].append('Price near MSP - monitor market trends')
                advice['optimal_timing'] = 'Flexible timing based on cash needs'
            
            # Financial urgency considerations
            if financial_urgency == 'high':
                advice['reasoning'].append('High financial urgency suggests immediate sale')
                if advice['recommendation'] == 'wait_for_better_prices':
                    advice['recommendation'] = 'sell_best_available_option'
            
            # Storage considerations
            if not storage_capacity:
                advice['reasoning'].append('Limited storage capacity requires prompt sale')
                advice['risk_factors'].append('Post-harvest losses without proper storage')
            
            # Market trend analysis
            trend = self._predict_price_trend(crop_type, current_price, msp, {})
            if trend['direction'] in ['declining', 'slightly_declining']:
                advice['reasoning'].append('Market trend suggests declining prices')
                advice['risk_factors'].append('Potential price decline in coming weeks')
            elif trend['direction'] in ['rising', 'slightly_rising']:
                advice['reasoning'].append('Market trend suggests rising prices')
                if storage_capacity:
                    advice['alternative_strategies'].append('Consider holding for 2-3 weeks')
            
            # Alternative strategies
            if price_ratio < 1.0:
                advice['alternative_strategies'].append('Apply for government procurement')
                advice['alternative_strategies'].append('Explore value addition opportunities')
            
            if quantity > 50:  # Large quantities
                advice['alternative_strategies'].append('Consider selling in multiple lots')
                advice['alternative_strategies'].append('Explore direct buyer connections')
            
            return advice
            
        except Exception as e:
            logger.error(f"Selling advice generation error: {str(e)}")
            raise
    
    def get_market_intelligence(self, crop_type: str, region: str) -> Dict[str, Any]:
        """Get comprehensive market intelligence for informed decision making"""
        try:
            # Simulate market intelligence data
            intelligence = {
                'crop_type': crop_type,
                'region': region,
                'current_market_status': {
                    'supply_situation': random.choice(['surplus', 'balanced', 'deficit']),
                    'demand_strength': random.choice(['weak', 'moderate', 'strong']),
                    'storage_levels': random.uniform(0.3, 0.8),
                    'export_prospects': random.choice(['poor', 'fair', 'good', 'excellent'])
                },
                'price_drivers': [
                    'Monsoon performance in key growing regions',
                    'Government policy announcements',
                    'International market conditions',
                    'Storage and transportation costs'
                ],
                'upcoming_events': [
                    {
                        'event': 'Government MSP announcement',
                        'expected_date': '2024-03-15',
                        'potential_impact': 'positive'
                    },
                    {
                        'event': 'Harvest season peak',
                        'expected_date': '2024-04-01',
                        'potential_impact': 'negative'
                    }
                ],
                'regional_variations': {
                    'north': {'price_premium': 5, 'demand': 'high'},
                    'south': {'price_premium': -2, 'demand': 'moderate'},
                    'west': {'price_premium': 8, 'demand': 'high'},
                    'east': {'price_premium': -5, 'demand': 'low'}
                },
                'quality_premiums': {
                    'premium': 15,
                    'grade_a': 5,
                    'grade_b': 0,
                    'grade_c': -10,
                    'below_standard': -25
                }
            }
            
            return intelligence
            
        except Exception as e:
            logger.error(f"Market intelligence generation error: {str(e)}")
            raise
    
    def get_storage_options(self, crop_type: str, quantity: float, location: str) -> List[Dict[str, Any]]:
        """Get available storage options for crops"""
        try:
            storage_options = []
            
            for storage_id, storage_info in self.storage_options.items():
                # Check if storage can accommodate the quantity
                available = storage_info['available'] and quantity <= storage_info['capacity']
                
                storage_options.append({
                    'storage_id': storage_id,
                    'storage_name': storage_info['name'],
                    'capacity': storage_info['capacity'],
                    'cost_per_day': storage_info['cost_per_day'],
                    'deterioration_rate': storage_info['deterioration_rate'],
                    'location': storage_info['location'],
                    'features': storage_info['features'],
                    'available': available
                })
            
            return storage_options
            
        except Exception as e:
            logger.error(f"Storage options generation error: {str(e)}")
            raise
    
    def get_trend_analysis(self, crop_type: str, timeframe: str) -> Dict[str, Any]:
        """Get market trend analysis for informed decision making"""
        try:
            msp = self.msp_data.get(crop_type.lower(), 2000)
            current_price = msp * (0.9 + random.random() * 0.4)  # 90% to 130% of MSP
            
            # Determine trend based on price level
            if current_price > msp * 1.1:
                current_trend = 'bullish'
            elif current_price < msp * 0.95:
                current_trend = 'bearish'
            else:
                current_trend = 'neutral'
            
            analysis = {
                'crop_type': crop_type,
                'current_trend': current_trend,
                'price_momentum': (random.random() - 0.5) * 2,  # -1 to 1
                'volatility': 0.3 + random.random() * 0.4,  # 0.3 to 0.7
                'support_level': msp * 0.85,
                'resistance_level': msp * 1.4,
                'seasonal_pattern': {
                    'expected_peak_month': 4,  # April (harvest season)
                    'expected_low_month': 10,  # October (pre-harvest)
                    'seasonal_multiplier': 1.2
                },
                'technical_indicators': {
                    'moving_average_7d': current_price * (0.98 + random.random() * 0.04),
                    'moving_average_30d': current_price * (0.95 + random.random() * 0.1),
                    'rsi': 30 + random.random() * 40  # 30-70 range
                },
                'fundamental_factors': {
                    'supply_outlook': random.choice(['surplus', 'balanced', 'deficit']),
                    'demand_outlook': random.choice(['weak', 'moderate', 'strong']),
                    'government_intervention_risk': 0.8 if current_price < msp * 0.9 else 0.2
                }
            }
            
            return analysis
            
        except Exception as e:
            logger.error(f"Trend analysis generation error: {str(e)}")
            raise
    
    def get_advanced_recommendation(self, crop_type: str, quantity: float, current_price: float,
                                  storage_capacity: bool, financial_urgency: str, 
                                  quality_grade: str) -> Dict[str, Any]:
        """Provide advanced selling recommendations with storage considerations"""
        try:
            msp = self.msp_data.get(crop_type.lower(), 2000)
            price_ratio = current_price / msp
            
            # Determine action based on multiple factors
            if price_ratio > 1.3:
                action = 'sell_now'
                confidence = 0.9
                reasoning = ['Price significantly above MSP', 'High profit margins available', 'Risk of price correction']
                optimal_timing = 'Immediate'
            elif price_ratio < 0.8:
                if financial_urgency == 'high':
                    action = 'sell_government'
                    confidence = 0.8
                    reasoning = ['Price below MSP', 'High financial urgency', 'Government procurement available']
                    optimal_timing = 'Within 1 week'
                else:
                    action = 'store_and_wait'
                    confidence = 0.6
                    reasoning = ['Price below fair value', 'Storage may improve returns', 'Seasonal price recovery expected']
                    optimal_timing = '2-4 weeks'
            elif price_ratio < 1.0:
                if storage_capacity and financial_urgency != 'high':
                    action = 'store_and_wait'
                    confidence = 0.6
                    reasoning = ['Price below fair value', 'Storage available', 'Potential for price recovery']
                    optimal_timing = '2-4 weeks'
                else:
                    action = 'sell_government'
                    confidence = 0.7
                    reasoning = ['Price near MSP', 'Limited storage or urgent need', 'Government procurement safe option']
                    optimal_timing = 'Within 1 week'
            else:
                action = 'hold_short_term'
                confidence = 0.5
                reasoning = ['Price near fair value', 'Monitor for better opportunities', 'Moderate upside potential']
                optimal_timing = '1-2 weeks'
            
            # Adjust for financial urgency
            if financial_urgency == 'high' and action in ['store_and_wait', 'hold_short_term']:
                action = 'sell_now'
                reasoning.append('High financial urgency overrides storage strategy')
            
            recommendation = {
                'action': action,
                'confidence': confidence,
                'reasoning': reasoning,
                'optimal_timing': optimal_timing,
                'expected_price_range': {
                    'min': msp * 0.9,
                    'max': msp * 1.4,
                    'target': msp * 1.15
                },
                'risk_assessment': {
                    'storage_risk': 0.3 if action == 'store_and_wait' else 0.1,
                    'price_risk': 0.6 if price_ratio > 1.2 else 0.3,
                    'opportunity_cost': 0.2 if action == 'hold_short_term' else 0.4
                },
                'alternative_strategies': [
                    {
                        'strategy': 'Partial Sale',
                        'description': 'Sell 50% now, hold remainder',
                        'expected_outcome': 'Balanced risk-reward approach'
                    },
                    {
                        'strategy': 'Value Addition',
                        'description': 'Process crop for higher margins',
                        'expected_outcome': '15-25% price premium possible'
                    }
                ]
            }
            
            return recommendation
            
        except Exception as e:
            logger.error(f"Advanced recommendation generation error: {str(e)}")
            raise
    
    def check_government_procurement(self, crop_type: str, quantity: float, 
                                   current_price: float) -> Dict[str, Any]:
        """Check government procurement availability and requirements"""
        try:
            msp = self.msp_data.get(crop_type.lower(), 2000)
            available = current_price <= msp * 1.05  # Available if price near or below MSP
            
            procurement_info = {
                'available': available,
                'msp_price': msp,
                'procurement_centers': [
                    {
                        'name': 'Central Procurement Center',
                        'location': 'District Headquarters',
                        'distance': 15,
                        'capacity_available': 10000
                    },
                    {
                        'name': 'Regional FCI Depot',
                        'location': 'Regional Hub',
                        'distance': 25,
                        'capacity_available': 50000
                    }
                ] if available else [],
                'requirements': [
                    'Valid farmer registration',
                    'Land ownership documents',
                    'Crop quality certificate',
                    'Moisture content below 14%'
                ],
                'timeline': 'Processing within 7-14 days'
            }
            
            return procurement_info
            
        except Exception as e:
            logger.error(f"Government procurement check error: {str(e)}")
            raise

# Global cache for market service
market_service_instance = None
response_cache = {}
CACHE_TTL = 180  # 3 minutes for market data

def get_market_service():
    global market_service_instance
    if market_service_instance is None:
        market_service_instance = MarketService()
    return market_service_instance

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

def lambda_handler(event, context):
    """Optimized Lambda handler for market operations"""
    try:
        market_service = get_market_service()
        
        # Parse the request
        if 'body' in event:
            body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
        else:
            body = event
        
        operation = body.get('operation')
        
        # Create cache key for cacheable operations
        cache_key = None
        if operation in ['simulate_price', 'get_market_intelligence', 'get_trend_analysis']:
            cache_key = f"{operation}_{body.get('crop_type', 'rice')}_{body.get('season', 'Kharif')}"
            
            # Check cache first
            cached_response = get_cached_response(cache_key)
            if cached_response:
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'X-Cache': 'HIT'
                    },
                    'body': json.dumps({
                        'success': True,
                        'data': cached_response,
                        'cached': True
                    })
                }
        
        if operation == 'simulate_price':
            crop_type = body.get('crop_type')
            season = body.get('season')
            weather_conditions = body.get('weather_conditions', {})
            supply_factors = body.get('supply_factors', {})
            demand_factors = body.get('demand_factors', {})
            
            # Hash parameters for caching
            weather_hash = json.dumps(weather_conditions, sort_keys=True)
            supply_hash = json.dumps(supply_factors, sort_keys=True)
            demand_hash = json.dumps(demand_factors, sort_keys=True)
            
            result = market_service.simulate_market_price(
                crop_type, season, weather_hash, supply_hash, demand_hash
            )
            
        elif operation == 'get_selling_options':
            crop_type = body.get('crop_type')
            quantity = body.get('quantity')
            quality_grade = body.get('quality_grade', 'grade_b')
            location = body.get('location', 'central')
            current_price = body.get('current_price')
            
            result = market_service.get_selling_options(
                crop_type, quantity, quality_grade, location, current_price
            )
            
        elif operation == 'get_selling_advice':
            crop_type = body.get('crop_type')
            current_price = body.get('current_price')
            quantity = body.get('quantity')
            storage_capacity = body.get('storage_capacity', False)
            financial_urgency = body.get('financial_urgency', 'medium')
            
            result = market_service.get_selling_advice(
                crop_type, current_price, quantity, storage_capacity, financial_urgency
            )
            
        elif operation == 'get_market_intelligence':
            crop_type = body.get('crop_type')
            region = body.get('region', 'central')
            
            result = market_service.get_market_intelligence(crop_type, region)
            
        elif operation == 'get_storage_options':
            crop_type = body.get('crop_type')
            quantity = body.get('quantity')
            location = body.get('location', 'central')
            
            result = market_service.get_storage_options(crop_type, quantity, location)
            
        elif operation == 'get_trend_analysis':
            crop_type = body.get('crop_type')
            timeframe = body.get('timeframe', '30d')
            
            result = market_service.get_trend_analysis(crop_type, timeframe)
            
        elif operation == 'get_advanced_recommendation':
            crop_type = body.get('crop_type')
            quantity = body.get('quantity')
            current_price = body.get('current_price')
            storage_capacity = body.get('storage_capacity', False)
            financial_urgency = body.get('financial_urgency', 'medium')
            quality_grade = body.get('quality_grade', 'grade_b')
            
            result = market_service.get_advanced_recommendation(
                crop_type, quantity, current_price, storage_capacity, 
                financial_urgency, quality_grade
            )
            
        elif operation == 'check_government_procurement':
            crop_type = body.get('crop_type')
            quantity = body.get('quantity')
            current_price = body.get('current_price')
            
            result = market_service.check_government_procurement(crop_type, quantity, current_price)
            
        else:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'error': f'Unknown operation: {operation}'
                })
            }
        
        # Cache the result if applicable
        if cache_key:
            cache_response(cache_key, result)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'X-Cache': 'MISS'
            },
            'body': json.dumps({
                'success': True,
                'data': result,
                'cached': False
            })
        }
        
    except Exception as e:
        logger.error(f"Lambda execution error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': str(e),
                'success': False
            })
        }