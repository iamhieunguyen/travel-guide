"""
Content moderation using Amazon Rekognition
Automatically detects and filters inappropriate images
"""
import os
import sys
import json
import boto3
from datetime import datetime, timezone
from decimal import Decimal

sys.path.insert(0, '/var/task/functions')

rekognition = boto3.client('rekognition')
s3_client = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
sns_client = boto3.client('sns')

TABLE_NAME = os.environ.get('TABLE_NAME', '')
BUCKET_NAME = os.environ.get('BUCKET_NAME', '')
MIN_CONFIDENCE = float(os.environ.get('MODERATION_CONFIDENCE', '75.0'))
SNS_TOPIC_ARN = os.environ.get('MODERATION_SNS_TOPIC', '')

SEVERITY_LEVELS = {
    'Explicit Nudity': 'critical',
    'Suggestive': 'high',
    'Violence': 'critical',
    'Visually Disturbing': 'high',
    'Rude Gestures': 'medium',
    'Drugs': 'high',
    'Tobacco': 'low',
    'Alcohol': 'low',
    'Gambling': 'medium',
    'Hate Symbols': 'critical'
}

SEVERITY_ACTIONS = {
    'critical': 'delete',
    'high': 'quarantine',
    'medium': 'flag',
    'low': 'log'
}

table = dynamodb.Table(TABLE_NAME) if TABLE_NAME else None


def extract_article_id_from_key(s3_key):
    """Extract article ID from S3 key"""
    try:
        filename = s3_key.split('/')[-1]
        article_id = filename.rsplit('.', 1)[0]
        return article_id
    except Exception as e:
        print(f"Failed to extract article ID: {e}")
        return None


def moderate_image(bucket, key):
    """Use Rekognition to detect inappropriate content"""
    try:
        response = rekognition.detect_moderation_labels(
            Image={
                'S3Object': {
                    'Bucket': bucket,
                    'Name': key
                }
            },
            MinConfidence=MIN_CONFIDENCE
        )
        
        moderation_labels = response.get('ModerationLabels', [])
        
        if not moderation_labels:
            print("✓ Image passed moderation - no inappropriate content detected")
            return {
                'passed': True,
                'labels': [],
                'maxSeverity': None,
                'action': None
            }
        
        detected_issues = []
        max_severity_level = 'low'
        
        for label in moderation_labels:
            parent_name = label.get('ParentName', label['Name'])
            label_name = label['Name']
            confidence = label['Confidence']
            
            severity = SEVERITY_LEVELS.get(parent_name, 'low')
            
            issue = {
                'category': parent_name,
                'label': label_name,
                'confidence': round(confidence, 2),
                'severity': severity
            }
            detected_issues.append(issue)
            
            print(f"⚠️ {parent_name} > {label_name}: {confidence:.1f}% (severity: {severity})")
            
            if SEVERITY_ACTIONS.get(severity, 3) < SEVERITY_ACTIONS.get(max_severity_level, 3):
                max_severity_level = severity
        
        recommended_action = SEVERITY_ACTIONS.get(max_severity_level, 'log')
        
        return {
            'passed': False,
            'labels': detected_issues,
            'maxSeverity': max_severity_level,
            'action': recommended_action,
            'totalIssues': len(detected_issues)
        }
        
    except rekognition.exceptions.InvalidImageFormatException:
        print(f"Invalid image format: {key}")
        return {'passed': False, 'error': 'Invalid format'}
    except rekognition.exceptions.ImageTooLargeException:
        print(f"Image too large: {key}")
        return {'passed': False, 'error': 'Image too large'}
    except Exception as e:
        print(f"Moderation error: {e}")
        return {'passed': False, 'error': str(e)}


def handle_moderation_failure(bucket, key, article_id, moderation_result):
    """Take action based on moderation results"""
    action = moderation_result.get('action', 'log')
    
    try:
        if action == 'delete':
            print(f"🗑️ Deleting inappropriate image: {key}")
            
            s3_client.delete_object(Bucket=bucket, Key=key)
            
            thumb_key = key.replace('articles/', 'thumbnails/').rsplit('.', 1)[0] + '_256.webp'
            try:
                s3_client.delete_object(Bucket=bucket, Key=thumb_key)
            except:
                pass
            
            if table and article_id:
                table.update_item(
                    Key={'articleId': article_id},
                    UpdateExpression='SET moderationStatus = :status, imageKey = :null, moderationDetails = :details',
                    ExpressionAttributeValues={
                        ':status': 'rejected',
                        ':null': None,
                        ':details': {
                            'action': action,
                            'reason': 'Critical content violation',
                            'labels': moderation_result['labels'],
                            'timestamp': datetime.now(timezone.utc).isoformat()
                        }
                    }
                )
            
            return 'deleted'
        
        elif action == 'quarantine':
            print(f"📦 Moving to quarantine: {key}")
            
            quarantine_key = f"quarantine/{datetime.now().strftime('%Y%m%d')}/{key.split('/')[-1]}"
            
            s3_client.copy_object(
                Bucket=bucket,
                CopySource={'Bucket': bucket, 'Key': key},
                Key=quarantine_key,
                MetadataDirective='REPLACE',
                Metadata={
                    'original-key': key,
                    'quarantine-date': datetime.now(timezone.utc).isoformat(),
                    'reason': json.dumps(moderation_result['labels'])
                }
            )
            
            s3_client.delete_object(Bucket=bucket, Key=key)
            
            if table and article_id:
                table.update_item(
                    Key={'articleId': article_id},
                    UpdateExpression='SET moderationStatus = :status, imageKey = :key, moderationDetails = :details',
                    ExpressionAttributeValues={
                        ':status': 'quarantined',
                        ':key': quarantine_key,
                        ':details': {
                            'action': action,
                            'labels': moderation_result['labels'],
                            'timestamp': datetime.now(timezone.utc).isoformat()
                        }
                    }
                )
            
            return 'quarantined'
        
        elif action == 'flag':
            print(f"🚩 Flagging for review: {key}")
            
            if table and article_id:
                table.update_item(
                    Key={'articleId': article_id},
                    UpdateExpression='SET moderationStatus = :status, moderationDetails = :details',
                    ExpressionAttributeValues={
                        ':status': 'flagged',
                        ':details': {
                            'action': action,
                            'labels': moderation_result['labels'],
                            'timestamp': datetime.now(timezone.utc).isoformat()
                        }
                    }
                )
            
            return 'flagged'
        
        else:  # log
            print(f"📝 Logging moderation result: {key}")
            
            if table and article_id:
                table.update_item(
                    Key={'articleId': article_id},
                    UpdateExpression='SET moderationDetails = :details',
                    ExpressionAttributeValues={
                        ':details': {
                            'action': action,
                            'labels': moderation_result['labels'],
                            'timestamp': datetime.now(timezone.utc).isoformat()
                        }
                    }
                )
            
            return 'logged'
        
    except Exception as e:
        print(f"Error handling moderation failure: {e}")
        return 'error'


def send_admin_notification(article_id, key, moderation_result):
    """Send notification to administrators about moderation action"""
    if not SNS_TOPIC_ARN:
        print("SNS topic not configured, skipping notification")
        return
    
    try:
        severity = moderation_result.get('maxSeverity', 'unknown')
        action = moderation_result.get('action', 'unknown')
        labels = moderation_result.get('labels', [])
        
        message = f"""
Content Moderation Alert

Article ID: {article_id}
Image: {key}
Action Taken: {action}
Severity: {severity}

Detected Issues:
"""
        for label in labels:
            message += f"\n- {label['category']} > {label['label']} ({label['confidence']}%)"
        
        message += f"\n\nTimestamp: {datetime.now(timezone.utc).isoformat()}"
        
        sns_client.publish(
            TopicArn=SNS_TOPIC_ARN,
            Subject=f"[Content Moderation] {action.upper()} - Article {article_id}",
            Message=message
        )
        
        print("✉️ Admin notification sent")
        
    except Exception as e:
        print(f"Failed to send notification: {e}")


def mark_article_as_approved(article_id):
    """Mark article as approved after passing moderation"""
    if not table or not article_id:
        return
    
    try:
        table.update_item(
            Key={'articleId': article_id},
            UpdateExpression='SET moderationStatus = :status, moderatedAt = :timestamp',
            ExpressionAttributeValues={
                ':status': 'approved',
                ':timestamp': datetime.now(timezone.utc).isoformat()
            }
        )
        print(f"✓ Article {article_id} marked as approved")
    except Exception as e:
        print(f"Failed to update article status: {e}")


def lambda_handler(event, context):
    """
    *** UPDATED FOR SQS ***
    Lambda handler for content moderation
    Triggered by SQS containing S3 events
    """
    print(f"Content moderation - Processing {len(event.get('Records', []))} SQS messages")
    
    results = {
        'processed': 0,
        'approved': 0,
        'rejected': 0,
        'actions': {
            'deleted': 0,
            'quarantined': 0,
            'flagged': 0,
            'logged': 0
        },
        'errors': 0
    }
    
    failed_messages = []
    
    # Loop through SQS records
    for sqs_record in event.get('Records', []):
        try:
            # Parse S3 event from SQS body
            s3_event = json.loads(sqs_record['body'])
            
            # Process each S3 record
            for s3_record in s3_event.get('Records', []):
                try:
                    bucket = s3_record['s3']['bucket']['name']
                    key = s3_record['s3']['object']['key']
                    
                    print(f"\n{'='*60}")
                    print(f"Moderating: {key}")
                    print(f"{'='*60}")
                    
                    if not key.startswith('articles/'):
                        print("Skipping non-article image")
                        continue
                    
                    if 'thumbnails/' in key or 'quarantine/' in key:
                        print("Skipping thumbnail/quarantine image")
                        continue
                    
                    article_id = extract_article_id_from_key(key)
                    if not article_id:
                        print("Could not extract article ID")
                        results['errors'] += 1
                        continue
                    
                    moderation_result = moderate_image(bucket, key)
                    
                    if 'error' in moderation_result:
                        print(f"Moderation failed: {moderation_result['error']}")
                        results['errors'] += 1
                        continue
                    
                    results['processed'] += 1
                    
                    if moderation_result['passed']:
                        results['approved'] += 1
                        mark_article_as_approved(article_id)
                    else:
                        results['rejected'] += 1
                        
                        action_result = handle_moderation_failure(
                            bucket, key, article_id, moderation_result
                        )
                        
                        if action_result in results['actions']:
                            results['actions'][action_result] += 1
                        
                        if moderation_result['maxSeverity'] in ['critical', 'high']:
                            send_admin_notification(article_id, key, moderation_result)
                
                except Exception as e:
                    print(f"Error processing S3 record: {e}")
                    import traceback
                    traceback.print_exc()
                    results['errors'] += 1
            
        except Exception as e:
            print(f"Error processing SQS record: {e}")
            import traceback
            traceback.print_exc()
            failed_messages.append({
                'itemIdentifier': sqs_record['messageId']
            })
            results['errors'] += 1
    
    print(f"\n{'='*60}")
    print("CONTENT MODERATION SUMMARY")
    print(f"{'='*60}")
    print(f"Processed: {results['processed']}")
    print(f"Approved: {results['approved']}")
    print(f"Rejected: {results['rejected']}")
    print(f"  - Deleted: {results['actions']['deleted']}")
    print(f"  - Quarantined: {results['actions']['quarantined']}")
    print(f"  - Flagged: {results['actions']['flagged']}")
    print(f"  - Logged: {results['actions']['logged']}")
    print(f"Errors: {results['errors']}")
    print(f"{'='*60}")
    
    return {
        'batchItemFailures': failed_messages
    }