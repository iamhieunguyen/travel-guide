import boto3
import sys

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('travel-guided-ArticlesTable-L3G1OXLHH7H')

# Find articles by username
username = sys.argv[1] if len(sys.argv) > 1 else 'kietbeilike'

print(f"Searching for articles by user: {username}")
print("="*80)

# Scan all articles
response = table.scan()
items = response['Items']

# Filter by username
user_articles = [item for item in items if item.get('username', '').lower() == username.lower()]

if not user_articles:
    print(f"No articles found for user: {username}")
    sys.exit(0)

# Sort by createdAt
user_articles_sorted = sorted(user_articles, key=lambda x: x.get('createdAt', ''), reverse=True)

print(f"Found {len(user_articles)} articles for {username}:\n")

for i, item in enumerate(user_articles_sorted[:10], 1):
    article_id = item.get('articleId', 'N/A')
    status = item.get('status', 'MISSING')
    mod_status = item.get('moderationStatus', 'MISSING')
    created = item.get('createdAt', 'N/A')
    title = item.get('title', 'N/A')[:50]
    location = item.get('locationName', 'N/A')[:30]
    
    print(f"{i}. {article_id}")
    print(f"   Title: {title}")
    print(f"   Location: {location}")
    print(f"   Status: {status}")
    print(f"   ModerationStatus: {mod_status}")
    print(f"   Created: {created}")
    print()
