"""
Image Validator - Validates uploaded images before processing
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
MAX_DIMENSIONS = (int(os.environ.get('MAX_WIDTH', '8192')), int(os.environ.get('MAX_HEIGHT', '8192')))
MIN_DIMENSIONS = (int(os.environ.get('MIN_WIDTH', '200')), int(os.environ.get('MIN_HEIGHT', '200')))
ALLOWED_FORMATS = ['JPEG', 'PNG', 'WEBP']
ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']

table = dynamodb.Table(TABLE_NAME) if TABLE_NAME else None


class ImageValidationError(Exception):
    pass


def extract_article_id_from_key(s3_key):
    try:
        filename = s3_key.split('/')[-1]
        return filename.rsplit('.', 1)[0]
    except Exception:
        return None


def validate_image(bucket, key):
    result = {'valid': False, 'checks': {}, 'warnings': [], 'error': None}
    
    try:
        ext = os.path.splitext(key)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise ImageValidationError(f"Invalid extension: {ext}")
        result['checks']['extension'] = True
        
        response = s3_client.get_object(Bucket=bucket, Key=key)
        image_data = response['Body'].read()
        file_size = len(image_data)
        
        if file_size > MAX_FILE_SIZE or file_size < MIN_FILE_SIZE:
            raise ImageValidationError(f"Invalid file size: {file_size}")
        result['checks']['fileSize'] = True
        
        image = Image.open(io.BytesIO(image_data))
        if image.format not in ALLOWED_FORMATS:
            raise ImageValidationError(f"Invalid format: {image.format}")
        result['checks']['format'] = True
        
        width, height = image.size
        if width > MAX_DIMENSIONS[0] or height > MAX_DIMENSIONS[1] or width < MIN_DIMENSIONS[0] or height < MIN_DIMENSIONS[1]:
            raise ImageValidationError(f"Invalid dimensions: {width}x{height}")
        result['checks']['dimensions'] = True
        
        aspect_ratio = width / height
        if aspect_ratio < 0.33 or aspect_ratio > 3.0:
            raise ImageValidationError(f"Invalid aspect ratio: {aspect_ratio:.2f}")
        result['checks']['aspectRatio'] = True
        
        result['valid'] = True
        result['width'] = width
        result['height'] = height
        result['fileSize'] = file_size
        result['format'] = image.format
        
    except ImageValidationError as e:
        result['error'] = str(e)
    except Exception as e:
        result['error'] = str(e)
    
    return result['valid'], result


def update_article_validation_status(article_id, status, details):
    if not table or not article_id:
        return
    try:
        table.update_item(
            Key={'articleId': article_id},
            UpdateExpression='SET validationStatus = :s, validationDetails = :d',
            ExpressionAttributeValues={':s': status, ':d': details}
        )
    except Exception:
        pass


def forward_to_next_queue(bucket, key, article_id):
    if not IMAGE_ANALYZER_QUEUE_URL:
        return False
    try:
        sqs_client.send_message(
            QueueUrl=IMAGE_ANALYZER_QUEUE_URL,
            MessageBody=json.dumps({'Records': [{'s3': {'bucket': {'name': bucket}, 'object': {'key': key}}}]}),
            MessageAttributes={'articleId': {'StringValue': article_id, 'DataType': 'String'}}
        )
        return True
    except Exception:
        return False


def delete_invalid_image(bucket, key):
    try:
        s3_client.delete_object(Bucket=bucket, Key=key)
        return True
    except Exception:
        return False


def lambda_handler(event, context):
    results = {'processed': 0, 'valid': 0, 'invalid': 0, 'deleted': 0, 'errors': 0}
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
                    is_valid, details = validate_image(bucket, key)
                    results['processed'] += 1
                    
                    if is_valid:
                        results['valid'] += 1
                        update_article_validation_status(article_id, 'valid', details)
                        forward_to_next_queue(bucket, key, article_id)
                    else:
                        results['invalid'] += 1
                        update_article_validation_status(article_id, 'invalid', details)
                        if delete_invalid_image(bucket, key):
                            results['deleted'] += 1
                except Exception:
                    results['errors'] += 1
        except Exception:
            failed_messages.append({'itemIdentifier': sqs_record['messageId']})
            results['errors'] += 1
    
    print(f"ImageValidator: processed={results['processed']}, valid={results['valid']}, invalid={results['invalid']}")
    return {'batchItemFailures': failed_messages}
