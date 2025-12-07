"""
Backfill Lambda: Rebuild GalleryTrendsTable from GalleryPhotosTable

This function scans all photos in GalleryPhotosTable and recalculates
the tag counts in GalleryTrendsTable.

Purpose:
- Fix data inconsistencies between the two tables
- Rebuild trending tags from source of truth (GalleryPhotosTable)
- Can be run manually or scheduled

Process:
1. Clear existing GalleryTrendsTable (optional, controlled by parameter)
2. Scan all photos from GalleryPhotosTable
3. Count tags across all photos
4. Write aggregated counts to GalleryTrendsTable

Usage:
- Manual invoke from AWS Console
- Can pass event parameter: {"clear_existing": true/false}
"""
import os
import boto3
from collections import defaultdict
from datetime import datetime, timezone
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')

GALLERY_PHOTOS_TABLE = os.environ.get('GALLERY_PHOTOS_TABLE', '')
GALLERY_TRENDS_TABLE = os.environ.get('GALLERY_TRENDS_TABLE', '')

photos_table = dynamodb.Table(GALLERY_PHOTOS_TABLE) if GALLERY_PHOTOS_TABLE else None
trends_table = dynamodb.Table(GALLERY_TRENDS_TABLE) if GALLERY_TRENDS_TABLE else None


def clear_trends_table():
    """Clear all items from GalleryTrendsTable"""
    if not trends_table:
        print("Trends table not configured")
        return False
    
    try:
        print("Clearing existing trends data...")
        
        # Scan all items
        response = trends_table.scan()
        items = response.get('Items', [])
        
        # Handle pagination
        while 'LastEvaluatedKey' in response:
            response = trends_table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            items.extend(response.get('Items', []))
        
        # Delete all items
        with trends_table.batch_writer() as batch:
            for item in items:
                batch.delete_item(Key={'tag_name': item['tag_name']})
        
        print(f"✓ Cleared {len(items)} existing trend records")
        return True
        
    except Exception as e:
        print(f"Failed to clear trends table: {e}")
        return False


def scan_all_photos():
    """Scan all photos from GalleryPhotosTable"""
    if not photos_table:
        print("Photos table not configured")
        return []
    
    try:
        print("Scanning all photos from GalleryPhotosTable...")
        
        all_photos = []
        response = photos_table.scan()
        all_photos.extend(response.get('Items', []))
        
        # Handle pagination
        while 'LastEvaluatedKey' in response:
            response = photos_table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            all_photos.extend(response.get('Items', []))
        
        print(f"✓ Found {len(all_photos)} photos")
        return all_photos
        
    except Exception as e:
        print(f"Failed to scan photos: {e}")
        return []


def get_display_key(photo):
    """
    Get the display key for a photo, matching frontend logic:
    image_url || imageKeys[0] || imageKey
    """
    # Priority 1: image_url
    if photo.get('image_url'):
        return photo['image_url']
    
    # Priority 2: imageKeys[0]
    image_keys = photo.get('imageKeys', [])
    if image_keys and len(image_keys) > 0:
        return image_keys[0]
    
    # Priority 3: imageKey
    if photo.get('imageKey'):
        return photo['imageKey']
    
    return None


def aggregate_tag_counts(photos):
    """
    Aggregate tag counts from all photos
    COUNT UNIQUE DISPLAY_KEY (not records) to avoid duplicates
    Uses same logic as frontend: image_url || imageKeys[0] || imageKey
    
    Returns:
        dict: {
            'tag_name': {
                'count': int (number of unique images),
                'cover_image': str (latest image with this tag),
                'last_updated': str
            }
        }
    """
    tag_data = defaultdict(lambda: {
        'display_keys': set(),  # Track unique display keys
        'cover_image': None,
        'last_updated': None
    })
    
    print("\nAggregating tag counts (counting unique display keys)...")
    
    for photo in photos:
        tags = photo.get('tags', [])
        display_key = get_display_key(photo)
        created_at = photo.get('created_at', '')
        
        # Skip if no display key
        if not display_key:
            continue
        
        for tag in tags:
            tag_lower = tag.lower()
            
            # Add to unique display key set
            tag_data[tag_lower]['display_keys'].add(display_key)
            
            # Use the latest photo as cover image
            if not tag_data[tag_lower]['last_updated'] or created_at > tag_data[tag_lower]['last_updated']:
                tag_data[tag_lower]['cover_image'] = display_key
                tag_data[tag_lower]['last_updated'] = created_at
    
    # Convert to final format with count of unique images
    result = {}
    for tag, data in tag_data.items():
        result[tag] = {
            'count': len(data['display_keys']),  # Count unique display keys only
            'cover_image': data['cover_image'],
            'last_updated': data['last_updated']
        }
    
    print(f"✓ Aggregated {len(result)} unique tags")
    
    # Print top 10 tags
    sorted_tags = sorted(result.items(), key=lambda x: x[1]['count'], reverse=True)
    print("\nTop 10 tags (by unique image count):")
    for i, (tag, data) in enumerate(sorted_tags[:10], 1):
        print(f"  {i}. {tag}: {data['count']} unique photos")
    
    return result


def write_trends_to_table(tag_data):
    """Write aggregated tag data to GalleryTrendsTable"""
    if not trends_table:
        print("Trends table not configured")
        return False
    
    try:
        print(f"\nWriting {len(tag_data)} tags to GalleryTrendsTable...")
        
        timestamp = datetime.now(timezone.utc).isoformat()
        
        # Batch write for efficiency
        with trends_table.batch_writer() as batch:
            for tag_name, data in tag_data.items():
                item = {
                    'tag_name': tag_name,
                    'count': data['count'],
                    'cover_image': data['cover_image'] or '',
                    'last_updated': timestamp
                }
                batch.put_item(Item=item)
        
        print(f"✓ Successfully wrote {len(tag_data)} trend records")
        return True
        
    except Exception as e:
        print(f"Failed to write trends: {e}")
        import traceback
        traceback.print_exc()
        return False


def lambda_handler(event, context):
    """
    Lambda handler for backfilling GalleryTrendsTable
    
    Event parameters:
        - clear_existing (bool): Whether to clear existing trends before backfill
          Default: True (recommended for full rebuild)
    
    Returns:
        dict: Summary of backfill operation
    """
    print("="*60)
    print("GALLERY TRENDS BACKFILL")
    print("="*60)
    
    # Check if tables are configured
    if not photos_table or not trends_table:
        error_msg = "Tables not configured properly"
        print(f"ERROR: {error_msg}")
        return {
            'statusCode': 500,
            'body': {
                'success': False,
                'error': error_msg
            }
        }
    
    # Get parameters
    clear_existing = event.get('clear_existing', True)
    
    print(f"Configuration:")
    print(f"  - Photos Table: {GALLERY_PHOTOS_TABLE}")
    print(f"  - Trends Table: {GALLERY_TRENDS_TABLE}")
    print(f"  - Clear Existing: {clear_existing}")
    print()
    
    results = {
        'success': False,
        'photos_scanned': 0,
        'tags_aggregated': 0,
        'trends_written': 0,
        'cleared_records': 0,
        'errors': []
    }
    
    try:
        # Step 1: Clear existing trends (if requested)
        if clear_existing:
            if not clear_trends_table():
                results['errors'].append("Failed to clear existing trends")
                # Continue anyway
        
        # Step 2: Scan all photos
        photos = scan_all_photos()
        results['photos_scanned'] = len(photos)
        
        if not photos:
            error_msg = "No photos found in GalleryPhotosTable"
            print(f"WARNING: {error_msg}")
            results['errors'].append(error_msg)
            return {
                'statusCode': 200,
                'body': results
            }
        
        # Step 3: Aggregate tag counts
        tag_data = aggregate_tag_counts(photos)
        results['tags_aggregated'] = len(tag_data)
        
        if not tag_data:
            error_msg = "No tags found in photos"
            print(f"WARNING: {error_msg}")
            results['errors'].append(error_msg)
            return {
                'statusCode': 200,
                'body': results
            }
        
        # Step 4: Write to trends table
        if write_trends_to_table(tag_data):
            results['trends_written'] = len(tag_data)
            results['success'] = True
        else:
            results['errors'].append("Failed to write trends to table")
        
    except Exception as e:
        error_msg = f"Backfill failed: {str(e)}"
        print(f"ERROR: {error_msg}")
        import traceback
        traceback.print_exc()
        results['errors'].append(error_msg)
    
    # Summary
    print("\n" + "="*60)
    print("BACKFILL SUMMARY")
    print("="*60)
    print(f"Success: {results['success']}")
    print(f"Photos Scanned: {results['photos_scanned']}")
    print(f"Tags Aggregated: {results['tags_aggregated']}")
    print(f"Trends Written: {results['trends_written']}")
    if results['errors']:
        print(f"Errors: {len(results['errors'])}")
        for error in results['errors']:
            print(f"  - {error}")
    print("="*60)
    
    return {
        'statusCode': 200 if results['success'] else 500,
        'body': results
    }
