import boto3
import os
from PIL import Image
import io
import json
from utils.geo_utils import convert_decimals

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
            background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
            image = background
        
        # Resize image maintaining aspect ratio
        image.thumbnail(size, Image.Resampling.LANCZOS)
        
        # Save to bytes buffer
        buffer = io.BytesIO()
        image.save(buffer, format=format, optimize=True, quality=quality)
        buffer.seek(0)
        
        return buffer.getvalue()
    except Exception as e:
        print(f"Error generating thumbnail: {e}")
        raise

def lambda_handler(event, context):
    """Lambda handler for thumbnail generation"""
    for record in event['Records']:
        try:
            # Get bucket and key from event
            bucket = record['s3']['bucket']['name']
            key = record['s3']['object']['key']
            
            # Only process images in articles folder and not already thumbnails
            if not key.startswith('articles/') or key.startswith('thumbnails/'):
                print(f"Skipping non-article or thumbnail file: {key}")
                continue
            
            print(f"Processing image: {key}")
            
            # Get image from S3
            response = s3.get_object(Bucket=bucket, Key=key)
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
            
        except Exception as e:
            print(f"Error processing {key}: {e}")
            # Don't return error to avoid blocking other records
            continue
    
    return {
        'statusCode': 200,
        'body': json.dumps('Thumbnails processed successfully')
    }