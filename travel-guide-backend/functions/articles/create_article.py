import os, json, uuid, base64
import boto3
from datetime import datetime, timezone
from decimal import Decimal
import requests
from jose import jwt

s3 = boto3.client("s3")
dynamodb = boto3.resource("dynamodb")

TABLE_NAME = os.environ["TABLE_NAME"]
BUCKET_NAME = os.environ["BUCKET_NAME"]
USER_POOL_ID = os.environ["USER_POOL_ID"]
CLIENT_ID = os.environ["CLIENT_ID"]
AWS_REGION = os.environ["AWS_REGION"]

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

def _get_user_id_from_jwt(token):
    """Lấy username từ JWT token (cách frontend đang dùng)"""
    try:
        keys_url = f'https://cognito-idp.{AWS_REGION}.amazonaws.com/{USER_POOL_ID}/.well-known/jwks.json'
        response = requests.get(keys_url)
        keys = response.json()['keys']

        headers = jwt.get_unverified_headers(token)
        kid = headers['kid']

        key = None
        for k in keys:
            if k['kid'] == kid:
                key = k
                break

        if not key:
            return None

        user_info = jwt.decode(
            token,
            key,
            algorithms=['RS256'],
            audience=CLIENT_ID,
            options={"verify_exp": True, "verify_aud": True}
        )

        return user_info.get('cognito:username') or user_info.get('username')
    except Exception as e:
        print(f"JWT verification error: {e}")
        return None

def _get_user_id(event):
    """Hỗ trợ cả X-User-Id header và JWT token"""
    headers = event.get("headers") or {}

    # 1. Thử X-User-Id header
    x_user_id = headers.get("X-User-Id") or headers.get("x-user-id")
    if x_user_id:
        return x_user_id

    # 2. Thử Authorization header (JWT)
    auth_header = headers.get("Authorization") or headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.replace("Bearer ", "")
        return _get_user_id_from_jwt(token)

    return None

def _thumb_from_image_key(image_key: str) -> str:
    base = os.path.basename(image_key)
    stem = os.path.splitext(base)[0]
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

        owner_id = _get_user_id(event)
        if not owner_id:
            return _response(401, {"error": "X-User-Id or Authorization header is required"})

        # -------- geo: lat/lng bắt buộc --------
        try:
            lat_f = float(data.get("lat"))
            lng_f = float(data.get("lng"))
        except Exception:
            return _response(400, {"error": "lat/lng is required and must be numbers"})
        if not (-90.0 <= lat_f <= 90.0 and -180.0 <= lng_f <= 180.0):
            return _response(400, {"error": "lat/lng out of range"})

        # Sử dụng geohash_encode nếu bạn có, nếu không thì tạo thủ công
        # geohash = geohash_encode(lat_f, lng_f, precision=9)
        # gh5 = geohash[:5]
        # Dành cho ví dụ, ta dùng lat/lng làm partition key đơn giản
        geohash = f"{lat_f:.6f},{lng_f:.6f}"
        gh5 = geohash[:13] # Ví dụ, không chính xác như geohash thật

        # -------- tags (optional) --------
        tags = data.get("tags") or []
        if not isinstance(tags, list):
            return _response(400, {"error": "tags must be an array of strings"})
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
                return _response(400, {"error": f"imageKey not found in S3: {image_key}"})

        # Mode B: gửi base64/data URL trực tiếp (frontend có thể gửi khi upload trực tiếp)
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
        }
        if image_key:
            item["imageKey"] = image_key
            item["thumbnailKey"] = _thumb_from_image_key(image_key)
        if owner_id:
            item["ownerId"] = owner_id

        table.put_item(Item=item)

        # Trả về JSON: chuyển Decimal -> float
        resp = dict(item)
        resp["lat"] = float(resp["lat"])
        resp["lng"] = float(resp["lng"])

        return _response(201, resp)

    except Exception as e:
        print(f"Error in create_article: {e}")
        return _response(500, {"error": f"internal error: {e}"})