import os
import json
import uuid
import base64
import boto3
from datetime import datetime, timezone
from decimal import Decimal
import requests
from utils.cors import _response, options_response
from utils.jwt_validator import get_user_id_from_event
from utils.geo_utils import geohash_encode, convert_decimals
from PIL import Image
import io

# Environment variables
TABLE_NAME = os.environ["TABLE_NAME"]
BUCKET_NAME = os.environ["BUCKET_NAME"]
USER_POOL_ID = os.environ["USER_POOL_ID"]
CLIENT_ID = os.environ["CLIENT_ID"]
AWS_REGION = os.environ["AWS_REGION"]
ENVIRONMENT = os.environ["ENVIRONMENT"]

# Initialize resources
dynamodb = boto3.resource("dynamodb")
s3 = boto3.client("s3")
table = dynamodb.Table(TABLE_NAME)

def _thumb_from_image_key(image_key: str) -> str:
    """Generate thumbnail key from image key"""
    base = os.path.basename(image_key)
    stem = os.path.splitext(base)[0]
    return f"thumbnails/{stem}_256.webp"

def _process_direct_image_upload(data, article_id):
    """Process direct image upload when image_data_url or image_base64 is provided"""
    image_key = None
    
    # Mode B: gửi base64/data URL trực tiếp (frontend có thể gửi khi upload trực tiếp)
    image_data_url = data.get("image_data_url")
    image_b64 = data.get("image_base64")
    
    if image_data_url:
        # Process data URL format: data:image/png;base64,iVBORw0KG...
        if "," not in image_data_url:
            return None, _response(400, {"error": "Invalid image_data_url format"})
        
        header, b64 = image_data_url.split(",", 1)
        mime = header.split(";")[0].split(":", 1)[1]  # e.g. image/png
        
        # Validate mime type
        allowed_mimes = ["image/png", "image/jpeg", "image/jpg", "image/webp"]
        if mime not in allowed_mimes:
            return None, _response(400, {"error": f"Unsupported image format: {mime}"})
        
        # Determine extension
        ext_map = {
            "image/png": "png",
            "image/jpeg": "jpg",
            "image/jpg": "jpg", 
            "image/webp": "webp"
        }
        ext = ext_map[mime]
        
        try:
            raw = base64.b64decode(b64)
            image_key = f"articles/{article_id}.{ext}"
            s3.put_object(Bucket=BUCKET_NAME, Key=image_key, Body=raw, ContentType=mime, ACL="private")
        except Exception as e:
            return None, _response(400, {"error": f"Failed to process image: {str(e)}"})
    
    elif image_b64:
        image_ext = (data.get("image_extension") or "").lower().strip()
        if image_ext not in ("png", "jpg", "jpeg", "webp"):
            return None, _response(400, {"error": "image_extension must be png|jpg|jpeg|webp"})
        
        mime_map = {
            "png": "image/png",
            "jpg": "image/jpeg", 
            "jpeg": "image/jpeg",
            "webp": "image/webp"
        }
        mime = mime_map[image_ext]
        
        try:
            raw = base64.b64decode(image_b64)
            image_key = f"articles/{article_id}.{image_ext}"
            s3.put_object(Bucket=BUCKET_NAME, Key=image_key, Body=raw, ContentType=mime, ACL="private")
        except Exception as e:
            return None, _response(400, {"error": f"Failed to process base64 image: {str(e)}"})
    
    return image_key, None

def lambda_handler(event, context):
    # Xử lý OPTIONS request
    http_method = event.get("httpMethod", event.get("requestContext", {}).get("http", {}).get("method", ""))
    if http_method == "OPTIONS":
        return options_response(os.environ.get("CORS_ORIGIN"))
    
    try:
        # Parse request body
        body_str = event.get("body") or ""
        if event.get("isBase64Encoded"):
            body_str = base64.b64decode(body_str).decode("utf-8", errors="ignore")
        data = json.loads(body_str or "{}")
        
        # -------- required fields --------
        title = (data.get("title") or "").strip()
        content = (data.get("content") or "").strip()
        if not title:
            return _response(400, {"error": "title is required"}, os.environ.get("CORS_ORIGIN"))
        if not content:
            return _response(400, {"error": "content is required"}, os.environ.get("CORS_ORIGIN"))
        
        # visibility & owner
        visibility = (data.get("visibility") or "public").lower()
        if visibility not in ("public", "private"):
            return _response(400, {"error": "visibility must be public|private"}, os.environ.get("CORS_ORIGIN"))
        
        owner_id = get_user_id_from_event(event, USER_POOL_ID, CLIENT_ID, AWS_REGION)
        if not owner_id:
            return _response(401, {"error": "Authentication required"}, os.environ.get("CORS_ORIGIN"))
        
        # -------- geo: lat/lng bắt buộc --------
        try:
            lat_f = float(data.get("lat"))
            lng_f = float(data.get("lng"))
        except Exception:
            return _response(400, {"error": "lat/lng is required and must be numbers"}, os.environ.get("CORS_ORIGIN"))
        
        if not (-90.0 <= lat_f <= 90.0 and -180.0 <= lng_f <= 180.0):
            return _response(400, {"error": "lat/lng out of range"}, os.environ.get("CORS_ORIGIN"))
        
        # Tạo geohash
        geohash = geohash_encode(lat_f, lng_f, precision=9)
        gh5 = geohash[:5]
        
        # -------- tags (optional) --------
        tags = data.get("tags") or []
        if not isinstance(tags, list):
            return _response(400, {"error": "tags must be an array of strings"}, os.environ.get("CORS_ORIGIN"))
        
        tags = list({str(t).strip() for t in tags if str(t).strip()})
        
        # -------- image handling --------
        article_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc).isoformat()
        image_key = None
        
        # Mode A: đã upload trước (presigned) - tên field phù hợp với frontend
        if data.get("imageKey"):
            image_key = data["imageKey"].strip()
            try:
                s3.head_object(Bucket=BUCKET_NAME, Key=image_key)
            except Exception:
                return _response(400, {"error": f"imageKey not found in S3: {image_key}"}, os.environ.get("CORS_ORIGIN"))
        
        # Mode B: upload trực tiếp qua base64/data URL
        if not image_key and (data.get("image_data_url") or data.get("image_base64")):
            image_key, error_resp = _process_direct_image_upload(data, article_id)
            if error_resp:
                return error_resp
        
        # -------- put item --------
        item = {
            "articleId": article_id,
            "title": title,
            "content": content,
            "createdAt": created_at,
            "visibility": visibility,
            "lat": Decimal(str(lat_f)),
            "lng": Decimal(str(lng_f)),
            "geohash": geohash,
            "gh5": gh5,
            "tags": tags,
            "ownerId": owner_id
        }
        
        if image_key:
            item["imageKey"] = image_key
            item["thumbnailKey"] = _thumb_from_image_key(image_key)
        
        table.put_item(Item=item)
        
        # Chuẩn bị response - chuyển Decimal sang float
        resp = convert_decimals(item)
        return _response(201, resp, os.environ.get("CORS_ORIGIN"))
    
    except Exception as e:
        print(f"Error in create_article: {e}")
        return _response(500, {"error": f"Internal server error: {str(e)}"}, os.environ.get("CORS_ORIGIN"))