import os
import json
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
        confirmation_code = body.get('confirmation_code', '').strip()
        
        # Validate required fields
        if not username:
            return _response(400, {"error": "Username is required"}, os.environ.get("CORS_ORIGIN"))
        
        if not confirmation_code:
            return _response(400, {"error": "Confirmation code is required"}, os.environ.get("CORS_ORIGIN"))
        
        # Confirm user signup
        cognito.confirm_sign_up(
            ClientId=CLIENT_ID,
            Username=username,
            ConfirmationCode=confirmation_code
        )
        
        return _response(200, {
            "message": "User confirmed successfully. You can now log in.",
            "username": username
        }, os.environ.get("CORS_ORIGIN"))
    
    except cognito.exceptions.CodeMismatchException:
        return _response(400, {"error": "Invalid confirmation code"}, os.environ.get("CORS_ORIGIN"))
    except cognito.exceptions.ExpiredCodeException:
        return _response(400, {"error": "Confirmation code has expired"}, os.environ.get("CORS_ORIGIN"))
    except cognito.exceptions.UserNotFoundException:
        return _response(404, {"error": "User not found"}, os.environ.get("CORS_ORIGIN"))
    except Exception as e:
        print(f"Confirmation error: {e}")
        return _response(500, {"error": f"Internal server error: {str(e)}"}, os.environ.get("CORS_ORIGIN"))