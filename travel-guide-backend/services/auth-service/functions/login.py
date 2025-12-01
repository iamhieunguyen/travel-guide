import os
import json
import base64
import boto3
from utils.cors import _response, options_response

# Environment variables
USER_POOL_ID = os.environ["USER_POOL_ID"]
CLIENT_ID = os.environ["CLIENT_ID"]
ENVIRONMENT = os.environ["ENVIRONMENT"]

# Initialize Cognito client
cognito = boto3.client('cognito-idp')

def lambda_handler(event, context):
    # Xử lý OPTIONS request
    http_method = event.get("httpMethod", event.get("requestContext", {}).get("http", {}).get("method", ""))
    if http_method == "OPTIONS":
        return options_response(os.environ.get("CORS_ORIGIN"))
    
    try:
        # Parse request body
        body_str = event.get("body") or "{}"
        if event.get("isBase64Encoded"):
            body_str = base64.b64decode(body_str).decode("utf-8", errors="ignore")
        body = json.loads(body_str)
        
        username = body.get('username', '').strip()
        password = body.get('password', '')
        
        # Validate required fields
        if not username:
            return _response(400, {"error": "Username is required"}, os.environ.get("CORS_ORIGIN"))
        
        if not password:
            return _response(400, {"error": "Password is required"}, os.environ.get("CORS_ORIGIN"))
        
        # Admin authentication
        response = cognito.admin_initiate_auth(
            UserPoolId=USER_POOL_ID,
            ClientId=CLIENT_ID,
            AuthFlow='ADMIN_NO_SRP_AUTH',
            AuthParameters={
                'USERNAME': username,
                'PASSWORD': password
            }
        )
        
        auth_result = response['AuthenticationResult']
        
        return _response(200, {
            "message": "Login successful",
            "idToken": auth_result['IdToken'],
            "refreshToken": auth_result['RefreshToken'],
            "accessToken": auth_result['AccessToken'],
            "tokenType": auth_result['TokenType'],
            "expiresIn": auth_result['ExpiresIn'],
            "username": username
        }, os.environ.get("CORS_ORIGIN"))
    
    except cognito.exceptions.UserNotFoundException:
        return _response(400, {"error": "User not found"}, os.environ.get("CORS_ORIGIN"))
    except cognito.exceptions.NotAuthorizedException:
        return _response(400, {"error": "Incorrect username or password"}, os.environ.get("CORS_ORIGIN"))
    except cognito.exceptions.UserNotConfirmedException:
        return _response(400, {"error": "User is not confirmed. Please check your email for confirmation code."}, os.environ.get("CORS_ORIGIN"))
    except Exception as e:
        print(f"Login error: {e}")
        return _response(500, {"error": f"Internal server error: {str(e)}"}, os.environ.get("CORS_ORIGIN"))