"""
NPC Service Lambda Function
Generates unique farmer characters with AI using AWS Bedrock
"""
import json
import boto3
import uuid
import random
from typing import Dict, Any, List
from datetime import datetime, timedelta

# Initialize AWS clients
bedrock_runtime = boto3.client('bedrock-runtime', region_name='us-east-1')
dynamodb = boto3.resource('dynamodb')

# Get table references from environment
import os
NPC_TEMPLATES_TABLE = os.environ.get('NPC_TEMPLATES_TABLE', 'harvest-hope-npc-templates')
npc_templates_table = dynamodb.Table(NPC_TEMPLATES_TABLE)

def generate_npc_with_bedrock(game_state: Dict[str, Any], context_params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate an NPC using AWS Bedrock Claude model
    """
    # Extract relevant context from game state
    current_season = game_state.get('season', {}).get('current', 'Kharif')
    player_money = game_state.get('farm', {}).get('money', 50000)
    current_day = game_state.get('season', {}).get('day', 1)
    weather_conditions = game_state.get('weather', {}).get('current', {}).get('conditions', 'normal')
    
    # Create context-aware prompt
    prompt = f"""You are generating a realistic Indian farmer character for an educational farming simulation game. 

Current Game Context:
- Season: {current_season}
- Day: {current_day}
- Weather: {weather_conditions}
- Player's financial status: ₹{player_money}

Create a unique farmer character with the following JSON structure:
{{
    "name": "Full name (realistic Indian name)",
    "age": number between 25-65,
    "location": "Indian state/region",
    "backstory": "2-3 sentence background story",
    "currentCrisis": "one of: drought, flood, pest, debt, health, equipment",
    "relationshipLevel": number between -10 to 10 (initial relationship),
    "personality": "brief personality description",
    "farmSize": "small/medium/large",
    "primaryCrops": ["crop1", "crop2"],
    "familySize": number between 2-8,
    "educationLevel": "basic/intermediate/advanced",
    "crisisDetails": "specific details about their current crisis",
    "dialogueStyle": "how they speak (formal/casual/emotional etc.)"
}}

Make the character contextually relevant to the current season and weather. Ensure diversity in backgrounds, regions, and challenges. The character should feel authentic and represent real farmer struggles in India."""

    try:
        # Call Bedrock Claude model
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
                ],
                'temperature': 0.8
            })
        )
        
        response_body = json.loads(response['body'].read())
        npc_data = json.loads(response_body['content'][0]['text'])
        
        # Add generated fields
        npc_data['id'] = str(uuid.uuid4())
        npc_data['dialogueHistory'] = []
        npc_data['createdAt'] = datetime.utcnow().isoformat()
        npc_data['lastInteraction'] = None
        
        return npc_data
        
    except Exception as e:
        print(f"Bedrock generation failed: {str(e)}")
        # Fallback to template-based generation
        return generate_fallback_npc(game_state)

def generate_fallback_npc(game_state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Fallback NPC generation using predefined templates
    """
    templates = [
        {
            "name": "Rajesh Patel",
            "age": 42,
            "location": "Gujarat",
            "backstory": "Third-generation cotton farmer struggling with rising input costs and unpredictable weather patterns.",
            "currentCrisis": "debt",
            "personality": "Hardworking but worried about family's future",
            "farmSize": "medium",
            "primaryCrops": ["cotton", "groundnut"],
            "familySize": 5,
            "educationLevel": "basic",
            "crisisDetails": "Owes ₹2.5 lakh to local moneylender at 36% interest",
            "dialogueStyle": "respectful but stressed"
        },
        {
            "name": "Sunita Devi",
            "age": 38,
            "location": "Bihar",
            "backstory": "Widow managing 2-acre farm alone after husband's death, fighting to keep land from being sold.",
            "currentCrisis": "equipment",
            "personality": "Determined and resilient despite hardships",
            "farmSize": "small",
            "primaryCrops": ["rice", "wheat"],
            "familySize": 3,
            "educationLevel": "basic",
            "crisisDetails": "Tractor broke down, can't afford repairs or rental",
            "dialogueStyle": "direct and practical"
        },
        {
            "name": "Krishnan Nair",
            "age": 55,
            "location": "Kerala",
            "backstory": "Spice farmer whose crops were destroyed by unexpected flooding, now considering leaving farming.",
            "currentCrisis": "flood",
            "personality": "Experienced but demoralized",
            "farmSize": "medium",
            "primaryCrops": ["cardamom", "pepper"],
            "familySize": 4,
            "educationLevel": "intermediate",
            "crisisDetails": "Lost 80% of spice crop to floods, no crop insurance",
            "dialogueStyle": "thoughtful and philosophical"
        }
    ]
    
    template = random.choice(templates)
    template['id'] = str(uuid.uuid4())
    template['relationshipLevel'] = random.randint(-5, 5)
    template['dialogueHistory'] = []
    template['createdAt'] = datetime.utcnow().isoformat()
    template['lastInteraction'] = None
    
    return template

def generate_contextual_dialogue(npc_data: Dict[str, Any], game_state: Dict[str, Any], player_choice: str = None) -> Dict[str, Any]:
    """
    Generate contextual dialogue for an NPC based on game state and relationship
    """
    current_season = game_state.get('season', {}).get('current', 'Kharif')
    player_money = game_state.get('farm', {}).get('money', 50000)
    relationship = npc_data.get('relationshipLevel', 0)
    crisis = npc_data.get('currentCrisis', 'debt')
    
    # Create dialogue prompt
    dialogue_prompt = f"""Generate a realistic dialogue response for this Indian farmer character:

Character: {npc_data.get('name', 'Unknown')}
Age: {npc_data.get('age', 40)}
Location: {npc_data.get('location', 'India')}
Current Crisis: {crisis}
Crisis Details: {npc_data.get('crisisDetails', 'Financial difficulties')}
Relationship with Player: {relationship} (-100 to 100 scale)
Dialogue Style: {npc_data.get('dialogueStyle', 'casual')}

Current Context:
- Season: {current_season}
- Player's apparent wealth: {"wealthy" if player_money > 200000 else "moderate" if player_money > 100000 else "struggling"}

{"Player said: " + player_choice if player_choice else "Generate an opening dialogue"}

Respond with JSON:
{{
    "dialogue": "What the NPC says (2-3 sentences, authentic Indian English)",
    "emotion": "current emotional state",
    "relationshipChange": number between -5 to 5,
    "offersHelp": boolean,
    "needsHelp": boolean,
    "educationalTip": "optional farming/financial advice"
}}

Make the dialogue authentic, contextual, and emotionally appropriate."""

    try:
        response = bedrock_runtime.invoke_model(
            modelId='anthropic.claude-3-5-sonnet-20241022-v2:0',
            body=json.dumps({
                'anthropic_version': 'bedrock-2023-05-31',
                'max_tokens': 500,
                'messages': [
                    {
                        'role': 'user',
                        'content': dialogue_prompt
                    }
                ],
                'temperature': 0.7
            })
        )
        
        response_body = json.loads(response['body'].read())
        dialogue_data = json.loads(response_body['content'][0]['text'])
        
        return dialogue_data
        
    except Exception as e:
        print(f"Dialogue generation failed: {str(e)}")
        # Fallback dialogue
        return {
            "dialogue": f"Namaste! I am {npc_data.get('name', 'a farmer')} from {npc_data.get('location', 'nearby')}. These are difficult times for farmers like us.",
            "emotion": "concerned",
            "relationshipChange": 0,
            "offersHelp": False,
            "needsHelp": True,
            "educationalTip": "Always keep some emergency funds for unexpected farming expenses."
        }

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for NPC generation and dialogue service
    """
    try:
        # Parse request
        if event.get('httpMethod') == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                },
                'body': ''
            }
        
        body = json.loads(event.get('body', '{}'))
        action = body.get('action', 'generate')
        
        headers = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
        
        if action == 'generate':
            # Generate new NPC
            game_state = body.get('gameState', {})
            context_params = body.get('contextParams', {})
            
            npc_data = generate_npc_with_bedrock(game_state, context_params)
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'success': True,
                    'npc': npc_data,
                    'message': 'NPC generated successfully'
                })
            }
            
        elif action == 'dialogue':
            # Generate dialogue for existing NPC
            npc_data = body.get('npcData', {})
            game_state = body.get('gameState', {})
            player_choice = body.get('playerChoice')
            
            dialogue_response = generate_contextual_dialogue(npc_data, game_state, player_choice)
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'success': True,
                    'dialogue': dialogue_response,
                    'message': 'Dialogue generated successfully'
                })
            }
            
        elif action == 'batch_generate':
            # Generate multiple NPCs for initial game setup
            game_state = body.get('gameState', {})
            count = min(body.get('count', 3), 5)  # Limit to 5 NPCs max
            
            npcs = []
            for _ in range(count):
                npc_data = generate_npc_with_bedrock(game_state, {})
                npcs.append(npc_data)
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'success': True,
                    'npcs': npcs,
                    'message': f'Generated {len(npcs)} NPCs successfully'
                })
            }
        
        else:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'success': False,
                    'error': 'Invalid action. Use: generate, dialogue, or batch_generate'
                })
            }
            
    except Exception as e:
        print(f"NPC service error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({
                'success': False,
                'error': str(e),
                'message': 'NPC service error'
            })
        }