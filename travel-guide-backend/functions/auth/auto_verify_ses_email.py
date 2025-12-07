"""
Auto-verify user emails in SES when they register
This allows sending emails to them even in sandbox mode
"""
import os
import boto3
import json

ses_client = boto3.client('ses')

def lambda_handler(event, context):
    """
    Cognito Post-Confirmation trigger
    Automatically verifies user email in SES after Cognito confirmation
    """
    print(f"Event: {json.dumps(event)}")
    
    # Get user email from Cognito event
    user_email = event['request']['userAttributes'].get('email')
    
    if not user_email:
        print("No email found in user attributes")
        return event
    
    try:
        print(f"Verifying email in SES: {user_email}")
        
        # Send verification email via SES
        ses_client.verify_email_identity(EmailAddress=user_email)
        
        print(f"✅ SES verification email sent to: {user_email}")
        print(f"   User must click the link to complete verification")
        
    except ses_client.exceptions.InvalidParameterValue as e:
        print(f"⚠️ Invalid email address: {e}")
    except Exception as e:
        print(f"❌ Failed to verify email in SES: {e}")
        # Don't fail the registration if SES verification fails
    
    return event
