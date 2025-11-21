import os
import json

def cors_headers(cors_origin=None):
    """Get CORS headers with environment-aware origin"""
    # Default to environment variable if not provided
    origin = cors_origin or os.getenv("CORS_ORIGIN", "*")
    
    # In production, restrict to specific origins
    if os.getenv("ENVIRONMENT", "staging") == "prod" and origin == "*":
        origin = os.getenv("PRODUCTION_DOMAIN", "https://your-production-domain.com")
    
    return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "Content-Type,Authorization,X-User-Id,X-Requested-With,Content-Length",
        "Access-Control-Allow-Methods": "OPTIONS,GET,POST,PATCH,DELETE,PUT",
        "Access-Control-Max-Age": "86400"  # 24 hours cache
    }

def _response(status_code, body_dict, cors_origin=None):
    """Standardized response format with CORS headers"""
    headers = cors_headers(cors_origin)
    headers["Content-Type"] = "application/json"
    
    # Add security headers
    headers["X-Content-Type-Options"] = "nosniff"
    headers["X-Frame-Options"] = "DENY"
    headers["X-XSS-Protection"] = "1; mode=block"
    
    return {
        "statusCode": status_code,
        "headers": headers,
        "body": json.dumps(body_dict, ensure_ascii=False)
    }

def options_response(cors_origin=None):
    """Standardized OPTIONS response"""
    return {
        "statusCode": 204,
        "headers": cors_headers(cors_origin),
        "body": ""
    }