"""
Thumbnail Generator
Automatically creates thumbnails for uploaded images

Features:
- Multiple thumbnail sizes
- WebP format for better compression
- Maintains aspect ratio
- Smart cropping for square thumbnails
- Optimized quality settings
"""
import os
import sys
import json
import boto3
from PIL import Image
import io

# Add utils to path
sys.path.insert(0, '/var/task/functions')

# Initialize AWS clients
s3_client = boto3.client('s3')

# Environment variables
BUCKET_NAME = os.environ.get('BUCKET_NAME', '')

# Thumbnail configurations
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
    """
    Extract path, filename, and extension from S3 key
    Example: articles/abc-123.jpg -> ('articles', 'abc-123', '.jpg')
    """
    path = os.path.dirname(s3_key)
    filename = os.path.basename(s3_key)
    name, ext = os.path.splitext(filename)
    return path, name, ext


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
    """
    Create thumbnail with specified size
    
    Methods:
    - contain: Fit within bounds, maintain aspect ratio (recommended)
    - cover: Fill bounds, crop if needed
    - exact: Exact size, may distort
    """
    original_width, original_height = image.size
    target_width, target_height = size
    
    if method == 'contain':
        # Maintain aspect ratio, fit within bounds
        image.thumbnail(size, Image.Resampling.LANCZOS)
        
    elif method == 'cover':
        # Fill bounds, crop center if needed
        aspect_ratio = original_width / original_height
        target_ratio = target_width / target_height
        
        if aspect_ratio > target_ratio:
            # Image is wider, crop width
            new_width = int(original_height * target_ratio)
            offset = (original_width - new_width) // 2
            image = image.crop((offset, 0, offset + new_width, original_height))
        else:
            # Image is taller, crop height
            new_height = int(original_width / target_ratio)
            offset = (original_height - new_height) // 2
            image = image.crop((0, offset, original_width, offset + new_height))
        
        image = image.resize(size, Image.Resampling.LANCZOS)
        
    elif method == 'exact':
        # Exact size, may distort
        image = image.resize(size, Image.Resampling.LANCZOS)
    
    return image


def optimize_image(image):
    """
    Optimize image before saving
    - Convert RGBA to RGB with white background
    - Remove unnecessary metadata
    """
    # Handle transparency
    if image.mode in ('RGBA', 'LA', 'P'):
        # Create white background
        background = Image.new('RGB', image.size, (255, 255, 255))
        
        # Paste image on white background
        if image.mode == 'P':
            image = image.convert('RGBA')
        
        if image.mode in ('RGBA', 'LA'):
            background.paste(image, mask=image.split()[-1])  # Use alpha channel as mask
            image = background
    
    # Convert to RGB if needed
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    return image


def save_thumbnail_to_s3(image, bucket, key, quality=85):
    """
    Save thumbnail to S3 in WebP format
    """
    try:
        # Optimize image
        image = optimize_image(image)
        
        # Save to bytes buffer
        buffer = io.BytesIO()
        image.save(
            buffer,
            format='WEBP',
            quality=quality,
            method=6,  # Slowest but best compression
            optimize=True
        )
        buffer.seek(0)
        
        # Upload to S3
        s3_client.put_object(
            Bucket=bucket,
            Key=key,
            Body=buffer.getvalue(),
            ContentType='image/webp',
            CacheControl='max-age=31536000',  # Cache for 1 year
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
    """
    Generate multiple thumbnail sizes for an image
    """
    results = {
        'source': source_key,
        'thumbnails': [],
        'totalSize': 0,
        'success': True,
        'error': None
    }
    
    try:
        # Download original image
        print(f"Downloading: {source_key}")
        image = download_image_from_s3(bucket, source_key)
        original_size = image.size
        print(f"Original size: {original_size[0]}x{original_size[1]}")
        
        # Extract filename parts
        path, name, ext = extract_filename_parts(source_key)
        
        # Generate thumbnails for each size
        for config in THUMBNAIL_CONFIGS:
            print(f"\nGenerating {config['name']} thumbnail...")
            
            # Create thumbnail key
            thumbnail_key = f"thumbnails/{name}{config['suffix']}.webp"
            
            # Create thumbnail
            thumbnail = create_thumbnail(
                image.copy(),  # Copy to avoid modifying original
                config['size'],
                method='contain'
            )
            
            print(f"  Resized to: {thumbnail.size[0]}x{thumbnail.size[1]}")
            
            # Save to S3
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
        
        # Calculate compression ratio
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
    Lambda handler for thumbnail generation
    Triggered by S3 ObjectCreated events
    """
    print(f"Thumbnail Generator - Processing {len(event.get('Records', []))} images")
    
    summary = {
        'processed': 0,
        'succeeded': 0,
        'failed': 0,
        'totalThumbnails': 0,
        'totalSize': 0
    }
    
    for record in event.get('Records', []):
        try:
            # Extract S3 event details
            s3_info = record.get('s3', {})
            bucket = s3_info.get('bucket', {}).get('name')
            key = s3_info.get('object', {}).get('key')
            
            print(f"\n{'='*60}")
            print(f"Processing: {key}")
            print(f"{'='*60}")
            
            # Skip if already a thumbnail
            if key.startswith('thumbnails/'):
                print("Skipping: Already a thumbnail")
                continue
            
            # Skip if not in articles folder
            if not key.startswith('articles/'):
                print("Skipping: Not an article image")
                continue
            
            # Generate thumbnails
            results = generate_thumbnails(bucket, key)
            
            summary['processed'] += 1
            
            if results['success']:
                summary['succeeded'] += 1
                summary['totalThumbnails'] += len(results['thumbnails'])
                summary['totalSize'] += results['totalSize']
            else:
                summary['failed'] += 1
            
        except Exception as e:
            print(f"Error processing record: {e}")
            import traceback
            traceback.print_exc()
            summary['failed'] += 1
    
    # Final summary
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
        'statusCode': 200 if summary['failed'] == 0 else 207,
        'body': json.dumps(summary)
    }