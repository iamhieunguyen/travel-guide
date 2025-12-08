import os
import json
import boto3
from decimal import Decimal
from cors import ok, error, options

dynamodb = boto3.resource("dynamodb")
cognito = boto3.client("cognito-idp")

TABLE_NAME = os.environ["TABLE_NAME"]
PROFILES_TABLE_NAME = os.environ.get("PROFILES_TABLE_NAME")
USER_POOL_ID = os.environ.get("USER_POOL_ID")

table = dynamodb.Table(TABLE_NAME)
profiles_table = dynamodb.Table(PROFILES_TABLE_NAME) if PROFILES_TABLE_NAME else None

def _convert_decimal(obj):
    """Recursively convert Decimal to float/int"""
    if isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    elif isinstance(obj, dict):
        return {k: _convert_decimal(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_convert_decimal(item) for item in obj]
    return obj


def _get_user_profile(user_id):
    """Get user profile information from UserProfilesTable or Cognito"""
    try:
        # Try to get from UserProfilesTable first
        if profiles_table:
            response = profiles_table.get_item(Key={'userId': user_id})
            if 'Item' in response:
                profile = response['Item']
                
                # Generate presigned URLs for avatar and cover if they exist
                avatar_url = None
                cover_url = None
                
                if profile.get('avatarKey'):
                    try:
                        import boto3
                        s3_client = boto3.client('s3')
                        bucket_name = os.environ.get('BUCKET_NAME', '')
                        if bucket_name:
                            avatar_url = s3_client.generate_presigned_url(
                                'get_object',
                                Params={'Bucket': bucket_name, 'Key': profile['avatarKey']},
                                ExpiresIn=3600
                            )
                    except Exception as e:
                        print(f"Error generating avatar URL for {user_id}: {e}")
                
                if profile.get('coverImageKey'):
                    try:
                        import boto3
                        s3_client = boto3.client('s3')
                        bucket_name = os.environ.get('BUCKET_NAME', '')
                        if bucket_name:
                            cover_url = s3_client.generate_presigned_url(
                                'get_object',
                                Params={'Bucket': bucket_name, 'Key': profile['coverImageKey']},
                                ExpiresIn=3600
                            )
                    except Exception as e:
                        print(f"Error generating cover URL for {user_id}: {e}")
                
                return {
                    'displayName': profile.get('username'),  # Use username as displayName
                    'username': profile.get('username'),
                    'avatarUrl': avatar_url,
                    'coverImageUrl': cover_url,
                    'bio': profile.get('bio')
                }
        
        # Fallback to Cognito
        if USER_POOL_ID:
            try:
                response = cognito.admin_get_user(
                    UserPoolId=USER_POOL_ID,
                    Username=user_id
                )
                
                # Extract attributes
                attributes = {attr['Name']: attr['Value'] for attr in response.get('UserAttributes', [])}
                
                return {
                    'displayName': attributes.get('name') or attributes.get('preferred_username'),
                    'username': response.get('Username'),
                    'email': attributes.get('email')
                }
            except Exception as e:
                print(f"Error getting user from Cognito: {e}")
        
        return None
    except Exception as e:
        print(f"Error getting user profile: {e}")
        return None


def lambda_handler(event, context):
    """
    Get public articles of a specific user
    GET /users/{userId}/articles
    
    Query params:
    - limit: number of items (default 20)
    - nextToken: pagination token
    
    Returns only public + approved articles
    """
    method = (event.get("httpMethod") or event.get("requestContext", {}).get("http", {}).get("method"))
    if method == "OPTIONS":
        return options()

    try:
        # Get userId from path parameters
        path_params = event.get("pathParameters") or {}
        target_user_id = path_params.get("userId")
        
        if not target_user_id:
            return error(400, "userId is required in path")

        # Get query parameters
        params = event.get("queryStringParameters") or {}
        limit = int(params.get("limit", 20))
        next_token = params.get("nextToken")

        print(f"🔍 get_user_articles:")
        print(f"  target_user_id: {target_user_id}")
        print(f"  limit: {limit}")

        # Query articles by ownerId
        query_params = {
            'IndexName': 'gsi_owner_createdAt',
            'KeyConditionExpression': 'ownerId = :owner_id',
            'ExpressionAttributeNames': {
                '#status': 'status',
                '#visibility': 'visibility'
            },
            'ExpressionAttributeValues': {
                ':owner_id': target_user_id,
                ':visibility': 'public',
                ':status': 'approved'
            },
            # Filter: Only public + approved articles
            'FilterExpression': '#visibility = :visibility AND (#status = :status OR attribute_not_exists(#status))',
            'ScanIndexForward': False,  # Newest first
            'Limit': limit
        }

        if next_token:
            query_params['ExclusiveStartKey'] = json.loads(next_token)

        response = table.query(**query_params)

        items = response['Items']
        next_key = response.get('LastEvaluatedKey')

        # Get user profile information
        user_profile = _get_user_profile(target_user_id)
        
        # Convert Decimal to float/int
        processed_items = []
        for item in items:
            processed_item = _convert_decimal(item)
            
            # Backward compatibility: treat articles without status as approved
            if 'status' not in processed_item:
                processed_item['status'] = 'approved'
            
            # Add user profile info to each item
            if user_profile:
                processed_item['ownerDisplayName'] = user_profile.get('displayName')
                processed_item['ownerUsername'] = user_profile.get('username')
                processed_item['ownerAvatarUrl'] = user_profile.get('avatarUrl')
            
            processed_items.append(processed_item)

        result = {
            'items': processed_items,
            'count': len(processed_items),
            'userProfile': user_profile  # Include user profile in response
        }
        
        if next_key:
            result['nextToken'] = json.dumps(next_key)

        print(f"✅ Found {len(processed_items)} public articles for user {target_user_id}")
        print(f"📝 User profile: {user_profile}")
        return ok(200, result)

    except Exception as e:
        print(f"❌ Error in get_user_articles: {e}")
        import traceback
        traceback.print_exc()
        return error(500, f"internal error: {str(e)}")
