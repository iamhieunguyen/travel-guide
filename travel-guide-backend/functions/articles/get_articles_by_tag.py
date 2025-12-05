"""
Get photos by tag - Query directly from GalleryPhotosTable
Returns photo data with image_url for display
"""
import os
import json
import boto3
from decimal import Decimal
from cors import ok, error, options

dynamodb = boto3.resource("dynamodb")

GALLERY_PHOTOS_TABLE = os.environ.get("GALLERY_PHOTOS_TABLE", "")
photos_table = dynamodb.Table(GALLERY_PHOTOS_TABLE) if GALLERY_PHOTOS_TABLE else None


def decimal_to_native(obj):
    """Convert Decimal to native Python types"""
    if isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    elif isinstance(obj, dict):
        return {k: decimal_to_native(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [decimal_to_native(i) for i in obj]
    return obj


def lambda_handler(event, context):
    method = event.get("httpMethod") or event.get("requestContext", {}).get("http", {}).get("method")
    if method == "OPTIONS":
        return options()

    try:
        if not photos_table:
            return error(500, "Gallery Photos table not configured")
        
        params = event.get("queryStringParameters") or {}
        tag = (params.get("tag") or "").strip().lower()
        limit = int(params.get("limit", 50))
        
        if not tag:
            return error(400, "tag parameter is required")
        
        print(f"🔍 Searching for photos with tag: {tag}")
        
        matching_photos = []
        seen_keys = set()   # ✅ dùng key hiển thị để dedupe, giống FE
        scan_kwargs = {}
        
        while len(matching_photos) < limit:
            response = photos_table.scan(**scan_kwargs)
            
            for item in response.get("Items", []):
                # NEW: Skip photos with non-approved status
                photo_status = item.get("status", "approved")  # Default to approved for backward compatibility
                if photo_status != "approved":
                    print(f"  ⏭️ Skipping photo with status: {photo_status}")
                    continue
                
                # Lấy tags (ưu tiên tags, fallback autoTags nếu có)
                raw_tags = item.get("tags") or item.get("autoTags") or []
                photo_tags = [t.lower() for t in raw_tags]

                if tag not in photo_tags:
                    continue

                # 🔑 Lấy S3 key dùng để hiển thị ảnh – phải GIỐNG với FE:
                # const key = item.image_url || item.imageKeys?.[0] || item.imageKey;
                display_key = (
                    item.get("image_url")
                    or (item.get("imageKeys") or [None])[0]
                    or item.get("imageKey")
                )

                # Nếu không có key hiển thị thì bỏ qua
                if not display_key:
                    continue

                # ✅ DEDUPE: nếu key này đã xuất hiện rồi thì không thêm nữa
                if display_key in seen_keys:
                    continue
                seen_keys.add(display_key)

                photo = {
                    "photo_id": item.get("photo_id") or item.get("photoId") or display_key,
                    "image_url": display_key,  # trả đúng key FE sẽ dùng
                    "article_id": item.get("article_id") or item.get("articleId"),
                    "tags": raw_tags,
                    "autoTags": item.get("autoTags") or raw_tags,
                    "status": item.get("status", "public"),
                    "created_at": item.get("created_at") or item.get("createdAt"),
                    "createdAt": item.get("createdAt") or item.get("created_at"),
                }

                matching_photos.append(decimal_to_native(photo))
                print(f"  ✅ Added photo {photo['photo_id']} (key={display_key})")

                if len(matching_photos) >= limit:
                    break
            
            if "LastEvaluatedKey" not in response or len(matching_photos) >= limit:
                break

            scan_kwargs["ExclusiveStartKey"] = response["LastEvaluatedKey"]
        
        print(f"📦 Found {len(matching_photos)} UNIQUE photos with tag '{tag}'")
        
        return ok(200, {"items": matching_photos})
        
    except Exception as e:
        print(f"Error getting photos by tag: {e}")
        import traceback
        traceback.print_exc()
        return error(500, f"Internal error: {str(e)}")
