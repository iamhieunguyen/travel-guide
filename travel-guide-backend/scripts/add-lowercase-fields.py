#!/usr/bin/env python3
"""
Migration script: Add *Lower fields to existing articles
"""
import boto3
from decimal import Decimal

# Config
TABLE_NAME = "ArticlesTable"  # Thay bằng tên table thật
REGION = "ap-southeast-1"

dynamodb = boto3.resource('dynamodb', region_name=REGION)
table = dynamodb.Table(TABLE_NAME)

def migrate_articles():
    """Add titleLower, contentLower, locationNameLower to all articles"""
    
    print("Scanning all articles...")
    response = table.scan()
    items = response['Items']
    
    # Handle pagination
    while 'LastEvaluatedKey' in response:
        response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
        items.extend(response['Items'])
    
    print(f"Found {len(items)} articles")
    
    updated = 0
    skipped = 0
    
    for item in items:
        article_id = item['articleId']
        needs_update = False
        update_expr = []
        expr_names = {}
        expr_values = {}
        
        # Check titleLower
        if 'title' in item and 'titleLower' not in item:
            update_expr.append("#titleLower = :titleLower")
            expr_names["#titleLower"] = "titleLower"
            expr_values[":titleLower"] = item['title'].lower()
            needs_update = True
        
        # Check contentLower
        if 'content' in item and 'contentLower' not in item:
            update_expr.append("#contentLower = :contentLower")
            expr_names["#contentLower"] = "contentLower"
            expr_values[":contentLower"] = item['content'].lower()
            needs_update = True
        
        # Check locationNameLower
        if 'locationName' in item and 'locationNameLower' not in item:
            update_expr.append("#locationNameLower = :locationNameLower")
            expr_names["#locationNameLower"] = "locationNameLower"
            expr_values[":locationNameLower"] = item['locationName'].lower()
            needs_update = True
        
        if needs_update:
            try:
                table.update_item(
                    Key={'articleId': article_id},
                    UpdateExpression="SET " + ", ".join(update_expr),
                    ExpressionAttributeNames=expr_names,
                    ExpressionAttributeValues=expr_values
                )
                updated += 1
                print(f"✓ Updated: {article_id} - {item.get('title', 'N/A')[:50]}")
            except Exception as e:
                print(f"✗ Error updating {article_id}: {e}")
        else:
            skipped += 1
            print(f"- Skipped: {article_id} (already has *Lower fields)")
    
    print("\n" + "="*60)
    print(f"Migration complete!")
    print(f"Updated: {updated}")
    print(f"Skipped: {skipped}")
    print(f"Total: {len(items)}")
    print("="*60)

if __name__ == "__main__":
    print("="*60)
    print("DynamoDB Migration: Add *Lower fields")
    print("="*60)
    print(f"Table: {TABLE_NAME}")
    print(f"Region: {REGION}")
    print("")
    
    confirm = input("Continue? (yes/no): ")
    if confirm.lower() == 'yes':
        migrate_articles()
    else:
        print("Cancelled")
