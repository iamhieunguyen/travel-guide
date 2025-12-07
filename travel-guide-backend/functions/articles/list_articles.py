import os
import json
import boto3
from decimal import Decimal
from cors import ok, error, options

dynamodb = boto3.resource("dynamodb")

TABLE_NAME = os.environ["TABLE_NAME"]
table = dynamodb.Table(TABLE_NAME)

def _get_user_id(event):
    headers = event.get("headers") or {}
    x_user_id = headers.get("X-User-Id") or headers.get("x-user-id")
    if x_user_id:
        return x_user_id

    # Lấy từ authorizer (nếu có)
    rc = event.get("requestContext") or {}
    auth = rc.get("authorizer") or {}
    claims = auth.get("claims") or {}
    sub = claims.get("sub")
    if sub:
        return sub

    # Parse JWT token manually nếu không có authorizer
    auth_header = headers.get("Authorization") or headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        try:
            import base64
            token = auth_header.split(" ")[1]
            # Decode JWT payload (không verify - chỉ để lấy sub)
            parts = token.split(".")
            if len(parts) >= 2:
                payload = parts[1]
                # Add padding if needed
                padding = 4 - len(payload) % 4
                if padding != 4:
                    payload += "=" * padding
                decoded = base64.urlsafe_b64decode(payload)
                claims = json.loads(decoded)
                return claims.get("sub")
        except Exception as e:
            print(f"Error parsing JWT: {e}")
            pass

    return None


def _convert_decimal(obj):
    """Recursively convert Decimal to float/int"""
    if isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    elif isinstance(obj, dict):
        return {k: _convert_decimal(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_convert_decimal(item) for item in obj]
    return obj


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
        
        # Debug logging
        print(f"🔍 list_articles DEBUG:")
        print(f"  scope: {scope}")
        print(f"  user_id: {user_id}")
        print(f"  headers: {event.get('headers', {})}")

        # Query DynamoDB
        if scope == "mine" and user_id:
            # Query theo ownerId nếu scope là mine (show all statuses for owner)
            # Owner can see their own articles regardless of status (pending/approved/rejected)
            query_params = {
                'IndexName': 'gsi_owner_createdAt',
                'KeyConditionExpression': 'ownerId = :owner_id',
                'ExpressionAttributeValues': {
                    ':owner_id': user_id
                },
                'ScanIndexForward': False, # Mới nhất trước
                'Limit': limit
            }
            print(f"📝 Querying articles for owner: {user_id} (all statuses)")
        else:
            # Public feed: Show approved posts + owner's own posts (any status)
            # This allows users to see their pending/rejected posts in the public feed
            query_params = {
                'IndexName': 'gsi_visibility_createdAt',
                'KeyConditionExpression': 'visibility = :visibility',
                'ExpressionAttributeNames': {
                    '#status': 'status',
                    '#ownerId': 'ownerId'
                },
                'ExpressionAttributeValues': {
                    ':visibility': 'public',
                    ':status': 'approved'
                },
                'ScanIndexForward': False, # Mới nhất trước
                'Limit': limit
            }
            
            # Filter: Show approved posts from everyone + all posts from current user
            if user_id:
                # Logged in: (approved OR no status) OR (my own post regardless of status)
                # This means: show approved posts from others + all my posts
                query_params['FilterExpression'] = '((#status = :status OR attribute_not_exists(#status)) OR #ownerId = :userId)'
                query_params['ExpressionAttributeValues'][':userId'] = user_id
                print(f"📝 Public feed for user {user_id}: approved posts from all + own posts (any status)")
            else:
                # Not logged in: show only approved posts
                query_params['FilterExpression'] = '(#status = :status OR attribute_not_exists(#status))'
                print(f"📝 Public feed for guest: approved posts only")

        if next_token:
            query_params['ExclusiveStartKey'] = json.loads(next_token)

        response = table.query(**query_params)

        items = response['Items']
        next_key = response.get('LastEvaluatedKey')

        # Chuyển Decimal sang float/int cho frontend (recursive)
        processed_items = []
        for item in items:
            processed_item = _convert_decimal(item)
            
            # Backward compatibility: treat articles without status as approved
            if 'status' not in processed_item:
                processed_item['status'] = 'approved'
            
            processed_items.append(processed_item)

        result = {
            'items': processed_items
        }
        if next_key:
            result['nextToken'] = json.dumps(next_key)

        return ok(200, result)

    except Exception as e:
        print(f"Error in list_articles: {e}")
        return error(500, f"internal error: {e}")