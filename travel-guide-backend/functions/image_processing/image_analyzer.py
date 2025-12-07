"""
Image Analyzer
Extracts EXIF metadata and analyzes image properties
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
THUMBNAIL_QUEUE_URL = os.environ.get('THUMBNAIL_QUEUE_URL', '')
CONTENT_MODERATION_QUEUE_URL = os.environ.get('CONTENT_MODERATION_QUEUE_URL', '')
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


def download_image_from_s3(bucket, key):
    """Download image from S3"""
    try:
        response = s3_client.get_object(Bucket=bucket, Key=key)
        image_data = response['Body'].read()
        image = Image.open(io.BytesIO(image_data))
        return image, len(image_data)
    except Exception as e:
        raise Exception(f"Failed to download image: {e}")


def extract_exif_data(image):
    """Extract EXIF metadata from image"""
    exif_data = {}
    
    try:
        exif = image._getexif()
        
        if not exif:
            print("No EXIF data found")
            return exif_data
        
        for tag_id, value in exif.items():
            tag = TAGS.get(tag_id, tag_id)
            
            if isinstance(value, bytes):
                try:
                    value = value.decode('utf-8', errors='ignore')
                except:
                    value = str(value)
            
            exif_data[tag] = value
        
        print(f"✓ Extracted {len(exif_data)} EXIF fields")
        
    except AttributeError:
        print("Image has no EXIF data")
    except Exception as e:
        print(f"Error extracting EXIF: {e}")
    
    return exif_data


def convert_gps_to_degrees(value, ref):
    """Convert GPS coordinates to decimal degrees"""
    try:
        degrees = value[0]
        minutes = value[1]
        seconds = value[2]
        
        decimal = degrees + (minutes / 60.0) + (seconds / 3600.0)
        
        if ref in ['S', 'W']:
            decimal = -decimal
        
        return decimal
    except Exception as e:
        print(f"Error converting GPS: {e}")
        return None


def extract_gps_data(exif_data):
    """Extract GPS coordinates from EXIF data"""
    gps_info = {}
    
    if 'GPSInfo' not in exif_data:
        return None
    
    try:
        gps_data = {}
        for key, value in exif_data['GPSInfo'].items():
            tag = GPSTAGS.get(key, key)
            gps_data[tag] = value
        
        if 'GPSLatitude' in gps_data and 'GPSLatitudeRef' in gps_data:
            lat = convert_gps_to_degrees(
                gps_data['GPSLatitude'],
                gps_data['GPSLatitudeRef']
            )
            gps_info['latitude'] = lat
        
        if 'GPSLongitude' in gps_data and 'GPSLongitudeRef' in gps_data:
            lng = convert_gps_to_degrees(
                gps_data['GPSLongitude'],
                gps_data['GPSLongitudeRef']
            )
            gps_info['longitude'] = lng
        
        if 'GPSAltitude' in gps_data:
            altitude = float(gps_data['GPSAltitude'])
            gps_info['altitude'] = altitude
        
        if 'GPSDateStamp' in gps_data and 'GPSTimeStamp' in gps_data:
            date = gps_data['GPSDateStamp']
            time_parts = gps_data['GPSTimeStamp']
            time_str = f"{int(time_parts[0]):02d}:{int(time_parts[1]):02d}:{int(time_parts[2]):02d}"
            gps_info['timestamp'] = f"{date} {time_str}"
        
        if gps_info:
            print(f"✓ GPS: {gps_info.get('latitude', 'N/A'):.6f}, {gps_info.get('longitude', 'N/A'):.6f}")
        
        return gps_info if gps_info else None
        
    except Exception as e:
        print(f"Error extracting GPS: {e}")
        return None


def extract_camera_info(exif_data):
    """Extract camera and shooting information"""
    camera_info = {}
    
    if 'Make' in exif_data:
        camera_info['make'] = str(exif_data['Make']).strip()
    if 'Model' in exif_data:
        camera_info['model'] = str(exif_data['Model']).strip()
    
    if 'LensModel' in exif_data:
        camera_info['lens'] = str(exif_data['LensModel'])
    
    if 'FNumber' in exif_data:
        f_number = exif_data['FNumber']
        if isinstance(f_number, tuple):
            f_number = f_number[0] / f_number[1]
        camera_info['aperture'] = f"f/{f_number:.1f}"
    
    if 'ExposureTime' in exif_data:
        exposure = exif_data['ExposureTime']
        if isinstance(exposure, tuple):
            exposure = f"{exposure[0]}/{exposure[1]}"
        camera_info['shutterSpeed'] = str(exposure)
    
    if 'ISOSpeedRatings' in exif_data:
        camera_info['iso'] = exif_data['ISOSpeedRatings']
    
    if 'FocalLength' in exif_data:
        focal = exif_data['FocalLength']
        if isinstance(focal, tuple):
            focal = focal[0] / focal[1]
        camera_info['focalLength'] = f"{focal:.0f}mm"
    
    if 'DateTimeOriginal' in exif_data:
        camera_info['dateTaken'] = str(exif_data['DateTimeOriginal'])
    elif 'DateTime' in exif_data:
        camera_info['dateTaken'] = str(exif_data['DateTime'])
    
    return camera_info if camera_info else None


def analyze_dominant_colors(image, num_colors=5):
    """Extract dominant colors from image"""
    try:
        image_small = image.copy()
        image_small.thumbnail((150, 150))
        
        if image_small.mode != 'RGB':
            image_small = image_small.convert('RGB')
        
        pixels = list(image_small.getdata())
        color_counts = Counter(pixels)
        dominant = color_counts.most_common(num_colors)
        
        colors = []
        for color, count in dominant:
            r, g, b = color
            hex_color = f"#{r:02x}{g:02x}{b:02x}"
            percentage = (count / len(pixels)) * 100
            
            colors.append({
                'hex': hex_color,
                'rgb': {'r': r, 'g': g, 'b': b},
                'percentage': round(percentage, 2)
            })
        
        print(f"✓ Extracted {len(colors)} dominant colors")
        return colors
        
    except Exception as e:
        print(f"Error analyzing colors: {e}")
        return []


def calculate_quality_metrics(image, file_size):
    """Calculate image quality metrics"""
    width, height = image.size
    total_pixels = width * height
    
    metrics = {
        'resolution': {
            'width': width,
            'height': height,
            'megapixels': round(total_pixels / 1_000_000, 2)
        },
        'fileSize': {
            'bytes': file_size,
            'kilobytes': round(file_size / 1024, 2),
            'megabytes': round(file_size / 1024 / 1024, 2)
        },
        'aspectRatio': round(width / height, 2),
        'pixelDensity': round(file_size / total_pixels, 2),
        'format': image.format,
        'mode': image.mode
    }
    
    if metrics['resolution']['megapixels'] >= 12:
        metrics['qualityRating'] = 'excellent'
    elif metrics['resolution']['megapixels'] >= 8:
        metrics['qualityRating'] = 'good'
    elif metrics['resolution']['megapixels'] >= 3:
        metrics['qualityRating'] = 'medium'
    else:
        metrics['qualityRating'] = 'low'
    
    return metrics


def detect_editing(exif_data):
    """Detect if image was edited or processed"""
    editing_info = {
        'edited': False,
        'software': None,
        'indicators': []
    }
    
    if 'Software' in exif_data:
        software = str(exif_data['Software'])
        editing_info['software'] = software
        
        editing_software = [
            'Adobe Photoshop', 'GIMP', 'Lightroom', 'Snapseed',
            'Instagram', 'VSCO', 'Pixlr'
        ]
        
        if any(editor in software for editor in editing_software):
            editing_info['edited'] = True
            editing_info['indicators'].append('editing_software_detected')
    
    if 'ProcessingSoftware' in exif_data:
        editing_info['edited'] = True
        editing_info['indicators'].append('processing_software_found')
    
    return editing_info if editing_info['edited'] else None


def update_article_with_metadata(article_id, metadata):
    """Update article in DynamoDB with image metadata"""
    if not table or not article_id:
        return False
    
    try:
        def convert_floats(obj):
            if isinstance(obj, float):
                return Decimal(str(obj))
            elif isinstance(obj, dict):
                return {k: convert_floats(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [convert_floats(item) for item in obj]
            return obj
        
        metadata_converted = convert_floats(metadata)
        
        table.update_item(
            Key={'articleId': article_id},
            UpdateExpression='SET imageMetadata = :metadata, metadataExtractedAt = :timestamp',
            ExpressionAttributeValues={
                ':metadata': metadata_converted,
                ':timestamp': datetime.now(timezone.utc).isoformat()
            }
        )
        
        print(f"✓ Updated article {article_id} with metadata")
        return True
        
    except Exception as e:
        print(f"Failed to update article: {e}")
        import traceback
        traceback.print_exc()
        return False


def forward_to_next_queue(bucket, key, article_id, analysis):
    """Forward image to Content Moderation queue (new flow).

    Previous flow forwarded directly to Thumbnail Generator. After reordering,
    Image Analyzer should forward to Content Moderation for safety checks.
    """
    if not CONTENT_MODERATION_QUEUE_URL:
        print("Content Moderation queue URL not configured")
        return False

    try:
        # Create S3-style event payload for the next consumer
        s3_event = {
            'Records': [{
                's3': {
                    'bucket': {'name': bucket},
                    'object': {'key': key}
                }
            }]
        }

        # Send to Content Moderation queue
        sqs_client.send_message(
            QueueUrl=CONTENT_MODERATION_QUEUE_URL,
            MessageBody=json.dumps(s3_event),
            MessageAttributes={
                'articleId': {'StringValue': article_id, 'DataType': 'String'},
                'analysis': {'StringValue': json.dumps(analysis), 'DataType': 'String'},
                'source': {'StringValue': 'image-analyzer', 'DataType': 'String'}
            }
        )
        print(f"✓ Forwarded to Content Moderation queue: {key}")
        return True
    except Exception as e:
        print(f"Failed to forward to Content Moderation queue: {e}")
        return False


def analyze_image(bucket, key):
    """Main analysis function"""
    analysis = {
        'hasExif': False,
        'hasGPS': False,
        'hasCamera': False,
        'success': True
    }
    
    try:
        print("Downloading image...")
        image, file_size = download_image_from_s3(bucket, key)
        
        print("Extracting EXIF data...")
        exif_data = extract_exif_data(image)
        analysis['hasExif'] = len(exif_data) > 0
        
        if exif_data:
            print("Extracting GPS data...")
            gps_data = extract_gps_data(exif_data)
            if gps_data:
                analysis['gps'] = gps_data
                analysis['hasGPS'] = True
        
        if exif_data:
            print("Extracting camera info...")
            camera_info = extract_camera_info(exif_data)
            if camera_info:
                analysis['camera'] = camera_info
                analysis['hasCamera'] = True
        
        print("Analyzing dominant colors...")
        colors = analyze_dominant_colors(image)
        if colors:
            analysis['colors'] = colors
        
        print("Calculating quality metrics...")
        metrics = calculate_quality_metrics(image, file_size)
        analysis['quality'] = metrics
        
        if exif_data:
            print("Detecting editing...")
            editing = detect_editing(exif_data)
            if editing:
                analysis['editing'] = editing
        
        print("✓ Image analysis complete")
        
    except Exception as e:
        print(f"✗ Analysis failed: {e}")
        analysis['success'] = False
        analysis['error'] = str(e)
    
    return analysis


def lambda_handler(event, context):
    """
    *** UPDATED FOR SQS ***
    Lambda handler for image analysis
    Triggered by SQS containing S3 events
    """
    print(f"Image Analyzer - Processing {len(event.get('Records', []))} SQS messages")
    
    results = {
        'processed': 0,
        'succeeded': 0,
        'failed': 0,
        'withGPS': 0,
        'withCamera': 0
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
                    print(f"Analyzing: {key}")
                    print(f"{'='*60}")
                    
                    if not key.startswith('articles/'):
                        print("Skipping non-article image")
                        continue
                    
                    if 'thumbnails/' in key:
                        print("Skipping thumbnail")
                        continue
                    
                    # Skip folder/prefix objects (they end with /)
                    if key.endswith('/'):
                        print(f"Skipping folder object: {key}")
                        continue
                    
                    article_id = extract_article_id_from_key(key)
                    analysis = analyze_image(bucket, key)
                    
                    results['processed'] += 1
                    
                    if analysis['success']:
                        results['succeeded'] += 1
                        
                        if analysis.get('hasGPS'):
                            results['withGPS'] += 1
                        
                        if analysis.get('hasCamera'):
                            results['withCamera'] += 1
                        
                        update_article_with_metadata(article_id, analysis)
                        
                        # Forward to next queue
                        forward_to_next_queue(bucket, key, article_id, analysis)
                    else:
                        results['failed'] += 1
                
                except Exception as e:
                    print(f"Error processing S3 record: {e}")
                    import traceback
                    traceback.print_exc()
                    results['failed'] += 1
            
        except Exception as e:
            print(f"Error processing SQS record: {e}")
            import traceback
            traceback.print_exc()
            failed_messages.append({
                'itemIdentifier': sqs_record['messageId']
            })
            results['failed'] += 1
    
    print(f"\n{'='*60}")
    print("IMAGE ANALYSIS SUMMARY")
    print(f"{'='*60}")
    print(f"Processed: {results['processed']}")
    print(f"Succeeded: {results['succeeded']}")
    print(f"Failed: {results['failed']}")
    print(f"With GPS data: {results['withGPS']}")
    print(f"With camera data: {results['withCamera']}")
    print(f"{'='*60}")
    
    return {
        'batchItemFailures': failed_messages
    }