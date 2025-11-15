import os
import json
import base64
import boto3
from decimal import Decimal
from utils.cors import _response, options_response
from utils.jwt_validator import get_user_id_from_event
from utils.geo_utils import convert_decimals, geohash_encode

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

def _thumb_from_image_key(image_key: str) -> str:
    """Generate thumbnail key from image key"""
    base = os.path.basename(image_key)
    stem = os.path.splitext(base)[0]
    return f"thumbnails/{stem}_256.webp"

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
        
        # Get the existing item to check ownership
        existing_item = table.get_item(Key={'articleId': article_id}).get('Item')
        if not existing_item:
            return _response(404, {"error": "Article not found"}, os.environ.get("CORS_ORIGIN"))
        
        # Check if the user is authorized to update this article
        owner_id = get_user_id_from_event(event, USER_POOL_ID, CLIENT_ID, AWS_REGION)
        if not owner_id:
            return _response(401, {"error": "Authentication required"}, os.environ.get("CORS_ORIGIN"))
        
        if existing_item.get('ownerId') != owner_id:
            return _response(403, {"error": "You are not authorized to update this article"}, os.environ.get("CORS_ORIGIN"))
        
        # Parse request body
        body_str = event.get("body") or ""
        if event.get("isBase64Encoded"):
            body_str = base64.b64decode(body_str).decode("utf-8", errors="ignore")
        data = json.loads(body_str or "{}")
        
        # Build update expression
        update_expression = "SET "
        expression_attribute_names = {}
        expression_attribute_values = {}
        
        # Process fields that can be updated
        if "title" in data:
            title = data["title"].strip()
            if title:
                update_expression += "#title = :title, "
                expression_attribute_names["#title"] = "title"
                expression_attribute_values[":title"] = title
        
        if "content" in data:
            content = data["content"].strip()
            if content:
                update_expression += "#content = :content, "
                expression_attribute_names["#content"] = "content"
                expression_attribute_values[":content"] = content
        
        if "visibility" in data:
            visibility = data["visibility"].lower()
            if visibility in ("public", "private"):
                update_expression += "#visibility = :visibility, "
                expression_attribute_names["#visibility"] = "visibility"
                expression_attribute_values[":visibility"] = visibility
        
        if "lat" in data and "lng" in data:
            try:
                lat_f = float(data["lat"])
                lng_f = float(data["lng"])
                
                if -90.0 <= lat_f <= 90.0 and -180.0 <= lng_f <= 180.0:
                    geohash = geohash_encode(lat_f, lng_f, precision=9)
                    gh5 = geohash[:5]
                    
                    update_expression += "#lat = :lat, #lng = :lng, #geohash = :geohash, #gh5 = :gh5, "
                    expression_attribute_names["#lat"] = "lat"
                    expression_attribute_names["#lng"] = "lng"
                    expression_attribute_names["#geohash"] = "geohash"
                    expression_attribute_names["#gh5"] = "gh5"
                    expression_attribute_values[":lat"] = Decimal(str(lat_f))
                    expression_attribute_values[":lng"] = Decimal(str(lng_f))
                    expression_attribute_values[":geohash"] = geohash
                    expression_attribute_values[":gh5"] = gh5
            except (ValueError, TypeError):
                pass  # Skip invalid coordinates
        
        if "tags" in data:
            tags = data["tags"]
            if isinstance(tags, list):
                # Clean and deduplicate tags
                cleaned_tags = list({str(t).strip() for t in tags if str(t).strip()})
                update_expression += "#tags = :tags, "
                expression_attribute_names["#tags"] = "tags"
                expression_attribute_values[":tags"] = cleaned_tags
        
        if "imageKey" in data:
            image_key = data["imageKey"].strip()
            try:
                # Verify the image exists in S3
                s3.head_object(Bucket=BUCKET_NAME, Key=image_key)
                update_expression += "#imageKey = :imageKey, #thumbnailKey = :thumbnailKey, "
                expression_attribute_names["#imageKey"] = "imageKey"
                expression_attribute_names["#thumbnailKey"] = "thumbnailKey"
                expression_attribute_values[":imageKey"] = image_key
                expression_attribute_values[":thumbnailKey"] = _thumb_from_image_key(image_key)
            except Exception as e:
                print(f"Error verifying image: {e}")
                return _response(400, {"error": f"Image not found: {image_key}"}, os.environ.get("CORS_ORIGIN"))
        
        # Remove trailing comma and space if any
        if update_expression.endswith(", "):
            update_expression = update_expression[:-2]
        
        # If no fields to update
        if update_expression == "SET":
            return _response(400, {"error": "No valid fields to update"}, os.environ.get("CORS_ORIGIN"))
        
        # Update the item
        response = table.update_item(
            Key={'articleId': article_id},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values,
            ReturnValues="ALL_NEW"
        )
        
        # Process response
        updated_item = convert_decimals(response['Attributes'])
        return _response(200, updated_item, os.environ.get("CORS_ORIGIN"))
    
    except Exception as e:
        print(f"Error in update_article: {e}")
        return _response(500, {"error": f"Internal server error: {str(e)}"}, os.environ.get("CORS_ORIGIN"))