"""
Get Cover Image Upload URL
Tạo presigned URL để upload ảnh bìa
"""
import os
import json
import uuid
import boto3

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
        
        # Tạo key cho cover image (dùng userId để dễ quản lý)
        cover_key = f"covers/{user_id}/{uuid.uuid4()}.{ext}"
        
        # Tạo presigned URL với giới hạn kích thước 10MB
        upload_url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': BUCKET_NAME,
                'Key': cover_key,
                'ContentType': content_type,
            },
            ExpiresIn=900  # 15 phút
        )
        
        return response(200, {
            "uploadUrl": upload_url,
            "coverImageKey": cover_key,
            "expiresIn": 900,
            "maxSizeBytes": 10485760  # 10MB
        })
    
    except json.JSONDecodeError:
        return response(400, {"error": "Invalid JSON"})
    except Exception as e:
        print(f"Error in get_cover_upload_url: {e}")
        import traceback
        traceback.print_exc()
        return response(500, {"error": "Internal server error"})
