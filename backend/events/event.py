"""
Event Service Lambda Function
Generates random events and decision points based on game state
"""
import json
import boto3
import random
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

# Initialize AWS Bedrock client
bedrock_runtime = boto3.client('bedrock-runtime', region_name='us-east-1')

# Event templates for different scenarios
EVENT_TEMPLATES = {
    'weather_crisis': [
        {
            'type': 'drought_warning',
            'title': 'Drought Warning Issued',
            'description': 'Meteorological department has issued a drought warning for your region. Rainfall has been 40% below normal.',
            'educational_content': 'Drought management is crucial for Indian farmers. Consider water conservation techniques like drip irrigation and mulching.',
            'choices': [
                {
                    'id': 'drill_borewell',
                    'text': 'Drill a new borewell (₹50,000)',
                    'cost': 50000,
                    'consequences': {'water_access': 30, 'debt': 50000, 'crop_survival': 80}
                },
                {
                    'id': 'reduce_crop_area',
                    'text': 'Reduce crop area by 30%',
                    'cost': 0,
                    'consequences': {'crop_yield': -30, 'water_stress': -20, 'income_loss': -25}
                },
                {
                    'id': 'wait_and_pray',
                    'text': 'Wait for rain and pray',
                    'cost': 0,
                    'consequences': {'crop_risk': 60, 'stress_level': 40, 'yield_uncertainty': 70}
                }
            ]
        },
        {
            'type': 'flood_alert',
            'title': 'Flood Alert in Your Area',
            'description': 'Heavy rainfall has caused river levels to rise. Flood warning issued for low-lying agricultural areas.',
            'educational_content': 'Flood preparedness includes crop insurance, drainage systems, and emergency evacuation plans for livestock.',
            'choices': [
                {
                    'id': 'build_drainage',
                    'text': 'Build emergency drainage (₹25,000)',
                    'cost': 25000,
                    'consequences': {'flood_damage': -40, 'debt': 25000, 'future_protection': 50}
                },
                {
                    'id': 'evacuate_livestock',
                    'text': 'Evacuate livestock to higher ground',
                    'cost': 5000,
                    'consequences': {'livestock_safety': 90, 'evacuation_cost': 5000, 'stress_level': 20}
                },
                {
                    'id': 'stay_and_protect',
                    'text': 'Stay and protect the farm',
                    'cost': 0,
                    'consequences': {'crop_damage_risk': 80, 'personal_risk': 60, 'property_loss': 70}
                }
            ]
        }
    ],
    'extreme_weather': [
        {
            'type': 'severe_drought',
            'title': 'Severe Drought Conditions',
            'description': 'Your region is experiencing the worst drought in 20 years. Groundwater levels have dropped critically, and crop yields are expected to fall by 60-80%.',
            'educational_content': 'Severe droughts require immediate action. Crop insurance, water harvesting, and drought-resistant varieties are essential for survival.',
            'choices': [
                {
                    'id': 'emergency_irrigation',
                    'text': 'Install emergency drip irrigation (₹80,000)',
                    'cost': 80000,
                    'consequences': {'crop_survival': 70, 'water_efficiency': 50, 'debt': 80000, 'yield_recovery': 40}
                },
                {
                    'id': 'sell_livestock',
                    'text': 'Sell livestock to raise emergency funds',
                    'cost': 0,
                    'consequences': {'immediate_cash': 60000, 'livestock_loss': 100, 'future_income_loss': -30, 'emotional_stress': 40}
                },
                {
                    'id': 'abandon_crops',
                    'text': 'Abandon current crops and migrate temporarily',
                    'cost': 10000,
                    'consequences': {'crop_loss': 100, 'migration_cost': 10000, 'family_stress': 60, 'survival_chance': 80}
                }
            ]
        },
        {
            'type': 'flash_flood',
            'title': 'Flash Flood Emergency',
            'description': 'Unprecedented rainfall has caused flash flooding. Your crops are submerged, and there is immediate danger to life and property.',
            'educational_content': 'Flash floods are becoming more common due to climate change. Early warning systems and flood insurance are critical.',
            'choices': [
                {
                    'id': 'emergency_evacuation',
                    'text': 'Evacuate family and livestock immediately',
                    'cost': 8000,
                    'consequences': {'family_safety': 100, 'livestock_safety': 80, 'crop_loss': 90, 'evacuation_cost': 8000}
                },
                {
                    'id': 'build_temporary_barriers',
                    'text': 'Build temporary flood barriers (₹15,000)',
                    'cost': 15000,
                    'consequences': {'crop_protection': 30, 'property_protection': 50, 'personal_risk': 40, 'barrier_cost': 15000}
                },
                {
                    'id': 'wait_for_rescue',
                    'text': 'Stay and wait for government rescue',
                    'cost': 0,
                    'consequences': {'rescue_dependency': 80, 'crop_loss': 100, 'property_damage': 70, 'trauma_level': 60}
                }
            ]
        },
        {
            'type': 'cyclone_warning',
            'title': 'Cyclone Approaching',
            'description': 'A severe cyclone is expected to make landfall in 48 hours. Wind speeds may reach 150 km/h with heavy rainfall.',
            'educational_content': 'Cyclone preparedness saves lives and property. Secure structures, evacuate if necessary, and ensure emergency supplies.',
            'choices': [
                {
                    'id': 'full_preparation',
                    'text': 'Full cyclone preparation (₹20,000)',
                    'cost': 20000,
                    'consequences': {'property_protection': 70, 'crop_protection': 40, 'family_safety': 90, 'preparation_cost': 20000}
                },
                {
                    'id': 'minimal_preparation',
                    'text': 'Basic preparation and hope for the best',
                    'cost': 5000,
                    'consequences': {'property_protection': 30, 'crop_protection': 10, 'family_safety': 60, 'preparation_cost': 5000}
                },
                {
                    'id': 'evacuate_to_shelter',
                    'text': 'Evacuate to government cyclone shelter',
                    'cost': 2000,
                    'consequences': {'family_safety': 95, 'property_loss': 80, 'crop_loss': 90, 'shelter_experience': 40}
                }
            ]
        }
    ],
    'pest_crisis': [
        {
            'type': 'locust_swarm',
            'title': 'Locust Swarm Alert',
            'description': 'A massive locust swarm is moving towards your area. These pests can destroy entire crops within hours.',
            'educational_content': 'Locust control requires coordinated community action. Early detection and immediate response are crucial.',
            'choices': [
                {
                    'id': 'chemical_spray',
                    'text': 'Emergency chemical spraying (₹12,000)',
                    'cost': 12000,
                    'consequences': {'crop_protection': 80, 'chemical_cost': 12000, 'environmental_impact': -20, 'health_risk': 10}
                },
                {
                    'id': 'community_action',
                    'text': 'Organize community smoke and noise campaign',
                    'cost': 3000,
                    'consequences': {'crop_protection': 50, 'community_unity': 40, 'organization_cost': 3000, 'effectiveness': 60}
                },
                {
                    'id': 'harvest_early',
                    'text': 'Emergency early harvest',
                    'cost': 5000,
                    'consequences': {'crop_saved': 70, 'yield_reduction': -30, 'harvest_cost': 5000, 'quality_loss': -20}
                }
            ]
        },
        {
            'type': 'pest_outbreak',
            'title': 'Major Pest Outbreak',
            'description': 'Your crops are under attack from bollworm/stem borer. The infestation is spreading rapidly across your fields.',
            'educational_content': 'Integrated Pest Management (IPM) combines biological, cultural, and chemical controls for sustainable pest management.',
            'choices': [
                {
                    'id': 'ipm_approach',
                    'text': 'Implement IPM strategy (₹8,000)',
                    'cost': 8000,
                    'consequences': {'pest_control': 75, 'environmental_safety': 30, 'long_term_benefit': 40, 'ipm_cost': 8000}
                },
                {
                    'id': 'intensive_pesticide',
                    'text': 'Intensive pesticide treatment (₹15,000)',
                    'cost': 15000,
                    'consequences': {'pest_control': 90, 'chemical_cost': 15000, 'soil_damage': -30, 'resistance_risk': 40}
                },
                {
                    'id': 'accept_losses',
                    'text': 'Accept losses and focus on next season',
                    'cost': 0,
                    'consequences': {'crop_loss': 60, 'cost_savings': 15000, 'learning_experience': 20, 'emotional_impact': 40}
                }
            ]
        }
    ],
    'emergency_crisis': [
        {
            'type': 'equipment_failure',
            'title': 'Critical Equipment Breakdown',
            'description': 'Your tractor has broken down during peak farming season. The repair shop says it needs a new engine.',
            'educational_content': 'Equipment maintenance is crucial for farming operations. Consider equipment insurance and backup plans.',
            'choices': [
                {
                    'id': 'expensive_repair',
                    'text': 'Pay for expensive repair (₹45,000)',
                    'cost': 45000,
                    'consequences': {'equipment_restored': 100, 'debt': 45000, 'operational_delay': 7, 'financial_strain': 30}
                },
                {
                    'id': 'rent_equipment',
                    'text': 'Rent equipment for the season (₹25,000)',
                    'cost': 25000,
                    'consequences': {'operational_continuity': 80, 'rental_cost': 25000, 'dependency': 40, 'flexibility_loss': 20}
                },
                {
                    'id': 'manual_farming',
                    'text': 'Switch to manual farming methods',
                    'cost': 0,
                    'consequences': {'labor_increase': 200, 'cost_savings': 45000, 'physical_strain': 60, 'time_delay': 30}
                }
            ]
        },
        {
            'type': 'health_emergency',
            'title': 'Family Health Crisis',
            'description': 'Your spouse has been hospitalized with a serious illness. Medical expenses are mounting, and you need to be at the hospital.',
            'educational_content': 'Health emergencies can devastate farming families. Health insurance and emergency funds are essential.',
            'choices': [
                {
                    'id': 'sell_assets',
                    'text': 'Sell farm assets for medical expenses',
                    'cost': 0,
                    'consequences': {'medical_funds': 80000, 'asset_loss': 60, 'future_productivity': -40, 'family_health': 80}
                },
                {
                    'id': 'emergency_loan',
                    'text': 'Take emergency loan from moneylender',
                    'cost': 0,
                    'consequences': {'medical_funds': 50000, 'debt_trap_risk': 70, 'interest_burden': 50, 'family_health': 70}
                },
                {
                    'id': 'community_help',
                    'text': 'Seek help from community and relatives',
                    'cost': 0,
                    'consequences': {'medical_funds': 30000, 'social_debt': 40, 'community_support': 60, 'dignity_impact': 30}
                }
            ]
        },
        {
            'type': 'fire_accident',
            'title': 'Farm Fire Emergency',
            'description': 'A fire has broken out in your storage area. Stored grain and equipment are at risk of being destroyed.',
            'educational_content': 'Fire safety in farms includes proper storage, fire breaks, and emergency response plans.',
            'choices': [
                {
                    'id': 'fire_brigade',
                    'text': 'Call fire brigade and organize water supply',
                    'cost': 8000,
                    'consequences': {'property_saved': 70, 'emergency_cost': 8000, 'community_help': 30, 'response_time': 60}
                },
                {
                    'id': 'community_firefighting',
                    'text': 'Organize community firefighting effort',
                    'cost': 3000,
                    'consequences': {'property_saved': 50, 'community_unity': 50, 'organization_cost': 3000, 'personal_risk': 40}
                },
                {
                    'id': 'save_what_possible',
                    'text': 'Save what you can and let the rest burn',
                    'cost': 0,
                    'consequences': {'partial_savings': 30, 'total_loss': 70, 'emotional_trauma': 50, 'insurance_claim': 40}
                }
            ]
        }
    ],
    'financial_crisis': [
        {
            'type': 'loan_due',
            'title': 'Loan Payment Due',
            'description': 'Your bank loan EMI of ₹15,000 is due in 3 days. Current account balance is insufficient.',
            'educational_content': 'Managing loan repayments is critical. Consider restructuring options or emergency government schemes.',
            'choices': [
                {
                    'id': 'sell_crop_early',
                    'text': 'Sell crops at current market price',
                    'cost': 0,
                    'consequences': {'immediate_cash': 40000, 'price_loss': -20, 'credit_score': 10}
                },
                {
                    'id': 'borrow_from_moneylender',
                    'text': 'Borrow from local moneylender (36% interest)',
                    'cost': 0,
                    'consequences': {'immediate_cash': 20000, 'debt_trap_risk': 80, 'interest_burden': 60}
                },
                {
                    'id': 'request_loan_restructure',
                    'text': 'Request bank for loan restructuring',
                    'cost': 0,
                    'consequences': {'payment_delay': 30, 'credit_impact': -10, 'relief_chance': 60}
                }
            ]
        }
    ],
    'market_opportunity': [
        {
            'type': 'price_surge',
            'title': 'Crop Prices Surge',
            'description': 'Due to supply shortage in neighboring states, your crop prices have increased by 40% above MSP.',
            'educational_content': 'Market timing is crucial. Consider storage options and price trends before selling.',
            'choices': [
                {
                    'id': 'sell_immediately',
                    'text': 'Sell entire crop immediately',
                    'cost': 0,
                    'consequences': {'immediate_income': 140, 'opportunity_cost': 0, 'market_timing': 70}
                },
                {
                    'id': 'sell_partial',
                    'text': 'Sell 60% now, store rest',
                    'cost': 8000,
                    'consequences': {'immediate_income': 84, 'storage_cost': 8000, 'future_opportunity': 40}
                },
                {
                    'id': 'wait_for_higher_price',
                    'text': 'Wait for even higher prices',
                    'cost': 5000,
                    'consequences': {'storage_cost': 5000, 'price_risk': 60, 'potential_gain': 80}
                }
            ]
        }
    ],
    'social_crisis': [
        {
            'type': 'neighbor_suicide',
            'title': 'Neighbor Farmer Suicide',
            'description': 'Your neighbor, facing debt crisis, has taken his own life. His family is in distress and needs support.',
            'educational_content': 'Farmer suicides are a serious issue. Community support and awareness of mental health resources are vital.',
            'choices': [
                {
                    'id': 'help_family',
                    'text': 'Help his family with ₹10,000',
                    'cost': 10000,
                    'consequences': {'community_respect': 50, 'personal_satisfaction': 80, 'financial_strain': 10000}
                },
                {
                    'id': 'organize_support',
                    'text': 'Organize community support group',
                    'cost': 2000,
                    'consequences': {'community_unity': 70, 'mental_health_awareness': 60, 'time_investment': 20}
                },
                {
                    'id': 'focus_own_problems',
                    'text': 'Focus on your own problems',
                    'cost': 0,
                    'consequences': {'guilt_level': 40, 'community_isolation': 30, 'self_preservation': 20}
                }
            ]
        }
    ],
    'government_scheme': [
        {
            'type': 'pm_kisan_delay',
            'title': 'PM-KISAN Payment Delayed',
            'description': 'Your PM-KISAN installment of ₹2,000 is delayed due to documentation issues.',
            'educational_content': 'Government schemes require proper documentation. Keep Aadhaar, bank details, and land records updated.',
            'choices': [
                {
                    'id': 'visit_office',
                    'text': 'Visit government office to resolve',
                    'cost': 500,
                    'consequences': {'scheme_access': 80, 'time_lost': 1, 'bureaucracy_stress': 30}
                },
                {
                    'id': 'hire_agent',
                    'text': 'Hire documentation agent (₹1,000)',
                    'cost': 1000,
                    'consequences': {'scheme_access': 95, 'agent_cost': 1000, 'convenience': 70}
                },
                {
                    'id': 'ignore_for_now',
                    'text': 'Ignore for now, too busy',
                    'cost': 0,
                    'consequences': {'scheme_loss': 2000, 'time_saved': 2, 'missed_opportunity': 60}
                }
            ]
        }
    ]
}

def generate_contextual_event(game_state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate an event based on current game state using AI
    """
    try:
        # Extract relevant context from game state
        season = game_state.get('season', {}).get('current', 'Kharif')
        day = game_state.get('season', {}).get('day', 1)
        money = game_state.get('farm', {}).get('money', 50000)
        loans = game_state.get('economics', {}).get('loans', [])
        weather = game_state.get('weather', {}).get('current', {})
        
        # Determine event category based on context
        event_category = determine_event_category(season, day, money, loans, weather)
        
        # Select appropriate template
        if event_category in EVENT_TEMPLATES:
            templates = EVENT_TEMPLATES[event_category]
            selected_template = random.choice(templates)
            
            # Customize event based on game state
            customized_event = customize_event_with_ai(selected_template, game_state)
            return customized_event
        
        # Fallback to random event
        all_templates = []
        for category_templates in EVENT_TEMPLATES.values():
            all_templates.extend(category_templates)
        
        return random.choice(all_templates)
        
    except Exception as e:
        print(f"Error generating contextual event: {e}")
        # Return a safe default event
        return EVENT_TEMPLATES['weather_crisis'][0]

def determine_event_category(season: str, day: int, money: int, loans: List, weather: Dict) -> str:
    """
    Determine the most appropriate event category based on game state
    """
    # Emergency crisis if very low money and high debt
    if money < 10000 and len(loans) > 2:
        return 'emergency_crisis'
    
    # Extreme weather events during severe conditions
    extreme_weather_conditions = weather.get('conditions') in ['severe_drought', 'flash_flood', 'cyclone']
    drought_risk = weather.get('droughtRisk', 0) > 0.6
    flood_risk = weather.get('floodRisk', 0) > 0.5
    
    if extreme_weather_conditions or drought_risk or flood_risk:
        return 'extreme_weather'
    
    # Pest crisis during vulnerable crop stages and seasons
    crops = weather.get('crops', [])
    vulnerable_stages = any(crop.get('growthStage') in ['flowering', 'vegetative'] for crop in crops)
    pest_season = season in ['Kharif', 'Zaid'] and day > 30 and day < 90
    
    if vulnerable_stages and pest_season and random.random() < 0.4:
        return 'pest_crisis'
    
    # Financial crisis if low money or high debt
    if money < 20000 or len(loans) > 2:
        return 'financial_crisis'
    
    # Weather crisis during monsoon season or moderate weather issues
    if season == 'Kharif' or weather.get('conditions') in ['drought', 'flood']:
        return 'weather_crisis'
    
    # Emergency crisis for equipment/health issues (random but contextual)
    if random.random() < 0.15:
        return 'emergency_crisis'
    
    # Market opportunities during harvest time
    if day > 90:  # Near end of season
        return 'market_opportunity'
    
    # Government scheme issues
    if random.random() < 0.3:
        return 'government_scheme'
    
    # Social crisis (rare but impactful)
    if random.random() < 0.1:
        return 'social_crisis'
    
    # Default to weather crisis
    return 'weather_crisis'

def customize_event_with_ai(template: Dict[str, Any], game_state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Use AWS Bedrock to customize event details based on game state
    """
    try:
        # Prepare context for AI
        context = {
            'season': game_state.get('season', {}).get('current', 'Kharif'),
            'day': game_state.get('season', {}).get('day', 1),
            'money': game_state.get('farm', {}).get('money', 50000),
            'crops': len(game_state.get('farm', {}).get('crops', [])),
            'loans': len(game_state.get('economics', {}).get('loans', []))
        }
        
        prompt = f"""
        Customize this farming event for an Indian farmer simulation game:
        
        Template: {json.dumps(template, indent=2)}
        
        Current game context:
        - Season: {context['season']}
        - Day: {context['day']}
        - Money: ₹{context['money']}
        - Active crops: {context['crops']}
        - Active loans: {context['loans']}
        
        Make the event description more specific to the current situation while keeping the same structure.
        Adjust the consequences to be proportional to the farmer's current financial state.
        Keep the educational content relevant and helpful.
        
        Return only the JSON object with the customized event.
        """
        
        # Call AWS Bedrock (Claude)
        response = bedrock_runtime.invoke_model(
            modelId='anthropic.claude-3-5-sonnet-20241022-v2:0',
            body=json.dumps({
                'anthropic_version': 'bedrock-2023-05-31',
                'max_tokens': 1000,
                'messages': [
                    {
                        'role': 'user',
                        'content': prompt
                    }
                ]
            })
        )
        
        response_body = json.loads(response['body'].read())
        ai_content = response_body['content'][0]['text']
        
        # Try to parse AI response as JSON
        try:
            customized_event = json.loads(ai_content)
            return customized_event
        except json.JSONDecodeError:
            # If AI response is not valid JSON, return original template
            return template
            
    except Exception as e:
        print(f"Error customizing event with AI: {e}")
        return template

def calculate_event_consequences(choice_id: str, event: Dict[str, Any], game_state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calculate the consequences of a player's choice
    """
    # Find the selected choice
    selected_choice = None
    for choice in event.get('choices', []):
        if choice['id'] == choice_id:
            selected_choice = choice
            break
    
    if not selected_choice:
        return {'error': 'Invalid choice'}
    
    consequences = selected_choice.get('consequences', {})
    event_type = event.get('type', 'general')
    
    # Apply consequences to game state
    result = {
        'immediate_effects': {},
        'long_term_effects': {},
        'educational_impact': {},
        'choice_made': selected_choice['text'],
        'cost': selected_choice.get('cost', 0)
    }
    
    # Process immediate financial effects
    if 'immediate_cash' in consequences:
        result['immediate_effects']['money_change'] = consequences['immediate_cash']
    
    if 'debt' in consequences:
        result['immediate_effects']['debt_increase'] = consequences['debt']
    
    # Process crop and yield effects
    if 'crop_yield' in consequences:
        result['immediate_effects']['yield_change'] = consequences['crop_yield']
    
    if 'yield_reduction' in consequences:
        result['immediate_effects']['yield_change'] = consequences['yield_reduction']
    
    if 'crop_loss' in consequences:
        result['immediate_effects']['crop_damage'] = consequences['crop_loss']
    
    if 'crop_damage_risk' in consequences:
        result['long_term_effects']['damage_risk'] = consequences['crop_damage_risk']
    
    # Process extreme weather specific effects
    if 'crop_survival' in consequences:
        result['immediate_effects']['survival_rate'] = consequences['crop_survival']
    
    if 'water_access' in consequences:
        result['long_term_effects']['water_improvement'] = consequences['water_access']
    
    if 'flood_damage' in consequences:
        result['immediate_effects']['flood_protection'] = -consequences['flood_damage']
    
    # Process pest crisis effects
    if 'pest_control' in consequences:
        result['immediate_effects']['pest_reduction'] = consequences['pest_control']
    
    if 'environmental_impact' in consequences:
        result['long_term_effects']['environmental_damage'] = consequences['environmental_impact']
    
    # Process emergency crisis effects
    if 'equipment_restored' in consequences:
        result['immediate_effects']['equipment_status'] = consequences['equipment_restored']
    
    if 'family_safety' in consequences:
        result['immediate_effects']['safety_level'] = consequences['family_safety']
    
    if 'property_protection' in consequences:
        result['immediate_effects']['property_saved'] = consequences['property_protection']
    
    # Process health and social effects
    if 'family_health' in consequences:
        result['immediate_effects']['health_improvement'] = consequences['family_health']
    
    if 'stress_level' in consequences:
        result['immediate_effects']['stress_change'] = consequences['stress_level']
    
    if 'community_respect' in consequences:
        result['long_term_effects']['social_standing'] = consequences['community_respect']
    
    if 'community_unity' in consequences:
        result['long_term_effects']['community_bonds'] = consequences['community_unity']
    
    # Process long-term strategic effects
    if 'future_protection' in consequences:
        result['long_term_effects']['disaster_preparedness'] = consequences['future_protection']
    
    if 'skill_improvement' in consequences:
        result['long_term_effects']['farmer_skills'] = consequences['skill_improvement']
    
    if 'debt_trap_risk' in consequences:
        result['long_term_effects']['financial_vulnerability'] = consequences['debt_trap_risk']
    
    # Calculate severity-based multipliers for extreme events
    severity_multiplier = 1.0
    if event_type in ['severe_drought', 'flash_flood', 'cyclone_warning', 'locust_swarm']:
        severity_multiplier = 1.5
    elif event_type in ['equipment_failure', 'health_emergency', 'fire_accident']:
        severity_multiplier = 1.3
    
    # Apply severity multiplier to financial impacts
    if 'money_change' in result['immediate_effects']:
        result['immediate_effects']['money_change'] = int(result['immediate_effects']['money_change'] * severity_multiplier)
    
    if 'debt_increase' in result['immediate_effects']:
        result['immediate_effects']['debt_increase'] = int(result['immediate_effects']['debt_increase'] * severity_multiplier)
    
    # Educational impact based on event category
    educational_topics = {
        'severe_drought': 'drought_management',
        'flash_flood': 'flood_preparedness',
        'cyclone_warning': 'disaster_preparedness',
        'locust_swarm': 'pest_management',
        'pest_outbreak': 'integrated_pest_management',
        'equipment_failure': 'farm_equipment_maintenance',
        'health_emergency': 'rural_healthcare_planning',
        'fire_accident': 'farm_safety_protocols'
    }
    
    result['educational_impact'] = {
        'topic': educational_topics.get(event_type, event_type),
        'lesson_learned': event.get('educational_content', ''),
        'awareness_increased': True,
        'crisis_experience': True if event_type in educational_topics else False
    }
    
    return result

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for event generation service
    """
    try:
        # Parse request body
        if 'body' in event:
            body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
        else:
            body = event
        
        action = body.get('action', 'generate')
        
        if action == 'generate':
            # Generate a new event
            game_state = body.get('gameState', {})
            generated_event = generate_contextual_event(game_state)
            
            # Add unique ID and timestamp
            generated_event['id'] = f"event_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{random.randint(1000, 9999)}"
            generated_event['timestamp'] = datetime.now().isoformat()
            generated_event['expires_at'] = (datetime.now() + timedelta(days=7)).isoformat()
            
            response_body = {
                'event': generated_event,
                'message': 'Event generated successfully'
            }
            
        elif action == 'resolve':
            # Resolve an event choice
            event_data = body.get('event', {})
            choice_id = body.get('choiceId', '')
            game_state = body.get('gameState', {})
            
            consequences = calculate_event_consequences(choice_id, event_data, game_state)
            
            response_body = {
                'consequences': consequences,
                'message': 'Event resolved successfully'
            }
            
        else:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({
                    'error': 'Invalid action. Use "generate" or "resolve"'
                })
            }
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
            'body': json.dumps(response_body)
        }
        
    except Exception as e:
        print(f"Event service error: {e}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({
                'error': str(e),
                'message': 'Event service error'
            })
        }