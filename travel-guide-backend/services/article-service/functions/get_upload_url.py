import os
import json
import uuid
import boto3
from utils.cors import _response, options_response

# Environment variables
BUCKET_NAME = os.environ["BUCKET_NAME"]
ENVIRONMENT = os.environ["ENVIRONMENT"]
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"]

# Initialize resources
s3 = boto3.client("s3")

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
        
        filename = (body.get("filename") or "").strip()
        content_type = (body.get("contentType") or "").strip()
        file_size = body.get("fileSize", 0)
        
        if not filename:
            return _response(400, {"error": "filename is required"}, os.environ.get("CORS_ORIGIN"))
        
        if not content_type:
            return _response(400, {"error": "contentType is required"}, os.environ.get("CORS_ORIGIN"))
        
        # Validate content type
        if content_type not in ALLOWED_TYPES:
            return _response(400, {
                "error": f"contentType must be one of: {', '.join(ALLOWED_TYPES)}",
                "allowedTypes": ALLOWED_TYPES
            }, os.environ.get("CORS_ORIGIN"))
        
        # Validate file size
        try:
            file_size = int(file_size)
            if file_size == 0:
                return _response(400, {"error": "fileSize is required"})
            if file_size > MAX_FILE_SIZE:
                return _response(400, {
                    "error": f"File size exceeds maximum limit of {MAX_FILE_SIZE // (1024*1024)}MB",
                    "maxFileSize": MAX_FILE_SIZE
                }, os.environ.get("CORS_ORIGIN"))
        except (TypeError, ValueError):
            return _response(400, {"error": "fileSize must be a valid number"}, os.environ.get("CORS_ORIGIN"))
        
        # Get file extension
        ext = ""
        if "." in filename:
            ext = filename.split(".")[-1].lower()
        else:
            # Determine extension from content type
            ext_map = {
                "image/png": "png",
                "image/jpeg": "jpg",
                "image/jpg": "jpg",
                "image/webp": "webp"
            }
            ext = ext_map.get(content_type, "bin")
        
        # Create unique key
        key = f"articles/{uuid.uuid4()}.{ext}"
        
        # Generate presigned URL for PUT object
        url = s3.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": BUCKET_NAME,
                "Key": key,
                "ContentType": content_type,
                "ACL": "private",
                "ContentLength": file_size
            },
            ExpiresIn=900  # 15 minutes
        )
        
        return _response(200, {
            "uploadUrl": url,
            "key": key,
            "expiresIn": 900
        }, os.environ.get("CORS_ORIGIN"))
    
    except json.JSONDecodeError:
        return _response(400, {"error": "Invalid JSON in request body"}, os.environ.get("CORS_ORIGIN"))
    except Exception as e:
        print(f"Error in get_upload_url: {e}")
        return _response(500, {"error": f"Internal server error"}, os.environ.get("CORS_ORIGIN"))