"""
Migration script to add locationName to existing articles using reverse geocoding
Run this once to update all existing articles with location names
"""
import boto3
import os
import urllib.request
import urllib.parse
import json
import time

# Configuration
TABLE_NAME = os.environ.get('TABLE_NAME', 'travel-guided-ArticlesTable-XXXXXXXXX')
REGION = os.environ.get('AWS_REGION', 'ap-southeast-1')

dynamodb = boto3.resource('dynamodb', region_name=REGION)
table = dynamodb.Table(TABLE_NAME)


def reverse_geocode(lat, lng):
    """Get location name from coordinates using Nominatim"""
    try:
        base_url = "https://nominatim.openstreetmap.org/reverse"
        params = {
            "format": "json",
            "lat": str(lat),
            "lon": str(lng),
            "zoom": "14",
            "addressdetails": "1",
            "accept-language": "en",  # English for consistency
        }
        url = f"{base_url}?{urllib.parse.urlencode(params)}"
        
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "travel-guide-migration/1.0 (admin@example.com)",
            },
        )
        
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("display_name")
    except Exception as e:
        print(f"    ⚠️  Geocoding error: {e}")
        return None


def migrate_articles():
    """Scan all articles and add locationName from lat/lng"""
    print(f"Starting migration for table: {TABLE_NAME}")
    
    updated_count = 0
    skipped_count = 0
    error_count = 0
    no_coords_count = 0
    
    # Scan all items
    scan_kwargs = {}
    
    while True:
        response = table.scan(**scan_kwargs)
        items = response.get('Items', [])
        
        print(f"\nProcessing batch of {len(items)} items...")
        
        for item in items:
            article_id = item.get('articleId')
            lat = item.get('lat')
            lng = item.get('lng')
            existing_location = item.get('locationName')
            
            # Check if already has locationName
            if existing_location:
                print(f"  ⏭️  Skipping {article_id} (already has locationName: {existing_location[:50]}...)")
                skipped_count += 1
                continue
            
            # Check if has coordinates
            if not lat or not lng:
                print(f"  ⚠️  Skipping {article_id} (no coordinates)")
                no_coords_count += 1
                continue
            
            try:
                # Get location name from coordinates
                print(f"  🌍 Geocoding {article_id} ({lat}, {lng})...")
                location_name = reverse_geocode(float(lat), float(lng))
                
                if not location_name:
                    print(f"  ⚠️  Could not geocode {article_id}")
                    error_count += 1
                    continue
                
                # Update with locationName
                table.update_item(
                    Key={'articleId': article_id},
                    UpdateExpression='SET locationName = :locationName',
                    ExpressionAttributeValues={
                        ':locationName': location_name
                    }
                )
                
                print(f"  ✅ Updated {article_id}: {location_name[:80]}...")
                updated_count += 1
                
                # Rate limiting for Nominatim (max 1 request per second)
                time.sleep(1.1)
                
            except Exception as e:
                print(f"  ❌ Error updating {article_id}: {e}")
                error_count += 1
        
        # Check if there are more items to scan
        if 'LastEvaluatedKey' not in response:
            break
        
        scan_kwargs['ExclusiveStartKey'] = response['LastEvaluatedKey']
    
    # Summary
    print("\n" + "="*60)
    print("MIGRATION SUMMARY")
    print("="*60)
    print(f"✅ Updated:      {updated_count} articles")
    print(f"⏭️  Skipped:      {skipped_count} articles (already have locationName)")
    print(f"⚠️  No coords:    {no_coords_count} articles (missing lat/lng)")
    print(f"❌ Errors:       {error_count} articles")
    print(f"📊 Total:        {updated_count + skipped_count + no_coords_count + error_count} articles")
    print("="*60)
    
    return updated_count, skipped_count, error_count


if __name__ == '__main__':
    print("="*60)
    print("LOCATION NAME MIGRATION")
    print("="*60)
    print(f"Table: {TABLE_NAME}")
    print(f"Region: {REGION}")
    print("="*60)
    print("\n⚠️  This will:")
    print("  - Fetch location names from Nominatim API")
    print("  - Rate limited to 1 request/second")
    print("  - May take several minutes for many articles")
    
    # Confirm before running
    confirm = input("\nContinue? (yes/no): ")
    
    if confirm.lower() != 'yes':
        print("❌ Migration cancelled.")
        exit(0)
    
    print("\n🚀 Starting migration...\n")
    
    try:
        updated, skipped, errors = migrate_articles()
        
        if errors > 0:
            print(f"\n⚠️  Migration completed with {errors} errors.")
            exit(1)
        else:
            print("\n✅ Migration completed successfully!")
            exit(0)
            
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
