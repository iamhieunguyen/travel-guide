#!/usr/bin/env python3
"""
Script để thêm favoriteCount cho các bài viết cũ.
Đếm số lượng favorites từ UserFavoritesTable và update vào ArticlesTable.
"""

import boto3
from collections import defaultdict

# Khởi tạo DynamoDB
dynamodb = boto3.resource('dynamodb')

# Tên tables (thay đổi theo stack name của bạn)
ARTICLES_TABLE = 'travel-guide-backend-ArticlesTable-XXXXX'  # Thay bằng tên thật
FAVORITES_TABLE = 'travel-guide-backend-UserFavoritesTable-XXXXX'  # Thay bằng tên thật

articles_table = dynamodb.Table(ARTICLES_TABLE)
favorites_table = dynamodb.Table(FAVORITES_TABLE)


def count_favorites():
    """Đếm số lượng favorites cho mỗi article."""
    print("📊 Đang đếm favorites...")
    
    favorite_counts = defaultdict(int)
    
    # Scan toàn bộ favorites table
    response = favorites_table.scan()
    items = response.get('Items', [])
    
    # Xử lý pagination nếu có
    while 'LastEvaluatedKey' in response:
        response = favorites_table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
        items.extend(response.get('Items', []))
    
    # Đếm favorites cho mỗi article
    for item in items:
        article_id = item.get('articleId')
        if article_id:
            favorite_counts[article_id] += 1
    
    print(f"✅ Tìm thấy {len(favorite_counts)} articles có favorites")
    return favorite_counts


def update_articles(favorite_counts):
    """Update favoriteCount cho các articles."""
    print("\n🔄 Đang update articles...")
    
    updated = 0
    errors = 0
    
    for article_id, count in favorite_counts.items():
        try:
            articles_table.update_item(
                Key={'articleId': article_id},
                UpdateExpression='SET favoriteCount = :count',
                ExpressionAttributeValues={':count': count}
            )
            print(f"  ✓ {article_id}: {count} favorites")
            updated += 1
        except Exception as e:
            print(f"  ✗ {article_id}: Error - {e}")
            errors += 1
    
    print(f"\n✅ Updated: {updated}")
    print(f"❌ Errors: {errors}")


def set_zero_for_no_favorites():
    """Set favoriteCount = 0 cho các articles chưa có favorites."""
    print("\n🔄 Đang set favoriteCount = 0 cho articles chưa có favorites...")
    
    # Scan toàn bộ articles
    response = articles_table.scan()
    items = response.get('Items', [])
    
    while 'LastEvaluatedKey' in response:
        response = articles_table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
        items.extend(response.get('Items', []))
    
    updated = 0
    for item in items:
        article_id = item.get('articleId')
        if 'favoriteCount' not in item:
            try:
                articles_table.update_item(
                    Key={'articleId': article_id},
                    UpdateExpression='SET favoriteCount = :zero',
                    ExpressionAttributeValues={':zero': 0}
                )
                updated += 1
            except Exception as e:
                print(f"  ✗ {article_id}: Error - {e}")
    
    print(f"✅ Set favoriteCount = 0 cho {updated} articles")


def main():
    print("🚀 Bắt đầu migration favoriteCount...\n")
    
    # Bước 1: Đếm favorites
    favorite_counts = count_favorites()
    
    # Bước 2: Update articles có favorites
    if favorite_counts:
        update_articles(favorite_counts)
    
    # Bước 3: Set 0 cho articles chưa có favorites
    set_zero_for_no_favorites()
    
    print("\n✨ Migration hoàn tất!")


if __name__ == '__main__':
    main()
