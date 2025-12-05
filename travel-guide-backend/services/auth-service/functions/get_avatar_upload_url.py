"""
Get Avatar Upload URL
Tạo presigned URL để upload avatar
"""
import os
import json
import uuid
import boto3
from utils.jwt_validator import get_user_info_from_event

s3_client = boto3.client('s3')

BUCKET_NAME = os.environ.get('BUCKET_NAME', '')


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


def get_user_id(event):
    """Lấy user ID (sub) từ JWT token trong Authorization header"""
    try:
        user_info = get_user_info_from_event(event)
        if user_info and "sub" in user_info:
            return user_info["sub"]
        return None
    except Exception as e:
        print(f"Error extracting user_id from token: {e}")
        return None


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
        filename = body.get("filename", "").strip()
        content_type = body.get("contentType", "").strip()
        
        if not filename:
            return response(400, {"error": "filename is required"})
        
        if not content_type:
            return response(400, {"error": "contentType is required"})
        
        # Validate content type
        allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
        if content_type not in allowed_types:
            return response(400, {
                "error": f"Invalid content type. Allowed: {', '.join(allowed_types)}"
            })
        
        # Lấy extension
        ext = filename.split(".")[-1].lower() if "." in filename else "jpg"
        
        # Tạo key cho avatar (dùng userId để dễ quản lý)
        avatar_key = f"avatars/{user_id}/{uuid.uuid4()}.{ext}"
        
        # Tạo presigned URL
        upload_url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': BUCKET_NAME,
                'Key': avatar_key,
                'ContentType': content_type,
            },
            ExpiresIn=900  # 15 phút
        )
        
        return response(200, {
            "uploadUrl": upload_url,
            "avatarKey": avatar_key,
            "expiresIn": 900
        })
    
    except json.JSONDecodeError:
        return response(400, {"error": "Invalid JSON"})
    except Exception as e:
        print(f"Error in get_avatar_upload_url: {e}")
        import traceback
        traceback.print_exc()
        return response(500, {"error": "Internal server error"})
