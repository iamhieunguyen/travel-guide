import boto3
import json
import os

client = boto3.client('cognito-idp')

def lambda_handler(event, context):
    try:
        body = json.loads(event['body'])
        username = body['username']
        password = body['password']

        response = client.admin_initiate_auth(
            UserPoolId=os.environ['USER_POOL_ID'],
            ClientId=os.environ['CLIENT_ID'],
            AuthFlow='ADMIN_NO_SRP_AUTH',
            AuthParameters={
                'USERNAME': username,
                'PASSWORD': password
            }
        )

        id_token = response['AuthenticationResult']['IdToken']
        refresh_token = response['AuthenticationResult']['RefreshToken']

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({
                'message': 'Login successful',
                'id_token': id_token,
                'refresh_token': refresh_token
            })
        }
    except client.exceptions.UserNotFoundException:
        return error_response(400, 'User not found')
    except client.exceptions.NotAuthorizedException:
        return error_response(400, 'Incorrect username or password')
    except Exception as e:
        print(f"Login error: {e}")
        return error_response(500, f'Login failed: {str(e)}')

def error_response(status, message):
    return {
        'statusCode': status,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
        'body': json.dumps({'error': message})
    }