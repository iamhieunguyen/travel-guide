"""
Upload Cover Image
Generate presigned URL for cover image upload
"""
import os
import json
import boto3
from datetime import datetime, timezone

s3_client = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

BUCKET_NAME = os.environ.get('BUCKET_NAME', '')
PROFILES_TABLE_NAME = os.environ.get('PROFILES_TABLE_NAME', '')
CF_DOMAIN = os.environ.get('CF_DOMAIN', '')

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
        file_type = body.get("fileType", "image/jpeg")
        
        # Validate file type
        allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
        if file_type not in allowed_types:
            return response(400, {"error": "Invalid file type. Only JPEG, PNG, WebP allowed"})
        
        # Generate S3 key
        extension = file_type.split('/')[-1]
        if extension == 'jpeg':
            extension = 'jpg'
        
        cover_key = f"covers/{user_id}.{extension}"
        
        # Generate presigned URL for upload
        presigned_url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': BUCKET_NAME,
                'Key': cover_key,
                'ContentType': file_type
            },
            ExpiresIn=300  # 5 minutes
        )
        
        # Update profile with coverKey
        if profiles_table:
            profiles_table.update_item(
                Key={"userId": user_id},
                UpdateExpression="SET coverKey = :key, updatedAt = :timestamp",
                ExpressionAttributeValues={
                    ":key": cover_key,
                    ":timestamp": datetime.now(timezone.utc).isoformat()
                }
            )
        
        # Build cover URL
        if CF_DOMAIN:
            cover_url = f"https://{CF_DOMAIN}/{cover_key}"
        else:
            cover_url = f"https://{BUCKET_NAME}.s3.amazonaws.com/{cover_key}"
        
        return response(200, {
            "uploadUrl": presigned_url,
            "coverKey": cover_key,
            "coverUrl": cover_url
        })
    
    except json.JSONDecodeError:
        return response(400, {"error": "Invalid JSON"})
    except Exception as e:
        print(f"Error in upload_cover: {e}")
        import traceback
        traceback.print_exc()
        return response(500, {"error": "Internal server error"})
