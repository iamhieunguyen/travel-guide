"""
Notify-Worker Lambda Function
Final step in the image processing pipeline
Sends formatted processing status notifications to users via SNS and email
"""
import os
import sys
import json
import boto3
from datetime import datetime, timezone
from decimal import Decimal

sys.path.insert(0, '/var/task/functions')

# Initialize AWS clients
ses_client = boto3.client('ses')
dynamodb = boto3.resource('dynamodb')
cloudwatch = boto3.client('logs')
cognito_client = boto3.client('cognito-idp')

# Environment variables
TABLE_NAME = os.environ.get('TABLE_NAME', '')
USER_PROFILES_TABLE = os.environ.get('USER_PROFILES_TABLE', '')
USER_POOL_ID = os.environ.get('USER_POOL_ID', '')
CLOUDFRONT_DOMAIN = os.environ.get('CLOUDFRONT_DOMAIN', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'khiem120805@gmail.com')

table = dynamodb.Table(TABLE_NAME) if TABLE_NAME else None
user_profiles_table = dynamodb.Table(USER_PROFILES_TABLE) if USER_PROFILES_TABLE else None


class NotificationError(Exception):
    """Custom exception for notification errors"""
    pass


def extract_article_id_from_key(s3_key):
    """Extract article ID from S3 key
    
    Supports two formats:
    - Old: articles/{articleId}.jpg → articleId
    - New: articles/{articleId}_{imageId}.jpg → articleId (before first underscore)
    """
    try:
        filename = s3_key.split('/')[-1]  # Get filename
        name_without_ext = filename.rsplit('.', 1)[0]  # Remove extension
        
        # Check if it's new format with underscore (articleId_imageId)
        if '_' in name_without_ext:
            # New format: extract articleId (before first underscore)
            article_id = name_without_ext.split('_')[0]
            print(f"  Extracted articleId (new format): {article_id}")
        else:
            # Old format: just articleId
            article_id = name_without_ext
            print(f"  Extracted articleId (old format): {article_id}")
        
        return article_id
    except Exception as e:
        print(f"Failed to extract article ID: {e}")
        return None


def get_article_details(article_id):
    """Retrieve article details from DynamoDB"""
    if not table or not article_id:
        return None
    
    try:
        response = table.get_item(Key={'articleId': article_id})
        return response.get('Item')
    except Exception as e:
        print(f"Failed to retrieve article {article_id}: {e}")
        return None

def get_user_email(owner_id):
    """Get user email from AWS Cognito"""
    if not USER_POOL_ID or not owner_id:
        print(f"Missing USER_POOL_ID or owner_id")
        return None
    
    try:
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
                print(f"✓ Found email for user {owner_id}: {email}")
                return email
        
        print(f"⚠️ No email attribute found for user {owner_id}")
        return None
    except cognito_client.exceptions.UserNotFoundException:
        print(f"⚠️ User {owner_id} not found in Cognito")
        return None
    except Exception as e:
        print(f"Failed to get user email from Cognito: {e}")
        import traceback
        traceback.print_exc()
        return None


def build_success_notification(article_id, article_data):
    """Build successful processing notification"""
    try:
        # Extract processing metadata
        validation_status = article_data.get('validationStatus', 'unknown')
        auto_tags = article_data.get('autoTags', [])
        moderation_status = article_data.get('moderationStatus', 'pending')
        image_metadata = article_data.get('imageMetadata', {})
        label_details = article_data.get('labelDetails', [])
        
        # Build email subject and body
        subject = f"✅ Your Travel Image '{article_id}' Successfully Processed"
        
        body = f"""
Hello,

Your travel image has been successfully processed and is now live on our platform!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📸 IMAGE PROCESSING SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Article ID: {article_id}
Processing Completed: {datetime.now(timezone.utc).isoformat()}

✓ VALIDATION STATUS: {validation_status.upper()}
✓ MODERATION STATUS: {moderation_status.upper()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏷️ AUTO-DETECTED TAGS ({len(auto_tags)} tags)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{format_tags(auto_tags, label_details)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 IMAGE METADATA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{format_metadata(image_metadata)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📷 THUMBNAILS GENERATED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Small (256px):   https://{CLOUDFRONT_DOMAIN}/thumbnails/{article_id}_256.webp
Medium (512px):  https://{CLOUDFRONT_DOMAIN}/thumbnails/{article_id}_512.webp
Large (1024px):  https://{CLOUDFRONT_DOMAIN}/thumbnails/{article_id}_1024.webp

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your image is now visible on the platform and eligible for the popular page ranking.

Thank you for sharing your travel stories!

Best regards,
Travel Guide Team
"""
        
        return {
            'success': True,
            'subject': subject,
            'body': body,
            'tags': auto_tags,
            'status': moderation_status
        }
    
    except Exception as e:
        print(f"Error building success notification: {e}")
        return {
            'success': False,
            'error': str(e)
        }


def build_error_notification(article_id, error_details):
    """Build error notification"""
    try:
        error_message = error_details.get('error', 'Unknown error')
        error_type = error_details.get('type', 'processing')
        
        subject = f"⚠️ Image Processing Failed: '{article_id}'"
        
        body = f"""
Hello,

Unfortunately, there was an issue processing your travel image. Here are the details:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ ERROR DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Article ID: {article_id}
Error Type: {error_type.upper()}
Timestamp: {datetime.now(timezone.utc).isoformat()}

Error Message:
{error_message}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Our team has been notified and will investigate this issue. You can try uploading again or contact support if the problem persists.

Best regards,
Travel Guide Team
"""
        
        return {
            'success': False,
            'subject': subject,
            'body': body,
            'error': error_message
        }
    
    except Exception as e:
        print(f"Error building error notification: {e}")
        return {
            'success': False,
            'error': str(e)
        }


def format_tags(tags, label_details):
    """Format tags with confidence scores"""
    if not tags:
        return "No tags detected"
    
    lines = []
    for i, tag in enumerate(tags[:10], 1):  # Show top 10 tags
        # Find matching label detail for confidence and priority
        label_info = next((ld for ld in label_details if ld.get('name') == tag), {})
        confidence = label_info.get('confidence', 0)
        priority = label_info.get('priority', 'unknown')
        
        lines.append(f"{i}. {tag.title()} — Confidence: {confidence}% | Priority: {priority}")
    
    if len(tags) > 10:
        lines.append(f"\n... and {len(tags) - 10} more tags")
    
    return "\n".join(lines)


def format_metadata(metadata):
    """Format image metadata nicely"""
    if not metadata:
        return "No metadata available"
    
    quality = metadata.get('quality', {})
    resolution = quality.get('resolution', {})
    colors = metadata.get('colors', [])
    gps = metadata.get('gps')
    camera = metadata.get('camera', {})
    
    lines = []
    
    # Resolution and quality
    if resolution:
        width = resolution.get('width', 'N/A')
        height = resolution.get('height', 'N/A')
        megapixels = resolution.get('megapixels', 'N/A')
        lines.append(f"Resolution: {width}x{height} ({megapixels} MP)")
    
    quality_rating = quality.get('qualityRating', 'unknown')
    lines.append(f"Quality: {quality_rating.upper()}")
    
    # Colors
    if colors:
        top_colors = ", ".join([c.get('hex', '#000000') for c in colors[:3]])
        lines.append(f"Dominant Colors: {top_colors}")
    
    # GPS
    if gps:
        lat = gps.get('latitude', 'N/A')
        lng = gps.get('longitude', 'N/A')
        lines.append(f"GPS: {lat}, {lng}")
    
    # Camera info
    if camera:
        make = camera.get('make', 'N/A')
        model = camera.get('model', 'N/A')
        lines.append(f"Camera: {make} {model}")
    
    return "\n".join(lines) if lines else "No metadata available"


def send_email_notification(recipient_email, subject, body_text):
    """Send notification via SES"""
    if not recipient_email:
        print("No recipient email provided")
        return False
    
    try:
        response = ses_client.send_email(
            Source=SENDER_EMAIL,
            Destination={'ToAddresses': [recipient_email]},
            Message={
                'Subject': {'Data': subject, 'Charset': 'UTF-8'},
                'Body': {'Text': {'Data': body_text, 'Charset': 'UTF-8'}}
            }
        )
        
        message_id = response.get('MessageId')
        print(f"✓ Email sent to {recipient_email} - Message ID: {message_id}")
        return True
    
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False


def update_article_notification_status(article_id, notified=True, notification_sent_at=None):
    """Update article with notification status"""
    if not table or not article_id:
        return
    
    try:
        table.update_item(
            Key={'articleId': article_id},
            UpdateExpression='SET notificationSent = :notified, notificationSentAt = :timestamp',
            ExpressionAttributeValues={
                ':notified': notified,
                ':timestamp': notification_sent_at or datetime.now(timezone.utc).isoformat()
            }
        )
        print(f"✓ Updated article {article_id} notification status")
    except Exception as e:
        print(f"Failed to update article notification status: {e}")


def process_notification_message(bucket, key, article_id, final_status):
    """Main notification processing function"""
    print(f"\n{'='*60}")
    print(f"Processing notification for: {article_id}")
    print(f"{'='*60}")
    
    try:
        # Get article details
        article_data = get_article_details(article_id)
        if not article_data:
            print(f"⚠️ Article {article_id} not found in DynamoDB")
            return False
        
        # Get owner email
        owner_id = article_data.get('ownerId')
        if not owner_id:
            print(f"⚠️ No owner ID found for article {article_id}")
            return False
        
        user_email = get_user_email(owner_id)
        if not user_email:
            print(f"⚠️ No email found for user {owner_id}")
            return False
        
        # Check moderation status
        moderation_status = article_data.get('moderationStatus', 'pending')
        
        # Only send success notifications (deletion notifications are sent by content_moderation)
        if moderation_status == 'approved':
            # Build success notification
            notification = build_success_notification(article_id, article_data)
            
            if notification.get('success'):
                success = send_email_notification(
                    user_email,
                    notification['subject'],
                    notification['body']
                )
                
                if success:
                    update_article_notification_status(article_id, True)
                    return True
            else:
                print(f"Failed to build notification: {notification.get('error', 'Unknown error')}")
                return False
        else:
            print(f"Skipping notification for status: {moderation_status}")
            return True  # Not an error, just skipping
    
    except Exception as e:
        print(f"Error processing notification: {e}")
        import traceback
        traceback.print_exc()
        return False


def lambda_handler(event, context):
    """
    Lambda handler for notification worker
    Triggered by SQS containing S3 event messages from thumbnail generator
    New pipeline format: receives direct S3 event, not wrapped in status envelope
    """
    print(f"Notify-Worker - Processing {len(event.get('Records', []))} SQS messages")
    
    results = {
        'processed': 0,
        'sent': 0,
        'failed': 0,
        'errors': 0
    }
    
    failed_messages = []
    
    # Loop through SQS records
    for sqs_record in event.get('Records', []):
        try:
            # Parse message body - new pipeline sends S3 event directly
            message_body = json.loads(sqs_record['body'])
            
            # Handle both old format (with s3_event wrapper) and new format (direct Records)
            if 's3_event' in message_body:
                # Old format with wrapper
                s3_records = message_body.get('s3_event', {}).get('Records', [])
                status = message_body.get('status', {})
            else:
                # New format - direct S3 event
                s3_records = message_body.get('Records', [])
                status = {}
            
            print(f"Processing {len(s3_records)} S3 records")
            
            for s3_record in s3_records:
                try:
                    bucket = s3_record['s3']['bucket']['name']
                    key = s3_record['s3']['object']['key']
                    
                    print(f"Processing notification for: {key}")
                    
                    # Extract article ID
                    article_id = extract_article_id_from_key(key)
                    if not article_id:
                        print(f"Could not extract article ID from key: {key}")
                        results['errors'] += 1
                        continue
                    
                    print(f"Article ID: {article_id}")
                    
                    # Process notification
                    success = process_notification_message(bucket, key, article_id, status)
                    
                    results['processed'] += 1
                    if success:
                        results['sent'] += 1
                    else:
                        results['failed'] += 1
                
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
    
    # Summary
    print(f"\n{'='*60}")
    print("NOTIFICATION SUMMARY")
    print(f"{'='*60}")
    print(f"Processed: {results['processed']}")
    print(f"Notifications Sent: {results['sent']}")
    print(f"Failed: {results['failed']}")
    print(f"Errors: {results['errors']}")
    print(f"{'='*60}")
    
    return {
        'batchItemFailures': failed_messages
    }
