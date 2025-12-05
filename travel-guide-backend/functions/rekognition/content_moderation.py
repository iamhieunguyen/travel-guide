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
sqs_client = boto3.client('sqs')
ses_client = boto3.client('ses')
cognito_client = boto3.client('cognito-idp')

TABLE_NAME = os.environ.get('TABLE_NAME', '')
BUCKET_NAME = os.environ.get('BUCKET_NAME', '')
MIN_CONFIDENCE = float(os.environ.get('MODERATION_CONFIDENCE', '75.0'))
ADMIN_SNS_TOPIC_ARN = os.environ.get('ADMIN_SNS_TOPIC_ARN', '')
DETECT_LABELS_QUEUE_URL = os.environ.get('DETECT_LABELS_QUEUE_URL', '')
USER_PROFILES_TABLE = os.environ.get('USER_PROFILES_TABLE', '')
USER_POOL_ID = os.environ.get('USER_POOL_ID', '')

SEVERITY_LEVELS = {
    'Explicit Nudity': 'critical',
    'Suggestive': 'high',
    'Violence': 'critical',
    'Visually Disturbing': 'high',
    'Rude Gestures': 'medium',
    'Drugs': 'critical',
    'Tobacco': 'low',
    'Alcohol': 'low',
    'Gambling': 'medium',
    'Hate Symbols': 'critical',
    'Blood & Gore': 'critical'
}

SEVERITY_ACTIONS = {
    'critical': 'delete',
    'high': 'quarantine',
    'medium': 'flag',
    'low': 'log'
}

table = dynamodb.Table(TABLE_NAME) if TABLE_NAME else None
user_profiles_table = dynamodb.Table(USER_PROFILES_TABLE) if USER_PROFILES_TABLE else None


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
    owner_id = None
    
    try:
        # Get article owner ID for user notification
        if table and article_id:
            try:
                print(f"🔍 Looking up article in DynamoDB: {article_id}")
                article_response = table.get_item(Key={'articleId': article_id})
                article_data = article_response.get('Item')
                
                if not article_data:
                    print(f"⚠️ Article not found in DynamoDB: {article_id}")
                else:
                    owner_id = article_data.get('ownerId')
                    print(f"📋 Article owner ID: {owner_id}")
                    
                    # Debug: Print all article fields to see what's available
                    print(f"📊 Article fields: {list(article_data.keys())}")
                    
                    if not owner_id:
                        print(f"⚠️ Article exists but has no ownerId field!")
                        print(f"   Article data: {json.dumps({k: str(v) for k, v in article_data.items()}, indent=2)}")
            except Exception as e:
                print(f"❌ Failed to get article owner: {e}")
                import traceback
                traceback.print_exc()
        
        if action == 'delete':
            print(f"🗑️ Deleting inappropriate image: {key}")
            
            # Try to get owner_id from S3 metadata if not found in DynamoDB
            if not owner_id:
                try:
                    print(f"🔍 Trying to get owner from S3 metadata...")
                    s3_metadata = s3_client.head_object(Bucket=bucket, Key=key)
                    metadata = s3_metadata.get('Metadata', {})
                    owner_id = metadata.get('owner-id') or metadata.get('ownerid') or metadata.get('user-id')
                    if owner_id:
                        print(f"✅ Found owner ID in S3 metadata: {owner_id}")
                    else:
                        print(f"⚠️ No owner ID in S3 metadata either")
                except Exception as e:
                    print(f"⚠️ Could not get S3 metadata: {e}")
            
            # Send email to user BEFORE deletion (in case we need article data)
            email_sent = False
            if owner_id:
                print(f"🔍 Looking up email for user: {owner_id}")
                user_email = get_user_email(owner_id)
                if user_email:
                    print(f"📧 Sending deletion notification to: {user_email}")
                    email_sent = send_user_deletion_email(user_email, article_id, moderation_result)
                    if email_sent:
                        print(f"✅ User notification email sent successfully")
                    else:
                        print(f"❌ Failed to send user notification email")
                else:
                    print(f"⚠️ No email found for user: {owner_id}")
            else:
                print(f"⚠️ No owner ID found for article: {article_id}")
                print(f"   Cannot send user notification without owner ID")
            
            # Delete the image from S3
            s3_client.delete_object(Bucket=bucket, Key=key)
            print(f"✓ Deleted main image: {key}")
            
            # Delete all thumbnail sizes (256, 512, 1024)
            base_thumb_key = key.replace('articles/', 'thumbnails/').rsplit('.', 1)[0]
            for size in ['256', '512', '1024']:
                thumb_key = f"{base_thumb_key}_{size}.webp"
                try:
                    s3_client.delete_object(Bucket=bucket, Key=thumb_key)
                    print(f"✓ Deleted thumbnail: {thumb_key}")
                except Exception as e:
                    print(f"⚠️ Could not delete thumbnail {thumb_key}: {e}")
            
            # Update article status in DynamoDB
            # Clear ALL image-related fields so frontend knows image is gone
            if table and article_id:
                table.update_item(
                    Key={'articleId': article_id},
                    UpdateExpression='SET moderationStatus = :status, imageKey = :null, thumbnailKey = :null, imageKeys = :empty_list, moderationDetails = :details, userNotified = :notified',
                    ExpressionAttributeValues={
                        ':status': 'rejected',
                        ':null': None,
                        ':empty_list': [],
                        ':details': {
                            'action': action,
                            'reason': 'Critical content violation',
                            'labels': moderation_result['labels'],
                            'timestamp': datetime.now(timezone.utc).isoformat(),
                            'emailSent': email_sent
                        },
                        ':notified': email_sent
                    }
                )
                print(f"✓ Updated article status to rejected")
                print(f"✓ Cleared imageKey, thumbnailKey, and imageKeys from article")
            
            return 'deleted', owner_id
        
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
            
            return 'quarantined', owner_id
        
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
            
            return 'flagged', owner_id
        
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
            
            return 'logged', owner_id
        
    except Exception as e:
        print(f"Error handling moderation failure: {e}")
        return 'error', None


def get_user_email(owner_id):
    """Get user email from AWS Cognito"""
    if not USER_POOL_ID or not owner_id:
        print(f"⚠️ Missing USER_POOL_ID or owner_id")
        return None
    
    try:
        print(f"🔍 Fetching email from Cognito for user: {owner_id}")
        
        # Get user from Cognito
        response = cognito_client.admin_get_user(
            UserPoolId=USER_POOL_ID,
            Username=owner_id
        )
        
        # Extract email from user attributes
        user_attributes = response.get('UserAttributes', [])
        for attr in user_attributes:
            if attr['Name'] == 'email':
                email = attr['Value']
                print(f"✅ Found email for user {owner_id}: {email}")
                return email
        
        print(f"⚠️ No email attribute found for user {owner_id}")
        return None
    except cognito_client.exceptions.UserNotFoundException:
        print(f"⚠️ User {owner_id} not found in Cognito")
        return None
    except Exception as e:
        print(f"❌ Failed to get user email from Cognito: {e}")
        import traceback
        traceback.print_exc()
        return None


def send_user_deletion_email(user_email, article_id, moderation_result):
    """Send email to user notifying them of image deletion"""
    if not user_email:
        print("❌ No user email provided, skipping user notification")
        return False
    
    try:
        print(f"📧 Preparing deletion email for: {user_email}")
        labels = moderation_result.get('labels', [])
        severity = moderation_result.get('maxSeverity', 'unknown')
        
        # Build email body
        subject = f"⚠️ Your Image Was Removed - Content Policy Violation"
        
        body_text = f"""
Hello,

We're writing to inform you that your uploaded image (Article ID: {article_id}) has been removed from our platform due to a content policy violation.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ CONTENT MODERATION ALERT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Article ID: {article_id}
Action Taken: Image Deleted
Severity Level: {severity.upper()}
Timestamp: {datetime.now(timezone.utc).isoformat()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚫 DETECTED ISSUES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"""
        for label in labels:
            body_text += f"• {label['category']} - {label['label']} (Confidence: {label['confidence']}%)\n"
        
        body_text += f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Our automated content moderation system detected inappropriate content in your image. 
This image has been permanently removed from our platform.

WHY WAS MY IMAGE REMOVED?
We use AI-powered content moderation to ensure all images comply with our community 
guidelines. Images containing explicit, violent, or otherwise inappropriate content 
are automatically flagged and removed.

WHAT CAN I DO?
• Review our content guidelines before uploading
• Ensure your images are appropriate for a travel guide platform
• If you believe this was an error, please contact our support team

Thank you for your understanding.

Best regards,
Travel Guide Team
"""
        
        print(f"📤 Sending email via SES...")
        print(f"   From: khiem120805@gmail.com")
        print(f"   To: {user_email}")
        print(f"   Subject: {subject}")
        
        # Send via SES
        response = ses_client.send_email(
            Source='khiem120805@gmail.com',  # Must be verified in SES
            Destination={'ToAddresses': [user_email]},
            Message={
                'Subject': {'Data': subject, 'Charset': 'UTF-8'},
                'Body': {'Text': {'Data': body_text, 'Charset': 'UTF-8'}}
            }
        )
        
        message_id = response.get('MessageId', 'unknown')
        print(f"✅ User deletion email sent successfully!")
        print(f"   Message ID: {message_id}")
        print(f"   Recipient: {user_email}")
        return True
        
    except ses_client.exceptions.MessageRejected as e:
        print(f"❌ SES rejected the email: {e}")
        print(f"   This usually means the email address is not verified in SES sandbox mode")
        return False
    except ses_client.exceptions.MailFromDomainNotVerifiedException as e:
        print(f"❌ Sender email not verified: {e}")
        return False
    except Exception as e:
        print(f"❌ Failed to send user email: {e}")
        import traceback
        traceback.print_exc()
        return False


def send_admin_notification(article_id, key, moderation_result, owner_id=None):
    """Send notification to administrators about moderation action"""
    if not ADMIN_SNS_TOPIC_ARN:
        print("⚠️ Admin SNS topic not configured, skipping admin notification")
        return False
    
    try:
        severity = moderation_result.get('maxSeverity', 'unknown')
        action = moderation_result.get('action', 'unknown')
        labels = moderation_result.get('labels', [])
        
        # Truncate article_id for subject line (SNS subject max 100 chars)
        short_article_id = article_id[:30] if len(article_id) > 30 else article_id
        
        message = f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 CONTENT MODERATION ALERT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Article ID: {article_id}
Owner ID: {owner_id or 'Unknown'}
Image: {key}
Action Taken: {action.upper()}
Severity: {severity.upper()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚫 DETECTED ISSUES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
        for label in labels:
            message += f"\n• {label['category']} > {label['label']} ({label['confidence']}%)"
        
        message += f"""

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Timestamp: {datetime.now(timezone.utc).isoformat()}

This is an automated alert from the Travel Guide content moderation system.
"""
        
        # Create short subject (SNS subject max is 100 characters)
        subject = f"[Moderation] {action.upper()} - {short_article_id}"
        
        print(f"📤 Sending admin notification via SNS...")
        print(f"   Topic: {ADMIN_SNS_TOPIC_ARN}")
        print(f"   Subject: {subject}")
        
        response = sns_client.publish(
            TopicArn=ADMIN_SNS_TOPIC_ARN,
            Subject=subject,
            Message=message
        )
        
        message_id = response.get('MessageId', 'unknown')
        print(f"✅ Admin notification sent successfully!")
        print(f"   Message ID: {message_id}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to send admin notification: {e}")
        import traceback
        traceback.print_exc()
        return False


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


def forward_to_next_queue(bucket, key, article_id, moderation_result):
    """Forward image to Detect Labels queue (new flow).
    
    After content moderation, forward to label detection for travel-focused tagging.
    """
    if not DETECT_LABELS_QUEUE_URL:
        print("Detect Labels queue URL not configured")
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
        
        # Send to Detect Labels queue
        sqs_client.send_message(
            QueueUrl=DETECT_LABELS_QUEUE_URL,
            MessageBody=json.dumps(s3_event),
            MessageAttributes={
                'articleId': {'StringValue': article_id, 'DataType': 'String'},
                'moderation': {'StringValue': moderation_result.get('moderationStatus', 'approved'), 'DataType': 'String'},
                'source': {'StringValue': 'content-moderator', 'DataType': 'String'}
            }
        )
        print(f"✓ Forwarded to Detect Labels queue: {key}")
        return True
    except Exception as e:
        print(f"Failed to forward to Detect Labels queue: {e}")
        return False


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
                    
                    # Skip folder/prefix objects (they end with /)
                    if key.endswith('/'):
                        print(f"Skipping folder object: {key}")
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
                        
                        action_result, owner_id = handle_moderation_failure(
                            bucket, key, article_id, moderation_result
                        )
                        
                        if action_result in results['actions']:
                            results['actions'][action_result] += 1
                        
                        # Always send admin notification for deleted/quarantined content
                        if action_result in ['deleted', 'quarantined']:
                            print(f"📧 Sending admin notification for {action_result} content")
                            send_admin_notification(article_id, key, moderation_result, owner_id)
                        elif moderation_result['maxSeverity'] in ['critical', 'high']:
                            print(f"📧 Sending admin notification for {moderation_result['maxSeverity']} severity")
                            send_admin_notification(article_id, key, moderation_result, owner_id)
                    
                    # Forward final status to notification queue
                    final_status = {
                        'moderationStatus': moderation_result.get('passed') and 'approved' or 'rejected',
                        'processed': True
                    }
                    forward_to_next_queue(bucket, key, article_id, final_status)
                
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