"""
Auto-tagging with Custom Label Prioritization using Rekognition
"""
import os
import sys
import json
import boto3
from decimal import Decimal
from datetime import datetime, timezone

sys.path.insert(0, '/var/task/functions')

rekognition = boto3.client('rekognition')
dynamodb = boto3.resource('dynamodb')
s3_client = boto3.client('s3')
sqs_client = boto3.client('sqs')

TABLE_NAME = os.environ.get('TABLE_NAME', '')
MIN_CONFIDENCE = float(os.environ.get('MIN_CONFIDENCE', '70.0'))
MAX_LABELS = int(os.environ.get('MAX_LABELS', '5'))
CONFIG_BUCKET = os.environ.get('CONFIG_BUCKET', '')
CONFIG_KEY = os.environ.get('CONFIG_KEY', 'config/label_priority_config.json')
THUMBNAIL_QUEUE_URL = os.environ.get('THUMBNAIL_QUEUE_URL', '')

table = dynamodb.Table(TABLE_NAME) if TABLE_NAME else None

DEFAULT_CONFIG = {
    "label_priorities": {
        "critical": {"score_boost": 150, "keywords": ["temple", "pagoda", "beach", "mountain", "waterfall", "monument", "landmark"]},
        "high_priority": {"score_boost": 100, "keywords": ["lake", "ocean", "forest", "sunset", "architecture", "palace", "ruins"]},
        "medium_priority": {"score_boost": 50, "keywords": ["city", "park", "garden", "animal", "boat", "food", "restaurant"]},
        "low_priority": {"score_boost": 0, "keywords": ["person", "people", "clothing"]}
    },
    "generic_penalties": {"penalty_score": -30, "keywords": ["outdoor", "nature", "indoors", "daylight"]},
    "excluded_labels": {"keywords": ["mammal", "vertebrate", "adult"]},
    "min_confidence_overrides": {"rules": []}
}

_config_cache = None


def load_priority_config():
    global _config_cache
    if _config_cache:
        return _config_cache
    
    if CONFIG_BUCKET:
        try:
            response = s3_client.get_object(Bucket=CONFIG_BUCKET, Key=CONFIG_KEY)
            _config_cache = json.loads(response['Body'].read().decode('utf-8'))
            return _config_cache
        except Exception:
            pass
    
    config_json = os.environ.get('LABEL_PRIORITY_CONFIG')
    if config_json:
        try:
            _config_cache = json.loads(config_json)
            return _config_cache
        except Exception:
            pass
    
    _config_cache = DEFAULT_CONFIG
    return _config_cache


def calculate_label_score(label, config):
    name = label['name'].lower()
    confidence = label['confidence']
    score = confidence
    priority = 'none'
    
    for priority_level, priority_config in config['label_priorities'].items():
        if any(keyword in name for keyword in priority_config['keywords']):
            score += priority_config['score_boost']
            priority = priority_level
            break
    
    generic_config = config.get('generic_penalties', {})
    if generic_config and any(keyword in name for keyword in generic_config.get('keywords', [])):
        score += generic_config.get('penalty_score', -30)
    
    for rule in config.get('min_confidence_overrides', {}).get('rules', []):
        if rule['keyword'] in name and confidence < rule['min_confidence']:
            score = -1
    
    return score, priority


def filter_and_prioritize_labels(labels_data):
    config = load_priority_config()
    excluded_keywords = config.get('excluded_labels', {}).get('keywords', [])
    scored_labels = []
    
    for label in labels_data:
        name = label['name'].lower()
        if any(excluded in name for excluded in excluded_keywords):
            continue
        
        score, priority = calculate_label_score(label, config)
        if score < 0:
            continue
        
        label['score'] = score
        label['priority'] = priority
        scored_labels.append(label)
    
    scored_labels.sort(key=lambda x: -x['score'])
    return scored_labels[:MAX_LABELS]


def detect_labels_in_image(bucket, key):
    try:
        if key.endswith(('.webp', '.gif', '.bmp', '.svg')):
            return []
        
        file_ext = key.lower().split('.')[-1]
        if file_ext not in ['jpg', 'jpeg', 'png']:
            return []
        
        response = s3_client.get_object(Bucket=bucket, Key=key)
        image_bytes = response['Body'].read()
        
        if len(image_bytes) < 100:
            return []
        
        if not (image_bytes[:3] == b'\xff\xd8\xff' or image_bytes[:8] == b'\x89PNG\r\n\x1a\n'):
            return []
        
        response = rekognition.detect_labels(
            Image={'S3Object': {'Bucket': bucket, 'Name': key}},
            MaxLabels=20,
            MinConfidence=MIN_CONFIDENCE,
            Features=['GENERAL_LABELS']
        )
        
        labels_data = [{
            'name': label['Name'].lower(),
            'confidence': round(label['Confidence'], 2),
            'parents': [p['Name'].lower() for p in label.get('Parents', [])]
        } for label in response.get('Labels', [])]
        
        return filter_and_prioritize_labels(labels_data)
        
    except Exception as e:
        print(f"Error detecting labels: {e}")
        return []


def extract_article_id_from_key(s3_key):
    try:
        filename = s3_key.split('/')[-1]
        name_without_ext = filename.rsplit('.', 1)[0]
        return name_without_ext.rsplit('_', 1)[0] if '_' in name_without_ext else name_without_ext
    except Exception:
        return None


def update_article_with_tags(article_id, labels_data):
    if not table:
        return False
    
    try:
        new_tag_names = [label['name'] for label in labels_data]
        new_label_details = [{
            'name': label['name'],
            'confidence': Decimal(str(label['confidence'])),
            'priority': label.get('priority', 'none'),
            'score': Decimal(str(label.get('score', 0)))
        } for label in labels_data]
        
        # Get existing tags to merge (avoid duplicates)
        try:
            existing = table.get_item(Key={'articleId': article_id})
            existing_tags = existing.get('Item', {}).get('autoTags', [])
            existing_details = existing.get('Item', {}).get('labelDetails', [])
            
            # Merge tags - keep unique only
            merged_tags = list(set(existing_tags + new_tag_names))[:MAX_LABELS]
            
            # Merge details - keep unique by name
            existing_names = {d['name'] for d in existing_details}
            merged_details = existing_details + [d for d in new_label_details if d['name'] not in existing_names]
            merged_details = merged_details[:MAX_LABELS]
        except Exception:
            merged_tags = new_tag_names
            merged_details = new_label_details
        
        table.update_item(
            Key={'articleId': article_id},
            UpdateExpression='SET autoTags = :tags, labelDetails = :details, lastAnalyzed = :timestamp',
            ExpressionAttributeValues={
                ':tags': merged_tags,
                ':details': merged_details,
                ':timestamp': datetime.now(timezone.utc).isoformat()
            }
        )
        return True
    except Exception as e:
        print(f"Failed to update article: {e}")
        return False


def forward_to_next_queue(bucket, key, article_id):
    if not THUMBNAIL_QUEUE_URL:
        return False
    
    try:
        sqs_client.send_message(
            QueueUrl=THUMBNAIL_QUEUE_URL,
            MessageBody=json.dumps({'Records': [{'s3': {'bucket': {'name': bucket}, 'object': {'key': key}}}]}),
            MessageAttributes={
                'articleId': {'StringValue': article_id, 'DataType': 'String'},
                'source': {'StringValue': 'detect-labels', 'DataType': 'String'}
            }
        )
        return True
    except Exception:
        return False


def lambda_handler(event, context):
    results = {'processed': 0, 'succeeded': 0, 'failed': 0, 'skipped': 0}
    failed_messages = []
    
    for sqs_record in event.get('Records', []):
        try:
            s3_event = json.loads(sqs_record['body'])
            
            for s3_record in s3_event.get('Records', []):
                try:
                    bucket = s3_record['s3']['bucket']['name']
                    key = s3_record['s3']['object']['key']
                    
                    if not key.startswith('articles/') or 'thumbnails/' in key or key.endswith('/'):
                        results['skipped'] += 1
                        continue
                    
                    article_id = extract_article_id_from_key(key)
                    if not article_id:
                        results['failed'] += 1
                        continue
                    
                    labels_data = detect_labels_in_image(bucket, key)
                    if not labels_data:
                        results['failed'] += 1
                        continue
                    
                    if update_article_with_tags(article_id, labels_data):
                        results['succeeded'] += 1
                        
                        try:
                            current_dir = os.path.dirname(os.path.abspath(__file__))
                            if current_dir not in sys.path:
                                sys.path.insert(0, current_dir)
                            from save_to_gallery import save_photo_to_gallery, update_trending_tags
                            tag_names = [label['name'] for label in labels_data]
                            save_photo_to_gallery(article_id, key, tag_names, status='public')
                            update_trending_tags(tag_names, key)
                        except Exception:
                            pass
                        
                        forward_to_next_queue(bucket, key, article_id)
                    else:
                        results['failed'] += 1
                    
                    results['processed'] += 1
                except Exception:
                    results['failed'] += 1
        except Exception:
            failed_messages.append({'itemIdentifier': sqs_record['messageId']})
            results['failed'] += 1
    
    print(f"DetectLabels: processed={results['processed']}, succeeded={results['succeeded']}, failed={results['failed']}")
    return {'batchItemFailures': failed_messages}
