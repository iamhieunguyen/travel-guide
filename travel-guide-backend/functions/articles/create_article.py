import os, json, uuid, base64
import boto3
from datetime import datetime, timezone
from decimal import Decimal

from utils.geo import geohash_encode  # từ CommonLayer

s3 = boto3.client("s3")
dynamodb = boto3.resource("dynamodb")

TABLE_NAME = os.environ["TABLE_NAME"]
BUCKET_NAME = os.environ["BUCKET_NAME"]
table = dynamodb.Table(TABLE_NAME)

def _response(status, body_dict):
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body_dict, ensure_ascii=False),
    }

def _get_user_id(event):
    headers = event.get("headers") or {}
    return headers.get("X-User-Id") or headers.get("x-user-id")

def _thumb_from_image_key(image_key: str) -> str:
    base = os.path.basename(image_key)  # ví dụ: 6baf2e01.png
    stem = os.path.splitext(base)[0]    # 6baf2e01
    return f"thumbnails/{stem}_256.webp"

def lambda_handler(event, context):
    try:
        body_str = event.get("body") or ""
        if event.get("isBase64Encoded"):
            body_str = base64.b64decode(body_str).decode("utf-8", errors="ignore")
        data = json.loads(body_str or "{}")

        # -------- required fields --------
        title = (data.get("title") or "").strip()
        content = (data.get("content") or "").strip()
        if not title:
            return _response(400, {"error": "title is required"})
        if not content:
            return _response(400, {"error": "content is required"})

        # visibility & owner
        visibility = (data.get("visibility") or "public").lower()
        if visibility not in ("public", "private"):
            return _response(400, {"error": "visibility must be public|private"})
        owner_id = _get_user_id(event)  # None nếu không gửi header

        # -------- geo: lat/lng bắt buộc --------
        try:
            lat_f = float(data.get("lat"))
            lng_f = float(data.get("lng"))
        except Exception:
            return _response(400, {"error": "lat/lng is required and must be numbers"})
        if not (-90.0 <= lat_f <= 90.0 and -180.0 <= lng_f <= 180.0):
            return _response(400, {"error": "lat/lng out of range"})

        geohash = geohash_encode(lat_f, lng_f, precision=9)
        gh5 = geohash[:5]

        # -------- tags (optional) --------
        tags = data.get("tags") or []
        if not isinstance(tags, list):
            return _response(400, {"error": "tags must be an array of strings"})
        tags = list({str(t).strip() for t in tags if str(t).strip()})

        # -------- image handling --------
        article_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc).isoformat()
        image_key = None

        # Mode A: đã upload trước (presigned)
        if data.get("imageKey"):
            image_key = data["imageKey"].strip()
            try:
                s3.head_object(Bucket=BUCKET_NAME, Key=image_key)
            except Exception:
                return _response(400, {"error": f"imageKey not found in S3: {image_key}"})

        # Mode B: gửi base64/data URL trực tiếp
        elif data.get("image_data_url") or data.get("image_base64"):
            image_data_url = data.get("image_data_url")
            image_b64 = data.get("image_base64")
            if image_data_url:
                header, b64 = image_data_url.split(",", 1)
                mime = header.split(";")[0].split(":", 1)[1]  # e.g. image/png
                ext = {"image/png":"png","image/jpeg":"jpg","image/jpg":"jpg","image/webp":"webp"}.get(mime, "bin")
                raw = base64.b64decode(b64)
                image_key = f"articles/{article_id}.{ext}"
                s3.put_object(Bucket=BUCKET_NAME, Key=image_key, Body=raw, ContentType=mime, ACL="private")
            else:
                image_ext = (data.get("image_extension") or "").lower().strip()
                if image_ext not in ("png","jpg","jpeg","webp"):
                    return _response(400, {"error": "image_extension must be png|jpg|jpeg|webp"})
                raw = base64.b64decode(image_b64)
                mime = {"png":"image/png","jpg":"image/jpeg","jpeg":"image/jpeg","webp":"image/webp"}[image_ext]
                image_key = f"articles/{article_id}.{image_ext}"
                s3.put_object(Bucket=BUCKET_NAME, Key=image_key, Body=raw, ContentType=mime, ACL="private")

        # -------- put item (lat/lng dùng Decimal khi ghi DDB) --------
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
        }
        if image_key:
            item["imageKey"] = image_key
            item["thumbnailKey"] = _thumb_from_image_key(image_key)
        if owner_id:
            item["ownerId"] = owner_id  # KHÔNG set ""

        table.put_item(Item=item)

        # Trả về JSON: chuyển Decimal -> float
        resp = dict(item)
        resp["lat"] = float(resp["lat"])
        resp["lng"] = float(resp["lng"])

        return _response(201, resp)

    except Exception as e:
        return _response(500, {"error": f"internal error: {e}"})
