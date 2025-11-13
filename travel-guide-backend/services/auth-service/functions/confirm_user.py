import boto3
import json
import os

client = boto3.client('cognito-idp')

def lambda_handler(event, context):
    try:
        body = json.loads(event['body'])
        username = body['username']
        confirmation_code = body['confirmation_code']

        client.confirm_sign_up(
            ClientId=os.environ['CLIENT_ID'],
            Username=username,
            ConfirmationCode=confirmation_code
        )

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({
                'message': 'User confirmed successfully. You can now log in.'
            })
        }
    except client.exceptions.CodeMismatchException:
        return error_response(400, 'Invalid confirmation code')
    except Exception as e:
        print(f"Confirmation error: {e}")
        return error_response(500, f'Confirmation failed: {str(e)}')

def error_response(status, message):
    return {
        'statusCode': status,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
        'body': json.dumps({'error': message})
    }