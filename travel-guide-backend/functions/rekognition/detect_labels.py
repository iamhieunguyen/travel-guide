import os
import sys
import json
import boto3
from decimal import Decimal
from datetime import datetime, timezone

# Add utils to path
sys.path.insert(0, '/var/task/functions')

# Initialize AWS clients
rekognition = boto3.client('rekognition')
dynamodb = boto3.resource('dynamodb')
s3_client = boto3.client('s3')

# Environment variables
TABLE_NAME = os.environ.get('TABLE_NAME', '')
MIN_CONFIDENCE = float(os.environ.get('MIN_CONFIDENCE', '75.0'))
MAX_LABELS = int(os.environ.get('MAX_LABELS', '10'))

# Initialize DynamoDB table
table = dynamodb.Table(TABLE_NAME) if TABLE_NAME else None


def extract_article_id_from_key(s3_key):
    """
    Extract article ID from S3 key
    Example: articles/abc-123-def.jpg -> abc-123-def
    """
    try:
        filename = s3_key.split('/')[-1]  # Get filename
        article_id = filename.rsplit('.', 1)[0]  # Remove extension
        return article_id
    except Exception as e:
        print(f"Failed to extract article ID from key {s3_key}: {e}")
        return None

MODEL_ARN = os.environ.get('CUSTOM_LABELS_MODEL_ARN', None)

def detect_labels_in_image(bucket, key):
    """
    Use Rekognition to detect labels in an image
    
    Returns: List of label names with confidence scores
    """
    """Use custom model if available, otherwise use default"""
    try:
        if MODEL_ARN:
            # Use your custom model
            response = rekognition.detect_custom_labels(
                ProjectVersionArn=MODEL_ARN,
                Image={'S3Object': {'Bucket': bucket, 'Name': key}},
                MinConfidence=MIN_CONFIDENCE
            )
            labels_data = []
            for label in response.get('CustomLabels', []):
                labels_data.append({
                    'name': label['Name'].lower(),
                    'confidence': round(label['Confidence'], 2),
                    'parents': []
                })
        else:
            # Use default Rekognition (existing code)
            response = rekognition.detect_labels(
                Image={'S3Object': {'Bucket': bucket, 'Name': key}},
                MaxLabels=MAX_LABELS,
                MinConfidence=MIN_CONFIDENCE
            )
        
    except rekognition.exceptions.InvalidImageFormatException:
        print(f"Invalid image format: {key}")
        return []
    except rekognition.exceptions.ImageTooLargeException:
        print(f"Image too large: {key}")
        return []
    except Exception as e:
        print(f"Rekognition error for {key}: {e}")
        return []


def filter_relevant_labels(labels_data):
    """
    Filter and prioritize travel-relevant labels
    
    Priority categories:
    - Landmarks (temple, beach, mountain)
    - Activities (hiking, swimming)
    - Nature (sunset, forest, waterfall)
    - Architecture (building, monument)
    """
    travel_keywords = {
        'high_priority': [
            'temple', 'beach', 'mountain', 'waterfall', 'lake', 'ocean',
            'forest', 'sunset', 'sunrise', 'monument', 'landmark', 'architecture',
            'building', 'bridge', 'tower', 'palace', 'castle', 'ruins'
        ],
        'medium_priority': [
            'city', 'street', 'park', 'garden', 'river', 'sky', 'cloud',
            'tree', 'flower', 'animal', 'boat', 'vehicle', 'food', 'restaurant'
        ]
    }
    
    filtered = []
    
    # Prioritize labels
    for label in labels_data:
        name = label['name']
        
        if any(keyword in name for keyword in travel_keywords['high_priority']):
            label['priority'] = 'high'
            filtered.append(label)
        elif any(keyword in name for keyword in travel_keywords['medium_priority']):
            label['priority'] = 'medium'
            filtered.append(label)
        elif label['confidence'] >= 90:
            # Include very confident labels even if not in keywords
            label['priority'] = 'low'
            filtered.append(label)
    
    # Sort by priority and confidence
    priority_order = {'high': 0, 'medium': 1, 'low': 2}
    filtered.sort(key=lambda x: (priority_order.get(x['priority'], 3), -x['confidence']))
    
    return filtered[:MAX_LABELS]


def update_article_with_tags(article_id, labels_data):
    """
    Update article in DynamoDB with auto-generated tags
    """
    if not table:
        print("DynamoDB table not configured")
        return False
    
    try:
        # Extract just the label names for tags
        tag_names = [label['name'] for label in labels_data]
        
        # Store full label data separately
        label_details = [{
            'name': label['name'],
            'confidence': Decimal(str(label['confidence'])),
            'priority': label.get('priority', 'low')
        } for label in labels_data]
        
        # Update article
        response = table.update_item(
            Key={'articleId': article_id},
            UpdateExpression='SET autoTags = :tags, labelDetails = :details, lastAnalyzed = :timestamp',
            ExpressionAttributeValues={
                ':tags': tag_names,
                ':details': label_details,
                ':timestamp': datetime.now(timezone.utc).isoformat()
            },
            ReturnValues='ALL_NEW'
        )
        
        print(f"✓ Updated article {article_id} with {len(tag_names)} tags")
        return True
        
    except dynamodb.meta.client.exceptions.ResourceNotFoundException:
        print(f"Article {article_id} not found in database")
        return False
    except Exception as e:
        print(f"Failed to update article {article_id}: {e}")
        return False


def lambda_handler(event, context):
    """
    Lambda handler triggered by S3 ObjectCreated events
    
    Event structure:
    {
        "Records": [
            {
                "s3": {
                    "bucket": {"name": "bucket-name"},
                    "object": {"key": "articles/image.jpg", "size": 12345}
                }
            }
        ]
    }
    """
    print(f"Processing {len(event.get('Records', []))} S3 events")
    
    results = {
        'processed': 0,
        'succeeded': 0,
        'failed': 0,
        'skipped': 0
    }
    
    for record in event.get('Records', []):
        try:
            # Extract S3 event details
            s3_info = record.get('s3', {})
            bucket = s3_info.get('bucket', {}).get('name')
            key = s3_info.get('object', {}).get('key')
            size = s3_info.get('object', {}).get('size', 0)
            
            print(f"\n--- Processing: {key} ({size} bytes) ---")
            
            # Skip non-article images
            if not key.startswith('articles/'):
                print(f"Skipping non-article image: {key}")
                results['skipped'] += 1
                continue
            
            # Skip thumbnails
            if 'thumbnails/' in key or '_thumb' in key:
                print(f"Skipping thumbnail: {key}")
                results['skipped'] += 1
                continue
            
            # Extract article ID
            article_id = extract_article_id_from_key(key)
            if not article_id:
                print(f"Could not extract article ID from: {key}")
                results['failed'] += 1
                continue
            
            print(f"Article ID: {article_id}")
            
            # Detect labels using Rekognition
            print(f"Detecting labels (min confidence: {MIN_CONFIDENCE}%)...")
            labels_data = detect_labels_in_image(bucket, key)
            
            if not labels_data:
                print("No labels detected")
                results['failed'] += 1
                continue
            
            print(f"Detected {len(labels_data)} labels")
            
            # Filter and prioritize labels
            filtered_labels = filter_relevant_labels(labels_data)
            print(f"Filtered to {len(filtered_labels)} relevant labels")
            
            # Update article in DynamoDB
            if filtered_labels:
                success = update_article_with_tags(article_id, filtered_labels)
                if success:
                    results['succeeded'] += 1
                else:
                    results['failed'] += 1
            else:
                print("No relevant labels after filtering")
                results['skipped'] += 1
            
            results['processed'] += 1
            
        except Exception as e:
            print(f"Error processing record: {e}")
            import traceback
            traceback.print_exc()
            results['failed'] += 1
    
    # Summary
    print(f"\n=== Summary ===")
    print(f"Processed: {results['processed']}")
    print(f"Succeeded: {results['succeeded']}")
    print(f"Failed: {results['failed']}")
    print(f"Skipped: {results['skipped']}")
    
    return {
        'statusCode': 200 if results['failed'] == 0 else 207,  # 207 = Multi-Status
        'body': json.dumps(results)
    }