import boto3
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('travel-guided-ArticlesTable-L3G1OXLHH7H')

# Scan recent articles
response = table.scan(Limit=20)
items = response['Items']

# Sort by createdAt
items_sorted = sorted(items, key=lambda x: x.get('createdAt', ''), reverse=True)

print("Latest 5 articles:")
print("="*80)
for i, item in enumerate(items_sorted[:5], 1):
    article_id = item.get('articleId', 'N/A')
    status = item.get('status', 'MISSING')
    mod_status = item.get('moderationStatus', 'MISSING')
    created = item.get('createdAt', 'N/A')
    owner = item.get('ownerId', 'N/A')[:20]
    
    print(f"{i}. {article_id[:40]}...")
    print(f"   Status: {status}")
    print(f"   ModerationStatus: {mod_status}")
    print(f"   Owner: {owner}...")
    print(f"   Created: {created}")
    print()
