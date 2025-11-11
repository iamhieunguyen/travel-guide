import os
import json
import boto3
from decimal import Decimal
from cors import ok, error, options

dynamodb = boto3.resource("dynamodb")

TABLE_NAME = os.environ["TABLE_NAME"]
table = dynamodb.Table(TABLE_NAME)

def _response(status, body_dict):
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body_dict, ensure_ascii=False),
    }

def _get_user_id(event):
    """Hàm hỗ trợ lấy user ID từ cả JWT và X-User-Id như trong create_article"""
    headers = event.get("headers") or {}
    x_user_id = headers.get("X-User-Id") or headers.get("x-user-id")
    if x_user_id:
        return x_user_id

    auth_header = headers.get("Authorization") or headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        # Bạn có thể thêm logic JWT ở đây nếu cần
        # hoặc chỉ cần kiểm tra có token hay không
        return "authenticated_user" # hoặc parse từ token

    return None

def lambda_handler(event, context):
    method = (event.get("httpMethod") or event.get("requestContext", {}).get("http", {}).get("method"))
    if method == "OPTIONS":
        return options()

    try:
        params = event.get("queryStringParameters") or {}
        scope = params.get("scope", "public")
        limit = int(params.get("limit", 10))
        next_token = params.get("nextToken")

        user_id = _get_user_id(event)

        # Query DynamoDB
        if scope == "mine" and user_id:
            # Query theo ownerId nếu scope là mine
            query_params = {
                'IndexName': 'gsi_owner_createdAt',
                'KeyConditionExpression': 'ownerId = :owner_id',
                'ExpressionAttributeValues': {
                    ':owner_id': user_id
                },
                'ScanIndexForward': False, # Mới nhất trước
                'Limit': limit
            }
        else:
            # Query theo visibility nếu scope là public
            query_params = {
                'IndexName': 'gsi_visibility_createdAt',
                'KeyConditionExpression': 'visibility = :visibility',
                'ExpressionAttributeValues': {
                    ':visibility': 'public'
                },
                'ScanIndexForward': False, # Mới nhất trước
                'Limit': limit
            }

        if next_token:
            query_params['ExclusiveStartKey'] = json.loads(next_token)

        response = table.query(**query_params)

        items = response['Items']
        next_key = response.get('LastEvaluatedKey')

        # Chuyển Decimal sang float cho frontend
        processed_items = []
        for item in items:
            processed_item = dict(item)
            if 'lat' in processed_item:
                processed_item['lat'] = float(processed_item['lat'])
            if 'lng' in processed_item:
                processed_item['lng'] = float(processed_item['lng'])
            processed_items.append(processed_item)

        result = {
            'items': processed_items
        }
        if next_key:
            result['nextToken'] = json.dumps(next_key)

        return _response(200, result)

    except Exception as e:
        print(f"Error in list_articles: {e}")
        return _response(500, {"error": f"internal error: {e}"})