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
        
        # Scan GalleryPhotosTable to find photos with this tag
        matching_photos = []
        scan_kwargs = {}
        
        while len(matching_photos) < limit:
            response = photos_table.scan(**scan_kwargs)
            
            for item in response.get('Items', []):
                photo_tags = [t.lower() for t in (item.get('tags') or [])]
                if tag in photo_tags:
                    # Build photo object with image_url for frontend
                    photo = {
                        'photo_id': item.get('photo_id'),
                        'image_url': item.get('image_url'),  # S3 key
                        'tags': item.get('tags', []),
                        'autoTags': item.get('tags', []),  # Alias for frontend compatibility
                        'status': item.get('status', 'public'),
                        'created_at': item.get('created_at'),
                        'createdAt': item.get('created_at'),  # Alias for frontend
                    }
                    matching_photos.append(decimal_to_native(photo))
                    print(f"  ✅ Found photo: {item.get('photo_id')[:30]}... with image: {item.get('image_url', 'N/A')[:50]}...")
            
            if 'LastEvaluatedKey' not in response:
                break
            scan_kwargs['ExclusiveStartKey'] = response['LastEvaluatedKey']
        
        print(f"📦 Found {len(matching_photos)} photos with tag '{tag}'")
        
        return ok(200, {'items': matching_photos[:limit]})
        
    except Exception as e:
        print(f"Error getting photos by tag: {e}")
        import traceback
        traceback.print_exc()
        return error(500, f"Internal error: {str(e)}")
