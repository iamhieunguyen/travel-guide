"""
Enhanced Auto-tagging with Custom Label Prioritization
*** UPDATED FOR SQS INTEGRATION ***
Supports loading custom priority rules from config file or environment
"""
import os
import sys
import json
import boto3
from decimal import Decimal
from datetime import datetime, timezone

sys.path.insert(0, '/var/task/functions')

# Initialize AWS clients
rekognition = boto3.client('rekognition')
dynamodb = boto3.resource('dynamodb')
s3_client = boto3.client('s3')
sqs_client = boto3.client('sqs')

# Environment variables
TABLE_NAME = os.environ.get('TABLE_NAME', '')
MIN_CONFIDENCE = float(os.environ.get('MIN_CONFIDENCE', '70.0'))
MAX_LABELS = int(os.environ.get('MAX_LABELS', '5'))
CONFIG_BUCKET = os.environ.get('CONFIG_BUCKET', '')
CONFIG_KEY = os.environ.get('CONFIG_KEY', 'config/label_priority_config.json')
THUMBNAIL_QUEUE_URL = os.environ.get('THUMBNAIL_QUEUE_URL', '')

table = dynamodb.Table(TABLE_NAME) if TABLE_NAME else None

# Default configuration (fallback if no config file)
DEFAULT_CONFIG = {
    "label_priorities": {
        "critical": {
            "score_boost": 150,
            "keywords": ["temple", "pagoda", "beach", "mountain", "waterfall", "monument", "landmark"]
        },
        "high_priority": {
            "score_boost": 100,
            "keywords": ["lake", "ocean", "forest", "sunset", "architecture", "palace", "ruins"]
        },
        "medium_priority": {
            "score_boost": 50,
            "keywords": ["city", "park", "garden", "animal", "boat", "food", "restaurant"]
        },
        "low_priority": {
            "score_boost": 0,
            "keywords": ["person", "people", "clothing"]
        }
    },
    "generic_penalties": {
        "penalty_score": -30,
        "keywords": ["outdoor", "nature", "indoors", "daylight"]
    },
    "excluded_labels": {
        "keywords": ["mammal", "vertebrate", "adult"]
    },
    "min_confidence_overrides": {
        "rules": []
    }
}

# Cache for config
_config_cache = None


def load_priority_config():
    """
    Load label priority configuration
    Priority order:
    1. S3 bucket config file (for easy updates without redeployment)
    2. Environment variable JSON
    3. Default hardcoded config
    """
    global _config_cache
    
    if _config_cache:
        return _config_cache
    
    # Try loading from S3 first
    if CONFIG_BUCKET:
        try:
            response = s3_client.get_object(Bucket=CONFIG_BUCKET, Key=CONFIG_KEY)
            config_data = response['Body'].read().decode('utf-8')
            _config_cache = json.loads(config_data)
            print(f"✓ Loaded config from S3: {CONFIG_BUCKET}/{CONFIG_KEY}")
            return _config_cache
        except Exception as e:
            print(f"Could not load config from S3: {e}")
    
    # Try loading from environment variable
    config_json = os.environ.get('LABEL_PRIORITY_CONFIG')
    if config_json:
        try:
            _config_cache = json.loads(config_json)
            print("✓ Loaded config from environment variable")
            return _config_cache
        except Exception as e:
            print(f"Could not parse config from environment: {e}")
    
    # Use default config
    _config_cache = DEFAULT_CONFIG
    print("✓ Using default config")
    return _config_cache


def calculate_label_score(label, config):
    """
    Calculate priority score for a label based on configuration
    
    Score = Base Confidence + Priority Boost - Generic Penalty
    """
    name = label['name'].lower()
    confidence = label['confidence']
    score = confidence
    priority = 'none'
    
    # Check against priority keywords
    for priority_level, priority_config in config['label_priorities'].items():
        keywords = priority_config['keywords']
        if any(keyword in name for keyword in keywords):
            score += priority_config['score_boost']
            priority = priority_level
            break
    
    # Apply generic penalties
    generic_config = config.get('generic_penalties', {})
    if generic_config:
        generic_keywords = generic_config.get('keywords', [])
        penalty = generic_config.get('penalty_score', -30)
        if any(keyword in name for keyword in generic_keywords):
            score += penalty  # penalty is negative
            print(f"  ⚠️ Generic penalty applied to '{name}': {penalty}")
    
    # Check min confidence overrides
    min_conf_rules = config.get('min_confidence_overrides', {}).get('rules', [])
    for rule in min_conf_rules:
        if rule['keyword'] in name:
            min_required = rule['min_confidence']
            if confidence < min_required:
                score = -1  # Mark for exclusion
                print(f"  ✗ '{name}' excluded: confidence {confidence} < required {min_required}")
    
    return score, priority


def filter_and_prioritize_labels(labels_data):
    """
    Filter, score, and prioritize labels using custom configuration
    """
    config = load_priority_config()
    
    # Get excluded labels
    excluded_keywords = config.get('excluded_labels', {}).get('keywords', [])
    
    scored_labels = []
    
    for label in labels_data:
        name = label['name'].lower()
        
        # Check if label should be excluded
        if any(excluded in name for excluded in excluded_keywords):
            print(f"  ✗ Excluded: '{label['name']}'")
            continue
        
        # Calculate score
        score, priority = calculate_label_score(label, config)
        
        # Skip if score is negative (failed min confidence check)
        if score < 0:
            continue
        
        label['score'] = score
        label['priority'] = priority
        scored_labels.append(label)
        
        print(f"  • {label['name']}: confidence={label['confidence']:.1f}, priority={priority}, score={score:.1f}")
    
    # Sort by score (highest first)
    scored_labels.sort(key=lambda x: -x['score'])
    
    # Return top N labels
    return scored_labels[:MAX_LABELS]


def detect_labels_in_image(bucket, key):
    """Use Rekognition to detect labels with custom prioritization"""
    try:
        # Skip files that are definitely not images or are WebP thumbnails
        if key.endswith(('.webp', '.gif', '.bmp', '.svg')):
            print(f"⚠️ Skipping unsupported format: {key}")
            return []
        
        # Get file extension for validation
        file_ext = key.lower().split('.')[-1]
        if file_ext not in ['jpg', 'jpeg', 'png']:
            print(f"⚠️ Unsupported file extension: .{file_ext}")
            return []
        
        # Download the image from S3 to validate
        try:
            response = s3_client.get_object(Bucket=bucket, Key=key)
            image_bytes = response['Body'].read()
            print(f"✓ Downloaded image: {len(image_bytes)} bytes")
        except Exception as e:
            print(f"⚠️ Failed to download image from S3: {e}")
            return []
        
        # Basic validation that it's a real image
        if len(image_bytes) < 100:
            print(f"⚠️ Image too small: {len(image_bytes)} bytes")
            return []
        
        # Validate JPEG/PNG headers
        is_valid = False
        if image_bytes[:3] == b'\xff\xd8\xff':  # JPEG
            print("✓ Valid JPEG header")
            is_valid = True
        elif image_bytes[:8] == b'\x89PNG\r\n\x1a\n':  # PNG
            print("✓ Valid PNG header")
            is_valid = True
        else:
            print(f"⚠️ Invalid image header: {image_bytes[:8].hex()}")
            return []
        
        # Now use S3Object reference for Rekognition (which handles large files better)
        print(f"Calling Rekognition.detect_labels for {key}...")
        response = rekognition.detect_labels(
            Image={'S3Object': {'Bucket': bucket, 'Name': key}},
            MaxLabels=20,  # Get more labels initially, then filter
            MinConfidence=MIN_CONFIDENCE,
            Features=['GENERAL_LABELS']
        )
        
        labels_data = []
        for label in response.get('Labels', []):
            label_info = {
                'name': label['Name'].lower(),
                'confidence': round(label['Confidence'], 2),
                'parents': [p['Name'].lower() for p in label.get('Parents', [])]
            }
            labels_data.append(label_info)
        
        print(f"\nDetected {len(labels_data)} raw labels")
        print("Applying custom prioritization...")
        
        # Apply custom prioritization
        filtered_labels = filter_and_prioritize_labels(labels_data)
        
        print(f"\nFinal {len(filtered_labels)} prioritized labels:")
        for i, label in enumerate(filtered_labels, 1):
            print(f"  {i}. {label['name']} (score: {label.get('score', 0):.1f}, priority: {label.get('priority', 'none')})")
        
        return filtered_labels
        
    except rekognition.exceptions.InvalidImageFormatException as e:
        print(f"⚠️ Rekognition rejected image format: {e}")
        print(f"Key: {key}")
        return []
    except rekognition.exceptions.ImageTooLargeException as e:
        print(f"⚠️ Image too large for Rekognition: {e}")
        return []
    except Exception as e:
        print(f"Rekognition error: {e}")
        import traceback
        traceback.print_exc()
        return []


def extract_article_id_from_key(s3_key):
    """Extract article ID from S3 key
    
    Supports two formats:
    - Old: articles/{articleId}.jpg → articleId
    - New: articles/{articleId}_{imageId}.jpg → articleId
    """
    try:
        filename = s3_key.split('/')[-1]  # e.g., "abc123_def456.jpg" or "abc123.jpg"
        name_without_ext = filename.rsplit('.', 1)[0]  # e.g., "abc123_def456" or "abc123"
        
        # Check if it's new format with underscore (articleId_imageId)
        if '_' in name_without_ext:
            # New format: articleId_imageId → extract articleId (first part)
            article_id = name_without_ext.rsplit('_', 1)[0]
            print(f"  Extracted articleId (new format): {article_id}")
        else:
            # Old format: just articleId
            article_id = name_without_ext
            print(f"  Extracted articleId (old format): {article_id}")
        
        return article_id
    except Exception as e:
        print(f"Failed to extract article ID: {e}")
        return None


def update_article_with_tags(article_id, labels_data):
    """Update article in DynamoDB with prioritized tags"""
    if not table:
        print("DynamoDB table not configured")
        return False
    
    try:
        # Extract just the label names for tags (in priority order)
        tag_names = [label['name'] for label in labels_data]
        
        # Store full label data with scores
        label_details = [{
            'name': label['name'],
            'confidence': Decimal(str(label['confidence'])),
            'priority': label.get('priority', 'none'),
            'score': Decimal(str(label.get('score', 0)))
        } for label in labels_data]
        
        # Update article
        table.update_item(
            Key={'articleId': article_id},
            UpdateExpression='SET autoTags = :tags, labelDetails = :details, lastAnalyzed = :timestamp',
            ExpressionAttributeValues={
                ':tags': tag_names,
                ':details': label_details,
                ':timestamp': datetime.now(timezone.utc).isoformat()
            },
            ReturnValues='NONE'
        )
        
        print(f"✓ Updated article {article_id} with {len(tag_names)} prioritized tags")
        return True
        
    except Exception as e:
        print(f"Failed to update article {article_id}: {e}")
        return False


def forward_to_next_queue(bucket, key, article_id):
    """Forward image to Thumbnail Generator queue (new flow).
    
    After label detection, forward to thumbnail generation.
    """
    if not THUMBNAIL_QUEUE_URL:
        print("Thumbnail queue URL not configured")
        return False
    
    try:
        # Create S3 event message
        s3_event = {
            'Records': [{
                's3': {
                    'bucket': {'name': bucket},
                    'object': {'key': key}
                }
            }]
        }
        
        # Send to Thumbnail Generator queue
        sqs_client.send_message(
            QueueUrl=THUMBNAIL_QUEUE_URL,
            MessageBody=json.dumps(s3_event),
            MessageAttributes={
                'articleId': {'StringValue': article_id, 'DataType': 'String'},
                'labels': {'StringValue': 'detected', 'DataType': 'String'},
                'source': {'StringValue': 'detect-labels', 'DataType': 'String'}
            }
        )
        print(f"✓ Forwarded to Thumbnail Generator queue: {key}")
        return True
    except Exception as e:
        print(f"Failed to forward to Thumbnail Generator queue: {e}")
        return False


def lambda_handler(event, context):
    """
    *** UPDATED FOR SQS ***
    Lambda handler with custom label prioritization
    Triggered by SQS containing S3 events
    """
    print(f"Detect Labels - Processing {len(event.get('Records', []))} SQS messages")
    
    results = {
        'processed': 0,
        'succeeded': 0,
        'failed': 0,
        'skipped': 0
    }
    
    failed_messages = []  # Track failed messages for SQS retry
    
    # Loop through SQS records
    for sqs_record in event.get('Records', []):
        try:
            # Parse S3 event from SQS message body
            s3_event = json.loads(sqs_record['body'])
            
            # Process each S3 record in the event
            for s3_record in s3_event.get('Records', []):
                try:
                    # Extract S3 information
                    bucket = s3_record['s3']['bucket']['name']
                    key = s3_record['s3']['object']['key']
                    
                    print(f"\n{'='*60}")
                    print(f"Processing: {key}")
                    print(f"{'='*60}")
                    
                    # Skip non-article images
                    if not key.startswith('articles/'):
                        print("Skipping non-article image")
                        results['skipped'] += 1
                        continue
                    
                    # Skip thumbnails
                    if 'thumbnails/' in key or '_thumb' in key:
                        print("Skipping thumbnail")
                        results['skipped'] += 1
                        continue
                    
                    # Skip folder/prefix objects (they end with /)
                    if key.endswith('/'):
                        print(f"Skipping folder object: {key}")
                        results['skipped'] += 1
                        continue
                    
                    # Extract article ID
                    article_id = extract_article_id_from_key(key)
                    if not article_id:
                        print("Could not extract article ID")
                        results['failed'] += 1
                        continue
                    
                    print(f"Article ID: {article_id}")
                    
                    # Detect and prioritize labels
                    labels_data = detect_labels_in_image(bucket, key)
                    
                    if not labels_data:
                        print("No labels detected after prioritization")
                        results['failed'] += 1
                        continue
                    
                    # Update article
                    success = update_article_with_tags(article_id, labels_data)
                    if success:
                        results['succeeded'] += 1
                        
                        # Save to Gallery tables
                        try:
                            import sys
                            import os
                            # Add current directory to path
                            current_dir = os.path.dirname(os.path.abspath(__file__))
                            if current_dir not in sys.path:
                                sys.path.insert(0, current_dir)
                            
                            from save_to_gallery import save_photo_to_gallery, update_trending_tags
                            tag_names = [label['name'] for label in labels_data]
                            image_url = key  # S3 key
                            save_photo_to_gallery(article_id, image_url, tag_names, status='public')
                            update_trending_tags(tag_names, image_url)
                            print("✓ Saved to Gallery tables")
                        except Exception as gallery_error:
                            print(f"⚠️  Failed to save to Gallery tables: {gallery_error}")
                            # Don't fail the whole process if gallery save fails
                            import traceback
                            traceback.print_exc()
                        
                        # Forward to next queue
                        forward_to_next_queue(bucket, key, article_id)
                    else:
                        results['failed'] += 1
                    
                    results['processed'] += 1
                
                except Exception as e:
                    print(f"Error processing S3 record: {e}")
                    import traceback
                    traceback.print_exc()
                    results['failed'] += 1
            
        except Exception as e:
            print(f"Error processing SQS record: {e}")
            import traceback
            traceback.print_exc()
            # Add to failed messages for retry
            failed_messages.append({
                'itemIdentifier': sqs_record['messageId']
            })
            results['failed'] += 1
    
    # Summary
    print(f"\n{'='*60}")
    print("DETECT LABELS SUMMARY")
    print(f"{'='*60}")
    print(f"Processed: {results['processed']}")
    print(f"Succeeded: {results['succeeded']}")
    print(f"Failed: {results['failed']}")
    print(f"Skipped: {results['skipped']}")
    print(f"{'='*60}")
    
    # Return batch item failures for SQS partial batch response
    return {
        'batchItemFailures': failed_messages
    }