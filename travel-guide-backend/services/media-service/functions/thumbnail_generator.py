import boto3
import os
from PIL import Image
import io

s3 = boto3.client('s3')
bucket_name = os.environ['BUCKET_NAME']

def lambda_handler(event, context):
    for record in event['Records']:
        bucket = record['s3']['bucket']['name']
        key = record['s3']['object']['key']

        # Chỉ xử lý nếu là ảnh trong thư mục articles
        if not key.startswith('articles/') or key.startswith('thumbnails/'):
            continue

        try:
            # Get image from S3
            response = s3.get_object(Bucket=bucket, Key=key)
            image_content = response['Body'].read()

            # Open and resize image
            image = Image.open(io.BytesIO(image_content))
            image.thumbnail((256, 256), Image.Resampling.LANCZOS) # Use LANCZOS for better quality

            # Save to bytes
            buffer = io.BytesIO()
            image.save(buffer, format='WEBP', optimize=True, quality=85)
            buffer.seek(0)

            # Generate thumbnail key
            base_filename = os.path.basename(key)
            stem = os.path.splitext(base_filename)[0]
            thumbnail_key = f"thumbnails/{stem}_256.webp"

            # Upload thumbnail to S3
            s3.put_object(
                Bucket=bucket,
                Key=thumbnail_key,
                Body=buffer.getvalue(),
                ContentType='image/webp',
                ACL='private' # Or 'public-read' if you want to serve directly
            )

            print(f"Thumbnail created: {thumbnail_key}")

        except Exception as e:
            print(f"Error processing {key}: {e}")
            return {
                'statusCode': 500,
                'body': json.dumps(f'Error: {str(e)}')
            }

    return {
        'statusCode': 200,
        'body': json.dumps('Thumbnails processed successfully')
    }