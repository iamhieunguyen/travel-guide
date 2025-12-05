#!/usr/bin/env python3
"""
Script to check SES configuration and email verification status
Run this to diagnose email notification issues
"""
import boto3
import sys

ses_client = boto3.client('ses')
sesv2_client = boto3.client('sesv2')

def check_ses_sandbox_mode():
    """Check if SES is in sandbox mode"""
    print("\n" + "="*60)
    print("CHECKING SES SANDBOX MODE")
    print("="*60)
    
    try:
        response = sesv2_client.get_account()
        production_access = response.get('ProductionAccessEnabled', False)
        
        if production_access:
            print("✅ SES is in PRODUCTION mode")
            print("   You can send emails to any address")
        else:
            print("⚠️  SES is in SANDBOX mode")
            print("   You can only send emails to verified addresses")
            print("\n📝 To request production access:")
            print("   1. Go to AWS Console → SES → Account Dashboard")
            print("   2. Click 'Request production access'")
            print("   3. Fill out the form and submit")
            print("   4. Wait for AWS approval (usually 24-48 hours)")
        
        return production_access
    except Exception as e:
        print(f"❌ Failed to check sandbox mode: {e}")
        return None


def check_email_verification(email):
    """Check if an email is verified in SES"""
    try:
        response = ses_client.get_identity_verification_attributes(
            Identities=[email]
        )
        
        attrs = response.get('VerificationAttributes', {})
        if email in attrs:
            status = attrs[email].get('VerificationStatus')
            if status == 'Success':
                print(f"   ✅ {email}: VERIFIED")
                return True
            elif status == 'Pending':
                print(f"   ⏳ {email}: PENDING (check email for verification link)")
                return False
            else:
                print(f"   ❌ {email}: {status}")
                return False
        else:
            print(f"   ❌ {email}: NOT VERIFIED")
            return False
    except Exception as e:
        print(f"   ❌ {email}: Error checking - {e}")
        return False


def list_verified_emails():
    """List all verified email addresses"""
    print("\n" + "="*60)
    print("LISTING ALL VERIFIED EMAILS")
    print("="*60)
    
    try:
        response = ses_client.list_identities(
            IdentityType='EmailAddress',
            MaxItems=100
        )
        
        identities = response.get('Identities', [])
        if not identities:
            print("⚠️  No verified email addresses found")
            return []
        
        print(f"Found {len(identities)} email identities:")
        
        verified = []
        for email in identities:
            if check_email_verification(email):
                verified.append(email)
        
        return verified
    except Exception as e:
        print(f"❌ Failed to list identities: {e}")
        return []


def check_sending_quota():
    """Check SES sending quota"""
    print("\n" + "="*60)
    print("CHECKING SES SENDING QUOTA")
    print("="*60)
    
    try:
        response = ses_client.get_send_quota()
        
        max_24_hour = response.get('Max24HourSend', 0)
        max_per_second = response.get('MaxSendRate', 0)
        sent_last_24_hours = response.get('SentLast24Hours', 0)
        
        print(f"📊 Sending Limits:")
        print(f"   Max emails per 24 hours: {max_24_hour:.0f}")
        print(f"   Max emails per second: {max_per_second:.0f}")
        print(f"   Sent in last 24 hours: {sent_last_24_hours:.0f}")
        print(f"   Remaining today: {max_24_hour - sent_last_24_hours:.0f}")
        
        if max_24_hour <= 200:
            print("\n⚠️  You are in sandbox mode (limit: 200 emails/day)")
            print("   Request production access for higher limits")
        
        return {
            'max_24_hour': max_24_hour,
            'max_per_second': max_per_second,
            'sent_last_24_hours': sent_last_24_hours
        }
    except Exception as e:
        print(f"❌ Failed to check sending quota: {e}")
        return None


def verify_email(email):
    """Send verification email to an address"""
    print(f"\n📧 Sending verification email to: {email}")
    
    try:
        ses_client.verify_email_identity(EmailAddress=email)
        print(f"✅ Verification email sent!")
        print(f"   Check {email} inbox and click the verification link")
        return True
    except Exception as e:
        print(f"❌ Failed to send verification email: {e}")
        return False


def test_send_email(sender, recipient):
    """Test sending an email"""
    print(f"\n📤 Testing email send...")
    print(f"   From: {sender}")
    print(f"   To: {recipient}")
    
    try:
        response = ses_client.send_email(
            Source=sender,
            Destination={'ToAddresses': [recipient]},
            Message={
                'Subject': {'Data': 'SES Test Email', 'Charset': 'UTF-8'},
                'Body': {
                    'Text': {
                        'Data': 'This is a test email from SES configuration checker.',
                        'Charset': 'UTF-8'
                    }
                }
            }
        )
        
        message_id = response.get('MessageId')
        print(f"✅ Email sent successfully!")
        print(f"   Message ID: {message_id}")
        return True
    except ses_client.exceptions.MessageRejected as e:
        print(f"❌ Email rejected: {e}")
        if 'not verified' in str(e).lower():
            print(f"   Reason: Email address not verified")
            print(f"   Solution: Verify the email or request production access")
        return False
    except Exception as e:
        print(f"❌ Failed to send email: {e}")
        return False


def main():
    print("\n" + "="*60)
    print("SES CONFIGURATION CHECKER")
    print("="*60)
    
    # Check sandbox mode
    is_production = check_ses_sandbox_mode()
    
    # Check sending quota
    quota = check_sending_quota()
    
    # List verified emails
    verified_emails = list_verified_emails()
    
    # Check specific emails
    print("\n" + "="*60)
    print("CHECKING CRITICAL EMAILS")
    print("="*60)
    
    sender_email = 'hieunxse180069@fpt.edu.vn'
    print(f"\n📧 Sender Email: {sender_email}")
    sender_verified = check_email_verification(sender_email)
    
    # Summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    
    issues = []
    
    if not is_production:
        issues.append("⚠️  SES is in SANDBOX mode - can only send to verified emails")
    
    if not sender_verified:
        issues.append(f"❌ Sender email not verified: {sender_email}")
    
    if not verified_emails:
        issues.append("❌ No verified email addresses found")
    
    if issues:
        print("\n🔴 ISSUES FOUND:")
        for issue in issues:
            print(f"   {issue}")
        
        print("\n📝 RECOMMENDED ACTIONS:")
        print("   1. Request SES production access (most important)")
        print(f"   2. Verify sender email: {sender_email}")
        print("   3. Test email sending after verification")
        
        print("\n💡 TO VERIFY SENDER EMAIL:")
        print(f"   Run: python {sys.argv[0]} --verify {sender_email}")
        
        print("\n💡 TO TEST EMAIL SENDING:")
        print(f"   Run: python {sys.argv[0]} --test {sender_email} recipient@example.com")
    else:
        print("\n✅ All checks passed!")
        print("   SES is configured correctly")
    
    return len(issues) == 0


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Check SES configuration')
    parser.add_argument('--verify', metavar='EMAIL', help='Send verification email to address')
    parser.add_argument('--test', nargs=2, metavar=('SENDER', 'RECIPIENT'), 
                       help='Test sending email from SENDER to RECIPIENT')
    
    args = parser.parse_args()
    
    if args.verify:
        verify_email(args.verify)
    elif args.test:
        sender, recipient = args.test
        test_send_email(sender, recipient)
    else:
        success = main()
        sys.exit(0 if success else 1)
