"""
Centralized CORS and response utilities
"""
import os
import json
from decimal import Decimal

CORS_ORIGIN = os.getenv("CORS_ORIGIN", "https://d1k0khib98591u.cloudfront.net")

def cors_headers():
    """Standard CORS headers"""
    return {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": CORS_ORIGIN,
        "Access-Control-Allow-Headers": "Content-Type,Authorization,X-User-Id",
        "Access-Control-Allow-Methods": "OPTIONS,GET,POST,PATCH,DELETE,PUT",
    }

class DecimalEncoder(json.JSONEncoder):
    """Custom JSON encoder for DynamoDB Decimal types"""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj) if obj % 1 else int(obj)
        return super().default(obj)

def response(status_code, body, extra_headers=None):
    """Standard Lambda response"""
    headers = cors_headers()
    if extra_headers:
        headers.update(extra_headers)
    
    return {
        "statusCode": status_code,
        "headers": headers,
        "body": json.dumps(body, ensure_ascii=False, cls=DecimalEncoder)
    }

def ok(body, status_code=200):
    """Success response"""
    return response(status_code, body)

def created(body):
    """201 Created"""
    return response(201, body)

def error(message, status_code=400, **extra_fields):
    """Error response"""
    body = {"error": message}
    body.update(extra_fields)
    return response(status_code, body)

def unauthorized(message="Unauthorized"):
    """401 Unauthorized"""
    return error(message, 401)

def forbidden(message="Forbidden"):
    """403 Forbidden"""
    return error(message, 403)

def not_found(message="Not found"):
    """404 Not Found"""
    return error(message, 404)

def bad_request(message):
    """400 Bad Request"""
    return error(message, 400)

def internal_error(message="Internal server error"):
    """500 Internal Server Error"""
    return error(message, 500)

def options():
    """Handle OPTIONS preflight"""
    return {
        "statusCode": 204,
        "headers": cors_headers(),
        "body": ""
    }

def parse_json_body(event):
    """Parse JSON body from API Gateway event"""
    import base64
    
    body_str = event.get("body", "")
    if not body_str:
        return {}
    
    if event.get("isBase64Encoded"):
        body_str = base64.b64decode(body_str).decode("utf-8", errors="ignore")
    
    try:
        return json.loads(body_str)
    except json.JSONDecodeError:
        raise ValueError("Invalid JSON in request body")

def get_http_method(event):
    """Extract HTTP method from event"""
    method = event.get("httpMethod")
    if not method:
        method = event.get("requestContext", {}).get("http", {}).get("method")
    return method