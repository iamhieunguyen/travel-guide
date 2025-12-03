"""
Save photo metadata and update trending tags in Gallery tables
"""
import os
import boto3
from decimal import Decimal
from datetime import datetime, timezone

dynamodb = boto3.resource('dynamodb')

GALLERY_PHOTOS_TABLE = os.environ.get('GALLERY_PHOTOS_TABLE', '')
GALLERY_TRENDS_TABLE = os.environ.get('GALLERY_TRENDS_TABLE', '')

photos_table = dynamodb.Table(GALLERY_PHOTOS_TABLE) if GALLERY_PHOTOS_TABLE else None
trends_table = dynamodb.Table(GALLERY_TRENDS_TABLE) if GALLERY_TRENDS_TABLE else None


def save_photo_to_gallery(photo_id, image_url, tags, status='public'):
    """Save photo metadata to Gallery_Photos table"""
    if not photos_table:
        print("Gallery Photos table not configured")
        return False
    
    try:
        item = {
            'photo_id': photo_id,
            'image_url': image_url,
            'tags': tags,
            'status': status,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        
        photos_table.put_item(Item=item)
        print(f"✓ Saved photo {photo_id} to Gallery_Photos with {len(tags)} tags")
        return True
        
    except Exception as e:
        print(f"Failed to save photo to gallery: {e}")
        return False


def update_trending_tags(tags, image_url):
    """Update tag counts in Gallery_Trends table (atomic increment)"""
    if not trends_table:
        print("Gallery Trends table not configured")
        return False
    
    try:
        for tag in tags:
            tag_lower = tag.lower()
            
            # Atomic increment count and update cover_image
            trends_table.update_item(
                Key={'tag_name': tag_lower},
                UpdateExpression='ADD #count :inc SET cover_image = :img, last_updated = :timestamp',
                ExpressionAttributeNames={
                    '#count': 'count'
                },
                ExpressionAttributeValues={
                    ':inc': 1,
                    ':img': image_url,
                    ':timestamp': datetime.now(timezone.utc).isoformat()
                }
            )
            
            print(f"✓ Updated trending tag: {tag_lower}")
        
        return True
        
    except Exception as e:
        print(f"Failed to update trending tags: {e}")
        return False
