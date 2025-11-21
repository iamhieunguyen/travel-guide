import boto3
import os
from PIL import Image, ImageOps
import io
import json
import time
import traceback

# Environment variables
BUCKET_NAME = os.environ['BUCKET_NAME']

# Initialize S3 client
s3 = boto3.client('s3')

def generate_thumbnail(image_content, format='WEBP', quality=85, size=(256, 256)):
    """Generate thumbnail from image content"""
    try:
        # Open image
        image = Image.open(io.BytesIO(image_content))
        
        # Convert to RGB if necessary (for PNG with alpha channel)
        if image.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', image.size, (255, 255, 255))
            if image.mode == 'P':
                image = image.convert('RGBA')
            if image.mode == 'RGBA':
                background.paste(image, mask=image.split()[-1])
            image = background
        
        # Create a copy for thumbnail
        thumbnail = image.copy()
        
        # Resize image maintaining aspect ratio
        thumbnail.thumbnail(size, Image.Resampling.LANCZOS)
        
        # Save to bytes buffer
        buffer = io.BytesIO()
        if format == 'WEBP':
            thumbnail.save(buffer, format=format, optimize=True, quality=quality, method=6)
        else:
            thumbnail.save(buffer, format=format, optimize=True, quality=quality)
        
        buffer.seek(0)
        
        return buffer.getvalue()
    except Exception as e:
        print(f"Error generating thumbnail: {e}")
        traceback.print_exc()
        raise

def process_image_record(record):
    """Process a single S3 record"""
    bucket = record['s3']['bucket']['name']
    key = record['s3']['object']['key']
    
    # Only process images in articles folder and not already thumbnails
    if not key.startswith('articles/') or key.startswith('thumbnails/'):
        print(f"Skipping non-article or thumbnail file: {key}")
        return False
    
    try:
        print(f"Processing image: {key}")
        
        # Get image from S3 with retry logic
        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = s3.get_object(Bucket=bucket, Key=key)
                break
            except Exception as e:
                if attempt == max_retries - 1:
                    raise
                print(f"Attempt {attempt+1} failed: {e}. Retrying...")
                time.sleep(1 * (attempt + 1))
        
        image_content = response['Body'].read()
        content_type = response['ContentType']
        
        # Generate thumbnail key
        base_filename = os.path.basename(key)
        stem = os.path.splitext(base_filename)[0]
        thumbnail_key = f"thumbnails/{stem}_256.webp"
        
        # Generate thumbnail
        thumbnail_data = generate_thumbnail(image_content)
        
        # Upload thumbnail to S3
        s3.put_object(
            Bucket=bucket,
            Key=thumbnail_key,
            Body=thumbnail_data,
            ContentType='image/webp',
            ACL='private'
        )
        
        print(f"Successfully created thumbnail: {thumbnail_key}")
        return True
    except Exception as e:
        print(f"Error processing {key}: {e}")
        traceback.print_exc()
        return False

def lambda_handler(event, context):
    """Lambda handler for thumbnail generation"""
    success_count = 0
    failure_count = 0
    
    for record in event['Records']:
        if process_image_record(record):
            success_count += 1
        else:
            failure_count += 1
    
    result = {
        'statusCode': 200,
        'body': json.dumps({
            'message': 'Thumbnail processing completed',
            'successCount': success_count,
            'failureCount': failure_count
        })
    }
    
    # If all failures, return error status
    if success_count == 0 and failure_count > 0:
        result['statusCode'] = 500
    
    return result