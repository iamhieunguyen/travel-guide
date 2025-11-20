import os
import json
import uuid
import base64
from datetime import datetime, timezone
from decimal import Decimal
import boto3
import sys
sys.path.insert(0, '/var/task/functions')
from utils import *

# Clients
s3 = boto3.client("s3")
dynamodb = boto3.resource("dynamodb")

TABLE_NAME = os.environ["TABLE_NAME"]
BUCKET_NAME = os.environ["BUCKET_NAME"]
table = dynamodb.Table(TABLE_NAME)


def _cors_headers():
    return {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": os.getenv("CORS_ORIGIN", "*"),
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "OPTIONS,POST",
    }


def _response(status, body_dict):
    return {
        "statusCode": status,
        "headers": _cors_headers(),
        "body": json.dumps(body_dict, ensure_ascii=False),
    }


def _thumb_from_image_key(image_key: str) -> str:
    base = os.path.basename(image_key)
    stem = os.path.splitext(base)[0]
    return f"thumbnails/{stem}_256.webp"


def lambda_handler(event, context):
    method = event.get("httpMethod") or event.get("requestContext", {}).get("http", {}).get("method")
    if method == "OPTIONS":
        return options()

    try:
        # LẤY SUB TỪ COGNITO AUTHORIZER
        rc = event.get("requestContext", {}) or {}
        auth = rc.get("authorizer") or {}
        claims = auth.get("claims") or {}

        owner_id = claims.get("sub")
        if not owner_id:
            return _response(401, {"error": "Unauthorized: Missing sub in token"})

        # ✅ Lấy username hiển thị từ token (tuỳ pool mà chọn field phù hợp)
        display_name = (
            claims.get("cognito:username")
            or claims.get("preferred_username")
            or claims.get("email")
            or ""
        )
        display_name = display_name.strip()

        # Parse body
        body_str = event.get("body") or ""
        if event.get("isBase64Encoded"):
            body_str = base64.b64decode(body_str).decode("utf-8", errors="ignore")
        data = json.loads(body_str or "{}")

        # Validate required fields
        title = (data.get("title") or "").strip()
        content = (data.get("content") or "").strip()
        if not title or not content:
            return _response(400, {"error": "title and content are required"})

        # Validate geo
        try:
            lat_f = float(data["lat"])
            lng_f = float(data["lng"])
            if not (-90 <= lat_f <= 90 and -180 <= lng_f <= 180):
                raise ValueError("Invalid coordinates")
        except (KeyError, ValueError, TypeError):
            return _response(400, {"error": "valid lat/lng required"})

        # Visibility
        visibility = (data.get("visibility") or "public").lower()
        if visibility not in ("public", "private"):
            return _response(400, {"error": "visibility must be public or private"})

        # Tags
        tags = data.get("tags") or []
        if not isinstance(tags, list):
            return _response(400, {"error": "tags must be an array"})
        tags = list({str(t).strip() for t in tags if str(t).strip()})

        # ✅ Location name (không bắt buộc)
        location_name = (data.get("locationName") or "").strip()

        # Article ID & time
        article_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc).isoformat()

        # Handle imageKey (kiểm tra tồn tại trong S3)
        image_key = None
        if data.get("imageKey"):
            image_key = data["imageKey"].strip()
            try:
                s3.head_object(Bucket=BUCKET_NAME, Key=image_key)
            except s3.exceptions.ClientError:
                return _response(400, {"error": f"imageKey not found in S3: {image_key}"})
            except Exception as e:
                return _response(400, {"error": f"S3 error: {str(e)}"})

        # Build item
        item = {
            "articleId": article_id,
            "ownerId": owner_id,  # sub từ Cognito để check quyền
            "title": title,
            "content": content,
            "createdAt": created_at,
            "visibility": visibility,
            "lat": Decimal(str(lat_f)),
            "lng": Decimal(str(lng_f)),
            "geohash": f"{lat_f:.6f},{lng_f:.6f}",
            "gh5": f"{lat_f:.2f},{lng_f:.2f}",
            "tags": tags,
        }

        if image_key:
            item["imageKey"] = image_key
            item["thumbnailKey"] = _thumb_from_image_key(image_key)

        if location_name:
            item["locationName"] = location_name

        if display_name:
            item["username"] = display_name

        # Lưu vào DynamoDB
        table.put_item(Item=item)

        # Chuẩn bị response (chuyển Decimal → float)
        resp = {}
        for k, v in item.items():
            resp[k] = float(v) if isinstance(v, Decimal) else v

        print(f"Article created: {article_id} by user {owner_id}")
        return _response(201, resp)

    except Exception as e:
        print(f"Create error: {e}")
        return _response(500, {"error": "Internal server error"})
