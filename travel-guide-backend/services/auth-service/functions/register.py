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
        email = body.get('email', '').strip()
        password = body.get('password', '')
        
        # Validate required fields
        if not username:
            return _response(400, {"error": "Username is required"}, os.environ.get("CORS_ORIGIN"))
        
        if not email:
            return _response(400, {"error": "Email is required"}, os.environ.get("CORS_ORIGIN"))
        
        if not password:
            return _response(400, {"error": "Password is required"}, os.environ.get("CORS_ORIGIN"))
        
        # Validate email format (simple validation)
        if "@" not in email or "." not in email.split("@")[1]:
            return _response(400, {"error": "Invalid email format"}, os.environ.get("CORS_ORIGIN"))
        
        # Register user with Cognito
        response = cognito.sign_up(
            ClientId=CLIENT_ID,
            Username=username,
            Password=password,
            UserAttributes=[
                {'Name': 'email', 'Value': email}
            ]
        )
        
        return _response(200, {
            "message": "Registration successful. Please check your email for confirmation code.",
            "userSub": response['UserSub'],
            "username": username
        }, os.environ.get("CORS_ORIGIN"))
    
    except cognito.exceptions.UsernameExistsException:
        return _response(400, {"error": "Username already exists"}, os.environ.get("CORS_ORIGIN"))
    except cognito.exceptions.InvalidPasswordException:
        return _response(400, {"error": "Invalid password format. Password must have minimum 8 characters with uppercase, lowercase and numbers."}, os.environ.get("CORS_ORIGIN"))
    except cognito.exceptions.InvalidParameterException as e:
        error_message = str(e)
        if "email" in error_message.lower():
            return _response(400, {"error": "Invalid email format"}, os.environ.get("CORS_ORIGIN"))
        return _response(400, {"error": f"Invalid parameters: {error_message}"}, os.environ.get("CORS_ORIGIN"))
    except Exception as e:
        print(f"Registration error: {e}")
        return _response(500, {"error": f"Internal server error: {str(e)}"}, os.environ.get("CORS_ORIGIN"))