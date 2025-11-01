# backend/functions/auth/confirm_user.py
import json
import boto3
import os
from botocore.exceptions import ClientError

USER_POOL_ID = os.environ['USER_POOL_ID']
cognito = boto3.client('cognito-idp')

def lambda_handler(event, context):
    if not event.get("body"):
        return {
            "statusCode": 400,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": "Missing request body"})
        }

    try:
        body = json.loads(event["body"])
    except (TypeError, json.JSONDecodeError):
        return {
            "statusCode": 400,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": "Invalid JSON"})
        }

    username = body.get("username")
    code = body.get("code")

    if not username or not code:
        return {
            "statusCode": 400,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": "Missing username or confirmation code"})
        }

    try:
        cognito.admin_confirm_sign_up(
            UserPoolId=USER_POOL_ID,
            Username=username,
            ConfirmationCode=code
        )
        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"message": "User confirmed successfully"})
        }
    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == 'CodeMismatchException':
            return {
                "statusCode": 400,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"error": "Invalid confirmation code"})
            }
        elif error_code == 'UserNotFoundException':
            return {
                "statusCode": 404,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"error": "User not found"})
            }
        else:
            return {
                "statusCode": 500,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"error": "Confirmation failed"})
            }