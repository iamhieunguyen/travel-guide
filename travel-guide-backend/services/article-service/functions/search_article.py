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
        q = params.get("q", "").strip()
        tags = params.get("tags", "").strip()
        limit = int(params.get("limit", 10))
        next_token = params.get("nextToken")
        
        # Basic validation
        if not q:
            return _response(400, {"error": "Search query 'q' is required"}, os.environ.get("CORS_ORIGIN"))
        
        # Prepare filter expressions
        filter_expressions = []
        expression_attribute_names = {}
        expression_attribute_values = {}
        
        # Add title/content search
        filter_expressions.append("(contains(#title, :q) OR contains(#content, :q))")
        expression_attribute_names["#title"] = "title"
        expression_attribute_names["#content"] = "content"
        expression_attribute_values[":q"] = q
        
        # Add tag filtering if provided
        if tags:
            tag_list = [tag.strip() for tag in tags.split(",") if tag.strip()]
            if tag_list:
                tag_conditions = []
                for i, tag in enumerate(tag_list):
                    tag_key = f":tag{i}"
                    tag_alias = f"#tag{i}"
                    tag_conditions.append(f"contains({tag_alias}, {tag_key})")
                    expression_attribute_names[tag_alias] = "tags"
                    expression_attribute_values[tag_key] = tag
                
                if tag_conditions:
                    filter_expressions.append(f"({' OR '.join(tag_conditions)})")
        
        # Build the query parameters
        query_params = {
            'IndexName': 'gsi_visibility_createdAt',
            'KeyConditionExpression': 'visibility = :visibility',
            'FilterExpression': " AND ".join(filter_expressions),
            'ExpressionAttributeNames': expression_attribute_names,
            'ExpressionAttributeValues': {
                **expression_attribute_values,
                ":visibility": "public"
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
            'items': processed_items,
            'query': q,
            'count': len(processed_items)
        }
        
        # Add next token for pagination if available
        if 'LastEvaluatedKey' in response:
            result['nextToken'] = json.dumps(response['LastEvaluatedKey'])
        
        return _response(200, result, os.environ.get("CORS_ORIGIN"))
    
    except Exception as e:
        print(f"Error in search_articles: {e}")
        return _response(500, {"error": f"Internal server error: {str(e)}"}, os.environ.get("CORS_ORIGIN"))