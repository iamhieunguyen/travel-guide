import os
import json
import boto3
from utils.cors import _response, options_response
from utils.jwt_validator import get_user_id_from_event
from utils.geo_utils import convert_decimals

# Environment variables
TABLE_NAME = os.environ["TABLE_NAME"]
USER_POOL_ID = os.environ.get("USER_POOL_ID")
CLIENT_ID = os.environ.get("CLIENT_ID")
AWS_REGION = os.environ.get("AWS_REGION")
ENVIRONMENT = os.environ["ENVIRONMENT"]

# Initialize resources
dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME)

def lambda_handler(event, context):
    # Xử lý OPTIONS request
    http_method = event.get("httpMethod", event.get("requestContext", {}).get("http", {}).get("method", ""))
    if http_method == "OPTIONS":
        return options_response(os.environ.get("CORS_ORIGIN"))
    
    try:
        # Get query parameters
        params = event.get("queryStringParameters") or {}
        scope = params.get("scope", "public")
        limit = int(params.get("limit", 10))
        next_token = params.get("nextToken")
        
        # Get user ID for authentication
        user_id = get_user_id_from_event(event, USER_POOL_ID, CLIENT_ID, AWS_REGION) if USER_POOL_ID and CLIENT_ID else None
        
        # Prepare query parameters based on scope
        if scope == "mine" and user_id:
            # Query articles owned by the current user
            query_params = {
                'IndexName': 'gsi_owner_createdAt',
                'KeyConditionExpression': 'ownerId = :owner_id',
                'ExpressionAttributeValues': {
                    ':owner_id': user_id
                },
                'ScanIndexForward': False,  # Newest first
                'Limit': limit
            }
        else:
            # Query public articles
            query_params = {
                'IndexName': 'gsi_visibility_createdAt',
                'KeyConditionExpression': 'visibility = :visibility',
                'ExpressionAttributeValues': {
                    ':visibility': 'public'
                },
                'ScanIndexForward': False,  # Newest first
                'Limit': limit
            }
        
        # Add pagination token if provided
        if next_token:
            try:
                query_params['ExclusiveStartKey'] = json.loads(next_token)
            except json.JSONDecodeError:
                return _response(400, {"error": "Invalid nextToken format"}, os.environ.get("CORS_ORIGIN"))
        
        # Execute query
        response = table.query(**query_params)
        items = response['Items']
        
        # Process items - convert Decimal values
        processed_items = [convert_decimals(item) for item in items]
        
        # Prepare result
        result = {
            'items': processed_items
        }
        
        # Add next token for pagination if available
        if 'LastEvaluatedKey' in response:
            result['nextToken'] = json.dumps(response['LastEvaluatedKey'])
        
        return _response(200, result, os.environ.get("CORS_ORIGIN"))
    
    except Exception as e:
        print(f"Error in list_articles: {e}")
        return _response(500, {"error": f"Internal server error: {str(e)}"}, os.environ.get("CORS_ORIGIN"))