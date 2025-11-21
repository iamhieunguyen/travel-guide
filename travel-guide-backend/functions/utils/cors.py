"""
utils/response.py - Production ready CORS handler
"""
import os
import json
from decimal import Decimal

CORS_ORIGIN = os.getenv("CORS_ORIGIN", "http://localhost:3000")  # fallback dev

def cors_headers():
    return {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": CORS_ORIGIN,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Headers": "Content-Type,Authorization,X-User-Id,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
        "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        "Access-Control-Max-Age": "600",
    }

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj) if obj % 1 else int(obj)
        return super().default(obj)

def response(status_code: int, body=None, extra_headers=None):
    headers = cors_headers()
    if extra_headers:
        headers.update(extra_headers)

    return {
        "statusCode": status_code,
        "headers": headers,
        "body": json.dumps(body, ensure_ascii=False, cls=DecimalEncoder) if body is not None else ""
    }

# Helper functions
ok = lambda body=None: response(200, body)
created = lambda body: response(201, body)
no_content = lambda: response(204)
bad_request = lambda msg="Bad request": response(400, {"error": msg})
unauthorized = lambda msg="Unauthorized": response(401, {"error": msg})
forbidden = lambda msg="Forbidden": response(403, {"error": msg})
not_found = lambda msg="Not found": response(404, {"error": msg})
internal_error = lambda msg="Internal server error": response(500, {"error": msg})

def options():
    return {
        "statusCode": 200,
        "headers": {**cors_headers(), "Content-Length": "0"},
        "body": ""
    }