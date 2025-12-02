"""
Change Password
Thay đổi mật khẩu của user
"""
import os
import json
import boto3

cognito_client = boto3.client('cognito-idp')


def cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization,X-User-Id",
        "Access-Control-Allow-Methods": "OPTIONS,GET,POST,PATCH,DELETE",
    }


def response(status, body):
    return {
        "statusCode": status,
        "headers": cors_headers(),
        "body": json.dumps(body, ensure_ascii=False)
    }


def get_access_token(event):
    """Lấy access token từ Authorization header"""
    headers = event.get("headers", {})
    auth_header = headers.get("Authorization") or headers.get("authorization", "")
    
    if auth_header.startswith("Bearer "):
        return auth_header[7:]
    
    return None


def lambda_handler(event, context):
    method = event.get("httpMethod", "")
    if method == "OPTIONS":
        return {"statusCode": 204, "headers": cors_headers(), "body": ""}
    
    try:
        # Lấy access token
        access_token = get_access_token(event)
        if not access_token:
            return response(401, {"error": "Missing access token"})
        
        # Parse body
        body = json.loads(event.get("body", "{}"))
        old_password = body.get("oldPassword", "").strip()
        new_password = body.get("newPassword", "").strip()
        
        if not old_password or not new_password:
            return response(400, {"error": "oldPassword and newPassword are required"})
        
        # Validate new password
        if len(new_password) < 8:
            return response(400, {"error": "New password must be at least 8 characters"})
        
        # Change password using Cognito
        try:
            cognito_client.change_password(
                PreviousPassword=old_password,
                ProposedPassword=new_password,
                AccessToken=access_token
            )
            
            return response(200, {
                "message": "Password changed successfully"
            })
        
        except cognito_client.exceptions.NotAuthorizedException:
            return response(400, {"error": "Incorrect old password"})
        
        except cognito_client.exceptions.InvalidPasswordException as e:
            return response(400, {"error": f"Invalid password: {str(e)}"})
        
        except cognito_client.exceptions.LimitExceededException:
            return response(429, {"error": "Too many requests. Please try again later"})
    
    except json.JSONDecodeError:
        return response(400, {"error": "Invalid JSON"})
    except Exception as e:
        print(f"Error in change_password: {e}")
        import traceback
        traceback.print_exc()
        return response(500, {"error": "Internal server error"})
