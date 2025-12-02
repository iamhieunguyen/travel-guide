"""
Get User Profile
Lấy thông tin profile của user hiện tại
"""
import os
import json
import boto3
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
s3_client = boto3.client('s3')

PROFILES_TABLE_NAME = os.environ.get('PROFILES_TABLE_NAME', '')
BUCKET_NAME = os.environ.get('BUCKET_NAME', '')

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
        
        # Lấy profile từ DynamoDB
        result = profiles_table.get_item(Key={"userId": user_id})
        
        if "Item" not in result:
            # Nếu chưa có profile, trả về profile mặc định
            return response(200, {
                "userId": user_id,
                "username": None,
                "avatarKey": None,
                "avatarUrl": None,
                "bio": None,
                "createdAt": None
            })
        
        profile = result["Item"]
        
        # Tạo presigned URL cho avatar nếu có
        if profile.get("avatarKey"):
            try:
                avatar_url = s3_client.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': BUCKET_NAME, 'Key': profile["avatarKey"]},
                    ExpiresIn=3600
                )
                profile["avatarUrl"] = avatar_url
            except Exception as e:
                print(f"Error generating avatar URL: {e}")
        
        # Convert Decimal to float
        for key, value in profile.items():
            if isinstance(value, Decimal):
                profile[key] = float(value)
        
        return response(200, profile)
    
    except Exception as e:
        print(f"Error in get_profile: {e}")
        import traceback
        traceback.print_exc()
        return response(500, {"error": "Internal server error"})
