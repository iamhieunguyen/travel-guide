import os
import json
import boto3
from cors import ok, error, options

cognito = boto3.client("cognito-idp")

def _get_access_token(event):
    """Extract access token from Authorization header"""
    headers = event.get("headers") or {}
    auth_header = headers.get("Authorization") or headers.get("authorization") or ""
    
    if auth_header.startswith("Bearer "):
        return auth_header[7:]
    
    return None

def lambda_handler(event, context):
    """
    Change user password using Cognito ChangePassword API
    POST /auth/change-password
    
    Body:
    {
        "currentPassword": "string",
        "newPassword": "string"
    }
    """
    method = (event.get("httpMethod") or 
              event.get("requestContext", {}).get("http", {}).get("method"))
    
    if method == "OPTIONS":
        return options()
    
    try:
        # Get access token from Authorization header
        access_token = _get_access_token(event)
        
        if not access_token:
            return error(401, "Missing or invalid Authorization header")
        
        # Parse request body
        body_str = event.get("body") or "{}"
        if event.get("isBase64Encoded"):
            import base64
            body_str = base64.b64decode(body_str).decode("utf-8")
        
        data = json.loads(body_str)
        
        current_password = data.get("currentPassword")
        new_password = data.get("newPassword")
        
        if not current_password or not new_password:
            return error(400, "currentPassword and newPassword are required")
        
        # Validate new password
        if len(new_password) < 8:
            return error(400, "New password must be at least 8 characters long")
        
        # Call Cognito ChangePassword API
        try:
            cognito.change_password(
                PreviousPassword=current_password,
                ProposedPassword=new_password,
                AccessToken=access_token
            )
            
            print(f"✅ Password changed successfully")
            
            return ok(200, {
                "message": "Password changed successfully"
            })
            
        except cognito.exceptions.NotAuthorizedException as e:
            print(f"❌ Invalid current password: {e}")
            return error(401, "Current password is incorrect")
        
        except cognito.exceptions.InvalidPasswordException as e:
            print(f"❌ Invalid new password: {e}")
            return error(400, f"Invalid new password: {str(e)}")
        
        except cognito.exceptions.LimitExceededException as e:
            print(f"❌ Too many attempts: {e}")
            return error(429, "Too many password change attempts. Please try again later.")
        
    except json.JSONDecodeError:
        return error(400, "Invalid JSON in request body")
    
    except Exception as e:
        print(f"❌ Error changing password: {e}")
        import traceback
        traceback.print_exc()
        return error(500, f"Internal server error: {str(e)}")
