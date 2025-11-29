"""
Thumbnail Generator
Automatically creates thumbnails for uploaded images
"""
import os
import sys
import json
import boto3
from PIL import Image
import io

sys.path.insert(0, '/var/task/functions')

s3_client = boto3.client('s3')
sqs_client = boto3.client('sqs')

BUCKET_NAME = os.environ.get('BUCKET_NAME', '')
NOTIFY_WORKER_QUEUE_URL = os.environ.get('NOTIFY_WORKER_QUEUE_URL', '')

THUMBNAIL_CONFIGS = [
    {
        'name': 'small',
        'size': (256, 256),
        'quality': 85,
        'suffix': '_256'
    },
    {
        'name': 'medium',
        'size': (512, 512),
        'quality': 85,
        'suffix': '_512'
    },
    {
        'name': 'large',
        'size': (1024, 1024),
        'quality': 90,
        'suffix': '_1024'
    }
]


def extract_filename_parts(s3_key):
    """Extract path, filename, and extension from S3 key"""
    path = os.path.dirname(s3_key)
    filename = os.path.basename(s3_key)
    name, ext = os.path.splitext(filename)
    return path, name, ext


def forward_to_next_queue(bucket, key, article_id):
    """Forward image to Notify-Worker queue (final pipeline step).
    
    After thumbnail generation, forward to notification worker for email notification.
    """
    if not NOTIFY_WORKER_QUEUE_URL:
        print("Notify-Worker queue URL not configured")
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
        
        # Send to Notify-Worker queue
        sqs_client.send_message(
            QueueUrl=NOTIFY_WORKER_QUEUE_URL,
            MessageBody=json.dumps(s3_event),
            MessageAttributes={
                'articleId': {'StringValue': article_id, 'DataType': 'String'},
                'thumbnails': {'StringValue': 'generated', 'DataType': 'String'},
                'source': {'StringValue': 'thumbnail-generator', 'DataType': 'String'}
            }
        )
        print(f"✓ Forwarded to Notify-Worker queue: {key}")
        return True
    except Exception as e:
        print(f"Failed to forward to Notify-Worker queue: {e}")
        return False


def download_image_from_s3(bucket, key):
    """Download image from S3"""
    try:
        response = s3_client.get_object(Bucket=bucket, Key=key)
        image_data = response['Body'].read()
        image = Image.open(io.BytesIO(image_data))
        return image
    except Exception as e:
        raise Exception(f"Failed to download image: {e}")


def create_thumbnail(image, size, method='contain'):
    """Create thumbnail with specified size"""
    original_width, original_height = image.size
    target_width, target_height = size
    
    if method == 'contain':
        image.thumbnail(size, Image.Resampling.LANCZOS)
        
    elif method == 'cover':
        aspect_ratio = original_width / original_height
        target_ratio = target_width / target_height
        
        if aspect_ratio > target_ratio:
            new_width = int(original_height * target_ratio)
            offset = (original_width - new_width) // 2
            image = image.crop((offset, 0, offset + new_width, original_height))
        else:
            new_height = int(original_width / target_ratio)
            offset = (original_height - new_height) // 2
            image = image.crop((0, offset, original_width, offset + new_height))
        
        image = image.resize(size, Image.Resampling.LANCZOS)
        
    elif method == 'exact':
        image = image.resize(size, Image.Resampling.LANCZOS)
    
    return image


def optimize_image(image):
    """Optimize image before saving"""
    if image.mode in ('RGBA', 'LA', 'P'):
        background = Image.new('RGB', image.size, (255, 255, 255))
        
        if image.mode == 'P':
            image = image.convert('RGBA')
        
        if image.mode in ('RGBA', 'LA'):
            background.paste(image, mask=image.split()[-1])
            image = background
    
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    return image


def save_thumbnail_to_s3(image, bucket, key, quality=85):
    """Save thumbnail to S3 in WebP format"""
    try:
        image = optimize_image(image)
        
        buffer = io.BytesIO()
        image.save(
            buffer,
            format='WEBP',
            quality=quality,
            method=6,
            optimize=True
        )
        buffer.seek(0)
        
        s3_client.put_object(
            Bucket=bucket,
            Key=key,
            Body=buffer.getvalue(),
            ContentType='image/webp',
            CacheControl='max-age=31536000',
            Metadata={
                'thumbnail': 'true',
                'generated-by': 'thumbnail-generator'
            }
        )
        
        file_size = len(buffer.getvalue())
        print(f"  ✓ Saved: {key} ({file_size / 1024:.1f}KB)")
        
        return key, file_size
        
    except Exception as e:
        print(f"  ✗ Failed to save thumbnail: {e}")
        return None, 0


def generate_thumbnails(bucket, source_key):
    """Generate multiple thumbnail sizes for an image"""
    results = {
        'source': source_key,
        'thumbnails': [],
        'totalSize': 0,
        'success': True,
        'error': None
    }
    
    try:
        print(f"Downloading: {source_key}")
        image = download_image_from_s3(bucket, source_key)
        original_size = image.size
        print(f"Original size: {original_size[0]}x{original_size[1]}")
        
        path, name, ext = extract_filename_parts(source_key)
        
        for config in THUMBNAIL_CONFIGS:
            print(f"\nGenerating {config['name']} thumbnail...")
            
            thumbnail_key = f"thumbnails/{name}{config['suffix']}.webp"
            
            thumbnail = create_thumbnail(
                image.copy(),
                config['size'],
                method='contain'
            )
            
            print(f"  Resized to: {thumbnail.size[0]}x{thumbnail.size[1]}")
            
            saved_key, file_size = save_thumbnail_to_s3(
                thumbnail,
                bucket,
                thumbnail_key,
                quality=config['quality']
            )
            
            if saved_key:
                results['thumbnails'].append({
                    'key': saved_key,
                    'size': config['size'],
                    'actualSize': thumbnail.size,
                    'fileSize': file_size,
                    'name': config['name']
                })
                results['totalSize'] += file_size
        
        original_response = s3_client.head_object(Bucket=bucket, Key=source_key)
        original_file_size = original_response['ContentLength']
        compression_ratio = (1 - results['totalSize'] / original_file_size) * 100
        
        print(f"\n✓ Generated {len(results['thumbnails'])} thumbnails")
        print(f"  Total size: {results['totalSize'] / 1024:.1f}KB")
        print(f"  Compression: {compression_ratio:.1f}% smaller than original")
        
        results['compressionRatio'] = round(compression_ratio, 1)
        results['originalSize'] = original_file_size
        
    except Exception as e:
        print(f"✗ Failed to generate thumbnails: {e}")
        results['success'] = False
        results['error'] = str(e)
        import traceback
        traceback.print_exc()
    
    return results


def lambda_handler(event, context):
    """
    *** UPDATED FOR SQS ***
    Lambda handler for thumbnail generation
    Triggered by SQS containing S3 events
    """
    print(f"Thumbnail Generator - Processing {len(event.get('Records', []))} SQS messages")
    
    summary = {
        'processed': 0,
        'succeeded': 0,
        'failed': 0,
        'totalThumbnails': 0,
        'totalSize': 0
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
                    print(f"Processing: {key}")
                    print(f"{'='*60}")
                    
                    if key.startswith('thumbnails/'):
                        print("Skipping: Already a thumbnail")
                        continue
                    
                    if not key.startswith('articles/'):
                        print("Skipping: Not an article image")
                        continue
                    
                    results = generate_thumbnails(bucket, key)
                    
                    summary['processed'] += 1
                    
                    if results['success']:
                        summary['succeeded'] += 1
                        summary['totalThumbnails'] += len(results['thumbnails'])
                        summary['totalSize'] += results['totalSize']
                        
                        # Extract article ID
                        article_id = extract_filename_parts(key)[1]
                        
                        # Forward to next queue
                        forward_to_next_queue(bucket, key, article_id)
                    else:
                        summary['failed'] += 1
                
                except Exception as e:
                    print(f"Error processing S3 record: {e}")
                    import traceback
                    traceback.print_exc()
                    summary['failed'] += 1
            
        except Exception as e:
            print(f"Error processing SQS record: {e}")
            import traceback
            traceback.print_exc()
            failed_messages.append({
                'itemIdentifier': sqs_record['messageId']
            })
            summary['failed'] += 1
    
    print(f"\n{'='*60}")
    print("THUMBNAIL GENERATION SUMMARY")
    print(f"{'='*60}")
    print(f"Images processed: {summary['processed']}")
    print(f"Succeeded: {summary['succeeded']}")
    print(f"Failed: {summary['failed']}")
    print(f"Total thumbnails created: {summary['totalThumbnails']}")
    print(f"Total thumbnail size: {summary['totalSize'] / 1024:.1f}KB")
    print(f"{'='*60}")
    
    return {
        'batchItemFailures': failed_messages
    }