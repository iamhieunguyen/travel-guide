import json
import boto3
import os
from botocore.exceptions import ClientError

USER_POOL_ID = os.environ['USER_POOL_ID']
CLIENT_ID = os.environ['CLIENT_ID']

cognito = boto3.client('cognito-idp')

def lambda_handler(event, context):
    # Kiểm tra body
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
    password = body.get("password")

    if not username or not password:
        return {
            "statusCode": 400,
            "body": json.dumps({"error": "Missing username or password"})
        }

    try:
        resp = cognito.initiate_auth(
            ClientId=CLIENT_ID,
            AuthFlow='USER_PASSWORD_AUTH',
            AuthParameters={
                'USERNAME': username,
                'PASSWORD': password
            }
        )
        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({
                "message": "Login successful",
                "idToken": resp['AuthenticationResult']['IdToken']
            })
        }
    except ClientError as e:
        return {
            "statusCode": 401,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": e.response['Error']['Message']})
        }