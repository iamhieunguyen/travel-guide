"""
Save photo metadata and update trending tags in Gallery tables
"""
import os
import boto3
from datetime import datetime, timezone

dynamodb = boto3.resource('dynamodb')

GALLERY_PHOTOS_TABLE = os.environ.get('GALLERY_PHOTOS_TABLE', '')
GALLERY_TRENDS_TABLE = os.environ.get('GALLERY_TRENDS_TABLE', '')

photos_table = dynamodb.Table(GALLERY_PHOTOS_TABLE) if GALLERY_PHOTOS_TABLE else None
trends_table = dynamodb.Table(GALLERY_TRENDS_TABLE) if GALLERY_TRENDS_TABLE else None


def save_photo_to_gallery(photo_id, image_url, tags, status='public'):
    if not photos_table:
        return False
    try:
        photos_table.put_item(Item={
            'photo_id': photo_id,
            'image_url': image_url,
            'tags': tags,
            'status': status,
            'created_at': datetime.now(timezone.utc).isoformat()
        })
        return True
    except Exception:
        return False


def update_trending_tags(tags, image_url):
    if not trends_table:
        return False
    try:
        for tag in tags:
            trends_table.update_item(
                Key={'tag_name': tag.lower()},
                UpdateExpression='ADD #count :inc SET cover_image = if_not_exists(cover_image, :img), last_updated = :ts',
                ExpressionAttributeNames={'#count': 'count'},
                ExpressionAttributeValues={
                    ':inc': 1,
                    ':img': image_url,
                    ':ts': datetime.now(timezone.utc).isoformat()
                }
            )
        return True
    except Exception:
        return False
