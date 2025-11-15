import os
import json
import boto3
from utils.cors import _response, options_response
from utils.jwt_validator import get_user_id_from_event

# Environment variables
TABLE_NAME = os.environ["TABLE_NAME"]
BUCKET_NAME = os.environ["BUCKET_NAME"]
USER_POOL_ID = os.environ["USER_POOL_ID"]
CLIENT_ID = os.environ["CLIENT_ID"]
AWS_REGION = os.environ["AWS_REGION"]
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
        
        # Get the item to check ownership and get image keys
        response = table.get_item(Key={'articleId': article_id})
        if 'Item' not in response:
            return _response(404, {"error": "Article not found"}, os.environ.get("CORS_ORIGIN"))
        
        item = response['Item']
        
        # Check if the user is authorized to delete this article
        owner_id = get_user_id_from_event(event, USER_POOL_ID, CLIENT_ID, AWS_REGION)
        if not owner_id:
            return _response(401, {"error": "Authentication required"}, os.environ.get("CORS_ORIGIN"))
        
        if item.get('ownerId') != owner_id:
            return _response(403, {"error": "You are not authorized to delete this article"}, os.environ.get("CORS_ORIGIN"))
        
        # Get image keys to delete
        image_key = item.get('imageKey')
        thumbnail_key = item.get('thumbnailKey')
        
        # Delete the item from DynamoDB first
        table.delete_item(Key={'articleId': article_id})
        
        # Delete images from S3 if they exist
        deleted_images = []
        errors = []
        
        if image_key:
            try:
                s3.delete_object(Bucket=BUCKET_NAME, Key=image_key)
                deleted_images.append(image_key)
            except Exception as e:
                errors.append(f"Failed to delete image {image_key}: {str(e)}")
        
        if thumbnail_key:
            try:
                s3.delete_object(Bucket=BUCKET_NAME, Key=thumbnail_key)
                deleted_images.append(thumbnail_key)
            except Exception as e:
                errors.append(f"Failed to delete thumbnail {thumbnail_key}: {str(e)}")
        
        # Prepare response
        response_data = {
            "message": "Article deleted successfully",
            "deletedImages": deleted_images
        }
        
        if errors:
            response_data["warnings"] = errors
        
        return _response(200, response_data, os.environ.get("CORS_ORIGIN"))
    
    except Exception as e:
        print(f"Error in delete_article: {e}")
        return _response(500, {"error": f"Internal server error: {str(e)}"}, os.environ.get("CORS_ORIGIN"))