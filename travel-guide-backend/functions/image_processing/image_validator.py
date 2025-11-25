"""
Image Validator
Validates uploaded images before processing

Features:
- Check file size limits
- Validate image format (JPEG, PNG, WebP)
- Verify image dimensions
- Detect corrupted images
- Check aspect ratio
- Validate color space
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
dynamodb = boto3.resource('dynamodb')

# Environment variables
TABLE_NAME = os.environ.get('TABLE_NAME', '')
MAX_FILE_SIZE = int(os.environ.get('MAX_FILE_SIZE', str(10 * 1024 * 1024)))  # 10MB
MIN_FILE_SIZE = int(os.environ.get('MIN_FILE_SIZE', str(10 * 1024)))  # 10KB
MAX_DIMENSIONS = (int(os.environ.get('MAX_WIDTH', '8192')), 
                  int(os.environ.get('MAX_HEIGHT', '8192')))
MIN_DIMENSIONS = (int(os.environ.get('MIN_WIDTH', '200')), 
                  int(os.environ.get('MIN_HEIGHT', '200')))
ALLOWED_FORMATS = ['JPEG', 'PNG', 'WEBP']
ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']

# Initialize DynamoDB table
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
    """
    Download image from S3 and return as PIL Image object
    """
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


def validate_image_format(image):
    """Validate image format and mode"""
    # Check format
    if image.format not in ALLOWED_FORMATS:
        raise ImageValidationError(
            f"Invalid format: {image.format}. Allowed: {', '.join(ALLOWED_FORMATS)}"
        )
    
    # Check if image is corrupted
    try:
        image.verify()
        # Reopen after verify (verify() closes the image)
        image = Image.open(io.BytesIO(image.fp.read()))
    except Exception as e:
        raise ImageValidationError(f"Corrupted image: {e}")
    
    return image


def validate_dimensions(image):
    """Validate image dimensions"""
    width, height = image.size
    
    # Check maximum dimensions
    if width > MAX_DIMENSIONS[0] or height > MAX_DIMENSIONS[1]:
        raise ImageValidationError(
            f"Image too large: {width}x{height} (max: {MAX_DIMENSIONS[0]}x{MAX_DIMENSIONS[1]})"
        )
    
    # Check minimum dimensions
    if width < MIN_DIMENSIONS[0] or height < MIN_DIMENSIONS[1]:
        raise ImageValidationError(
            f"Image too small: {width}x{height} (min: {MIN_DIMENSIONS[0]}x{MIN_DIMENSIONS[1]})"
        )
    
    return width, height


def validate_aspect_ratio(width, height):
    """
    Validate aspect ratio
    Reject extremely wide or tall images
    """
    aspect_ratio = width / height
    
    # Allow aspect ratios between 1:3 and 3:1
    if aspect_ratio < 0.33 or aspect_ratio > 3.0:
        raise ImageValidationError(
            f"Invalid aspect ratio: {aspect_ratio:.2f} (width/height). "
            f"Allowed range: 0.33 to 3.0"
        )
    
    return aspect_ratio


def validate_color_mode(image):
    """
    Validate color mode
    Convert to RGB if needed
    """
    valid_modes = ['RGB', 'RGBA', 'L']  # RGB, RGBA (with alpha), Grayscale
    
    if image.mode not in valid_modes:
        print(f"Warning: Unusual color mode: {image.mode}")
        # Try to convert to RGB
        try:
            image = image.convert('RGB')
            print(f"Converted to RGB")
        except Exception as e:
            raise ImageValidationError(f"Invalid color mode: {image.mode}")
    
    return image


def check_image_quality(image):
    """
    Perform quality checks
    Returns warnings (not errors)
    """
    warnings = []
    width, height = image.size
    
    # Check if image is very low resolution
    total_pixels = width * height
    if total_pixels < 100000:  # Less than ~316x316
        warnings.append(f"Low resolution: {width}x{height}")
    
    # Check if image is grayscale
    if image.mode == 'L':
        warnings.append("Image is grayscale")
    
    # Check if image has alpha channel
    if image.mode == 'RGBA':
        # Check if alpha is actually used
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


def validate_image(bucket, key):
    """
    Main validation function
    Returns: (is_valid, details)
    """
    validation_result = {
        'valid': False,
        'checks': {},
        'warnings': [],
        'error': None
    }
    
    try:
        # Check 1: File extension
        print("Checking file extension...")
        ext = validate_file_extension(key)
        validation_result['checks']['extension'] = True
        validation_result['extension'] = ext
        
        # Check 2: Download and get size
        print("Downloading image...")
        image, image_data, file_size = download_image_from_s3(bucket, key)
        validation_result['checks']['download'] = True
        validation_result['fileSize'] = file_size
        
        # Check 3: File size
        print(f"Checking file size: {file_size / 1024 / 1024:.2f}MB...")
        validate_file_size(file_size)
        validation_result['checks']['fileSize'] = True
        
        # Check 4: Image format
        print(f"Validating format: {image.format}...")
        image = validate_image_format(image)
        validation_result['checks']['format'] = True
        validation_result['format'] = image.format
        
        # Check 5: Dimensions
        print("Checking dimensions...")
        width, height = validate_dimensions(image)
        validation_result['checks']['dimensions'] = True
        validation_result['width'] = width
        validation_result['height'] = height
        
        # Check 6: Aspect ratio
        print("Checking aspect ratio...")
        aspect_ratio = validate_aspect_ratio(width, height)
        validation_result['checks']['aspectRatio'] = True
        validation_result['aspectRatio'] = round(aspect_ratio, 2)
        
        # Check 7: Color mode
        print(f"Checking color mode: {image.mode}...")
        image = validate_color_mode(image)
        validation_result['checks']['colorMode'] = True
        validation_result['colorMode'] = image.mode
        
        # Check 8: Quality checks (warnings only)
        warnings = check_image_quality(image)
        validation_result['warnings'] = warnings
        
        # All checks passed
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
    Lambda handler for image validation
    Triggered by S3 ObjectCreated events
    """
    print(f"Image Validator - Processing {len(event.get('Records', []))} images")
    
    results = {
        'processed': 0,
        'valid': 0,
        'invalid': 0,
        'deleted': 0,
        'errors': 0
    }
    
    for record in event.get('Records', []):
        try:
            # Extract S3 event details
            s3_info = record.get('s3', {})
            bucket = s3_info.get('bucket', {}).get('name')
            key = s3_info.get('object', {}).get('key')
            
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
                # Image is valid
                results['valid'] += 1
                
                # Update article status
                update_article_validation_status(
                    article_id,
                    'valid',
                    validation_details
                )
                
                # Show warnings if any
                if validation_details.get('warnings'):
                    print(f"Warnings: {', '.join(validation_details['warnings'])}")
                
            else:
                # Image is invalid
                results['invalid'] += 1
                
                # Update article status
                update_article_validation_status(
                    article_id,
                    'invalid',
                    validation_details
                )
                
                # Delete invalid image
                if delete_invalid_image(bucket, key):
                    results['deleted'] += 1
            
        except Exception as e:
            print(f"Error processing record: {e}")
            import traceback
            traceback.print_exc()
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
    
    return {
        'statusCode': 200 if results['errors'] == 0 else 207,
        'body': json.dumps(results)
    }