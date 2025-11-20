"""
Centralized authentication utilities for Lambda functions
"""
import os
import requests
from jose import jwt, JWTError

AWS_REGION = os.environ.get("AWS_REGION", "ap-southeast-1")
USER_POOL_ID = os.environ.get("USER_POOL_ID", "")
CLIENT_ID = os.environ.get("CLIENT_ID", "")

# Cache for JWKS keys
_jwks_cache = None

def get_jwks_keys():
    """Fetch and cache Cognito JWKS keys"""
    global _jwks_cache
    if _jwks_cache is None:
        keys_url = f'https://cognito-idp.{AWS_REGION}.amazonaws.com/{USER_POOL_ID}/.well-known/jwks.json'
        response = requests.get(keys_url, timeout=5)
        response.raise_for_status()
        _jwks_cache = response.json()['keys']
    return _jwks_cache

def verify_jwt_token(token):
    """
    Verify and decode JWT token from Cognito
    Returns: dict with user info or None if invalid
    """
    try:
        headers = jwt.get_unverified_headers(token)
        kid = headers['kid']

        keys = get_jwks_keys()
        key = next((k for k in keys if k['kid'] == kid), None)
        if not key:
            return None

        payload = jwt.decode(
            token,
            key,
            algorithms=['RS256'],
            audience=CLIENT_ID,
            options={"verify_exp": True, "verify_aud": True}
        )

        return {
            'user_id': payload.get('cognito:username') or payload.get('sub'),
            'email': payload.get('email'),
            'sub': payload.get('sub')
        }
    except JWTError as e:
        print(f"JWT verification failed: {e}")
        return None
    except Exception as e:
        print(f"Unexpected error verifying JWT: {e}")
        return None

def get_user_from_event(event):
    """
    Extract user info from Lambda event
    Returns: dict with user_id or None
    """
    request_context = event.get("requestContext", {})
    authorizer = request_context.get("authorizer", {})
    
    # REST API format
    claims = authorizer.get("claims", {})
    if claims:
        return {
            'user_id': claims.get('cognito:username') or claims.get('sub'),
            'email': claims.get('email'),
            'sub': claims.get('sub')
        }
    
    # HTTP API format
    jwt_data = authorizer.get("jwt", {})
    jwt_claims = jwt_data.get("claims", {})
    if jwt_claims:
        return {
            'user_id': jwt_claims.get('cognito:username') or jwt_claims.get('sub'),
            'email': jwt_claims.get('email'),
            'sub': jwt_claims.get('sub')
        }
    
    # Manual JWT verification
    headers = event.get("headers", {})
    auth_header = headers.get("Authorization") or headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.replace("Bearer ", "")
        user_info = verify_jwt_token(token)
        if user_info:
            return user_info
    
    # Dev mode fallback
    if os.environ.get("STAGE") == "dev":
        x_user_id = headers.get("X-User-Id") or headers.get("x-user-id")
        if x_user_id:
            return {'user_id': x_user_id}
    
    return None

def require_auth(event):
    """
    Get user info or raise ValueError if not authenticated
    """
    user = get_user_from_event(event)
    if not user or not user.get('user_id'):
        raise ValueError("Unauthorized: Valid authentication required")
    return user