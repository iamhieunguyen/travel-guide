import os
import requests
from jose import jwt
import time
import json

_JWKS_CACHE = None
_JWKS_LAST_REFRESH = 0
_JWKS_CACHE_DURATION = 3600  # 1 hour

def _get_user_info_from_jwt(token, user_pool_id, client_id, region):
    """Lấy user info từ JWT token với cache JWKS. Trả về dict với sub, username, email."""
    global _JWKS_CACHE, _JWKS_LAST_REFRESH
    
    try:
        # Kiểm tra và làm mới cache JWKS nếu cần
        current_time = time.time()
        if not _JWKS_CACHE or (current_time - _JWKS_LAST_REFRESH) > _JWKS_CACHE_DURATION:
            keys_url = f'https://cognito-idp.{region}.amazonaws.com/{user_pool_id}/.well-known/jwks.json'
            response = requests.get(keys_url, timeout=5)
            if response.status_code != 200:
                print(f"Failed to fetch JWKS: {response.status_code} - {response.text}")
                return None
                
            _JWKS_CACHE = response.json()['keys']
            _JWKS_LAST_REFRESH = current_time
        
        keys = _JWKS_CACHE
        headers = jwt.get_unverified_headers(token)
        kid = headers['kid']
        key = None
        for k in keys:
            if k['kid'] == kid:
                key = k
                break
        if not key:
            print(f"Key with kid {kid} not found in JWKS")
            return None
        
        # Decode token với verification
        user_info = jwt.decode(
            token,
            key,
            algorithms=['RS256'],
            audience=client_id,
            issuer=f'https://cognito-idp.{region}.amazonaws.com/{user_pool_id}',
            options={
                "verify_exp": True,
                "verify_aud": True,
                "verify_iss": True
            }
        )
        return {
            'sub': user_info.get('sub'),
            'username': user_info.get('cognito:username') or user_info.get('username'),
            'email': user_info.get('email')
        }
    except jwt.ExpiredSignatureError:
        print("Token has expired")
        return None
    except jwt.JWTClaimsError as e:
        print(f"JWT claims error: {e}")
        return None
    except jwt.JWTError as e:
        print(f"JWT decoding error: {e}")
        return None
    except Exception as e:
        print(f"JWT verification error: {e}")
        return None

def _get_user_id_from_jwt(token, user_pool_id, client_id, region):
    """Backward compatible - returns username only"""
    info = _get_user_info_from_jwt(token, user_pool_id, client_id, region)
    return info.get('username') if info else None

def get_user_info_from_event(event, user_pool_id=None, client_id=None, region=None):
    """Lấy full user info (sub, username, email) từ JWT token."""
    headers = event.get("headers") or {}
    
    auth_header = headers.get("Authorization") or headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.replace("Bearer ", "")
        user_pool_id = user_pool_id or os.environ.get("USER_POOL_ID")
        client_id = client_id or os.environ.get("CLIENT_ID")
        region = region or os.environ.get("AWS_REGION", "us-east-1")

        if user_pool_id and client_id and region:
            return _get_user_info_from_jwt(token, user_pool_id, client_id, region)
    
    return None

def get_user_id_from_event(event, user_pool_id=None, client_id=None, region=None):
    """Hỗ trợ cả X-User-Id header và JWT token. Ưu tiên JWT. Returns username."""
    headers = event.get("headers") or {}
    
    # 1. Thử Authorization header (JWT) - ƯU TIÊN HƠN
    auth_header = headers.get("Authorization") or headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.replace("Bearer ", "")
        user_pool_id = user_pool_id or os.environ.get("USER_POOL_ID")
        client_id = client_id or os.environ.get("CLIENT_ID")
        region = region or os.environ.get("AWS_REGION", "us-east-1")

        if user_pool_id and client_id and region:
            user_id = _get_user_id_from_jwt(token, user_pool_id, client_id, region)
            if user_id:
                return user_id
    
    # 2. Thử X-User-Id header - Dành cho debug/testing
    x_user_id = headers.get("X-User-Id") or headers.get("x-user-id")
    if x_user_id:
        print(f"WARNING: Using X-User-Id header for user ID: {x_user_id}. This should only be used for debugging.")
        return x_user_id

    return None