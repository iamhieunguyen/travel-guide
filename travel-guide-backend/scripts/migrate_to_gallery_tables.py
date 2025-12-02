"""
Migration script to populate Gallery tables from existing ArticlesTable data
Run this once to migrate all existing articles with autoTags
"""
import boto3
import os
from datetime import datetime, timezone

# Configuration
ARTICLES_TABLE = os.environ.get('ARTICLES_TABLE', 'travel-guided-ArticlesTable-L3G1OXLHH7H')
GALLERY_PHOTOS_TABLE = os.environ.get('GALLERY_PHOTOS_TABLE', 'travel-guided-GalleryPhotosTable-I23H4Q7LIHRS')
GALLERY_TRENDS_TABLE = os.environ.get('GALLERY_TRENDS_TABLE', 'travel-guided-GalleryTrendsTable-SJYQCL4PDJ9B')
REGION = os.environ.get('AWS_REGION', 'ap-southeast-1')

dynamodb = boto3.resource('dynamodb', region_name=REGION)
articles_table = dynamodb.Table(ARTICLES_TABLE)
photos_table = dynamodb.Table(GALLERY_PHOTOS_TABLE)
trends_table = dynamodb.Table(GALLERY_TRENDS_TABLE)


def migrate_to_gallery():
    """Migrate existing articles to Gallery tables"""
    print(f"Starting migration from {ARTICLES_TABLE}")
    print(f"  → GalleryPhotos: {GALLERY_PHOTOS_TABLE}")
    print(f"  → GalleryTrends: {GALLERY_TRENDS_TABLE}")
    
    migrated_photos = 0
    skipped_no_tags = 0
    skipped_no_image = 0
    error_count = 0
    
    # Track tag counts for batch update
    tag_counts = {}
    tag_latest_image = {}
    tag_latest_date = {}
    
    # Scan all articles
    scan_kwargs = {}
    
    while True:
        response = articles_table.scan(**scan_kwargs)
        items = response.get('Items', [])
        
        print(f"\nProcessing batch of {len(items)} articles...")
        
        for item in items:
            article_id = item.get('articleId')
            auto_tags = item.get('autoTags', [])
            created_at = item.get('createdAt', '')
            visibility = item.get('visibility', 'public')
            
            # Get image URL
            image_key = None
            if item.get('imageKeys') and len(item['imageKeys']) > 0:
                image_key = item['imageKeys'][0]
            elif item.get('imageKey'):
                image_key = item['imageKey']
            
            # Skip if no tags
            if not auto_tags:
                skipped_no_tags += 1
                continue
            
            # Skip if no image
            if not image_key:
                skipped_no_image += 1
                continue
            
            # Skip private posts
            if visibility == 'private':
                continue
            
            try:
                # 1. Save to GalleryPhotosTable
                photos_table.put_item(Item={
                    'photo_id': article_id,
                    'image_url': image_key,
                    'tags': auto_tags,
                    'status': visibility,
                    'created_at': created_at or datetime.now(timezone.utc).isoformat()
                })
                
                # 2. Aggregate tag counts
                for tag in auto_tags:
                    tag_lower = tag.lower()
                    tag_counts[tag_lower] = tag_counts.get(tag_lower, 0) + 1
                    
                    # Track latest image for each tag
                    if tag_lower not in tag_latest_date or created_at > tag_latest_date[tag_lower]:
                        tag_latest_image[tag_lower] = image_key
                        tag_latest_date[tag_lower] = created_at
                
                print(f"  ✅ Migrated {article_id}: {len(auto_tags)} tags")
                migrated_photos += 1
                
            except Exception as e:
                print(f"  ❌ Error migrating {article_id}: {e}")
                error_count += 1
        
        # Check for more items
        if 'LastEvaluatedKey' not in response:
            break
        scan_kwargs['ExclusiveStartKey'] = response['LastEvaluatedKey']
    
    # 3. Batch update GalleryTrendsTable
    print(f"\nUpdating {len(tag_counts)} tags in GalleryTrendsTable...")
    
    for tag_name, count in tag_counts.items():
        try:
            trends_table.put_item(Item={
                'tag_name': tag_name,
                'count': count,
                'cover_image': tag_latest_image.get(tag_name),
                'last_updated': tag_latest_date.get(tag_name, datetime.now(timezone.utc).isoformat())
            })
            print(f"  ✅ {tag_name}: {count} photos")
        except Exception as e:
            print(f"  ❌ Error updating tag {tag_name}: {e}")
            error_count += 1
    
    # Summary
    print("\n" + "="*60)
    print("MIGRATION SUMMARY")
    print("="*60)
    print(f"✅ Migrated photos:     {migrated_photos}")
    print(f"✅ Unique tags:         {len(tag_counts)}")
    print(f"⏭️  Skipped (no tags):   {skipped_no_tags}")
    print(f"⏭️  Skipped (no image):  {skipped_no_image}")
    print(f"❌ Errors:              {error_count}")
    print(f"📊 Total processed:     {migrated_photos + skipped_no_tags + skipped_no_image}")
    print("="*60)
    
    return migrated_photos, len(tag_counts), error_count


if __name__ == '__main__':
    print("="*60)
    print("GALLERY TABLES MIGRATION")
    print("="*60)
    print(f"Articles Table: {ARTICLES_TABLE}")
    print(f"Gallery Photos: {GALLERY_PHOTOS_TABLE}")
    print(f"Gallery Trends: {GALLERY_TRENDS_TABLE}")
    print(f"Region: {REGION}")
    print("="*60)
    print("\n⚠️  This will:")
    print("  - Copy all articles with autoTags to GalleryPhotosTable")
    print("  - Aggregate tag counts in GalleryTrendsTable")
    print("  - Skip articles without tags or images")
    print("  - Skip private posts")
    
    confirm = input("\nContinue? (yes/no): ")
    
    if confirm.lower() != 'yes':
        print("❌ Migration cancelled.")
        exit(0)
    
    print("\n🚀 Starting migration...\n")
    
    try:
        photos, tags, errors = migrate_to_gallery()
        
        if errors > 0:
            print(f"\n⚠️  Migration completed with {errors} errors.")
            exit(1)
        else:
            print("\n✅ Migration completed successfully!")
            print(f"\n🎉 Gallery is now ready with {photos} photos and {tags} trending tags!")
            exit(0)
            
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
