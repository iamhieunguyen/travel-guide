import os
import json
import uuid
import base64
from datetime import datetime, timezone
from decimal import Decimal
import boto3
import urllib.request
import urllib.parse
from cors import options, ok, error  # Giả định các hàm này đã được định nghĩa trong file cors.py

# Clients
s3 = boto3.client("s3")
dynamodb = boto3.resource("dynamodb")

# Hằng số
MAX_IMAGES = 4  # Giới hạn số lượng ảnh tối đa
TABLE_NAME = os.environ["TABLE_NAME"]
BUCKET_NAME = os.environ["BUCKET_NAME"]
table = dynamodb.Table(TABLE_NAME)


def _thumb_from_image_key(image_key: str) -> str:
    """Tạo thumbnailKey từ imageKey."""
    base = os.path.basename(image_key)
    stem = os.path.splitext(base)[0]
    return f"thumbnails/{stem}_256.webp"


def _reverse_geocode(lat: float, lng: float) -> str | None:
    """
    Gọi Nominatim để lấy locationName (display_name) từ lat/lng.
    Làm ở BE để tránh CORS và dễ kiểm soát.
    """
    try:
        base_url = "https://nominatim.openstreetmap.org/reverse"
        params = {
            "format": "json",
            "lat": str(lat),
            "lon": str(lng),
            "zoom": "14",
            "addressdetails": "1",
            "accept-language": "vi",  # ưu tiên tiếng Việt
        }
        url = f"{base_url}?{urllib.parse.urlencode(params)}"

        req = urllib.request.Request(
            url,
            headers={
                # ⚠️ BẮT BUỘC: Thay email thật của bạn cho đúng policy của Nominatim
                "User-Agent": "travel-guide-app/1.0 (chaukiet2704@gmail.com)"
            },
        )

        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("display_name")
    except Exception as e:
        print(f"reverse_geocode error for ({lat}, {lng}): {e}")
        return None


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
            return error(401, "Unauthorized: Missing sub in token")

        # Lấy username hiển thị từ token
        display_name = (
            claims.get("cognito:username")
            or claims.get("preferred_username")
            or claims.get("email")
            or ""
        ).strip()

        # Parse body
        body_str = event.get("body") or ""
        if event.get("isBase64Encoded"):
            body_str = base64.b64decode(body_str).decode("utf-8", errors="ignore")
        data = json.loads(body_str or "{}")

        # Validate required fields
        title = (data.get("title") or "").strip()
        content = (data.get("content") or "").strip()
        if not title or not content:
            return error(400, "title and content are required")

        # Validate geo
        try:
            lat_f = float(data["lat"])
            lng_f = float(data["lng"])
            if not (-90 <= lat_f <= 90 and -180 <= lng_f <= 180):
                raise ValueError("Invalid coordinates")
        except (KeyError, ValueError, TypeError):
            return error(400, "valid lat/lng required")

        # Visibility
        visibility = (data.get("visibility") or "public").lower()
        if visibility not in ("public", "private"):
            return error(400, "visibility must be public or private")

        # Tags
        tags = data.get("tags") or []
        if not isinstance(tags, list):
            return error(400, "tags must be an array")
        tags = list({str(t).strip() for t in tags if str(t).strip()})

        # Location name (không bắt buộc) – ưu tiên FE, nếu không có thì BE tự sinh
        location_name = (data.get("locationName") or "").strip()
        if not location_name:
            auto_loc = _reverse_geocode(lat_f, lng_f)
            if auto_loc:
                location_name = auto_loc.strip()

        # Article ID & time
        article_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc).isoformat()

        # Logic Xử lý và Validate Multiple Images
        raw_image_keys = data.get("imageKeys") or []

        # Xử lý trường hợp FE cũ chỉ gửi imageKey (string)
        if not raw_image_keys and data.get("imageKey"):
            raw_image_keys = [data["imageKey"]]

        # Validate kiểu dữ liệu
        if not isinstance(raw_image_keys, list):
            return error(400, "imageKeys must be an array")

        # Giới hạn số lượng ảnh
        if len(raw_image_keys) > MAX_IMAGES:
            return error(400, f"Maximum {MAX_IMAGES} images allowed per article")

        # Validate từng key có tồn tại trong S3
        valid_image_keys = []
        for key in raw_image_keys:
            key_str = str(key).strip()
            if not key_str:
                continue

            try:
                # Kiểm tra sự tồn tại trong S3 (head_object)
                s3.head_object(Bucket=BUCKET_NAME, Key=key_str)
                valid_image_keys.append(key_str)
            except s3.exceptions.ClientError as e:
                # Chỉ coi là lỗi 404 là lỗi không tìm thấy object
                if e.response["Error"]["Code"] == "404":
                    return error(400, f"imageKey not found in S3: {key_str}")
                # Xử lý các lỗi S3 khác
                return error(400, f"S3 error for key {key_str}: {str(e)}")
            except Exception as e:
                return error(400, f"S3 error for key {key_str}: {str(e)}")

        # Xác định ảnh cover và thumbnail từ ảnh đầu tiên
        cover_image_key = None
        thumbnail_key = None

        if valid_image_keys:
            cover_image_key = valid_image_keys[0]  # Ảnh cover là ảnh đầu tiên
            thumbnail_key = _thumb_from_image_key(cover_image_key)  # Tạo thumbnailKey từ ảnh cover

        # Build item
        item = {
            "articleId": article_id,
            "ownerId": owner_id,  # sub từ Cognito để check quyền
            "title": title,
            "titleLower": title.lower(),  # For case-insensitive search
            "content": content,
            "contentLower": content.lower(),  # For case-insensitive search
            "createdAt": created_at,
            "visibility": visibility,
            # Chuyển float sang Decimal cho DynamoDB
            "lat": Decimal(str(lat_f)),
            "lng": Decimal(str(lng_f)),
            "geohash": f"{lat_f:.6f},{lng_f:.6f}",
            "gh5": f"{lat_f:.2f},{lng_f:.2f}",
            "tags": tags,
            "favoriteCount": 0,  # Khởi tạo counter
        }

        # Thêm các fields liên quan đến ảnh vào item DynamoDB
        if valid_image_keys:
            item["imageKeys"] = valid_image_keys  # Mảng tất cả các key ảnh
            item["imageKey"] = cover_image_key  # Ảnh cover (ảnh đầu tiên)
            item["thumbnailKey"] = thumbnail_key  # Thumbnail từ ảnh cover

        # Lưu locationName + locationNameLower nếu có
        if location_name:
            item["locationName"] = location_name
            item["locationNameLower"] = location_name.lower()

        if display_name:
            item["username"] = display_name

        # Rate limiting: Check last post time
        # Query user's last post to prevent spam
        try:
            last_posts = table.query(
                IndexName='gsi_owner_createdAt',
                KeyConditionExpression='ownerId = :owner_id',
                ExpressionAttributeValues={':owner_id': owner_id},
                ScanIndexForward=False,  # Most recent first
                Limit=1
            )
            
            if last_posts.get('Items'):
                last_post = last_posts['Items'][0]
                last_created = datetime.fromisoformat(last_post['createdAt'])
                now = datetime.now(timezone.utc)
                time_diff = (now - last_created).total_seconds()
                
                # Rate limit: 30 seconds between posts
                RATE_LIMIT_SECONDS = 30
                if time_diff < RATE_LIMIT_SECONDS:
                    wait_time = int(RATE_LIMIT_SECONDS - time_diff)
                    return error(429, f"Vui lòng đợi {wait_time}s trước khi đăng bài tiếp")
        except Exception as e:
            print(f"Rate limit check error (non-critical): {e}")
            # Continue anyway if rate limit check fails
        
        # Lưu vào DynamoDB
        table.put_item(Item=item)

        # Chuẩn bị response (chuyển Decimal → float/int)
        resp = {}
        for k, v in item.items():
            if isinstance(v, Decimal):
                # Chuyển Decimal sang float hoặc int
                resp[k] = int(v) if v % 1 == 0 else float(v)
            else:
                resp[k] = v

        print(f"Article created: {article_id} by user {owner_id}")
        return ok(201, resp)

    except Exception as e:
        print(f"Create error: {e}")
        # Trả về lỗi 500 nếu là lỗi server không lường trước
        return error(500, "Internal server error")
