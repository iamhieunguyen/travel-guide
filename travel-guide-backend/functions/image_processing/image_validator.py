"""
UPDATED LAMBDA FUNCTIONS FOR SQS INTEGRATION
All functions updated to handle SQS events containing S3 notifications
"""

# ==============================================================================
# 1. IMAGE_VALIDATOR.PY - UPDATED
# ==============================================================================
"""
Image Validator
Validates uploaded images before processing
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
dynamodb = boto3.resource('dynamodb')

TABLE_NAME = os.environ.get('TABLE_NAME', '')
IMAGE_ANALYZER_QUEUE_URL = os.environ.get('IMAGE_ANALYZER_QUEUE_URL', '')
MAX_FILE_SIZE = int(os.environ.get('MAX_FILE_SIZE', str(10 * 1024 * 1024)))
MIN_FILE_SIZE = int(os.environ.get('MIN_FILE_SIZE', str(10 * 1024)))
MAX_DIMENSIONS = (int(os.environ.get('MAX_WIDTH', '8192')), 
                  int(os.environ.get('MAX_HEIGHT', '8192')))
MIN_DIMENSIONS = (int(os.environ.get('MIN_WIDTH', '200')), 
                  int(os.environ.get('MIN_HEIGHT', '200')))
ALLOWED_FORMATS = ['JPEG', 'PNG', 'WEBP']
ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']

table = dynamodb.Table(TABLE_NAME) if TABLE_NAME else None


class ImageValidationError(Exception):
    """Custom exception for image validation errors"""
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


def download_image_from_s3(bucket, key):
    """Download image from S3 and return as PIL Image object"""
    try:
        response = s3_client.get_object(Bucket=bucket, Key=key)
        image_data = response['Body'].read()
        image = Image.open(io.BytesIO(image_data))
        return image, image_data, len(image_data)
    except Exception as e:
        raise ImageValidationError(f"Failed to download image: {e}")


def validate_file_extension(filename):
    """Validate file extension"""
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ImageValidationError(
            f"Invalid file extension: {ext}. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    return ext


def validate_file_size(size):
    """Validate file size"""
    if size > MAX_FILE_SIZE:
        raise ImageValidationError(
            f"File too large: {size / 1024 / 1024:.2f}MB (max: {MAX_FILE_SIZE / 1024 / 1024:.0f}MB)"
        )
    
    if size < MIN_FILE_SIZE:
        raise ImageValidationError(
            f"File too small: {size / 1024:.2f}KB (min: {MIN_FILE_SIZE / 1024:.0f}KB)"
        )
    
    return True


def validate_image_format(image, image_data):
    """Validate image format and mode using the original bytes.

    Re-opening from bytes avoids relying on a possibly-closed PIL file pointer
    and ensures verify/load operate on a fresh in-memory buffer.
    """
    if image.format not in ALLOWED_FORMATS:
        raise ImageValidationError(
            f"Invalid format: {image.format}. Allowed: {', '.join(ALLOWED_FORMATS)}"
        )

    try:
        # Re-open from bytes and verify
        verified = Image.open(io.BytesIO(image_data))
        verified.verify()
        # verify() can remove image data from the object, so re-open again for actual use
        verified = Image.open(io.BytesIO(image_data))
        verified.load()
        return verified
    except Exception as e:
        raise ImageValidationError(f"Corrupted image: {e}")


def validate_dimensions(image):
    """Validate image dimensions"""
    width, height = image.size
    
    if width > MAX_DIMENSIONS[0] or height > MAX_DIMENSIONS[1]:
        raise ImageValidationError(
            f"Image too large: {width}x{height} (max: {MAX_DIMENSIONS[0]}x{MAX_DIMENSIONS[1]})"
        )
    
    if width < MIN_DIMENSIONS[0] or height < MIN_DIMENSIONS[1]:
        raise ImageValidationError(
            f"Image too small: {width}x{height} (min: {MIN_DIMENSIONS[0]}x{MIN_DIMENSIONS[1]})"
        )
    
    return width, height


def validate_aspect_ratio(width, height):
    """Validate aspect ratio"""
    aspect_ratio = width / height
    
    if aspect_ratio < 0.33 or aspect_ratio > 3.0:
        raise ImageValidationError(
            f"Invalid aspect ratio: {aspect_ratio:.2f} (width/height). "
            f"Allowed range: 0.33 to 3.0"
        )
    
    return aspect_ratio


def validate_color_mode(image):
    """Validate color mode"""
    valid_modes = ['RGB', 'RGBA', 'L']
    
    if image.mode not in valid_modes:
        print(f"Warning: Unusual color mode: {image.mode}")
        try:
            image = image.convert('RGB')
            print(f"Converted to RGB")
        except Exception as e:
            raise ImageValidationError(f"Invalid color mode: {image.mode}")
    
    return image


def check_image_quality(image):
    """Perform quality checks"""
    warnings = []
    width, height = image.size
    
    total_pixels = width * height
    if total_pixels < 100000:
        warnings.append(f"Low resolution: {width}x{height}")
    
    if image.mode == 'L':
        warnings.append("Image is grayscale")
    
    if image.mode == 'RGBA':
        alpha = image.split()[-1]
        alpha_min = alpha.getextrema()[0]
        if alpha_min < 255:
            warnings.append("Image has transparency")
    
    return warnings


def delete_invalid_image(bucket, key):
    """Delete invalid image from S3"""
    try:
        s3_client.delete_object(Bucket=bucket, Key=key)
        print(f"✓ Deleted invalid image: {key}")
        return True
    except Exception as e:
        print(f"Failed to delete image: {e}")
        return False


def update_article_validation_status(article_id, status, details):
    """Update article with validation status"""
    if not table or not article_id:
        return
    
    try:
        table.update_item(
            Key={'articleId': article_id},
            UpdateExpression='SET validationStatus = :status, validationDetails = :details',
            ExpressionAttributeValues={
                ':status': status,
                ':details': details
            }
        )
        print(f"✓ Updated article {article_id} validation status: {status}")
    except Exception as e:
        print(f"Failed to update article: {e}")


def forward_to_next_queue(bucket, key, article_id, validation_result):
    """Forward valid image to Image Analyzer queue"""
    if not IMAGE_ANALYZER_QUEUE_URL:
        print("Image Analyzer queue URL not configured")
        return False
    
    try:
        # Create S3 event message similar to S3 notification
        s3_event = {
            'Records': [{
                's3': {
                    'bucket': {'name': bucket},
                    'object': {'key': key}
                }
            }]
        }
        
        # Send to next queue
        sqs_client.send_message(
            QueueUrl=IMAGE_ANALYZER_QUEUE_URL,
            MessageBody=json.dumps(s3_event),
            MessageAttributes={
                'articleId': {'StringValue': article_id, 'DataType': 'String'},
                'validation': {'StringValue': 'passed', 'DataType': 'String'}
            }
        )
        print(f"✓ Forwarded to Image Analyzer queue: {key}")
        return True
    except Exception as e:
        print(f"Failed to forward to next queue: {e}")
        return False


def validate_image(bucket, key):
    """Main validation function"""
    validation_result = {
        'valid': False,
        'checks': {},
        'warnings': [],
        'error': None
    }
    
    try:
        print("Checking file extension...")
        ext = validate_file_extension(key)
        validation_result['checks']['extension'] = True
        validation_result['extension'] = ext
        
        print("Downloading image...")
        image, image_data, file_size = download_image_from_s3(bucket, key)
        validation_result['checks']['download'] = True
        validation_result['fileSize'] = file_size
        
        print(f"Checking file size: {file_size / 1024 / 1024:.2f}MB...")
        validate_file_size(file_size)
        validation_result['checks']['fileSize'] = True
        
        print(f"Validating format: {image.format}...")
        image = validate_image_format(image, image_data)
        validation_result['checks']['format'] = True
        validation_result['format'] = image.format
        
        print("Checking dimensions...")
        width, height = validate_dimensions(image)
        validation_result['checks']['dimensions'] = True
        validation_result['width'] = width
        validation_result['height'] = height
        
        print("Checking aspect ratio...")
        aspect_ratio = validate_aspect_ratio(width, height)
        validation_result['checks']['aspectRatio'] = True
        validation_result['aspectRatio'] = round(aspect_ratio, 2)
        
        print(f"Checking color mode: {image.mode}...")
        image = validate_color_mode(image)
        validation_result['checks']['colorMode'] = True
        validation_result['colorMode'] = image.mode
        
        warnings = check_image_quality(image)
        validation_result['warnings'] = warnings
        
        validation_result['valid'] = True
        print("✓ Image validation PASSED")
        
        return True, validation_result
        
    except ImageValidationError as e:
        print(f"✗ Validation failed: {e}")
        validation_result['valid'] = False
        validation_result['error'] = str(e)
        return False, validation_result
    except Exception as e:
        print(f"✗ Unexpected validation error: {e}")
        validation_result['valid'] = False
        validation_result['error'] = f"Unexpected error: {str(e)}"
        return False, validation_result


def lambda_handler(event, context):
    """
    *** UPDATED FOR SQS ***
    Lambda handler for image validation
    Triggered by SQS containing S3 events
    """
    print(f"Image Validator - Processing {len(event.get('Records', []))} SQS messages")
    
    results = {
        'processed': 0,
        'valid': 0,
        'invalid': 0,
        'deleted': 0,
        'errors': 0
    }
    
    failed_messages = []  # Track failed messages for SQS
    
    # Loop through SQS records
    for sqs_record in event.get('Records', []):
        try:
            # Parse S3 event from SQS message body
            s3_event = json.loads(sqs_record['body'])
            
            # Process each S3 record in the event
            for s3_record in s3_event.get('Records', []):
                try:
                    # Extract S3 information
                    bucket = s3_record['s3']['bucket']['name']
                    key = s3_record['s3']['object']['key']
                    
                    print(f"\n{'='*60}")
                    print(f"Validating: {key}")
                    print(f"{'='*60}")
                    
                    # Skip non-article images
                    if not key.startswith('articles/'):
                        print("Skipping non-article image")
                        continue
                    
                    # Skip thumbnails
                    if 'thumbnails/' in key:
                        print("Skipping thumbnail")
                        continue
                    
                    # Extract article ID
                    article_id = extract_article_id_from_key(key)
                    
                    # Validate image
                    is_valid, validation_details = validate_image(bucket, key)
                    
                    results['processed'] += 1
                    
                    if is_valid:
                        results['valid'] += 1
                        update_article_validation_status(article_id, 'valid', validation_details)
                        
                        # Forward to next queue
                        forward_to_next_queue(bucket, key, article_id, validation_details)
                        
                        if validation_details.get('warnings'):
                            print(f"Warnings: {', '.join(validation_details['warnings'])}")
                    else:
                        results['invalid'] += 1
                        update_article_validation_status(article_id, 'invalid', validation_details)
                        
                        if delete_invalid_image(bucket, key):
                            results['deleted'] += 1
                
                except Exception as e:
                    print(f"Error processing S3 record: {e}")
                    import traceback
                    traceback.print_exc()
                    # Don't fail entire SQS message for one S3 record
                    results['errors'] += 1
            
        except Exception as e:
            print(f"Error processing SQS record: {e}")
            import traceback
            traceback.print_exc()
            # Add to failed messages for retry
            failed_messages.append({
                'itemIdentifier': sqs_record['messageId']
            })
            results['errors'] += 1
    
    # Summary
    print(f"\n{'='*60}")
    print("IMAGE VALIDATION SUMMARY")
    print(f"{'='*60}")
    print(f"Processed: {results['processed']}")
    print(f"Valid: {results['valid']}")
    print(f"Invalid: {results['invalid']}")
    print(f"Deleted: {results['deleted']}")
    print(f"Errors: {results['errors']}")
    print(f"{'='*60}")
    
    # Return batch item failures for SQS partial batch response
    return {
        'batchItemFailures': failed_messages
    }