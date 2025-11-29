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
sns_client = boto3.client('sns')
dynamodb = boto3.resource('dynamodb')
cloudwatch = boto3.client('logs')

# Environment variables
TABLE_NAME = os.environ.get('TABLE_NAME', '')
SNS_TOPIC_ARN = os.environ.get('SNS_TOPIC_ARN', '')
CLOUDFRONT_DOMAIN = os.environ.get('CLOUDFRONT_DOMAIN', '')

table = dynamodb.Table(TABLE_NAME) if TABLE_NAME else None


class NotificationError(Exception):
    """Custom exception for notification errors"""
    pass


def extract_article_id_from_key(s3_key):
    """Extract article ID from S3 key"""
    try:
        filename = s3_key.split('/')[-1]
        article_id = filename.rsplit('.', 1)[0]
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


def send_sns_notification(sns_topic_arn, subject, message, attributes=None):
    """Send notification via SNS"""
    if not sns_topic_arn:
        print("SNS topic ARN not configured")
        return False
    
    try:
        publish_args = {
            'TopicArn': sns_topic_arn,
            'Subject': subject,
            'Message': message
        }
        
        if attributes:
            publish_args['MessageAttributes'] = attributes
        
        response = sns_client.publish(**publish_args)
        message_id = response.get('MessageId')
        print(f"✓ SNS notification sent - Message ID: {message_id}")
        return True
    
    except Exception as e:
        print(f"Failed to send SNS notification: {e}")
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
        
        # Check if moderation passed (only notify on success or critical issues)
        moderation_status = article_data.get('moderationStatus', 'pending')
        
        if moderation_status == 'rejected':
            # Build error notification for rejected images
            error_details = {
                'type': 'moderation',
                'error': 'Image was rejected during content moderation. Please ensure your image complies with our guidelines.'
            }
            notification = build_error_notification(article_id, error_details)
        else:
            # Build success notification
            notification = build_success_notification(article_id, article_data)
        
        # Send SNS notification
        if notification.get('success') or notification.get('subject'):
            message_attributes = {
                'articleId': {
                    'StringValue': article_id,
                    'DataType': 'String'
                },
                'status': {
                    'StringValue': moderation_status,
                    'DataType': 'String'
                }
            }
            
            success = send_sns_notification(
                SNS_TOPIC_ARN,
                notification['subject'],
                notification['body'],
                message_attributes
            )
            
            if success:
                # Update article with notification sent timestamp
                update_article_notification_status(article_id, True)
                return True
        else:
            print(f"Failed to build notification: {notification.get('error', 'Unknown error')}")
            return False
    
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
