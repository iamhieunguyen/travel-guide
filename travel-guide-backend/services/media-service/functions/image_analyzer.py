"""
Image Analyzer - Extracts EXIF metadata and analyzes image properties
"""
import os
import sys
import json
import boto3
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
import io
from datetime import datetime, timezone
from decimal import Decimal
from collections import Counter

sys.path.insert(0, '/var/task/functions')

s3_client = boto3.client('s3')
sqs_client = boto3.client('sqs')
dynamodb = boto3.resource('dynamodb')

TABLE_NAME = os.environ.get('TABLE_NAME', '')
CONTENT_MODERATION_QUEUE_URL = os.environ.get('CONTENT_MODERATION_QUEUE_URL', '')
table = dynamodb.Table(TABLE_NAME) if TABLE_NAME else None


def extract_article_id_from_key(s3_key):
    try:
        filename = s3_key.split('/')[-1]
        return filename.rsplit('.', 1)[0]
    except Exception:
        return None


def download_image_from_s3(bucket, key):
    response = s3_client.get_object(Bucket=bucket, Key=key)
    image_data = response['Body'].read()
    return Image.open(io.BytesIO(image_data)), len(image_data)


def extract_exif_data(image):
    exif_data = {}
    try:
        exif = image._getexif()
        if exif:
            for tag_id, value in exif.items():
                tag = TAGS.get(tag_id, tag_id)
                if isinstance(value, bytes):
                    value = value.decode('utf-8', errors='ignore')
                exif_data[tag] = value
    except Exception:
        pass
    return exif_data


def extract_gps_data(exif_data):
    if 'GPSInfo' not in exif_data:
        return None
    try:
        gps_data = {GPSTAGS.get(k, k): v for k, v in exif_data['GPSInfo'].items()}
        gps_info = {}
        
        if 'GPSLatitude' in gps_data and 'GPSLatitudeRef' in gps_data:
            lat = gps_data['GPSLatitude']
            ref = gps_data['GPSLatitudeRef']
            decimal = lat[0] + lat[1]/60 + lat[2]/3600
            gps_info['latitude'] = -decimal if ref == 'S' else decimal
        
        if 'GPSLongitude' in gps_data and 'GPSLongitudeRef' in gps_data:
            lng = gps_data['GPSLongitude']
            ref = gps_data['GPSLongitudeRef']
            decimal = lng[0] + lng[1]/60 + lng[2]/3600
            gps_info['longitude'] = -decimal if ref == 'W' else decimal
        
        return gps_info if gps_info else None
    except Exception:
        return None


def extract_camera_info(exif_data):
    camera_info = {}
    mappings = {'Make': 'make', 'Model': 'model', 'LensModel': 'lens', 'ISOSpeedRatings': 'iso', 'DateTimeOriginal': 'dateTaken'}
    
    for exif_key, info_key in mappings.items():
        if exif_key in exif_data:
            camera_info[info_key] = str(exif_data[exif_key]).strip()
    
    if 'FNumber' in exif_data:
        f = exif_data['FNumber']
        camera_info['aperture'] = f"f/{f[0]/f[1]:.1f}" if isinstance(f, tuple) else f"f/{f:.1f}"
    
    if 'FocalLength' in exif_data:
        f = exif_data['FocalLength']
        camera_info['focalLength'] = f"{f[0]/f[1]:.0f}mm" if isinstance(f, tuple) else f"{f:.0f}mm"
    
    return camera_info if camera_info else None


def analyze_dominant_colors(image, num_colors=5):
    try:
        img = image.copy()
        img.thumbnail((150, 150))
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        pixels = list(img.getdata())
        color_counts = Counter(pixels)
        
        colors = []
        for (r, g, b), count in color_counts.most_common(num_colors):
            colors.append({
                'hex': f"#{r:02x}{g:02x}{b:02x}",
                'rgb': {'r': r, 'g': g, 'b': b},
                'percentage': round((count / len(pixels)) * 100, 2)
            })
        return colors
    except Exception:
        return []


def calculate_quality_metrics(image, file_size):
    width, height = image.size
    megapixels = (width * height) / 1_000_000
    
    quality_rating = 'low'
    if megapixels >= 12:
        quality_rating = 'excellent'
    elif megapixels >= 8:
        quality_rating = 'good'
    elif megapixels >= 3:
        quality_rating = 'medium'
    
    return {
        'resolution': {'width': width, 'height': height, 'megapixels': round(megapixels, 2)},
        'fileSize': {'bytes': file_size, 'megabytes': round(file_size / 1024 / 1024, 2)},
        'aspectRatio': round(width / height, 2),
        'qualityRating': quality_rating
    }


def analyze_image(bucket, key):
    analysis = {'hasExif': False, 'hasGPS': False, 'hasCamera': False, 'success': True}
    
    try:
        image, file_size = download_image_from_s3(bucket, key)
        exif_data = extract_exif_data(image)
        analysis['hasExif'] = len(exif_data) > 0
        
        if exif_data:
            gps = extract_gps_data(exif_data)
            if gps:
                analysis['gps'] = gps
                analysis['hasGPS'] = True
            
            camera = extract_camera_info(exif_data)
            if camera:
                analysis['camera'] = camera
                analysis['hasCamera'] = True
        
        analysis['colors'] = analyze_dominant_colors(image)
        analysis['quality'] = calculate_quality_metrics(image, file_size)
    except Exception as e:
        analysis['success'] = False
        analysis['error'] = str(e)
    
    return analysis


def update_article_with_metadata(article_id, metadata):
    if not table or not article_id:
        return False
    try:
        def convert_floats(obj):
            if isinstance(obj, float):
                return Decimal(str(obj))
            elif isinstance(obj, dict):
                return {k: convert_floats(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [convert_floats(i) for i in obj]
            return obj
        
        table.update_item(
            Key={'articleId': article_id},
            UpdateExpression='SET imageMetadata = :m, metadataExtractedAt = :t',
            ExpressionAttributeValues={
                ':m': convert_floats(metadata),
                ':t': datetime.now(timezone.utc).isoformat()
            }
        )
        return True
    except Exception:
        return False


def forward_to_next_queue(bucket, key, article_id):
    if not CONTENT_MODERATION_QUEUE_URL:
        return False
    try:
        sqs_client.send_message(
            QueueUrl=CONTENT_MODERATION_QUEUE_URL,
            MessageBody=json.dumps({'Records': [{'s3': {'bucket': {'name': bucket}, 'object': {'key': key}}}]}),
            MessageAttributes={'articleId': {'StringValue': article_id, 'DataType': 'String'}}
        )
        return True
    except Exception:
        return False


def lambda_handler(event, context):
    results = {'processed': 0, 'succeeded': 0, 'failed': 0}
    failed_messages = []
    
    for sqs_record in event.get('Records', []):
        try:
            s3_event = json.loads(sqs_record['body'])
            
            for s3_record in s3_event.get('Records', []):
                try:
                    bucket = s3_record['s3']['bucket']['name']
                    key = s3_record['s3']['object']['key']
                    
                    if not key.startswith('articles/') or 'thumbnails/' in key or key.endswith('/'):
                        continue
                    
                    article_id = extract_article_id_from_key(key)
                    analysis = analyze_image(bucket, key)
                    results['processed'] += 1
                    
                    if analysis['success']:
                        results['succeeded'] += 1
                        update_article_with_metadata(article_id, analysis)
                        forward_to_next_queue(bucket, key, article_id)
                    else:
                        results['failed'] += 1
                except Exception:
                    results['failed'] += 1
        except Exception:
            failed_messages.append({'itemIdentifier': sqs_record['messageId']})
            results['failed'] += 1
    
    print(f"ImageAnalyzer: processed={results['processed']}, succeeded={results['succeeded']}, failed={results['failed']}")
    return {'batchItemFailures': failed_messages}
