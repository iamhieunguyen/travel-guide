"""
Save photo metadata and update trending tags in Gallery tables

This module handles two separate operations:

1. GalleryPhotosTable: Stores individual photo records
   - Each record = 1 photo with its tags
   - Example: Photo A has 5 tags, Photo B has 3 tags
   
2. GalleryTrendsTable: Aggregates tag statistics
   - Each record = 1 tag with count of photos containing it
   - count = number of photos that have this tag
   - Example: Tag 'beach' appears in 150 photos → count=150
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


def save_photo_to_gallery(photo_id, image_url, tags, status='public', article_id=None):
    """Save photo metadata to Gallery_Photos table
    
    Stores individual photo information with all its tags.
    Each photo record contains:
    - photo_id: Unique identifier (S3 key to ensure uniqueness per image)
    - image_url: S3 key to the image
    - article_id: Optional article ID for reference
    - tags: Array of tag names for this specific photo
    - status: Visibility status (public/private)
    - created_at: Timestamp when photo was processed
    
    IMPORTANT: photo_id MUST be unique per image to avoid overwriting.
    Use S3 key as photo_id: 'articles/abc123_img1.jpg'
    
    Example:
        Photo A: photo_id='articles/abc123_img1.jpg', tags=['beach', 'sunset'] (2 tags)
        Photo B: photo_id='articles/abc123_img2.jpg', tags=['mountain', 'forest'] (2 tags)
        → Both photos saved separately (no overwrite)
    """
    if not photos_table:
        print("Gallery Photos table not configured")
        return False
    
    try:
        item = {
            'photo_id': photo_id,  # Unique S3 key
            'image_url': image_url,
            'tags': tags,  # Array of tag names for THIS photo
            'status': status,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        
        # Add article_id if provided (for reference/grouping)
        if article_id:
            item['article_id'] = article_id
        
        photos_table.put_item(Item=item)
        print(f"✓ Saved photo {photo_id} to Gallery_Photos with {len(tags)} tags")
        return True
        
    except Exception as e:
        print(f"Failed to save photo to gallery: {e}")
        return False


def update_trending_tags(tags, image_url):
    """Update tag counts in Gallery_Trends table (atomic increment)
    
    For each tag in the photo:
    - Increment count by 1 (count = number of photos containing this tag)
    - Update cover_image to latest photo with this tag
    - Update last_updated timestamp
    
    Example:
        Photo 1 has tags ['beach', 'sunset'] → beach.count=1, sunset.count=1
        Photo 2 has tags ['beach', 'ocean'] → beach.count=2, ocean.count=1
        Photo 3 has tags ['beach', 'party'] → beach.count=3, party.count=1
    
    Result: Tag 'beach' has count=3 (3 photos contain this tag)
    """
    if not trends_table:
        print("Gallery Trends table not configured")
        return False
    
    try:
        for tag in tags:
            tag_lower = tag.lower()
            
            # Atomic increment count and update cover_image
            # count = number of photos that have this tag
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
