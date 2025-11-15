import os
import json
import boto3
from decimal import Decimal
from utils.cors import _response, options_response
from utils.geo_utils import convert_decimals

# Environment variables
TABLE_NAME = os.environ["TABLE_NAME"]
BUCKET_NAME = os.environ["BUCKET_NAME"]
USER_POOL_ID = os.environ.get("USER_POOL_ID")
CLIENT_ID = os.environ.get("CLIENT_ID")
ENVIRONMENT = os.environ["ENVIRONMENT"]

# Initialize resources
dynamodb = boto3.resource("dynamodb")
s3 = boto3.client("s3")
table = dynamodb.Table(TABLE_NAME)

def lambda_handler(event, context):
    # Xử lý OPTIONS request
    http_method = event.get("httpMethod", event.get("requestContext", {}).get("http", {}).get("method", ""))
    if http_method == "OPTIONS":
        return options_response(os.environ.get("CORS_ORIGIN"))
    
    try:
        # Get article ID from path parameters
        path_params = event.get("pathParameters") or {}
        article_id = path_params.get("articleId")
        if not article_id:
            return _response(400, {"error": "articleId is required"}, os.environ.get("CORS_ORIGIN"))
        
        # Get item from DynamoDB
        response = table.get_item(Key={'articleId': article_id})
        if 'Item' not in response:
            return _response(404, {"error": "Article not found"}, os.environ.get("CORS_ORIGIN"))
        
        item = response['Item']
        
        # Process decimals for response
        processed_item = convert_decimals(item)
        
        # If presign query param is present, generate presigned URL for the image
        params = event.get("queryStringParameters") or {}
        if params.get('presign') == '1' and 'imageKey' in processed_item:
            try:
                presigned_url = s3.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': BUCKET_NAME, 'Key': processed_item['imageKey']},
                    ExpiresIn=3600  # 1 hour
                )
                processed_item['imageUrl'] = presigned_url
            except Exception as e:
                print(f"Error generating presigned URL: {e}")
        
        return _response(200, processed_item, os.environ.get("CORS_ORIGIN"))
    
    except Exception as e:
        print(f"Error in get_article: {e}")
        return _response(500, {"error": f"Internal server error: {str(e)}"}, os.environ.get("CORS_ORIGIN"))