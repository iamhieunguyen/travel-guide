"""
Get trending tags from GalleryTrendsTable
Simple scan and sort by count

Returns tags sorted by popularity (count = number of photos containing each tag)
Example response:
{
  "items": [
    {"tag_name": "Beach", "count": 150, "cover_image": "...", "last_updated": "..."},
    {"tag_name": "Mountain", "count": 89, "cover_image": "...", "last_updated": "..."}
  ],
  "total_tags": 245
}

Note: count represents the number of photos that have this tag, not the number of tags per photo
"""
import os
import json
import boto3
from decimal import Decimal
from cors import ok, error, options

dynamodb = boto3.resource("dynamodb")
GALLERY_TRENDS_TABLE = os.environ.get("GALLERY_TRENDS_TABLE", "")
table = dynamodb.Table(GALLERY_TRENDS_TABLE) if GALLERY_TRENDS_TABLE else None


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
        if not table:
            return error(500, "Gallery Trends table not configured")
        
        params = event.get("queryStringParameters") or {}
        limit = int(params.get("limit", 20))
        
        # Scan all tags
        scan_kwargs = {}
        all_tags = []
        
        while True:
            response = table.scan(**scan_kwargs)
            all_tags.extend(response.get('Items', []))
            
            if 'LastEvaluatedKey' not in response:
                break
            scan_kwargs['ExclusiveStartKey'] = response['LastEvaluatedKey']
        
        # Sort by count (descending)
        all_tags.sort(key=lambda x: x.get('count', 0), reverse=True)
        
        # Get top N
        top_tags = all_tags[:limit]
        
        # Format response
        trending_tags = []
        for tag in top_tags:
            trending_tags.append({
                'tag_name': tag.get('tag_name', '').title(),
                'count': decimal_to_native(tag.get('count', 0)),  # Number of photos with this tag
                'cover_image': tag.get('cover_image'),
                'last_updated': tag.get('last_updated', '')
            })
        
        return ok(200, {
            'items': trending_tags,
            'total_tags': len(all_tags)
        })
        
    except Exception as e:
        print(f"Error getting trending tags: {e}")
        import traceback
        traceback.print_exc()
        return error(500, f"Internal error: {str(e)}")
