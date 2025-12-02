"""
Migration script to add titleLower and contentLower fields to existing articles
Run this once to update all existing articles for case-insensitive search
"""
import boto3
import os
from decimal import Decimal

# Configuration
TABLE_NAME = os.environ.get('TABLE_NAME', 'travel-guided-ArticlesTable-XXXXXXXXX')
REGION = os.environ.get('AWS_REGION', 'ap-southeast-1')

dynamodb = boto3.resource('dynamodb', region_name=REGION)
table = dynamodb.Table(TABLE_NAME)


def migrate_articles():
    """Scan all articles and add lowercase fields"""
    print(f"Starting migration for table: {TABLE_NAME}")
    
    updated_count = 0
    skipped_count = 0
    error_count = 0
    
    # Scan all items
    scan_kwargs = {}
    
    while True:
        response = table.scan(**scan_kwargs)
        items = response.get('Items', [])
        
        print(f"\nProcessing batch of {len(items)} items...")
        
        for item in items:
            article_id = item.get('articleId')
            title = item.get('title', '')
            content = item.get('content', '')
            
            # Check if already has lowercase fields
            if 'titleLower' in item and 'contentLower' in item:
                print(f"  ⏭️  Skipping {article_id} (already has lowercase fields)")
                skipped_count += 1
                continue
            
            try:
                # Update with lowercase fields
                update_expression = "SET titleLower = :titleLower, contentLower = :contentLower"
                expression_values = {
                    ':titleLower': title.lower() if title else '',
                    ':contentLower': content.lower() if content else ''
                }
                
                table.update_item(
                    Key={'articleId': article_id},
                    UpdateExpression=update_expression,
                    ExpressionAttributeValues=expression_values
                )
                
                print(f"  ✅ Updated {article_id}: '{title[:50]}...'")
                updated_count += 1
                
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
    print(f"✅ Updated:  {updated_count} articles")
    print(f"⏭️  Skipped:  {skipped_count} articles (already migrated)")
    print(f"❌ Errors:   {error_count} articles")
    print(f"📊 Total:    {updated_count + skipped_count + error_count} articles")
    print("="*60)
    
    return updated_count, skipped_count, error_count


if __name__ == '__main__':
    print("="*60)
    print("LOWERCASE FIELDS MIGRATION")
    print("="*60)
    print(f"Table: {TABLE_NAME}")
    print(f"Region: {REGION}")
    print("="*60)
    
    # Confirm before running
    confirm = input("\n⚠️  This will update ALL articles. Continue? (yes/no): ")
    
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
