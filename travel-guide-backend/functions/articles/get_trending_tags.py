"""
Get trending tags from all articles
Aggregates autoTags from Rekognition analysis
"""
import os
import json
import boto3
from decimal import Decimal
from collections import Counter
from cors import ok, error, options

dynamodb = boto3.resource("dynamodb")
TABLE_NAME = os.environ["TABLE_NAME"]
table = dynamodb.Table(TABLE_NAME)


def lambda_handler(event, context):
    method = event.get("httpMethod") or event.get("requestContext", {}).get("http", {}).get("method")
    if method == "OPTIONS":
        return options()

    try:
        params = event.get("queryStringParameters") or {}
        limit = int(params.get("limit", 20))  # Top 20 trending tags
        
        # Scan all public articles to get autoTags
        scan_kwargs = {
            'FilterExpression': 'visibility = :visibility',
            'ExpressionAttributeValues': {
                ':visibility': 'public'
            }
        }
        
        tag_counter = Counter()
        tag_images = {}  # Store latest image for each tag
        tag_counts_detail = {}  # Store count and latest createdAt
        
        while True:
            response = table.scan(**scan_kwargs)
            items = response.get('Items', [])
            
            for item in items:
                auto_tags = item.get('autoTags', [])
                created_at = item.get('createdAt', '')
                
                # Get image URL
                image_key = None
                if item.get('imageKeys') and len(item['imageKeys']) > 0:
                    image_key = item['imageKeys'][0]
                elif item.get('imageKey'):
                    image_key = item['imageKey']
                
                # Count tags and track latest image
                for tag in auto_tags:
                    tag_lower = tag.lower()
                    tag_counter[tag_lower] += 1
                    
                    # Update image if this is newer
                    if tag_lower not in tag_counts_detail or created_at > tag_counts_detail[tag_lower]['latest_date']:
                        tag_counts_detail[tag_lower] = {
                            'count': tag_counter[tag_lower],
                            'latest_date': created_at,
                            'cover_image': image_key
                        }
            
            # Check for more items
            if 'LastEvaluatedKey' not in response:
                break
            scan_kwargs['ExclusiveStartKey'] = response['LastEvaluatedKey']
        
        # Get top N tags
        top_tags = tag_counter.most_common(limit)
        
        # Format response
        trending_tags = []
        for tag_name, count in top_tags:
            detail = tag_counts_detail.get(tag_name, {})
            trending_tags.append({
                'tag_name': tag_name.title(),  # Capitalize first letter
                'count': count,
                'cover_image': detail.get('cover_image'),
                'last_updated': detail.get('latest_date')
            })
        
        return ok(200, {
            'items': trending_tags,
            'total_tags': len(tag_counter)
        })
        
    except Exception as e:
        print(f"Error getting trending tags: {e}")
        import traceback
        traceback.print_exc()
        return error(500, f"Internal error: {str(e)}")
