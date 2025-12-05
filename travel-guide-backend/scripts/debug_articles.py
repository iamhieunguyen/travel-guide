"""
Debug script to check articles in DynamoDB
Shows visibility and status fields
"""
import boto3
import sys
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')

def check_articles(table_name, limit=10):
    """Check first N articles and their fields"""
    table = dynamodb.Table(table_name)
    
    print(f"{'='*80}")
    print(f"CHECKING ARTICLES IN: {table_name}")
    print(f"{'='*80}\n")
    
    # Scan first N articles
    response = table.scan(Limit=limit)
    items = response.get('Items', [])
    
    if not items:
        print("❌ NO ARTICLES FOUND!")
        return
    
    print(f"Found {len(items)} articles:\n")
    
    for i, item in enumerate(items, 1):
        article_id = item.get('articleId', 'unknown')
        owner_id = item.get('ownerId', 'unknown')
        visibility = item.get('visibility', '❌ MISSING')
        status = item.get('status', '❌ MISSING')
        created_at = item.get('createdAt', 'unknown')
        
        print(f"{i}. Article: {article_id[:20]}...")
        print(f"   Owner: {owner_id[:20]}...")
        print(f"   Visibility: {visibility}")
        print(f"   Status: {status}")
        print(f"   Created: {created_at}")
        print()
    
    # Statistics
    print(f"{'='*80}")
    print("STATISTICS:")
    print(f"{'='*80}")
    
    total = len(items)
    has_visibility = sum(1 for item in items if 'visibility' in item)
    has_status = sum(1 for item in items if 'status' in item)
    public_visibility = sum(1 for item in items if item.get('visibility') == 'public')
    approved_status = sum(1 for item in items if item.get('status') == 'approved')
    
    print(f"Total articles checked: {total}")
    print(f"Has 'visibility' field: {has_visibility}/{total} ({has_visibility/total*100:.1f}%)")
    print(f"Has 'status' field: {has_status}/{total} ({has_status/total*100:.1f}%)")
    print(f"visibility='public': {public_visibility}/{total} ({public_visibility/total*100:.1f}%)")
    print(f"status='approved': {approved_status}/{total} ({approved_status/total*100:.1f}%)")
    print()
    
    # Check GSI
    print(f"{'='*80}")
    print("TESTING GSI QUERY (gsi_visibility_createdAt):")
    print(f"{'='*80}")
    
    try:
        query_response = table.query(
            IndexName='gsi_visibility_createdAt',
            KeyConditionExpression='visibility = :visibility',
            ExpressionAttributeValues={':visibility': 'public'},
            Limit=5
        )
        
        query_items = query_response.get('Items', [])
        print(f"✅ GSI query returned {len(query_items)} items")
        
        if query_items:
            print("\nFirst item from GSI:")
            first = query_items[0]
            print(f"  Article: {first.get('articleId', 'unknown')[:20]}...")
            print(f"  Visibility: {first.get('visibility', 'unknown')}")
            print(f"  Status: {first.get('status', 'MISSING')}")
        
    except Exception as e:
        print(f"❌ GSI query failed: {e}")
    
    print()


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python debug_articles.py TABLE_NAME [LIMIT]")
        print("Example: python debug_articles.py travel-guide-backend-ArticlesTable-ABC123 20")
        sys.exit(1)
    
    table_name = sys.argv[1]
    limit = int(sys.argv[2]) if len(sys.argv) > 2 else 10
    
    check_articles(table_name, limit)
