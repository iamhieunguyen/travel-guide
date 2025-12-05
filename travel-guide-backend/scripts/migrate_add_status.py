"""
Migration Script: Add status="approved" to existing articles

This script updates all existing articles in ArticlesTable to have status="approved"
for backward compatibility after deploying the content moderation status feature.

Usage:
    python migrate_add_status.py [--dry-run] [--table-name TABLE_NAME]

Options:
    --dry-run: Preview changes without actually updating
    --table-name: Override table name (default: from environment or prompt)
"""
import os
import sys
import boto3
import argparse
from datetime import datetime, timezone

dynamodb = boto3.resource('dynamodb')


def migrate_articles(table_name, dry_run=False):
    """
    Add status="approved" to all articles that don't have a status field
    
    Args:
        table_name: Name of the ArticlesTable
        dry_run: If True, only print what would be updated
    """
    table = dynamodb.Table(table_name)
    
    print(f"{'='*60}")
    print(f"MIGRATION: Add status field to ArticlesTable")
    print(f"{'='*60}")
    print(f"Table: {table_name}")
    print(f"Dry Run: {dry_run}")
    print(f"Started: {datetime.now(timezone.utc).isoformat()}")
    print(f"{'='*60}\n")
    
    # Scan all articles
    print("📊 Scanning all articles...")
    scan_kwargs = {}
    all_articles = []
    
    while True:
        response = table.scan(**scan_kwargs)
        all_articles.extend(response.get('Items', []))
        
        if 'LastEvaluatedKey' not in response:
            break
        scan_kwargs['ExclusiveStartKey'] = response['LastEvaluatedKey']
    
    print(f"✓ Found {len(all_articles)} total articles\n")
    
    # Filter articles without status
    articles_to_update = []
    for article in all_articles:
        if 'status' not in article:
            articles_to_update.append(article)
    
    print(f"📝 Articles needing status field: {len(articles_to_update)}")
    print(f"✓ Articles already have status: {len(all_articles) - len(articles_to_update)}\n")
    
    if len(articles_to_update) == 0:
        print("✅ No articles need migration. All done!")
        return
    
    if dry_run:
        print("🔍 DRY RUN - Would update the following articles:")
        for i, article in enumerate(articles_to_update[:10], 1):
            article_id = article.get('articleId', 'unknown')
            created_at = article.get('createdAt', 'unknown')
            print(f"  {i}. {article_id} (created: {created_at})")
        
        if len(articles_to_update) > 10:
            print(f"  ... and {len(articles_to_update) - 10} more")
        
        print(f"\n⚠️ This is a DRY RUN. No changes were made.")
        print(f"Run without --dry-run to apply changes.")
        return
    
    # Confirm before proceeding
    print(f"⚠️ About to update {len(articles_to_update)} articles")
    confirm = input("Continue? (yes/no): ").strip().lower()
    
    if confirm != 'yes':
        print("❌ Migration cancelled by user")
        return
    
    # Update articles in batches
    print(f"\n🔄 Updating articles...")
    updated_count = 0
    failed_count = 0
    
    with table.batch_writer() as batch:
        for i, article in enumerate(articles_to_update, 1):
            try:
                article_id = article['articleId']
                
                # Update with status="approved"
                table.update_item(
                    Key={'articleId': article_id},
                    UpdateExpression='SET #status = :status',
                    ExpressionAttributeNames={
                        '#status': 'status'
                    },
                    ExpressionAttributeValues={
                        ':status': 'approved'
                    }
                )
                
                updated_count += 1
                
                if i % 100 == 0:
                    print(f"  Progress: {i}/{len(articles_to_update)} ({updated_count} updated, {failed_count} failed)")
                
            except Exception as e:
                failed_count += 1
                print(f"  ❌ Failed to update {article.get('articleId', 'unknown')}: {e}")
    
    # Summary
    print(f"\n{'='*60}")
    print(f"MIGRATION COMPLETE")
    print(f"{'='*60}")
    print(f"✅ Successfully updated: {updated_count}")
    print(f"❌ Failed: {failed_count}")
    print(f"📊 Total processed: {len(articles_to_update)}")
    print(f"Finished: {datetime.now(timezone.utc).isoformat()}")
    print(f"{'='*60}")


def main():
    parser = argparse.ArgumentParser(description='Migrate ArticlesTable to add status field')
    parser.add_argument('--dry-run', action='store_true', help='Preview changes without updating')
    parser.add_argument('--table-name', type=str, help='DynamoDB table name')
    
    args = parser.parse_args()
    
    # Get table name
    table_name = args.table_name or os.environ.get('TABLE_NAME')
    
    if not table_name:
        print("❌ Error: TABLE_NAME not provided")
        print("Usage: python migrate_add_status.py --table-name YOUR_TABLE_NAME")
        print("   or: export TABLE_NAME=YOUR_TABLE_NAME && python migrate_add_status.py")
        sys.exit(1)
    
    # Run migration
    try:
        migrate_articles(table_name, dry_run=args.dry_run)
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
