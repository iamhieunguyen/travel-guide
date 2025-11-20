"""
Content moderation using Amazon Rekognition
Automatically detects and filters inappropriate images

Features:
- Detects explicit content, violence, suggestive content
- Quarantines flagged images
- Notifies administrators
- Updates article status
- Configurable sensitivity levels
"""
import os
import sys
import json
import boto3
from datetime import datetime, timezone
from decimal import Decimal

# Add utils to path
sys.path.insert(0, '/var/task/functions')

# Initialize AWS clients
rekognition = boto3.client('rekognition')
s3_client = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
sns_client = boto3.client('sns')

# Environment variables
TABLE_NAME = os.environ.get('TABLE_NAME', '')
BUCKET_NAME = os.environ.get('BUCKET_NAME', '')
MIN_CONFIDENCE = float(os.environ.get('MODERATION_CONFIDENCE', '75.0'))
SNS_TOPIC_ARN = os.environ.get('MODERATION_SNS_TOPIC', '')

# Moderation categories and their severity
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

# Actions based on severity
SEVERITY_ACTIONS = {
    'critical': 'delete',      # Delete immediately
    'high': 'quarantine',      # Move to quarantine
    'medium': 'flag',          # Flag for review
    'low': 'log'              # Log only
}

# Initialize DynamoDB table
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
    """
    Use Rekognition to detect inappropriate content
    
    Returns: Dict with moderation results
    """
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
        
        # Process moderation labels
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
            
            print(f"⚠️  {parent_name} > {label_name}: {confidence:.1f}% (severity: {severity})")
            
            # Track highest severity
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
    """
    Take action based on moderation results
    
    Actions:
    - delete: Remove image completely
    - quarantine: Move to quarantine folder
    - flag: Mark for manual review
    - log: Log the incident
    """
    action = moderation_result.get('action', 'log')
    
    try:
        if action == 'delete':
            print(f"🗑️  Deleting inappropriate image: {key}")
            
            # Delete from S3
            s3_client.delete_object(Bucket=bucket, Key=key)
            
            # Delete thumbnail if exists
            thumb_key = key.replace('articles/', 'thumbnails/').rsplit('.', 1)[0] + '_256.webp'
            try:
                s3_client.delete_object(Bucket=bucket, Key=thumb_key)
            except:
                pass
            
            # Update article status
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
            
            # Copy to quarantine folder
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
            
            # Delete original
            s3_client.delete_object(Bucket=bucket, Key=key)
            
            # Update article
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
            
            # Update article with flag
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
            
            # Just update metadata
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
    """
    Send notification to administrators about moderation action
    """
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
        
        print("✉️  Admin notification sent")
        
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
    Lambda handler for content moderation
    Triggered by S3 ObjectCreated events
    """
    print(f"Content moderation - Processing {len(event.get('Records', []))} images")
    
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
    
    for record in event.get('Records', []):
        try:
            # Extract S3 event details
            s3_info = record.get('s3', {})
            bucket = s3_info.get('bucket', {}).get('name')
            key = s3_info.get('object', {}).get('key')
            
            print(f"\n{'='*60}")
            print(f"Moderating: {key}")
            print(f"{'='*60}")
            
            # Skip non-article images
            if not key.startswith('articles/'):
                print("Skipping non-article image")
                continue
            
            # Skip thumbnails and quarantine
            if 'thumbnails/' in key or 'quarantine/' in key:
                print("Skipping thumbnail/quarantine image")
                continue
            
            # Extract article ID
            article_id = extract_article_id_from_key(key)
            if not article_id:
                print("Could not extract article ID")
                results['errors'] += 1
                continue
            
            # Run moderation
            moderation_result = moderate_image(bucket, key)
            
            if 'error' in moderation_result:
                print(f"Moderation failed: {moderation_result['error']}")
                results['errors'] += 1
                continue
            
            results['processed'] += 1
            
            if moderation_result['passed']:
                # Image is clean
                results['approved'] += 1
                mark_article_as_approved(article_id)
            else:
                # Image has issues
                results['rejected'] += 1
                
                # Take action
                action_result = handle_moderation_failure(
                    bucket, key, article_id, moderation_result
                )
                
                if action_result in results['actions']:
                    results['actions'][action_result] += 1
                
                # Notify admins for critical/high severity
                if moderation_result['maxSeverity'] in ['critical', 'high']:
                    send_admin_notification(article_id, key, moderation_result)
            
        except Exception as e:
            print(f"Error processing record: {e}")
            import traceback
            traceback.print_exc()
            results['errors'] += 1
    
    # Summary
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
        'statusCode': 200 if results['errors'] == 0 else 207,
        'body': json.dumps(results)
    }