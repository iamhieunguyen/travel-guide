"""
Update User Profile
Cập nhật thông tin profile (username, bio, avatar)
"""
import os
import json
import boto3
from datetime import datetime, timezone

dynamodb = boto3.resource('dynamodb')
cognito_client = boto3.client('cognito-idp')

PROFILES_TABLE_NAME = os.environ.get('PROFILES_TABLE_NAME', '')
USER_POOL_ID = os.environ.get('USER_POOL_ID', '')

profiles_table = dynamodb.Table(PROFILES_TABLE_NAME) if PROFILES_TABLE_NAME else None


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
        "body": json.dumps(body, ensure_ascii=False, default=str)
    }


def get_user_id(event):
    """Lấy user ID từ Cognito authorizer"""
    rc = event.get("requestContext", {})
    auth = rc.get("authorizer", {})
    claims = auth.get("claims", {})
    return claims.get("sub")


def lambda_handler(event, context):
    method = event.get("httpMethod", "")
    if method == "OPTIONS":
        return {"statusCode": 204, "headers": cors_headers(), "body": ""}
    
    try:
        user_id = get_user_id(event)
        if not user_id:
            return response(401, {"error": "Unauthorized"})
        
        # Parse body
        body = json.loads(event.get("body", "{}"))
        
        # Các trường được phép update
        allowed_fields = ["username", "bio", "avatarKey", "coverImageKey"]
        
        # Xây dựng update expression
        update_parts = []
        expression_names = {}
        expression_values = {}
        
        for field in allowed_fields:
            if field in body:
                value = body[field]
                
                # Validate username
                if field == "username":
                    if value:
                        value = str(value).strip()
                        if len(value) < 3 or len(value) > 30:
                            return response(400, {"error": "Username must be 3-30 characters"})
                        
                        # Cập nhật username trong Cognito
                        try:
                            cognito_client.admin_update_user_attributes(
                                UserPoolId=USER_POOL_ID,
                                Username=user_id,
                                UserAttributes=[
                                    {'Name': 'preferred_username', 'Value': value}
                                ]
                            )
                        except Exception as e:
                            print(f"Error updating Cognito username: {e}")
                
                # Validate bio
                if field == "bio" and value:
                    value = str(value).strip()
                    if len(value) > 500:
                        return response(400, {"error": "Bio must be less than 500 characters"})
                
                update_parts.append(f"#{field} = :{field}")
                expression_names[f"#{field}"] = field
                expression_values[f":{field}"] = value
        
        if not update_parts:
            return response(400, {"error": "No valid fields to update"})
        
        # Thêm updatedAt
        update_parts.append("#updatedAt = :updatedAt")
        expression_names["#updatedAt"] = "updatedAt"
        expression_values[":updatedAt"] = datetime.now(timezone.utc).isoformat()
        
        # Nếu là lần đầu update, set createdAt
        update_expression = "SET " + ", ".join(update_parts)
        
        # Check xem profile đã tồn tại chưa
        existing = profiles_table.get_item(Key={"userId": user_id})
        if "Item" not in existing:
            # Tạo mới profile
            expression_values[":createdAt"] = datetime.now(timezone.utc).isoformat()
            update_parts.append("#createdAt = :createdAt")
            expression_names["#createdAt"] = "createdAt"
            update_expression = "SET " + ", ".join(update_parts)
        
        # Update profile
        result = profiles_table.update_item(
            Key={"userId": user_id},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_names,
            ExpressionAttributeValues=expression_values,
            ReturnValues="ALL_NEW"
        )
        
        updated_profile = result["Attributes"]
        
        return response(200, {
            "message": "Profile updated successfully",
            "profile": updated_profile
        })
    
    except json.JSONDecodeError:
        return response(400, {"error": "Invalid JSON"})
    except Exception as e:
        print(f"Error in update_profile: {e}")
        import traceback
        traceback.print_exc()
        return response(500, {"error": "Internal server error"})
