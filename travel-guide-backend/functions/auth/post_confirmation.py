import os
import json
import boto3
from datetime import datetime

dynamodb = boto3.resource("dynamodb")
PROFILES_TABLE_NAME = os.environ.get("PROFILES_TABLE_NAME")

def lambda_handler(event, context):
    """
    Cognito Post Confirmation Trigger
    Tự động tạo profile trong DynamoDB khi user đăng ký thành công
    """
    print(f"📥 Post Confirmation Event: {json.dumps(event)}")
    
    try:
        # Lấy thông tin user từ event
        user_attributes = event.get('request', {}).get('userAttributes', {})
        user_id = user_attributes.get('sub')
        email = user_attributes.get('email')
        username = event.get('userName')
        
        if not user_id:
            print("❌ Missing user ID (sub)")
            return event
        
        if not PROFILES_TABLE_NAME:
            print("⚠️ PROFILES_TABLE_NAME not configured, skipping profile creation")
            return event
        
        # Tạo profile mới trong DynamoDB
        profiles_table = dynamodb.Table(PROFILES_TABLE_NAME)
        
        # Tạo username từ email nếu không có
        display_username = username or (email.split('@')[0] if email else f"user_{user_id[:8]}")
        
        profile_item = {
            'userId': user_id,
            'username': display_username,
            'email': email,
            'bio': '',
            'createdAt': datetime.utcnow().isoformat(),
            'updatedAt': datetime.utcnow().isoformat()
        }
        
        profiles_table.put_item(Item=profile_item)
        
        print(f"✅ Created profile for user {user_id} with username {display_username}")
        
    except Exception as e:
        print(f"❌ Error creating user profile: {e}")
        import traceback
        traceback.print_exc()
        # Không throw error để không block quá trình đăng ký
    
    # QUAN TRỌNG: Phải return event để Cognito tiếp tục
    return event
