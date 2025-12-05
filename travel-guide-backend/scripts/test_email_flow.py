#!/usr/bin/env python3
"""
Script to test email notification flow
Simulates content moderation rejection and email sending
"""
import boto3
import json
import sys
from datetime import datetime, timezone

# Initialize clients
ses_client = boto3.client('ses')
s3_client = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
cognito_client = boto3.client('cognito-idp')

# Configuration (update these)
BUCKET_NAME = 'YOUR_BUCKET_NAME'
TABLE_NAME = 'YOUR_TABLE_NAME'
USER_POOL_ID = 'YOUR_USER_POOL_ID'
SENDER_EMAIL = 'hieunxse180069@fpt.edu.vn'


def test_s3_metadata(article_id, image_id):
    """Test if S3 object has correct metadata"""
    print("\n" + "="*60)
    print("TEST 1: S3 METADATA")
    print("="*60)
    
    key = f"articles/{article_id}_{image_id}.jpg"
    
    try:
        response = s3_client.head_object(Bucket=BUCKET_NAME, Key=key)
        metadata = response.get('Metadata', {})
        
        print(f"✓ Found S3 object: {key}")
        print(f"\nMetadata:")
        for k, v in metadata.items():
            print(f"  {k}: {v}")
        
        # Check required fields
        owner_id = metadata.get('owner-id') or metadata.get('ownerid')
        user_email = metadata.get('user-email') or metadata.get('useremail')
        
        if owner_id:
            print(f"\n✅ owner-id found: {owner_id}")
        else:
            print(f"\n❌ owner-id NOT FOUND")
        
        if user_email:
            print(f"✅ user-email found: {user_email}")
        else:
            print(f"❌ user-email NOT FOUND")
        
        return owner_id, user_email
        
    except s3_client.exceptions.NoSuchKey:
        print(f"❌ S3 object not found: {key}")
        return None, None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None, None


def test_dynamodb_article(article_id):
    """Test if article exists in DynamoDB with owner info"""
    print("\n" + "="*60)
    print("TEST 2: DYNAMODB ARTICLE")
    print("="*60)
    
    try:
        table = dynamodb.Table(TABLE_NAME)
        response = table.get_item(Key={'articleId': article_id})
        
        if 'Item' not in response:
            print(f"❌ Article not found: {article_id}")
            return None
        
        item = response['Item']
        print(f"✓ Found article: {article_id}")
        
        # Check important fields
        owner_id = item.get('ownerId')
        status = item.get('status')
        moderation_status = item.get('moderationStatus')
        user_notified = item.get('userNotified')
        
        print(f"\nArticle info:")
        print(f"  ownerId: {owner_id}")
        print(f"  status: {status}")
        print(f"  moderationStatus: {moderation_status}")
        print(f"  userNotified: {user_notified}")
        
        if owner_id:
            print(f"\n✅ ownerId found: {owner_id}")
        else:
            print(f"\n❌ ownerId NOT FOUND")
        
        return owner_id
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return None


def test_cognito_user(owner_id):
    """Test if user exists in Cognito and has email"""
    print("\n" + "="*60)
    print("TEST 3: COGNITO USER")
    print("="*60)
    
    if not owner_id:
        print("❌ No owner_id provided")
        return None
    
    try:
        # Try 1: Get by username
        try:
            response = cognito_client.admin_get_user(
                UserPoolId=USER_POOL_ID,
                Username=owner_id
            )
            
            print(f"✓ Found user by username: {owner_id}")
            
            # Extract email
            user_attributes = response.get('UserAttributes', [])
            for attr in user_attributes:
                if attr['Name'] == 'email':
                    email = attr['Value']
                    print(f"✅ Email found: {email}")
                    return email
            
            print(f"❌ No email attribute found")
            return None
            
        except cognito_client.exceptions.UserNotFoundException:
            print(f"⚠️  Not found by username, trying by sub...")
        
        # Try 2: Search by sub
        response = cognito_client.list_users(
            UserPoolId=USER_POOL_ID,
            Filter=f'sub = "{owner_id}"',
            Limit=1
        )
        
        users = response.get('Users', [])
        if not users:
            print(f"❌ User not found with sub: {owner_id}")
            return None
        
        print(f"✓ Found user by sub: {owner_id}")
        
        # Extract email
        user_attributes = users[0].get('Attributes', [])
        for attr in user_attributes:
            if attr['Name'] == 'email':
                email = attr['Value']
                print(f"✅ Email found: {email}")
                return email
        
        print(f"❌ No email attribute found")
        return None
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return None


def test_email_verification(email):
    """Test if email is verified in SES"""
    print("\n" + "="*60)
    print("TEST 4: EMAIL VERIFICATION")
    print("="*60)
    
    if not email:
        print("❌ No email provided")
        return False
    
    try:
        # Check sender
        print(f"\nChecking sender: {SENDER_EMAIL}")
        response = ses_client.get_identity_verification_attributes(
            Identities=[SENDER_EMAIL]
        )
        sender_status = response.get('VerificationAttributes', {}).get(SENDER_EMAIL, {}).get('VerificationStatus')
        
        if sender_status == 'Success':
            print(f"✅ Sender verified: {SENDER_EMAIL}")
        else:
            print(f"❌ Sender NOT verified: {SENDER_EMAIL} (status: {sender_status})")
            return False
        
        # Check recipient
        print(f"\nChecking recipient: {email}")
        response = ses_client.get_identity_verification_attributes(
            Identities=[email]
        )
        recipient_status = response.get('VerificationAttributes', {}).get(email, {}).get('VerificationStatus')
        
        if recipient_status == 'Success':
            print(f"✅ Recipient verified: {email}")
            return True
        else:
            print(f"⚠️  Recipient NOT verified: {email} (status: {recipient_status})")
            print(f"   This may fail in sandbox mode")
            return False
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_send_email(recipient_email, article_id):
    """Test sending actual email"""
    print("\n" + "="*60)
    print("TEST 5: SEND EMAIL")
    print("="*60)
    
    if not recipient_email:
        print("❌ No recipient email provided")
        return False
    
    subject = f"⚠️ TEST: Your Image Was Removed - Article {article_id}"
    body = f"""
This is a TEST email from the content moderation system.

Article ID: {article_id}
Timestamp: {datetime.now(timezone.utc).isoformat()}

If you receive this email, the notification system is working correctly.

This is a test - no actual image was removed.
"""
    
    print(f"Sending test email...")
    print(f"  From: {SENDER_EMAIL}")
    print(f"  To: {recipient_email}")
    print(f"  Subject: {subject}")
    
    try:
        response = ses_client.send_email(
            Source=SENDER_EMAIL,
            Destination={'ToAddresses': [recipient_email]},
            Message={
                'Subject': {'Data': subject, 'Charset': 'UTF-8'},
                'Body': {'Text': {'Data': body, 'Charset': 'UTF-8'}}
            }
        )
        
        message_id = response.get('MessageId')
        print(f"\n✅ Email sent successfully!")
        print(f"   Message ID: {message_id}")
        print(f"\n📧 Check your inbox: {recipient_email}")
        print(f"   (Also check spam folder)")
        return True
        
    except ses_client.exceptions.MessageRejected as e:
        print(f"\n❌ Email rejected: {e}")
        if 'not verified' in str(e).lower():
            print(f"   Reason: Email not verified in SES")
            print(f"   Solution: Verify email or request production access")
        return False
    except Exception as e:
        print(f"\n❌ Error sending email: {e}")
        import traceback
        traceback.print_exc()
        return False


def run_full_test(article_id, image_id=None):
    """Run full test suite"""
    print("\n" + "="*60)
    print("EMAIL NOTIFICATION FLOW TEST")
    print("="*60)
    print(f"Article ID: {article_id}")
    if image_id:
        print(f"Image ID: {image_id}")
    
    results = {
        's3_metadata': False,
        'dynamodb_article': False,
        'cognito_user': False,
        'email_verification': False,
        'send_email': False
    }
    
    # Test 1: S3 metadata
    owner_id_s3, user_email_s3 = None, None
    if image_id:
        owner_id_s3, user_email_s3 = test_s3_metadata(article_id, image_id)
        results['s3_metadata'] = bool(owner_id_s3 or user_email_s3)
    else:
        print("\n⚠️  Skipping S3 metadata test (no image_id provided)")
    
    # Test 2: DynamoDB article
    owner_id_db = test_dynamodb_article(article_id)
    results['dynamodb_article'] = bool(owner_id_db)
    
    # Determine owner_id to use
    owner_id = owner_id_s3 or owner_id_db
    user_email = user_email_s3
    
    if not owner_id:
        print("\n" + "="*60)
        print("❌ CRITICAL: No owner_id found")
        print("="*60)
        print("Cannot continue tests without owner_id")
        return results
    
    # Test 3: Cognito user
    if not user_email:
        user_email = test_cognito_user(owner_id)
    results['cognito_user'] = bool(user_email)
    
    if not user_email:
        print("\n" + "="*60)
        print("❌ CRITICAL: No user email found")
        print("="*60)
        print("Cannot send email without user email")
        return results
    
    # Test 4: Email verification
    results['email_verification'] = test_email_verification(user_email)
    
    # Test 5: Send email
    results['send_email'] = test_send_email(user_email, article_id)
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    all_passed = all(results.values())
    
    if all_passed:
        print("\n✅ ALL TESTS PASSED!")
        print("Email notification system is working correctly.")
    else:
        print("\n❌ SOME TESTS FAILED")
        print("Review the failures above to identify the issue.")
    
    return results


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Test email notification flow')
    parser.add_argument('article_id', help='Article ID to test')
    parser.add_argument('--image-id', help='Image ID (optional, for S3 metadata test)')
    parser.add_argument('--bucket', default=BUCKET_NAME, help='S3 bucket name')
    parser.add_argument('--table', default=TABLE_NAME, help='DynamoDB table name')
    parser.add_argument('--user-pool', default=USER_POOL_ID, help='Cognito User Pool ID')
    
    args = parser.parse_args()
    
    # Update configuration
    BUCKET_NAME = args.bucket
    TABLE_NAME = args.table
    USER_POOL_ID = args.user_pool
    
    # Run tests
    results = run_full_test(args.article_id, args.image_id)
    
    # Exit with appropriate code
    sys.exit(0 if all(results.values()) else 1)
