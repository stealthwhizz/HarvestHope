"""
Game State Service Lambda Function
Handles save/load operations and player progression with multi-device sync
"""
import json
import boto3
import hashlib
import time
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from decimal import Decimal

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
game_states_table = dynamodb.Table('harvest-hope-game-states')
player_stats_table = dynamodb.Table('harvest-hope-player-stats')

def decimal_default(obj):
    """JSON serializer for DynamoDB Decimal types"""
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError

def calculate_checksum(game_state: Dict[str, Any]) -> str:
    """Calculate MD5 checksum for save data integrity"""
    state_str = json.dumps(game_state, sort_keys=True, default=decimal_default)
    return hashlib.md5(state_str.encode()).hexdigest()

def validate_game_state(game_state: Dict[str, Any]) -> bool:
    """Validate game state structure and data integrity"""
    required_fields = ['player', 'farm', 'economics', 'season', 'weather', 'npcs', 'events', 'stats', 'progress']
    
    for field in required_fields:
        if field not in game_state:
            return False
    
    # Validate player data
    if not isinstance(game_state['player'], dict) or 'id' not in game_state['player']:
        return False
    
    # Validate farm data
    farm = game_state['farm']
    if not isinstance(farm, dict) or 'money' not in farm or 'day' not in farm:
        return False
    
    # Basic range checks
    if farm.get('money', 0) < -1000000 or farm.get('money', 0) > 100000000:  # Reasonable money bounds
        return False
    
    if farm.get('day', 0) < 1 or farm.get('day', 0) > 120:  # Valid day range
        return False
    
    return True

def get_save_slots(player_id: str) -> List[Dict[str, Any]]:
    """Get all save slots for a player"""
    try:
        response = game_states_table.query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key('playerId').eq(player_id)
        )
        
        save_slots = []
        for item in response['Items']:
            save_slots.append({
                'saveSlot': item['saveSlot'],
                'lastSaved': item.get('lastSaved', ''),
                'farmName': item.get('farmName', f"Farm {item['saveSlot']}"),
                'season': item.get('season', 'Kharif'),
                'day': item.get('day', 1),
                'money': item.get('money', 0),
                'checksum': item.get('checksum', ''),
                'deviceId': item.get('deviceId', ''),
                'version': item.get('version', '1.0.0')
            })
        
        return sorted(save_slots, key=lambda x: x['saveSlot'])
    except Exception as e:
        print(f"Error getting save slots: {str(e)}")
        return []

def save_game_state(player_id: str, save_slot: str, game_state: Dict[str, Any], device_id: str = '') -> Dict[str, Any]:
    """Save game state with corruption detection and multi-device sync"""
    try:
        # Validate game state
        if not validate_game_state(game_state):
            return {
                'success': False,
                'message': 'Invalid game state data',
                'error': 'VALIDATION_FAILED'
            }
        
        # Calculate checksum for integrity
        checksum = calculate_checksum(game_state)
        timestamp = datetime.utcnow().isoformat()
        
        # Prepare save data
        save_data = {
            'playerId': player_id,
            'saveSlot': save_slot,
            'gameState': game_state,
            'checksum': checksum,
            'lastSaved': timestamp,
            'deviceId': device_id,
            'version': '1.0.0',
            'farmName': game_state.get('farm', {}).get('name', f"Farm {save_slot}"),
            'season': game_state.get('season', {}).get('current', 'Kharif'),
            'day': game_state.get('farm', {}).get('day', 1),
            'money': game_state.get('farm', {}).get('money', 0),
            'ttl': int((datetime.utcnow() + timedelta(days=365)).timestamp())  # 1 year TTL
        }
        
        # Check for conflicts with other devices
        try:
            existing_response = game_states_table.get_item(
                Key={'playerId': player_id, 'saveSlot': save_slot}
            )
            
            if 'Item' in existing_response:
                existing_item = existing_response['Item']
                existing_device = existing_item.get('deviceId', '')
                
                # If different device, create backup before overwriting
                if existing_device and existing_device != device_id:
                    backup_slot = f"{save_slot}_backup_{int(time.time())}"
                    backup_data = existing_item.copy()
                    backup_data['saveSlot'] = backup_slot
                    backup_data['isBackup'] = True
                    backup_data['originalSlot'] = save_slot
                    backup_data['backupReason'] = 'device_conflict'
                    
                    game_states_table.put_item(Item=backup_data)
        except Exception as backup_error:
            print(f"Warning: Could not create backup: {str(backup_error)}")
        
        # Save the game state
        game_states_table.put_item(Item=save_data)
        
        return {
            'success': True,
            'message': 'Game state saved successfully',
            'timestamp': timestamp,
            'checksum': checksum,
            'saveSlot': save_slot
        }
        
    except Exception as e:
        print(f"Error saving game state: {str(e)}")
        return {
            'success': False,
            'message': f'Failed to save game state: {str(e)}',
            'error': 'SAVE_FAILED'
        }

def load_game_state(player_id: str, save_slot: str) -> Dict[str, Any]:
    """Load game state with corruption detection"""
    try:
        response = game_states_table.get_item(
            Key={'playerId': player_id, 'saveSlot': save_slot}
        )
        
        if 'Item' not in response:
            return {
                'success': False,
                'message': 'No saved game found',
                'error': 'NOT_FOUND'
            }
        
        item = response['Item']
        game_state = item.get('gameState', {})
        stored_checksum = item.get('checksum', '')
        
        # Verify data integrity
        calculated_checksum = calculate_checksum(game_state)
        if stored_checksum and stored_checksum != calculated_checksum:
            # Data corruption detected - try to recover from backup
            backup_slots = get_backup_slots(player_id, save_slot)
            if backup_slots:
                return {
                    'success': False,
                    'message': 'Save data corrupted, backups available',
                    'error': 'CORRUPTION_DETECTED',
                    'backups': backup_slots
                }
            else:
                return {
                    'success': False,
                    'message': 'Save data corrupted and no backups available',
                    'error': 'CORRUPTION_NO_BACKUP'
                }
        
        # Validate game state structure
        if not validate_game_state(game_state):
            return {
                'success': False,
                'message': 'Save data validation failed',
                'error': 'VALIDATION_FAILED'
            }
        
        return {
            'success': True,
            'gameState': game_state,
            'lastSaved': item.get('lastSaved', ''),
            'deviceId': item.get('deviceId', ''),
            'checksum': calculated_checksum,
            'saveSlot': save_slot
        }
        
    except Exception as e:
        print(f"Error loading game state: {str(e)}")
        return {
            'success': False,
            'message': f'Failed to load game state: {str(e)}',
            'error': 'LOAD_FAILED'
        }

def get_backup_slots(player_id: str, original_slot: str) -> List[Dict[str, Any]]:
    """Get backup slots for a corrupted save"""
    try:
        response = game_states_table.query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key('playerId').eq(player_id),
            FilterExpression=boto3.dynamodb.conditions.Attr('originalSlot').eq(original_slot) & 
                           boto3.dynamodb.conditions.Attr('isBackup').eq(True)
        )
        
        backups = []
        for item in response['Items']:
            backups.append({
                'saveSlot': item['saveSlot'],
                'lastSaved': item.get('lastSaved', ''),
                'backupReason': item.get('backupReason', ''),
                'deviceId': item.get('deviceId', '')
            })
        
        return sorted(backups, key=lambda x: x['lastSaved'], reverse=True)
    except Exception as e:
        print(f"Error getting backup slots: {str(e)}")
        return []

def delete_save_slot(player_id: str, save_slot: str) -> Dict[str, Any]:
    """Delete a save slot"""
    try:
        game_states_table.delete_item(
            Key={'playerId': player_id, 'saveSlot': save_slot}
        )
        
        return {
            'success': True,
            'message': 'Save slot deleted successfully'
        }
    except Exception as e:
        print(f"Error deleting save slot: {str(e)}")
        return {
            'success': False,
            'message': f'Failed to delete save slot: {str(e)}'
        }

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for game state management service
    """
    try:
        http_method = event.get('httpMethod', 'GET')
        path_parameters = event.get('pathParameters', {})
        query_parameters = event.get('queryStringParameters') or {}
        
        player_id = path_parameters.get('playerId')
        if not player_id:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({'error': 'Player ID is required'})
            }
        
        save_slot = query_parameters.get('saveSlot', 'slot1')
        device_id = query_parameters.get('deviceId', '')
        
        if http_method == 'GET':
            if query_parameters.get('action') == 'list':
                # List all save slots
                save_slots = get_save_slots(player_id)
                response_body = {
                    'success': True,
                    'saveSlots': save_slots
                }
            else:
                # Load specific save slot
                response_body = load_game_state(player_id, save_slot)
                
        elif http_method == 'POST':
            body = json.loads(event.get('body', '{}'))
            game_state = body.get('gameState')
            
            if not game_state:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                    'body': json.dumps({'error': 'Game state is required'})
                }
            
            response_body = save_game_state(player_id, save_slot, game_state, device_id)
            
        elif http_method == 'DELETE':
            response_body = delete_save_slot(player_id, save_slot)
            
        else:
            return {
                'statusCode': 405,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({'error': 'Method not allowed'})
            }
        
        status_code = 200 if response_body.get('success', True) else 400
        
        response = {
            'statusCode': status_code,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
            'body': json.dumps(response_body, default=decimal_default)
        }
        return response
        
    except Exception as e:
        print(f"Handler error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({
                'success': False,
                'error': str(e),
                'message': 'Game state service error'
            })
        }