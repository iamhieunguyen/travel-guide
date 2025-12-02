"""
Migration script to add ownerId to existing articles
This is critical for Personal Page to work with scope='mine'
"""
import boto3
import os

# Configuration
TABLE_NAME = os.environ.get('TABLE_NAME', 'travel-guided-ArticlesTable-XXXXXXXXX')
REGION = os.environ.get('AWS_REGION', 'ap-southeast-1')

dynamodb = boto3.resource('dynamodb', region_name=REGION)
table = dynamodb.Table(TABLE_NAME)


def migrate_articles():
    """Scan all articles and add ownerId from author field"""
    print(f"Starting ownerId migration for table: {TABLE_NAME}")
    
    updated_count = 0
    skipped_count = 0
    error_count = 0
    no_author_count = 0
    
    # Scan all items
    scan_kwargs = {}
    
    while True:
        response = table.scan(**scan_kwargs)
        items = response.get('Items', [])
        
        print(f"\nProcessing batch of {len(items)} items...")
        
        for item in items:
            article_id = item.get('articleId')
            existing_owner_id = item.get('ownerId')
            author = item.get('author')
            
            # Check if already has ownerId
            if existing_owner_id:
                print(f"  ⏭️  Skipping {article_id} (already has ownerId: {existing_owner_id})")
                skipped_count += 1
                continue
            
            # Check if has author field
            if not author:
                print(f"  ⚠️  Skipping {article_id} (no author field)")
                no_author_count += 1
                continue
            
            try:
                # Update with ownerId = author
                table.update_item(
                    Key={'articleId': article_id},
                    UpdateExpression='SET ownerId = :ownerId',
                    ExpressionAttributeValues={
                        ':ownerId': author
                    }
                )
                
                print(f"  ✅ Updated {article_id}: ownerId = {author}")
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
    print(f"✅ Updated:      {updated_count} articles")
    print(f"⏭️  Skipped:      {skipped_count} articles (already have ownerId)")
    print(f"⚠️  No author:    {no_author_count} articles (missing author)")
    print(f"❌ Errors:       {error_count} articles")
    print(f"📊 Total:        {updated_count + skipped_count + no_author_count + error_count} articles")
    print("="*60)
    
    return updated_count, skipped_count, error_count


if __name__ == '__main__':
    print("="*60)
    print("OWNER ID MIGRATION")
    print("="*60)
    print(f"Table: {TABLE_NAME}")
    print(f"Region: {REGION}")
    print("="*60)
    print("\n⚠️  This will:")
    print("  - Add ownerId field to all articles")
    print("  - Copy value from 'author' field")
    print("  - Required for Personal Page to work")
    
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
