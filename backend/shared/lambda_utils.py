"""
Shared utilities for Lambda functions to improve performance and reduce cold starts
"""
import json
import boto3
from typing import Dict, Any, Optional
from datetime import datetime
import logging

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Global client instances for connection reuse
_clients = {}

def get_boto3_client(service_name: str, region_name: str = 'us-east-1') -> Any:
    """
    Get or create a boto3 client with connection pooling
    """
    client_key = f"{service_name}_{region_name}"
    
    if client_key not in _clients:
        config = boto3.session.Config(
            retries={'max_attempts': 2, 'mode': 'adaptive'},
            max_pool_connections=10,
            region_name=region_name
        )
        _clients[client_key] = boto3.client(service_name, config=config)
    
    return _clients[client_key]

def get_boto3_resource(service_name: str, region_name: str = 'us-east-1') -> Any:
    """
    Get or create a boto3 resource with connection pooling
    """
    resource_key = f"{service_name}_resource_{region_name}"
    
    if resource_key not in _clients:
        config = boto3.session.Config(
            retries={'max_attempts': 2, 'mode': 'adaptive'},
            max_pool_connections=10,
            region_name=region_name
        )
        _clients[resource_key] = boto3.resource(service_name, config=config)
    
    return _clients[resource_key]

def parse_lambda_event(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Parse Lambda event body consistently
    """
    if 'body' in event:
        if isinstance(event['body'], str):
            try:
                return json.loads(event['body'])
            except json.JSONDecodeError:
                logger.error(f"Invalid JSON in event body: {event['body']}")
                return {}
        else:
            return event['body']
    else:
        return event

def create_response(
    status_code: int,
    data: Any = None,
    error: str = None,
    headers: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
    """
    Create standardized Lambda response
    """
    default_headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
    
    if headers:
        default_headers.update(headers)
    
    response_body = {}
    
    if data is not None:
        response_body['success'] = True
        response_body['data'] = data
    
    if error:
        response_body['success'] = False
        response_body['error'] = error
    
    response_body['timestamp'] = datetime.now().isoformat()
    
    return {
        'statusCode': status_code,
        'headers': default_headers,
        'body': json.dumps(response_body)
    }

def handle_cors_preflight(event: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Handle CORS preflight requests
    """
    if event.get('httpMethod') == 'OPTIONS':
        return create_response(200)
    return None

class LambdaCache:
    """
    Simple in-memory cache for Lambda functions
    """
    def __init__(self, ttl_seconds: int = 300):
        self.cache = {}
        self.ttl = ttl_seconds
    
    def get(self, key: str) -> Optional[Any]:
        if key in self.cache:
            data, timestamp = self.cache[key]
            if datetime.now().timestamp() - timestamp < self.ttl:
                return data
            else:
                del self.cache[key]
        return None
    
    def set(self, key: str, value: Any) -> None:
        self.cache[key] = (value, datetime.now().timestamp())
    
    def clear(self) -> None:
        self.cache.clear()
    
    def size(self) -> int:
        return len(self.cache)

# Global cache instance
lambda_cache = LambdaCache()

def cached_response(cache_key: str, ttl: int = 300):
    """
    Decorator for caching Lambda responses
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            # Check cache
            cached_result = lambda_cache.get(cache_key)
            if cached_result:
                logger.info(f"Cache hit for key: {cache_key}")
                return cached_result
            
            # Execute function
            result = func(*args, **kwargs)
            
            # Cache result
            lambda_cache.set(cache_key, result)
            logger.info(f"Cached result for key: {cache_key}")
            
            return result
        return wrapper
    return decorator

def log_performance(func):
    """
    Decorator to log function performance
    """
    def wrapper(*args, **kwargs):
        start_time = datetime.now()
        result = func(*args, **kwargs)
        end_time = datetime.now()
        
        duration = (end_time - start_time).total_seconds() * 1000
        logger.info(f"Function {func.__name__} executed in {duration:.2f}ms")
        
        return result
    return wrapper

def validate_required_fields(data: Dict[str, Any], required_fields: list) -> Optional[str]:
    """
    Validate that required fields are present in data
    """
    missing_fields = []
    for field in required_fields:
        if field not in data or data[field] is None:
            missing_fields.append(field)
    
    if missing_fields:
        return f"Missing required fields: {', '.join(missing_fields)}"
    
    return None

def sanitize_input(data: Any) -> Any:
    """
    Basic input sanitization
    """
    if isinstance(data, str):
        # Remove potentially dangerous characters
        return data.replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')
    elif isinstance(data, dict):
        return {k: sanitize_input(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_input(item) for item in data]
    else:
        return data

# Performance monitoring
class PerformanceTracker:
    def __init__(self):
        self.metrics = {}
    
    def start_timer(self, name: str):
        self.metrics[name] = {'start': datetime.now()}
    
    def end_timer(self, name: str):
        if name in self.metrics:
            self.metrics[name]['end'] = datetime.now()
            self.metrics[name]['duration'] = (
                self.metrics[name]['end'] - self.metrics[name]['start']
            ).total_seconds() * 1000
    
    def get_metrics(self) -> Dict[str, float]:
        return {name: data.get('duration', 0) for name, data in self.metrics.items()}

# Global performance tracker
perf_tracker = PerformanceTracker()