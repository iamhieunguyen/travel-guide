"""
Cleanup script to delete invalid articles (no author, no title, no content)
These are usually test data or incomplete uploads
"""
import boto3
import os

TABLE_NAME = os.environ.get('TABLE_NAME', 'travel-guided-ArticlesTable-XXXXXXXXX')
REGION = os.environ.get('AWS_REGION', 'ap-southeast-1')

dynamodb = boto3.resource('dynamodb', region_name=REGION)
table = dynamodb.Table(TABLE_NAME)

def cleanup_invalid_articles():
    """Delete articles without author, title, or content"""
    print(f"Scanning for invalid articles in: {TABLE_NAME}")
    
    deleted_count = 0
    valid_count = 0
    
    scan_kwargs = {}
    
    while True:
        response = table.scan(**scan_kwargs)
        items = response.get('Items', [])
        
        for item in items:
            article_id = item.get('articleId')
            author = item.get('author')
            owner_id = item.get('ownerId')
            title = item.get('title')
            content = item.get('content')
            
            # Check if article is valid (has author/ownerId AND title)
            has_owner = author or owner_id
            has_content = title or content
            
            if not has_owner or not has_content:
                print(f"  🗑️  Deleting invalid article: {article_id}")
                print(f"      - has_owner: {has_owner}, has_content: {has_content}")
                
                try:
                    table.delete_item(Key={'articleId': article_id})
                    deleted_count += 1
                except Exception as e:
                    print(f"      ❌ Error deleting: {e}")
            else:
                valid_count += 1
        
        if 'LastEvaluatedKey' not in response:
            break
        
        scan_kwargs['ExclusiveStartKey'] = response['LastEvaluatedKey']
    
    print("\n" + "="*60)
    print("CLEANUP SUMMARY")
    print("="*60)
    print(f"🗑️  Deleted:  {deleted_count} invalid articles")
    print(f"✅ Valid:    {valid_count} articles")
    print(f"📊 Total:    {deleted_count + valid_count} articles")
    print("="*60)
    
    return deleted_count

if __name__ == '__main__':
    print("="*60)
    print("CLEANUP INVALID ARTICLES")
    print("="*60)
    print(f"Table: {TABLE_NAME}")
    print(f"Region: {REGION}")
    print("="*60)
    print("\n⚠️  This will DELETE articles without:")
    print("  - author/ownerId field")
    print("  - title or content")
    print("\nThese are usually test data or incomplete uploads.")
    
    confirm = input("\nContinue? (yes/no): ")
    
    if confirm.lower() != 'yes':
        print("❌ Cleanup cancelled.")
        exit(0)
    
    print("\n🚀 Starting cleanup...\n")
    
    try:
        deleted = cleanup_invalid_articles()
        print(f"\n✅ Cleanup completed! Deleted {deleted} invalid articles.")
        exit(0)
    except Exception as e:
        print(f"\n❌ Cleanup failed: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
