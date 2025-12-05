"""
Content moderation using Amazon Rekognition
"""
import os
import sys
import json
import boto3
from datetime import datetime, timezone

sys.path.insert(0, '/var/task/functions')

rekognition = boto3.client('rekognition')
s3_client = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
sns_client = boto3.client('sns')
sqs_client = boto3.client('sqs')
ses_client = boto3.client('ses')

TABLE_NAME = os.environ.get('TABLE_NAME', '')
BUCKET_NAME = os.environ.get('BUCKET_NAME', '')
MIN_CONFIDENCE = float(os.environ.get('MODERATION_CONFIDENCE', '75.0'))
ADMIN_SNS_TOPIC_ARN = os.environ.get('ADMIN_SNS_TOPIC_ARN', '')
DETECT_LABELS_QUEUE_URL = os.environ.get('DETECT_LABELS_QUEUE_URL', '')
USER_PROFILES_TABLE = os.environ.get('USER_PROFILES_TABLE', '')
SES_SENDER_EMAIL = os.environ.get('SES_SENDER_EMAIL', 'noreply@example.com')

SEVERITY_LEVELS = {
    'Explicit Nudity': 'critical', 'Violence': 'critical', 'Drugs': 'critical', 'Hate Symbols': 'critical',
    'Suggestive': 'high', 'Visually Disturbing': 'high',
    'Rude Gestures': 'medium', 'Gambling': 'medium',
    'Tobacco': 'low', 'Alcohol': 'low'
}
SEVERITY_ACTIONS = {'critical': 'delete', 'high': 'quarantine', 'medium': 'flag', 'low': 'log'}
SEVERITY_ORDER = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}

table = dynamodb.Table(TABLE_NAME) if TABLE_NAME else None
user_profiles_table = dynamodb.Table(USER_PROFILES_TABLE) if USER_PROFILES_TABLE else None


def extract_article_id_from_key(s3_key):
    try:
        filename = s3_key.split('/')[-1]
        return filename.rsplit('.', 1)[0]
    except Exception:
        return None


def moderate_image(bucket, key):
    try:
        response = rekognition.detect_moderation_labels(
            Image={'S3Object': {'Bucket': bucket, 'Name': key}},
            MinConfidence=MIN_CONFIDENCE
        )
        
        labels = response.get('ModerationLabels', [])
        if not labels:
            return {'passed': True, 'labels': [], 'maxSeverity': None, 'action': None}
        
        detected_issues = []
        max_severity = 'low'
        
        for label in labels:
            parent = label.get('ParentName', label['Name'])
            severity = SEVERITY_LEVELS.get(parent, 'low')
            detected_issues.append({
                'category': parent,
                'label': label['Name'],
                'confidence': round(label['Confidence'], 2),
                'severity': severity
            })
            if SEVERITY_ORDER.get(severity, 3) < SEVERITY_ORDER.get(max_severity, 3):
                max_severity = severity
        
        return {
            'passed': False,
            'labels': detected_issues,
            'maxSeverity': max_severity,
            'action': SEVERITY_ACTIONS.get(max_severity, 'log')
        }
    except Exception as e:
        return {'passed': False, 'error': str(e)}


def handle_moderation_failure(bucket, key, article_id, result):
    action = result.get('action', 'log')
    owner_id = None
    
    try:
        if table and article_id:
            resp = table.get_item(Key={'articleId': article_id})
            owner_id = resp.get('Item', {}).get('ownerId')
        
        details = {
            'action': action,
            'labels': result['labels'],
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
        if action == 'delete':
            s3_client.delete_object(Bucket=bucket, Key=key)
            thumb_key = key.replace('articles/', 'thumbnails/').rsplit('.', 1)[0] + '_256.webp'
            try:
                s3_client.delete_object(Bucket=bucket, Key=thumb_key)
            except Exception:
                pass
            
            if table and article_id:
                table.update_item(
                    Key={'articleId': article_id},
                    UpdateExpression='SET moderationStatus = :s, imageKey = :n, moderationDetails = :d',
                    ExpressionAttributeValues={':s': 'rejected', ':n': None, ':d': details}
                )
            
            if owner_id:
                email = get_user_email(owner_id)
                if email:
                    send_user_deletion_email(email, article_id, result)
            
            return 'deleted', owner_id
        
        elif action == 'quarantine':
            quarantine_key = f"quarantine/{datetime.now().strftime('%Y%m%d')}/{key.split('/')[-1]}"
            s3_client.copy_object(Bucket=bucket, CopySource={'Bucket': bucket, 'Key': key}, Key=quarantine_key)
            s3_client.delete_object(Bucket=bucket, Key=key)
            
            if table and article_id:
                table.update_item(
                    Key={'articleId': article_id},
                    UpdateExpression='SET moderationStatus = :s, imageKey = :k, moderationDetails = :d',
                    ExpressionAttributeValues={':s': 'quarantined', ':k': quarantine_key, ':d': details}
                )
            return 'quarantined', owner_id
        
        elif action == 'flag':
            if table and article_id:
                table.update_item(
                    Key={'articleId': article_id},
                    UpdateExpression='SET moderationStatus = :s, moderationDetails = :d',
                    ExpressionAttributeValues={':s': 'flagged', ':d': details}
                )
            return 'flagged', owner_id
        
        else:
            if table and article_id:
                table.update_item(
                    Key={'articleId': article_id},
                    UpdateExpression='SET moderationDetails = :d',
                    ExpressionAttributeValues={':d': details}
                )
            return 'logged', owner_id
    except Exception:
        return 'error', None


def get_user_email(owner_id):
    if not user_profiles_table or not owner_id:
        return None
    try:
        resp = user_profiles_table.get_item(Key={'userId': owner_id})
        return resp.get('Item', {}).get('email')
    except Exception:
        return None


def send_user_deletion_email(user_email, article_id, result):
    if not user_email:
        return False
    try:
        labels = result.get('labels', [])
        severity = result.get('maxSeverity', 'unknown')
        
        body = f"""Your uploaded image (Article ID: {article_id}) was removed due to content policy violation.

Severity: {severity.upper()}
Detected Issues:
"""
        for label in labels:
            body += f"- {label['category']}: {label['label']} ({label['confidence']}%)\n"
        
        ses_client.send_email(
            Source=SES_SENDER_EMAIL,
            Destination={'ToAddresses': [user_email]},
            Message={
                'Subject': {'Data': 'Your Image Was Removed - Content Policy Violation'},
                'Body': {'Text': {'Data': body}}
            }
        )
        return True
    except Exception:
        return False


def send_admin_notification(article_id, key, result, owner_id=None):
    if not ADMIN_SNS_TOPIC_ARN:
        return
    try:
        message = f"Article: {article_id}\nOwner: {owner_id or 'Unknown'}\nImage: {key}\nAction: {result.get('action')}\nSeverity: {result.get('maxSeverity')}"
        sns_client.publish(
            TopicArn=ADMIN_SNS_TOPIC_ARN,
            Subject=f"[Moderation] {result.get('action', '').upper()} - {article_id}",
            Message=message
        )
    except Exception:
        pass


def mark_article_as_approved(article_id):
    if not table or not article_id:
        return
    try:
        table.update_item(
            Key={'articleId': article_id},
            UpdateExpression='SET moderationStatus = :s, moderatedAt = :t',
            ExpressionAttributeValues={':s': 'approved', ':t': datetime.now(timezone.utc).isoformat()}
        )
    except Exception:
        pass


def forward_to_next_queue(bucket, key, article_id, result):
    if not DETECT_LABELS_QUEUE_URL:
        return False
    try:
        sqs_client.send_message(
            QueueUrl=DETECT_LABELS_QUEUE_URL,
            MessageBody=json.dumps({'Records': [{'s3': {'bucket': {'name': bucket}, 'object': {'key': key}}}]}),
            MessageAttributes={
                'articleId': {'StringValue': article_id, 'DataType': 'String'},
                'source': {'StringValue': 'content-moderator', 'DataType': 'String'}
            }
        )
        return True
    except Exception:
        return False


def lambda_handler(event, context):
    results = {'processed': 0, 'approved': 0, 'rejected': 0, 'errors': 0}
    failed_messages = []
    
    for sqs_record in event.get('Records', []):
        try:
            s3_event = json.loads(sqs_record['body'])
            
            for s3_record in s3_event.get('Records', []):
                try:
                    bucket = s3_record['s3']['bucket']['name']
                    key = s3_record['s3']['object']['key']
                    
                    if not key.startswith('articles/') or 'thumbnails/' in key or 'quarantine/' in key or key.endswith('/'):
                        continue
                    
                    article_id = extract_article_id_from_key(key)
                    if not article_id:
                        results['errors'] += 1
                        continue
                    
                    mod_result = moderate_image(bucket, key)
                    if 'error' in mod_result:
                        results['errors'] += 1
                        continue
                    
                    results['processed'] += 1
                    
                    if mod_result['passed']:
                        results['approved'] += 1
                        mark_article_as_approved(article_id)
                    else:
                        results['rejected'] += 1
                        action, owner_id = handle_moderation_failure(bucket, key, article_id, mod_result)
                        if mod_result['maxSeverity'] in ['critical', 'high']:
                            send_admin_notification(article_id, key, mod_result, owner_id)
                    
                    forward_to_next_queue(bucket, key, article_id, {'moderationStatus': 'approved' if mod_result['passed'] else 'rejected'})
                except Exception:
                    results['errors'] += 1
        except Exception:
            failed_messages.append({'itemIdentifier': sqs_record['messageId']})
            results['errors'] += 1
    
    print(f"ContentModeration: processed={results['processed']}, approved={results['approved']}, rejected={results['rejected']}")
    return {'batchItemFailures': failed_messages}
