"""
Get Article Lambda Function
Retrieves a single article with privacy checks
"""
import os
import boto3
import sys
sys.path.insert(0, '/var/task/functions')
from utils import *

dynamodb = boto3.resource("dynamodb")
s3 = boto3.client("s3")

TABLE_NAME = os.environ["TABLE_NAME"]
BUCKET_NAME = os.environ["BUCKET_NAME"]
CLOUDFRONT_DOMAIN = os.environ.get("CLOUDFRONT_DOMAIN", "")

table = dynamodb.Table(TABLE_NAME)

def generate_presigned_url(key, expires_in=3600):
    """Generate presigned URL for S3 object"""
    try:
        return s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': BUCKET_NAME, 'Key': key},
            ExpiresIn=expires_in
        )
    except Exception as e:
        print(f"Failed to generate presigned URL for {key}: {e}")
        return None

def lambda_handler(event, context):
    """Main Lambda handler"""
    # Handle CORS preflight
    if get_http_method(event) == "OPTIONS":
        return options()
    
    try:
        # 1. Extract article ID from path
        path_params = event.get("pathParameters", {})
        article_id = path_params.get("articleId")
        
        if not article_id:
            return not_found("Article ID is required")
        
        # 2. Get article from DynamoDB
        response = table.get_item(Key={'articleId': article_id})
        
        if 'Item' not in response:
            return not_found("Article not found")
        
        article = response['Item']
        
        # 3. Check privacy settings
        visibility = article.get('visibility', 'public')
        owner_id = article.get('ownerId')
        
        if visibility == 'private':
            # Require authentication for private articles
            user = get_user_from_event(event)
            current_user_id = user.get('user_id') if user else None
            
            # Only owner can view private articles
            if current_user_id != owner_id:
                return forbidden("This article is private")
        
        # 4. Add image URLs
        query_params = event.get("queryStringParameters") or {}
        use_presigned = query_params.get('presign') == '1'
        
        if article.get('imageKey'):
            image_key = article['imageKey']
            
            if use_presigned:
                # Generate presigned URLs (useful for private buckets)
                article['imageUrl'] = generate_presigned_url(image_key)
                if article.get('thumbnailKey'):
                    article['thumbnailUrl'] = generate_presigned_url(article['thumbnailKey'])
            elif CLOUDFRONT_DOMAIN:
                # Use CloudFront URLs (recommended)
                article['imageUrl'] = f"https://{CLOUDFRONT_DOMAIN}/{image_key}"
                if article.get('thumbnailKey'):
                    article['thumbnailUrl'] = f"https://{CLOUDFRONT_DOMAIN}/{article['thumbnailKey']}"
        
        # 5. Return article (Decimal conversion handled by DecimalEncoder)
        return ok(article)
        
    except Exception as e:
        print(f"Error in get_article: {e}")
        import traceback
        traceback.print_exc()
        return internal_error("Failed to retrieve article")